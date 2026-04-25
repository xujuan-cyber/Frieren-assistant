<template>
  <div class="favorite-editor-form" :class="{ 'favorite-editor-form--embedded': embedded }">
    <NScrollbar class="favorite-editor-form__scroll">
      <div class="favorite-editor-form__content">
        <NSpace vertical :size="16">
          <NCard
            size="small"
            :title="t('favorites.dialog.basicInfo')"
            :segmented="{ content: true }"
          >
            <NForm label-placement="top">
              <NGrid :cols="isMobile ? 1 : 2" :x-gap="16">
                <NGridItem>
                  <NFormItem :label="t('favorites.dialog.titleLabel')" required>
                    <NInput
                      v-model:value="formData.title"
                      :placeholder="t('favorites.dialog.titlePlaceholder')"
                      maxlength="100"
                      show-count
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem :label="t('favorites.dialog.categoryLabel')">
                    <CategoryTreeSelect
                      v-model="formData.category"
                      :placeholder="t('favorites.dialog.categoryPlaceholder')"
                      :show-all-option="false"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem :label="t('favorites.dialog.functionModeLabel')" required>
                    <NSelect
                      v-model:value="formData.functionMode"
                      :options="functionModeOptions"
                      :disabled="props.mode === 'save' && !!props.originalContent"
                      @update:value="handleFunctionModeChange"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem
                    v-if="formData.functionMode === 'basic' || formData.functionMode === 'context'"
                    :label="t('favorites.dialog.optimizationModeLabel')"
                  >
                    <NSelect
                      v-model:value="formData.optimizationMode"
                      :options="optimizationModeOptions"
                      :placeholder="t('favorites.dialog.optimizationModePlaceholder')"
                      :disabled="props.mode === 'save' && !!props.originalContent"
                    />
                  </NFormItem>

                  <NFormItem
                    v-else
                    :label="t('favorites.dialog.imageModeLabel')"
                  >
                    <NSelect
                      v-model:value="formData.imageSubMode"
                      :options="imageSubModeOptions"
                      :placeholder="t('favorites.dialog.imageModePlaceholder')"
                      :disabled="props.mode === 'save' && !!props.originalContent"
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <NFormItem :label="t('favorites.dialog.descriptionLabel')">
                <NInput
                  v-model:value="formData.description"
                  type="textarea"
                  :placeholder="t('favorites.dialog.descriptionPlaceholder')"
                  :autosize="{ minRows: 3, maxRows: 5 }"
                  maxlength="300"
                  show-count
                />
              </NFormItem>

              <NFormItem :label="t('favorites.dialog.tagsLabel')">
                <div class="favorite-editor-form__tag-field">
                  <NSpace v-if="formData.tags.length > 0" :size="[8, 8]" class="favorite-editor-form__tag-list">
                    <NTag
                      v-for="(tag, index) in formData.tags"
                      :key="tag"
                      closable
                      type="info"
                      @close="handleRemoveTag(index)"
                    >
                      {{ tag }}
                    </NTag>
                  </NSpace>

                  <NAutoComplete
                    v-model:value="tagInputValue"
                    :options="tagSuggestions"
                    :placeholder="t('favorites.dialog.tagsPlaceholder')"
                    :get-show="() => tagInputValue.length > 0 || tagSuggestions.length > 0"
                    clearable
                    @select="handleSelectTag"
                    @keydown.enter="handleAddTag"
                  />
                </div>
              </NFormItem>
            </NForm>
          </NCard>

          <NCard
            size="small"
            :title="t('favorites.dialog.imagesLabel')"
            :segmented="{ content: true }"
          >
            <NSpace vertical :size="12">
              <template v-if="mediaDraft.sources.length === 0">
                <NUpload
                  accept="image/*"
                  multiple
                  :default-upload="false"
                  :show-file-list="false"
                  :disabled="saving"
                  @before-upload="handleBeforeImageUpload"
                >
                  <NUploadDragger>
                    <div class="favorite-editor-form__upload-empty">
                      <NSpace vertical :size="6" align="center">
                        <NText>{{ t('favorites.dialog.imagesUploadHint') }}</NText>
                        <NText depth="3">{{ t('favorites.dialog.imagesUploadSupport') }}</NText>
                      </NSpace>
                    </div>
                  </NUploadDragger>
                </NUpload>
              </template>

              <template v-else>
                <NSpace justify="space-between" align="center" wrap>
                  <NUpload
                    accept="image/*"
                    multiple
                    :default-upload="false"
                    :show-file-list="false"
                    :disabled="saving"
                    @before-upload="handleBeforeImageUpload"
                  >
                    <NButton secondary>
                      {{ t('favorites.dialog.addImages') }}
                    </NButton>
                  </NUpload>

                  <NButton
                    quaternary
                    type="error"
                    size="small"
                    @click="handleClearImages"
                  >
                    {{ t('favorites.dialog.clearImages') }}
                  </NButton>
                </NSpace>

                <div class="favorite-editor-form__media-grid">
                  <NCard
                    v-for="(source, index) in mediaDraft.sources"
                    :key="`${index}-${source.slice(0, 32)}`"
                    size="small"
                    class="favorite-editor-form__media-card"
                    :segmented="{ content: true, footer: 'soft' }"
                  >
                    <AppPreviewImageGroup>
                      <AppPreviewImage
                        :src="source"
                        :alt="t('favorites.dialog.imageAlt', { index: index + 1 })"
                        object-fit="cover"
                        class="favorite-editor-form__media-image"
                      />
                    </AppPreviewImageGroup>

                    <template #footer>
                      <NSpace justify="space-between" align="center" :wrap="false" class="favorite-editor-form__media-actions">
                        <NTag
                          v-if="mediaDraft.coverIndex === index"
                          size="small"
                          type="success"
                          :bordered="false"
                        >
                          {{ t('favorites.dialog.coverTag') }}
                        </NTag>
                        <NButton
                          v-else
                          quaternary
                          size="tiny"
                          @click="handleSetCover(index)"
                        >
                          {{ t('favorites.dialog.setAsCover') }}
                        </NButton>

                        <NButton
                          quaternary
                          type="error"
                          size="tiny"
                          @click="handleRemoveImage(index)"
                        >
                          {{ t('favorites.dialog.removeImage') }}
                        </NButton>
                      </NSpace>
                    </template>
                  </NCard>
                </div>
              </template>
            </NSpace>
          </NCard>

          <NCard
            size="small"
            :title="t('favorites.dialog.contentTitle')"
            :segmented="{ content: true }"
          >
            <NInput
              v-model:value="formData.content"
              type="textarea"
              :placeholder="t('favorites.dialog.contentPlaceholder')"
              :autosize="{ minRows: embedded ? 10 : isMobile ? 10 : 14, maxRows: 24 }"
            />
          </NCard>
        </NSpace>
      </div>
    </NScrollbar>

    <div class="favorite-editor-form__actions" :class="{ 'favorite-editor-form__actions--embedded': embedded }">
      <NSpace justify="end">
        <NButton :disabled="saving" @click="$emit('cancel')">
          {{ t('favorites.dialog.cancel') }}
        </NButton>
        <NButton type="primary" :loading="saving" @click="handleSave">
          {{ t('favorites.dialog.save') }}
        </NButton>
      </NSpace>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch, type Ref } from 'vue'

