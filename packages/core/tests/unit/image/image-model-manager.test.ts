import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CORE_SERVICE_KEYS } from '../../../src/constants/storage-keys'
import { ImageAdapterRegistry } from '../../../src/services/image/adapters/registry'
import { ImageModelManager } from '../../../src/services/image-model/manager'
import type { ImageModelConfig } from '../../../src/services/image/types'
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider'
import type { IStorageProvider } from '../../../src/services/storage/types'

describe('ImageModelManager initialization behavior', () => {
  let storageProvider: IStorageProvider
  let registry: ImageAdapterRegistry
  let modelManager: ImageModelManager

  beforeEach(async () => {
    storageProvider = new MemoryStorageProvider()
    registry = new ImageAdapterRegistry()
    await storageProvider.clearAll()
    modelManager = new ImageModelManager(storageProvider, registry)
  })

  afterEach(async () => {
    await storageProvider.clearAll()
  })

  it('should auto-enable cloudflare when missing required connection fields become available from env', async () => {
    const originalCloudflareToken = process.env.VITE_CF_API_TOKEN
    const originalCloudflareAccountId = process.env.VITE_CF_ACCOUNT_ID
    process.env.VITE_CF_API_TOKEN = 'env_cloudflare_token'
    process.env.VITE_CF_ACCOUNT_ID = 'env_cloudflare_account'

    try {
      await modelManager.ensureInitialized()
      const existing = await modelManager.getConfig('image-cloudflare-flux-klein')
      expect(existing).toBeDefined()

      const storedCloudflare: ImageModelConfig = {
        ...existing!,
        enabled: false,
        connectionConfig: {
          ...existing!.connectionConfig,
          apiKey: '',
          accountId: ''
        }
      }

      await storageProvider.setItem(
        CORE_SERVICE_KEYS.IMAGE_MODELS,
        JSON.stringify({ 'image-cloudflare-flux-klein': storedCloudflare })
      )

      const reloadedManager = new ImageModelManager(storageProvider, new ImageAdapterRegistry())
      await reloadedManager.ensureInitialized()
      const reloaded = await reloadedManager.getConfig('image-cloudflare-flux-klein')

      expect(reloaded?.enabled).toBe(true)
      expect(reloaded?.connectionConfig?.apiKey).toBe('env_cloudflare_token')
      expect(reloaded?.connectionConfig?.accountId).toBe('env_cloudflare_account')
    } finally {
      if (originalCloudflareToken === undefined) {
        delete process.env.VITE_CF_API_TOKEN
      } else {
        process.env.VITE_CF_API_TOKEN = originalCloudflareToken
      }

      if (originalCloudflareAccountId === undefined) {
        delete process.env.VITE_CF_ACCOUNT_ID
      } else {
        process.env.VITE_CF_ACCOUNT_ID = originalCloudflareAccountId
      }
    }
  })

  it('should refresh stored static model metadata to the latest adapter capabilities', async () => {
    await modelManager.ensureInitialized()
    const existing = await modelManager.getConfig('image-seedream')
    expect(existing).toBeDefined()

    const storedSeedream: ImageModelConfig = {
      ...existing!,
      model: {
        ...existing!.model,
        capabilities: {
          ...existing!.model.capabilities,
          multiImage: false
        }
      }
    }

    await storageProvider.setItem(
      CORE_SERVICE_KEYS.IMAGE_MODELS,
      JSON.stringify({ 'image-seedream': storedSeedream })
    )

    const reloadedManager = new ImageModelManager(storageProvider, new ImageAdapterRegistry())
    const reloaded = await reloadedManager.getConfig('image-seedream')

    expect(reloaded?.model.capabilities.multiImage).toBe(true)
  })
})
