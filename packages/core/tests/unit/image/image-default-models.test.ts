import { describe, it, expect, beforeEach } from 'vitest'
import { getDefaultImageModels } from '../../../src/services/image-model/defaults'
import { ImageAdapterRegistry } from '../../../src/services/image/adapters/registry'
import { OpenRouterImageAdapter } from '../../../src/services/image/adapters/openrouter'

describe('default image models', () => {
  const env = process.env
  let registry: ImageAdapterRegistry

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.VITE_CF_API_TOKEN
    delete process.env.VITE_CF_ACCOUNT_ID
    delete process.env.CF_API_TOKEN
    delete process.env.CF_ACCOUNT_ID
    registry = new ImageAdapterRegistry()
  })

  it('uses VITE_GEMINI_API_KEY for image-gemini models', () => {
    process.env.VITE_GEMINI_API_KEY = 'gemi'
    const models = getDefaultImageModels(registry)
    expect(models['image-gemini-nanobanana'].connectionConfig?.apiKey).toBe('gemi')
    expect(models['image-gemini-nanobanana'].enabled).toBe(true)
  })

  it('prefers VITE_SEEDREAM_API_KEY for seedream', () => {
    process.env.VITE_SEEDREAM_API_KEY = 'seed'
    const models = getDefaultImageModels(registry)
    expect(models['image-seedream'].connectionConfig?.apiKey).toBe('seed')
    expect(models['image-seedream'].enabled).toBe(true)
  })

  it('includes OpenRouter configuration when API key is present', () => {
    process.env.VITE_OPENROUTER_API_KEY = 'openrouter-key'
    const models = getDefaultImageModels(registry)
    const openrouterModelId = new OpenRouterImageAdapter().getModels()[0].id

    expect(models['image-openrouter-nanobanana']).toBeDefined()
    expect(models['image-openrouter-nanobanana'].providerId).toBe('openrouter')
    expect(models['image-openrouter-nanobanana'].modelId).toBe(openrouterModelId)
    expect(models['image-openrouter-nanobanana'].connectionConfig?.apiKey).toBe('openrouter-key')
    expect(models['image-openrouter-nanobanana'].enabled).toBe(true)
  })

  it('disables OpenRouter configuration when API key is missing', () => {
    delete process.env.VITE_OPENROUTER_API_KEY
    const models = getDefaultImageModels(registry)

    expect(models['image-openrouter-nanobanana']).toBeDefined()
    expect(models['image-openrouter-nanobanana'].enabled).toBe(false)
  })

  it('OpenRouter model has correct provider and model information', () => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-key'
    const models = getDefaultImageModels(registry)
    const openrouterConfig = models['image-openrouter-nanobanana']
    const openrouterModelId = new OpenRouterImageAdapter().getModels()[0].id

    expect(openrouterConfig.provider.id).toBe('openrouter')
    expect(openrouterConfig.provider.name).toBe('OpenRouter')
    expect(openrouterConfig.model.id).toBe(openrouterModelId)
    expect(openrouterConfig.model.capabilities.text2image).toBe(true)
    expect(openrouterConfig.model.capabilities.image2image).toBe(true)
    expect(openrouterConfig.model.capabilities.multiImage).toBe(true)
  })

  it('includes Cloudflare configuration when API token and account id are present', () => {
    process.env.VITE_CF_API_TOKEN = 'cloudflare-token'
    process.env.VITE_CF_ACCOUNT_ID = 'cloudflare-account'

    const models = getDefaultImageModels(registry)
    const cloudflareConfig = models['image-cloudflare-flux-klein']

    expect(cloudflareConfig).toBeDefined()
    expect(cloudflareConfig.providerId).toBe('cloudflare')
    expect(cloudflareConfig.provider.corsRestricted).toBe(true)
    expect(cloudflareConfig.modelId).toBe('@cf/black-forest-labs/flux-2-klein-4b')
    expect(cloudflareConfig.connectionConfig?.apiKey).toBe('cloudflare-token')
    expect(cloudflareConfig.connectionConfig?.accountId).toBe('cloudflare-account')
    expect(cloudflareConfig.enabled).toBe(true)
  })

  it('disables Cloudflare configuration when account id is missing', () => {
    process.env.VITE_CF_API_TOKEN = 'cloudflare-token'
    delete process.env.VITE_CF_ACCOUNT_ID

    const models = getDefaultImageModels(registry)

    expect(models['image-cloudflare-flux-klein']).toBeDefined()
    expect(models['image-cloudflare-flux-klein'].enabled).toBe(false)
  })

  it('keeps Cloudflare disabled when only legacy CF_* variables are provided', () => {
    process.env.CF_API_TOKEN = 'legacy-cloudflare-token'
    process.env.CF_ACCOUNT_ID = 'legacy-cloudflare-account'

    const models = getDefaultImageModels(registry)

    expect(models['image-cloudflare-flux-klein']).toBeDefined()
    expect(models['image-cloudflare-flux-klein'].connectionConfig?.apiKey).toBe('')
    expect(models['image-cloudflare-flux-klein'].connectionConfig?.accountId).toBe('')
    expect(models['image-cloudflare-flux-klein'].enabled).toBe(false)
  })
})