import {
  NAutoComplete,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NScrollbar,
  NSelect,
  NSpace,
  NTag,
  NText,
  NUpload,
  NUploadDragger,
  type UploadFileInfo,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { FavoritePrompt } from '@prompt-optimizer/core'

import { useToast } from '../composables/ui/useToast'
import { useTagSuggestions } from '../composables/ui/useTagSuggestions'
import type { AppServices } from '../types/services'
import { getI18nErrorMessage } from '../utils/error'
import { buildFavoriteMediaMetadata, parseFavoriteMediaMetadata } from '../utils/favorite-media'
import {
  persistImageSourceAsAssetId,
  resolveAssetIdToDataUrl,
} from '../utils/image-asset-storage'
import CategoryTreeSelect from './CategoryTreeSelect.vue'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

const { t } = useI18n()
const { filterTags, loadTags } = useTagSuggestions()

interface Props {
  mode?: 'create' | 'save' | 'edit'
  content?: string
  originalContent?: string
  currentFunctionMode?: 'basic' | 'context' | 'pro' | 'image'
  currentOptimizationMode?: 'system' | 'user'
  prefill?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    functionMode?: 'basic' | 'context' | 'image'
    optimizationMode?: 'system' | 'user'
    imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
    metadata?: Record<string, unknown>
  }
  favorite?: FavoritePrompt
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'save',
  content: '',
  originalContent: undefined,
  currentFunctionMode: 'basic',
  currentOptimizationMode: 'system',
  prefill: undefined,
  favorite: undefined,
  embedded: false,
})

