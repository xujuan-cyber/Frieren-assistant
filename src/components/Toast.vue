<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed bottom-4 right-4 z-50 pointer-events-none flex items-center p-4 space-x-4 bg-gray-900 text-white rounded-lg shadow-lg"
    >
      <span class="text-sm font-medium">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 2000
  }
})

const show = ref(false)
let timer = null

// 显示提示
const showToast = () => {
  show.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    show.value = false
  }, props.duration)
}

// 监听消息变化
watch(() => props.message, (newVal) => {
  if (newVal) showToast()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script> 