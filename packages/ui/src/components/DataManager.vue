<template>
  <NModal
    :show="show"
    preset="card"
    :style="dataManagerModalStyle"
    :title="$t('dataManager.title')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value: boolean) => !value && close()"
  >
    <div class="data-manager-scroll-shell">
      <NSpace vertical :size="20">
        <div>
          <NText tag="h3" :depth="1" strong style="font-size: 18px; margin-bottom: 12px;">
            {{ $t('dataManager.storage.title') }}
          </NText>
          <NCard size="small" :bordered="true" class="storage-overview-card">
            <NSpace vertical :size="16">
              <div class="storage-cards-grid">
                <div class="storage-stat-card">
                  <NText strong>{{ $t('dataManager.storage.total') }}</NText>
                  <div class="storage-stat-value">
                    {{ storageSummary ? formatFileSize(storageSummary.totalBytes) : '—' }}
                  </div>
                  <NText depth="3" class="storage-note">
                    {{ $t('dataManager.storage.totalNote') }}
                  </NText>
                </div>

                <div
                  v-for="item in storageCardItems"
                  :key="item.key"
                  class="storage-stat-card"
                >
                  <NText depth="3">{{ $t(storageLabelKeys[item.key]) }}</NText>
                  <div class="storage-stat-value">
                    {{ formatStorageItemBytes(item.bytes) }}
                  </div>
                  <NText
                    v-if="getStorageItemDetail(item)"
                    depth="3"
                    class="storage-note"
                  >
                    {{ getStorageItemDetail(item) }}
                  </NText>
                </div>
              </div>

              <div
                v-if="isDesktopRuntime"
                class="storage-meta-row"
              >
                <div class="storage-path-block">
                  <NText depth="3" style="font-size: 12px">{{ $t('dataManager.storage.path') }}</NText>
                  <div class="storage-path-value">
                    {{ storageSummary?.desktopInfo?.userDataPath || '—' }}
                  </div>
                </div>

                <div
                  v-if="desktopBackupItem"
                  class="storage-desktop-stat"
                >
                  <NText depth="3">{{ $t('dataManager.storage.backupData') }}</NText>
                  <div class="storage-desktop-stat-value">
                    {{ formatStorageItemBytes(desktopBackupItem.bytes) }}
                  </div>
                </div>

                <NSpace>
                  <NButton
                    size="small"
                    @click="openStorageDir"
                    :disabled="!canUseDesktopStorageTools"
                  >
                    {{ $t('dataManager.storage.openDir') }}
                  </NButton>
                  <NButton
                    size="small"
                    @click="refreshStorageSummary"
                    :loading="isRefreshingStorage"
                    :disabled="!canUseDesktopStorageTools && !isRefreshingStorage"
                  >
                    {{ $t('dataManager.storage.refresh') }}
                  </NButton>
                </NSpace>
              </div>
            </NSpace>
          </NCard>
        </div>

        <div class="data-manager-section">
          <NCard size="small" :bordered="true" class="data-manager-workspace-card">
            <NSpace vertical :size="16">
              <div class="workspace-header">
                <NText tag="h3" :depth="1" strong style="font-size: 18px;">
                  {{ $t('dataManager.backupWorkspace.title') }}
                </NText>
                <NText depth="3">
                  {{ $t('dataManager.backupWorkspace.description') }}
                </NText>
              </div>

              <div class="backup-actions-grid">
                <div class="workspace-action-card backup-action-card">
                  <NSpace vertical :size="10">
                    <div>
                      <NText strong>{{ $t('dataManager.backupWorkspace.exportTitle') }}</NText>
                      <NText depth="3" class="workspace-action-description">
                        {{ $t('dataManager.export.description') }}
                      </NText>
                    </div>
                    <NButton
                      @click="handleExport"
                      :disabled="isExporting"
                      type="primary"
                      :loading="isExporting"
                      block
                    >
                      {{ isExporting ? $t('common.exporting') : $t('dataManager.export.button') }}
                    </NButton>
                  </NSpace>
                </div>

                <div class="workspace-action-card backup-action-card">
                  <NSpace vertical :size="12">
                    <div>
                      <NText strong>{{ $t('dataManager.backupWorkspace.importTitle') }}</NText>
                      <NText depth="3" class="workspace-action-description">
                        {{ $t('dataManager.import.description') }}
                      </NText>
                    </div>

                    <NUpload
                      :file-list="selectedFile ? [selectedFile] : []"
                      accept=".json"
                      :show-file-list="false"
                      @change="handleFileChange"
                      :custom-request="() => {}"
                    >
                      <NUploadDragger>
                        <div v-if="!selectedFile" class="import-dropzone">
                          <div class="import-dropzone-icon">
                            <NIcon size="28" :depth="3">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </NIcon>
                          </div>
                          <NText :depth="3">
                            {{ $t('dataManager.import.selectFile') }}
                          </NText>
                        </div>

                        <div v-else class="import-selected-file">
                          <NText strong>{{ selectedFile.name }}</NText>
                          <NText :depth="3">
                            {{ formatFileSize(selectedFile.file?.size ?? 0) }}
                          </NText>
                          <NButton text @click.stop="clearSelectedFile">
                            {{ $t('common.clear') }}
                          </NButton>
                        </div>
                      </NUploadDragger>
                    </NUpload>

                    <NButton
                      @click="handleImport"
                      :disabled="!selectedFile || isImporting"
                      type="success"
                      :loading="isImporting"
                      block
                    >
                      {{ isImporting ? $t('common.importing') : $t('dataManager.import.button') }}
                    </NButton>

                    <NAlert type="warning" :show-icon="true">
                      {{ $t('dataManager.warning') }}
                    </NAlert>
                  </NSpace>
                </div>
              </div>
            </NSpace>
          </NCard>
        </div>
      </NSpace>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal, NSpace, NText, NButton, NUpload, NUploadDragger,
  NIcon, NAlert, NCard, type UploadFileInfo,
} from 'naive-ui'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import {
  resolveDataManagerStorageBreakdown,
  type StorageBreakdownItem,
  type StorageBreakdownItemKey,
  type StorageBreakdownSummary,
} from '../utils/data-manager-storage'

