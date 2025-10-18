import type { IStorageProvider } from '../storage/types';
import type {
  FavoritePrompt,
  FavoriteCategory,
  FavoriteStats,
  IFavoriteManager
} from './types';
import {
  FavoriteError,
  FavoriteNotFoundError,
  FavoriteCategoryNotFoundError,
  FavoriteValidationError,
  FavoriteStorageError
} from './errors';
import { TypeMapper } from './type-mapper';

/**
 * 收藏管理器实现
 */
export class FavoriteManager implements IFavoriteManager {
  private readonly STORAGE_KEYS = {
    FAVORITES: 'favorites',
    CATEGORIES: 'favorite_categories',
    STATS: 'favorite_stats'
  } as const;

  private initPromise: Promise<void>;
  private initialized = false;
  /**
   * 初始化状态标志
   * - 'pending': 初始化尚未开始
   * - 'initializing': 正在初始化中
   * - 'initialized': 初始化已完成
   */
  private initState: 'pending' | 'initializing' | 'initialized' = 'pending';

  constructor(private storageProvider: IStorageProvider) {
    // 立即开始异步初始化
    this.initPromise = this.initialize();
  }

  /**
   * 显式初始化方法
   * 确保默认分类和数据迁移都完成
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.initState = 'initializing';
      await this.initializeDefaultCategories();
      await this.migrateLegacyData();
      this.initialized = true;
      this.initState = 'initialized';
    } catch (error) {
      console.error('[FavoriteManager] 初始化失败:', error);
      // 即使初始化失败,也标记为已初始化,避免阻塞后续操作
      this.initialized = true;
      this.initState = 'initialized';
    }
  }

  /**
   * 确保初始化完成
   * 所有公共方法都应该先调用这个方法
   *
   * 🔒 死锁防护:
   * 如果当前正在初始化中,直接返回而不等待,允许初始化逻辑调用自身方法
   */
  private async ensureInitialized(): Promise<void> {
    // 如果正在初始化中,直接返回,避免死锁
    if (this.initState === 'initializing') {
      return;
    }

    // 否则等待初始化完成
    await this.initPromise;
  }

  /**
   * 迁移旧数据
   * 为不包含 functionMode 的旧收藏添加默认值
   */
  private async migrateLegacyData(): Promise<void> {
    try {
      let migrated = false;

      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: any[] | null) => {
        // 如果没有数据，返回空数组
        if (!favorites || favorites.length === 0) return favorites || [];

        const migratedFavorites = favorites.map((favorite: any) => {
          // 检查是否为旧数据 (没有 functionMode 字段)
          if (!favorite.functionMode) {
            migrated = true;

            // 移除已废弃的 isPublic 字段
            const { isPublic, originalContent, ...rest } = favorite;

            // 添加新的必需字段
            return {
              ...rest,
              functionMode: 'basic',  // 默认为基础模式
              optimizationMode: 'system',  // 默认为系统优化模式
              metadata: {
                ...(favorite.metadata || {}),
                // 如果存在 originalContent,迁移到 metadata 中
                ...(originalContent ? { originalContent } : {})
              }
            };
          }

          return favorite;
        });

        return migratedFavorites;
      });

