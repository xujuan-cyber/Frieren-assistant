import { describe, it, expect } from 'vitest'
import { ImageService } from '../../../src/services/image/service'
import type { IImageModelManager, ImageModelConfig } from '../../../src/services/image/types'

class MockImageModelManager implements IImageModelManager {
  async ensureInitialized() {}
  async isInitialized() { return true }
  async getAllModels() { return [] as any }
  async getModel(key: string) {
    const cfg: ImageModelConfig = {
      name: 'Gemini Image', baseURL: '', apiKey: 'k', defaultModel: 'gemini-2.5-flash-image-preview', enabled: true, provider: 'gemini'
    }
    return cfg
  }
  async addModel() {}
  async updateModel() {}
  async deleteModel() {}
  async enableModel() {}
  async disableModel() {}
  async getEnabledModels() { return [] as any }
  async exportData() { return [] as any }
  async importData() {}
  async getDataType() { return 'image-models' }
  async validateData() { return true }
}

describe('ImageService validation', () => {
  const svc = new ImageService(new MockImageModelManager())

  it('rejects empty prompt', async () => {
    await expect(svc.generate({ prompt: '' }, 'image-gemini')).rejects.toThrow(/提示词不能为空/)
  })

  it('rejects count > 4', async () => {
    await expect(svc.generate({ prompt: 'a', count: 5 }, 'image-gemini')).rejects.toThrow(/1~4/)
  })

  it('rejects non png/jpeg mime', async () => {
    await expect(svc.generate({ prompt: 'a', inputImage: { b64: 'AAA', mimeType: 'image/webp' } }, 'image-gemini')).rejects.toThrow(/仅支持 PNG 或 JPEG/)
  })

  it('rejects >10MB base64', async () => {
    // Construct a base64 string ~ >10MB
    const bytes = 10 * 1024 * 1024 + 1024
    const b64 = Buffer.alloc(bytes, 0).toString('base64')
    await expect(svc.generate({ prompt: 'a', inputImage: { b64, mimeType: 'image/png' } }, 'image-gemini')).rejects.toThrow(/不能超过 10MB/)
  })
})

