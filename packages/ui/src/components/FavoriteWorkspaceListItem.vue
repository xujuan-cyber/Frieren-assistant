<template>
  <button
    type="button"
    class="favorite-workspace-list-item"
    :class="{ 'is-selected': isSelected }"
    @click="$emit('select', favorite)"
  >
    <div class="favorite-workspace-list-item__media">
      <AppPreviewImage
        v-if="coverImageSrc"
        :src="coverImageSrc"
        :alt="favorite.title"
        object-fit="cover"
        preview-disabled
        class="favorite-workspace-list-item__image"
      />
      <div v-else class="favorite-workspace-list-item__placeholder">
        <NText depth="3">{{ modeLabel }}</NText>
      </div>
    </div>

    <div class="favorite-workspace-list-item__content">
      <div class="favorite-workspace-list-item__header">
        <NThing>
          <template #header>
            <NEllipsis class="favorite-workspace-list-item__title">
              {{ favorite.title }}
            </NEllipsis>
          </template>
          <template #description>
            <NEllipsis :line-clamp="2" :tooltip="false">
              {{ summaryText }}
            </NEllipsis>
          </template>
        </NThing>

        <NDropdown trigger="click" :options="menuOptions" @select="handleMenuSelect">
          <NButton quaternary circle size="small" @click.stop>
            <template #icon>
              <NIcon><DotsVertical /></NIcon>
            </template>
          </NButton>
        </NDropdown>
      </div>

      <NSpace :size="6" align="center" wrap>
        <NTag
          v-if="category"
          size="small"
          :bordered="false"
          :color="category.color ? { color: category.color, textColor: 'white' } : undefined"
        >
          {{ category.name }}
        </NTag>
        <NTag size="small" :bordered="false" :type="getFunctionModeTagType(favorite.functionMode)">
          {{ modeLabel }}
        </NTag>
        <NTag v-if="subModeLabel" size="small" :bordered="false" :type="getSubModeTagType(favorite)">
          {{ subModeLabel }}
        </NTag>
      </NSpace>

      <NSpace v-if="displayedTags.length > 0" :size="6" align="center" wrap class="favorite-workspace-list-item__tags">
        <NTag
          v-for="tag in displayedTags"
          :key="tag"
          size="small"
          type="info"
          :bordered="false"
        >
          {{ tag }}
        </NTag>
        <NTag v-if="hiddenTagCount > 0" size="small" :bordered="false">
          +{{ hiddenTagCount }}
        </NTag>
      </NSpace>

      <NText depth="3" class="favorite-workspace-list-item__meta">
        {{ metaText }}
      </NText>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, h, inject, ref, watch, type Ref } from 'vue'

import {
  NButton,
  NDropdown,
  NEllipsis,
  NIcon,
  NSpace,
  NTag,
  NText,
  NThing,
} from 'naive-ui'
import { DotsVertical, Edit, Trash } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import type { AppServices } from '../types/services'
import { resolveAssetIdToDataUrl } from '../utils/image-asset-storage'
import { parseFavoriteMediaMetadata } from '../utils/favorite-media'
import AppPreviewImage from './media/AppPreviewImage.vue'

interface Props {
  favorite: FavoritePrompt
  category?: FavoriteCategory
  isSelected?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [favorite: FavoritePrompt]
  'edit': [favorite: FavoritePrompt]
  'delete': [favorite: FavoritePrompt]
}>()

const { t } = useI18n()
const services = inject<Ref<AppServices | null> | null>('services', null)

const coverImageSrc = ref<string | null>(null)
const displayedTags = computed(() => props.favorite.tags.slice(0, 2))
const hiddenTagCount = computed(() => Math.max(0, props.favorite.tags.length - displayedTags.value.length))

const modeLabel = computed(() => t(`favorites.manager.card.functionMode.${props.favorite.functionMode}`))

const subModeLabel = computed(() => {
  if (props.favorite.optimizationMode) {
    const isContextMode = props.favorite.functionMode === 'context'
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

const summaryText = computed(() => {
  const text = [props.favorite.description, props.favorite.content]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text || props.favorite.title
})

const metaText = computed(() =>
  [
    t('favorites.manager.preview.updatedAt', { time: formatDate(props.favorite.updatedAt) }),
    t('favorites.manager.preview.useCountInline', { count: props.favorite.useCount }),
  ].join(' · '),
)

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

const refreshCoverImage = async () => {
  coverImageSrc.value = null
  const media = parseFavoriteMediaMetadata(props.favorite)
  if (!media) return

  if (media.coverUrl) {
    coverImageSrc.value = media.coverUrl
    return
  }

  if (media.coverAssetId) {
    for (const storageService of getReadStorageCandidates()) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(media.coverAssetId, storageService)
        if (dataUrl) {
          coverImageSrc.value = dataUrl
          return
        }
      } catch (error) {
        console.warn('[FavoriteWorkspaceListItem] Failed to resolve cover asset id:', media.coverAssetId, error)
      }
    }
  }

  if (media.urls.length > 0) {
    coverImageSrc.value = media.urls[0]
  }
}

watch(
  () => props.favorite,
  () => {
    void refreshCoverImage()
  },
  { immediate: true, deep: true },
)

const handleMenuSelect = (key: string) => {
  if (key === 'edit') {
    emit('edit', props.favorite)
    return
  }

  if (key === 'delete') {
    emit('delete', props.favorite)
  }
}

const getFunctionModeTagType = (mode: string): 'default' | 'info' | 'success' => {
  const typeMap: Record<string, 'default' | 'info' | 'success'> = {
    basic: 'default',
    context: 'info',
    image: 'success',
  }
  return typeMap[mode] || 'default'
}

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
.favorite-workspace-list-item {
  display: grid;
  width: 100%;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: flex-start;
  border: 1px solid var(--n-border-color);
  border-radius: 14px;
  background: var(--n-card-color);
  padding: 12px;
  text-align: left;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.favorite-workspace-list-item:hover,
.favorite-workspace-list-item.is-selected {
  border-color: var(--n-primary-color);
  background: var(--n-action-color);
}

.favorite-workspace-list-item__media {
  overflow: hidden;
  border-radius: 12px;
  background: var(--n-color-embedded);
}

.favorite-workspace-list-item__image,
.favorite-workspace-list-item__placeholder {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
}

.favorite-workspace-list-item__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.favorite-workspace-list-item__header {
  display: flex;
  min-width: 0;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.favorite-workspace-list-item__title {
  max-width: 100%;
}

.favorite-workspace-list-item__tags {
  min-height: 24px;
}

.favorite-workspace-list-item__meta {
  display: block;
}

@media (max-width: 767px) {
  .favorite-workspace-list-item {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }

  .favorite-workspace-list-item__image,
  .favorite-workspace-list-item__placeholder {
    width: 64px;
    height: 64px;
  }
}
</style>
