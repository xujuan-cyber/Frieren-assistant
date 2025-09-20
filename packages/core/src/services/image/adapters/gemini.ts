// 与官方文档对齐：使用 @google/genai 的 GoogleGenAI 并通过 ai.models.generateContent 调用
import { GoogleGenAI } from '@google/genai'
import { IImageProviderAdapter, ImageModelConfig, ImageProgressHandlers, ImageRequest, ImageResult } from '../../image/types'
import { APIError, RequestConfigError } from '../../llm/errors'

export class GeminiImageAdapter implements IImageProviderAdapter {
  public readonly capabilities = {
    edit: true,
    multiImage: false,
    asyncJob: false,
    streamingPreview: false
  }

  async generate(request: ImageRequest, config: ImageModelConfig, handlers?: ImageProgressHandlers): Promise<ImageResult> {
    if (!config.apiKey) throw new RequestConfigError('Gemini: 缺少 API Key')
    if (!config.defaultModel) throw new RequestConfigError('Gemini: 缺少默认模型')
    // 默认按 gemini-2.5-flash-image-preview 的逻辑调用；
    // 非该模型也放行（可能由 Google 后续新增兼容），但给出提示便于排查兼容性。
    if (config.defaultModel !== 'gemini-2.5-flash-image-preview') {
      console.warn('[GeminiImageAdapter] 非推荐模型，仍按 2.5 flash image 预览逻辑调用:', config.defaultModel)
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey })

    const outputMime: 'image/png' | 'image/jpeg' = (request.imgParams?.outputMimeType as any) || 'image/png'

    // 构造 contents（与官方文档一致）：
    // - 文生图：contents: string
    // - 图生图：contents: [{ text }, { inlineData: { mimeType, data } }]
    const contents: any = request.inputImage?.b64
      ? [
          { text: request.prompt },
          { inlineData: { mimeType: request.inputImage.mimeType || outputMime, data: request.inputImage.b64 } }
        ]
      : request.prompt

    try {
      handlers?.onProgress?.('generating')

      const res = await ai.models.generateContent({
        model: config.defaultModel,
        contents
      })

      // 检查是否被安全过滤阻止
      const response = (res as any)
      if (response?.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new APIError('Gemini: 内容被安全过滤器阻止，请调整提示词')
      }

      const parts: any[] = response?.candidates?.[0]?.content?.parts || []

      const images: { b64: string; mimeType?: string }[] = []
      const notes: string[] = []

      for (const p of parts) {
        if (p?.inlineData?.data) {
          images.push({
            b64: p.inlineData.data,
            mimeType: p.inlineData.mimeType || outputMime
          })
        } else if (typeof p?.text === 'string' && p.text.trim()) {
          notes.push(p.text.trim())
        }
      }

      if (images.length === 0) {
        // 提供更详细的错误信息
        const finishReason = response?.candidates?.[0]?.finishReason
        const errorMsg = finishReason
          ? `未返回图片数据，结束原因: ${finishReason}`
          : '未返回图片数据'
        throw new APIError(`Gemini: ${errorMsg}`)
      }

      const result: ImageResult = {
        images,
        metadata: {
          model: config.defaultModel,
          notes: notes.length ? notes : undefined,
          finishReason: response?.candidates?.[0]?.finishReason
        }
      }
      handlers?.onComplete?.(result)
      return result
    } catch (err: any) {
      const message = err?.message || String(err)
      handlers?.onError?.(err instanceof Error ? err : new Error(message))

      // 提供更友好的错误信息
      if (message.includes('API_KEY')) {
        throw new APIError('Gemini: API Key 无效或已过期')
      } else if (message.includes('SAFETY')) {
        throw new APIError('Gemini: 内容被安全过滤器阻止')
      } else if (message.includes('QUOTA')) {
        throw new APIError('Gemini: API 配额已用尽')
      }

      throw new APIError(`Gemini 调用失败: ${message}`)
    }
  }
}
