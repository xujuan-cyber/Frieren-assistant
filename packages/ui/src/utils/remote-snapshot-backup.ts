import type {
  FullImageData,
  IDataManager,
  IFavoriteManager,
  IImageStorageService,
  ImageMetadata,
} from '@prompt-optimizer/core'

import {
  DEFAULT_DATA_MANAGER_PACKAGE_SECTIONS,
  type DataManagerFavoritesMergeStrategy,
  type DataManagerImageStoreKey,
  type DataManagerPackageSection,
  type DataManagerPackageSectionSelection,
} from './data-manager-resource-package'
import { joinRemotePath, type RemoteObjectEntry, type RemoteObjectStore } from './remote-backup'

export const REMOTE_SNAPSHOT_SCHEMA_VERSION = 'prompt-optimizer/remote-snapshot/v1' as const
export const REMOTE_SNAPSHOT_ROOT = 'v1'

const APP_DATA_FILE_NAME = 'app-data.json'
const FAVORITES_FILE_NAME = 'favorites.json'
const MANIFEST_FILE_NAME = 'manifest.json'

export type RemoteSnapshotAsset = {
  kind: 'image'
  store: DataManagerImageStoreKey
  id: string
  path: string
  mimeType: string
  sizeBytes: number
  createdAt: number
  accessedAt?: number
  source: ImageMetadata['source']
  metadata?: ImageMetadata['metadata']
  sha256?: string
}

export type RemoteSnapshotManifest = {
  schemaVersion: typeof REMOTE_SNAPSHOT_SCHEMA_VERSION
  snapshotId: string
  createdAt: string
  appDataPath: string
  favoritesPath: string
  assets: RemoteSnapshotAsset[]
  missingAssets: Array<{ store: DataManagerImageStoreKey; id: string }>
  assetCounts: Record<DataManagerImageStoreKey, number>
  includedSections: DataManagerPackageSection[]
}

export type RemoteSnapshotEntry = {
  id: string
  name: string
  manifestPath: string
  updatedAt?: string
  sizeBytes?: number
  manifest?: RemoteSnapshotManifest
}

export type RemoteSnapshotBackupResult = {
  entry: RemoteSnapshotEntry
  manifest: RemoteSnapshotManifest
  uploadedAssets: number
  skippedAssets: number
  missingAssets: Array<{ store: DataManagerImageStoreKey; id: string }>
}

export type RemoteSnapshotRestoreReport = {
  restored: number
  skipped: number
  missing: Array<{ store: DataManagerImageStoreKey; id: string }>
  corrupt: Array<{ store: DataManagerImageStoreKey; id: string }>
  errors: string[]
  imported: {
    appData: boolean
    favorites: boolean
  }
}

export type RemoteSnapshotCleanupCandidate = {
  path: string
  sizeBytes?: number
  updatedAt?: string
}

export type RemoteSnapshotCleanupAnalysis = {
  candidates: RemoteSnapshotCleanupCandidate[]
  referencedAssetCount: number
  totalCandidateBytes: number
}

export type RemoteSnapshotCleanupResult = RemoteSnapshotCleanupAnalysis & {
  deleted: number
  failed: Array<{ path: string; message: string }>
}

export type RemoteSnapshotProgressPhase =
  | 'prepare'
  | 'scan'
  | 'asset-check'
  | 'asset-upload'
  | 'metadata-upload'
  | 'manifest-upload'
  | 'list'
  | 'restore-validate'
  | 'restore-write'
  | 'cleanup-analyze'
  | 'cleanup-delete'
  | 'done'

export type RemoteSnapshotProgressEvent = {
  phase: RemoteSnapshotProgressPhase
  current?: number
  total?: number
  item?: string
  uploaded?: number
  skipped?: number
  deleted?: number
}

export type RemoteSnapshotProgressReporter = (event: RemoteSnapshotProgressEvent) => void

