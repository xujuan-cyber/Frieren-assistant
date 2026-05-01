import type {
  FavoritePrompt,
  IFavoriteManager,
  IImageStorageService,
} from '@prompt-optimizer/core'

type FavoriteManagerForGc = Pick<
  IFavoriteManager,
  'getFavorites' | 'getFavorite' | 'updateFavorite' | 'deleteFavorite' | 'deleteFavorites' | 'importFavorites'
> &
  IFavoriteManager

type FavoriteAssetGcResult = {
  deletedIds: string[]
  referencedIds: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const collectStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const collectPromptImageRefs = (
  refs: unknown,
  assetIds: Set<string>,
) => {
  if (!Array.isArray(refs)) return

  refs.forEach((ref) => {
    if (!isRecord(ref)) return
    if (ref.kind !== 'asset') return
    const assetId = typeof ref.assetId === 'string' ? ref.assetId.trim() : ''
    if (assetId) {
      assetIds.add(assetId)
    }
  })
}

const collectPromptAssetImageRefs = (
  promptAsset: unknown,
  assetIds: Set<string>,
) => {
  if (!isRecord(promptAsset)) return

  if (Array.isArray(promptAsset.versions)) {
    promptAsset.versions.forEach((version) => {
      if (!isRecord(version) || !isRecord(version.content)) return
      collectPromptImageRefs(version.content.images, assetIds)
    })
  }

  if (Array.isArray(promptAsset.examples)) {
    promptAsset.examples.forEach((example) => {
      if (!isRecord(example)) return
      const input = isRecord(example.input) ? example.input : null
      const output = isRecord(example.output) ? example.output : null
      collectPromptImageRefs(input?.images, assetIds)
      collectPromptImageRefs(output?.images, assetIds)
    })
  }
}

const collectFavoriteAssetIds = (
  favorite: FavoritePrompt | null | undefined,
): Set<string> => {
  const assetIds = new Set<string>()
  if (!favorite || !isRecord(favorite.metadata)) {
    return assetIds
  }

  const media = isRecord(favorite.metadata.media) ? favorite.metadata.media : null
  if (media) {
    const coverAssetId = typeof media.coverAssetId === 'string' ? media.coverAssetId.trim() : ''
    if (coverAssetId) {
      assetIds.add(coverAssetId)
    }

    collectStringArray(media.assetIds).forEach((id) => assetIds.add(id))
  }

  collectPromptAssetImageRefs(favorite.metadata.promptAsset, assetIds)

  const gardenSnapshot = isRecord(favorite.metadata.gardenSnapshot)
    ? favorite.metadata.gardenSnapshot
    : null

  const collectFromExampleItems = (items: unknown) => {
    if (!Array.isArray(items)) return

    items.forEach((item) => {
      if (!isRecord(item)) return

      collectStringArray(item.imageAssetIds).forEach((id) => assetIds.add(id))
      collectStringArray(item.inputImageAssetIds).forEach((id) => assetIds.add(id))
    })
  }

  if (gardenSnapshot && isRecord(gardenSnapshot.assets)) {
    const cover = isRecord(gardenSnapshot.assets.cover) ? gardenSnapshot.assets.cover : null
    if (cover) {
      const coverAssetId = typeof cover.assetId === 'string' ? cover.assetId.trim() : ''
      if (coverAssetId) {
        assetIds.add(coverAssetId)
      }
    }

    collectFromExampleItems(gardenSnapshot.assets.showcases)
    collectFromExampleItems(gardenSnapshot.assets.examples)
  }

  const reproducibility = isRecord(favorite.metadata.reproducibility)
    ? favorite.metadata.reproducibility
    : null
  if (reproducibility) {
    collectFromExampleItems(reproducibility.examples)
  }

  collectFromExampleItems(favorite.metadata.examples)

  return assetIds
}

const setsAreEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

const safeGetFavorite = async (
  favoriteManager: FavoriteManagerForGc,
  id: string,
): Promise<FavoritePrompt | null> => {
  try {
    return await favoriteManager.getFavorite(id)
  } catch {
    return null
  }
}

export const runFavoriteAssetGc = async (
  favoriteManager: Pick<IFavoriteManager, 'getFavorites'>,
  favoriteImageStorageService: Pick<IImageStorageService, 'listAllMetadata' | 'deleteImages'> | null | undefined,
): Promise<FavoriteAssetGcResult> => {
  if (!favoriteImageStorageService) {
    return {
      deletedIds: [],
      referencedIds: [],
    }
  }

  const favorites = await favoriteManager.getFavorites()
  const referencedIds = new Set<string>()
  favorites.forEach((favorite) => {
    collectFavoriteAssetIds(favorite).forEach((id) => referencedIds.add(id))
  })

  const allMetadata = await favoriteImageStorageService.listAllMetadata()
  const orphanIds = allMetadata
    .map((metadata) => metadata.id)
    .filter((id) => !referencedIds.has(id))

  if (orphanIds.length > 0) {
    await favoriteImageStorageService.deleteImages(orphanIds)
  }

  return {
    deletedIds: orphanIds,
    referencedIds: Array.from(referencedIds),
  }
}

export const attachFavoriteAssetGc = (
  favoriteManager: FavoriteManagerForGc,
  favoriteImageStorageService: Pick<IImageStorageService, 'listAllMetadata' | 'deleteImages'> | null | undefined,
): IFavoriteManager => {
  if (!favoriteImageStorageService) {
    return favoriteManager
  }

  return new Proxy(favoriteManager, {
    get(target, prop, receiver) {
      if (prop === 'deleteFavorite') {
        return async (id: string) => {
          await target.deleteFavorite(id)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
        }
      }

      if (prop === 'deleteFavorites') {
        return async (ids: string[]) => {
          await target.deleteFavorites(ids)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
        }
      }

      if (prop === 'updateFavorite') {
        return async (id: string, updates: Partial<FavoritePrompt>) => {
          const beforeFavorite = await safeGetFavorite(target, id)
          const beforeRefs = collectFavoriteAssetIds(beforeFavorite)

          await target.updateFavorite(id, updates)

          const afterFavorite = await safeGetFavorite(target, id)
          const afterRefs = collectFavoriteAssetIds(afterFavorite)

          if (!setsAreEqual(beforeRefs, afterRefs)) {
            await runFavoriteAssetGc(target, favoriteImageStorageService)
          }
        }
      }

      if (prop === 'importFavorites') {
        return async (...args: Parameters<IFavoriteManager['importFavorites']>) => {
          const result = await target.importFavorites(...args)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
          return result
        }
      }

      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as IFavoriteManager
}
