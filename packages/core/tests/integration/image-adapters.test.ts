import { describe, it, expect, beforeAll } from 'vitest'
import { ImageService } from '../../src/services/image/service'
import { ImageModelManager } from '../../src/services/image-model/manager'
import { createImageAdapterRegistry } from '../../src/services/image/adapters/registry'
import { LocalStorageProvider } from '../../src/services/storage/localStorageProvider'
import type { ImageRequest, ImageModelConfig } from '../../src/services/image/types'

/**
 * 图像适配器真实API集成测试
 * 只有在相应的环境变量存在时才执行
 */
const RUN_REAL_API = process.env.RUN_REAL_API === '1'

describe.skipIf(!RUN_REAL_API)('Image Adapters Real API Integration Tests', () => {
  const hasGeminiKey = !!process.env.VITE_GEMINI_API_KEY
  const hasOpenAIKey = !!process.env.VITE_OPENAI_API_KEY
  const hasOpenRouterKey = !!process.env.VITE_OPENROUTER_API_KEY
  const hasSeedreamKey = !!(process.env.VITE_SEEDREAM_API_KEY || process.env.VITE_ARK_API_KEY || process.env.ARK_API_KEY)

  let storage: LocalStorageProvider
  let imageModelManager: ImageModelManager
  let imageService: ImageService
  let registry: ReturnType<typeof createImageAdapterRegistry>

  beforeAll(() => {
    console.log('图像生成API密钥检查:', {
      GEMINI_API_KEY: hasGeminiKey,
      OPENAI_API_KEY: hasOpenAIKey,
      OPENROUTER_API_KEY: hasOpenRouterKey,
      SEEDREAM_API_KEY: hasSeedreamKey
    })

    if (!hasGeminiKey && !hasOpenAIKey && !hasOpenRouterKey && !hasSeedreamKey) {
      console.log('跳过图像适配器真实API测试：未设置任何API密钥环境变量')
    }
  })

  beforeEach(async () => {
    storage = new LocalStorageProvider()
    registry = createImageAdapterRegistry()
    imageModelManager = new ImageModelManager(storage, registry)
    imageService = new ImageService(imageModelManager, registry)

    await storage.clearAll()
  })

  describe('Gemini 图像适配器测试', () => {
    const runGeminiTests = hasGeminiKey

    it.runIf(runGeminiTests)('应该能使用Gemini 2.5 Flash Image生成图像', async () => {
      // 添加Gemini图像模型
      const geminiConfig: ImageModelConfig = {
        id: 'test-gemini-fast',
        name: 'Gemini 2.5 Flash Image',
        providerId: 'gemini',
        modelId: 'gemini-2.5-flash-image-preview',
        enabled: true,
        connectionConfig: { apiKey: process.env.VITE_GEMINI_API_KEY! },
        paramOverrides: { outputMimeType: 'image/png' }
      } as any
      await imageModelManager.addConfig(geminiConfig)

      // 生成图像
      const request: ImageRequest = {
        prompt: 'A beautiful sunset over the ocean with calm waves',
        count: 1,
        configId: 'test-gemini-fast',
        paramOverrides: { outputMimeType: 'image/png' }
      }

      const result = await imageService.generate(request)

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.images[0].mimeType).toBe('image/png')
      expect(result.metadata?.modelId).toBe('gemini-2.5-flash-image-preview')
    }, 60000)

    // 仅支持 gemini-2.5-flash-image-preview，不再测试 Imagen 3.x

    it.skipIf(!runGeminiTests)('跳过Gemini测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('OpenRouter 图像适配器测试', () => {
    const runOpenRouterTests = hasOpenRouterKey

    it.runIf(runOpenRouterTests)('应该能使用OpenRouter Gemini 2.5 Flash Image生成图像', async () => {
      // 添加OpenRouter模型
      const openrouterConfig: ImageModelConfig = {
        id: 'test-openrouter',
        name: 'OpenRouter Gemini 2.5 Flash Image',
        providerId: 'openrouter',
        modelId: 'google/gemini-2.5-flash-image-preview',
        enabled: true,
        connectionConfig: { apiKey: process.env.VITE_OPENROUTER_API_KEY!, baseURL: 'https://openrouter.ai/api/v1' },
        paramOverrides: {}
      } as any
      await imageModelManager.addConfig(openrouterConfig)

      // 生成图像
      const request: ImageRequest = {
        prompt: 'A peaceful garden with blooming flowers and a small pond',
        count: 1,
        configId: 'test-openrouter',
        paramOverrides: {}
      }

      const result = await imageService.generate(request)

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.images[0].mimeType).toBe('image/png')
      expect(result.metadata?.modelId).toBe('google/gemini-2.5-flash-image-preview')

      // 打印调试信息
      console.log(`[OpenRouter测试] 成功生成图像，base64长度: ${result.images[0].b64.length}`)
      console.log(`[OpenRouter测试] 模型: ${result.metadata?.modelId}`)
      if (result.text) {
        console.log(`[OpenRouter测试] 文本输出: ${result.text}`)
      }
    }, 60000)

    it.runIf(runOpenRouterTests)('应该能使用OpenRouter进行图生图', async () => {
      // 添加OpenRouter模型
      const openrouterModel: ImageModelConfig = {
        name: 'OpenRouter Gemini 2.5 Flash Image',
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.VITE_OPENROUTER_API_KEY!,
        defaultModel: 'google/gemini-2.5-flash-image-preview',
        enabled: true,
        provider: 'openrouter',
        imgParams: {} // OpenRouter 不需要额外参数
      }
      // 复用同一配置进行图生图
      await imageModelManager.addConfig({
        id: 'test-openrouter-i2i',
        name: 'OpenRouter I2I',
        providerId: 'openrouter',
        modelId: 'google/gemini-2.5-flash-image-preview',
        enabled: true,
        connectionConfig: { apiKey: process.env.VITE_OPENROUTER_API_KEY!, baseURL: 'https://openrouter.ai/api/v1' },
        paramOverrides: {}
      } as any)

      // 使用测试图像进行图生图
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAABGVJREFUeJztm01oXFUUx3/vzZtJMmnapPWjraZN/SCNrS200KKgIGhBXYhQcOHChYJbwY3gQnDhwoWgi4ILQRFciCCCC1sQwYKLii1YC1ppbWsb29Sm+Zg0mWTevHfvcefOm8nMm5lk3ryZvPwgvHvfO+fcO//cc8+79wZCQkJCQkJCQrZJAC5wC3gd+B54HfgCuO7ad4C/KsuLtR3E6gFvAH1AAiwDPwBLwBzwmXveaH4H8ASwF7yfawNYBL4Cfq7VPrMF3AVcB/qATdJ6x8CXwNEa+x6qY8BDwG/AADAKzAJZYMLN7zMfnCYA4G3gJDAJzAO9wPfAEPCKG7vE6sYAfAK8BOwDFoC7gVHgWWARsL0VX6wGYANYBnYCu4BjQMIVKyfdcxH4FrgJfOiOHnAM+BWwgZNAGhjw4rZZM4BF4BzwJ3DCjUWkqaXABeAi8CKQAl4DFoATwB1uxd8wCxQZ0XPBYuAJoO3DfOOZjhvAOeB5V6SdABYZWKkNwAbwDLAKnDZP7Qa+Av4Gzo/xH7IbuOJe+yTwByvBr+3VwxrrQKvkL+Bf4LE2VsU8cBGYIIKfuxRFJiYJAL9nE8zf/M2zW/Ll7zqgBBxoY1XMAmNE8HOXothNJiYJAL9hE9wdGF4IcVlmNPqfk4QsXFkCQu3fBrAjQNVsChFJ6CeS4CaZJqAnQNVsChFZeECCm0y9N0AAGElwk1lTSewNUDWbQkQS3GQaeIsAngBUsyn0E0lwk1lN6NeB3jZWxZOElIQHUC8J/UQS3GRqQh8E2hnfVBL7Atb9phGRhAckuMnUhD4A/N3GqlCShJ5NMMGJJLjJ1AT3AXOEVJS7Qcrb2zhGJMFNpiZ0P/APcG+AqtkUIpLgJlMT2gfs3SaP5N8EEnwP8Kf7gGFgO8x0xyUhK+Dre4K6o82g0o4h2zDTbVpHyMrLanxT9AV9a9VpQWgJV1HKBq4CqeKG6KbL9bbN3OVqw7q1W8gMlLOHh40TzE0hKwqjbO6qFJO5sn+OE9u0JnQGJiXJ1mKdR/gSF5Z9E0ywFaHbXGDEg4j8WjSC7hJyIcmP0SjMCWElwW0MEUH0s4k4zWuIyGKFmGDl5aBGdI/9/8mABDeZmtB7gV4iekKT2BNwD7DfYx4+W5JZd1fI0xDKq+qJakTi0xRzMKTGsR7eI+J9gptMTWg/+Ku6tSXhEt7hCTfgJXjX6wa8hBfwxVPgaLW8hNeUbDK7hVxuLcLVF0zSh3R+Q/hsKIr2+zZLT8jnJOQ7wn5H2O8I+x1hvyPsd4T9jrDfEfY7wn5H2O8I+x1hvyPsd4T9jrDfEfY7wn5H2O8I+x1hfZKwvyVd10ukBOvMNeAj4B9gAnh3+wfbEy9TZx+c7R+Ay3Q2v1ek3gJOufblO7/YnphrCfn8Yr0F7HOfgG35j5tOpK4+GWfA6y4y5ePa8t0v4wyY8pq/Am9tQ10hISEhISEhIaFo/gOE5C7Cek1g0wAAAABJRU5ErkJggg=='

      // 图生图请求
      const request: ImageRequest = {
        prompt: 'Transform this image into a vibrant watercolor painting',
        count: 1,
        imgParams: {},  // OpenRouter 不需要额外参数
        inputImage: {
          b64: testImageBase64,
          mimeType: 'image/png'
        }
      }

      const result = await imageService.generate({ ...request, configId: 'test-openrouter-i2i' })

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].b64).toBeDefined()
      expect(result.images[0].b64.length).toBeGreaterThan(100)
      expect(result.metadata?.modelId).toBe('google/gemini-2.5-flash-image-preview')

      // 打印调试信息
      console.log(`[OpenRouter图生图测试] 成功生成图像，base64长度: ${result.images[0].b64.length}`)
    }, 90000) // 图生图可能需要更长时间

    it.skipIf(!runOpenRouterTests)('跳过OpenRouter测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  // 已不支持 DALL-E 系列模型，移除相关测试

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
      await imageModelManager.addConfig({
        id: 'test-seedream',
        name: 'Doubao Seedream 4.0',
        providerId: 'seedream',
        modelId: 'doubao-seedream-4-0-250828',
        enabled: true,
        connectionConfig: { apiKey: seedreamApiKey!, baseURL: 'https://ark.cn-beijing.volces.com/api/v3' },
        paramOverrides: { size: '2K', watermark: false, outputMimeType: 'image/png' }
      } as any)

      // 生成图像 - 使用你提供的复杂科幻提示词
      const request: ImageRequest = {
        prompt: '星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，动感，对比色，oc渲染，光线追踪，动态模糊，景深，超现实主义，深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，质感真实，暗黑风背景的光影效果营造出氛围，整体兼具艺术幻想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬',
        count: 1,
        configId: 'test-seedream',
        paramOverrides: { size: '2K', watermark: false, outputMimeType: 'image/png' }
      }

      const result = await imageService.generate(request)

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
      expect(result.images[0].url || result.images[0].b64).toBeTruthy()
      expect(result.images[0].mimeType).toBe('image/png') // 验证MIME类型
      expect(result.metadata?.modelId).toBe('doubao-seedream-4-0-250828')

      // 打印一些调试信息
      console.log(`[测试] 成功生成图像，base64长度: ${result.images[0].b64?.length || 0}`)
      console.log(`[测试] 模型: ${result.metadata?.modelId}`)
      if (result.metadata?.notes) {
        console.log(`[测试] 注释: ${result.metadata.notes.join('; ')}`)
      }
    }, 120000) // 增加超时到120秒

    it.skipIf(!runSeedreamTests)('跳过Seedream测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('图像服务错误处理测试', () => {
    const runErrorTests = hasGeminiKey || hasOpenAIKey || hasOpenRouterKey || hasSeedreamKey

    it.runIf(runErrorTests)('应该能正确处理无效的API密钥', async () => {
      // 添加一个有无效API密钥的模型
      await imageModelManager.addConfig({
        id: 'invalid-model',
        name: 'Invalid Model',
        providerId: hasGeminiKey ? 'gemini' : 'openai',
        modelId: hasGeminiKey ? 'gemini-2.5-flash-image-preview' : 'dall-e-3',
        enabled: true,
        connectionConfig: { apiKey: 'invalid-key', baseURL: hasGeminiKey ? undefined : 'https://api.openai.com/v1' } as any,
        paramOverrides: {}
      } as any)

      // 尝试生成图像应该失败
      const request: ImageRequest = {
        prompt: 'Test image generation',
        count: 1,
        configId: 'invalid-model'
      }

      await expect(imageService.generate(request)).rejects.toThrow()
    }, 30000)

    it.skipIf(!runErrorTests)('跳过错误处理测试 - 未设置API密钥', () => {
      expect(true).toBe(true)
    })
  })

  describe('多图像生成测试', () => {
    const runMultiImageTests = false // 已不支持多图

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
      await imageModelManager.addConfig({
        id: 'test-dalle2-multi',
        name: 'DALL-E 2 Multi',
        providerId: 'openai',
        modelId: 'dall-e-2',
        enabled: true,
        connectionConfig: { apiKey: process.env.VITE_OPENAI_API_KEY!, baseURL: 'https://api.openai.com/v1' },
        paramOverrides: {}
      } as any)

      // 生成2张图像
      const request: ImageRequest = {
        prompt: 'A simple geometric pattern',
        count: 2,
        imgParams: {
          size: '256x256' // 使用较小尺寸以节省时间和费用
        }
      }

      const result = await imageService.generate({ ...request, configId: 'test-dalle2-multi', count: 1 })

      expect(result).toBeDefined()
      expect(result.images).toBeDefined()
      expect(result.images.length).toBe(1)
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
