/**
 * 历史记录基础错误
 */
export class HistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryError';
  }
}

/**
 * 记录不存在错误
 */
export class RecordNotFoundError extends HistoryError {
  constructor(
    message: string,
    public recordId: string
  ) {
    super(message);
    this.name = 'RecordNotFoundError';
  }
}

/**
 * 存储错误
 */
export class StorageError extends HistoryError {
  constructor(
    message: string,
    public operation: 'read' | 'write' | 'delete' | 'init' | 'storage'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * 记录验证错误
 */
export class RecordValidationError extends HistoryError {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'RecordValidationError';
  }
} 