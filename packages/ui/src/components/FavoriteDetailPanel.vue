<template>
  <div class="favorite-detail-panel">
    <div v-if="!favorite" class="favorite-detail-panel__empty">
      <NEmpty :description="t('favorites.manager.preview.selectFavorite')" />
    </div>

    <template v-else>
      <NSpace justify="space-between" align="center" class="favorite-detail-panel__action-bar">
        <NButton
          v-if="showBack"
          quaternary
          @click="$emit('back')"
        >
          <template #icon>
            <NIcon><ArrowLeft /></NIcon>
          </template>
          {{ t('favorites.manager.preview.backToList') }}
        </NButton>
        <div v-else />

        <NSpace :size="8" align="center" wrap>
          <NButton
            type="primary"
            @click="$emit('use', favorite)"
          >
            <template #icon>
              <NIcon><PlayerPlay /></NIcon>
            </template>
            {{ t('favorites.manager.card.useNow') }}
          </NButton>
          <NButton
            secondary
            @click="$emit('copy', favorite)"
          >
            <template #icon>
              <NIcon><Copy /></NIcon>
            </template>
            {{ t('favorites.manager.card.copyContent') }}
          </NButton>
          <NButton
            quaternary
            @click="$emit('fullscreen', favorite)"
          >
            <template #icon>
              <NIcon><Maximize /></NIcon>
            </template>
            {{ t('common.fullscreen') }}
          </NButton>
          <NButton
            quaternary
            @click="$emit('edit', favorite)"
          >
            <template #icon>
              <NIcon><Edit /></NIcon>
            </template>
            {{ t('favorites.manager.card.edit') }}
          </NButton>
          <NButton
            quaternary
            type="error"
            @click="$emit('delete', favorite)"
          >
            <template #icon>
              <NIcon><Trash /></NIcon>
            </template>
            {{ t('favorites.manager.card.delete') }}
          </NButton>
        </NSpace>
      </NSpace>

      <div
        class="favorite-detail-panel__layout"
        :class="detailVariant === 'image' ? 'favorite-detail-panel__layout--image' : 'favorite-detail-panel__layout--text'"
        data-testid="favorite-detail-panel"
        :data-variant="detailVariant"
      >
        <template v-if="detailVariant === 'image'">
          <div class="favorite-detail-panel__hero-layout">
            <NCard
              size="small"
              :segmented="{ content: true }"
              class="favorite-detail-panel__media-card"
            >
              <NSpace vertical :size="12">
                <AppPreviewImageGroup v-if="activeImage">
                  <AppPreviewImage
                    data-testid="favorite-detail-media-hero"
                    :src="activeImage"
                    :alt="favorite.title"
                    object-fit="cover"
                    class="favorite-detail-panel__hero-image"
                  />
                </AppPreviewImageGroup>

                <div
                  v-if="displayImages.length > 1"
                  class="favorite-detail-panel__thumb-grid"
                >
                  <button
                    v-for="(src, index) in displayImages"
                    :key="`${index}-${src.slice(0, 32)}`"
                    type="button"
                    class="favorite-detail-panel__thumb"
                    :class="{ 'is-active': index === activeImageIndex }"
                    @click="activeImageIndex = index"
                  >
                    <AppPreviewImage
                      :src="src"
                      :alt="t('favorites.manager.preview.media.imageAlt', { index: index + 1 })"
                      width="88"
                      object-fit="cover"
                      preview-disabled
                    />
                  </button>
                </div>
              </NSpace>
            </NCard>

            <NCard
              size="small"
              :segmented="{ content: true }"
              class="favorite-detail-panel__meta-card"
            >
              <NSpace vertical :size="12">
                <div class="favorite-detail-panel__title-block">
                  <NText strong class="favorite-detail-panel__title">
                    {{ favorite.title }}
                  </NText>
                  <NText depth="3">
                    {{ t('favorites.manager.preview.updatedAt', { time: formatDate(favorite.updatedAt) }) }}
                    ·
                    {{ t('favorites.manager.preview.useCountInline', { count: favorite.useCount }) }}
                  </NText>
                </div>

                <NSpace :size="8" wrap>
                  <NTag
                    v-if="category"
                    :color="category.color ? { color: category.color, textColor: 'white' } : undefined"
                    :bordered="false"
                  >
                    {{ category.name }}
                  </NTag>
                  <NTag :bordered="false" :type="getFunctionModeTagType(getNormalizedFunctionMode(favorite))">
                    {{ getFunctionModeLabel(favorite) }}
                  </NTag>
                  <NTag
                    v-if="subModeLabel"
                    :bordered="false"
                    :type="getSubModeTagType(favorite)"
                  >
                    {{ subModeLabel }}
                  </NTag>
                  <NTag
                    v-for="tag in favorite.tags"
                    :key="tag"
                    :bordered="false"
                    type="info"
                  >
                    {{ tag }}
                  </NTag>
                </NSpace>

                <NText v-if="favorite.description" depth="3" class="favorite-detail-panel__description">
                  {{ favorite.description }}
                </NText>

                <NEllipsis
                  :line-clamp="4"
                  :tooltip="false"
                >
                  <NText depth="2">
                    {{ favorite.content }}
                  </NText>
                </NEllipsis>
              </NSpace>
            </NCard>
          </div>

          <NCollapse :default-expanded-names="imageExpandedSectionNames" class="favorite-detail-panel__sections">
            <NCollapseItem name="content" :title="t('favorites.manager.preview.contentTitle')">
              <div class="favorite-detail-panel__content-shell favorite-detail-panel__content-shell--compact">
                <OutputDisplayCore
                  :content="favorite.content"
                  :original-content="originalContent"
                  mode="readonly"
                  :enabled-actions="contentEnabledActions"
                  height="100%"
                />
              </div>
            </NCollapseItem>
            <NCollapseItem
              v-if="reproducibility.hasData"
              name="reproducibility"
              :title="t('favorites.manager.preview.reproducibility.title')"
            >
              <FavoriteReproducibilityDisplay :reproducibility="reproducibility" />
            </NCollapseItem>
            <NCollapseItem name="extra" :title="t('favorites.manager.preview.extraTitle')">
              <FavoritePreviewExtensionHost
                :favorite="favorite"
                @favorite-updated="handleFavoriteUpdated"
              />
            </NCollapseItem>
          </NCollapse>
        </template>

        <template v-else>
          <NCard
            size="small"
            :segmented="{ content: true }"
            class="favorite-detail-panel__meta-card"
          >
            <NSpace vertical :size="12">
              <div class="favorite-detail-panel__title-block">
                <NText strong class="favorite-detail-panel__title">
                  {{ favorite.title }}
                </NText>
                <NText depth="3">
                  {{ t('favorites.manager.preview.updatedAt', { time: formatDate(favorite.updatedAt) }) }}
                  ·
                  {{ t('favorites.manager.preview.useCountInline', { count: favorite.useCount }) }}
                </NText>
              </div>

              <NSpace :size="8" wrap>
                <NTag
                  v-if="category"
                  :color="category.color ? { color: category.color, textColor: 'white' } : undefined"
                  :bordered="false"
                >
                  {{ category.name }}
                </NTag>
                <NTag :bordered="false" :type="getFunctionModeTagType(getNormalizedFunctionMode(favorite))">
                  {{ getFunctionModeLabel(favorite) }}
                </NTag>
                <NTag
                  v-if="subModeLabel"
                  :bordered="false"
                  :type="getSubModeTagType(favorite)"
                >
                  {{ subModeLabel }}
                </NTag>
                <NTag
                  v-for="tag in favorite.tags"
                  :key="tag"
                  :bordered="false"
                  type="info"
                >
                  {{ tag }}
                </NTag>
              </NSpace>

              <NText v-if="favorite.description" depth="3" class="favorite-detail-panel__description">
                {{ favorite.description }}
              </NText>
            </NSpace>
          </NCard>

          <NCard
            size="small"
            :title="t('favorites.manager.preview.contentTitle')"
            :segmented="{ content: true }"
            class="favorite-detail-panel__content-card"
          >
            <div class="favorite-detail-panel__content-shell">
              <OutputDisplayCore
                :content="favorite.content"
                :original-content="originalContent"
                mode="readonly"
                :enabled-actions="contentEnabledActions"
                height="100%"
              />
            </div>
          </NCard>

          <NCollapse :default-expanded-names="textExpandedSectionNames" class="favorite-detail-panel__sections">
            <NCollapseItem
              v-if="displayImages.length > 0"
              name="media"
              :title="t('favorites.manager.preview.media.title')"
            >
              <AppPreviewImageGroup>
                <div class="favorite-detail-panel__attachment-grid">
                  <AppPreviewImage
                    v-for="(src, index) in displayImages"
                    :key="`${index}-${src.slice(0, 32)}`"
                    :src="src"
                    :alt="t('favorites.manager.preview.media.imageAlt', { index: index + 1 })"
                    width="120"
                    object-fit="cover"
                  />
                </div>
              </AppPreviewImageGroup>
            </NCollapseItem>
            <NCollapseItem
              v-if="reproducibility.hasData"
              name="reproducibility"
              :title="t('favorites.manager.preview.reproducibility.title')"
            >
              <FavoriteReproducibilityDisplay :reproducibility="reproducibility" />
            </NCollapseItem>
            <NCollapseItem name="extra" :title="t('favorites.manager.preview.extraTitle')">
              <FavoritePreviewExtensionHost
                :favorite="favorite"
                @favorite-updated="handleFavoriteUpdated"
              />
            </NCollapseItem>
          </NCollapse>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'

