<template>
  <NPopover
    v-if="tooltipCopy"
    trigger="hover"
    placement="top"
    :show-arrow="true"
    class="compare-role-badge__popover"
  >
    <template #trigger>
      <button
        type="button"
        class="compare-role-badge"
        :class="{ 'compare-role-badge--clickable': clickable }"
        @click="handleClick"
      >
        <NTag
          size="small"
          :type="tagType"
          :bordered="false"
          class="compare-role-badge__tag"
        >
          {{ tooltipCopy.label }}
        </NTag>
        <span
          v-if="tooltipCopy.warning"
          class="compare-role-badge__warning"
          aria-hidden="true"
        >
          !
        </span>
      </button>
    </template>

    <div class="compare-role-badge__content">
      <NText strong>{{ tooltipCopy.label }}</NText>
      <NText depth="3">{{ tooltipCopy.description }}</NText>
      <NText depth="3">{{ tooltipCopy.source }}</NText>
      <NText v-if="tooltipCopy.warning" type="warning">{{ tooltipCopy.warning }}</NText>
      <NText depth="3">{{ tooltipCopy.action }}</NText>
    </div>
  </NPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NPopover, NTag, NText } from 'naive-ui'
import {
  buildCompareRoleTooltipCopy,
  getCompareRoleTagType,
  type CompareRoleUiEntry,
} from './compare-ui'

const props = defineProps<{
  entry?: CompareRoleUiEntry | null
  clickable?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const { t } = useI18n()

const tooltipCopy = computed(() =>
  props.entry ? buildCompareRoleTooltipCopy(t, props.entry) : null
)

const tagType = computed(() =>
  getCompareRoleTagType(props.entry?.effectiveRole)
)

function handleClick() {
  if (!props.clickable) return
  emit('click')
}
</script>

<style scoped>
.compare-role-badge {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.compare-role-badge--clickable {
  cursor: pointer;
}

.compare-role-badge--clickable:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.28);
  outline-offset: 3px;
  border-radius: 999px;
}

.compare-role-badge--clickable:hover .compare-role-badge__tag {
  filter: brightness(0.97);
}

.compare-role-badge__tag {
  cursor: inherit;
}

.compare-role-badge__warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgba(240, 160, 32, 0.16);
  color: #d97706;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.compare-role-badge__content {
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  line-height: 1.55;
}
</style>