type ExportRemoteSnapshotOptions = {
  objectStore: RemoteObjectStore
  dataManager: Pick<IDataManager, 'exportAllData'>
  favoriteManager: Pick<IFavoriteManager, 'exportFavorites'> | null | undefined
  imageStorageService?: Pick<IImageStorageService, 'listAllMetadata' | 'getImage'> | null
  favoriteImageStorageService?: Pick<IImageStorageService, 'listAllMetadata' | 'getImage'> | null
  sections?: Partial<DataManagerPackageSectionSelection>
  onProgress?: RemoteSnapshotProgressReporter
}

type RestoreRemoteSnapshotOptions = {
  objectStore: RemoteObjectStore
  snapshotId: string
  dataManager: Pick<IDataManager, 'importAllData'>
  favoriteManager: Pick<IFavoriteManager, 'importFavorites'> | null | undefined
  imageStorageService?: Pick<IImageStorageService, 'getMetadata' | 'saveImage'> | null
  favoriteImageStorageService?: Pick<IImageStorageService, 'getMetadata' | 'saveImage'> | null
  sections?: Partial<DataManagerPackageSectionSelection>
  favoriteMergeStrategy?: DataManagerFavoritesMergeStrategy
  onProgress?: RemoteSnapshotProgressReporter
}

type ImageStoreExportConfig = {
  key: DataManagerImageStoreKey
  service: ExportRemoteSnapshotOptions['imageStorageService']
}

type PreparedImageRestore = {
  store: DataManagerImageStoreKey
  image: FullImageData
}

const EMPTY_APP_DATA_JSON = JSON.stringify({ version: 1, data: {} }, null, 2)
const EMPTY_FAVORITES_JSON = JSON.stringify({ version: '1.0', favorites: [], categories: [], tags: [] }, null, 2)
const ALL_DATA_MANAGER_PACKAGE_SECTIONS = Object.keys(
  DEFAULT_DATA_MANAGER_PACKAGE_SECTIONS,
) as DataManagerPackageSection[]

const resolveSectionSelection = (
  sections?: Partial<DataManagerPackageSectionSelection>,
): DataManagerPackageSectionSelection => ({
  ...DEFAULT_DATA_MANAGER_PACKAGE_SECTIONS,
  ...(sections ?? {}),
})

const getManifestIncludedSectionSet = (
  manifest: RemoteSnapshotManifest,
): Set<DataManagerPackageSection> => {
  const included = Array.isArray(manifest.includedSections)
    ? manifest.includedSections.filter((section): section is DataManagerPackageSection =>
      ALL_DATA_MANAGER_PACKAGE_SECTIONS.includes(section as DataManagerPackageSection),
    )
    : []

  if (included.length > 0) {
    return new Set(included)
  }

  return new Set([
    'appData',
    'favorites',
    ...manifest.assets.map((asset) => asset.store),
  ])
}

const resolveRestoreSectionSelection = (
  manifest: RemoteSnapshotManifest,
  requested?: Partial<DataManagerPackageSectionSelection>,
): DataManagerPackageSectionSelection => {
  const requestedSections = resolveSectionSelection(requested)
  const includedSections = getManifestIncludedSectionSet(manifest)

  return ALL_DATA_MANAGER_PACKAGE_SECTIONS.reduce((selection, section) => {
    selection[section] = requestedSections[section] && includedSections.has(section)
    return selection
  }, {} as DataManagerPackageSectionSelection)
}

const snapshotDirectory = (snapshotId: string): string =>
  joinRemotePath(REMOTE_SNAPSHOT_ROOT, 'snapshots', snapshotId)

const snapshotManifestPath = (snapshotId: string): string =>
  joinRemotePath(snapshotDirectory(snapshotId), MANIFEST_FILE_NAME)

const snapshotAppDataPath = (snapshotId: string): string =>
  joinRemotePath(snapshotDirectory(snapshotId), APP_DATA_FILE_NAME)

const snapshotFavoritesPath = (snapshotId: string): string =>
  joinRemotePath(snapshotDirectory(snapshotId), FAVORITES_FILE_NAME)

