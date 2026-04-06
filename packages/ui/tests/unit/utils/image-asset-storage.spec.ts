import { afterEach, describe, expect, it, vi } from 'vitest'

import { normalizeImageSourceToPayload } from '../../../src/utils/image-asset-storage'

describe('image asset storage utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('infers image mime type from PNG bytes when the remote url responds as application/octet-stream', async () => {
    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ])

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: {
          get: vi.fn((name: string) =>
            name.toLowerCase() === 'content-type' ? 'application/octet-stream' : null
          ),
        },
        arrayBuffer: async () => pngBytes.buffer,
      }))
    )

    const payload = await normalizeImageSourceToPayload('https://example.com/generated-image')

    expect(payload).toMatchObject({
      mimeType: 'image/png',
      b64: Buffer.from(pngBytes).toString('base64'),
    })
  })
})
