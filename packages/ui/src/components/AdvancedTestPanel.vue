<template>
  <div class="flex flex-col h-full">
    <!-- Test Input Area -->
    <div class="flex-none">
      <!-- Test Content Input (for userQuestion variable) -->
      <div v-if="optimizationMode === 'system'" class="mb-4">
        <NCard size="medium">
          <div class="block text-sm font-medium mb-2">
            {{ t('test.content') }}
          </div>
          <NInput
            v-model:value="testContent"
            type="textarea"
            :placeholder="t('test.placeholder')"
            :disabled="isTestRunning"
            :autosize="{ minRows: 3, maxRows: 6 }"
            size="medium"
          />
          <div class="text-xs text-gray-500 mt-1">
            {{ t('test.simpleMode.help') }}
          </div>
        </NCard>
      </div>
      
      <!-- Model Selection and Controls -->
      <NCard size="medium">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <div class="block text-sm font-medium mb-2">
              {{ t('test.model') }}
            </div>
            <ModelSelectUI
              ref="testModelSelect"
              :modelValue="selectedTestModel"
              @update:modelValue="updateSelectedModel"
              :disabled="isTestRunning"
              @config="$emit('showConfig')"
            />
          </div>
          <div class="flex items-center gap-2">
            <NButton
              @click="toggleCompareMode"
              :type="isCompareMode ? 'primary' : 'default'"
              size="medium"
              class="whitespace-nowrap"
            >
              {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
            </NButton>
            <NButton
              @click="handleTest"
              :disabled="isTestRunning || !canStartTest"
              :loading="isTestRunning"
              type="primary"
              size="medium"
            >
              {{ isTestRunning ? t('test.testing') : (isCompareMode ? t('test.startCompare') : t('test.startTest')) }}
            </NButton>
          </div>
        </div>
      </NCard>
      
      <!-- 高级模式 - 多轮对话管理 -->
      <div class="mt-4">
        <ConversationManager
          :messages="conversationMessages"
          :available-variables="allVariables"
          :scan-variables="scanVariables"
          :is-predefined-variable="isPredefinedVariable"
          :replace-variables="replaceVariables"
          :optimization-mode="optimizationMode"
          :tools="currentTools"
          @update:messages="updateConversationMessages"
          @update:tools="handleToolsUpdate"
          @create-variable="handleCreateVariable"
          @open-variable-manager="handleOpenVariableManager"
          :collapsible="true"
          :max-height="300"
        />
      </div>
    </div>

    <!-- Test Results Area -->
    <div class="flex-1 min-h-0 mt-4">
      <div
        class="relative h-full"
        :class="{
          'md:flex md:gap-3': isCompareMode,
          'block': !isCompareMode
        }"
      >
        <!-- Original Prompt Test Result -->
        <div
          v-if="isCompareMode"
          class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]"
          :style="{
            height: isCompareMode ? 'auto' : '0px'
          }"
          :class="{
            'md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:left-0': isCompareMode,
            'hidden': !isCompareMode
          }"
        >
          <h3 class="text-lg font-semibold truncate mb-3 flex-none">
            {{ t('test.originalResult') }}
          </h3>
          <OutputDisplay
            :content="originalTestResult"
            :reasoning="originalTestReasoning"
            :streaming="isTestingOriginal"
            :enableDiff="false"
            mode="readonly"
            class="flex-1 min-h-0"
          />
          
          <!-- 🆕 工具调用显示（向后兼容） -->
          <div v-if="originalToolCalls.length > 0" class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              工具调用 ({{ originalToolCalls.length }})
            </h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              <div 
                v-for="(toolCall, index) in originalToolCalls" 
                :key="index"
                class="p-2 bg-white dark:bg-gray-800 rounded border text-xs"
              >
                <div class="font-medium text-blue-600 dark:text-blue-400">{{ toolCall.function?.name || 'Unknown Tool' }}</div>
                <div class="text-gray-600 dark:text-gray-400 mt-1 break-all">{{ toolCall.function?.arguments || JSON.stringify(toolCall) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Optimized Prompt Test Result -->
        <div
          class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]"
          :style="{
            height: isCompareMode ? 'auto' : '100%'
          }"
          :class="{
            'md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:left-[calc(50%+6px)]': isCompareMode,
            'md:absolute md:inset-0 md:h-full md:w-full md:left-0': !isCompareMode
          }"
        >
          <h3 class="text-lg font-semibold truncate mb-3 flex-none">
            {{ isCompareMode ? t('test.optimizedResult') : t('test.testResult') }}
          </h3>
          <OutputDisplay
            :content="optimizedTestResult"
            :reasoning="optimizedTestReasoning"
            :streaming="isTestingOptimized"
            :enableDiff="false"
            mode="readonly"
            class="flex-1 min-h-0"
          />
          
          <!-- 🆕 优化结果的工具调用显示（向后兼容） -->
          <div v-if="optimizedToolCalls.length > 0" class="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              工具调用 ({{ optimizedToolCalls.length }})
            </h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              <div 
                v-for="(toolCall, index) in optimizedToolCalls" 
                :key="index"
                class="p-2 bg-white dark:bg-gray-800 rounded border text-xs"
              >
                <div class="font-medium text-green-600 dark:text-green-400">{{ toolCall.function?.name || 'Unknown Tool' }}</div>
                <div class="text-gray-600 dark:text-gray-400 mt-1 break-all">{{ toolCall.function?.arguments || JSON.stringify(toolCall) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OptimizationMode, ConversationMessage, CustomConversationRequest, ToolDefinition } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'
import type { VariableManagerHooks } from '../composables/useVariableManager'

import { useVariableManager } from '../composables/useVariableManager'

import { NButton, NCard, NInput } from 'naive-ui'
import ModelSelectUI from './ModelSelect.vue'
import ConversationManager from './ConversationManager.vue'
import OutputDisplay from './OutputDisplay.vue'

const { t } = useI18n()

interface Props {
  originalPrompt: string
  optimizedPrompt: string
  optimizationMode: OptimizationMode
  services: AppServices
  selectedModel: string
  advancedModeEnabled: boolean
  variableManager?: VariableManagerHooks | null
  openVariableManager?: (variableName?: string) => void
  tools?: ToolDefinition[]  // 🆕 可选的工具定义支持（向后兼容）
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedModel': [value: string]
  'showConfig': []
}>()

// refs
const testModelSelect = ref(null)

// 内部状态
const selectedTestModel = ref(props.selectedModel)
const isCompareMode = ref(true)
const testContent = ref('') // 测试内容输入（用于userQuestion变量）
const conversationMessages = ref<ConversationMessage[]>([
  { role: 'user', content: '' }
])

// 🆕 内部工具状态管理（向后兼容）
const currentTools = ref<ToolDefinition[]>(props.tools || [])

// 测试状态
const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)
const originalTestReasoning = ref('')
const originalToolCalls = ref<any[]>([])  // 🆕 原始提示词的工具调用

