import { IImageProviderAdapter, ImageModelConfig, ImageProgressHandlers, ImageRequest, ImageResult } from '../../image/types'
import { APIError, RequestConfigError } from '../../llm/errors'
import { getProxyUrl, isDocker, isVercel } from '../../../utils/environment'

export class SeedreamImageAdapter implements IImageProviderAdapter {
  public readonly capabilities = {
    edit: true,
    multiImage: false,
    asyncJob: false,
    streamingPreview: false
  }

  async generate(request: ImageRequest, config: ImageModelConfig, handlers?: ImageProgressHandlers): Promise<ImageResult> {
    if (!config.apiKey) throw new RequestConfigError('Seedream: 缺少 API Key')
    if (!config.defaultModel) throw new RequestConfigError('Seedream: 缺少默认模型')

    // 火山方舟图像生成 API 端点
    const base = config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3'
    const url = `${base.replace(/\/$/, '')}/images/generations`

    // 构建请求体
    const payload: any = {
      model: config.defaultModel, // 例如: doubao-seedream-4-0-250828
      prompt: request.prompt,
      response_format: 'b64_json', // 固定使用 base64 格式
      stream: false,
      watermark: false
    }

    // 图生图支持：仅支持单图输入
    if (request.inputImage?.b64) {
      const mime = (request.inputImage.mimeType || request.imgParams?.outputMimeType || 'image/png').toLowerCase()
      // 火山方舟要求使用 data URI 格式
      payload.image = `data:${mime};base64,${request.inputImage.b64}`
      // 图生图时禁用序列生成
      payload.sequential_image_generation = 'disabled'
    } else if (request.inputImage?.url) {
      // 虽然规范要求"仅本地文件"，此处兼容 URL（如后续 UI 开启 URL 输入）
      payload.image = request.inputImage.url
      payload.sequential_image_generation = 'disabled'
    }

    // 尺寸参数 - 火山方舟支持的尺寸格式
    if (request.imgParams?.size) {
      // 支持如 "1024x1024", "1K", "2K" 等格式
      payload.size = request.imgParams.size
    } else if (request.imgParams?.width && request.imgParams?.height) {
      // 转换为火山方舟支持的尺寸格式
      payload.size = `${request.imgParams.width}x${request.imgParams.height}`
    }

    // 生成数量 - 确保符合API限制
    if (request.count && request.count > 1) {
      payload.n = Math.min(request.count, 4) // 限制最多4张
    }

    // 高级参数 - 根据模型能力添加
    // 4.0 不支持 seed/guidance_scale，仅 3.0/seededit 支持
    const modelId = (config.defaultModel || '').toLowerCase()
    const supportsSeed = modelId.includes('seedream-3.0') || modelId.includes('seededit-3.0')
    if (supportsSeed) {
      if (typeof request.imgParams?.seed === 'number') {
        payload.seed = request.imgParams.seed
      }
      if (typeof request.imgParams?.guidance_scale === 'number') {
        payload.guidance_scale = Math.max(1.0, Math.min(20.0, request.imgParams.guidance_scale))
      }
    }

    // 质量设置
    if (request.imgParams?.quality) {
      payload.quality = request.imgParams.quality
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }

    // 添加用户代理
    if (typeof window === 'undefined') {
      headers['User-Agent'] = 'Prompt-Optimizer/1.0'
    }

    try {
      handlers?.onProgress?.('generating')

      // 代理处理（与现有策略一致）
      let requestUrl = url
      if (config.useVercelProxy === true && isVercel()) {
        requestUrl = getProxyUrl(url, false)
      } else if (config.useDockerProxy === true && isDocker()) {
        requestUrl = getProxyUrl(url, false)
      }

      console.log(`[SeedreamImageAdapter] 请求 ${requestUrl} 使用模型 ${config.defaultModel}`)

      const resp = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        // 设置合理的超时时间 (图像生成通常较慢)
        signal: AbortSignal.timeout(120000) // 2分钟超时
      })

      if (!resp.ok) {
        let errorMessage: string
        try {
          const errorData = await resp.json()
          errorMessage = errorData?.error?.message || errorData?.message || resp.statusText
        } catch {
          errorMessage = await resp.text().catch(() => resp.statusText)
        }

        // 处理常见错误
        if (resp.status === 401) {
          throw new APIError('Seedream: API Key 无效或已过期')
        } else if (resp.status === 429) {
          throw new APIError('Seedream: 请求频率过高，请稍后重试')
        } else if (resp.status === 400) {
          throw new APIError(`Seedream: 请求参数无效 - ${errorMessage}`)
        } else if (resp.status >= 500) {
          throw new APIError(`Seedream: 服务器错误 (${resp.status}) - ${errorMessage}`)
        }

        throw new APIError(`Seedream HTTP ${resp.status}: ${errorMessage}`)
      }

      const data = await resp.json()

      // 解析响应数据
      const list: any[] = Array.isArray(data?.data) ? data.data : []
      if (list.length === 0 && data?.data) {
        // 如果不是数组，尝试作为单个对象处理
        list.push(data.data)
      }

      const images: { b64: string; mimeType?: string }[] = []
      const notes: string[] = []

      for (const item of list) {
        if (item?.b64_json) {
          images.push({
            b64: item.b64_json,
            mimeType: 'image/png' // 火山方舟通常返回PNG格式
          })
        } else if (item?.url) {
          // 如果返回URL，需要额外处理转换为base64
          notes.push('警告: 返回了URL格式，需要额外处理转换为base64')
        } else if (item?.error) {
          const errorMsg = item.error?.message || item.error?.code || 'Unknown item error'
          notes.push(`生成失败: ${errorMsg}`)
        }
      }

      // 检查是否有成功的图片生成
      if (images.length === 0) {
        const errorMsg = notes.length > 0
          ? `生成失败: ${notes.join('; ')}`
          : '未返回图片数据'
        throw new APIError(`Seedream: ${errorMsg}`)
      }

      // 构建结果
      const result: ImageResult = {
        images,
        metadata: {
          model: config.defaultModel,
          notes: notes.length ? notes : undefined,
          usage: data?.usage, // 包含用量信息
          created: data?.created
        }
      }

      console.log(`[SeedreamImageAdapter] 成功生成 ${images.length} 张图片`)
      handlers?.onComplete?.(result)
      return result

    } catch (err: any) {
      const message = err?.message || String(err)
      handlers?.onError?.(err instanceof Error ? err : new Error(message))

      // 提供更友好的错误信息
      if (message.includes('timeout') || message.includes('TIMEOUT')) {
        throw new APIError('Seedream: 生成超时，请稍后重试')
      } else if (message.includes('network') || message.includes('fetch')) {
        throw new APIError('Seedream: 网络连接失败，请检查网络设置')
      }

      throw new APIError(`Seedream 调用失败: ${message}`)
    }
  }
}
