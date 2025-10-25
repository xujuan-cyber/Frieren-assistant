<template>
  <div class="variable-aware-input-wrapper" :style="{ position: 'relative', width: '100%' }">
    <!-- Naive UI 输入框 -->
    <NInput
      ref="inputRef"
      v-model:value="internalValue"
      v-bind="$attrs"
      type="textarea"
      :autosize="autosize"
      :placeholder="placeholder"
      @mouseup="handleMouseUp"
      @keyup="handleKeyUp"
      @input="handleInput"
      @keydown="handleKeyDown"
    />

    <!-- 悬浮的"提取为变量"按钮 -->
    <NPopover
      v-model:show="showExtractionButton"
      :x="popoverPosition.x"
      :y="popoverPosition.y"
      placement="top"
      trigger="manual"
      :show-arrow="false"
      :style="{ padding: '4px' }"
    >
      <template #trigger>
        <div
          :style="{
            position: 'fixed',
            left: popoverPosition.x + 'px',
            top: popoverPosition.y + 'px',
            pointerEvents: 'none',
            width: '1px',
            height: '1px'
          }"
        />
      </template>
      <NButton
        size="small"
        type="primary"
        @click="handleExtractVariable"
      >
        {{ t('variableExtraction.extractButton') }}
      </NButton>
    </NPopover>

    <!-- 变量提取对话框 -->
    <VariableExtractionDialog
      v-model:show="showExtractionDialog"
      :selected-text="currentSelection.text"
      :existing-global-variables="existingGlobalVariables"
      :existing-temporary-variables="existingTemporaryVariables"
      :predefined-variables="predefinedVariables"
      :occurrence-count="occurrenceCount"
      @confirm="handleExtractionConfirm"
      @cancel="handleExtractionCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { NInput, NPopover, NButton } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import VariableExtractionDialog from './VariableExtractionDialog.vue'
import { useTextSelection } from './useTextSelection'
import { useInputHistory } from './useInputHistory'

/**
 * 支持变量提取的智能输入框组件
 *
 * 功能：
 * 1. 检测用户选中的文本
 * 2. 显示"提取为变量"按钮
 * 3. 打开变量提取对话框
 * 4. 替换文本为变量占位符
 * 5. 支持撤销/重做 (Ctrl+Z / Ctrl+Shift+Z)
 */

// Props 定义
interface Props {
  /** 输入框的值 */
  modelValue: string
  /** 占位符文本 */
  placeholder?: string
  /** 自动调整高度 */
  autosize?: boolean | { minRows?: number; maxRows?: number }
  /** 已存在的全局变量名列表 */
  existingGlobalVariables?: string[]
  /** 已存在的临时变量名列表 */
  existingTemporaryVariables?: string[]
  /** 系统预定义变量名列表 */
  predefinedVariables?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  autosize: () => ({ minRows: 3, maxRows: 10 }),
  existingGlobalVariables: () => [],
  existingTemporaryVariables: () => [],
  predefinedVariables: () => []
})

// Emits 定义
interface Emits {
  /** 更新输入框的值 */
  (e: 'update:modelValue', value: string): void
  /** 提取变量事件 */
  (e: 'variable-extracted', data: {
    variableName: string
    variableValue: string
    variableType: 'global' | 'temporary'
  }): void
}

const emit = defineEmits<Emits>()

const { t } = useI18n()

// 内部状态
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const internalValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 获取原生输入框元素
const getNativeInput = (): HTMLTextAreaElement | null => {
  if (!inputRef.value) return null
  // Naive UI 的 NInput 组件内部使用 textarea
  const nativeInput = (inputRef.value as any)?.textareaElRef as HTMLTextAreaElement
  return nativeInput || null
}

// 文本选择相关
const nativeInputRef = computed(() => getNativeInput())
const { selection, getSelection, countOccurrences, replaceAllOccurrences } =
  useTextSelection(nativeInputRef as any)

// 历史记录相关
const { addHistory, undo, redo, recordVariableExtraction } = useInputHistory(
  nativeInputRef as any,
  { mergeThreshold: 1000 }
)

// UI 状态
const showExtractionButton = ref(false)
const showExtractionDialog = ref(false)
const popoverPosition = ref({ x: 0, y: 0 })
const currentSelection = ref({
  text: '',
  start: 0,
  end: 0
})
const occurrenceCount = ref(1)

// 处理鼠标抬起事件
const handleMouseUp = async () => {
  await nextTick()
  checkSelection()
}

// 处理键盘抬起事件
const handleKeyUp = async (e: KeyboardEvent) => {
  // 忽略 Ctrl/Shift/Alt 等修饰键
  if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
    return
  }
  await nextTick()
  checkSelection()
}

// 处理输入事件
const handleInput = () => {
  const nativeInput = getNativeInput()
  if (!nativeInput) return

  // 记录历史
  addHistory(internalValue.value, nativeInput.selectionStart || 0)
}

