import { IImageModelManager, ImageRequest, ImageResult, IImageService, IImageAdapterRegistry, ImageModelConfig, ImageModel } from './types'
import { createImageAdapterRegistry } from './adapters/registry'
import { RequestConfigError } from '../llm/errors'

export class ImageService implements IImageService {
  private readonly registry: IImageAdapterRegistry
  private readonly imageModelManager: IImageModelManager

  constructor(imageModelManager: IImageModelManager, registry?: IImageAdapterRegistry) {
    this.imageModelManager = imageModelManager
    this.registry = registry ?? createImageAdapterRegistry()
  }

  async validateRequest(request: ImageRequest): Promise<void> {
    // 验证基本字段
    if (!request?.prompt || !request.prompt.trim()) {
      throw new RequestConfigError('图像生成: 提示词不能为空')
    }

    if (!request?.configId || !request.configId.trim()) {
      throw new RequestConfigError('图像生成: 配置ID不能为空')
    }

    // 验证配置是否存在且启用
    const config = await this.imageModelManager.getConfig(request.configId)
    if (!config) {
      throw new RequestConfigError(`图像生成: 配置不存在: ${request.configId}`)
    }
    if (!config.enabled) {
      throw new RequestConfigError(`图像生成: 配置未启用: ${config.name}`)
    }

    // 快速验证：仅检查提供商是否存在（本地操作）
    try {
      this.registry.getAdapter(config.providerId)
    } catch (error) {
      throw new RequestConfigError(`图像生成: 提供商不存在: ${config.providerId}`)
    }

    // 获取静态模型信息进行基础验证（避免网络请求）
    const staticModels = this.registry.getStaticModels(config.providerId)
    const model = staticModels.find(m => m.id === config.modelId)

    // 如果静态模型中找不到，不抛出错误，让实际生成时处理
    // 这样支持动态模型，同时避免不必要的网络请求
    if (model) {
      // 验证模型能力与请求的匹配性（仅当找到静态模型时）
      if (request.inputImage && !model.capabilities.image2image) {
        throw new RequestConfigError(`图像生成: 模型 ${model.name} 不支持图生图功能`)
      }
      if (!request.inputImage && !model.capabilities.text2image) {
        throw new RequestConfigError(`图像生成: 模型 ${model.name} 不支持文生图功能`)
      }
    }

    // 验证输入图像格式
    if (request.inputImage?.b64 && typeof request.inputImage.b64 !== 'string') {
      throw new RequestConfigError('图像生成: 输入图片格式无效')
    }

    // 验证生成数量（仅支持单图）
    const count = request.count ?? 1
    if (count !== 1) {
      throw new RequestConfigError('图像生成: 仅支持生成 1 张')
    }

    // 验证输入图像MIME类型和大小
    if (request.inputImage?.b64) {
      const mime = (request.inputImage.mimeType || '').toLowerCase()
      if (mime && mime !== 'image/png' && mime !== 'image/jpeg') {
        throw new RequestConfigError('图像生成: 仅支持 PNG 或 JPEG 格式')
      }

      // 估算 base64 大小：每4字符≈3字节，去除末尾填充
      const len = request.inputImage.b64.length
      const padding = (request.inputImage.b64.endsWith('==') ? 2 : request.inputImage.b64.endsWith('=') ? 1 : 0)
      const bytes = Math.floor(len * 3 / 4) - padding
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (bytes > maxSize) {
        throw new RequestConfigError('图像生成: 输入图片大小不能超过 10MB')
      }
    }
  }

  async generate(request: ImageRequest): Promise<ImageResult> {
    // 验证请求
    await this.validateRequest(request)

    // 获取配置
    const config = await this.imageModelManager.getConfig(request.configId)
    if (!config) {
      throw new RequestConfigError(`图像生成: 配置不存在: ${request.configId}`)
    }

    // 获取适配器
    const adapter = this.registry.getAdapter(config.providerId)

    try {
      // 调用适配器生成
      const result = await adapter.generate(request, config)

      // 确保返回结果包含完整的元数据
      if (!result.metadata) {
        result.metadata = {
          providerId: config.providerId,
          modelId: config.modelId,
          configId: config.id
        }
      } else {
        // 补充溯源信息
        result.metadata.providerId = config.providerId
        result.metadata.modelId = config.modelId
        result.metadata.configId = config.id
      }

      return result
    } catch (error) {
      throw new RequestConfigError(
        `图像生成失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // 新增：连接测试（不要求配置已保存）
  async testConnection(config: ImageModelConfig): Promise<ImageResult> {
    // 构造一个最小的请求（根据模型能力选择文本或图像测试）
    const adapter = this.registry.getAdapter(config.providerId)
    const caps = (config.model?.capabilities) || this.registry.getStaticModels(config.providerId).find(m => m.id === config.modelId)?.capabilities || { text2image: true }
    const testType: 'text2image' | 'image2image' = caps.text2image ? 'text2image' : 'image2image'
    const baseReq: any = (adapter as any).getTestImageRequest ? (adapter as any).getTestImageRequest(testType) : { prompt: 'hello', count: 1 }
    const request: ImageRequest = { ...baseReq, configId: config.id || 'test' }
    // 直接调用适配器，绕过 imageModelManager 的存储查找
    return await adapter.generate(request, config)
  }

  // 新增：获取动态模型
  async getDynamicModels(providerId: string, connectionConfig: Record<string, any>): Promise<ImageModel[]> {
    return await this.registry.getDynamicModels(providerId, connectionConfig)
  }
}

export const createImageService = (imageModelManager: IImageModelManager, registry?: IImageAdapterRegistry) => new ImageService(imageModelManager, registry)
