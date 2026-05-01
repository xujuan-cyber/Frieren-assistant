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
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { NButton, NDropdown, NIcon, NModal, type DropdownOption } from 'naive-ui'
import { ClearAll, DotsVertical } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import SourceAssetBadge from '../source/SourceAssetBadge.vue'
import ThemedTooltip from './ThemedTooltip.vue'
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
const showClearConfirm = ref(false)
const triggerStyle = ref<CSSProperties>({})
let placementResizeObserver: ResizeObserver | null = null

const updateTriggerPlacement = () => {
  if (typeof window === 'undefined') return

  const wrapper = document.querySelector('.main-content-wrapper')
  if (!(wrapper instanceof HTMLElement)) {
    triggerStyle.value = {}
    return
  }

  const rect = wrapper.getBoundingClientRect()
  const viewportRightGap = Math.max(0, window.innerWidth - rect.right)
  const buttonSize = 28
  const right = Math.max(0, Math.round((viewportRightGap - buttonSize) / 2))

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

const handleSelect = (key: string) => {
  if (key === 'clear-content') {
    showClearConfirm.value = true
  }
}

const handleConfirmClear = () => {
  emit('clear')
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
