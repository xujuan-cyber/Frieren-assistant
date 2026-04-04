import type { ImageUnderstandingRequest, LLMResponse, ITextAdapterRegistry, StreamHandlers } from '../llm/types'
import type { TextModelConfig } from '../model/types'

export interface ImageUnderstandingExecutionRequest extends ImageUnderstandingRequest {
  modelConfig: TextModelConfig
}

export interface IImageUnderstandingService {
  understand(request: ImageUnderstandingExecutionRequest): Promise<LLMResponse>
  understandStream(request: ImageUnderstandingExecutionRequest, callbacks: StreamHandlers): Promise<void>
}

export interface CreateImageUnderstandingServiceOptions {
  registry?: ITextAdapterRegistry
}
