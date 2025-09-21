import { describe, test, expect } from 'vitest'
import { SiliconFlowImageAdapter } from '../../src/services/image/adapters/siliconflow'
import { ImageRequest, ImageModelConfig } from '../../src/services/image/types'

const RUN_REAL_API = process.env.RUN_REAL_API === '1'

describe.skipIf(!RUN_REAL_API)('SiliconFlowImageAdapter Integration Test', () => {
  test('should generate image with SiliconFlow API', async () => {
    // 获取 API Key
    const apiKey = process.env.VITE_SILICONFLOW_API_KEY
    if (!apiKey) {
      console.log('⏸️ 跳过 SiliconFlow 真实 API 测试：未设置 VITE_SILICONFLOW_API_KEY 环境变量')
      return
    }

    console.log('🚀 开始 SiliconFlow 图像生成测试...')
    console.log('API Key:', apiKey.substring(0, 20) + '...')

    const adapter = new SiliconFlowImageAdapter()
    const config: ImageModelConfig = {
      id: 'siliconflow-integration',
      name: 'SiliconFlow Kolors Test',
      providerId: 'siliconflow',
      modelId: 'Kwai-Kolors/Kolors',
      enabled: true,
      connectionConfig: { apiKey, baseURL: 'https://api.siliconflow.cn/v1' },
      paramOverrides: { image_size: '1024x1024', num_inference_steps: 20, guidance_scale: 7.5 }
    } as any

    const request: ImageRequest = {
      prompt: '星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，蒸汽朋克风格，科幻电影场景，高质量，细节丰富，8K分辨率，壮观震撼',
      count: 1,
      configId: 'siliconflow-integration',
      paramOverrides: { image_size: '1024x1024', num_inference_steps: 20, guidance_scale: 7.5 }
    }

    console.log('📝 请求参数:', JSON.stringify({
      prompt: request.prompt.substring(0, 50) + '...',
      count: request.count,
      imgParams: request.imgParams
    }, null, 2))

    const startTime = Date.now()

    try {
      const result = await adapter.generate(request, config)
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(1)

      console.log(`✅ SiliconFlow 图像生成成功！耗时: ${duration}秒`)
      console.log('📊 生成结果概览:', {
        imageCount: result.images.length,
        created: result.metadata?.created,
        usage: result.metadata?.usage
      })

      // 详细结果
      console.log('🎨 生成的图像:', result.images.map((img, index) => ({
        index: index + 1,
        hasUrl: !!img.url,
        urlLength: img.url?.length,
        hasB64: !!img.b64
      })))

      // 断言验证
      expect(result).toBeDefined()
      expect(Array.isArray(result.images)).toBe(true)
      expect(result.images.length).toBe(1)
      expect(result.images[0]).toHaveProperty('url')
      expect(typeof result.images[0].url).toBe('string')

      // 注：不再进行 HEAD 请求可访问性测试，以避免外部存储/CDN 差异导致用例不稳定

      console.log('🎉 SiliconFlow API 测试完全成功!')

    } catch (error: any) {
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(1)

      console.error('❌ SiliconFlow API 测试失败 (耗时 ' + duration + '秒):')
      console.error('错误类型:', error.constructor.name)
      console.error('错误消息:', error.message)

      if (error.stack) {
        console.error('错误堆栈:', error.stack.split('\n').slice(0, 5).join('\n'))
      }

      throw error
    }
  }, 60000) // 60秒超时
})