const emit = defineEmits<{
  'cancel': []
  'saved': [favoriteId: string]
}>()

const services = inject<Ref<AppServices | null>>('services')
const message = useToast()

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const saving = ref(false)
const mediaTouched = ref(false)
const tagInputValue = ref('')

const isMobile = computed(() => viewportWidth.value < 768)

const formData = reactive({
  title: '',
  description: '',
  content: '',
  category: '',
  tags: [] as string[],
  functionMode: 'basic' as 'basic' | 'context' | 'image',
  optimizationMode: 'system' as 'system' | 'user' | undefined,
  imageSubMode: undefined as 'text2image' | 'image2image' | 'multiimage' | undefined,
})

const mediaDraft = reactive({
  sources: [] as string[],
  coverIndex: -1,
})

const tagSuggestions = computed(() => {
  const suggestions = filterTags(tagInputValue.value, formData.tags)
  return suggestions.map((suggestion) => ({
    label: suggestion.label,
    value: suggestion.value,
  }))
})

const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

const getPreferredStorageService = () => {
  return services?.value?.favoriteImageStorageService || services?.value?.imageStorageService || null
}

const getReadStorageCandidates = () => {
  const favoriteStorage = services?.value?.favoriteImageStorageService || null
  const legacyStorage = services?.value?.imageStorageService || null

  if (favoriteStorage && legacyStorage && favoriteStorage !== legacyStorage) {
    return [favoriteStorage, legacyStorage]
  }

  if (favoriteStorage) return [favoriteStorage]
  if (legacyStorage) return [legacyStorage]
  return []
}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })

const resolveAssetIdsToDataUrls = async (assetIds: string[]): Promise<string[]> => {
  const storageCandidates = getReadStorageCandidates()
  if (storageCandidates.length === 0 || assetIds.length === 0) return []

  const resolved: string[] = []
  for (const assetId of dedupeStrings(assetIds)) {
    for (const storageService of storageCandidates) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(assetId, storageService)
        if (dataUrl) {
          resolved.push(dataUrl)
          break
        }
      } catch (error) {
        console.warn('[FavoriteEditorForm] Failed to resolve asset id:', assetId, error)
      }
    }
  }

  return resolved
}

const resetMediaDraft = () => {
  mediaDraft.sources = []
  mediaDraft.coverIndex = -1
}

const hydrateMediaDraft = async (metadata?: Record<string, unknown>, favorite?: FavoritePrompt) => {
  resetMediaDraft()
  const media = favorite
    ? parseFavoriteMediaMetadata(favorite)
    : metadata
      ? parseFavoriteMediaMetadata({ metadata } as FavoritePrompt)
      : null
  if (!media) return

  const resolvedCover = media.coverAssetId
    ? (await resolveAssetIdsToDataUrls([media.coverAssetId]))[0]
    : undefined
  const resolvedAssets = await resolveAssetIdsToDataUrls(media.assetIds)

  const sources = dedupeStrings([
    resolvedCover || media.coverUrl || '',
    ...resolvedAssets,
    ...media.urls,
  ])

  mediaDraft.sources = sources
  if (sources.length === 0) {
    mediaDraft.coverIndex = -1
    return
  }

  const coverSource = resolvedCover || media.coverUrl || ''
  mediaDraft.coverIndex = coverSource ? Math.max(0, sources.indexOf(coverSource)) : 0
}

const resolvePrefillCategoryId = async (candidate?: string): Promise<string> => {
  const normalized = String(candidate || '').trim()
  if (!normalized) return ''

  const servicesValue = services?.value
  if (!servicesValue?.favoriteManager) return ''

  try {
    const categories = await servicesValue.favoriteManager.getCategories()
    if (categories.some((category) => category.id === normalized)) {
      return normalized
    }

    const lowered = normalized.toLowerCase()
    const matched = categories.find(
      (category) => String(category.name || '').trim().toLowerCase() === lowered,
    )
    return matched?.id || ''
  } catch (error) {
    console.warn('[FavoriteEditorForm] Failed to resolve prefill category:', error)
    return ''
  }
}

