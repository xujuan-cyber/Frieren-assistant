import { describe, test, expect } from 'vitest'
import { SiliconFlowImageAdapter } from '../../src/services/image/adapters/siliconflow-adapter'
import { ImageRequest, ImageModelConfig } from '../../src/services/image/types'

describe('SiliconFlowImageAdapter Integration Test', () => {
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
        dataLength: result.data.length,
        created: new Date(result.created * 1000).toLocaleString(),
        seed: result.seed,
        usage: result.usage
      })

      // 详细结果
      console.log('🎨 生成的图像:', result.data.map((img, index) => ({
        index: index + 1,
        hasUrl: !!img.url,
        urlLength: img.url?.length,
        hasB64: !!img.b64_json,
        revisedPrompt: img.revised_prompt
      })))

      // 断言验证
      expect(result).toBeDefined()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBe(1)
      expect(result.data[0]).toHaveProperty('url')
      expect(typeof result.data[0].url).toBe('string')
      expect(result.created).toBeGreaterThan(0)

      // 验证 URL 是否可访问
      if (result.data[0].url) {
        console.log('🔗 验证图像URL可访问性...')
        const urlCheckStart = Date.now()
        const response = await fetch(result.data[0].url, { method: 'HEAD' })
        const urlCheckTime = Date.now() - urlCheckStart

        console.log(`🌐 URL访问检查: ${response.status} (${urlCheckTime}ms)`)
        expect(response.ok).toBe(true)

        if (response.headers.get('content-length')) {
          const sizeKB = Math.round(parseInt(response.headers.get('content-length')!) / 1024)
          console.log(`📎 图像文件大小: ${sizeKB}KB`)
        }
      }

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