interface Props {
  show: boolean
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
const isDesktopRuntime = isRunningInElectron()
const DATA_MANAGER_MODAL_MAX_WIDTH = '1200px'
const dataManagerModalStyle = {
  width: '90vw',
  maxWidth: DATA_MANAGER_MODAL_MAX_WIDTH,
  maxHeight: '90vh',
}

const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[DataManager] Services were not injected correctly. Make sure App provides the services instance.')
}

const getDataManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[DataManager] Services are not initialized. Make sure the application has started correctly.')
  }

  const manager = servicesValue.dataManager
  if (!manager) {
    throw new Error('[DataManager] DataManager is not initialized. Make sure the service is configured correctly.')
  }

  return manager
})

const isExporting = ref(false)
const isImporting = ref(false)
const selectedFile = ref<UploadFileInfo | null>(null)

const storageSummary = ref<StorageBreakdownSummary | null>(null)
const isRefreshingStorage = ref(false)

const storageLabelKeys: Record<StorageBreakdownItemKey, string> = {
  appMainData: 'dataManager.storage.appMainData',
  imageCache: 'dataManager.storage.imageCache',
  favoriteImages: 'dataManager.storage.favoriteImages',
  backupData: 'dataManager.storage.backupData',
}

const storageCardItemKeys: StorageBreakdownItemKey[] = ['appMainData', 'imageCache', 'favoriteImages']

const storageCardItems = computed<StorageBreakdownItem[]>(() =>
  storageCardItemKeys.map(key =>
    storageSummary.value?.items.find(item => item.key === key)
    ?? {
      key,
      bytes: null,
      count: null,
      estimated: key === 'appMainData',
    }
  )
)

const desktopBackupItem = computed<StorageBreakdownItem | null>(() =>
  storageSummary.value?.items.find(item => item.key === 'backupData') ?? null
)

