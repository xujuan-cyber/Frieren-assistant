/**
 * 基础错误类
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * API错误
 * 用于表示API调用过程中的错误
 */
export class APIError extends BaseError {
  constructor(message: string) {
    super(`API错误: ${message}`);
  }
}

/**
 * 请求配置错误
 * 用于表示请求配置验证失败的错误
 */
export class RequestConfigError extends BaseError {
  constructor(message: string) {
    super(`配置错误: ${message}`);
  }
}

/**
 * 验证错误
 * 用于表示参数验证失败的错误
 */
export class ValidationError extends BaseError {
  constructor(message: string) {
    super(`验证错误: ${message}`);
  }
}

/**
 * 初始化错误
 * 用于表示服务初始化失败的错误
 */
export class InitializationError extends BaseError {
  constructor(message: string) {
    super(`初始化错误: ${message}`);
  }
}

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
 * 模型配置错误
 */
export class ModelConfigError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConfigError';
  }
} 