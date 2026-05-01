<template>
  <div class="favorite-import-panel">
    <NScrollbar class="favorite-import-panel__scroll">
      <div class="favorite-import-panel__content">
        <NSpace vertical :size="16">
          <NCard
            size="small"
            :title="t('favorites.manager.importDialog.sourceLabel')"
            :segmented="{ content: true }"
          >
            <NSpace vertical :size="16">
              <NRadioGroup v-model:value="source">
                <NSpace :size="16" align="center" wrap>
                  <NRadio value="file">{{ t('favorites.manager.importDialog.sourceFile') }}</NRadio>
                  <NRadio value="paste">{{ t('favorites.manager.importDialog.sourcePaste') }}</NRadio>
                </NSpace>
              </NRadioGroup>

              <div v-if="source === 'file'" class="favorite-import-panel__section">
                <template v-if="selectedFile">
                  <NThing>
                    <template #header>
                      {{ selectedFile.name }}
                    </template>
                    <template #description>
                      {{ formatFileSize(selectedFile.file?.size) }}
                    </template>
                    <template #footer>
                      <NUpload
                        :max="1"
                        accept=".zip,.po-favorites.zip,.json,application/zip,application/json"
                        :default-upload="false"
                        :file-list="fileList"
                        @change="handleFileChange"
                      >
                        <NButton secondary>
                          {{ t('favorites.manager.importDialog.changeFile') }}
                        </NButton>
                      </NUpload>
                    </template>
                  </NThing>
                </template>

                <NUpload
                  v-else
                  :max="1"
                  accept=".zip,.po-favorites.zip,.json,application/zip,application/json"
                  :default-upload="false"
                  :file-list="fileList"
                  @change="handleFileChange"
                >
                  <NUploadDragger>
                    <div class="favorite-import-panel__upload">
                      <NSpace vertical :size="8" align="center">
                        <NIcon size="28">
                          <Upload />
                        </NIcon>
                        <NText>{{ t('favorites.manager.importDialog.uploadHint') }}</NText>
                        <NText depth="3">
                          {{ t('favorites.manager.importDialog.supportFormat') }}
                        </NText>
                      </NSpace>
                    </div>
                  </NUploadDragger>
                </NUpload>
              </div>

              <NInput
                v-else
                v-model:value="rawJson"
                type="textarea"
                :placeholder="t('favorites.manager.importDialog.pastePlaceholder')"
                :autosize="{ minRows: 8, maxRows: 16 }"
              />
            </NSpace>
          </NCard>

          <NCard
            size="small"
            :title="t('favorites.manager.importDialog.mergeStrategy')"
            :segmented="{ content: true }"
          >
            <NRadioGroup v-model:value="mergeStrategy">
              <NSpace vertical :size="12" class="favorite-import-panel__strategy-list">
                <label class="favorite-import-panel__strategy-option">
                  <NRadio value="skip">{{ t('favorites.manager.importDialog.skipDuplicate') }}</NRadio>
                  <NText depth="3">{{ t('favorites.manager.importDialog.resultHintSkip') }}</NText>
                </label>
                <label class="favorite-import-panel__strategy-option">
                  <NRadio value="overwrite">{{ t('favorites.manager.importDialog.overwriteDuplicate') }}</NRadio>
                  <NText depth="3">{{ t('favorites.manager.importDialog.resultHintOverwrite') }}</NText>
                </label>
                <label class="favorite-import-panel__strategy-option">
                  <NRadio value="merge">{{ t('favorites.manager.importDialog.createCopy') }}</NRadio>
                  <NText depth="3">{{ t('favorites.manager.importDialog.resultHintMerge') }}</NText>
                </label>
              </NSpace>
            </NRadioGroup>
          </NCard>
        </NSpace>
      </div>
    </NScrollbar>

    <div class="favorite-import-panel__actions">
      <NSpace justify="space-between" align="center" class="favorite-import-panel__action-row">
        <NText depth="3">{{ mergeStrategyHint }}</NText>
        <NSpace :size="8">
          <NButton :disabled="importing" @click="$emit('cancel')">
            {{ t('favorites.manager.importDialog.cancel') }}
          </NButton>
          <NButton type="primary" :loading="importing" @click="handleImportConfirm">
            {{ importing ? t('favorites.manager.importDialog.importing') : t('favorites.manager.importDialog.import') }}
          </NButton>
        </NSpace>
      </NSpace>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'

import {
  NButton,
  NCard,
  NIcon,
  NInput,
  NRadio,
  NRadioGroup,
  NScrollbar,
  NSpace,
  NText,
  NThing,
  NUpload,
  NUploadDragger,
  type UploadFileInfo,
} from 'naive-ui'
import { Upload } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'

import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import { getI18nErrorMessage } from '../utils/error'
import {
  importFavoriteResourcePackage,
  looksLikeFavoriteZipPackage,
  type FavoriteResourcePackageImportResult,
} from '../utils/favorite-resource-package'

const { t } = useI18n()
const message = useToast()
const services = inject<Ref<AppServices | null> | null>('services', null)

const emit = defineEmits<{
  'cancel': []
  'imported': []
}>()

const source = ref<'file' | 'paste'>('file')
const rawJson = ref('')
const mergeStrategy = ref<'skip' | 'overwrite' | 'merge'>('skip')
const fileList = ref<UploadFileInfo[]>([])
const importing = ref(false)

const selectedFile = computed(() => fileList.value[0] || null)

