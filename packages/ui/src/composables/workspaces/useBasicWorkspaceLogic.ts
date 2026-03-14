/**
 * Basic 模式工作区业务逻辑（通用）
 *
 * 职责：
 * - 提取 BasicSystemWorkspace 和 BasicUserWorkspace 的共享业务逻辑
 * - 参数化 session store 和优化/迭代模板类型
 * - 优化、迭代、测试、版本管理、评估等核心功能
 *
 * @param services - AppServices 实例
 * @param sessionStore - Session store（BasicSystemSession 或 BasicUserSession）
 * @param optimizationMode - 优化模式（'system' | 'user'）
 * @param templateType - 优化模板类型（'optimize' | 'userOptimize'）
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { AppServices } from '../../types/services'
import type { OptimizationRequest, PromptRecord, PromptRecordChain, PromptRecordType } from '@prompt-optimizer/core'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '../ui/useToast'
import { useI18n } from 'vue-i18n'
import { getI18nErrorMessage } from '../../utils/error'
import type { IteratePayload } from '../../types/workspace'

type BasicSessionStore = {
  prompt: string
  optimizedPrompt: string
  reasoning: string
  chainId: string
  versionId: string
  testContent: string
  selectedOptimizeModelKey: string
  selectedTestModelKey: string
  selectedTemplateId: string | null
  selectedIterateTemplateId: string | null
  isCompareMode: boolean
  updatePrompt: (prompt: string) => void
  updateOptimizedResult: (payload: {
    optimizedPrompt: string
    reasoning?: string
    chainId: string
    versionId: string
  }) => void
  updateTestContent: (content: string) => void
  updateOptimizeModel: (key: string) => void
  updateTestModel: (key: string) => void
  updateTemplate: (id: string | null) => void
  updateIterateTemplate: (id: string | null) => void
}

interface UseBasicWorkspaceLogicOptions {
  services: Ref<AppServices | null>
  sessionStore: BasicSessionStore
  optimizationMode: 'system' | 'user'
  promptRecordType: PromptRecordType
  onOptimizeComplete?: (chain: PromptRecordChain) => void
  onIterateComplete?: (chain: PromptRecordChain) => void
  onLocalEditComplete?: (chain: PromptRecordChain) => void
}

export function useBasicWorkspaceLogic(options: UseBasicWorkspaceLogicOptions) {
  const { services, sessionStore, optimizationMode, promptRecordType, onOptimizeComplete, onIterateComplete, onLocalEditComplete } = options
  const toast = useToast()
  const { t } = useI18n()

  // 过程态状态
  const isOptimizing = ref(false)
  const isIterating = ref(false)

  // 历史管理专用 ref（不写入 session store）
  const currentChainId = ref('')
  const currentVersions = ref<PromptRecordChain['versions']>([])
  const currentVersionId = ref('')

  // 状态代理（从 session store 读取）
  const prompt = computed<string>({
    get: () => sessionStore.prompt || '',
    set: (value) => sessionStore.updatePrompt(value || '')
  })

  const optimizedPrompt = computed<string>({
    get: () => sessionStore.optimizedPrompt || '',
    set: (value) => {
      sessionStore.updateOptimizedResult({
        optimizedPrompt: value || '',
        reasoning: sessionStore.reasoning || '',
        chainId: sessionStore.chainId || '',
        versionId: sessionStore.versionId || ''
      })
    }
  })

  const optimizedReasoning = computed<string>({
    get: () => sessionStore.reasoning || '',
    set: (value) => {
      sessionStore.updateOptimizedResult({
        optimizedPrompt: sessionStore.optimizedPrompt || '',
        reasoning: value || '',
        chainId: sessionStore.chainId || '',
        versionId: sessionStore.versionId || ''
      })
    }
  })

  const testContent = computed<string>({
    get: () => sessionStore.testContent || '',
    set: (value) => sessionStore.updateTestContent(value || '')
  })

  const selectedOptimizeModelKey = computed<string>({
    get: () => sessionStore.selectedOptimizeModelKey || '',
    set: (value) => sessionStore.updateOptimizeModel(value || '')
  })

  const selectedTestModelKey = computed<string>({
    get: () => sessionStore.selectedTestModelKey || '',
    set: (value) => sessionStore.updateTestModel(value || '')
  })

  const selectedTemplateId = computed<string | null>({
    get: () => sessionStore.selectedTemplateId || null,
    set: (value) => sessionStore.updateTemplate(value)
  })

  const selectedIterateTemplateId = computed<string | null>({
    get: () => sessionStore.selectedIterateTemplateId || null,
    set: (value) => sessionStore.updateIterateTemplate(value)
  })

  // ==================== 核心业务逻辑 ====================

  /**
   * 1. 优化提示词
   */
  const handleOptimize = async () => {
    if (!prompt.value?.trim() || isOptimizing.value) return

    const promptService = services.value?.promptService
    if (!promptService) {
      toast.error(t('toast.error.serviceInit'))
      return
    }

    const templateId = selectedTemplateId.value
    const modelKey = selectedOptimizeModelKey.value

    if (!templateId) {
      toast.error(t('toast.error.noOptimizeTemplate'))
      return
    }
    if (!modelKey) {
      toast.error(t('toast.error.noOptimizeModel'))
      return
    }

    isOptimizing.value = true

    // 清理历史绑定，避免“旧 chainId/versionId”污染本次优化过程态
    sessionStore.updateOptimizedResult({
      optimizedPrompt: '',
      reasoning: '',
      chainId: '',
      versionId: ''
    })

    try {
      const request: OptimizationRequest = {
        optimizationMode,
        targetPrompt: prompt.value,
        templateId,
        modelKey
      }

      await promptService.optimizePromptStream(request, {
        onToken: (token: string) => {
          optimizedPrompt.value += token
        },
        onReasoningToken: (token: string) => {
          optimizedReasoning.value += token
        },
        onComplete: async () => {
          const historyManager = services.value?.historyManager
          if (historyManager) {
            try {
              const recordData = {
                id: uuidv4(),
                originalPrompt: prompt.value,
                optimizedPrompt: optimizedPrompt.value,
                type: promptRecordType,
                modelKey,
                templateId,
                timestamp: Date.now(),
                metadata: {
                  optimizationMode,
                  functionMode: 'basic'
                }
              }

              const chain = await historyManager.createNewChain(recordData)
              currentChainId.value = chain.chainId
              currentVersions.value = chain.versions
              currentVersionId.value = chain.currentRecord.id

              sessionStore.updateOptimizedResult({
                optimizedPrompt: optimizedPrompt.value,
                reasoning: optimizedReasoning.value,
                chainId: chain.chainId,
                versionId: chain.currentRecord.id
              })

              onOptimizeComplete?.(chain)
              toast.success(t('toast.success.optimizeSuccess'))
            } catch (error) {
              console.error('[useBasicWorkspaceLogic] 创建历史记录失败:', error)
              currentVersions.value = []
              currentChainId.value = ''
              currentVersionId.value = ''
              // 清理绑定，避免残留旧 chainId/versionId
              sessionStore.updateOptimizedResult({
                optimizedPrompt: optimizedPrompt.value,
                reasoning: optimizedReasoning.value,
                chainId: '',
                versionId: ''
              })
              toast.warning(t('toast.warning.optimizeCompleteButHistoryFailed'))
            }
          } else {
            currentVersions.value = []
            currentChainId.value = ''
            currentVersionId.value = ''
            // 无历史服务：确保 session 不残留旧 chainId/versionId
            sessionStore.updateOptimizedResult({
              optimizedPrompt: optimizedPrompt.value,
              reasoning: optimizedReasoning.value,
              chainId: '',
              versionId: ''
            })
            toast.success(t('toast.success.optimizeCompleteNoHistory'))
          }
        },
        onError: (error: Error) => {
          throw error
        }
      })
    } catch (error) {
      const fallback = t('toast.error.optimizeFailed')
      const detail = getI18nErrorMessage(error, fallback)
      if (detail === fallback) {
        toast.error(fallback)
      } else {
        toast.error(`${fallback}: ${detail}`)
      }
    } finally {
      isOptimizing.value = false
    }
  }

  /**
   * 2. 迭代优化
   */
  const handleIterate = async (payload: IteratePayload) => {
    if (!optimizedPrompt.value?.trim() || isIterating.value) return

    const promptService = services.value?.promptService
    if (!promptService) {
      toast.error(t('toast.error.serviceInit'))
      return
    }

    const iterateTemplateId = selectedIterateTemplateId.value
    const modelKey = selectedOptimizeModelKey.value
    const iterateInput = payload?.iterateInput?.trim() || ''

    if (!iterateTemplateId) {
      toast.error(t('toast.error.noIterateTemplate'))
      return
    }
    if (!modelKey) {
      toast.error(t('toast.error.noOptimizeModel'))
      return
    }
    if (!iterateInput) {
      toast.error(t('prompt.error.noIterateInput'))
      return
    }

    isIterating.value = true
    const originalPromptValue = payload.originalPrompt || prompt.value
    const lastOptimizedPrompt = payload.optimizedPrompt || optimizedPrompt.value
    optimizedPrompt.value = ''
    optimizedReasoning.value = ''

    try {
      await promptService.iteratePromptStream(
        originalPromptValue,
        lastOptimizedPrompt,
        iterateInput,
        modelKey,
        {
        onToken: (token: string) => {
          optimizedPrompt.value += token
        },
        onReasoningToken: (token: string) => {
          optimizedReasoning.value += token
        },
        onComplete: async () => {
          const historyManager = services.value?.historyManager
          if (historyManager) {
            try {
              const chainId = currentChainId.value || sessionStore.chainId || ''

              // 如果当前没有链（例如：历史服务存在但此前未写入/被清空），先创建新链再继续
              const chain = chainId
                ? await historyManager.addIteration({
                    chainId,
                    originalPrompt: originalPromptValue,
                    optimizedPrompt: optimizedPrompt.value,
                    iterationNote: iterateInput,
                    modelKey,
                    templateId: iterateTemplateId,
                  })
                : await historyManager.createNewChain({
                    id: uuidv4(),
                    originalPrompt: originalPromptValue,
                    optimizedPrompt: optimizedPrompt.value,
                    type: promptRecordType,
                    modelKey,
                    templateId: iterateTemplateId,
                    timestamp: Date.now(),
                    metadata: { optimizationMode, functionMode: 'basic' },
                  })

              currentChainId.value = chain.chainId
              currentVersions.value = chain.versions
              currentVersionId.value = chain.currentRecord.id

              sessionStore.updateOptimizedResult({
                optimizedPrompt: optimizedPrompt.value,
                reasoning: optimizedReasoning.value,
                chainId: chain.chainId,
                versionId: chain.currentRecord.id
              })

              onIterateComplete?.(chain)
              toast.success(t('toast.success.iterateComplete'))
            } catch (error) {
              console.error('[useBasicWorkspaceLogic] 保存迭代记录失败:', error)
              currentVersions.value = []
              currentChainId.value = ''
              currentVersionId.value = ''
              sessionStore.updateOptimizedResult({
                optimizedPrompt: optimizedPrompt.value,
                reasoning: optimizedReasoning.value,
                chainId: '',
                versionId: ''
              })
              toast.warning(t('toast.warning.iterateCompleteButHistoryFailed'))
            }
          } else {
            currentVersions.value = []
            currentChainId.value = ''
            currentVersionId.value = ''
            sessionStore.updateOptimizedResult({
              optimizedPrompt: optimizedPrompt.value,
              reasoning: optimizedReasoning.value,
              chainId: '',
              versionId: ''
            })
            toast.success(t('toast.success.iterateCompleteNoHistory'))
          }
        },
        onError: (error: Error) => {
          throw error
        }
        },
        iterateTemplateId,
      )
    } catch (error) {
      const fallback = t('toast.error.iterateFailed')
      const detail = getI18nErrorMessage(error, fallback)
      if (detail === fallback) {
        toast.error(fallback)
      } else {
        toast.error(`${fallback}: ${detail}`)
      }
    } finally {
      isIterating.value = false
    }
  }

  /**
   * 3.5 保存本地编辑为新版本（不触发 LLM）
   * - 将当前编辑后的 optimizedPrompt 写入历史链
   * - 清空 reasoning（避免误用旧的推理内容）
   */
  const handleSaveLocalEdit = async (payload: { optimizedPrompt: string; note?: string; source?: 'patch' | 'manual' }) => {
    const historyManager = services.value?.historyManager
    if (!historyManager) {
      toast.error(t('toast.error.historyUnavailable'))
      return
    }

    const newPrompt = payload.optimizedPrompt || ''
    if (!newPrompt.trim()) return

    try {
      const chainId = currentChainId.value || sessionStore.chainId || ''
      const currentRecord = currentVersions.value.find((v) => v.id === currentVersionId.value)

      const modelKey = currentRecord?.modelKey || selectedOptimizeModelKey.value || 'local-edit'
      const templateId =
        currentRecord?.templateId ||
        selectedIterateTemplateId.value ||
        selectedTemplateId.value ||
        'local-edit'

      const note = payload.note || (payload.source === 'patch' ? 'Direct fix' : 'Manual edit')

      const chain = chainId
        ? await historyManager.addIteration({
            chainId,
            originalPrompt: prompt.value,
            optimizedPrompt: newPrompt,
            modelKey,
            templateId,
            iterationNote: note,
            metadata: {
              optimizationMode,
              functionMode: 'basic',
              localEdit: true,
              localEditSource: payload.source || 'manual',
            },
          })
        : await historyManager.createNewChain({
            id: uuidv4(),
            originalPrompt: prompt.value,
            optimizedPrompt: newPrompt,
            type: promptRecordType,
            modelKey,
            templateId,
            timestamp: Date.now(),
            metadata: {
              optimizationMode,
              functionMode: 'basic',
              localEdit: true,
              localEditSource: payload.source || 'manual',
            },
          })

      currentChainId.value = chain.chainId
      currentVersions.value = chain.versions
      currentVersionId.value = chain.currentRecord.id

      sessionStore.updateOptimizedResult({
        optimizedPrompt: newPrompt,
        reasoning: '',
        chainId: chain.chainId,
        versionId: chain.currentRecord.id,
      })

      onLocalEditComplete?.(chain)
      toast.success(t('toast.success.localEditSaved'))
    } catch (error) {
      console.error('[useBasicWorkspaceLogic] 保存本地编辑失败:', error)
      toast.warning(t('toast.warning.saveHistoryFailed'))
    }
  }

  /**
   * 4. 切换版本
   */
  const handleSwitchVersion = (version: PromptRecord) => {
    if (!version?.id) return

    optimizedPrompt.value = version.optimizedPrompt || ''
    optimizedReasoning.value = ''
    currentVersionId.value = version.id
    currentChainId.value = version.chainId || currentChainId.value || sessionStore.chainId || ''

    sessionStore.updateOptimizedResult({
      optimizedPrompt: version.optimizedPrompt || '',
      reasoning: '',
      chainId: currentChainId.value || '',
      versionId: version.id
    })
  }

  /**
   * 5. 加载版本列表
   */
  const loadVersions = async () => {
    const historyManager = services.value?.historyManager
    if (!historyManager) {
      currentVersions.value = []
      currentChainId.value = ''
      currentVersionId.value = ''
      return
    }

    const chainId = sessionStore.chainId
    if (!chainId) {
      currentVersions.value = []
      currentChainId.value = ''
      currentVersionId.value = ''
      return
    }

    try {
      const chain = await historyManager.getChain(chainId)
      currentVersions.value = chain.versions
      currentChainId.value = chain.chainId
      currentVersionId.value = sessionStore.versionId || chain.currentRecord.id
    } catch (error) {
      console.error('[useBasicWorkspaceLogic] 加载版本失败:', error)
      currentVersions.value = []
      currentChainId.value = ''
      currentVersionId.value = ''
    }
  }

  /**
   * 6. 分析提示词
   * - 不写入历史记录
   * - 只在当前工作区创建一个内存中的虚拟 V0
   * - 清空当前链绑定，避免旧链继续影响下方版本区和右侧测试区
   */
  const handleAnalyze = () => {
    if (!prompt.value?.trim()) return

    const virtualV0Id = uuidv4()
    const virtualV0: PromptRecordChain['versions'][number] = {
      id: virtualV0Id,
      chainId: '',
      version: 0,
      originalPrompt: prompt.value,
      optimizedPrompt: prompt.value,
      type: promptRecordType,
      timestamp: Date.now(),
      modelKey: '',
      templateId: '',
    }

    currentChainId.value = ''
    currentVersions.value = [virtualV0]
    currentVersionId.value = virtualV0Id

    sessionStore.updateOptimizedResult({
      optimizedPrompt: prompt.value,
      reasoning: '',
      chainId: '',
      versionId: '',
    })
  }

  return {
    // 状态代理
    prompt,
    optimizedPrompt,
    optimizedReasoning,
    testContent,
    selectedOptimizeModelKey,
    selectedTestModelKey,
    selectedTemplateId,
    selectedIterateTemplateId,

    // 过程态
    isOptimizing,
    isIterating,

    // 历史管理
    currentChainId,
    currentVersions,
    currentVersionId,

    // 业务逻辑
    handleOptimize,
    handleIterate,
    handleSaveLocalEdit,
    handleSwitchVersion,
    loadVersions,
    handleAnalyze
  }
}