      if (migrated) {
        // 迁移后更新统计信息
        await this.updateStats();
      }
    } catch (error) {
      console.warn('[FavoriteManager] 旧数据迁移失败:', error);
      // 迁移失败不应该阻止服务初始化
    }
  }

  /**
   * 初始化默认分类
   *
   * 💡 **架构说明**:
   * 此方法在初始化期间被调用,现在可以安全地调用公共方法。
   * `ensureInitialized()` 会检测初始化状态,在初始化期间直接返回,避免死锁。
   */
  private async initializeDefaultCategories(): Promise<void> {
    try {
      // ✅ 现在可以安全调用公共方法,ensureInitialized() 会智能跳过等待
      const existingCategories = await this.getCategories();

      if (existingCategories.length === 0) {
        // ✅ 创建默认分类 - 可以安全调用 addCategory()
        const now = Date.now();
        const defaultCategories: FavoriteCategory[] = [
          {
            id: `cat_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name: '未分类',
            description: '默认分类',
            color: '#6B7280',
            sortOrder: 0,
            createdAt: now
          },
          {
            id: `cat_${now + 1}_${Math.random().toString(36).substr(2, 9)}`,
            name: '系统提示词',
            description: '优化后的系统提示词',
            color: '#3B82F6',
            sortOrder: 1,
            createdAt: now + 1
          },
          {
            id: `cat_${now + 2}_${Math.random().toString(36).substr(2, 9)}`,
            name: '用户提示词',
            description: '优化后的用户提示词',
            color: '#10B981',
            sortOrder: 2,
            createdAt: now + 2
          },
          {
            id: `cat_${now + 3}_${Math.random().toString(36).substr(2, 9)}`,
            name: '创意写作',
            description: '创意写作相关的提示词',
            color: '#8B5CF6',
            sortOrder: 3,
            createdAt: now + 3
          },
          {
            id: `cat_${now + 4}_${Math.random().toString(36).substr(2, 9)}`,
            name: '编程开发',
            description: '编程开发相关的提示词',
            color: '#F59E0B',
            sortOrder: 4,
            createdAt: now + 4
          },
          {
            id: `cat_${now + 5}_${Math.random().toString(36).substr(2, 9)}`,
            name: '商业分析',
            description: '商业分析相关的提示词',
            color: '#EF4444',
            sortOrder: 5,
            createdAt: now + 5
          }
        ];

        // ✅ 批量添加默认分类 - 使用公共方法
        for (const category of defaultCategories) {
          await this.addCategory({
            name: category.name,
            description: category.description,
            color: category.color,
            sortOrder: category.sortOrder
          });
        }
      }
    } catch (error) {
      console.warn('初始化默认分类失败:', error);
    }
  }

  async addFavorite(favorite: Omit<FavoritePrompt, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<string> {
    await this.ensureInitialized();

    // 验证输入
    if (!favorite.content?.trim()) {
      throw new FavoriteValidationError('提示词内容不能为空');
    }

    // 验证 functionMode 必填
    if (!favorite.functionMode) {
      throw new FavoriteValidationError('功能模式 (functionMode) 不能为空');
    }

    // 验证功能模式分类的完整性
    if (favorite.functionMode === 'basic' || favorite.functionMode === 'context') {
      if (!favorite.optimizationMode) {
        throw new FavoriteValidationError(`${favorite.functionMode} 模式必须指定 optimizationMode`);
      }
    }

    if (favorite.functionMode === 'image') {
      if (!favorite.imageSubMode) {
        throw new FavoriteValidationError('image 模式必须指定 imageSubMode');
      }
    }

    const favoriteData = {
      title: favorite.title?.trim() || favorite.content.slice(0, 50) + (favorite.content.length > 50 ? '...' : ''),
      content: favorite.content,
      description: favorite.description,
      category: favorite.category,
      tags: favorite.tags || [],
      functionMode: favorite.functionMode,
      optimizationMode: favorite.optimizationMode,
      imageSubMode: favorite.imageSubMode,
      metadata: favorite.metadata
    };

    const now = Date.now();
    const id = `fav_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const newFavorite: FavoritePrompt = {
      ...favoriteData,
      id,
      createdAt: now,
      updatedAt: now,
      useCount: 0
    };

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];
        // 🔧 移除重复内容检查 - 允许收藏相同内容但属性不同的提示词
        // 用户可能需要��同一内容设置不同的标题、分类、标签等
        return [...favoritesList, newFavorite];
      });

      await this.updateStats();
      return id;
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`添加收藏失败: ${errorMessage}`);
    }
  }

  async getFavorites(options: {
    categoryId?: string;
    tags?: string[];
    keyword?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'useCount' | 'title';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<FavoritePrompt[]> {
    await this.ensureInitialized();

    try {
      const favorites = await this.storageProvider.getItem(this.STORAGE_KEYS.FAVORITES);
      let favoritesList: FavoritePrompt[] = favorites ? JSON.parse(favorites) : [];

      // 过滤
      if (options.categoryId) {
        favoritesList = favoritesList.filter(f => f.category === options.categoryId);
      }

      if (options.tags && options.tags.length > 0) {
        favoritesList = favoritesList.filter(f =>
          options.tags!.some(tag => f.tags.includes(tag))
        );
      }

      if (options.keyword) {
        const keyword = options.keyword.toLowerCase();
        favoritesList = favoritesList.filter(f =>
          f.title.toLowerCase().includes(keyword) ||
          f.content.toLowerCase().includes(keyword) ||
          f.description?.toLowerCase().includes(keyword)
        );
      }

      // 排序
      const sortBy = options.sortBy || 'updatedAt';
      const sortOrder = options.sortOrder || 'desc';

      favoritesList.sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];

        if (sortBy === 'title') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // 分页
      if (options.offset) {
        favoritesList = favoritesList.slice(options.offset);
      }

      if (options.limit) {
        favoritesList = favoritesList.slice(0, options.limit);
      }

      return favoritesList;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取收藏列表失败: ${errorMessage}`);
    }
  }

  async getFavorite(id: string): Promise<FavoritePrompt> {
    try {
      const favorites = await this.getFavorites();
      const favorite = favorites.find(f => f.id === id);

      if (!favorite) {
        throw new FavoriteNotFoundError(id);
      }

      return favorite;
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取收藏详情失败: ${errorMessage}`);
    }
  }

  async updateFavorite(id: string, updates: Partial<FavoritePrompt>): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];
        const index = favoritesList.findIndex(f => f.id === id);
        if (index === -1) {
          throw new FavoriteNotFoundError(id);
        }

        favoritesList[index] = {
          ...favoritesList[index],
          ...updates,
          updatedAt: Date.now()
        };

        return favoritesList;
      });

      await this.updateStats();
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`更新收藏失败: ${errorMessage}`);
    }
  }

  async deleteFavorite(id: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];
        const index = favoritesList.findIndex(f => f.id === id);
        if (index === -1) {
          throw new FavoriteNotFoundError(id);
        }

        return favoritesList.filter(f => f.id !== id);
      });

      await this.updateStats();
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`删除收藏失败: ${errorMessage}`);
    }
  }

  async deleteFavorites(ids: string[]): Promise<void> {
    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];
        const deletedCount = favoritesList.filter(f => ids.includes(f.id)).length;
        if (deletedCount === 0) {
          throw new FavoriteNotFoundError('未找到要删除的收藏项');
        }

        return favoritesList.filter(f => !ids.includes(f.id));
      });

      await this.updateStats();
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`批量删除收藏失败: ${errorMessage}`);
    }
  }

  async incrementUseCount(id: string): Promise<void> {
    try {
      await this.updateFavorite(id, { useCount: (await this.getFavorite(id)).useCount + 1 });
    } catch (error) {
      // 静默处理使用次数增加失败，不影响主要功能
      console.warn('增加使用次数失败:', error);
    }
  }

  async getCategories(): Promise<FavoriteCategory[]> {
    await this.ensureInitialized();

    try {
      const categories = await this.storageProvider.getItem(this.STORAGE_KEYS.CATEGORIES);
      return categories ? JSON.parse(categories) : [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取分类列表失败: ${errorMessage}`);
    }
  }

  async addCategory(category: Omit<FavoriteCategory, 'id' | 'createdAt'>): Promise<string> {
    await this.ensureInitialized();

    if (!category.name?.trim()) {
      throw new FavoriteValidationError('分类名称不能为空');
    }

    const now = Date.now();
    const id = `cat_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const newCategory: FavoriteCategory = {
      ...category,
      id,
      createdAt: now,
      sortOrder: category.sortOrder || 0
    };

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.CATEGORIES, (categories: FavoriteCategory[] | null) => {
        const categoriesList = categories || [];
        // 检查是否已存在同名分类
        const existing = categoriesList.find(c => c.name === category.name);
        if (existing) {
          throw new FavoriteError(`分类已存在: ${category.name}`, 'CATEGORY_ALREADY_EXISTS');
        }
        return [...categoriesList, newCategory];
      });

      return id;
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`添加分类失败: ${errorMessage}`);
    }
  }

  async updateCategory(id: string, updates: Partial<FavoriteCategory>): Promise<void> {
    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.CATEGORIES, (categories: FavoriteCategory[] | null) => {
        const categoriesList = categories || [];
        const index = categoriesList.findIndex(c => c.id === id);
        if (index === -1) {
          throw new FavoriteCategoryNotFoundError(id);
        }

        categoriesList[index] = {
          ...categoriesList[index],
          ...updates
        };

        return categoriesList;
      });
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`更新分类失败: ${errorMessage}`);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      // 检查是否有收藏项使用此分类
      const favoritesInCategory = await this.getFavorites({ categoryId: id });
      if (favoritesInCategory.length > 0) {
        throw new FavoriteValidationError(`无法删除分类，还有 ${favoritesInCategory.length} 个收藏项使用此分类`);
      }

      await this.storageProvider.updateData(this.STORAGE_KEYS.CATEGORIES, (categories: FavoriteCategory[] | null) => {
        const categoriesList = categories || [];
        const index = categoriesList.findIndex(c => c.id === id);
        if (index === -1) {
          throw new FavoriteCategoryNotFoundError(id);
        }

        return categoriesList.filter(c => c.id !== id);
      });
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`删除分类失败: ${errorMessage}`);
    }
  }

  async getStats(): Promise<FavoriteStats> {
    try {
      const stats = await this.storageProvider.getItem(this.STORAGE_KEYS.STATS);
      if (stats) {
        return JSON.parse(stats);
      }

      // 如果没有缓存的统计数据，计算并缓存
      return await this.updateStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取统计信息失败: ${errorMessage}`);
    }
  }

  private async updateStats(): Promise<FavoriteStats> {
    const favorites = await this.getFavorites();
    const categories = await this.getCategories();

    const categoryStats = categories.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      count: favorites.filter(f => f.category === category.id).length
    }));

    const tagCounts = new Map<string, number>();
    favorites.forEach(favorite => {
      favorite.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const tagStats = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const stats: FavoriteStats = {
      totalFavorites: favorites.length,
      categoryStats,
      tagStats,
      lastUsedAt: Math.max(...favorites.map(f => f.updatedAt), 0)
    };

    // 缓存统计数据
    try {
      await this.storageProvider.setItem(this.STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      console.warn('缓存统计数据失败:', error);
    }

    return stats;
  }

  async searchFavorites(keyword: string, options?: {
    categoryId?: string;
    tags?: string[];
  }): Promise<FavoritePrompt[]> {
    return this.getFavorites({
      keyword,
      categoryId: options?.categoryId,
      tags: options?.tags,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }

  async exportFavorites(ids?: string[]): Promise<string> {
    try {
      let favorites: FavoritePrompt[];

      if (ids) {
        favorites = await Promise.all(ids.map(id => this.getFavorite(id)));
      } else {
        favorites = await this.getFavorites();
      }

      const categories = await this.getCategories();

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        favorites,
        categories
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`导出收藏失败: ${errorMessage}`);
    }
  }

  async getAllTags(): Promise<Array<{ tag: string; count: number }>> {
    try {
      const favorites = await this.getFavorites();
      const tagCounts = new Map<string, number>();

      favorites.forEach(favorite => {
        favorite.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count); // 按使用次数降序
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取标签列表失败: ${errorMessage}`);
    }
  }

  async renameTag(oldTag: string, newTag: string): Promise<number> {
    if (!oldTag || !newTag) {
      throw new FavoriteValidationError('标签名不能为空');
    }

    if (oldTag === newTag) {
      return 0; // 无需操作
    }

    let affectedCount = 0;

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];

        favoritesList.forEach(favorite => {
          const oldTagIndex = favorite.tags.indexOf(oldTag);
          if (oldTagIndex !== -1) {
            // 移除旧标签
            favorite.tags.splice(oldTagIndex, 1);
            // 添加新标签(如果不存在)
            if (!favorite.tags.includes(newTag)) {
              favorite.tags.push(newTag);
            }
            favorite.updatedAt = Date.now();
            affectedCount++;
          }
        });

        return favoritesList;
      });

      await this.updateStats();
      return affectedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`重命名标签失败: ${errorMessage}`);
    }
  }

  async mergeTags(sourceTags: string[], targetTag: string): Promise<number> {
    if (!sourceTags || sourceTags.length === 0) {
      throw new FavoriteValidationError('源标签列表不能为空');
    }

    if (!targetTag) {
      throw new FavoriteValidationError('目标标签不能为空');
    }

    let affectedCount = 0;

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];

        favoritesList.forEach(favorite => {
          let hasSourceTag = false;

          // 移除所有源标签
          sourceTags.forEach(sourceTag => {
            const index = favorite.tags.indexOf(sourceTag);
            if (index !== -1) {
              favorite.tags.splice(index, 1);
              hasSourceTag = true;
            }
          });

          // 如果存在源标签,添加目标标签(如果不存在)
          if (hasSourceTag) {
            if (!favorite.tags.includes(targetTag)) {
              favorite.tags.push(targetTag);
            }
            favorite.updatedAt = Date.now();
            affectedCount++;
          }
        });

        return favoritesList;
      });

      await this.updateStats();
      return affectedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`合并标签失败: ${errorMessage}`);
    }
  }

  async deleteTag(tag: string): Promise<number> {
    if (!tag) {
      throw new FavoriteValidationError('标签名不能为空');
    }

    let affectedCount = 0;

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.FAVORITES, (favorites: FavoritePrompt[] | null) => {
        const favoritesList = favorites || [];

        favoritesList.forEach(favorite => {
          const index = favorite.tags.indexOf(tag);
          if (index !== -1) {
            favorite.tags.splice(index, 1);
            favorite.updatedAt = Date.now();
            affectedCount++;
          }
        });

        return favoritesList;
      });

      await this.updateStats();
      return affectedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`删除标签失败: ${errorMessage}`);
    }
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    if (!categoryIds || categoryIds.length === 0) {
      throw new FavoriteValidationError('分类ID列表不能为空');
    }

    try {
      await this.storageProvider.updateData(this.STORAGE_KEYS.CATEGORIES, (categories: FavoriteCategory[] | null) => {
        const categoriesList = categories || [];

        // 创建ID到分类的映射
        const categoryMap = new Map<string, FavoriteCategory>();
        categoriesList.forEach(cat => categoryMap.set(cat.id, cat));

        // 按提供的ID顺序重新排序,并更新sortOrder
        const reorderedCategories: FavoriteCategory[] = [];
        categoryIds.forEach((id, index) => {
          const category = categoryMap.get(id);
          if (category) {
            reorderedCategories.push({
              ...category,
              sortOrder: index
            });
            categoryMap.delete(id);
          }
        });

        // 将未在ID列表中的分类追加到末尾
        categoryMap.forEach(category => {
          reorderedCategories.push({
            ...category,
            sortOrder: reorderedCategories.length
          });
        });

        return reorderedCategories;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`重新排序分类失败: ${errorMessage}`);
    }
  }

  async getCategoryUsage(categoryId: string): Promise<number> {
    try {
      const favorites = await this.getFavorites({ categoryId });
      return favorites.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`获取分类使用统计失败: ${errorMessage}`);
    }
  }

  async importFavorites(data: string, options?: {
    mergeStrategy?: 'skip' | 'overwrite' | 'merge';
    categoryMapping?: Record<string, string>;
  }): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const mergeStrategy = options?.mergeStrategy || 'skip';
    const categoryMapping = options?.categoryMapping || {};
    const result = { imported: 0, skipped: 0, errors: [] as string[] };

    try {
      const importData = JSON.parse(data);

      if (!importData.favorites || !Array.isArray(importData.favorites)) {
        throw new FavoriteValidationError('导入数据格式无效');
      }

      const existingFavorites = await this.getFavorites();
      const existingContentSet = new Set(existingFavorites.map(f => f.content));

      for (const favorite of importData.favorites) {
        try {
          // 验证必填字段
          if (!favorite.content?.trim()) {
            throw new FavoriteValidationError('导入数据中存在空内容的收藏项');
          }

          // 构建功能模式数据，兼容旧数据
          const functionMode = favorite.functionMode || 'basic';
          const optimizationMode = favorite.optimizationMode || (functionMode !== 'image' ? 'system' : undefined);
          const imageSubMode = favorite.imageSubMode || (functionMode === 'image' ? 'text2image' : undefined);

          // 验证功能模式分类的完整性
          const mapping = { functionMode, optimizationMode, imageSubMode };
          if (!TypeMapper.validateMapping(mapping)) {
            throw new FavoriteValidationError(
              `导入数据中存在无效的功能模式分类: functionMode=${functionMode}, optimizationMode=${optimizationMode}, imageSubMode=${imageSubMode}`
            );
          }

          const favoriteData = {
            title: favorite.title,
            content: favorite.content,
            description: favorite.description,
            tags: favorite.tags || [],
            category: categoryMapping[favorite.category] || favorite.category,
            functionMode,
            optimizationMode,
            imageSubMode,
            metadata: favorite.metadata
          };

          const exists = existingContentSet.has(favorite.content);

          if (exists) {
            if (mergeStrategy === 'skip') {
              result.skipped++;
              continue;
            } else if (mergeStrategy === 'overwrite') {
              // 找到现有收藏并更新
              const existingFavorite = existingFavorites.find(f => f.content === favorite.content);
              if (existingFavorite) {
                await this.updateFavorite(existingFavorite.id, favoriteData);
                result.imported++;
              }
            } else {
              // merge策略，创建新收藏
              await this.addFavorite(favoriteData);
              result.imported++;
            }
          } else {
            await this.addFavorite(favoriteData);
            result.imported++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`导入收藏失败: ${errorMessage}`);
        }
      }

      await this.updateStats();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FavoriteStorageError(`导入收藏失败: ${errorMessage}`);
    }
  }
}