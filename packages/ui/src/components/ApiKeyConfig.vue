<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
    @click="$emit('close')"
  >
    <div
      class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
      @click.stop
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900">API 配置</h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-500"
          >
            <span class="sr-only">关闭</span>
            ×
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Gemini API Key
            </label>
            <input
              type="password"
              v-model="keys.gemini"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入 Gemini API Key"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              DeepSeek API Key
            </label>
            <input
              type="password"
              v-model="keys.deepseek"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入 DeepSeek API Key"
            />
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="saveKeys"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const keys = ref({
  gemini: '',
  deepseek: ''
})

// 从本地存储加载 API 密钥
onMounted(() => {
  const savedKeys = localStorage.getItem('apiKeys')
  if (savedKeys) {
    try {
      keys.value = JSON.parse(savedKeys)
    } catch (e) {
      console.error('加载 API 密钥失败:', e)
    }
  }
})

// 保存 API 密钥到本地存储
const saveKeys = () => {
  localStorage.setItem('apiKeys', JSON.stringify(keys.value))
  // 触发保存成功事件
  emit('saved')
}

const emit = defineEmits(['close', 'saved'])
</script> 