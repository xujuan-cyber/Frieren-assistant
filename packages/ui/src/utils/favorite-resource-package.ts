import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type {
  FavoritePrompt,
  FullImageData,
  IFavoriteManager,
  IImageStorageService,
  ImageMetadata,
} from '@prompt-optimizer/core'

import { collectFavoritesAssetIds } from './favorite-asset-refs'

export const FAVORITE_RESOURCE_PACKAGE_SCHEMA_VERSION = 'prompt-optimizer/favorites-package/v1' as const

export type FavoriteExportJson = {
  version?: string
  exportDate?: string
  favorites: FavoritePrompt[]
  categories?: unknown[]
  tags?: unknown[]
}

export type FavoriteResourceManifestEntry = {
  kind: 'image'
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

export type FavoriteResourcePackageManifest = {
  schemaVersion: typeof FAVORITE_RESOURCE_PACKAGE_SCHEMA_VERSION
  createdAt: string
  favoriteCount: number
  resourceCount: number
  resources: FavoriteResourceManifestEntry[]
  missingResourceIds: string[]
}

export type FavoriteResourcePackageExportResult = {
  blob: Blob
  manifest: FavoriteResourcePackageManifest
  missingResourceIds: string[]
}

export type FavoriteResourceRestoreReport = {
  restored: number
  skipped: number
  missing: string[]
  corrupt: string[]
  errors: string[]
}

export type FavoriteResourcePackageImportResult = {
  resources: FavoriteResourceRestoreReport
  favorites: {
    imported: number
    skipped: number
    errors: string[]
  }
}

type ExportFavoriteResourcePackageOptions = {
  favoriteManager: Pick<IFavoriteManager, 'exportFavorites'>
  imageStorageService?: Pick<IImageStorageService, 'getImage'> | null
  imageStorageServices?: Array<Pick<IImageStorageService, 'getImage'> | null | undefined>
}

type ImportFavoriteResourcePackageOptions = {
  favoriteManager: Pick<IFavoriteManager, 'importFavorites'>
  imageStorageService?: Pick<IImageStorageService, 'getMetadata' | 'saveImage'> | null
  mergeStrategy?: 'skip' | 'overwrite' | 'merge'
}

const FAVORITES_JSON_PATH = 'favorites.json'
const MANIFEST_JSON_PATH = 'manifest.json'
const IMAGE_RESOURCE_ROOT = 'resources/images/'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const toZipBytes = (bytes: Uint8Array): Uint8Array => {
  const out = new globalThis.Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out
}

const textToZipBytes = (text: string): Uint8Array => toZipBytes(strToU8(text))

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const view = toZipBytes(bytes)
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

const parseFavoriteExportJson = (json: string): FavoriteExportJson => {
  const parsed = JSON.parse(json) as unknown
  if (!isRecord(parsed) || !Array.isArray(parsed.favorites)) {
    throw new Error('Invalid favorites JSON payload')
  }
  return parsed as FavoriteExportJson
}

const parseManifest = (json: string): FavoriteResourcePackageManifest => {
  const parsed = JSON.parse(json) as unknown
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== FAVORITE_RESOURCE_PACKAGE_SCHEMA_VERSION ||
    !Array.isArray(parsed.resources) ||
    !Array.isArray(parsed.missingResourceIds)
  ) {
    throw new Error('Invalid favorites package manifest')
  }
  return parsed as FavoriteResourcePackageManifest
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

const safeResourceFileName = (id: string, mimeType: string): string =>
  `${encodeURIComponent(id)}.${extensionFromMimeType(mimeType)}`

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

const normalizeImageMetadata = (
  entry: FavoriteResourceManifestEntry,
  sizeBytes: number,
  mimeType: string,
): ImageMetadata => ({
  id: entry.id,
  mimeType,
  sizeBytes,
  createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
  accessedAt: Date.now(),
  source: entry.source === 'generated' ? 'generated' : 'uploaded',
  ...(entry.metadata ? { metadata: entry.metadata } : {}),
})

const getExportStorageCandidates = (
  options: ExportFavoriteResourcePackageOptions,
): Array<Pick<IImageStorageService, 'getImage'>> => {
  const candidates = options.imageStorageServices?.length
    ? options.imageStorageServices
    : [options.imageStorageService]

  return candidates.filter((service): service is Pick<IImageStorageService, 'getImage'> => !!service)
}

const getImageFromCandidates = async (
  candidates: Array<Pick<IImageStorageService, 'getImage'>>,
  assetId: string,
): Promise<FullImageData | null> => {
  for (const storage of candidates) {
    const image = await storage.getImage(assetId)
    if (image?.data) {
      return image
    }
  }

  return null
}

export const createFavoriteResourcePackage = async (
  options: ExportFavoriteResourcePackageOptions,
): Promise<FavoriteResourcePackageExportResult> => {
  const favoritesJson = await options.favoriteManager.exportFavorites()
  const exportData = parseFavoriteExportJson(favoritesJson)
  const assetIds = collectFavoritesAssetIds(exportData.favorites)
  const storageCandidates = getExportStorageCandidates(options)
  const files: Record<string, Uint8Array> = {
    [FAVORITES_JSON_PATH]: textToZipBytes(favoritesJson),
    [`${IMAGE_RESOURCE_ROOT}.keep`]: new globalThis.Uint8Array(),
  }
  const resources: FavoriteResourceManifestEntry[] = []
  const missingResourceIds: string[] = []

  for (const assetId of assetIds) {
    const image = await getImageFromCandidates(storageCandidates, assetId)
    if (!image?.data) {
      missingResourceIds.push(assetId)
      continue
    }

    const bytes = base64ToBytes(image.data)
    const mimeType = resolveResourceMimeType(image.metadata.mimeType, bytes)
    const path = `${IMAGE_RESOURCE_ROOT}${safeResourceFileName(assetId, mimeType)}`
    files[path] = toZipBytes(bytes)
    resources.push({
      kind: 'image',
      id: assetId,
      path,
      mimeType,
      sizeBytes: bytes.byteLength,
      createdAt: image.metadata.createdAt || Date.now(),
      accessedAt: image.metadata.accessedAt,
      source: image.metadata.source || 'uploaded',
      metadata: image.metadata.metadata,
      sha256: await sha256Hex(bytes),
    })
  }

  const manifest: FavoriteResourcePackageManifest = {
    schemaVersion: FAVORITE_RESOURCE_PACKAGE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    favoriteCount: exportData.favorites.length,
    resourceCount: resources.length,
    resources,
    missingResourceIds,
  }
  files[MANIFEST_JSON_PATH] = textToZipBytes(JSON.stringify(manifest, null, 2))

  const zipped = zipSync(files, { level: 6 })
  return {
    blob: new Blob([toArrayBuffer(zipped)], { type: 'application/zip' }),
    manifest,
    missingResourceIds,
  }
}

export const readFavoriteResourcePackage = (
  input: ArrayBuffer | Uint8Array,
): {
  manifest: FavoriteResourcePackageManifest
  favoritesJson: string
  files: Record<string, Uint8Array>
} => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const files = unzipSync(bytes)
  const manifestBytes = files[MANIFEST_JSON_PATH]
  const favoritesBytes = files[FAVORITES_JSON_PATH]

  if (!manifestBytes) {
    throw new Error('favorites package is missing manifest.json')
  }
  if (!favoritesBytes) {
    throw new Error('favorites package is missing favorites.json')
  }

  return {
    manifest: parseManifest(strFromU8(manifestBytes)),
    favoritesJson: strFromU8(favoritesBytes),
    files,
  }
}