// 处理键盘按下事件 (撤销/重做)
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+Z: 撤销
  if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
    e.preventDefault()
    if (undo()) {
      // 撤销成功,更新 v-model
      const nativeInput = getNativeInput()
      if (nativeInput) {
        internalValue.value = nativeInput.value
      }
    }
    return
  }

  // Ctrl+Shift+Z: 重做
  if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
    e.preventDefault()
    if (redo()) {
      // 重做成功,更新 v-model
      const nativeInput = getNativeInput()
      if (nativeInput) {
        internalValue.value = nativeInput.value
      }
    }
    return
  }
}

// 检查选中文本
const checkSelection = () => {
  const sel = getSelection()

  if (sel.isValid && sel.text) {
    // 计算出现次数
    occurrenceCount.value = countOccurrences(internalValue.value, sel.text)

    // 保存当前选择
    currentSelection.value = {
      text: sel.text,
      start: sel.start,
      end: sel.end
    }

    // 计算悬浮按钮位置
    calculatePopoverPosition()

    // 显示提取按钮
    showExtractionButton.value = true
  } else {
    // 隐藏提取按钮
    showExtractionButton.value = false

    // 如果有无效原因,显示提示
    if (sel.invalidReason && sel.invalidReason !== '未选中任何文本') {
      window.$message?.warning(sel.invalidReason)
    }
  }
}

// 计算悬浮框位置
const calculatePopoverPosition = () => {
  const nativeInput = getNativeInput()
  if (!nativeInput) return

  const rect = nativeInput.getBoundingClientRect()
  const selectionStart = nativeInput.selectionStart || 0

  // 创建临时元素来计算光标位置
  const tempDiv = document.createElement('div')
  const computedStyle = window.getComputedStyle(nativeInput)

  tempDiv.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ${computedStyle.fontFamily};
    font-size: ${computedStyle.fontSize};
    line-height: ${computedStyle.lineHeight};
    padding: ${computedStyle.padding};
    width: ${rect.width}px;
  `

  tempDiv.textContent = nativeInput.value.substring(0, selectionStart)
  document.body.appendChild(tempDiv)

  const tempRect = tempDiv.getBoundingClientRect()
  document.body.removeChild(tempDiv)

  // 设置悬浮框位置 (在选中文本上方)
  popoverPosition.value = {
    x: rect.left + (tempRect.width % rect.width),
    y: rect.top + Math.floor(tempRect.width / rect.width) * parseFloat(computedStyle.lineHeight) - 40
  }
}

// 处理提取变量按钮点击
const handleExtractVariable = () => {
  showExtractionButton.value = false
  showExtractionDialog.value = true
}

// 处理变量提取确认
const handleExtractionConfirm = (data: {
  variableName: string
  variableValue: string
  variableType: 'global' | 'temporary'
  replaceAll: boolean
}) => {
  const nativeInput = getNativeInput()
  if (!nativeInput) return

  const placeholder = `{{${data.variableName}}}`
  let newValue = internalValue.value

  if (data.replaceAll && occurrenceCount.value > 1) {
    // 全部替换
    newValue = replaceAllOccurrences(newValue, currentSelection.value.text, placeholder)
  } else {
    // 仅替换当前选中的文本
    newValue =
      newValue.substring(0, currentSelection.value.start) +
      placeholder +
      newValue.substring(currentSelection.value.end)
  }

  // 更新值
  internalValue.value = newValue

  // 记录历史 (强制创建新记录)
  const cursorPosition = currentSelection.value.start + placeholder.length
  recordVariableExtraction(newValue, cursorPosition)

  // 设置光标位置
  nextTick(() => {
    if (nativeInput) {
      nativeInput.setSelectionRange(cursorPosition, cursorPosition)
      nativeInput.focus()
    }
  })

  // 发射变量提取事件
  emit('variable-extracted', {
    variableName: data.variableName,
    variableValue: data.variableValue,
    variableType: data.variableType
  })

  // 显示成功消息
  if (data.replaceAll && occurrenceCount.value > 1) {
    window.$message?.success(
      t('variableExtraction.extractSuccessAll', {
        count: occurrenceCount.value,
        name: data.variableName
      })
    )
  } else {
    window.$message?.success(
      t('variableExtraction.extractSuccess', { name: data.variableName })
    )
  }
}

// 处理变量提取取消
const handleExtractionCancel = () => {
  showExtractionDialog.value = false
}

// 监听 modelValue 变化,初始化历史记录
watch(
  () => props.modelValue,
  (newValue) => {
    const nativeInput = getNativeInput()
    if (nativeInput) {
      addHistory(newValue, nativeInput.selectionStart || 0)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.variable-aware-input-wrapper {
  position: relative;
  width: 100%;
}
</style>