const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)
const optimizedTestReasoning = ref('')
const optimizedToolCalls = ref<any[]>([])  // 🆕 优化提示词的工具调用

const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)
const isTestRunning = computed(() => isTesting.value)

// 状态管理
// 删除重复的变量声明，使用重构后的变量

// 变量管理器 - 优先使用传入的，否则创建新实例
const variableManager: Ref<VariableManagerHooks | null> = computed(() => {
  if (props.variableManager) {
    return props.variableManager
  }
  // 如果没有传入variableManager，使用本地创建的实例
  return localVariableManager
})

// 本地变量管理器实例（仅在没有传入variableManager时使用）
const localVariableManager: VariableManagerHooks = useVariableManager(
  computed(() => props.services),
  {
    autoSync: true,
    context: computed(() => ({
      originalPrompt: props.originalPrompt,
      lastOptimizedPrompt: props.optimizedPrompt,
      iterateInput: '',
      optimizationMode: props.optimizationMode
    }))
  }
)

// 计算属性

const allVariables = computed(() => {
  if (!variableManager.value?.variableManager.value) return {}
  
  const baseContext = {
    originalPrompt: props.originalPrompt,
    lastOptimizedPrompt: props.optimizedPrompt,
    iterateInput: '',
    optimizationMode: props.optimizationMode,
    // 在非测试状态下，currentPrompt 默认为优化后的提示词
    currentPrompt: props.optimizedPrompt || props.originalPrompt || '',
  }
  
  // 只有在系统提示词优化模式下才提供 userQuestion 变量
  if (props.optimizationMode === 'system') {
    return variableManager.value.variableManager.value.resolveAllVariables({
      ...baseContext,
      // 将测试内容作为 userQuestion 变量
      userQuestion: testContent.value || ''
    })
  } else {
    // 用户提示词优化模式不提供 userQuestion 变量
    return variableManager.value.variableManager.value.resolveAllVariables(baseContext)
  }
})

