<!--
    翻译助手工作区

    设计原则：
    - 专用界面：不涉及提示词优化概念，只有「原文 → 译文」这条主线。
    - 纯文本展示译文（不做 Markdown 渲染）：翻译结果常需要原样复制，
      渲染会引入格式噪音；用 pre-wrap 保留换行即可。
    - 不接入会话体系，仅偏好（语言对/风格/模型）落 localStorage。
-->
<template>
  <div class="translate-workspace" data-testid="translate-workspace" :style="themeStyle">
    <!-- 工具栏 -->
    <div class="translate-toolbar">
      <div class="translate-toolbar__group">
        <NSelect
          v-model:value="sourceLanguage"
          :options="sourceLanguageOptions"
          size="small"
          class="translate-lang-select"
          data-testid="translate-source-language"
        />
        <NButton
          quaternary
          size="small"
          :disabled="sourceLanguage === AUTO_DETECT_CODE"
          :title="t('translate.swap')"
          :aria-label="t('translate.swap')"
          data-testid="translate-swap"
          @click="swapLanguages"
        >
          <template #icon>
            <NIcon :size="16"><ArrowsLeftRight /></NIcon>
          </template>
        </NButton>
        <NSelect
          v-model:value="targetLanguage"
          :options="targetLanguageOptions"
          size="small"
          class="translate-lang-select"
          data-testid="translate-target-language"
        />
      </div>

      <div class="translate-toolbar__group">
        <NSelect
          v-model:value="style"
          :options="styleOptions"
          size="small"
          class="translate-style-select"
          data-testid="translate-style"
        />
        <NPopover trigger="click" placement="bottom-end" :disabled="false">
          <template #trigger>
            <NButton quaternary size="small" :title="t('translate.glossary')" :aria-label="t('translate.glossary')">
              <template #icon>
                <NIcon :size="16"><Bookmark /></NIcon>
              </template>
            </NButton>
          </template>
          <div class="translate-glossary-popover">
            <NText strong>{{ t('translate.glossary') }}</NText>
            <NText depth="3" class="translate-glossary-popover__hint">
              {{ t('translate.glossaryHint') }}
            </NText>
            <NInput
              v-model:value="glossary"
              type="textarea"
              size="small"
              :rows="6"
              :placeholder="t('translate.glossaryPlaceholder')"
            />
          </div>
        </NPopover>
        <SelectWithConfig
          v-model="selectedModelKey"
          :options="modelOptions"
          :get-primary="getModelPrimary"
          :get-secondary="getModelSecondary"
          :get-value="getModelValue"
          :show-empty-config-cta="true"
          :placeholder="t('translate.model')"
          size="small"
          class="translate-model-select"
          data-testid="translate-model"
          @config="handleOpenModelManager"
        />
      </div>
    </div>

    <!-- 主体：原文 / 译文 -->
    <div class="translate-split">
      <section class="translate-pane">
        <div class="translate-pane__header">
          <NText strong>{{ t('translate.sourceLabel') }}</NText>
          <NText depth="3" class="translate-pane__meta">
            {{ t('translate.characters', { count: sourceCharCount }) }}
          </NText>
        </div>
        <div class="translate-pane__body">
          <NInput
            v-model:value="sourceText"
            type="textarea"
            :placeholder="t('translate.sourcePlaceholder')"
            :bordered="false"
            class="translate-pane__input"
            data-testid="translate-source-input"
            @keydown.ctrl.enter="handleTranslate"
            @keydown.meta.enter="handleTranslate"
          />
        </div>
        <div class="translate-pane__footer">
          <NButton
            size="small"
            quaternary
            :disabled="!sourceText"
            @click="clearAll"
          >
            <template #icon>
              <NIcon :size="16"><Trash /></NIcon>
            </template>
            {{ t('translate.clearAll') }}
          </NButton>
          <NButton
            size="small"
            type="primary"
            :loading="isTranslating"
            :disabled="!canTranslate"
            data-testid="translate-submit"
            @click="handleTranslate"
          >
            <template #icon>
              <NIcon :size="16"><Wand /></NIcon>
            </template>
            {{ isTranslating ? t('translate.translating') : t('translate.translate') }}
          </NButton>
        </div>
      </section>

      <section class="translate-pane">
        <div class="translate-pane__header">
          <NText strong>{{ t('translate.resultLabel') }}</NText>
          <NButton
            v-if="hasResult"
            size="tiny"
            quaternary
            @click="handleCopy"
          >
            <template #icon>
              <NIcon :size="14"><Copy /></NIcon>
            </template>
            {{ copied ? t('translate.copied') : t('translate.copy') }}
          </NButton>
        </div>
        <div class="translate-pane__body">
          <NAlert v-if="errorMessage" type="error" :bordered="false" class="translate-alert">
            {{ errorMessage }}
          </NAlert>
          <div v-else-if="isTranslating" class="translate-pane__placeholder">
            <NSpin size="small" />
            <NText depth="3">{{ t('translate.translating') }}</NText>
          </div>
          <pre v-else-if="hasResult" class="translate-pane__result" data-testid="translate-result">{{ resultText }}</pre>
          <div v-else class="translate-pane__placeholder">
            <NEmpty size="small" :description="t('translate.resultPlaceholder')" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  NAlert,
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NPopover,
  NSelect,
  NSpin,
  NText,
  useThemeVars,
} from 'naive-ui'
import { ArrowsLeftRight, Bookmark, Copy, Trash, Wand } from '@vicons/tabler'

