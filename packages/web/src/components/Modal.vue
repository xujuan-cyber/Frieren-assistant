<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-30 overflow-y-auto" @click="handleBackdropClick">
        <div class="flex min-h-full items-center justify-center p-4">
          <!-- 背景遮罩 -->
          <div class="fixed inset-0 bg-black/60 transition-opacity"></div>
          
          <!-- 弹窗内容 -->
          <div 
            class="relative bg-gray-900 rounded-xl border border-purple-600/50 w-full max-w-lg transform transition-all"
            @click.stop
          >
            <!-- 标题栏 -->
            <div class="flex items-center justify-between p-4 border-b border-purple-600/30">
              <h3 class="text-lg font-semibold text-white/90">
                <slot name="title">标题</slot>
              </h3>
              <button
                @click="$emit('update:modelValue', false)"
                class="text-white/70 hover:text-white/90 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- 内容区域 -->
            <div class="p-4">
              <slot></slot>
            </div>
            
            <!-- 按钮区域 -->
            <div class="flex justify-end space-x-3 px-4 py-3 border-t border-purple-600/30">
              <slot name="footer">
                <button
                  @click="$emit('update:modelValue', false)"
                  class="px-4 py-2 text-sm text-white/70 hover:text-white/90 transition-colors"
                >
                  取消
                </button>
                <button
                  @click="$emit('confirm')"
                  class="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                >
                  确认
                </button>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

defineEmits(['update:modelValue', 'confirm'])

const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    event.stopPropagation()
    event.preventDefault()
    emit('update:modelValue', false)
  }
}
</script> 