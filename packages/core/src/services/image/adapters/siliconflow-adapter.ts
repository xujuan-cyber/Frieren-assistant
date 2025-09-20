import { IImageProviderAdapter, ImageModelConfig, ImageProgressHandlers, ImageRequest, ImageResult } from '../../image/types'
import { APIError, RequestConfigError } from '../../llm/errors'
import { getProxyUrl, isDocker, isVercel } from '../../../utils/environment'

/**
 * SiliconFlow 图像生成适配器
 * 支持 Kwai-Kolors/Kolors 模型
 * API 文档: https://docs.siliconflow.cn/
 */
export class SiliconFlowImageAdapter implements IImageProviderAdapter {
  public readonly capabilities = {
    edit: true,
    multiImage: false,
    asyncJob: false,
    streamingPreview: false
  }

  async generate(request: ImageRequest, config: ImageModelConfig, handlers?: ImageProgressHandlers): Promise<ImageResult> {
    if (!config.apiKey) throw new RequestConfigError('SiliconFlow: 缺少 API Key')
    if (!config.defaultModel) throw new RequestConfigError('SiliconFlow: 缺少默认模型')

    // SiliconFlow 图像生成 API 端点
    const base = config.baseURL || 'https://api.siliconflow.cn/v1'
    const url = `${base.replace(/\/$/, '')}/images/generations`

    // 构建请求体
    const body: any = {
      model: config.defaultModel || 'Kwai-Kolors/Kolors',
      prompt: request.prompt,
      image_size: this.mapImageSize(request.imgParams?.size),
      batch_size: Math.min(request.count || 1, 4), // 限制最大为4
      num_inference_steps: request.imgParams?.steps || 20,
      guidance_scale: request.imgParams?.guidance || 7.5
    }

    // 添加可选参数
    if (request.imgParams?.negativePrompt) {
      body.negative_prompt = request.imgParams.negativePrompt
    }

    if (request.imgParams?.seed) {
      body.seed = Math.min(request.imgParams.seed, 9999999999)
    }

    // 如果有输入图像（用于图像编辑）
    if (request.imgParams?.image) {
      body.image = request.imgParams.image
    }

    // 构建代理 URL（如果需要）
    const targetUrl = isVercel() || isDocker()
      ? getProxyUrl(url, 'SILICONFLOW')
      : url

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }

    try {
      handlers?.onProgress?.({ phase: 'request', progress: 10 })

      const response = await fetch(targetUrl, requestOptions)

      handlers?.onProgress?.({ phase: 'response', progress: 50 })

      if (!response.ok) {
        const errorData = await response.text()
        throw new APIError(
          `SiliconFlow API 错误 (${response.status}): ${errorData}`,
          response.status,
          'siliconflow'
        )
      }

      const data = await response.json()

      handlers?.onProgress?.({ phase: 'processing', progress: 90 })

      // 转换响应格式
      const images = data.images?.map((img: any, index: number) => ({
        url: img.url,
        b64_json: undefined, // SiliconFlow 返回 URL，不是 base64
        revised_prompt: undefined // SiliconFlow 不返回修订后的提示词
      })) || []

      const result: ImageResult = {
        images: images.map((img: any) => ({
          url: img.url,
          mimeType: 'image/png'
        })),
        metadata: {
          model: config.defaultModel,
          created: Math.floor(Date.now() / 1000)
        }
      }

      // 添加额外信息
      if (data.timings?.inference) {
        result.metadata!.usage = {
          inference_time: data.timings.inference
        }
      }

      if (data.seed) {
        result.metadata!.seed = data.seed
      }

      handlers?.onProgress?.({ phase: 'complete', progress: 100 })
      handlers?.onComplete?.(result)

      return result

    } catch (error: any) {
      handlers?.onError?.(error)

      if (error instanceof APIError) {
        throw error
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new RequestConfigError(`SiliconFlow: 网络连接失败，请检查网络连接或 API 地址: ${error.message}`)
      }

      throw new APIError(`SiliconFlow: 请求失败: ${error.message}`, 500, 'siliconflow')
    }
  }

  /**
   * 将标准尺寸映射到 SiliconFlow 支持的格式
   */
  private mapImageSize(size?: string): string {
    if (!size) return '1024x1024'

    // 处理不同的尺寸格式
    const sizeMap: Record<string, string> = {
      // 标准格式
      '1024x1024': '1024x1024',
      '960x1280': '960x1280',
      '768x1024': '768x1024',
      '720x1440': '720x1440',
      '720x1280': '720x1280',

      // 兼容性别名
      'square': '1024x1024',
      'portrait': '768x1024',
      'landscape': '1280x720',
      '1:1': '1024x1024',
      '3:4': '768x1024',
      '4:3': '1024x768',
      '16:9': '1280x720',
      '9:16': '720x1280',
      '1:2': '720x1440'
    }

    return sizeMap[size] || '1024x1024'
  }

  /**
   * 获取支持的图像尺寸
   */
  getSupportedSizes(): string[] {
    return [
      '1024x1024',
      '960x1280',
      '768x1024',
      '720x1440',
      '720x1280'
    ]
  }

  /**
   * 检查配置是否有效
   */
  async validateConfig(config: ImageModelConfig): Promise<boolean> {
    try {
      // 构建测试请求但不实际发送
      const base = config.baseURL || 'https://api.siliconflow.cn/v1'
      const url = `${base.replace(/\/$/, '')}/images/generations`

      const testBody = {
        model: config.defaultModel || 'Kwai-Kolors/Kolors',
        prompt: 'test',
        image_size: '1024x1024',
        batch_size: 1
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testBody)
      })

      return response.ok || response.status === 400 // 400 可能是参数错误，但认证通过了

    } catch (error) {
      console.warn('SiliconFlow config validation failed:', error)
      return false
    }
  }
}