const canStartTest = computed(() => {
  if (!selectedTestModel.value) {
    return false
  }
  
  if (props.optimizationMode === 'system') {
    // 系统提示词优化模式：如果使用简单的会话管理（只有默认的{{userQuestion}}消息），
    // 需要检查testContent是否有内容
    if (conversationMessages.value.length <= 1 && 
        conversationMessages.value.some(msg => msg.content.includes('{{userQuestion}}'))) {
      return testContent.value.trim() !== ''
    }
  } else if (props.optimizationMode === 'user') {
    // 用户提示词优化模式：不需要testContent，只检查会话消息的完整性
    // 确保有有效的会话消息即可
  }
  
  // 通用验证：检查会话消息的完整性
  return conversationMessages.value.length > 0 && 
         conversationMessages.value.some(msg => msg.content.trim() !== '')
})

// 辅助函数
const scanVariables = (content: string): string[] => {
  if (!content || typeof content !== 'string') return []
  
  const variablePattern = /\{\{([^}]+)\}\}/g
  const variables = new Set<string>()
  let match
  
  while ((match = variablePattern.exec(content)) !== null) {
    variables.add(match[1].trim())
  }
  
  return Array.from(variables)
}

const isPredefinedVariable = (name: string): boolean => {
  if (!variableManager.value?.variableManager.value) return false
  return variableManager.value.variableManager.value.isPredefinedVariable(name)
}

const replaceVariables = (content: string, variables?: Record<string, string>): string => {
  if (!content || typeof content !== 'string') return ''
  
  const vars = variables || allVariables.value
  return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const trimmedName = variableName.trim()
    return vars[trimmedName] || match
  })
}

const handleCreateVariable = (name: string, defaultValue?: string) => {
  if (!variableManager.value?.variableManager.value) return
  
  const value = defaultValue || `Value for ${name}`
  variableManager.value.variableManager.value.setVariable(name, value)
}

const handleOpenVariableManager = (variableName: string) => {
  // 首先创建变量
  handleCreateVariable(variableName)
  
  // 然后打开变量管理器，并传递变量名用于聚焦
  if (props.openVariableManager) {
    props.openVariableManager(variableName)
    console.log(`[AdvancedTestPanel] Variable manager opened for variable: ${variableName}`)
  }
}

// 🆕 处理工具更新（向后兼容）
const handleToolsUpdate = (tools: ToolDefinition[]) => {
  currentTools.value = [...tools]
  console.log(`[AdvancedTestPanel] Tools updated, count: ${tools.length}`)
}

// 事件处理

const updateConversationMessages = (messages: ConversationMessage[]) => {
  conversationMessages.value = messages
}

// 公开方法：设置会话消息（用于同步优化上下文）
const setConversationMessages = (messages: ConversationMessage[]) => {
  conversationMessages.value = [...messages]
  console.log('[AdvancedTestPanel] Conversation messages synced:', messages)
}

// 🆕 公开方法：设置工具（用于同步优化阶段的工具到测试阶段）
const setTools = (tools: ToolDefinition[]) => {
  currentTools.value = [...tools]
  console.log('[AdvancedTestPanel] Tools synced from optimization phase:', tools)
}

// 方法
const toggleCompareMode = () => {
  isCompareMode.value = !isCompareMode.value
}

const updateSelectedModel = (value: string) => {
  selectedTestModel.value = value
  emit('update:selectedModel', value)
}

const ensureString = (value: any): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

