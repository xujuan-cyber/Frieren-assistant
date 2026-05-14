<template>
  <NTooltip
    v-bind="$attrs"
    :trigger="trigger"
    :placement="placement"
    :disabled="disabled"
    :show-arrow="showArrow"
    :to="to"
    :flip="flip"
    :keep-alive-on-hover="keepAliveOnHover"
    :theme-overrides="tooltipThemeOverrides"
    :overlay-style="mergedOverlayStyle"
    :content-style="mergedContentStyle"
  >
    <template #trigger>
      <slot />
    </template>
    <slot name="content">{{ label }}</slot>
  </NTooltip>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { NTooltip, type TooltipProps } from 'naive-ui'

import { useTooltipTheme } from '../../composables/ui/useTooltipTheme'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  label?: string
  trigger?: TooltipProps['trigger']
  placement?: TooltipProps['placement']
  disabled?: boolean
  showArrow?: boolean
  to?: TooltipProps['to']
  flip?: boolean
  keepAliveOnHover?: boolean
  maxWidth?: CSSProperties['maxWidth']
  maxHeight?: CSSProperties['maxHeight']
  whiteSpace?: CSSProperties['whiteSpace']
  wordBreak?: CSSProperties['wordBreak']
  overflowWrap?: CSSProperties['overflowWrap']
  padding?: CSSProperties['padding']
  overflowY?: CSSProperties['overflowY']
  overlayStyle?: CSSProperties
  contentStyle?: CSSProperties
}>(), {
  trigger: 'hover',
  placement: 'top',
  disabled: false,
  showArrow: true,
})

const {
  tooltipThemeOverrides,
  tooltipOverlayStyle,
  tooltipContentStyle,
} = useTooltipTheme({
  maxWidth: props.maxWidth,
  maxHeight: props.maxHeight,
  whiteSpace: props.whiteSpace,
  wordBreak: props.wordBreak,
  overflowWrap: props.overflowWrap,
  padding: props.padding,
  overflowY: props.overflowY,
})

const mergedOverlayStyle = computed<CSSProperties>(() => ({
  ...tooltipOverlayStyle.value,
  ...props.overlayStyle,
}))

const mergedContentStyle = computed<CSSProperties>(() => ({
  ...tooltipContentStyle.value,
  ...props.contentStyle,
}))
</script>