const buildMediaMetadataForSave = async () => {
  const normalizedSources = dedupeStrings(
    mediaDraft.sources.map((item) => String(item || '').trim()).filter(Boolean),
  )

  if (normalizedSources.length === 0) return null

  const preferredStorage = getPreferredStorageService()
  const assetIds: string[] = []
  const fallbackUrls: string[] = []
  const sourceToAssetId = new Map<string, string>()

  for (const source of normalizedSources) {
    if (!preferredStorage) {
      fallbackUrls.push(source)
      continue
    }

    try {
      const assetId = await persistImageSourceAsAssetId({
        source,
        storageService: preferredStorage,
        sourceType: 'uploaded',
      })

      if (assetId) {
        assetIds.push(assetId)
        sourceToAssetId.set(source, assetId)
      } else {
        fallbackUrls.push(source)
      }
    } catch (error) {
      console.warn('[FavoriteEditorForm] Failed to persist media source:', error)
      fallbackUrls.push(source)
    }
  }

  const coverSource =
    mediaDraft.coverIndex >= 0 && mediaDraft.coverIndex < normalizedSources.length
      ? normalizedSources[mediaDraft.coverIndex]
      : normalizedSources[0]

  const coverAssetId = coverSource ? sourceToAssetId.get(coverSource) : undefined
  const coverUrl = coverSource && !coverAssetId ? coverSource : undefined

  return buildFavoriteMediaMetadata({
    coverAssetId,
    coverUrl,
    assetIds,
    urls: fallbackUrls,
  })
}

const handleBeforeImageUpload = async (options: { file: UploadFileInfo }) => {
  const raw = (options.file as unknown as { file?: Blob | null }).file
  if (!raw) return false

  try {
    const dataUrl = await readBlobAsDataUrl(raw)
    if (dataUrl) {
      mediaDraft.sources = dedupeStrings([...mediaDraft.sources, dataUrl])
      mediaTouched.value = true
      if (mediaDraft.coverIndex < 0) {
        mediaDraft.coverIndex = 0
      }
    }
  } catch (error) {
    console.error('[FavoriteEditorForm] Failed to read selected image:', error)
    message.error(t('favorites.dialog.messages.imageReadFailed'))
  }

  return false
}

const handleSetCover = (index: number) => {
  if (index < 0 || index >= mediaDraft.sources.length) return
  mediaTouched.value = true
  mediaDraft.coverIndex = index
}

const handleRemoveImage = (index: number) => {
  if (index < 0 || index >= mediaDraft.sources.length) return

  mediaTouched.value = true
  mediaDraft.sources.splice(index, 1)

  if (mediaDraft.sources.length === 0) {
    mediaDraft.coverIndex = -1
    return
  }

  if (mediaDraft.coverIndex === index) {
    mediaDraft.coverIndex = 0
  } else if (mediaDraft.coverIndex > index) {
    mediaDraft.coverIndex -= 1
  }
}

const handleClearImages = () => {
  mediaTouched.value = true
  resetMediaDraft()
}

const functionModeOptions = computed(() => [
  { label: t('favorites.dialog.functionModes.basic'), value: 'basic' },
  { label: t('favorites.dialog.functionModes.context'), value: 'context' },
  { label: t('favorites.dialog.functionModes.image'), value: 'image' },
])

const optimizationModeOptions = computed(() => {
  const isContextMode = formData.functionMode === 'context'

  return [
    {
      label: isContextMode
        ? t('contextMode.optimizationMode.message')
        : t('favorites.dialog.optimizationModes.system'),
      value: 'system',
    },
    {
      label: isContextMode
        ? t('contextMode.optimizationMode.variable')
        : t('favorites.dialog.optimizationModes.user'),
      value: 'user',
    },
  ]
})

const imageSubModeOptions = computed(() => [
  { label: t('favorites.dialog.imageModes.text2image'), value: 'text2image' },
  { label: t('favorites.dialog.imageModes.image2image'), value: 'image2image' },
  { label: t('imageMode.multiimage'), value: 'multiimage' },
])