const restoreFavoritePackageResources = async (
  manifest: FavoriteResourcePackageManifest,
  files: Record<string, Uint8Array>,
  imageStorageService: ImportFavoriteResourcePackageOptions['imageStorageService'],
): Promise<FavoriteResourceRestoreReport> => {
  const report: FavoriteResourceRestoreReport = {
    restored: 0,
    skipped: 0,
    missing: [...manifest.missingResourceIds],
    corrupt: [],
    errors: [],
  }

  if (!imageStorageService) {
    report.skipped += manifest.resources.length
    if (manifest.resources.length > 0) {
      report.errors.push('Image storage service is unavailable; package resources were not restored')
    }
    return report
  }

  for (const resource of manifest.resources) {
    if (resource.kind !== 'image' || !resource.id || !resource.path.startsWith(IMAGE_RESOURCE_ROOT)) {
      report.skipped += 1
      continue
    }

    const bytes = files[resource.path]
    if (!bytes) {
      report.missing.push(resource.id)
      continue
    }

    if (bytes.byteLength === 0) {
      report.corrupt.push(resource.id)
      continue
    }

    try {
      if (resource.sha256) {
        const actualHash = await sha256Hex(bytes)
        if (actualHash && actualHash !== resource.sha256) {
          report.corrupt.push(resource.id)
          continue
        }
      }

      if (
        !resource.sha256 &&
        typeof resource.sizeBytes === 'number' &&
        Number.isFinite(resource.sizeBytes) &&
        resource.sizeBytes > 0 &&
        Math.abs(resource.sizeBytes - bytes.byteLength) > 2
      ) {
        report.corrupt.push(resource.id)
        continue
      }

      const existing = await imageStorageService.getMetadata(resource.id)
      if (existing) {
        report.skipped += 1
        continue
      }

      const imageData: FullImageData = {
        metadata: normalizeImageMetadata(
          resource,
          bytes.byteLength,
          resolveResourceMimeType(resource.mimeType, bytes),
        ),
        data: bytesToBase64(bytes),
      }
      await imageStorageService.saveImage(imageData)
      report.restored += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      report.errors.push(`${resource.id}: ${message}`)
    }
  }

  return report
}

export const importFavoriteResourcePackage = async (
  input: ArrayBuffer | Uint8Array,
  options: ImportFavoriteResourcePackageOptions,
): Promise<FavoriteResourcePackageImportResult> => {
  const { manifest, favoritesJson, files } = readFavoriteResourcePackage(input)
  const resources = await restoreFavoritePackageResources(
    manifest,
    files,
    options.imageStorageService,
  )
  const favorites = await options.favoriteManager.importFavorites(favoritesJson, {
    mergeStrategy: options.mergeStrategy,
  })

  return {
    resources,
    favorites,
  }
}

export const looksLikeFavoriteZipPackage = (
  fileName: string | undefined,
  bytes: Uint8Array,
): boolean => {
  const normalizedName = String(fileName || '').toLowerCase()
  if (normalizedName.endsWith('.zip') || normalizedName.endsWith('.po-favorites.zip')) {
    return true
  }

  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}
