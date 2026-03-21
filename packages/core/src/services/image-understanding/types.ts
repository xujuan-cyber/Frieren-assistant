import type { ImageUnderstandingRequest, LLMResponse, ITextAdapterRegistry } from '../llm/types'
import type { TextModelConfig } from '../model/types'

export interface ImageUnderstandingExecutionRequest extends ImageUnderstandingRequest {
  modelConfig: TextModelConfig
}

export interface IImageUnderstandingService {
  understand(request: ImageUnderstandingExecutionRequest): Promise<LLMResponse>
}

export interface CreateImageUnderstandingServiceOptions {
  registry?: ITextAdapterRegistry
}