const handleFunctionModeChange = (mode: 'basic' | 'context' | 'image') => {
  formData.functionMode = mode

  if (mode === 'basic' || mode === 'context') {
    formData.optimizationMode = formData.optimizationMode || 'system'
    formData.imageSubMode = undefined
  } else {
    formData.imageSubMode = formData.imageSubMode || 'text2image'
    formData.optimizationMode = undefined
  }
}

const handleRemoveTag = (index: number) => {
  formData.tags.splice(index, 1)
}

const handleSelectTag = (value: string) => {
  if (value && !formData.tags.includes(value) && formData.tags.length < 10) {
    formData.tags.push(value)
    tagInputValue.value = ''
  }
}

const handleAddTag = (event: KeyboardEvent) => {
  event.preventDefault()
  const trimmedValue = tagInputValue.value.trim()
  if (trimmedValue && !formData.tags.includes(trimmedValue) && formData.tags.length < 10) {
    formData.tags.push(trimmedValue)
    tagInputValue.value = ''
  }
}

const handleSave = async () => {
  const servicesValue = services?.value
  if (!servicesValue?.favoriteManager) {
    message.warning(t('favorites.dialog.messages.unavailable'))
    return
  }

  if (!formData.title.trim()) {
    message.warning(t('favorites.dialog.validation.titleRequired'))
    return
  }

  if (!formData.content.trim()) {
    message.warning(t('favorites.dialog.validation.contentRequired'))
    return
  }

  saving.value = true
  try {
    const existingTags = new Set<string>(
      (await servicesValue.favoriteManager.getAllTags()).map((tagStat) => tagStat.tag),
    )

    for (const tag of formData.tags) {
      if (existingTags.has(tag)) {
        continue
      }

      try {
        await servicesValue.favoriteManager.addTag(tag)
        existingTags.add(tag)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'TAG_ALREADY_EXISTS') {
          console.error('Failed to add tag to the dedicated library:', error)
          throw error
        }
      }
    }

    const sanitizedTags = Array.from(toRaw(formData.tags || [])).map((tag) => String(tag))

    const basePayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      category: formData.category,
      tags: sanitizedTags,
      functionMode: formData.functionMode,
      optimizationMode: formData.optimizationMode,
      imageSubMode: formData.imageSubMode,
    }

    const existingMetadata =
      props.mode === 'edit' && props.favorite?.metadata && typeof props.favorite.metadata === 'object'
        ? { ...props.favorite.metadata }
        : props.mode === 'save' && props.prefill?.metadata && typeof props.prefill.metadata === 'object'
          ? { ...props.prefill.metadata }
          : {}

    const mediaMetadata = await buildMediaMetadataForSave()
    const prefillMedia =
      props.mode === 'save' && props.prefill?.metadata && typeof props.prefill.metadata === 'object'
        ? (props.prefill.metadata as Record<string, unknown>).media
        : undefined

    if (mediaMetadata) {
      existingMetadata.media = mediaMetadata
    } else if (
      props.mode === 'save'
      && !mediaTouched.value
      && prefillMedia
      && typeof prefillMedia === 'object'
    ) {
      existingMetadata.media = { ...(prefillMedia as Record<string, unknown>) }
    } else {
      delete existingMetadata.media
    }

    if (props.originalContent) {
      existingMetadata.originalContent = props.originalContent
    }

    const metadata = Object.keys(existingMetadata).length > 0 ? existingMetadata : undefined

    let favoriteId = props.favorite?.id || ''
    if (props.mode === 'edit' && props.favorite) {
      await servicesValue.favoriteManager.updateFavorite(props.favorite.id, {
        ...basePayload,
        metadata,
      })
      favoriteId = props.favorite.id
      message.success(t('favorites.dialog.messages.editSuccess'))
    } else {
      favoriteId = await servicesValue.favoriteManager.addFavorite({
        ...basePayload,
        metadata,
      })
      message.success(t('favorites.dialog.messages.saveSuccess'))
    }

    emit('saved', favoriteId)
  } catch (error) {
    const failedKey = props.mode === 'edit' ? 'favorites.dialog.messages.editFailed' : 'favorites.dialog.messages.saveFailed'
    const errorMessage = getI18nErrorMessage(error, t('common.error'))
    message.error(`${t(failedKey)}: ${errorMessage}`)
  } finally {
    saving.value = false
  }
}

