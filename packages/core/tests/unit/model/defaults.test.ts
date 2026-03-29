import { getBuiltinModelIds, getDefaultTextModels } from '../../../src/services/model/defaults'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

describe('model defaults provider env mapping', () => {
  const originalAnthropicApiKey = process.env.VITE_ANTHROPIC_API_KEY
  const originalCloudflareApiKey = process.env.CF_API_TOKEN
  const originalCloudflareAccountId = process.env.CF_ACCOUNT_ID

  beforeEach(() => {
    delete process.env.VITE_ANTHROPIC_API_KEY
    delete process.env.CF_API_TOKEN
    delete process.env.CF_ACCOUNT_ID
  })

  afterAll(() => {
    if (originalAnthropicApiKey === undefined) {
      delete process.env.VITE_ANTHROPIC_API_KEY
      return
    }
    process.env.VITE_ANTHROPIC_API_KEY = originalAnthropicApiKey

    if (originalCloudflareApiKey === undefined) {
      delete process.env.CF_API_TOKEN
    } else {
      process.env.CF_API_TOKEN = originalCloudflareApiKey
    }

    if (originalCloudflareAccountId === undefined) {
      delete process.env.CF_ACCOUNT_ID
    } else {
      process.env.CF_ACCOUNT_ID = originalCloudflareAccountId
    }
  })

  it('should include anthropic in builtin model ids', () => {
    const builtinModelIds = getBuiltinModelIds()
    expect(builtinModelIds).toContain('anthropic')
  })

  it('should include anthropic config and keep it disabled when api key is empty', () => {
    const models = getDefaultTextModels()

    expect(models.anthropic).toBeDefined()
    expect(models.anthropic.providerMeta.id).toBe('anthropic')
    expect(models.anthropic.enabled).toBe(false)
  })

  it('should enable anthropic when VITE_ANTHROPIC_API_KEY is provided', () => {
    process.env.VITE_ANTHROPIC_API_KEY = 'test-anthropic-key'

    const models = getDefaultTextModels()

    expect(models.anthropic.enabled).toBe(true)
    expect(models.anthropic.connectionConfig.apiKey).toBe('test-anthropic-key')
  })

  it('should include cloudflare in builtin model ids', () => {
    const builtinModelIds = getBuiltinModelIds()
    expect(builtinModelIds).toContain('cloudflare')
  })

  it('should include cloudflare config and keep it disabled when credentials are empty', () => {
    const models = getDefaultTextModels()

    expect(models.cloudflare).toBeDefined()
    expect(models.cloudflare.providerMeta.id).toBe('cloudflare')
    expect(models.cloudflare.enabled).toBe(false)
  })

  it('should enable cloudflare when CF_API_TOKEN and CF_ACCOUNT_ID are provided', () => {
    process.env.CF_API_TOKEN = 'test-cloudflare-token'
    process.env.CF_ACCOUNT_ID = 'test-cloudflare-account'

    const models = getDefaultTextModels()

    expect(models.cloudflare.enabled).toBe(true)
    expect(models.cloudflare.connectionConfig.apiKey).toBe('test-cloudflare-token')
    expect(models.cloudflare.connectionConfig.accountId).toBe('test-cloudflare-account')
    expect(models.cloudflare.modelMeta.id).toBe('@cf/qwen/qwen3-30b-a3b-fp8')
  })
})
