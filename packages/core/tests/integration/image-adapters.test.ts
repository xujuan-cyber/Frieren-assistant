import { describe, it, expect, beforeAll } from 'vitest'
import { ImageService } from '../../src/services/image/service'
import { ImageModelManager } from '../../src/services/image-model/manager'
import { LocalStorageProvider } from '../../src/services/storage/localStorageProvider'
import type { ImageRequest, ImageModelConfig } from '../../src/services/image/types'

/**
 * 图像适配器真实API集成测试
 * 只有在相应的环境变量存在时才执行
 */
describe('Image Adapters Real API Integration Tests', () => {
  const hasGeminiKey = !!process.env.VITE_GEMINI_API_KEY
  const hasOpenAIKey = !!process.env.VITE_OPENAI_API_KEY
  const hasSeedreamKey = !!(process.env.VITE_SEEDREAM_API_KEY || process.env.VITE_ARK_API_KEY || process.env.ARK_API_KEY)

  let storage: LocalStorageProvider
  let imageModelManager: ImageModelManager
  let imageService: ImageService

  beforeAll(() => {
    console.log('图像生成API密钥检查:', {
      GEMINI_API_KEY: hasGeminiKey,
      OPENAI_API_KEY: hasOpenAIKey,
      SEEDREAM_API_KEY: hasSeedreamKey
    })

    if (!hasGeminiKey && !hasOpenAIKey && !hasSeedreamKey) {
      console.log('跳过图像适配器真实API测试：未设置任何API密钥环境变量')
    }
  })

  beforeEach(async () => {
    storage = new LocalStorageProvider()
    imageModelManager = new ImageModelManager(storage)
    imageService = new ImageService(imageModelManager)

    await storage.clearAll()
  })

  describe('Gemini 图像适配器测试', () => {
    const runGeminiTests = hasGeminiKey

    it.runIf(runGeminiTests)('应该能使用Gemini 2.5 Flash Image生成图像', async () => {
      // 添加Gemini图像模型
      const geminiModel: ImageModelConfig = {
        name: 'Gemini 2.5 Flash Image',
        baseURL: undefined,
        apiKey: process.env.VITE_GEMINI_API_KEY!,
        defaultModel: 'gemini-2.5-flash-image-preview',
        enabled: true,
        provider: 'gemini',
        imgParams: {
          outputMimeType: 'image/png'
        }
      }
      await imageModelManager.addModel('test-gemini-fast', geminiModel)

      // 生成图像
      const request: ImageRequest = {
        prompt: 'A beautiful sunset over the ocean with calm waves',
        count: 1,
        imgParams: {
          outputMimeType: 'image/png'
        }
      }

      const result = await imageService.generate(request, 'test-gemini-fast')

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.images[0].mimeType).toBe('image/png')
      expect(result.metadata?.model).toBe('gemini-2.5-flash-image-preview')
    }, 60000)

    // 仅支持 gemini-2.5-flash-image-preview，不再测试 Imagen 3.x

    it.skipIf(!runGeminiTests)('跳过Gemini测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('OpenAI DALL-E 适配器测试', () => {
    const runOpenAITests = hasOpenAIKey

    it.runIf(runOpenAITests)('应该能使用DALL-E 3生成图像', async () => {
      // 添加DALL-E 3模型
      const dalle3Model: ImageModelConfig = {
        name: 'DALL-E 3',
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.VITE_OPENAI_API_KEY!,
        defaultModel: 'dall-e-3',
        enabled: true,
        provider: 'openai',
        imgParams: {
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        }
      }
      await imageModelManager.addModel('test-dalle3', dalle3Model)

      // 生成图像
      const request: ImageRequest = {
        prompt: 'A robot playing chess in a garden',
        count: 1,
        imgParams: {
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        }
      }

      const result = await imageService.generate(request, 'test-dalle3')

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.metadata?.model).toBe('dall-e-3')
    }, 60000)

    it.runIf(runOpenAITests)('应该能使用DALL-E 2生成图像', async () => {
      // 添加DALL-E 2模型
      const dalle2Model: ImageModelConfig = {
        name: 'DALL-E 2',
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.VITE_OPENAI_API_KEY!,
        defaultModel: 'dall-e-2',
        enabled: true,
        provider: 'openai',
        imgParams: {
          size: '1024x1024'
        }
      }
      await imageModelManager.addModel('test-dalle2', dalle2Model)

      // 生成图像
      const request: ImageRequest = {
        prompt: 'A magical forest with glowing mushrooms',
        count: 1,
        imgParams: {
          size: '1024x1024'
        }
      }

      const result = await imageService.generate(request, 'test-dalle2')

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.metadata?.model).toBe('dall-e-2')
    }, 60000)

    it.skipIf(!runOpenAITests)('跳过OpenAI DALL-E测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('Seedream (火山方舟) 适配器测试', () => {
    const runSeedreamTests = hasSeedreamKey

    it.runIf(runSeedreamTests)('应该能使用Doubao Seedream 4.0生成图像', async () => {
      // 添加Seedream模型 - 使用与 curl 示例匹配的参数
      const seedreamApiKey = process.env.VITE_SEEDREAM_API_KEY ||
                            process.env.VITE_ARK_API_KEY ||
                            process.env.ARK_API_KEY
      const seedreamModel: ImageModelConfig = {
        name: 'Doubao Seedream 4.0',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: seedreamApiKey!,
        defaultModel: 'doubao-seedream-4-0-250828',
        enabled: true,
        provider: 'seedream',
        imgParams: {
          size: '2K', // 匹配 curl 示例
          watermark: false, // 匹配 curl 示例
          outputMimeType: 'image/png'
        }
      }
      await imageModelManager.addModel('test-seedream', seedreamModel)

      // 生成图像 - 使用你提供的复杂科幻提示词
      const request: ImageRequest = {
        prompt: '星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，动感，对比色，oc渲染，光线追踪，动态模糊，景深，超现实主义，深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，质感真实，暗黑风背景的光影效果营造出氛围，整体兼具艺术幻想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬',
        count: 1,
        imgParams: {
          size: '2K',
          watermark: false,
          outputMimeType: 'image/png'
        }
      }

      const result = await imageService.generate(request, 'test-seedream')

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.images[0].mimeType).toBe('image/png') // 验证MIME类型
      expect(result.metadata?.model).toBe('doubao-seedream-4-0-250828')

      // 打印一些调试信息
      console.log(`[测试] 成功生成图像，base64长度: ${result.images[0].b64.length}`)
      console.log(`[测试] 模型: ${result.metadata?.model}`)
      if (result.metadata?.notes) {
        console.log(`[测试] 注释: ${result.metadata.notes.join('; ')}`)
      }
    }, 120000) // 增加超时到120秒

    it.skipIf(!runSeedreamTests)('跳过Seedream测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('图像服务错误处理测试', () => {
    const runErrorTests = hasGeminiKey || hasOpenAIKey || hasSeedreamKey

    it.runIf(runErrorTests)('应该能正确处理无效的API密钥', async () => {
      // 添加一个有无效API密钥的模型
      const invalidModel: ImageModelConfig = {
        name: 'Invalid Model',
        baseURL: hasGeminiKey ? undefined : 'https://api.openai.com/v1',
        apiKey: 'invalid-key',
        defaultModel: hasGeminiKey ? 'gemini-2.5-flash-image-preview' : 'dall-e-3',
        enabled: true,
        provider: hasGeminiKey ? 'gemini' : 'openai'
      }
      await imageModelManager.addModel('invalid-model', invalidModel)

      // 尝试生成图像应该失败
      const request: ImageRequest = {
        prompt: 'Test image generation',
        count: 1
      }

      await expect(imageService.generate(request, 'invalid-model')).rejects.toThrow()
    }, 30000)

    it.skipIf(!runErrorTests)('跳过错误处理测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('多图像生成测试', () => {
    const runMultiImageTests = hasOpenAIKey // 使用OpenAI进行多图像测试，因为DALL-E支持较好

    it.runIf(runMultiImageTests)('应该能生成多张图像', async () => {
      // 添加DALL-E 2模型（更稳定）
      const dalle2Model: ImageModelConfig = {
        name: 'DALL-E 2 Multi',
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.VITE_OPENAI_API_KEY!,
        defaultModel: 'dall-e-2',
        enabled: true,
        provider: 'openai'
      }
      await imageModelManager.addModel('test-dalle2-multi', dalle2Model)

      // 生成2张图像
      const request: ImageRequest = {
        prompt: 'A simple geometric pattern',
        count: 2,
        imgParams: {
          size: '256x256' // 使用较小尺寸以节省时间和费用
        }
      }

      const result = await imageService.generate(request, 'test-dalle2-multi')

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(2)
      result.images.forEach(image => {
        expect(image.b64).toBeDefined()
        expect(image.b64.length).toBeGreaterThan(100)
      })
    }, 120000) // 多图像生成需要更长时间

    it.skipIf(!runMultiImageTests)('跳过多图像测试 - 未设置OpenAI API密钥', () => {
      expect(true).toBe(true)
    })
  })
})