const testOriginalPrompt = async () => {
  if (!props.originalPrompt) return

  isTestingOriginal.value = true
  originalTestResult.value = ''
  originalTestError.value = ''
  originalTestReasoning.value = ''

  try {
    const streamHandler = {
      onToken: (token: string) => {
        originalTestResult.value += token
      },
      onReasoningToken: (reasoningToken: string) => {
        originalTestReasoning.value += reasoningToken
      },
      onComplete: () => {},
      onError: (err: Error) => {
        const errorMessage = err.message || t('test.error.failed')
        originalTestError.value = errorMessage
        console.error('[AdvancedTestPanel] Original prompt test failed:', errorMessage)
      }
    }

    let systemPrompt = ''
    let userPrompt = ''

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPrompt = ensureString(props.originalPrompt)
    } else {
      systemPrompt = ensureString(props.originalPrompt)
      // 对于系统提示词优化，使用第一条用户消息作为测试输入
      const firstUserMessage = conversationMessages.value.find(msg => msg.role === 'user')
      userPrompt = firstUserMessage ? firstUserMessage.content : ''
    }

    await props.services?.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      selectedTestModel.value,
      streamHandler
    )
  } catch (error: any) {
    console.error('[AdvancedTestPanel] Original prompt test failed:', error)
    const errorMessage = error.message || t('test.error.failed')
    originalTestError.value = errorMessage
    originalTestResult.value = ''
  } finally {
    isTestingOriginal.value = false
  }
}

const testOptimizedPrompt = async () => {
  if (!props.optimizedPrompt) return

  isTestingOptimized.value = true
  optimizedTestResult.value = ''
  optimizedTestError.value = ''
  optimizedTestReasoning.value = ''

  try {
    const streamHandler = {
      onToken: (token: string) => {
        optimizedTestResult.value += token
      },
      onReasoningToken: (reasoningToken: string) => {
        optimizedTestReasoning.value += reasoningToken
      },
      onComplete: () => {},
      onError: (err: Error) => {
        const errorMessage = err.message || t('test.error.failed')
        optimizedTestError.value = errorMessage
        console.error('[AdvancedTestPanel] Optimized prompt test failed:', errorMessage)
      }
    }

    let systemPrompt = ''
    let userPrompt = ''

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPrompt = ensureString(props.optimizedPrompt)
    } else {
      systemPrompt = ensureString(props.optimizedPrompt)
      // 对于系统提示词优化，使用第一条用户消息作为测试输入
      const firstUserMessage = conversationMessages.value.find(msg => msg.role === 'user')
      userPrompt = firstUserMessage ? firstUserMessage.content : ''
    }

    await props.services?.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      selectedTestModel.value,
      streamHandler
    )
  } catch (error: any) {
    console.error('[AdvancedTestPanel] Optimized prompt test failed:', error)
    const errorMessage = error.message || t('test.error.failed')
    optimizedTestError.value = errorMessage
    optimizedTestResult.value = ''
  } finally {
    isTestingOptimized.value = false
  }
}

const testCustomConversation = async () => {
  if (!props.services?.promptService) return

  if (isCompareMode.value) {
    // 对比模式：同时测试原始和优化版本
    await Promise.all([
      testCustomConversationWithMode('original'),
      testCustomConversationWithMode('optimized')
    ])
  } else {
    // 单一测试模式：只测试优化版本
    await testCustomConversationWithMode('optimized')
  }
}