export const createRemoteSnapshotId = (date = new Date()): string =>
  date.toISOString().replace(/[:.]/g, '-')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const textEncoder = new TextEncoder()

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const view = new Uint8Array(bytes.byteLength)
  view.set(bytes)
  return view.buffer
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return globalThis.btoa(binary)
}

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const sha256Hex = async (bytes: Uint8Array): Promise<string | undefined> => {
  if (!globalThis.crypto?.subtle) return undefined
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(bytes))
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return undefined
  }
}

const extensionFromMimeType = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase().split(';')[0].trim()
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg'
  if (normalized === 'image/png') return 'png'
  if (normalized === 'image/webp') return 'webp'
  if (normalized === 'image/gif') return 'gif'
  if (normalized === 'image/svg+xml') return 'svg'
  return 'bin'
}

const inferMimeTypeFromBytes = (bytes: Uint8Array): string | null => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif'
  }

  return null
}

const resolveResourceMimeType = (declaredMimeType: string | undefined, bytes: Uint8Array): string =>
  inferMimeTypeFromBytes(bytes) || declaredMimeType || 'application/octet-stream'

const safeAssetFileName = (id: string, mimeType: string): string =>
  `${encodeURIComponent(id)}.${extensionFromMimeType(mimeType)}`

const remoteAssetPath = (
  store: DataManagerImageStoreKey,
  id: string,
  mimeType: string,
): string =>
  joinRemotePath(REMOTE_SNAPSHOT_ROOT, 'assets', store, safeAssetFileName(id, mimeType))

const parseManifest = (json: string): RemoteSnapshotManifest => {
  const parsed = JSON.parse(json) as unknown
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== REMOTE_SNAPSHOT_SCHEMA_VERSION ||
    typeof parsed.snapshotId !== 'string' ||
    typeof parsed.appDataPath !== 'string' ||
    typeof parsed.favoritesPath !== 'string' ||
    !Array.isArray(parsed.assets) ||
    !Array.isArray(parsed.missingAssets)
  ) {
    throw new Error('Invalid remote snapshot manifest')
  }
  return parsed as RemoteSnapshotManifest
}

