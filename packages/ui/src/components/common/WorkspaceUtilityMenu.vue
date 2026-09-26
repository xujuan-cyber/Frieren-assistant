<template>
  <div
    class="workspace-utility-button-column"
    :style="triggerStyle"
  >
    <SourceAssetBadge
      v-if="source"
      :source="source"
      button-size="small"
      button-variant="secondary"
      button-class="workspace-utility-button"
    />

    <ThemedTooltip
      v-if="isPromptGardenEnabled"
      :label="t('common.promptGarden.title')"
      placement="left"
    >
      <span class="workspace-utility-menu-trigger">
        <NDropdown
          trigger="click"
          :options="gardenMenuOptions"
          placement="bottom-end"
          @select="handleGardenSelect"
        >
          <NButton
            class="workspace-utility-button workspace-utility-button--garden"
            size="small"
            secondary
            circle
            :disabled="disabled"
            data-testid="workspace-prompt-garden-menu"
            :aria-label="t('common.promptGarden.title')"
            title=""
          >
            <template #icon>
              <NIcon>
                <Plant2 />
              </NIcon>
            </template>
          </NButton>
        </NDropdown>
      </span>
    </ThemedTooltip>

    <ThemedTooltip :label="t('common.workspaceTools')" placement="left">
      <span class="workspace-utility-menu-trigger">
        <NDropdown
          trigger="click"
          :options="menuOptions"
          placement="bottom-end"
          @select="handleSelect"
        >
          <NButton
            class="workspace-utility-button"
            size="small"
            secondary
            circle
            :disabled="disabled"
            :data-testid="testId"
            :aria-label="t('common.workspaceTools')"
            title=""
          >
            <template #icon>
              <NIcon>
                <DotsVertical />
              </NIcon>
            </template>
          </NButton>
        </NDropdown>
      </span>
    </ThemedTooltip>
  </div>

  <NModal
    v-model:show="showClearConfirm"
    preset="dialog"
    :title="t('common.clearContent')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :positive-button-props="{ type: 'error' }"
    :show-icon="false"
    :mask-closable="false"
    :on-positive-click="handleConfirmClear"
  >
    <div class="workspace-clear-content-confirm">
      <div class="workspace-clear-content-confirm-row">
        <strong>{{ t('common.clearContentWillLabel') }}</strong>
        <span>{{ t('common.clearContentWill') }}</span>
      </div>
      <div class="workspace-clear-content-confirm-row">
        <strong>{{ t('common.clearContentKeepLabel') }}</strong>
        <span>{{ t('common.clearContentKeep') }}</span>
      </div>
    </div>
  </NModal>

  <PromptGardenImportDialog
    v-model:show="showPromptGardenImport"
    :title="promptGardenImportDialogTitle"
    :hint="promptGardenImportDialogHint"
    @confirm="handleConfirmPromptGardenImport"
  />
</template>