import SelectWithConfig from '../SelectWithConfig.vue'
import type { AppServices } from '../../types/services'
import type { SelectOption } from '../../types/select-options'
import { useTranslation } from './useTranslation'
import { AUTO_DETECT_CODE, SUPPORTED_LANGUAGES, type TranslationStyle } from './translate-prompts'

const { t } = useI18n()

/**
 * naive-ui 的主题变量（--n-*）作用域仅限其组件自身，自定义元素（本组件的工具栏
 * 与分栏卡片）上取不到，会导致 border / background 声明被整条丢弃。
 * 用官方 useThemeVars 映射为局部 CSS 变量，保证浅色 / 深色主题配色正确。
 */
const themeVars = useThemeVars()
const themeStyle = computed(() => ({
  '--ui-color': themeVars.value.bodyColor,
  '--ui-card-color': themeVars.value.cardColor,
  '--ui-border-color': themeVars.value.borderColor,
  '--ui-text-color': themeVars.value.textColor1,
  '--ui-text-color-3': themeVars.value.textColor3,
  '--ui-primary-color': themeVars.value.primaryColor,
}))

const injectedServices = inject<Ref<AppServices | null>>('services')
const services = computed(() => injectedServices?.value ?? null)

// 由 PromptOptimizerApp 提供；缺失时退化为不显示「配置模型」入口
const openModelManager = inject<(() => void) | null>('openModelManager', null)

const {
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
  swapLanguages,
  clearAll,
  translate,
} = useTranslation(services)

const languageOptions = SUPPORTED_LANGUAGES.map((item) => ({
  label: item.label,
  value: item.code,
}))

const sourceLanguageOptions = [
  { label: t('translate.autoDetect'), value: AUTO_DETECT_CODE },
  ...languageOptions,
]

const targetLanguageOptions = languageOptions

const styleOptions = computed(() => [
  { label: t('translate.styleFaithful'), value: 'faithful' },
  { label: t('translate.styleNatural'), value: 'natural' },
  { label: t('translate.styleTechnical'), value: 'technical' },
])

// SelectWithConfig 的访问器接收基础 SelectOption（raw 为 unknown），故按基础类型声明；
// primary / secondary / value 三个字段基础类型已具备，无需收窄到 ModelSelectOption。
const getModelPrimary = (option: SelectOption) => option.primary
const getModelSecondary = (option: SelectOption) => option.secondary
const getModelValue = (option: SelectOption) => option.value

const handleOpenModelManager = () => {
  openModelManager?.()
}

const handleTranslate = () => {
  void translate()
}

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const handleCopy = async () => {
  const text = resultText.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    // 剪贴板不可用（非安全上下文 / 未授权）时不打断用户，静默失败
  }
}
</script>

<style scoped>
.translate-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

/* ---------- 工具栏 ---------- */
.translate-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 8px 12px;
  border: 1px solid var(--ui-border-color);
  border-radius: 12px;
  background: var(--ui-card-color);
}

.translate-toolbar__group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.translate-lang-select {
  min-width: 150px;
}

.translate-style-select {
  min-width: 120px;
}

.translate-model-select {
  min-width: 180px;
}

.translate-glossary-popover {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 280px;
}

.translate-glossary-popover__hint {
  font-size: 12px;
  line-height: 1.4;
}

/* ---------- 分栏 ---------- */
.translate-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.translate-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--ui-border-color);
  border-radius: 14px;
  background: var(--ui-card-color);
  overflow: hidden;
}

.translate-pane__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ui-border-color);
  min-height: 44px;
}

.translate-pane__meta {
  font-size: 12px;
  white-space: nowrap;
}

.translate-pane__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  overflow: hidden;
}

.translate-pane__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--ui-border-color);
}

/* 输入框撑满面板；naive-ui 的 textarea 需要逐层设高 */
.translate-pane__input,
.translate-pane__input :deep(.n-input__textarea),
.translate-pane__input :deep(.n-input__textarea-el) {
  height: 100%;
}

.translate-pane__input :deep(.n-input__textarea-el) {
  resize: none;
  line-height: 1.6;
}

.translate-pane__placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 0;
}

.translate-pane__result {
  flex: 1;
  margin: 0;
  min-height: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.translate-alert {
  margin-bottom: 8px;
}

/* ---------- 响应式 ---------- */
/* 窄容器（扩展 popup、窄窗口）下改为上下分栏，避免两栏各自被压到不可读 */
@media (max-width: 900px) {
  .translate-split {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .translate-toolbar {
    justify-content: flex-start;
  }

  .translate-toolbar__group {
    flex: 1 1 100%;
  }

  .translate-lang-select {
    flex: 1;
    min-width: 0;
  }

  .translate-model-select,
  .translate-style-select {
    flex: 1;
    min-width: 0;
  }
}
</style>
