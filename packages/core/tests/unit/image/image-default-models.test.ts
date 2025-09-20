import { describe, it, expect, beforeEach } from 'vitest'
import { getDefaultImageModels } from '../../../src/services/image-model/defaults'

describe('default image models', () => {
  const env = process.env
  beforeEach(() => { process.env = { ...env } })

  it('uses VITE_GEMINI_API_KEY for image-gemini models', () => {
    process.env.VITE_GEMINI_API_KEY = 'gemi'
    const models = getDefaultImageModels()
    expect(models['image-gemini-fast'].apiKey).toBe('gemi')
    expect(models['image-gemini-fast'].enabled).toBe(true)
    expect(models['image-gemini-quality'].apiKey).toBe('gemi')
    expect(models['image-gemini-quality'].enabled).toBe(true)
  })

  it('prefers VITE_SEEDREAM_API_KEY for seedream', () => {
    process.env.VITE_SEEDREAM_API_KEY = 'seed'
    const models = getDefaultImageModels()
    expect(models['image-seedream'].apiKey).toBe('seed')
    expect(models['image-seedream'].enabled).toBe(true)
  })
})

