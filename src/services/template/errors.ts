/**
 * 模板管理基础错误
 */
export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

/**
 * 模板加载错误
 */
export class TemplateLoadError extends TemplateError {
  constructor(
    message: string,
    public templateId: string
  ) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}

/**
 * 模板验证错误
 */
export class TemplateValidationError extends TemplateError {
  constructor(
    message: string,
    public templateId: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

/**
 * 模板缓存错误
 */
export class TemplateCacheError extends TemplateError {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateCacheError';
  }
} 