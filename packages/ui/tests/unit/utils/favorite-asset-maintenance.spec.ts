import { describe, it, expect, vi } from 'vitest'

import {
  attachFavoriteAssetGc,
  runFavoriteAssetGc,
} from '../../../src/utils/favorite-asset-maintenance'

describe('favoriteAssetMaintenance', () => {
  it('deletes orphaned assets from the favorite image store', async () => {
    const favoriteManager = {
      getFavorites: vi.fn(async () => [
        {
          id: 'fav-1',
          metadata: {
            media: {
              coverAssetId: 'cover-1',
              assetIds: ['asset-1'],
            },
            gardenSnapshot: {
              assets: {
                showcases: [{ imageAssetIds: ['gallery-1'] }],
                examples: [{ inputImageAssetIds: ['input-1'] }],
              },
            },
          },
        },
      ]),
    }

    const favoriteImageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'cover-1' },
        { id: 'asset-1' },
        { id: 'gallery-1' },
        { id: 'input-1' },
        { id: 'orphan-1' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    const result = await runFavoriteAssetGc(
      favoriteManager as any,
      favoriteImageStorageService as any,
    )

    expect(favoriteImageStorageService.deleteImages).toHaveBeenCalledWith(['orphan-1'])
    expect(result.deletedIds).toEqual(['orphan-1'])
  })

  it('runs GC after deleting a favorite and keeps assets still referenced by siblings', async () => {
    const favorites = [
      {
        id: 'fav-1',
        metadata: {
          media: {
            assetIds: ['shared-asset', 'soon-orphaned'],
          },
        },
      },
      {
        id: 'fav-2',
        metadata: {
          media: {
            assetIds: ['shared-asset'],
          },
        },
      },
    ]

    const favoriteManager = {
      addFavorite: vi.fn(),
      getFavorites: vi.fn(async () => favorites),
      getFavorite: vi.fn(async (id: string) => favorites.find((favorite) => favorite.id === id) || null),
      updateFavorite: vi.fn(),
      deleteFavorite: vi.fn(async (id: string) => {
        const index = favorites.findIndex((favorite) => favorite.id === id)
        if (index >= 0) {
          favorites.splice(index, 1)
        }
      }),
      deleteFavorites: vi.fn(),
      incrementUseCount: vi.fn(),
      getCategories: vi.fn(),
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      getStats: vi.fn(),
      searchFavorites: vi.fn(),
      exportFavorites: vi.fn(),
      importFavorites: vi.fn(),
      getAllTags: vi.fn(),
      addTag: vi.fn(),
      renameTag: vi.fn(),
      mergeTags: vi.fn(),
      deleteTag: vi.fn(),
      reorderCategories: vi.fn(),
      getCategoryUsage: vi.fn(),
      ensureDefaultCategories: vi.fn(),
    }

    const favoriteImageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'shared-asset' },
        { id: 'soon-orphaned' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    const guardedManager = attachFavoriteAssetGc(
      favoriteManager as any,
      favoriteImageStorageService as any,
    )

    await guardedManager.deleteFavorite('fav-1')

    expect(favoriteManager.deleteFavorite).toHaveBeenCalledWith('fav-1')
    expect(favoriteImageStorageService.deleteImages).toHaveBeenCalledWith(['soon-orphaned'])
  })

  it('runs GC after updating a favorite when image references change', async () => {
    const favorites = [
      {
        id: 'fav-1',
        metadata: {
          media: {
            assetIds: ['old-asset'],
          },
        },
      },
    ]

    const favoriteManager = {
      addFavorite: vi.fn(),
      getFavorites: vi.fn(async () => favorites),
      getFavorite: vi.fn(async (id: string) => favorites.find((favorite) => favorite.id === id) || null),
      updateFavorite: vi.fn(async (id: string, updates: Record<string, unknown>) => {
        const index = favorites.findIndex((favorite) => favorite.id === id)
        if (index >= 0) {
          favorites[index] = {
            ...favorites[index],
            ...updates,
          }
        }
      }),
      deleteFavorite: vi.fn(),
      deleteFavorites: vi.fn(),
      incrementUseCount: vi.fn(),
      getCategories: vi.fn(),
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      getStats: vi.fn(),
      searchFavorites: vi.fn(),
      exportFavorites: vi.fn(),
      importFavorites: vi.fn(),
      getAllTags: vi.fn(),
      addTag: vi.fn(),
      renameTag: vi.fn(),
      mergeTags: vi.fn(),
      deleteTag: vi.fn(),
      reorderCategories: vi.fn(),
      getCategoryUsage: vi.fn(),
      ensureDefaultCategories: vi.fn(),
    }

    const favoriteImageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'old-asset' },
        { id: 'new-asset' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    const guardedManager = attachFavoriteAssetGc(
      favoriteManager as any,
      favoriteImageStorageService as any,
    )

    await guardedManager.updateFavorite('fav-1', {
      metadata: {
        media: {
          assetIds: ['new-asset'],
        },
      },
    } as any)

    expect(favoriteManager.updateFavorite).toHaveBeenCalled()
    expect(favoriteImageStorageService.deleteImages).toHaveBeenCalledWith(['old-asset'])
  })
})
