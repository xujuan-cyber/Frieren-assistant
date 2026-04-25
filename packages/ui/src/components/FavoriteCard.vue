<template>
  <NCard
    hoverable
    class="favorite-card"
    :class="{ 'is-selected': isSelected }"
    :header-style="{ padding: '12px 16px' }"
    :content-style="{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }"
    :footer-style="{ padding: '12px 16px' }"
    @click="$emit('select', favorite)"
  >
    <template #header>
      <div class="favorite-card__header">
        <NEllipsis class="favorite-card__title">
          {{ favorite.title }}
        </NEllipsis>

        <NTag
          v-if="category"
          :color="category.color ? { color: category.color, textColor: 'white' } : undefined"
          size="small"
          :bordered="false"
          class="favorite-card__category"
        >
          <NEllipsis class="favorite-card__category-text">
            {{ category.name }}
          </NEllipsis>
        </NTag>
      </div>
    </template>

    <template #cover>
      <div class="favorite-card__cover" data-testid="favorite-card-cover">
        <AppPreviewImage
          v-if="coverImageSrc"
          :src="coverImageSrc"
          :alt="favorite.title"
          object-fit="cover"
          class="favorite-card__cover-image"
          preview-disabled
        />

        <div
          v-else
          class="favorite-card__cover-placeholder"
          data-testid="favorite-card-cover-placeholder"
        >
          <NThing>
            <template #header>
              <NTag
                :type="getFunctionModeTagType(favorite.functionMode)"
                size="small"
                :bordered="false"
              >
                {{ t(`favorites.manager.card.functionMode.${favorite.functionMode}`) }}
              </NTag>
            </template>

            <NText depth="3" class="favorite-card__cover-summary">
              {{ coverSummary }}
            </NText>
          </NThing>
        </div>
      </div>
    </template>

    <div class="favorite-card__body">
      <NSpace :size="6" :wrap="false" align="center" class="favorite-card__mode-row">
        <NTag
          :type="getFunctionModeTagType(favorite.functionMode)"
          size="small"
          :bordered="false"
        >
          {{ t(`favorites.manager.card.functionMode.${favorite.functionMode}`) }}
        </NTag>

        <NTag
          v-if="subModeLabel"
          :type="getSubModeTagType(favorite)"
          size="small"
          :bordered="false"
        >
          {{ subModeLabel }}
        </NTag>
      </NSpace>

      <NEllipsis
        :line-clamp="3"
        :tooltip="false"
        class="favorite-card__summary"
      >
        <NText depth="2">
          {{ summaryText }}
        </NText>
      </NEllipsis>

      <div class="favorite-card__tag-row">
        <NSpace v-if="displayedTags.length > 0" :size="6" :wrap="false">
          <NTag
            v-for="tag in displayedTags"
            :key="tag"
            size="small"
            type="info"
            :bordered="false"
          >
            {{ tag }}
          </NTag>
          <NTag
            v-if="hiddenTagCount > 0"
            size="small"
            :bordered="false"
          >
            +{{ hiddenTagCount }}
          </NTag>
        </NSpace>
      </div>
    </div>

    <template #footer>
      <div class="favorite-card__footer">
        <NText depth="3" class="favorite-card__meta">
          {{ metaText }}
        </NText>

        <NSpace :size="8" align="center" :wrap="false" class="favorite-card__actions">
          <NButton
            size="small"
            type="primary"
            data-testid="favorite-card-use-button"
            @click.stop="$emit('use', favorite)"
          >
            <template #icon>
              <NIcon><PlayerPlay /></NIcon>
            </template>
            {{ t('favorites.manager.card.useNow') }}
          </NButton>

          <NButton
            size="small"
            secondary
            data-testid="favorite-card-copy-button"
            @click.stop="$emit('copy', favorite)"
          >
            <template #icon>
              <NIcon><Copy /></NIcon>
            </template>
            {{ t('favorites.manager.card.copyContent') }}
          </NButton>

          <NDropdown
            trigger="click"
            :options="menuOptions"
            @select="handleMenuSelect"
          >
            <NButton
              size="small"
              quaternary
              circle
              data-testid="favorite-card-menu-button"
              @click.stop
            >
              <template #icon>
                <NIcon><DotsVertical /></NIcon>
              </template>
            </NButton>
          </NDropdown>
        </NSpace>
      </div>
    </template>
  </NCard>
</template>

<script setup lang="ts">
import { computed, h, inject, ref, watch, type Ref } from 'vue'

import {
  NButton,
  NCard,
  NDropdown,
  NEllipsis,
  NIcon,
  NSpace,
  NTag,
  NText,
  NThing,
} from 'naive-ui'
import { Copy, DotsVertical, Edit, PlayerPlay, Trash } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import type { AppServices } from '../types/services'
import { resolveAssetIdToDataUrl } from '../utils/image-asset-storage'
import { parseFavoriteMediaMetadata } from '../utils/favorite-media'
import AppPreviewImage from './media/AppPreviewImage.vue'

const { t } = useI18n()

const services = inject<Ref<AppServices | null> | null>('services', null)

interface Props {
  favorite: FavoritePrompt
  category?: FavoriteCategory
  isSelected?: boolean
  cardHeight?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [favorite: FavoritePrompt]
  'edit': [favorite: FavoritePrompt]
  'copy': [favorite: FavoritePrompt]
  'delete': [favorite: FavoritePrompt]
  'use': [favorite: FavoritePrompt]
}>()