const validateJsonText = (text: string, label: string): void => {
  try {
    JSON.parse(text)
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${(error as Error).message}`, {
      cause: error,
    })
  }
}

const normalizeImageMetadata = (
  asset: RemoteSnapshotAsset,
  sizeBytes: number,
  mimeType: string,
): ImageMetadata => ({
  id: asset.id,
  mimeType,
  sizeBytes,
  createdAt: typeof asset.createdAt === 'number' ? asset.createdAt : Date.now(),
  accessedAt: Date.now(),
  source: asset.source === 'generated' ? 'generated' : 'uploaded',
  ...(asset.metadata ? { metadata: asset.metadata } : {}),
})

const getImportStorageService = (
  store: DataManagerImageStoreKey,
  options: RestoreRemoteSnapshotOptions,
): Pick<IImageStorageService, 'getMetadata' | 'saveImage'> | null | undefined =>
  store === 'favoriteImages'
    ? options.favoriteImageStorageService
    : options.imageStorageService

const getRemoteObjectEntry = async (
  objectStore: RemoteObjectStore,
  path: string,
): Promise<Pick<RemoteObjectEntry, 'path' | 'sizeBytes'> | null> => {
  if (typeof objectStore.head === 'function') {
    return objectStore.head(path)
  }
  return await objectStore.exists(path) ? { path } : null
}

const remoteObjectMatchesLocalBytes = (
  remoteEntry: Pick<RemoteObjectEntry, 'sizeBytes'> | null,
  localSizeBytes: number,
): boolean => {
  if (!remoteEntry) return false
  if (typeof remoteEntry.sizeBytes !== 'number') return true
  return remoteEntry.sizeBytes === localSizeBytes
}

const collectStoreAssets = async (
  objectStore: RemoteObjectStore,
  config: ImageStoreExportConfig,
  onProgress: RemoteSnapshotProgressReporter | undefined,
): Promise<{
  assets: RemoteSnapshotAsset[]
  missing: Array<{ store: DataManagerImageStoreKey; id: string }>
  uploaded: number
  skipped: number
}> => {
  if (!config.service) {
    return { assets: [], missing: [], uploaded: 0, skipped: 0 }
  }

  const metadataList = await config.service.listAllMetadata()
  onProgress?.({
    phase: 'scan',
    current: 0,
    total: metadataList.length,
    item: config.key,
  })
  const assets: RemoteSnapshotAsset[] = []
  const missing: Array<{ store: DataManagerImageStoreKey; id: string }> = []
  let uploaded = 0
  let skipped = 0

  for (const [index, metadata] of metadataList.entries()) {
    const image: FullImageData | null = await config.service.getImage(metadata.id)
    if (!image?.data) {
      missing.push({ store: config.key, id: metadata.id })
      continue
    }

    const bytes = base64ToBytes(image.data)
    const mimeType = resolveResourceMimeType(image.metadata.mimeType || metadata.mimeType, bytes)
    const path = remoteAssetPath(config.key, metadata.id, mimeType)
    const sha256 = await sha256Hex(bytes)

    onProgress?.({
      phase: 'asset-check',
      current: index + 1,
      total: metadataList.length,
      item: metadata.id,
      uploaded,
      skipped,
    })
    const remoteEntry = await getRemoteObjectEntry(objectStore, path)
    if (remoteObjectMatchesLocalBytes(remoteEntry, bytes.byteLength)) {
      skipped += 1
    } else {
      onProgress?.({
        phase: 'asset-upload',
        current: index + 1,
        total: metadataList.length,
        item: metadata.id,
        uploaded,
        skipped,
      })
      await objectStore.put(path, bytes, { contentType: mimeType })
      uploaded += 1
    }

    assets.push({
      kind: 'image',
      store: config.key,
      id: metadata.id,
      path,
      mimeType,
      sizeBytes: bytes.byteLength,
      createdAt: image.metadata.createdAt || metadata.createdAt || Date.now(),
      accessedAt: image.metadata.accessedAt || metadata.accessedAt,
      source: image.metadata.source || metadata.source || 'uploaded',
      metadata: image.metadata.metadata || metadata.metadata,
      sha256,
    })
  }

  return { assets, missing, uploaded, skipped }
}

export const createRemoteSnapshotBackup = async (
  options: ExportRemoteSnapshotOptions,
): Promise<RemoteSnapshotBackupResult> => {
  const sections = resolveSectionSelection(options.sections)
  const snapshotId = createRemoteSnapshotId()
  options.onProgress?.({ phase: 'prepare' })
  const appDataJson = sections.appData
    ? await options.dataManager.exportAllData()
    : EMPTY_APP_DATA_JSON
  const favoritesJson = sections.favorites && options.favoriteManager
    ? await options.favoriteManager.exportFavorites()
    : EMPTY_FAVORITES_JSON

  validateJsonText(appDataJson, 'app-data.json')
  validateJsonText(favoritesJson, 'favorites.json')

  const storeConfigs: ImageStoreExportConfig[] = [
    {
      key: 'imageCache',
      service: sections.imageCache ? options.imageStorageService : null,
    },
    {
      key: 'favoriteImages',
      service: sections.favoriteImages ? options.favoriteImageStorageService : null,
    },
  ]

  const assets: RemoteSnapshotAsset[] = []
  const missingAssets: Array<{ store: DataManagerImageStoreKey; id: string }> = []
  let uploadedAssets = 0
  let skippedAssets = 0

  for (const config of storeConfigs) {
    const result = await collectStoreAssets(options.objectStore, config, options.onProgress)
    assets.push(...result.assets)
    missingAssets.push(...result.missing)
    uploadedAssets += result.uploaded
    skippedAssets += result.skipped
  }

  const manifest: RemoteSnapshotManifest = {
    schemaVersion: REMOTE_SNAPSHOT_SCHEMA_VERSION,
    snapshotId,
    createdAt: new Date().toISOString(),
    appDataPath: snapshotAppDataPath(snapshotId),
    favoritesPath: snapshotFavoritesPath(snapshotId),
    assets,
    missingAssets,
    assetCounts: {
      imageCache: assets.filter((asset) => asset.store === 'imageCache').length,
      favoriteImages: assets.filter((asset) => asset.store === 'favoriteImages').length,
    },
    includedSections: (Object.keys(sections) as DataManagerPackageSection[])
      .filter((section) => sections[section]),
  }

  options.onProgress?.({ phase: 'metadata-upload', current: 1, total: 2, item: APP_DATA_FILE_NAME })
  await options.objectStore.put(manifest.appDataPath, appDataJson, { contentType: 'application/json' })
  options.onProgress?.({ phase: 'metadata-upload', current: 2, total: 2, item: FAVORITES_FILE_NAME })
  await options.objectStore.put(manifest.favoritesPath, favoritesJson, { contentType: 'application/json' })
  const manifestText = JSON.stringify(manifest, null, 2)
  options.onProgress?.({ phase: 'manifest-upload', item: MANIFEST_FILE_NAME })
  await options.objectStore.put(snapshotManifestPath(snapshotId), manifestText, { contentType: 'application/json' })
  options.onProgress?.({
    phase: 'done',
    uploaded: uploadedAssets,
    skipped: skippedAssets,
  })

  return {
    entry: {
      id: snapshotId,
      name: snapshotId,
      manifestPath: snapshotManifestPath(snapshotId),
      updatedAt: manifest.createdAt,
      sizeBytes: textEncoder.encode(manifestText).byteLength,
      manifest,
    },
    manifest,
    uploadedAssets,
    skippedAssets,
    missingAssets,
  }
}

export const listRemoteSnapshotBackups = async (
  objectStore: RemoteObjectStore,
  onProgress?: RemoteSnapshotProgressReporter,
): Promise<RemoteSnapshotEntry[]> => {
  onProgress?.({ phase: 'list' })
  const entries = await objectStore.list(joinRemotePath(REMOTE_SNAPSHOT_ROOT, 'snapshots'))
  const manifests = entries.filter((entry) => entry.path.endsWith(`/${MANIFEST_FILE_NAME}`))
  const snapshots: RemoteSnapshotEntry[] = []

  for (const entry of manifests) {
    try {
      const manifest = parseManifest(await objectStore.getText(entry.path))
      snapshots.push({
        id: manifest.snapshotId,
        name: manifest.snapshotId,
        manifestPath: entry.path,
        updatedAt: manifest.createdAt || entry.updatedAt,
        sizeBytes: entry.sizeBytes,
        manifest,
      })
    } catch (error) {
      console.warn('[RemoteSnapshotBackup] Ignoring invalid remote snapshot manifest:', error)
    }
  }

  return snapshots.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

const prepareRemoteSnapshotRestore = async (
  manifest: RemoteSnapshotManifest,
  options: RestoreRemoteSnapshotOptions,
): Promise<{
  appDataJson: string | null
  favoritesJson: string | null
  images: PreparedImageRestore[]
  report: RemoteSnapshotRestoreReport
}> => {
  const sections = resolveRestoreSectionSelection(manifest, options.sections)
  const report: RemoteSnapshotRestoreReport = {
    restored: 0,
    skipped: 0,
    missing: [],
    corrupt: [],
    errors: [],
    imported: {
      appData: sections.appData,
      favorites: Boolean(sections.favorites && options.favoriteManager),
    },
  }

  const selectedStores = new Set<DataManagerImageStoreKey>([
    ...(sections.imageCache ? ['imageCache' as const] : []),
    ...(sections.favoriteImages ? ['favoriteImages' as const] : []),
  ])

  const appDataJson = sections.appData
    ? await options.objectStore.getText(manifest.appDataPath)
    : null
  const favoritesJson = sections.favorites && options.favoriteManager
    ? await options.objectStore.getText(manifest.favoritesPath)
    : null

  if (appDataJson !== null) validateJsonText(appDataJson, 'app-data.json')
  if (favoritesJson !== null) validateJsonText(favoritesJson, 'favorites.json')

  const images: PreparedImageRestore[] = []
  for (const [index, asset] of manifest.assets.entries()) {
    if (
      asset.kind !== 'image' ||
      !asset.id ||
      !asset.path ||
      !selectedStores.has(asset.store)
    ) {
      report.skipped += 1
      continue
    }

    const storageService = getImportStorageService(asset.store, options)
    if (!storageService) {
      report.errors.push(`${asset.store}:${asset.id}: image storage service is unavailable`)
      continue
    }

    try {
      options.onProgress?.({
        phase: 'restore-validate',
        current: index + 1,
        total: manifest.assets.length,
        item: asset.id,
      })
      const bytes = new Uint8Array(await options.objectStore.get(asset.path))
      if (bytes.byteLength === 0) {
        report.corrupt.push({ store: asset.store, id: asset.id })
        continue
      }
      if (asset.sha256) {
        const actualHash = await sha256Hex(bytes)
        if (actualHash && actualHash !== asset.sha256) {
          report.corrupt.push({ store: asset.store, id: asset.id })
          continue
        }
      }
      if (
        !asset.sha256 &&
        typeof asset.sizeBytes === 'number' &&
        Number.isFinite(asset.sizeBytes) &&
        asset.sizeBytes > 0 &&
        Math.abs(asset.sizeBytes - bytes.byteLength) > 2
      ) {
        report.corrupt.push({ store: asset.store, id: asset.id })
        continue
      }

      const existing = await storageService.getMetadata(asset.id)
      if (existing) {
        report.skipped += 1
        continue
      }

      images.push({
        store: asset.store,
        image: {
          metadata: normalizeImageMetadata(
            asset,
            bytes.byteLength,
            resolveResourceMimeType(asset.mimeType, bytes),
          ),
          data: bytesToBase64(bytes),
        },
      })
    } catch (error) {
      if (String((error as Error).message || error).includes('not found')) {
        report.missing.push({ store: asset.store, id: asset.id })
      } else {
        report.errors.push(`${asset.store}:${asset.id}: ${(error as Error).message}`)
      }
    }
  }

  if (report.missing.length > 0 || report.corrupt.length > 0 || report.errors.length > 0) {
    const details = [
      report.missing.length ? `missing=${report.missing.length}` : '',
      report.corrupt.length ? `corrupt=${report.corrupt.length}` : '',
      report.errors.length ? `errors=${report.errors.length}` : '',
    ].filter(Boolean).join(', ')
    throw new Error(`Remote snapshot restore validation failed: ${details}`)
  }

  report.missing.push(...manifest.missingAssets.filter((asset) => selectedStores.has(asset.store)))

  return {
    appDataJson,
    favoritesJson,
    images,
    report,
  }
}

export const restoreRemoteSnapshotBackup = async (
  options: RestoreRemoteSnapshotOptions,
): Promise<RemoteSnapshotRestoreReport> => {
  options.onProgress?.({ phase: 'restore-validate', current: 0, total: 1, item: MANIFEST_FILE_NAME })
  const manifest = parseManifest(await options.objectStore.getText(snapshotManifestPath(options.snapshotId)))
  const prepared = await prepareRemoteSnapshotRestore(manifest, options)

  for (const [index, item] of prepared.images.entries()) {
    const storageService = getImportStorageService(item.store, options)
    if (!storageService) {
      throw new Error(`${item.store}:${item.image.metadata.id}: image storage service is unavailable`)
    }
    options.onProgress?.({
      phase: 'restore-write',
      current: index + 1,
      total: prepared.images.length,
      item: item.image.metadata.id,
    })
    await storageService.saveImage(item.image)
    prepared.report.restored += 1
  }

  if (prepared.appDataJson !== null) {
    options.onProgress?.({ phase: 'restore-write', item: APP_DATA_FILE_NAME })
    await options.dataManager.importAllData(prepared.appDataJson)
  }

  if (prepared.favoritesJson !== null && options.favoriteManager) {
    options.onProgress?.({ phase: 'restore-write', item: FAVORITES_FILE_NAME })
    await options.favoriteManager.importFavorites(prepared.favoritesJson, {
      mergeStrategy: options.favoriteMergeStrategy ?? 'overwrite',
    })
  }

  options.onProgress?.({
    phase: 'done',
    current: prepared.report.restored,
    total: prepared.images.length,
  })
  return prepared.report
}

const readCommittedSnapshotManifests = async (
  objectStore: RemoteObjectStore,
): Promise<RemoteSnapshotManifest[]> => {
  const entries = await objectStore.list(joinRemotePath(REMOTE_SNAPSHOT_ROOT, 'snapshots'))
  const manifestEntries = entries.filter((entry) => entry.path.endsWith(`/${MANIFEST_FILE_NAME}`))
  const manifests: RemoteSnapshotManifest[] = []
  const failures: Array<{ path: string; message: string }> = []

  for (const entry of manifestEntries) {
    try {
      manifests.push(parseManifest(await objectStore.getText(entry.path)))
    } catch (error) {
      failures.push({
        path: entry.path,
        message: (error as Error).message || String(error),
      })
    }
  }

  if (failures.length > 0) {
    const firstFailure = failures[0]
    throw new Error(
      `Unable to safely analyze remote snapshot assets because ${failures.length} snapshot manifest(s) could not be read. First failure: ${firstFailure.path}: ${firstFailure.message}`,
    )
  }

  return manifests
}

export const analyzeRemoteSnapshotAssetCleanup = async (
  objectStore: RemoteObjectStore,
  onProgress?: RemoteSnapshotProgressReporter,
): Promise<RemoteSnapshotCleanupAnalysis> => {
  onProgress?.({ phase: 'cleanup-analyze' })
  const manifests = await readCommittedSnapshotManifests(objectStore)
  const referenced = new Set(manifests.flatMap((manifest) => manifest.assets.map((asset) => asset.path)))
  const remoteAssets = await objectStore.list(joinRemotePath(REMOTE_SNAPSHOT_ROOT, 'assets'))
  const candidates = remoteAssets
    .filter((entry) => !referenced.has(entry.path))
    .map((entry) => ({
      path: entry.path,
      sizeBytes: entry.sizeBytes,
      updatedAt: entry.updatedAt,
    }))

  return {
    candidates,
    referencedAssetCount: referenced.size,
    totalCandidateBytes: candidates.reduce((sum, candidate) => sum + (candidate.sizeBytes ?? 0), 0),
  }
}

export const cleanupRemoteSnapshotAssets = async (
  objectStore: RemoteObjectStore,
  onProgress?: RemoteSnapshotProgressReporter,
): Promise<RemoteSnapshotCleanupResult> => {
  if (!objectStore.delete) {
    throw new Error('Remote asset cleanup is not supported by this provider')
  }
  const analysis = await analyzeRemoteSnapshotAssetCleanup(objectStore, onProgress)
  const failed: Array<{ path: string; message: string }> = []
  let deleted = 0

  for (const [index, candidate] of analysis.candidates.entries()) {
    try {
      onProgress?.({
        phase: 'cleanup-delete',
        current: index + 1,
        total: analysis.candidates.length,
        item: candidate.path,
        deleted,
      })
      await objectStore.delete(candidate.path)
      deleted += 1
    } catch (error) {
      failed.push({ path: candidate.path, message: (error as Error).message })
    }
  }

  return {
    ...analysis,
    deleted,
    failed,
  }
}
