import { reactive, type Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { OptimizationMode } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'
import type { ConversationMessage } from '../types/variable'

/**
 * 高级提示词测试 Hook
 * 支持变量注入、上下文、工具调用等高级特性
 *
 * @param services 服务实例引用
 * @param selectedTestModel 测试模型选择
 * @param selectedOptimizationMode 优化模式
 * @param advancedModeEnabled 是否启用高级模式
 * @param optimizationContext 优化上下文（会话消息）
 * @param optimizationContextTools 上下文工具列表
 * @param variableManager 变量管理器
 * @returns 提示词测试接口
 */
export function usePromptTester(
  services: Ref<AppServices | null>,
  selectedTestModel: Ref<string>,
  selectedOptimizationMode: Ref<OptimizationMode>,
  advancedModeEnabled: Ref<boolean>,
  optimizationContext: Ref<ConversationMessage[]>,
  optimizationContextTools: Ref<any[]>,
  variableManager: any
) {
  const toast = useToast()
  const { t } = useI18n()

  // 创建一个 reactive 状态对象
  const state = reactive({
    // States - 测试结果状态
    testResults: {
      // 原始提示词结果
      originalResult: '',
      originalReasoning: '',
      isTestingOriginal: false,

      // 优化提示词结果
      optimizedResult: '',
      optimizedReasoning: '',
      isTestingOptimized: false,
    },

    // Methods
    /**
     * 执行测试（支持对比模式）
     * @param prompt 原始提示词
     * @param optimizedPrompt 优化后的提示词
     * @param testContent 测试内容
     * @param isCompareMode 是否对比模式
     * @param testVariables 测试变量
     * @param testPanelRef 测试面板引用（用于工具调用回调）
     */
    executeTest: async (
      prompt: string,
      optimizedPrompt: string,
      testContent: string,
      isCompareMode: boolean,
      testVariables?: Record<string, string>,
      testPanelRef?: any
    ) => {
      if (!services.value?.promptService) {
        toast.error(t('toast.error.serviceInit'))
        return
      }

      if (!selectedTestModel.value) {
        toast.error(t('test.error.noModel'))
        return
      }

      if (isCompareMode) {
        // 对比模式：测试原始和优化提示词
        await state.testPromptWithType(
          'original',
          prompt,
          optimizedPrompt,
          testContent,
          testVariables,
          testPanelRef
        )
        await state.testPromptWithType(
          'optimized',
          prompt,
          optimizedPrompt,
          testContent,
          testVariables,
          testPanelRef
        )
      } else {
        // 单一模式：只测试优化后的提示词
        await state.testPromptWithType(
          'optimized',
          prompt,
          optimizedPrompt,
          testContent,
          testVariables,
          testPanelRef
        )
      }
    },

    /**
     * 测试特定类型的提示词（复用会话上下文 + 变量 + 工具）
     */
    testPromptWithType: async (
      type: 'original' | 'optimized',
      prompt: string,
      optimizedPrompt: string,
      testContent: string,
      testVars?: Record<string, string>,
      testPanelRef?: any
    ) => {
      const isOriginal = type === 'original'
      const selectedPrompt = isOriginal ? prompt : optimizedPrompt

      if (!selectedPrompt) {
        toast.error(
          isOriginal ? t('test.error.noOriginalPrompt') : t('test.error.noOptimizedPrompt')
        )
        return
      }

      // 设置测试状态
      if (isOriginal) {
        state.testResults.isTestingOriginal = true
        state.testResults.originalResult = ''
        state.testResults.originalReasoning = ''
      } else {
        state.testResults.isTestingOptimized = true
        state.testResults.optimizedResult = ''
        state.testResults.optimizedReasoning = ''
      }

      // 清除对应类型的工具调用数据
      testPanelRef?.clearToolCalls?.(isOriginal ? 'original' : 'optimized')

      try {
        const streamHandler = {
          onToken: (token: string) => {
            if (isOriginal) {
              state.testResults.originalResult += token
            } else {
              state.testResults.optimizedResult += token
            }
          },
          onReasoningToken: (reasoningToken: string) => {
            if (isOriginal) {
              state.testResults.originalReasoning += reasoningToken
            } else {
              state.testResults.optimizedReasoning += reasoningToken
            }
          },
          onComplete: () => {
            // Test completed successfully
          },
          onError: (err: Error) => {
            const errorMessage = err.message || t('test.error.failed')
            console.error(`[usePromptTester] ${type} test failed:`, errorMessage)
            const testTypeKey = type === 'original' ? 'originalTestFailed' : 'optimizedTestFailed'
            toast.error(`${t(`test.error.${testTypeKey}`)}: ${errorMessage}`)
          },
        }

        // 统一构造对话与变量，尽量复用上下文
        let systemPrompt = ''
        let userPrompt = ''

        if (selectedOptimizationMode.value === 'user') {
          // 用户提示词模式：提示词作为用户输入
          systemPrompt = ''
          userPrompt = selectedPrompt
        } else {
          // 系统提示词模式：提示词作为系统消息
          systemPrompt = selectedPrompt
          userPrompt = testContent || '请按照你的角色设定，展示你的能力并与我互动。'
        }

        const hasConversationContext =
          selectedOptimizationMode.value === 'system' &&
          advancedModeEnabled.value &&
          (optimizationContext.value?.length || 0) > 0
        const hasTools =
          advancedModeEnabled.value &&
          (optimizationContextTools.value?.length || 0) > 0

        // 变量：合并全局变量 + 测试变量 + 当前提示词/问题（用于会话模板中的占位符）
        // 按优先级合并: 全局自定义变量 < 测试变量 < 预定义变量
        const baseVars =
          (variableManager?.variableManager.value?.resolveAllVariables() ||
            {}) as Record<string, string>

        // 使用传入的测试变量
        const variables = {
          ...baseVars,
          ...(testVars || {}), // 测试变量优先级高于全局变量
          currentPrompt: selectedPrompt,
          userQuestion: userPrompt,
        }

        // 对话构造逻辑：
        // - 系统模式 + 有会话上下文：使用会话上下文（因为系统提示词本身就是多轮对话场景）
        // - 用户模式：无论是否有会话上下文，都直接发送优化后的提示词作为用户消息
        //   （因为用户提示词优化的目标是生成可直接使用的单条用户消息）
        const messages: ConversationMessage[] =
          selectedOptimizationMode.value === 'system' && hasConversationContext
            ? optimizationContext.value.map((m) => ({
                role: m.role,
                content: m.content,
              }))
            : [
                ...(systemPrompt
                  ? [{ role: 'system' as const, content: systemPrompt }]
                  : []),
                { role: 'user' as const, content: userPrompt },
              ]

        // 统一使用自定义会话测试，以便支持上下文与工具
        await services.value!.promptService.testCustomConversationStream(
          {
            modelKey: selectedTestModel.value,
            messages,
            variables,
            tools: hasTools ? optimizationContextTools.value : [],
          },
          {
            ...streamHandler,
            onToolCall: (toolCall: any) => {
              if (!hasTools) return
              console.log(
                `[usePromptTester] ${type} test tool call received:`,
                toolCall
              )
              const toolCallResult = {
                toolCall: toolCall,
                status: 'success' as const,
                timestamp: new Date(),
              }
              testPanelRef?.handleToolCall?.(toolCallResult, type)
            },
          }
        )
      } catch (error: any) {
        console.error(`[usePromptTester] ${type} test error:`, error)
        const errorMessage = error.message || t('test.error.failed')
        const testTypeKey = type === 'original' ? 'originalTestFailed' : 'optimizedTestFailed'
        toast.error(`${t(`test.error.${testTypeKey}`)}: ${errorMessage}`)
      } finally {
        // 重置测试状态
        if (isOriginal) {
          state.testResults.isTestingOriginal = false
        } else {
          state.testResults.isTestingOptimized = false
        }
      }
    },
  })

  return state
} 