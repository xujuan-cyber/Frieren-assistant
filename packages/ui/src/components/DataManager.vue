<template>
  <NModal
    :show="show"
    preset="card"
    :style="{ width: '90vw', maxWidth: '500px' }"
    :title="$t('dataManager.title')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value: boolean) => !value && close()"
  >
    <NSpace vertical :size="24">
      <!-- 导出功能 -->
      <div>
        <NText tag="h3" :depth="1" strong style="font-size: 18px; margin-bottom: 12px;">
          {{ $t('dataManager.export.title') }}
        </NText>
        <NText :depth="3" style="display: block; margin-bottom: 16px;">
          {{ $t('dataManager.export.description') }}
        </NText>
        <NButton
          @click="handleExport"
          :disabled="isExporting"
          type="primary"
          :loading="isExporting"
          block
        >
          <template #icon>
            <span>📥</span>
          </template>
          {{ isExporting ? $t('common.exporting') : $t('dataManager.export.button') }}
        </NButton>
      </div>

      <!-- 导入功能 -->
      <div>
        <NText tag="h3" :depth="1" strong style="font-size: 18px; margin-bottom: 12px;">
          {{ $t('dataManager.import.title') }}
        </NText>
        <NText :depth="3" style="display: block; margin-bottom: 16px;">
          {{ $t('dataManager.import.description') }}
        </NText>
        
        <!-- 文件选择区域 -->
        <NUpload
          :file-list="selectedFile ? [selectedFile] : []"
          accept=".json"
          :show-file-list="false"
          @change="handleFileChange"
          :custom-request="() => {}"
        >
          <NUploadDragger>
            <div v-if="!selectedFile" style="padding: 24px;">
              <div style="margin-bottom: 12px;">
                <NIcon size="48" :depth="3">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </NIcon>
              </div>
              <NText :depth="3">
                {{ $t('dataManager.import.selectFile') }}
              </NText>
            </div>
            
            <div v-else style="padding: 24px;">
              <NText strong style="display: block; margin-bottom: 8px;">
                {{ selectedFile.name }}
              </NText>
              <NText :depth="3" style="display: block; margin-bottom: 12px;">
                {{ formatFileSize(selectedFile.size) }}
              </NText>
              <NSpace>
                <NButton text @click.stop="clearSelectedFile">
                  {{ $t('common.clear') }}
                </NButton>
              </NSpace>
            </div>
          </NUploadDragger>
        </NUpload>

        <!-- 导入按钮 -->
        <NButton
          @click="handleImport"
          :disabled="!selectedFile || isImporting"
          type="success"
          :loading="isImporting"
          block
          style="margin-top: 16px;"
        >
          <template #icon>
            <span>📤</span>
          </template>
          {{ isImporting ? $t('common.importing') : $t('dataManager.import.button') }}
        </NButton>
      </div>

      <!-- 警告信息 -->
      <NAlert type="warning" :show-icon="true">
        {{ $t('dataManager.warning') }}
      </NAlert>
    </NSpace>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NModal, NSpace, NText, NButton, NUpload, NUploadDragger, 
  NIcon, NAlert, type UploadFileInfo 
} from 'naive-ui'
import { useToast } from '../composables/useToast'
import type { IDataManager } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

interface Props {
  show: boolean;
  // dataManager现在通过inject获取，不再需要props
}

interface Emits {
  (e: 'close'): void
  (e: 'imported'): void
  (e: 'update:show', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const toast = useToast()

// 统一使用inject获取services
const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[DataManager] services未正确注入，请确保在App组件中正确provide了services')
}

const getDataManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[DataManager] services未初始化，请确保应用已正确启动')
  }

  const manager = servicesValue.dataManager
  if (!manager) {
    throw new Error('[DataManager] dataManager未初始化，请确保服务已正确配置')
  }

  return manager
})

const isExporting = ref(false)
const isImporting = ref(false)
const selectedFile = ref<File | null>(null)

// 处理文件变化
const handleFileChange = (options: { fileList: UploadFileInfo[] }) => {
  if (options.fileList.length > 0 && options.fileList[0].file) {
    selectedFile.value = options.fileList[0].file as File
  }
}

// --- Close Logic ---
const close = () => {
  emit('update:show', false)
  emit('close')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.show) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// 处理导出
const handleExport = async () => {
  try {
    const dataManager = getDataManager.value
    if (!dataManager) {
      toast.error(t('toast.error.dataManagerNotAvailable'))
      return
    }

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

// 处理文件选择 - 已移除，使用 handleFileChange 代替

// 清除选中的文件
const clearSelectedFile = () => {
  selectedFile.value = null
}

// 处理导入
const handleImport = async () => {
  if (!selectedFile.value) return
  
  try {
    isImporting.value = true
    
    const content = await selectedFile.value.text()
    const dataManager = getDataManager.value
    if (!dataManager) {
      toast.error(t('toast.error.dataManagerNotAvailable'))
      return
    }
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
</script> 