const testCustomConversationWithMode = async (mode: 'original' | 'optimized') => {
  if (!variableManager.value?.variableManager.value) return

  // 根据测试模式设置状态
  const isOriginalTest = mode === 'original'
  const isTestingRef = isOriginalTest ? isTestingOriginal : isTestingOptimized
  const resultRef = isOriginalTest ? originalTestResult : optimizedTestResult
  const errorRef = isOriginalTest ? originalTestError : optimizedTestError
  const reasoningRef = isOriginalTest ? originalTestReasoning : optimizedTestReasoning

  isTestingRef.value = true
  resultRef.value = ''
  errorRef.value = ''
  reasoningRef.value = ''
  
  // 🆕 清除工具调用数据（向后兼容）
  const toolCallsRef = isOriginalTest ? originalToolCalls : optimizedToolCalls
  toolCallsRef.value = []

  try {
    // 根据测试模式构建变量上下文
    const baseContext = {
      originalPrompt: props.originalPrompt,
      lastOptimizedPrompt: props.optimizedPrompt,
      iterateInput: '',
      optimizationMode: props.optimizationMode,
      // 关键：根据测试模式设置 currentPrompt
      currentPrompt: isOriginalTest ? props.originalPrompt : props.optimizedPrompt,
    }
    
    let contextVariables
    // 只有在系统提示词优化模式下才提供 userQuestion 变量
    if (props.optimizationMode === 'system') {
      contextVariables = variableManager.value.variableManager.value.resolveAllVariables({
        ...baseContext,
        // 将测试内容作为 userQuestion 变量
        userQuestion: testContent.value || ''
      })
    } else {
      // 用户提示词优化模式不提供 userQuestion 变量
      contextVariables = variableManager.value.variableManager.value.resolveAllVariables(baseContext)
    }

    const request: CustomConversationRequest = {
      modelKey: selectedTestModel.value,
      messages: conversationMessages.value,
      variables: contextVariables,
      ...(currentTools.value && currentTools.value.length > 0 && { tools: currentTools.value })  // 🆕 使用当前工具状态（支持从多个来源更新）
    }

    await props.services.promptService.testCustomConversationStream(
      request,
      {
        onToken: (token: string) => {
          resultRef.value += token
        },
        onReasoningToken: (reasoningToken: string) => {
          reasoningRef.value += reasoningToken
        },
        onToolCall: (toolCall: any) => {  // 🆕 工具调用处理（向后兼容）
          const toolCallsRef = isOriginalTest ? originalToolCalls : optimizedToolCalls
          toolCallsRef.value.push(toolCall)
          console.log(`[AdvancedTestPanel] ${mode} tool call received:`, toolCall)
        },
        onError: (error: Error) => {
          console.error(`[AdvancedTestPanel] ${mode} conversation test error:`, error)
          resultRef.value = `Error: ${error.message || String(error)}`
        },
        onComplete: () => {
          console.log(`[AdvancedTestPanel] ${mode} conversation test completed`)
        }
      }
    )
  } catch (error: any) {
    console.error(`[AdvancedTestPanel] ${mode} conversation test failed:`, error)
    resultRef.value = `Error: ${error.message || String(error)}`
  } finally {
    isTestingRef.value = false
  }
}

const handleTest = async () => {
  if (!selectedTestModel.value) {
    console.error('[AdvancedTestPanel] No model selected')
    return
  }

  // 如果有多条消息，使用自定义对话测试
  if (conversationMessages.value.length > 1) {
    await testCustomConversation()
  } else {
    // 否则使用标准的提示词测试
    if (isCompareMode.value) {
      await Promise.all([
        testOriginalPrompt(),
        testOptimizedPrompt()
      ])
    } else {
      await testOptimizedPrompt()
    }
  }
}

// 监听
watch(() => props.selectedModel, (newVal) => {
  if (newVal && newVal !== selectedTestModel.value) {
    selectedTestModel.value = newVal
  }
})

// 🆕 监听工具数据变化（向后兼容）
watch(() => props.tools, (newTools) => {
  if (newTools) {
    currentTools.value = [...newTools]
    console.log(`[AdvancedTestPanel] Props tools updated, count: ${newTools.length}`)
  }
}, { deep: true, immediate: true })

// 应用优化提示词到测试环境
const applyOptimizedPromptToTest = (optimizationData: {
  originalPrompt: string
  optimizedPrompt: string
  optimizationMode: string
}) => {
  console.log('[AdvancedTestPanel] Applying optimized prompt to test:', optimizationData)
  
  // 根据优化模式创建合适的会话结构
  if (optimizationData.optimizationMode === 'system') {
    // 系统提示词优化模式：系统消息 + 用户消息
    conversationMessages.value = [
      {
        role: 'system',
        content: '{{currentPrompt}}'
      },
      {
        role: 'user', 
        content: '{{userQuestion}}'
      }
    ]
    // 设置默认测试内容
    testContent.value = '请按照你的角色设定，展示你的能力并与我互动。'
  } else if (optimizationData.optimizationMode === 'user') {
    // 用户提示词优化模式：只有用户消息
    // 优化后的提示词直接作为用户消息，用户可以通过会话管理器添加上下文
    conversationMessages.value = [
      {
        role: 'user',
        content: '{{currentPrompt}}'
      }
    ]
    // 用户提示词优化模式不需要额外的测试内容
    testContent.value = ''
  } else {
    // 兜底处理：默认使用用户消息模式
    conversationMessages.value = [
      {
        role: 'user',
        content: '{{currentPrompt}}'
      }
    ]
    testContent.value = ''
  }
  
  console.log('[AdvancedTestPanel] Applied conversation template:', conversationMessages.value)
}

// 暴露方法供父组件调用
defineExpose({
  setConversationMessages,
  setTools  // 🆕 暴露工具设置方法
})
</script>

<style scoped>
/* AdvancedTestPanel specific styles - using centralized theme system */
</style>
