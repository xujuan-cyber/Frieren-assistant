<template>
  <Teleport to="body">
    <div 
      v-if="show"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click="$emit('close')"
    >
      <div 
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('dataManager.title') }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- 导出功能 -->
          <div class="space-y-3">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ $t('dataManager.export.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('dataManager.export.description') }}
            </p>
            <button
              @click="handleExport"
              :disabled="isExporting"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isExporting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ $t('common.exporting') }}
              </span>
              <span v-else>
                📥 {{ $t('dataManager.export.button') }}
              </span>
            </button>
          </div>

          <!-- 导入功能 -->
          <div class="space-y-3">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ $t('dataManager.import.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('dataManager.import.description') }}
            </p>
            
            <!-- 文件选择区域 -->
            <div 
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center transition-colors"
              :class="{ 'border-blue-400 bg-blue-50 dark:bg-blue-900/20': isDragOver }"
              @dragover.prevent="handleDragOver"
              @dragenter.prevent="handleDragEnter"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".json"
                @change="handleFileSelect"
                class="hidden"
              />
              
              <div v-if="!selectedFile" @click="fileInput?.click()" class="cursor-pointer">
                <div class="text-gray-400 mb-2">
                  <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ $t('dataManager.import.selectFile') }}
                </p>
              </div>
              
              <div v-else class="space-y-2">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ selectedFile.name }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatFileSize(selectedFile.size) }}
                </p>
                <div class="flex gap-2 justify-center">
                  <button
                    @click="fileInput?.click()"
                    class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {{ $t('dataManager.import.changeFile') }}
                  </button>
                  <button
                    @click="clearSelectedFile"
                    class="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    {{ $t('common.clear') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 导入按钮 -->
            <button
              @click="handleImport"
              :disabled="!selectedFile || isImporting"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isImporting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ $t('common.importing') }}
              </span>
              <span v-else>
                📤 {{ $t('dataManager.import.button') }}
              </span>
            </button>
          </div>

          <!-- 警告信息 -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                  {{ $t('dataManager.warning') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { dataManager } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'imported'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const toast = useToast()

const isExporting = ref(false)
const isImporting = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

// 处理导出
const handleExport = async () => {
  try {
    isExporting.value = true
    
    const data = await dataManager.exportAllData()
    
    // 创建下载链接
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prompt-optimizer-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success(t('dataManager.export.success'))
  } catch (error) {
    console.error('导出失败:', error)
    toast.error(t('dataManager.export.failed'))
  } finally {
    isExporting.value = false
  }
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

// 清除选中的文件
const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 处理导入
const handleImport = async () => {
  if (!selectedFile.value) return

  try {
    isImporting.value = true
    
    const content = await selectedFile.value.text()
    await dataManager.importAllData(content)
    
    toast.success(t('dataManager.import.success'))
    emit('imported')
    emit('close')
    clearSelectedFile()
  } catch (error) {
    console.error('导入失败:', error)
    toast.error(t('dataManager.import.failed') + ': ' + (error as Error).message)
  } finally {
    isImporting.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 处理拖拽事件
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragEnter = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const dataTransfer = event.dataTransfer
  if (dataTransfer) {
    const files = dataTransfer.files
    if (files.length > 0) {
      selectedFile.value = files[0]
    }
  }
  isDragOver.value = false
}
</script> 