import { IImageAdapterRegistry, IImageProviderAdapter } from '../../image/types'
import { RequestConfigError } from '../../llm/errors'
import { GeminiImageAdapter } from './gemini'
import { SeedreamImageAdapter } from './seedream'
import { OpenAIImageAdapter } from './openai'
import { SiliconFlowImageAdapter } from './siliconflow-adapter'

/**
 * 简单注册表：按 provider 返回具体适配器实例
 */
export class ImageAdapterRegistry implements IImageAdapterRegistry {
  getAdapter(provider: string): IImageProviderAdapter {
    switch ((provider || '').toLowerCase()) {
      case 'gemini':
        return new GeminiImageAdapter()
      case 'seedream':
      case 'doubao':
      case 'volcengine':
        return new SeedreamImageAdapter()
      case 'siliconflow':
      case 'silicon-flow':
      case 'kolors':
        return new SiliconFlowImageAdapter()
      case 'openai':
        return new OpenAIImageAdapter()
      case 'custom':
        throw new RequestConfigError('自定义图像提供商暂未实现适配器')
      default:
        throw new RequestConfigError(`未知图像提供商: ${provider}`)
    }
  }
}

export const createImageAdapterRegistry = () => new ImageAdapterRegistry()

