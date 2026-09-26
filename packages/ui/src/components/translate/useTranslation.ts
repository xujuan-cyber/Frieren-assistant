/**
 * 翻译助手的核心逻辑
 *
 * 职责边界（刻意的设计取舍）：
 * - **不接入会话（session）体系**。翻译助手定位是「专用简洁界面」，
 *   若接入会话持久化，就必须扩展 core 的 LegacySessionSubModeKey 与 sessionKeys
 *   的硬编码白名单，波及三端；收益（记住原文/译文）远小于成本。
 * - 仅持久化「语言对 / 风格 / 模型」这类偏好到 localStorage，原子且无副作用。
 */
import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Message, TextModelConfig } from '@prompt-optimizer/core'

import type { AppServices } from '../../types/services'
import type { ModelSelectOption } from '../../types/select-options'
import { DataTransformer } from '../../utils/data-transformer'
import { getProviderDisplayName, getTextModelConfigDisplayName } from '../../utils/provider-display'
import { getI18nErrorMessage } from '../../utils/error'
import {
  AUTO_DETECT_CODE,
  buildTranslationSystemPrompt,
  type TranslationStyle,
} from './translate-prompts'

const PREFERENCE_STORAGE_KEY = 'prompt-optimizer/translate-preferences/v1'

interface TranslatePreferences {
  modelKey?: string
  sourceLanguage?: string
  targetLanguage?: string
  style?: TranslationStyle
}

const isTranslationStyle = (value: unknown): value is TranslationStyle =>
  value === 'faithful' || value === 'natural' || value === 'technical'

const readPreferences = (): TranslatePreferences => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const record = parsed as Record<string, unknown>
    return {
      modelKey: typeof record.modelKey === 'string' ? record.modelKey : undefined,
      sourceLanguage: typeof record.sourceLanguage === 'string' ? record.sourceLanguage : undefined,
      targetLanguage: typeof record.targetLanguage === 'string' ? record.targetLanguage : undefined,
      style: isTranslationStyle(record.style) ? record.style : undefined,
    }
  } catch {
    return {}
  }
}

const writePreferences = (preferences: TranslatePreferences): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // 隐私模式 / 配额耗尽时静默忽略：偏好丢失不影响翻译功能本身
  }
}

const DEFAULT_TARGET_LANGUAGE = 'zh-CN'

export function useTranslation(services: Ref<AppServices | null>) {
  const { t } = useI18n()
  const stored = readPreferences()

  // ---- 偏好状态 ----
  const modelOptions = ref<ModelSelectOption[]>([])
  const selectedModelKey = ref(stored.modelKey ?? '')
  const sourceLanguage = ref(stored.sourceLanguage ?? AUTO_DETECT_CODE)
  const targetLanguage = ref(stored.targetLanguage ?? DEFAULT_TARGET_LANGUAGE)
  const style = ref<TranslationStyle>(stored.style ?? 'faithful')
  const glossary = ref('')

  // ---- 翻译状态 ----
  const sourceText = ref('')
  const resultText = ref('')
  const isTranslating = ref(false)
  const errorMessage = ref('')

  const hasResult = computed(() => resultText.value.trim().length > 0)
  const sourceCharCount = computed(() => sourceText.value.length)
  const canTranslate = computed(
    () =>
      sourceText.value.trim().length > 0 &&
      selectedModelKey.value.length > 0 &&
      !isTranslating.value,
  )

  /**
   * 拉取可用文本模型。
   * 与工作区保持同一数据源（modelManager.getEnabledModels + DataTransformer），
   * 因此用户在「模型管理」里配置一次，翻译助手立即可用。
   * 带 token 竞态保护：快速重复触发时旧请求不覆盖新结果。
   */
  let refreshToken = 0
  const refreshModels = async (): Promise<void> => {
    const manager = services.value?.modelManager
    if (!manager) {
      modelOptions.value = []
      return
    }

    const token = ++refreshToken
    try {
      const ensureInitialized = (manager as { ensureInitialized?: () => Promise<void> })
        .ensureInitialized
      if (typeof ensureInitialized === 'function') {
        await ensureInitialized.call(manager)
      }

      const enabledModels: TextModelConfig[] = await manager.getEnabledModels()
      if (token !== refreshToken) return

      modelOptions.value = DataTransformer.modelsToSelectOptions(enabledModels, {
        getProviderName: (model) => getProviderDisplayName(model.providerMeta, t),
        getModelName: (model) => getTextModelConfigDisplayName(model, t),
      })

      // 当前选中模型已不可用（被删除/禁用）时回退到首个可用项
      const availableKeys = new Set(modelOptions.value.map((option) => option.value))
      if (!selectedModelKey.value || !availableKeys.has(selectedModelKey.value)) {
        selectedModelKey.value = modelOptions.value[0]?.value ?? ''
      }
    } catch (error) {
      if (token !== refreshToken) return
      modelOptions.value = []
      console.error(
        '[useTranslation] refreshModels failed:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  watch(
    () => services.value?.modelManager,
    () => {
      void refreshModels()
    },
    { immediate: true },
  )

  watch([selectedModelKey, sourceLanguage, targetLanguage, style], () => {
    writePreferences({
      modelKey: selectedModelKey.value,
      sourceLanguage: sourceLanguage.value,
      targetLanguage: targetLanguage.value,
      style: style.value,
    })
  })

  /** 交换语言对。源语言为「自动检测」时无法交换（没有确定值可换） */
  const swapLanguages = (): void => {
    if (sourceLanguage.value === AUTO_DETECT_CODE) return
    const previousSource = sourceLanguage.value
    sourceLanguage.value = targetLanguage.value
    targetLanguage.value = previousSource
  }

  const clearAll = (): void => {
    sourceText.value = ''
    resultText.value = ''
    errorMessage.value = ''
  }

  const translate = async (): Promise<void> => {
    const text = sourceText.value.trim()
    if (!text) {
      errorMessage.value = t('translate.emptyInput')
      return
    }

    const modelKey = selectedModelKey.value
    if (!modelKey) {
      errorMessage.value = t('translate.emptyModel')
      return
    }

    const llmService = services.value?.llmService
    if (!llmService) return

    isTranslating.value = true
    errorMessage.value = ''
    try {
      const messages: Message[] = [
        {
          role: 'system',
          content: buildTranslationSystemPrompt({
            sourceLanguage: sourceLanguage.value,
            targetLanguage: targetLanguage.value,
            style: style.value,
            glossary: glossary.value,
          }),
        },
        { role: 'user', content: text },
      ]

      resultText.value = await llmService.sendMessage(messages, modelKey)
    } catch (error) {
      errorMessage.value = getI18nErrorMessage(error, t('translate.failed'))
    } finally {
      isTranslating.value = false
    }
  }

  return {
    modelOptions,
    selectedModelKey,
    sourceLanguage,
    targetLanguage,
    style,
    glossary,
    sourceText,
    resultText,
    isTranslating,
    errorMessage,
    hasResult,
    sourceCharCount,
    canTranslate,
    refreshModels,
    swapLanguages,
    clearAll,
    translate,
  }
}

export type TranslationController = ReturnType<typeof useTranslation>
