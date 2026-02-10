<template>
  <GardenSnapshotPreview
    v-if="snapshot"
    :snapshot="snapshot"
    editable
    :busy="isSaving"
    @upload-cover="handleGardenCoverUpload"
    @append-showcase-images="handleGardenShowcaseUpload"
  />
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FavoritePrompt } from '@prompt-optimizer/core'

import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import { parseFavoriteGardenSnapshotPreview } from '../utils/garden-snapshot-preview'
import GardenSnapshotPreview from './GardenSnapshotPreview.vue'

const props = defineProps<{
  favorite: FavoritePrompt
}>()

const emit = defineEmits<{
  'favorite-updated': [favoriteId: string]
}>()

const { t } = useI18n()
const message = useToast()

const services = inject<Ref<AppServices | null> | null>('services', null)
const isSaving = ref(false)

const snapshot = computed(() => {
  return parseFavoriteGardenSnapshotPreview(props.favorite)
})

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const dedupeStrings = (items: string[]): string[] => {
  return Array.from(new Set(items.filter(Boolean)))
}

const updateGardenSnapshot = async (
  updater: (snapshotRecord: Record<string, unknown>) => void,
) => {
  if (isSaving.value) return

  const favoriteManager = services?.value?.favoriteManager
  if (!favoriteManager) {
    message.warning(t('favorites.manager.messages.unavailable'))
    return
  }

  const metadata = isRecord(props.favorite.metadata) ? { ...props.favorite.metadata } : {}
  const snapshotRecord = isRecord(metadata.gardenSnapshot) ? { ...metadata.gardenSnapshot } : {}

  updater(snapshotRecord)
  metadata.gardenSnapshot = snapshotRecord

  isSaving.value = true
  try {
    await favoriteManager.updateFavorite(props.favorite.id, { metadata })
    message.success(t('favorites.manager.preview.garden.saveSnapshotSuccess'))
    emit('favorite-updated', props.favorite.id)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    message.error(`${t('favorites.manager.preview.garden.saveSnapshotFailed')}: ${errorMessage}`)
  } finally {
    isSaving.value = false
  }
}

const handleGardenCoverUpload = async (coverDataUrl: string) => {
  if (!coverDataUrl) return

  await updateGardenSnapshot((snapshotRecord) => {
    const assets = isRecord(snapshotRecord.assets) ? { ...snapshotRecord.assets } : {}
    const cover = isRecord(assets.cover) ? { ...assets.cover } : {}
    cover.url = coverDataUrl
    assets.cover = cover
    snapshotRecord.assets = assets
  })
}

const handleGardenShowcaseUpload = async (showcaseImages: string[]) => {
  const imageList = dedupeStrings(showcaseImages || [])
  if (imageList.length === 0) return

  await updateGardenSnapshot((snapshotRecord) => {
    const assets = isRecord(snapshotRecord.assets) ? { ...snapshotRecord.assets } : {}
    const showcasesRaw = Array.isArray(assets.showcases) ? [...assets.showcases] : []

    const firstShowcase: Record<string, unknown> = isRecord(showcasesRaw[0])
      ? { ...showcasesRaw[0] }
      : {
          id: `local-showcase-${Date.now()}`,
          images: [] as string[],
        }

    const mergedImages = dedupeStrings([
      ...asStringArray(firstShowcase.images),
      ...imageList,
    ])

    firstShowcase.images = mergedImages
    if (!firstShowcase.url && mergedImages.length > 0) {
      firstShowcase.url = mergedImages[0]
    }

    showcasesRaw[0] = firstShowcase
    assets.showcases = showcasesRaw
    snapshotRecord.assets = assets
  })
}
</script>