const mergeStrategyHint = computed(() => {
  if (mergeStrategy.value === 'overwrite') {
    return t('favorites.manager.importDialog.resultHintOverwrite')
  }
  if (mergeStrategy.value === 'merge') {
    return t('favorites.manager.importDialog.resultHintMerge')
  }
  return t('favorites.manager.importDialog.resultHintSkip')
})

type UploadChangeParam = {
  file: UploadFileInfo | null
  fileList: UploadFileInfo[]
  event?: Event
}

const handleFileChange = (options: UploadChangeParam) => {
  fileList.value = options.fileList.slice(0, 1)
}

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error(t('favorites.manager.importDialog.readFileFailed')))
      }
    }
    reader.onerror = () => reject(new Error(t('favorites.manager.importDialog.readFileFailed')))
    reader.readAsArrayBuffer(file)
  })

const formatFileSize = (size?: number) => {
  if (!size || Number.isNaN(size)) return t('favorites.manager.importDialog.noFileSize')
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const buildErrorMessage = (summary: string, error: unknown) => {
  const fallback = t('common.error')
  const detail = getI18nErrorMessage(error, fallback)
  return detail === fallback ? summary : `${summary}: ${detail}`
}

const buildPackageImportWarning = (result: FavoriteResourcePackageImportResult): string => {
  const warnings: string[] = []
  if (result.resources.missing.length > 0) {
    warnings.push(t('favorites.manager.importDialog.resourcesMissing', {
      count: result.resources.missing.length,
    }))
  }
  if (result.resources.corrupt.length > 0) {
    warnings.push(t('favorites.manager.importDialog.resourcesCorrupt', {
      count: result.resources.corrupt.length,
    }))
  }
  if (result.resources.errors.length > 0) {
    warnings.push(t('favorites.manager.importDialog.resourcesFailed', {
      count: result.resources.errors.length,
    }))
  }
  if (result.favorites.errors.length > 0) {
    warnings.push(`${t('favorites.manager.importDialog.importPartialFailed')}:\n${result.favorites.errors.join('\n')}`)
  }
  return warnings.join('\n')
}

const handleImportConfirm = async () => {
  const servicesValue = services?.value
  if (!servicesValue?.favoriteManager) {
    message.warning(t('favorites.manager.messages.unavailable'))
    return
  }

  if (source.value === 'paste' && !rawJson.value.trim()) {
    message.warning(t('favorites.manager.importDialog.selectFileOrPaste'))
    return
  }

  importing.value = true
  try {
    if (source.value === 'file') {
      const file = fileList.value[0]?.file
      if (!file) {
        message.warning(t('favorites.manager.importDialog.selectFileOrPaste'))
        return
      }

      const buffer = await readFileAsArrayBuffer(file)
      const bytes = new Uint8Array(buffer)

      if (looksLikeFavoriteZipPackage(file.name, bytes)) {
        const result = await importFavoriteResourcePackage(buffer, {
          favoriteManager: servicesValue.favoriteManager,
          imageStorageService: servicesValue.favoriteImageStorageService || servicesValue.imageStorageService,
          mergeStrategy: mergeStrategy.value,
        })
        message.success(t('favorites.manager.importDialog.packageImportSuccess', {
          imported: result.favorites.imported,
          skipped: result.favorites.skipped,
          restored: result.resources.restored,
          resourceSkipped: result.resources.skipped,
        }))

        const warning = buildPackageImportWarning(result)
        if (warning) {
          message.warning(warning)
        }
        emit('imported')
        return
      }

      const payload = new TextDecoder().decode(bytes).trim()
      if (!payload) {
        message.warning(t('favorites.manager.importDialog.selectFileOrPaste'))
        return
      }

      const result = await servicesValue.favoriteManager.importFavorites(payload, {
        mergeStrategy: mergeStrategy.value,
      })
      message.success(t('favorites.manager.importDialog.importSuccess', { imported: result.imported, skipped: result.skipped }))
      if (result.errors.length > 0) {
        message.warning(`${t('favorites.manager.importDialog.importPartialFailed')}:\n${result.errors.join('\n')}`)
      }
      emit('imported')
      return
    }

    const result = await servicesValue.favoriteManager.importFavorites(rawJson.value.trim(), {
      mergeStrategy: mergeStrategy.value,
    })
    message.success(t('favorites.manager.importDialog.importSuccess', { imported: result.imported, skipped: result.skipped }))
    if (result.errors.length > 0) {
      message.warning(`${t('favorites.manager.importDialog.importPartialFailed')}:\n${result.errors.join('\n')}`)
    }
    emit('imported')
  } catch (error) {
    message.error(buildErrorMessage(t('favorites.manager.importDialog.importFailed'), error))
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.favorite-import-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.favorite-import-panel__scroll {
  flex: 1;
  min-height: 0;
}

.favorite-import-panel__content {
  padding: 20px;
}

.favorite-import-panel__section,
.favorite-import-panel__strategy-list {
  width: 100%;
}

.favorite-import-panel__upload {
  padding: 18px 12px;
}

.favorite-import-panel__strategy-option {
  display: flex;
  width: 100%;
  padding: 10px 12px;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  cursor: pointer;
}

.favorite-import-panel__actions {
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  z-index: 2;
  border-top: 1px solid var(--n-divider-color);
  background: var(--n-card-color);
  padding: 16px 20px;
}

.favorite-import-panel__action-row {
  width: 100%;
}

@media (max-width: 767px) {
  .favorite-import-panel__content {
    padding: 16px;
  }

  .favorite-import-panel__action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .favorite-import-panel__actions {
    padding: 14px 16px;
  }
}
</style>
