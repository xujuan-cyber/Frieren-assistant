/**
 * LLM服务基础错误
 */
export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * API请求错误
 */
export class APIError extends LLMError {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 模型配置错误
 */
export class ModelConfigError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConfigError';
  }
}

/**
 * 请求配置错误
 */
export class RequestConfigError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = 'RequestConfigError';
  }
} 