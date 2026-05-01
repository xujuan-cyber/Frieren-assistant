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
      <section class="data-manager-section data-manager-section--storage">
        <div class="section-heading">
          <div>
            <NText tag="h3" :depth="1" strong class="section-title">
              {{ $t('dataManager.storage.title') }}
            </NText>
            <NText depth="3" class="section-description">
              {{ $t('dataManager.storage.totalNote') }}
            </NText>
          </div>
          <NButton size="small" secondary :loading="isRefreshingStorage" @click="refreshStorageSummary">
            <template #icon>
              <NIcon><Refresh /></NIcon>
            </template>
            {{ $t('dataManager.storage.refresh') }}
          </NButton>
        </div>

        <div class="storage-cards-grid">
          <div class="storage-stat-card storage-stat-card--total">
            <NText strong>{{ $t('dataManager.storage.total') }}</NText>
            <div class="storage-stat-value">
              {{ storageSummary ? formatFileSize(storageSummary.totalBytes) : '—' }}
            </div>
            <NText depth="3" class="storage-note">
              {{ $t('dataManager.storage.totalNoteShort') }}
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
      </section>

      <section class="data-manager-section">
        <div class="section-heading">
          <div>
            <NText tag="h3" :depth="1" strong class="section-title">
              {{ $t('dataManager.backupWorkspace.title') }}
            </NText>
            <NText depth="3" class="section-description">
              {{ $t('dataManager.backupWorkspace.description') }}
            </NText>
          </div>
        </div>

        <div class="backup-actions-grid">
          <article class="backup-action-panel">
            <div class="action-panel-main">
              <div class="action-panel-icon">
                <NIcon size="22"><Download /></NIcon>
              </div>
              <div>
                <NText strong>{{ $t('dataManager.backupWorkspace.exportTitle') }}</NText>
                <NText depth="3" class="workspace-action-description">
                  {{ $t('dataManager.export.description') }}
                </NText>
              </div>
            </div>
            <div class="backup-options-block">
              <NText depth="3" class="backup-options-title">
                {{ $t('dataManager.export.scopeTitle') }}
              </NText>
              <div class="backup-scope-list">
                <label class="backup-scope-option">
                  <NCheckbox v-model:checked="exportAppData">
                    {{ $t('dataManager.sections.appData') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.appDataHint') }}</NText>
                </label>
                <label class="backup-sub-option">
                  <NCheckbox
                    v-model:checked="exportAppDataImages"
                    :disabled="!exportAppData"
                  >
                    {{ $t('dataManager.sections.appDataImages') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.appDataImagesHint') }}</NText>
                </label>
                <label class="backup-scope-option">
                  <NCheckbox v-model:checked="exportFavorites">
                    {{ $t('dataManager.sections.favoritesBundle') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.favoritesBundleHint') }}</NText>
                </label>
              </div>
            </div>
            <NButton
              @click="handleExport"
              :disabled="isExporting || (!exportAppData && !exportFavorites)"
              type="primary"
              :loading="isExporting"
              block
            >
              <template #icon>
                <NIcon><Download /></NIcon>
              </template>
              {{ isExporting ? $t('common.exporting') : $t('dataManager.export.button') }}
            </NButton>
          </article>

          <article class="backup-action-panel">
            <div class="action-panel-main">
              <div class="action-panel-icon">
                <NIcon size="22"><Upload /></NIcon>
              </div>
              <div>
                <NText strong>{{ $t('dataManager.backupWorkspace.importTitle') }}</NText>
                <NText depth="3" class="workspace-action-description">
                  {{ $t('dataManager.import.description') }}
                </NText>
              </div>
            </div>

            <NUpload
              :file-list="selectedFile ? [selectedFile] : []"
              accept=".zip,.po-backup.zip,.json,application/zip,application/json"
              :show-file-list="false"
              @change="handleFileChange"
              :custom-request="() => {}"
            >
              <NUploadDragger>
                <div v-if="!selectedFile" class="import-dropzone">
                  <NIcon size="28" :depth="3"><Upload /></NIcon>
                  <NText :depth="3">
                    {{ $t('dataManager.import.selectFile') }}
                  </NText>
                  <NText depth="3" class="import-format-note">
                    {{ $t('dataManager.import.supportFormat') }}
                  </NText>
                </div>

                <div v-else class="import-selected-file">
                  <div>
                    <NText strong>{{ selectedFile.name }}</NText>
                    <NText :depth="3" class="selected-file-size">
                      {{ formatFileSize(selectedFile.file?.size ?? 0) }}
                    </NText>
                    <NText
                      v-if="importPreviewText"
                      depth="3"
                      class="selected-file-preview"
                    >
                      {{ importPreviewText }}
                    </NText>
                  </div>
                  <NButton size="small" text @click.stop="clearSelectedFile">
                    {{ $t('common.clear') }}
                  </NButton>
                </div>
              </NUploadDragger>
            </NUpload>

            <div class="backup-options-block">
              <NText depth="3" class="backup-options-title">
                {{ $t('dataManager.import.scopeTitle') }}
              </NText>
              <div class="backup-scope-list">
                <label class="backup-scope-option">
                  <NCheckbox
                    v-model:checked="importAppData"
                    :disabled="selectedFile ? !availableImportSections.has('appData') : false"
                  >
                    {{ $t('dataManager.sections.appData') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.appDataHint') }}</NText>
                </label>
                <label class="backup-sub-option">
                  <NCheckbox
                    v-model:checked="importAppDataImages"
                    :disabled="!importAppData || (selectedFile ? !availableImportSections.has('imageCache') : false)"
                  >
                    {{ $t('dataManager.sections.appDataImages') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.appDataImagesHint') }}</NText>
                </label>
                <label class="backup-scope-option">
                  <NCheckbox
                    v-model:checked="importFavorites"
                    :disabled="selectedFile ? !canImportFavoritesBundle : false"
                  >
                    {{ $t('dataManager.sections.favoritesBundle') }}
                  </NCheckbox>
                  <NText depth="3">{{ $t('dataManager.sections.favoritesBundleHint') }}</NText>
                </label>
              </div>
            </div>

            <div
              v-if="importFavorites"
              class="backup-options-block"
            >
              <NText depth="3" class="backup-options-title">
                {{ $t('dataManager.import.favoriteMergeStrategy') }}
              </NText>
              <NRadioGroup v-model:value="favoriteMergeStrategy">
                <div class="backup-strategy-list">
                  <label class="backup-strategy-option">
                    <NRadio value="skip">{{ $t('dataManager.import.skipDuplicate') }}</NRadio>
                    <NText depth="3">{{ $t('dataManager.import.skipDuplicateHint') }}</NText>
                  </label>
                  <label class="backup-strategy-option">
                    <NRadio value="overwrite">{{ $t('dataManager.import.overwriteDuplicate') }}</NRadio>
                    <NText depth="3">{{ $t('dataManager.import.overwriteDuplicateHint') }}</NText>
                  </label>
                  <label class="backup-strategy-option">
                    <NRadio value="merge">{{ $t('dataManager.import.createCopy') }}</NRadio>
                    <NText depth="3">{{ $t('dataManager.import.createCopyHint') }}</NText>
                  </label>
                </div>
              </NRadioGroup>
            </div>

            <NButton
              @click="handleImport"
              :disabled="!selectedFile || isImporting || (!importAppData && !importFavorites)"
              type="success"
              :loading="isImporting"
              block
            >
              <template #icon>
                <NIcon><Upload /></NIcon>
              </template>
              {{ isImporting ? $t('common.importing') : $t('dataManager.import.button') }}
            </NButton>

            <NAlert type="warning" :show-icon="true" class="import-warning">
              {{ $t('dataManager.warning') }}
            </NAlert>
          </article>
        </div>
      </section>

      <section v-if="isDesktopRuntime" class="data-manager-section data-manager-section--desktop">
        <div class="desktop-storage-row">
          <div class="storage-path-block">
            <NText depth="3" class="storage-path-label">{{ $t('dataManager.storage.path') }}</NText>
            <div class="storage-path-value">
              {{ storageSummary?.desktopInfo?.userDataPath || '—' }}
            </div>
          </div>

          <div v-if="desktopBackupItem" class="storage-desktop-stat">
            <NText depth="3">{{ $t('dataManager.storage.backupData') }}</NText>
            <div class="storage-desktop-stat-value">
              {{ formatStorageItemBytes(desktopBackupItem.bytes) }}
            </div>
          </div>

          <NButton size="small" @click="openStorageDir" :disabled="!canUseDesktopStorageTools">
            <template #icon>
              <NIcon><Folder /></NIcon>
            </template>
            {{ $t('dataManager.storage.openDir') }}
          </NButton>
        </div>
      </section>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal, NText, NButton, NUpload, NUploadDragger,
  NIcon, NAlert, NCheckbox, NRadio, NRadioGroup, type UploadFileInfo,
} from 'naive-ui'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { Download, Folder, Refresh, Upload } from '@vicons/tabler'
import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import {
  DEFAULT_DATA_MANAGER_PACKAGE_SECTIONS,
  createDataManagerResourcePackage,
  getIncludedDataManagerPackageSections,
  importDataManagerResourcePackage,
  looksLikeDataManagerZipPackage,
  readDataManagerResourcePackage,
  type DataManagerFavoritesMergeStrategy,
  type DataManagerPackageSection,
  type DataManagerPackageSectionSelection,
  type DataManagerResourcePackageImportResult,
} from '../utils/data-manager-resource-package'
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
const importPreviewText = ref('')
const allPackageSections = Object.keys(DEFAULT_DATA_MANAGER_PACKAGE_SECTIONS) as DataManagerPackageSection[]
const availableImportSections = ref(new Set<DataManagerPackageSection>(allPackageSections))
const exportAppData = ref(true)
const exportAppDataImages = ref(true)
const exportFavorites = ref(true)
const importAppData = ref(true)
const importAppDataImages = ref(true)
const importFavorites = ref(true)
const favoriteMergeStrategy = ref<DataManagerFavoritesMergeStrategy>('overwrite')

const storageSummary = ref<StorageBreakdownSummary | null>(null)
const isRefreshingStorage = ref(false)

const storageLabelKeys: Record<StorageBreakdownItemKey, string> = {
  appMainData: 'dataManager.storage.appMainData',
  imageCache: 'dataManager.storage.imageCache',
  favoriteImages: 'dataManager.storage.favoriteImages',
  backupData: 'dataManager.storage.backupData',
}

const storageCardItemKeys: StorageBreakdownItemKey[] = ['appMainData', 'imageCache', 'favoriteImages']

const canImportFavoritesBundle = computed(() =>
  availableImportSections.value.has('favorites')
)

const getBusinessSectionLabels = (sections: DataManagerPackageSection[]): string[] => {
  const set = new Set(sections)
  const labels: string[] = []
  if (set.has('appData')) {
    labels.push(t('dataManager.sections.appData'))
  }
  if (set.has('imageCache')) {
    labels.push(t('dataManager.sections.appDataImages'))
  }
  if (set.has('favorites')) {
    labels.push(t('dataManager.sections.favoritesBundle'))
  }
  return labels
}

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

const toExportSectionSelection = (): DataManagerPackageSectionSelection => ({
  appData: exportAppData.value,
  favorites: exportFavorites.value,
  imageCache: exportAppData.value && exportAppDataImages.value,
  favoriteImages: exportFavorites.value,
})

const toImportSectionSelection = (): DataManagerPackageSectionSelection => ({
  appData: importAppData.value && availableImportSections.value.has('appData'),
  favorites: importFavorites.value && availableImportSections.value.has('favorites'),
  imageCache:
    importAppData.value &&
    importAppDataImages.value &&
    availableImportSections.value.has('imageCache'),
  favoriteImages:
    importFavorites.value &&
    availableImportSections.value.has('favoriteImages'),
})

const resetImportSelection = () => {
  importPreviewText.value = ''
  availableImportSections.value = new Set(allPackageSections)
  importAppData.value = true
  importAppDataImages.value = true
  importFavorites.value = true
}

const updateImportPreviewFromFile = async (uploadFile: UploadFileInfo | null) => {
  resetImportSelection()

  const file = uploadFile?.file ?? null
  if (!file) return

  try {
    const buffer = await readFileAsArrayBuffer(file)
    const bytes = new Uint8Array(buffer)
    if (!looksLikeDataManagerZipPackage(file.name, bytes)) {
      availableImportSections.value = new Set(['appData'])
      importAppData.value = true
      importAppDataImages.value = false
      importFavorites.value = false
      importPreviewText.value = t('dataManager.import.legacyJsonPreview')
      return
    }

    const packageContent = readDataManagerResourcePackage(buffer)
    const includedSections = getIncludedDataManagerPackageSections(packageContent.manifest)
    availableImportSections.value = new Set(includedSections)
    importAppData.value = availableImportSections.value.has('appData')
    importAppDataImages.value = importAppData.value && availableImportSections.value.has('imageCache')
    importFavorites.value = canImportFavoritesBundle.value
    importPreviewText.value = t('dataManager.import.packagePreview', {
      sections: getBusinessSectionLabels(includedSections).join('、'),
    })
  } catch (error) {
    console.warn('[DataManager] Failed to preview import package:', error)
  }
}

const handleFileChange = (options: { fileList: UploadFileInfo[] }) => {
  selectedFile.value = options.fileList[0] ?? null
  void updateImportPreviewFromFile(selectedFile.value)
}

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error(t('dataManager.import.readFileFailed')))
      }
    }
    reader.onerror = () => reject(new Error(t('dataManager.import.readFileFailed')))
    reader.readAsArrayBuffer(file)
  })

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
    const servicesValue = services.value
    if (!servicesValue) {
      throw new Error('[DataManager] Services are not initialized. Make sure the application has started correctly.')
    }
    isExporting.value = true

    const exportPackage = await createDataManagerResourcePackage({
      dataManager: getDataManager.value,
      favoriteManager: servicesValue.favoriteManager,
      imageStorageService: servicesValue.imageStorageService,
      favoriteImageStorageService: servicesValue.favoriteImageStorageService,
      sections: toExportSectionSelection(),
    })
    const url = URL.createObjectURL(exportPackage.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prompt-optimizer-backup-${new Date().toISOString().split('T')[0]}.po-backup.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    if (exportPackage.missingResources.length > 0) {
      toast.warning(t('dataManager.export.partialSuccess', {
        count: exportPackage.missingResources.length,
      }))
    } else {
      toast.success(t('dataManager.export.success'))
    }
  } catch (error) {
    console.error('Export failed:', error)
    toast.error(t('dataManager.export.failed'))
  } finally {
    isExporting.value = false
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
  resetImportSelection()
}

const buildPackageImportWarning = (result: DataManagerResourcePackageImportResult): string => {
  const warnings: string[] = []
  if (result.resources.missing.length > 0) {
    warnings.push(t('dataManager.import.resourcesMissing', {
      count: result.resources.missing.length,
    }))
  }
  if (result.resources.corrupt.length > 0) {
    warnings.push(t('dataManager.import.resourcesCorrupt', {
      count: result.resources.corrupt.length,
    }))
  }
  if (result.resources.errors.length > 0) {
    warnings.push(t('dataManager.import.resourcesFailed', {
      count: result.resources.errors.length,
    }))
  }
  return warnings.join('\n')
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

    const buffer = await readFileAsArrayBuffer(file)
    const bytes = new Uint8Array(buffer)

    if (looksLikeDataManagerZipPackage(file.name, bytes)) {
      const servicesValue = services.value
      if (!servicesValue) {
        throw new Error('[DataManager] Services are not initialized. Make sure the application has started correctly.')
      }

      const result = await importDataManagerResourcePackage(buffer, {
        dataManager: getDataManager.value,
        favoriteManager: servicesValue.favoriteManager,
        imageStorageService: servicesValue.imageStorageService,
        favoriteImageStorageService: servicesValue.favoriteImageStorageService,
        sections: toImportSectionSelection(),
        favoriteMergeStrategy: favoriteMergeStrategy.value,
      })

      toast.success(t('dataManager.import.packageSuccess', {
        restored: result.resources.restored,
        skipped: result.resources.skipped,
      }))

      const warning = buildPackageImportWarning(result)
      if (warning) {
        toast.warning(warning)
      }
    } else {
      if (!importAppData.value) {
        toast.warning(t('dataManager.import.noSelectedContent'))
        return
      }
      const content = new TextDecoder().decode(bytes)
      const dataManager = getDataManager.value
      await dataManager.importAllData(content)
      toast.success(t('dataManager.import.success'))
    }

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
  padding: 2px 4px 4px;
}

.data-manager-section {
  padding: 18px 0 20px;
  border-bottom: 1px solid var(--n-border-color);
}

.data-manager-section:first-child {
  padding-top: 0;
}

.data-manager-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-title {
  display: block;
  font-size: 18px;
  line-height: 1.3;
}

.section-description {
  display: block;
  margin-top: 6px;
  line-height: 1.5;
}

.storage-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.storage-stat-card,
.backup-action-panel {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--n-color-embedded);
  min-width: 0;
}

.storage-stat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 112px;
}

.storage-stat-card--total {
  background: var(--n-primary-color-suppl);
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

.desktop-storage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.storage-path-block {
  min-width: 0;
  flex: 1;
}

.storage-path-label {
  font-size: 12px;
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
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.storage-desktop-stat-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 600;
}

.workspace-action-description {
  display: block;
  margin-top: 6px;
  line-height: 1.5;
}

.backup-actions-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.backup-action-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.backup-options-block {
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
}

.backup-options-title {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
}

.backup-scope-list,
.backup-strategy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backup-scope-option,
.backup-sub-option,
.backup-strategy-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  cursor: pointer;
}

.backup-scope-option,
.backup-sub-option {
  flex-direction: column;
}

.backup-sub-option {
  margin-left: 20px;
  background: var(--n-color-embedded);
}

.action-panel-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.action-panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
}

.import-dropzone,
.import-selected-file {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  padding: 12px;
  text-align: center;
}

.import-dropzone {
  flex-direction: column;
}

.import-format-note,
.selected-file-size,
.selected-file-preview {
  display: block;
  font-size: 12px;
  margin-top: 4px;
}

.import-warning {
  margin-top: 2px;
}

@media (max-width: 900px) {
  .storage-cards-grid,
  .backup-actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .desktop-storage-row {
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
