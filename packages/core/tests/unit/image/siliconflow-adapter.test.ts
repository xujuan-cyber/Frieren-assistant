import { describe, test, expect } from 'vitest'
import { SiliconFlowImageAdapter } from '../../../src/services/image/adapters/siliconflow-adapter'
import { ImageRequest, ImageModelConfig } from '../../../src/services/image/types'

describe('SiliconFlowImageAdapter', () => {
  test('should create adapter with correct capabilities', () => {
    const adapter = new SiliconFlowImageAdapter()

    expect(adapter.capabilities).toEqual({
      edit: true,
      multiImage: false,
      asyncJob: false,
      streamingPreview: false
    })
  })

  test.skip('should map image sizes correctly', () => {
    // 注意：mapImageSize 是私有方法，这里通过请求参数间接测试
    // 实际尺寸映射将在集成测试或真实 API 调用中验证
    const adapter = new SiliconFlowImageAdapter()

    // 测试支持的尺寸列表
    const sizes = adapter.getSupportedSizes()
    expect(sizes).toContain('1024x1024')
    expect(sizes).toContain('960x1280')
    expect(sizes).toContain('768x1024')
    expect(sizes).toContain('720x1440')
    expect(sizes).toContain('720x1280')
  })

  test('should get supported sizes', () => {
    const adapter = new SiliconFlowImageAdapter()
    const sizes = adapter.getSupportedSizes()

    expect(sizes).toEqual([
      '1024x1024',
      '960x1280',
      '768x1024',
      '720x1440',
      '720x1280'
    ])
  })

  test('should generate image with real API call', async () => {
    // 跳过测试，除非设置了 API Key
    const apiKey = process.env.VITE_SILICONFLOW_API_KEY
    if (!apiKey) {
      console.log('跳过 SiliconFlow 真实 API 测试：未设置 VITE_SILICONFLOW_API_KEY')
      return
    }

    const adapter = new SiliconFlowImageAdapter()
    const config: ImageModelConfig = {
      name: 'SiliconFlow Kolors Test',
      baseURL: 'https://api.siliconflow.cn/v1',
      defaultModel: 'Kwai-Kolors/Kolors',
      apiKey: apiKey,
      enabled: true,
      provider: 'siliconflow',
      imgParams: {
        size: '1024x1024',
        steps: 20,
        guidance: 7.5
      },
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    }

    const request: ImageRequest = {
      prompt: '星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，蒸汽朋克风格，科幻电影场景，高质量，细节丰富，8K分辨率，壮观震撼',
      count: 1,
      imgParams: {
        size: '1024x1024',
        steps: 20,
        guidance: 7.5
      }
    }

    const startTime = Date.now()
    const result = await adapter.generate(request, config)
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(1)

    console.log(`SiliconFlow 图像生成耗时: ${duration}秒`)
    console.log('生成结果:', JSON.stringify(result, null, 2))

    expect(result).toBeDefined()
    expect(result.data).toBeInstanceOf(Array)
    expect(result.data.length).toBe(1)
    expect(result.data[0]).toHaveProperty('url')
    expect(typeof result.data[0].url).toBe('string')
    expect(result.created).toBeGreaterThan(0)

    // 验证 URL 是否可访问
    if (result.data[0].url) {
      const response = await fetch(result.data[0].url, { method: 'HEAD' })
      expect(response.ok).toBe(true)
      console.log('图像 URL 可访问，状态码:', response.status)
    }
  })

  test('should throw error for missing API key', async () => {
    const adapter = new SiliconFlowImageAdapter()
    const config: ImageModelConfig = {
      name: 'Test Config',
      baseURL: 'https://api.siliconflow.cn/v1',
      defaultModel: 'Kwai-Kolors/Kolors',
      apiKey: '', // 空的 API Key
      enabled: true,
      provider: 'siliconflow',
      imgParams: {},
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    }

    const request: ImageRequest = {
      prompt: 'test',
      count: 1
    }

    await expect(adapter.generate(request, config)).rejects.toThrow('SiliconFlow: 缺少 API Key')
  })

  test('should throw error for missing default model', async () => {
    const adapter = new SiliconFlowImageAdapter()
    const config: ImageModelConfig = {
      name: 'Test Config',
      baseURL: 'https://api.siliconflow.cn/v1',
      defaultModel: '', // 空的默认模型
      apiKey: 'test-key',
      enabled: true,
      provider: 'siliconflow',
      imgParams: {},
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    }

    const request: ImageRequest = {
      prompt: 'test',
      count: 1
    }

    await expect(adapter.generate(request, config)).rejects.toThrow('SiliconFlow: 缺少默认模型')
  })
})