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
    super(`收藏项未找到: ${id}`, 'FAVORITE_NOT_FOUND');
    this.name = 'FavoriteNotFoundError';
  }
}

export class FavoriteAlreadyExistsError extends FavoriteError {
  constructor(content: string) {
    super(`收藏项已存在: ${content.slice(0, 50)}...`, 'FAVORITE_ALREADY_EXISTS');
    this.name = 'FavoriteAlreadyExistsError';
  }
}

export class FavoriteCategoryNotFoundError extends FavoriteError {
  constructor(id: string) {
    super(`分类未找到: ${id}`, 'CATEGORY_NOT_FOUND');
    this.name = 'FavoriteCategoryNotFoundError';
  }
}

export class FavoriteValidationError extends FavoriteError {
  constructor(message: string) {
    super(`验证错误: ${message}`, 'VALIDATION_ERROR');
    this.name = 'FavoriteValidationError';
  }
}

export class FavoriteStorageError extends FavoriteError {
  constructor(message: string) {
    super(`存储错误: ${message}`, 'STORAGE_ERROR');
    this.name = 'FavoriteStorageError';
  }
}