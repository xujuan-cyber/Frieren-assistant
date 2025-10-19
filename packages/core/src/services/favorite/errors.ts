/**
 * 收藏服务相关错误类型
 */

export class FavoriteError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FavoriteError';
  }
}

export class FavoriteNotFoundError extends FavoriteError {
  constructor(id: string) {
    super(`Favorite not found: ${id}`, 'FAVORITE_NOT_FOUND');
    this.name = 'FavoriteNotFoundError';
  }
}

export class FavoriteAlreadyExistsError extends FavoriteError {
  constructor(content: string) {
    super(`Favorite already exists: ${content.slice(0, 50)}...`, 'FAVORITE_ALREADY_EXISTS');
    this.name = 'FavoriteAlreadyExistsError';
  }
}

export class FavoriteCategoryNotFoundError extends FavoriteError {
  constructor(id: string) {
    super(`Category not found: ${id}`, 'CATEGORY_NOT_FOUND');
    this.name = 'FavoriteCategoryNotFoundError';
  }
}

export class FavoriteValidationError extends FavoriteError {
  constructor(message: string) {
    super(`Validation error: ${message}`, 'VALIDATION_ERROR');
    this.name = 'FavoriteValidationError';
  }
}

export class FavoriteStorageError extends FavoriteError {
  constructor(message: string, public cause?: Error) {
    super(`Storage error: ${message}`, 'STORAGE_ERROR');
    this.name = 'FavoriteStorageError';
  }
}

/**
 * 标签相关错误
 */
export class FavoriteTagError extends FavoriteError {
  constructor(message: string, code: string = 'TAG_ERROR') {
    super(message, code);
    this.name = 'FavoriteTagError';
  }
}

/**
 * 标签已存在错误
 */
export class FavoriteTagAlreadyExistsError extends FavoriteTagError {
  constructor(tag: string) {
    super(`Tag already exists: ${tag}`, 'TAG_ALREADY_EXISTS');
    this.name = 'FavoriteTagAlreadyExistsError';
  }
}

/**
 * Tag not found error
 */
export class FavoriteTagNotFoundError extends FavoriteTagError {
  constructor(tag: string) {
    super(`Tag not found: ${tag}`, 'TAG_NOT_FOUND');
    this.name = 'FavoriteTagNotFoundError';
  }
}

/**
 * Data migration error
 */
export class FavoriteMigrationError extends FavoriteError {
  constructor(message: string, public cause?: Error) {
    super(`Migration error: ${message}`, 'MIGRATION_ERROR');
    this.name = 'FavoriteMigrationError';
  }
}

/**
 * 导入导出错误
 */
export class FavoriteImportExportError extends FavoriteError {
  constructor(message: string, public cause?: Error, public details?: string[]) {
    super(message, 'IMPORT_EXPORT_ERROR');
    this.name = 'FavoriteImportExportError';
  }
}