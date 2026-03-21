import { TextAdapterRegistry } from '../llm/adapters/registry'
import { RequestConfigError } from '../llm/errors'
import type { IImageUnderstandingService, ImageUnderstandingExecutionRequest, CreateImageUnderstandingServiceOptions } from './types'
import type { ITextAdapterRegistry } from '../llm/types'

export class ImageUnderstandingService implements IImageUnderstandingService {
  private readonly registry: ITextAdapterRegistry

  constructor(options: CreateImageUnderstandingServiceOptions = {}) {
    this.registry = options.registry ?? new TextAdapterRegistry()
  }

  async understand(request: ImageUnderstandingExecutionRequest) {
    this.validateRequest(request)

    const providerId = request.modelConfig.providerMeta.id
    const adapter = this.registry.getAdapter(providerId)

    return await adapter.sendImageUnderstanding(request, request.modelConfig)
  }

  private validateRequest(request: ImageUnderstandingExecutionRequest): void {
    if (!request || typeof request !== 'object') {
      throw new RequestConfigError('Image understanding request cannot be empty')
    }

    const modelConfig = request.modelConfig
    if (!modelConfig) {
      throw new RequestConfigError('Model config cannot be empty')
    }

    if (!modelConfig.providerMeta?.id) {
      throw new RequestConfigError('Model provider metadata cannot be empty')
    }

    if (!modelConfig.modelMeta?.id) {
      throw new RequestConfigError('Model metadata cannot be empty')
    }

    if (!modelConfig.enabled) {
      throw new RequestConfigError('Model is not enabled')
    }
  }
}

export function createImageUnderstandingService(
  options: CreateImageUnderstandingServiceOptions = {}
): IImageUnderstandingService {
  return new ImageUnderstandingService(options)
}