import {
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NEllipsis,
  NIcon,
  NSpace,
  NTag,
  NText,
} from 'naive-ui'
import {
  ArrowLeft,
  Copy,
  Edit,
  Maximize,
  PlayerPlay,
  Trash,
} from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import type { AppServices } from '../types/services'
import { parseFavoriteMediaMetadata } from '../utils/favorite-media'
import { normalizeFavoriteFunctionMode } from '../utils/favorite-mode'
import { parseFavoriteReproducibility } from '../utils/favorite-reproducibility'
import { resolveAssetIdToDataUrl } from '../utils/image-asset-storage'
import OutputDisplayCore from './OutputDisplayCore.vue'
import FavoritePreviewExtensionHost from './FavoritePreviewExtensionHost.vue'
import FavoriteReproducibilityDisplay from './FavoriteReproducibilityDisplay.vue'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

const props = withDefaults(defineProps<{
  favorite: FavoritePrompt | null
  category?: FavoriteCategory
  showBack?: boolean
}>(), {
  category: undefined,
  showBack: false,
})

const emit = defineEmits<{
  'back': []
  'use': [favorite: FavoritePrompt]
  'copy': [favorite: FavoritePrompt]
  'edit': [favorite: FavoritePrompt]
  'delete': [favorite: FavoritePrompt]
  'fullscreen': [favorite: FavoritePrompt]
  'favorite-updated': [favoriteId: string]
}>()

