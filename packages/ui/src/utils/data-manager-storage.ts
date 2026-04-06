import type { DataAPI, DataStorageInfo } from '../types/electron'
import type { AppServices } from '../types/services'

export type StorageBreakdownItemKey =
  | 'appMainData'
  | 'imageCache'
  | 'favoriteImages'
  | 'backupData'

export interface StorageBreakdownItem {
  key: StorageBreakdownItemKey
  bytes: number | null
  estimated: boolean
}

export interface StorageBreakdownSummary {
  totalBytes: number
  items: StorageBreakdownItem[]
  desktopInfo: DataStorageInfo | null
}

interface ResolveStorageBreakdownOptions {
  services: Pick<
    AppServices,
    | 'modelManager'
    | 'templateManager'
    | 'historyManager'
    | 'contextRepo'
    | 'preferenceService'
    | 'imageStorageService'
    | 'favoriteImageStorageService'
  >
  includeBackupData: boolean
  electronDataApi?: Pick<DataAPI, 'getStorageInfo'> | null
}

const textEncoder = new TextEncoder()

export function estimateJsonBytes(value: unknown): number {
  const serialized = JSON.stringify(value)
  if (typeof serialized !== 'string') {
    return 0
  }
  return textEncoder.encode(serialized).byteLength
}

async function estimateAppMainDataBytes(
  services: ResolveStorageBreakdownOptions['services'],
): Promise<number> {
  const [models, templates, history, contexts, preferences] = await Promise.all([
    services.modelManager.exportData(),
    services.templateManager.exportData(),
    services.historyManager.exportData(),
    services.contextRepo.exportData(),
    services.preferenceService.exportData(),
  ])

  return (
    estimateJsonBytes(models) +
    estimateJsonBytes(templates) +
    estimateJsonBytes(history) +
    estimateJsonBytes(contexts) +
    estimateJsonBytes(preferences)
  )
}

async function getImageStorageBytes(
  storageService?: AppServices['imageStorageService'],
): Promise<number | null> {
  if (!storageService) {
    return null
  }

  const stats = await storageService.getStorageStats()
  return typeof stats.totalBytes === 'number' ? stats.totalBytes : null
}

export async function resolveDataManagerStorageBreakdown(
  options: ResolveStorageBreakdownOptions,
): Promise<StorageBreakdownSummary> {
  const {
    services,
    includeBackupData,
    electronDataApi = null,
  } = options

  const [appMainDataResult, imageCacheResult, favoriteImagesResult, desktopInfoResult] =
    await Promise.allSettled([
      estimateAppMainDataBytes(services),
      getImageStorageBytes(services.imageStorageService),
      getImageStorageBytes(services.favoriteImageStorageService),
      includeBackupData && electronDataApi?.getStorageInfo
        ? electronDataApi.getStorageInfo()
        : Promise.resolve(null),
    ])

  const desktopInfo =
    desktopInfoResult.status === 'fulfilled' ? desktopInfoResult.value : null

  const items: StorageBreakdownItem[] = [
    {
      key: 'appMainData',
      bytes: appMainDataResult.status === 'fulfilled' ? appMainDataResult.value : null,
      estimated: true,
    },
    {
      key: 'imageCache',
      bytes: imageCacheResult.status === 'fulfilled' ? imageCacheResult.value : null,
      estimated: false,
    },
    {
      key: 'favoriteImages',
      bytes: favoriteImagesResult.status === 'fulfilled' ? favoriteImagesResult.value : null,
      estimated: false,
    },
  ]

  if (includeBackupData) {
    items.push({
      key: 'backupData',
      bytes: desktopInfo?.backupSizeBytes ?? null,
      estimated: false,
    })
  }

  const totalBytes = items.reduce((sum, item) => sum + (item.bytes ?? 0), 0)

  return {
    totalBytes,
    items,
    desktopInfo,
  }
}