const coverImageSrc = ref<string | null>(null)

const displayedTags = computed(() => props.favorite.tags.slice(0, 2))
const hiddenTagCount = computed(() => Math.max(0, props.favorite.tags.length - displayedTags.value.length))

const summaryText = computed(() =>
  props.favorite.description?.trim()
  || props.favorite.content.trim()
)

const coverSummary = computed(() => summaryText.value)

const metaText = computed(() =>
  `${formatDate(props.favorite.updatedAt)} · ${t('favorites.manager.preview.useCountInline', { count: props.favorite.useCount })}`
)

const subModeLabel = computed(() => getSubModeLabel(props.favorite))

const menuOptions = computed(() => [
  {
    label: t('favorites.manager.card.edit'),
    key: 'edit',
    icon: () => h(NIcon, null, { default: () => h(Edit) }),
  },
  {
    label: t('favorites.manager.card.delete'),
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(Trash) }),
  },
])

const handleMenuSelect = (key: string) => {
  if (key === 'edit') {
    emit('edit', props.favorite)
    return
  }

  if (key === 'delete') {
    emit('delete', props.favorite)
  }
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

const resolveCoverImage = async () => {
  const media = parseFavoriteMediaMetadata(props.favorite)
  if (!media) {
    coverImageSrc.value = null
    return
  }

  const storageCandidates = getReadStorageCandidates()
  if (storageCandidates.length === 0) {
    coverImageSrc.value = media.coverUrl || null
    return
  }

  if (media.coverAssetId) {
    for (const storageService of storageCandidates) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(media.coverAssetId, storageService)
        if (dataUrl) {
          coverImageSrc.value = dataUrl
          return
        }
      } catch (error) {
        console.warn('[FavoriteCard] Failed to resolve cover asset id:', media.coverAssetId, error)
      }
    }
  }

  coverImageSrc.value = media.coverUrl || null
}

watch(
  () => props.favorite,
  () => {
    void resolveCoverImage()
  },
  { immediate: true },
)

watch(
  () => [services?.value?.favoriteImageStorageService, services?.value?.imageStorageService],
  () => {
    void resolveCoverImage()
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

const getSubModeTagType = (favorite: FavoritePrompt): 'warning' | 'error' | 'success' | 'info' | 'default' => {
  if (favorite.optimizationMode) {
    return favorite.optimizationMode === 'system' ? 'warning' : 'error'
  }
  if (favorite.imageSubMode) {
    return favorite.imageSubMode === 'text2image' ? 'success' : 'info'
  }
  return 'default'
}

const getSubModeLabel = (favorite: FavoritePrompt): string => {
  if (favorite.optimizationMode) {
    const isContextMode = favorite.functionMode === 'context'
    if (isContextMode) {
      return favorite.optimizationMode === 'system'
        ? t('contextMode.optimizationMode.message')
        : t('contextMode.optimizationMode.variable')
    }
    return t(`favorites.manager.card.optimizationMode.${favorite.optimizationMode}`)
  }
  if (favorite.imageSubMode) {
    return t(`favorites.manager.card.imageSubMode.${favorite.imageSubMode}`)
  }
  return ''
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

  if (days === 1) {
    return t('favorites.manager.time.yesterday')
  }

  if (days < 7) {
    return t('favorites.manager.time.daysAgo', { days })
  }

  return date.toLocaleDateString()
}
</script>

<style scoped>
.favorite-card {
  height: 100%;
  cursor: pointer;
}

.favorite-card.is-selected {
  box-shadow: inset 0 0 0 1px rgba(var(--primary-color), 0.85);
}

.favorite-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  overflow: hidden;
}

.favorite-card__title {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.favorite-card__category {
  max-width: 112px;
  flex-shrink: 0;
}

.favorite-card__category-text {
  max-width: 88px;
}

.favorite-card__cover {
  min-height: 168px;
  background: color-mix(in srgb, var(--n-color-embedded) 84%, transparent);
}

.favorite-card__cover :deep(.n-card-cover) {
  margin: 0;
}

.favorite-card__cover-image {
  display: block;
  width: 100%;
  height: 168px;
}

.favorite-card__cover-placeholder {
  display: flex;
  min-height: 168px;
  padding: 16px;
  align-items: flex-end;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--n-color-embedded) 88%, white 12%), var(--n-color)),
    linear-gradient(180deg, transparent, color-mix(in srgb, var(--n-color-embedded) 86%, black 14%));
}

.favorite-card__cover-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  word-break: break-word;
  white-space: pre-wrap;
}

.favorite-card__body {
  display: flex;
  min-height: 108px;
  flex-direction: column;
  gap: 10px;
}

.favorite-card__mode-row {
  min-height: 28px;
}

.favorite-card__summary {
  min-height: 60px;
  line-height: 1.55;
}

.favorite-card__tag-row {
  min-height: 24px;
  overflow: hidden;
}

.favorite-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.favorite-card__meta {
  min-width: 0;
  font-size: 12px;
}

.favorite-card__actions {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .favorite-card__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .favorite-card__actions {
    justify-content: flex-end;
  }
}
</style>