const { t } = useI18n()
const services = inject<Ref<AppServices | null> | null>('services', null)

const assetDataUrlCache = new Map<string, string>()
const displayImages = ref<string[]>([])
const activeImageIndex = ref(0)
let resolveSequence = 0

const detailVariant = computed(() => (displayImages.value.length > 0 ? 'image' : 'text'))
const activeImage = computed(() => displayImages.value[activeImageIndex.value] || '')
const reproducibility = computed(() => parseFavoriteReproducibility(props.favorite))
const imageExpandedSectionNames = computed(() =>
  reproducibility.value.hasData ? ['content', 'reproducibility'] : ['content'],
)
const textExpandedSectionNames = computed(() => {
  const names: string[] = []
  if (displayImages.value.length > 0) names.push('media')
  if (reproducibility.value.hasData) names.push('reproducibility')
  return names
})
const originalContent = computed(() => {
  if (!props.favorite) return ''

  const legacyOriginal = (props.favorite as unknown as Record<string, unknown>).originalContent
  if (typeof legacyOriginal === 'string' && legacyOriginal.trim().length > 0) {
    return legacyOriginal
  }

  return props.favorite.metadata?.originalContent ?? ''
})
const contentEnabledActions = computed(() =>
  originalContent.value.trim().length > 0 ? ['diff'] as ('diff')[] : []
)

const subModeLabel = computed(() => {
  if (!props.favorite) return ''

  if (props.favorite.optimizationMode) {
    const isContextMode = normalizeFavoriteFunctionMode(props.favorite.functionMode) === 'context'
    if (isContextMode) {
      return props.favorite.optimizationMode === 'system'
        ? t('contextMode.optimizationMode.message')
        : t('contextMode.optimizationMode.variable')
    }

    return t(`favorites.manager.card.optimizationMode.${props.favorite.optimizationMode}`)
  }

  if (props.favorite.imageSubMode) {
    return t(`favorites.manager.card.imageSubMode.${props.favorite.imageSubMode}`)
  }

  return ''
})

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

const resolveAssetIdsToDataUrls = async (assetIds: string[]): Promise<string[]> => {
  const storageCandidates = getReadStorageCandidates()
  if (storageCandidates.length === 0 || assetIds.length === 0) return []

  const resolved: string[] = []
  for (const assetId of assetIds) {
    if (!assetId) continue

    if (assetDataUrlCache.has(assetId)) {
      resolved.push(assetDataUrlCache.get(assetId) as string)
      continue
    }

    for (const storageService of storageCandidates) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(assetId, storageService)
        if (dataUrl) {
          assetDataUrlCache.set(assetId, dataUrl)
          resolved.push(dataUrl)
          break
        }
      } catch (error) {
        console.warn('[FavoriteDetailPanel] Failed to resolve asset id:', assetId, error)
      }
    }
  }

  return resolved
}

