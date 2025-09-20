import OpenAI from 'openai'
import { IImageProviderAdapter, ImageModelConfig, ImageProgressHandlers, ImageRequest, ImageResult } from '../../image/types'
import { APIError, RequestConfigError } from '../../llm/errors'

export class OpenAIImageAdapter implements IImageProviderAdapter {
  public readonly capabilities = {
    edit: true, // 支持图生图编辑（文本+图片输入）
    multiImage: true, // 支持多图像输入
    asyncJob: false,
    streamingPreview: false
  }

  async generate(request: ImageRequest, config: ImageModelConfig, handlers?: ImageProgressHandlers): Promise<ImageResult> {
    if (!config.apiKey) throw new RequestConfigError('OpenAI: 缺少 API Key')
    if (!config.defaultModel) throw new RequestConfigError('OpenAI: 缺少默认模型')
    
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })

    try {
      handlers?.onProgress?.('generating')

      // 构建消息内容
      const messageContent: any[] = []
      
      // 添加文本提示
      if (request.prompt) {
        messageContent.push({
          type: "text",
          text: request.prompt
        })
      }

      // 添加输入图像（如果有）
      if (request.inputImage?.url) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: request.inputImage.url
          }
        })
      } else if (request.inputImage?.b64) {
        // 如果是 base64 图像，需要转换为 data URL
        const mimeType = request.inputImage.mimeType || 'image/png'
        const dataUrl = `data:${mimeType};base64,${request.inputImage.b64}`
        messageContent.push({
          type: "image_url",
          image_url: {
            url: dataUrl
          }
        })
      }

      console.log(`[OpenAIImageAdapter] 使用 Chat Completions API，模型: ${config.defaultModel}`)

      const response = await client.chat.completions.create({
        model: config.defaultModel,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      })

      // 从响应中提取图像
      const choice = response.choices?.[0]
      const images: { b64: string; mimeType?: string }[] = []
      
      // 检查是否有图像返回（使用类型断言处理扩展的响应格式）
      const message = choice?.message as any
      if (message?.images) {
        for (const img of message.images) {
          if (img.type === 'image_url' && img.image_url?.url) {
            const url = img.image_url.url
            // 处理 data URL 格式
            if (url.startsWith('data:')) {
              const match = url.match(/^data:([^;]+);base64,(.+)$/)
              if (match) {
                images.push({
                  b64: match[2],
                  mimeType: match[1]
                })
              }
            }
          }
        }
      }

      const result: ImageResult = {
        images,
        metadata: {
          model: config.defaultModel,
          originalPrompt: request.prompt,
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
          } : undefined
        }
      }

      console.log(`[OpenAIImageAdapter] 成功生成 ${result.images.length} 张图片`)
      handlers?.onComplete?.(result)
      return result

    } catch (err: any) {
      handlers?.onError?.(err instanceof Error ? err : new Error(err?.message || String(err)))
      throw err
    }
  }
}