const canUseDesktopStorageTools = computed(() =>
  isDesktopRuntime && Boolean(window.electronAPI?.data)
)

const refreshStorageSummary = async () => {
  try {
    isRefreshingStorage.value = true
    const servicesValue = services.value
    if (!servicesValue) {
      throw new Error('[DataManager] Services are not initialized. Make sure the application has started correctly.')
    }

    storageSummary.value = await resolveDataManagerStorageBreakdown({
      services: servicesValue,
      includeBackupData: isDesktopRuntime,
      electronDataApi: window.electronAPI?.data ?? null,
    })
  } catch (error) {
    console.error('Failed to get storage info:', error)
    toast.error(t('dataManager.storage.refreshFailed'))
  } finally {
    isRefreshingStorage.value = false
  }
}

const openStorageDir = () => {
  if (!isDesktopRuntime || !window.electronAPI?.data) return
  window.electronAPI.data.openStorageDirectory()
}

const handleFileChange = (options: { fileList: UploadFileInfo[] }) => {
  selectedFile.value = options.fileList[0] ?? null
}

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

watch(
  () => props.show,
  (show) => {
    if (show) {
      void refreshStorageSummary()
    }
  },
  { immediate: true },
)

const handleExport = async () => {
  try {
    const dataManager = getDataManager.value
    isExporting.value = true

    const data = await dataManager.exportAllData()
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
    console.error('Export failed:', error)
    toast.error(t('dataManager.export.failed'))
  } finally {
    isExporting.value = false
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
}

const handleImport = async () => {
  if (!selectedFile.value) return

  try {
    isImporting.value = true

    const file = selectedFile.value.file ?? null
    if (!file) {
      toast.error(t('dataManager.import.failed'))
      return
    }

    const content = await file.text()
    const dataManager = getDataManager.value
    await dataManager.importAllData(content)

    toast.success(t('dataManager.import.success'))
    emit('imported')
    emit('close')
    clearSelectedFile()
  } catch (error) {
    console.error('Import failed:', error)
    toast.error(`${t('dataManager.import.failed')}: ${(error as Error).message}`)
  } finally {
    isImporting.value = false
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const formatStorageItemBytes = (bytes: number | null): string => {
  if (bytes === null) {
    return '—'
  }
  return formatFileSize(bytes)
}

const getStorageItemDetail = (item: Pick<StorageBreakdownItem, 'key' | 'count'>): string | null => {
  if (item.key === 'appMainData') {
    return t('dataManager.storage.appMainDataNote')
  }

  if ((item.key === 'imageCache' || item.key === 'favoriteImages') && item.count !== null) {
    return t('dataManager.storage.imageCount', { count: item.count })
  }

  return null
}
</script>

<style scoped>
.data-manager-scroll-shell {
  max-height: calc(90vh - 120px);
  overflow: auto;
  padding-right: 4px;
}

.storage-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.storage-stat-card,
.workspace-action-card {
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--n-color-embedded);
  min-width: 0;
}

.storage-stat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 112px;
}

.storage-stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
  margin-top: 6px;
}

.storage-note {
  display: block;
  font-size: 12px;
  margin-top: 6px;
}

.storage-meta-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding-top: 4px;
  flex-wrap: wrap;
}

.storage-path-block {
  min-width: 0;
  flex: 1;
}

.storage-path-value {
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  margin-top: 4px;
}

.storage-desktop-stat {
  min-width: 140px;
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color-embedded);
}

.storage-desktop-stat-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 600;
}

.data-manager-section {
  display: block;
}

.data-manager-workspace-card {
  min-width: 0;
}

.workspace-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.workspace-action-description {
  display: block;
  margin-top: 6px;
}

.backup-actions-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: start;
}

.import-dropzone,
.import-selected-file {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 12px;
  text-align: center;
}

.import-dropzone-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 900px) {
  .storage-cards-grid,
  .backup-actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .storage-meta-row {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .storage-cards-grid,
  .backup-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