<script setup lang="ts">
import { computed, h, inject, nextTick, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { routerKey, type LocationQueryRaw } from 'vue-router'
import { NButton, NDropdown, NIcon, NModal, type DropdownOption } from 'naive-ui'
import { Bookmark, ClearAll, DotsVertical, ExternalLink, Plant2, FileImport } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import { getEnvVar } from '@prompt-optimizer/core'
import SourceAssetBadge from '../source/SourceAssetBadge.vue'
import PromptGardenImportDialog from './PromptGardenImportDialog.vue'
import ThemedTooltip from './ThemedTooltip.vue'
import { openExternalUrl } from '../../utils/open-external-url'
import type { PromptGardenImportRequest } from '../../utils/prompt-garden-import'
import type { SourceAssetRef } from '../../utils/source-asset'

withDefaults(defineProps<{
  disabled?: boolean
  testId?: string
  source?: SourceAssetRef | null
}>(), {
  disabled: false,
  testId: undefined,
  source: null,
})

const emit = defineEmits<{
  clear: []
}>()

const { t } = useI18n()
const router = inject(routerKey, null)
const showClearConfirm = ref(false)
const showPromptGardenImport = ref(false)
const promptGardenImportIntent = ref<'use' | 'favorite'>('use')
const triggerStyle = ref<CSSProperties>({})
let placementResizeObserver: ResizeObserver | null = null

// 按钮列尺寸与页面留白的判定常量
const BUTTON_SIZE = 28
const EDGE_INSET = 8
// 内容区需要让出的宽度：按钮列 + 内缩 + 4px 间隙。
// 由 updateTriggerPlacement 写入 .main-content-wrapper 的 --workspace-tools-reserve，
// 样式规则见 MainLayout.vue。
const RESERVE_VAR = '--workspace-tools-reserve'
const RESERVE_PX = `${BUTTON_SIZE + EDGE_INSET + 4}px`

const applyGutterReserve = (wrapper: HTMLElement, reserve: boolean) => {
  if (reserve) wrapper.style.setProperty(RESERVE_VAR, RESERVE_PX)
  else wrapper.style.removeProperty(RESERVE_VAR)
}

const isPromptGardenEnabled = computed(() => {
  const value = getEnvVar('VITE_ENABLE_PROMPT_GARDEN_IMPORT').trim().toLowerCase()
  return value === '1' || value === 'true'
})

const promptGardenBaseUrl = computed(() => {
  return getEnvVar('VITE_PROMPT_GARDEN_BASE_URL').trim().replace(/\/$/, '')
})

const updateTriggerPlacement = () => {
  if (typeof window === 'undefined') return

  const wrapper = document.querySelector('.main-content-wrapper')
  if (!(wrapper instanceof HTMLElement)) {
    triggerStyle.value = {}
    return
  }

  const rect = wrapper.getBoundingClientRect()
  const viewportRightGap = Math.max(0, window.innerWidth - rect.right)
  const buttonSize = BUTTON_SIZE
  // 右侧留白（即页面内边距 clamp(16px, 2vw, 48px)）足够容纳按钮时，居中放置于留白区，
  // 此时内容区不需要让位；不足时（视口 < ~1800px）按钮列只能落在内容区右沿内侧。
  const gutterFits = viewportRightGap >= BUTTON_SIZE + EDGE_INSET
  const right = gutterFits
    ? Math.round((viewportRightGap - buttonSize) / 2)
    : viewportRightGap + EDGE_INSET

  // 关键：留白不足时让内容主动让出右侧宽度，从结构上保证"浮动按钮永不压住内容"。
  // 只靠上面算出的 right 偏移不足以保证不重叠 —— 内容区右沿之内是任何内容都可使用的空间。
  applyGutterReserve(wrapper, !gutterFits)

  triggerStyle.value = {
    top: `${Math.round(rect.top + 2)}px`,
    right: `${right}px`,
  }
}

onMounted(() => {
  void nextTick(updateTriggerPlacement)
  window.addEventListener('resize', updateTriggerPlacement)

  const wrapper = document.querySelector('.main-content-wrapper')
  if (typeof ResizeObserver !== 'undefined' && wrapper instanceof HTMLElement) {
    placementResizeObserver = new ResizeObserver(updateTriggerPlacement)
    placementResizeObserver.observe(wrapper)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTriggerPlacement)
  placementResizeObserver?.disconnect()
  placementResizeObserver = null

  // 释放预留给按钮列的内容区宽度，避免工作区切换后残留
  const wrapper = document.querySelector('.main-content-wrapper')
  if (wrapper instanceof HTMLElement && wrapper.style.getPropertyValue(RESERVE_VAR) === RESERVE_PX) {
    wrapper.style.removeProperty(RESERVE_VAR)
  }
})

const menuOptions = computed<DropdownOption[]>(() => [
  {
    key: 'clear-content',
    label: t('common.clearContent'),
    icon: () => h(NIcon, null, { default: () => h(ClearAll) }),
    renderLabel: () => h(
      'span',
      { style: { color: 'var(--n-color-error)' } },
      t('common.clearContent'),
    ),
  },
])

const gardenMenuOptions = computed<DropdownOption[]>(() => [
  {
    key: 'discover',
    label: t('common.promptGarden.discover'),
    icon: () => h(NIcon, null, { default: () => h(ExternalLink) }),
  },
  {
    key: 'import-code',
    label: t('common.promptGarden.importPrompt'),
    icon: () => h(NIcon, null, { default: () => h(FileImport) }),
  },
  {
    key: 'import-favorite',
    label: t('common.promptGarden.importFavorite'),
    icon: () => h(NIcon, null, { default: () => h(Bookmark) }),
  },
])

const promptGardenImportDialogTitle = computed(() =>
  promptGardenImportIntent.value === 'favorite'
    ? t('common.promptGarden.importFavoriteTitle')
    : t('common.promptGarden.importTitle'),
)

const promptGardenImportDialogHint = computed(() =>
  promptGardenImportIntent.value === 'favorite'
    ? t('common.promptGarden.importFavoriteHint')
    : t('common.promptGarden.importHint'),
)

const handleSelect = (key: string) => {
  if (key === 'clear-content') {
    showClearConfirm.value = true
  }
}

const handleGardenSelect = (key: string) => {
  if (key === 'discover') {
    void openExternalUrl(promptGardenBaseUrl.value, { logPrefix: 'PromptGarden' })
    return
  }

  if (key === 'import-code') {
    promptGardenImportIntent.value = 'use'
    showPromptGardenImport.value = true
  }

  if (key === 'import-favorite') {
    promptGardenImportIntent.value = 'favorite'
    showPromptGardenImport.value = true
  }
}

const handleConfirmClear = () => {
  emit('clear')
}

const handleConfirmPromptGardenImport = async (request: PromptGardenImportRequest) => {
  if (!request.importCode || !router) return false

  const currentRoute = router.currentRoute.value
  const query: LocationQueryRaw = {
    ...currentRoute.query,
    importCode: request.importCode,
  }

  if (promptGardenImportIntent.value === 'favorite') {
    query.saveToFavorites = 'confirm'
    delete query.exampleId
  } else {
    delete query.saveToFavorites
    if (request.exampleId) {
      query.exampleId = request.exampleId
    } else {
      delete query.exampleId
    }
  }

  if (request.subModeKey) {
    query.subModeKey = request.subModeKey
  } else {
    delete query.subModeKey
  }

  await router.push({
    path: currentRoute.path,
    query,
  })

  showPromptGardenImport.value = false
  return true
}
</script>

<style scoped>
.workspace-utility-button-column {
  display: flex;
  position: fixed;
  z-index: 20;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.workspace-utility-menu-trigger {
  display: inline-flex;
}

.workspace-utility-button,
:deep(.workspace-utility-button) {
  color: var(--n-text-color-3);
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
}

.workspace-utility-button:hover,
:deep(.workspace-utility-button:hover) {
  color: var(--n-primary-color);
  border-color: color-mix(in srgb, var(--n-primary-color) 24%, transparent);
  background: color-mix(in srgb, var(--n-primary-color) 8%, transparent);
}

.workspace-utility-button--garden,
:deep(.workspace-utility-button--garden) {
  color: color-mix(in srgb, var(--n-success-color) 82%, var(--n-text-color-3));
}

.workspace-clear-content-confirm {
  display: grid;
  gap: 8px;
  max-width: 360px;
  line-height: 1.5;
}

.workspace-clear-content-confirm-row {
  display: flex;
  gap: 4px;
  align-items: flex-start;
}

.workspace-clear-content-confirm-row strong {
  flex: none;
  color: var(--n-text-color-1);
  font-weight: 600;
}

.workspace-clear-content-confirm-row span {
  color: var(--n-text-color-2);
}

</style>