const refreshDisplayImages = async () => {
  const currentSequence = ++resolveSequence
  const favorite = props.favorite
  if (!favorite) {
    displayImages.value = []
    activeImageIndex.value = 0
    return
  }

  const media = parseFavoriteMediaMetadata(favorite)
  if (!media) {
    displayImages.value = []
    activeImageIndex.value = 0
    return
  }

  const images: string[] = []

  if (media.coverUrl) {
    images.push(media.coverUrl)
  }

  if (media.coverAssetId) {
    const resolvedCover = await resolveAssetIdsToDataUrls([media.coverAssetId])
    images.push(...resolvedCover)
  }

  const resolvedAssets = await resolveAssetIdsToDataUrls(media.assetIds)
  images.push(...resolvedAssets)
  images.push(...media.urls)

  if (currentSequence !== resolveSequence) return

  displayImages.value = Array.from(new Set(images.filter(Boolean)))
  activeImageIndex.value = 0
}

watch(
  () => props.favorite,
  () => {
    void refreshDisplayImages()
  },
  { immediate: true },
)

watch(
  () => [services?.value?.favoriteImageStorageService, services?.value?.imageStorageService],
  () => {
    void refreshDisplayImages()
  },
)

const getFunctionModeTagType = (mode: string): 'default' | 'info' | 'success' => {
  const typeMap: Record<string, 'default' | 'info' | 'success'> = {
    basic: 'default',
    context: 'info',
    image: 'success',
  }
  return typeMap[mode] || 'default'
}

const getNormalizedFunctionMode = (favorite: FavoritePrompt) =>
  normalizeFavoriteFunctionMode(favorite.functionMode)

const getFunctionModeLabel = (favorite: FavoritePrompt) =>
  t(`favorites.manager.card.functionMode.${getNormalizedFunctionMode(favorite)}`)

const getSubModeTagType = (favorite: FavoritePrompt): 'default' | 'warning' | 'success' => {
  if (favorite.imageSubMode) return 'success'
  if (favorite.optimizationMode === 'user') return 'warning'
  return 'default'
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? t('favorites.manager.time.justNow') : t('favorites.manager.time.minutesAgo', { minutes })
    }
    return t('favorites.manager.time.hoursAgo', { hours })
  }

  if (days === 1) return t('favorites.manager.time.yesterday')
  if (days < 7) return t('favorites.manager.time.daysAgo', { days })
  return date.toLocaleDateString()
}

const handleFavoriteUpdated = (favoriteId: string) => {
  emit('favorite-updated', favoriteId)
}
</script>

<style scoped>
.favorite-detail-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
}

.favorite-detail-panel__empty {
  display: flex;
  flex: 1;
  min-height: 320px;
  align-items: center;
  justify-content: center;
}

.favorite-detail-panel__action-bar {
  flex: 0 0 auto;
  position: sticky;
  z-index: 1;
  top: 0;
  background: var(--n-color, #fff);
}

.favorite-detail-panel__layout {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.favorite-detail-panel__hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 16px;
}

.favorite-detail-panel__media-card,
.favorite-detail-panel__meta-card,
.favorite-detail-panel__content-card {
  min-height: 0;
}

.favorite-detail-panel__hero-image {
  display: block;
  width: 100%;
  min-height: 260px;
  max-height: 420px;
}

.favorite-detail-panel__thumb-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.favorite-detail-panel__thumb {
  overflow: hidden;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 0;
}

.favorite-detail-panel__thumb.is-active {
  border-color: var(--n-primary-color);
}

.favorite-detail-panel__title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.favorite-detail-panel__title {
  font-size: 20px;
  line-height: 1.4;
}

.favorite-detail-panel__description {
  display: block;
}

.favorite-detail-panel__content-shell {
  overflow: hidden;
  min-height: 320px;
}

.favorite-detail-panel__content-shell--compact {
  min-height: 280px;
}

.favorite-detail-panel__attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.favorite-detail-panel__sections {
  min-height: 0;
}

@media (max-width: 1023px) {
  .favorite-detail-panel__hero-layout {
    grid-template-columns: 1fr;
  }
}
</style>
