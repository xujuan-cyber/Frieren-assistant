import type { IImageStorageService } from '@prompt-optimizer/core'

import { computeStableImageId } from '../stores/session/imageStorageMaintenance'

type ImageSourceType = 'generated' | 'uploaded'

type ImagePayload = {
  b64: string
  mimeType: string
}

const DATA_URL_BASE64_RE = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/iu

const parseDataUrlPayload = (source: string): ImagePayload | null => {
  const raw = String(source || '').trim()
  if (!raw) return null

  const match = raw.match(DATA_URL_BASE64_RE)
  if (!match) return null

  const mimeType = (match[1] || 'application/octet-stream').trim()
  const b64 = (match[2] || '').trim()
  if (!b64) return null

  return { b64, mimeType }
}

const fetchImagePayloadFromUrl = async (absoluteUrl: string): Promise<ImagePayload> => {
  const resp = await fetch(absoluteUrl, { method: 'GET' })
  if (!resp.ok) {
    throw new Error(`Image request failed: ${resp.status}`)
  }

  const headerType = resp.headers.get('content-type')
  const mimeType = typeof headerType === 'string' ? headerType.split(';')[0].trim() : ''

  type BufferLike = {
    from: (data: ArrayBuffer) => { toString: (encoding: 'base64') => string }
  }

  const maybeBuffer = (globalThis as unknown as { Buffer?: BufferLike }).Buffer
  if (maybeBuffer && typeof maybeBuffer.from === 'function') {
    const ab = await resp.arrayBuffer()
    const b64 = maybeBuffer.from(ab).toString('base64')
    return { b64, mimeType: mimeType || 'application/octet-stream' }
  }

  if (typeof FileReader === 'undefined') {
    throw new Error('FileReader is not available to decode image payload')
  }

  const blob = await resp.blob()
  const actualMime = blob.type || mimeType || 'application/octet-stream'

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image blob'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })

  const parsed = parseDataUrlPayload(dataUrl)
  if (!parsed?.b64) {
    throw new Error('Failed to decode image data URL payload')
  }

  return {
    b64: parsed.b64,
    mimeType: parsed.mimeType || actualMime,
  }
}

const normalizePayloadFromSource = async (source: string): Promise<ImagePayload | null> => {
  const raw = String(source || '').trim()
  if (!raw) return null

  const dataUrlPayload = parseDataUrlPayload(raw)
  if (dataUrlPayload) return dataUrlPayload

  if (/^https?:\/\//u.test(raw)) {
    return fetchImagePayloadFromUrl(raw)
  }

  return null
}

type PersistImageSourceOptions = {
  source: string
  storageService: IImageStorageService | null | undefined
  sourceType?: ImageSourceType
  metadata?: {
    prompt?: string
    modelId?: string
    configId?: string
  }
}

/**
 * Persists an image source (data URL or http URL) into image storage and returns an asset id.
 */
export const persistImageSourceAsAssetId = async (
  opts: PersistImageSourceOptions,
): Promise<string | null> => {
  const { source, storageService, sourceType = 'uploaded', metadata } = opts
  if (!storageService) return null

  const payload = await normalizePayloadFromSource(source)
  if (!payload) return null

  const imageId = await computeStableImageId(payload.b64, payload.mimeType)
  const existing = await storageService.getMetadata(imageId)
  if (!existing) {
    await storageService.saveImage({
      metadata: {
        id: imageId,
        mimeType: payload.mimeType,
        sizeBytes: Math.floor(payload.b64.length * 0.75),
        createdAt: Date.now(),
        accessedAt: Date.now(),
        source: sourceType,
        metadata,
      },
      data: payload.b64,
    })
  }

  return imageId
}

type PersistImageSourcesOptions = {
  sources: string[]
  storageService: IImageStorageService | null | undefined
  sourceType?: ImageSourceType
  metadata?: {
    prompt?: string
    modelId?: string
    configId?: string
  }
}

export const persistImageSourcesAsAssetIds = async (
  opts: PersistImageSourcesOptions,
): Promise<string[]> => {
  const { sources, storageService, sourceType, metadata } = opts
  if (!storageService || !Array.isArray(sources) || sources.length === 0) return []

  const ids = await Promise.all(
    sources.map(async (source) => {
      try {
        return await persistImageSourceAsAssetId({
          source,
          storageService,
          sourceType,
          metadata,
        })
      } catch (error) {
        console.warn('[ImageAssetStorage] Failed to persist image source as asset id:', error)
        return null
      }
    }),
  )

  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
}

export const resolveAssetIdToDataUrl = async (
  assetId: string,
  storageService: IImageStorageService | null | undefined,
): Promise<string | null> => {
  if (!storageService || !assetId) return null
  const fullImageData = await storageService.getImage(assetId)
  if (!fullImageData) return null

  const mimeType = fullImageData.metadata.mimeType || 'application/octet-stream'
  return `data:${mimeType};base64,${fullImageData.data}`
}
