import { IImageModelManager, ImageRequest, ImageResult, ImageProgressHandlers, IImageService, IImageAdapterRegistry } from './types'
import { createImageAdapterRegistry } from './adapters/registry'
import { RequestConfigError } from '../llm/errors'

export class ImageService implements IImageService {
  public readonly registry: IImageAdapterRegistry = createImageAdapterRegistry()

  constructor(public readonly imageModelManager: IImageModelManager) {}

  public validateRequest(req: ImageRequest) {
    if (!req?.prompt || !req.prompt.trim()) {
      throw new RequestConfigError('图像生成: 提示词不能为空')
    }
    if (req.inputImage && req.inputImage.b64 && typeof req.inputImage.b64 !== 'string') {
      throw new RequestConfigError('图像生成: 输入图片格式无效')
    }
    const count = req.count ?? 1
    if (count < 1 || count > 4) {
      throw new RequestConfigError('图像生成: 仅支持生成 1~4 张（串行）')
    }

    // 校验单图输入（仅允许 0 或 1）
    // 已由类型约束，这里补充 MIME 与大小限制
    if (req.inputImage?.b64) {
      const mime = (req.inputImage.mimeType || '').toLowerCase()
      if (mime && mime !== 'image/png' && mime !== 'image/jpeg') {
        throw new RequestConfigError('图像生成: 仅支持 PNG 或 JPEG')
      }
      // 估算 base64 大小：每4字符≈3字节，去除末尾填充
      const len = req.inputImage.b64.length
      const padding = (req.inputImage.b64.endsWith('==') ? 2 : req.inputImage.b64.endsWith('=') ? 1 : 0)
      const bytes = Math.floor(len * 3 / 4) - padding
      const max = 10 * 1024 * 1024 // 10MB
      if (bytes > max) {
        throw new RequestConfigError('图像生成: 本地图片大小不能超过 10MB')
      }
    }
  }

  async generate(request: ImageRequest, modelKey: string, handlers?: ImageProgressHandlers): Promise<ImageResult> {
    this.validateRequest(request)

    if (!modelKey?.trim()) throw new RequestConfigError('图像生成: 模型 key 不能为空')

    const cfg = await this.imageModelManager.getModel(modelKey)
    if (!cfg) throw new RequestConfigError(`图像生成: 模型不存在: ${modelKey}`)
    if (!cfg.enabled) throw new RequestConfigError(`图像生成: 模型未启用: ${modelKey}`)

    const adapter = this.registry.getAdapter(cfg.provider)

    handlers?.onProgress?.('queued')

    // 锁定单次生成，避免与适配器内置的批量逻辑叠加造成重复调用
    const single = await adapter.generate({ ...request, count: 1 }, cfg, handlers)
    const agg: ImageResult = { images: [], metadata: { model: cfg.defaultModel, notes: [] } }
    if (single.images?.length) agg.images.push(...single.images)
    if (single.metadata?.notes?.length) agg.metadata!.notes!.push(...single.metadata.notes)

    // 清理 notes 空数组
    if (agg.metadata && agg.metadata.notes && agg.metadata.notes.length === 0) {
      delete agg.metadata.notes
    }

    handlers?.onProgress?.('done')
    handlers?.onComplete?.(agg)
    return agg
  }
}

export const createImageService = (imageModelManager: IImageModelManager) => new ImageService(imageModelManager)