watch(() => [
  props.mode,
  props.content,
  props.originalContent,
  props.currentFunctionMode,
  props.currentOptimizationMode,
  props.prefill,
  props.favorite,
], async () => {
  mediaTouched.value = false
  await loadTags()

  if (props.mode === 'create') {
    formData.title = ''
    formData.description = ''
    formData.content = ''
    formData.category = ''
    formData.tags = []
    formData.functionMode = 'basic'
    formData.optimizationMode = 'system'
    formData.imageSubMode = undefined
    resetMediaDraft()
    return
  }

  if (props.mode === 'edit' && props.favorite) {
    formData.title = props.favorite.title
    formData.description = props.favorite.description || ''
    formData.content = props.favorite.content
    formData.category = props.favorite.category || ''
    formData.tags = [...(props.favorite.tags || [])]
    formData.functionMode = props.favorite.functionMode || 'basic'
    formData.optimizationMode = props.favorite.optimizationMode
    formData.imageSubMode = props.favorite.imageSubMode
    await hydrateMediaDraft(undefined, props.favorite)
    return
  }

  const prefill = props.prefill
  const titleSource = (typeof prefill?.title === 'string' && prefill.title.trim()
    ? prefill.title
    : props.originalContent || props.content || '')
  formData.title = titleSource.replace(/\r?\n/g, ' ').substring(0, 30).trim()
  formData.content = props.content || ''
  formData.description = typeof prefill?.description === 'string' ? prefill.description : ''
  formData.category = await resolvePrefillCategoryId(
    typeof prefill?.category === 'string' ? prefill.category : '',
  )
  formData.tags = Array.isArray(prefill?.tags)
    ? dedupeStrings(prefill.tags.map((tag) => String(tag || '').trim()).filter(Boolean))
    : []

  if (prefill?.functionMode === 'image') {
    formData.functionMode = 'image'
    formData.imageSubMode =
      prefill.imageSubMode === 'image2image'
        ? 'image2image'
        : prefill.imageSubMode === 'multiimage'
          ? 'multiimage'
          : 'text2image'
    formData.optimizationMode = undefined
  } else if (prefill?.functionMode === 'context' || prefill?.functionMode === 'basic') {
    formData.functionMode = prefill.functionMode
    formData.optimizationMode = prefill.optimizationMode === 'user' ? 'user' : 'system'
    formData.imageSubMode = undefined
  } else if (props.currentFunctionMode === 'image') {
    formData.functionMode = 'image'
    formData.imageSubMode = 'text2image'
    formData.optimizationMode = undefined
  } else if (props.currentFunctionMode === 'context' || props.currentFunctionMode === 'pro') {
    formData.functionMode = 'context'
    formData.optimizationMode = props.currentOptimizationMode
    formData.imageSubMode = undefined
  } else {
    formData.functionMode = 'basic'
    formData.optimizationMode = props.currentOptimizationMode
    formData.imageSubMode = undefined
  }

  const prefillMetadata =
    prefill?.metadata && typeof prefill.metadata === 'object'
      ? (prefill.metadata as Record<string, unknown>)
      : undefined
  await hydrateMediaDraft(prefillMetadata)
}, { immediate: true, deep: true })

const updateViewportWidth = () => {
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
})
</script>

<style scoped>
.favorite-editor-form {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.favorite-editor-form__scroll {
  min-height: 0;
  flex: 1;
}

.favorite-editor-form__content {
  padding: 20px;
}

.favorite-editor-form__tag-field {
  width: 100%;
}

.favorite-editor-form__tag-list {
  margin-bottom: 8px;
}

.favorite-editor-form__upload-empty {
  padding: 16px 12px;
}

.favorite-editor-form__media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}

.favorite-editor-form__media-card {
  overflow: hidden;
}

.favorite-editor-form__media-image {
  display: block;
  width: 100%;
  height: 120px;
}

.favorite-editor-form__media-actions {
  width: 100%;
}

.favorite-editor-form__actions {
  flex: 0 0 auto;
  border-top: 1px solid var(--n-divider-color);
  background: var(--n-card-color);
  padding: 16px 20px;
}

.favorite-editor-form__actions--embedded {
  position: sticky;
  bottom: 0;
  z-index: 2;
}

@media (max-width: 767px) {
  .favorite-editor-form__content {
    padding: 16px;
  }

  .favorite-editor-form__media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .favorite-editor-form__actions {
    padding: 14px 16px;
  }
}
</style>
