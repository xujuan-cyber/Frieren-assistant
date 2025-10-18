# 安全审查报告：收藏功能 (Favorites Feature)

**审查日期**: 2025-10-13
**审查人**: Claude (Security Review)
**审查范围**: 新增收藏功能的所有代码变更

---

## 执行摘要

本次安全审查针对新增的"收藏"功能进行了深入分析，重点关注**高可信度、可实际利用**的安全漏洞。审查发现了 **1个高危漏洞** 和 **3个中危漏洞**，主要涉及XSS攻击、原型污染和JSON注入风险。

### 关键发现统计
- **高危 (HIGH)**: 1 个
- **中危 (MEDIUM)**: 3 个
- **建议改进**: 2 个

---

## 第一部分：现有安全机制分析

### 1.1 XSS防护措施
✅ **已实施的防护**:
- 使用 `DOMPurify.sanitize()` 清理所有Markdown渲染输出 (MarkdownRenderer.vue:238)
- Vue模板使用 `{{ }}` 语法自动转义文本内容
- 存储层使用JSON序列化，避免直接HTML注入

### 1.2 存储安全
✅ **已实施的防护**:
- 使用 `AsyncLock` 机制防止竞态条件 (LocalStorageProvider.ts:7-34)
- 原子性操作通过 `updateData()` 方法实现 (LocalStorageProvider.ts:93-123)
- 支持多种存储后端 (localStorage, IndexedDB, 文件系统)

### 1.3 输入验证
⚠️ **部分实施**:
- 基本的空值检查 (manager.ts:89-91, 317-319)
- **缺失**: 对用户输入的长度限制、特殊字符过滤、深度嵌套检查

---

## 第二部分：高危漏洞 (HIGH Severity)

### 🔴 HIGH-1: JSON原型污染风险 (Prototype Pollution)

**文件位置**: `packages/core/src/services/favorite/manager.ts`
**代码行**: 508, 225-240, 352-367
**置信度**: 0.85

#### 漏洞描述
在 `importFavorites()` 和 `updateFavorite()` 方法中，直接解析用户提供的JSON数据并使用对象展开运算符 (`...`) 合并对象，未验证属性名称。攻击者可以通过构造恶意JSON注入 `__proto__`、`constructor`、`prototype` 等危险属性，污染对象原型链。

#### 漏洞代码
```typescript
// manager.ts:508 - 直接解析用户JSON
const importData = JSON.parse(data);

// manager.ts:234-238 - 无过滤地合并对象
favoritesList[index] = {
  ...favoritesList[index],
  ...updates,  // ⚠️ updates可能包含__proto__等危险属性
  updatedAt: Date.now()
};

// manager.ts:361-364 - 分类更新也存在相同问题
categoriesList[index] = {
  ...categoriesList[index],
  ...updates  // ⚠️ 同样的原型污染风险
};
```

#### 攻击场景
```json
// 恶意导入数据
{
  "favorites": [
    {
      "title": "Normal Favorite",
      "content": "test",
      "__proto__": {
        "isAdmin": true,
        "polluted": "yes"
      }
    }
  ]
}

// 或通过updateFavorite API
favoriteManager.updateFavorite(id, {
  title: "Updated",
  "__proto__": { "isAdmin": true }
});
```

**攻击后果**:
- 修改全局对象原型，影响所有JavaScript对象
- 可能绕过权限检查（如果应用依赖原型属性）
- 导致拒绝服务 (DoS)
- 在多用户环境下污染共享状态

#### 修复建议
```typescript
// 1. 创建安全的对象合并函数
function safeObjectMerge<T extends object>(target: T, source: Partial<T>): T {
  const safeKeys = Object.keys(source).filter(key =>
    !['__proto__', 'constructor', 'prototype'].includes(key)
  );

  const result = { ...target };
  for (const key of safeKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key as keyof T] = source[key as keyof T]!;
    }
  }
  return result;
}

// 2. 在updateFavorite中使用
favoritesList[index] = safeObjectMerge(
  favoritesList[index],
  { ...updates, updatedAt: Date.now() }
);

// 3. 在importFavorites中添加JSON Schema验证
import Ajv from 'ajv';
const ajv = new Ajv();
const schema = {
  type: 'object',
  properties: {
    favorites: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'content'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 200 },
          content: { type: 'string', maxLength: 50000 },
          // ... 其他合法属性
        }
      }
    }
  }
};
const validate = ajv.compile(schema);
if (!validate(importData)) {
  throw new FavoriteValidationError('Invalid JSON structure');
}
```

---

## 第三部分：中危漏洞 (MEDIUM Severity)

### 🟡 MEDIUM-1: 不受限制的JSON导入导致DoS

**文件位置**: `packages/core/src/services/favorite/manager.ts`
**代码行**: 495-563
**置信度**: 0.90

#### 漏洞描述
`importFavorites()` 方法未限制导入数据的大小和数量，攻击者可以导入包含数百万个收藏项的JSON文件，耗尽客户端内存和存储空间。

#### 漏洞代码
```typescript
// manager.ts:508-556 - 无限制地处理所有导入项
for (const favorite of importData.favorites) {
  // 对每个项目进行处理，没有数量限制
  await this.addFavorite(favoriteData);
}
```

#### 攻击场景
```json
{
  "favorites": [
    // ... 重复100万次
    {
      "title": "x".repeat(10000),
      "content": "y".repeat(100000),
      "tags": ["a", "b", "c", ...] // 1000个标签
    }
  ]
}
```

**攻击后果**:
- 浏览器卡死或崩溃
- localStorage配额耗尽 (通常5-10MB)
- UI无响应
- 影响其他应用（同域名下的localStorage共享）

#### 修复建议
```typescript
// 添加限制常量
private readonly IMPORT_LIMITS = {
  MAX_FAVORITES: 1000,
  MAX_CONTENT_LENGTH: 50000,
  MAX_TITLE_LENGTH: 200,
  MAX_TAGS: 20,
  MAX_IMPORT_SIZE_BYTES: 5 * 1024 * 1024 // 5MB
};

async importFavorites(data: string, options?: {...}): Promise<...> {
  // 1. 检查原始数据大小
  if (data.length > this.IMPORT_LIMITS.MAX_IMPORT_SIZE_BYTES) {
    throw new FavoriteValidationError(
      `导入数据过大 (${(data.length/1024/1024).toFixed(2)}MB)，最大允许 5MB`
    );
  }

  const importData = JSON.parse(data);

  // 2. 检查数量
  if (importData.favorites.length > this.IMPORT_LIMITS.MAX_FAVORITES) {
    throw new FavoriteValidationError(
      `导入项过多 (${importData.favorites.length})，最大允许 ${this.IMPORT_LIMITS.MAX_FAVORITES} 项`
    );
  }

  // 3. 逐项验证
  for (const favorite of importData.favorites) {
    if (favorite.content?.length > this.IMPORT_LIMITS.MAX_CONTENT_LENGTH) {
      result.errors.push(`内容过长: ${favorite.title?.slice(0, 50)}`);
      continue;
    }
    if (favorite.tags?.length > this.IMPORT_LIMITS.MAX_TAGS) {
      result.errors.push(`标签过多: ${favorite.title?.slice(0, 50)}`);
      continue;
    }
    // ... 继续处理
  }
}
```

---

### 🟡 MEDIUM-2: XSS风险 - 未清理的metadata字段

**文件位置**: `packages/ui/src/components/FavoriteCard.vue`, `FavoriteListItem.vue`
**代码行**: FavoriteCard.vue:12, 44, 48
**置信度**: 0.75

#### 漏洞描述
虽然主要内容通过MarkdownRenderer使用DOMPurify清理，但在卡片视图中直接渲染 `favorite.title` 和 `favorite.description` 时，Vue的双花括号语法虽然会转义HTML，但 `metadata` 字段如果被用于动态属性绑定（如 `:style`, `:class`），可能存在DOM-based XSS风险。

#### 潜在风险代码
```vue
<!-- FavoriteCard.vue:12 - title通过Vue插值自动转义，安全 -->
<n-ellipsis style="max-width: 200px">
  {{ favorite.title }}  <!-- ✅ 安全 -->
</n-ellipsis>

<!-- 但如果未来有人这样写: -->
<div :style="favorite.metadata.customStyle">  <!-- ⚠️ 危险 -->
  {{ favorite.content }}
</div>
```

#### 攻击场景
```typescript
// 恶意metadata注入
await favoriteManager.addFavorite({
  title: "Safe Title",
  content: "Safe Content",
  metadata: {
    customStyle: "background: url('javascript:alert(1)')",
    customClass: "'; alert('XSS'); '"
  }
});
```

#### 修复建议
```typescript
// 1. 在types.ts中严格定义metadata结构
export interface FavoritePrompt {
  // ... 其他字段
  metadata?: {
    modelKey?: string;
    modelName?: string;
    templateId?: string;
    optimizationMode?: 'system' | 'user';
    // ⚠️ 明确禁止其他未定义的属性
    // [key: string]: any;  // 删除此行
  };
}

// 2. 在manager.ts中添加metadata白名单验证
private validateMetadata(metadata?: any): FavoritePrompt['metadata'] {
  if (!metadata) return undefined;

  const allowedKeys = ['modelKey', 'modelName', 'templateId', 'optimizationMode'];
  const cleaned: FavoritePrompt['metadata'] = {};

  for (const key of allowedKeys) {
    if (key in metadata) {
      cleaned[key] = metadata[key];
    }
  }

  return cleaned;
}

// 3. 在addFavorite中应用验证
async addFavorite(favorite: Omit<...>): Promise<string> {
  // ... 现有验证
  const favoriteData = {
    // ... 其他字段
    metadata: this.validateMetadata(favorite.metadata)
  };
  // ...
}
```

---

### 🟡 MEDIUM-3: 客户端存储的授权缺失

**文件位置**: 整个收藏功能
**置信度**: 0.80

#### 漏洞描述
收藏功能完全依赖客户端存储（localStorage/IndexedDB），没有用户身份验证或授权机制。在多用户共享设备或浏览器环境下，任何用户都可以访问、修改或删除其他用户的收藏。

#### 攻击场景
```typescript
// 攻击者通过浏览器控制台直接访问
localStorage.getItem('favorites');  // 读取所有收藏
localStorage.setItem('favorites', '[]');  // 删除所有收藏

// 或通过注入脚本
(async () => {
  const services = window.__app_services__;  // 假设暴露了services
  const allFavorites = await services.favoriteManager.getFavorites();
  console.log('Stolen favorites:', allFavorites);
})();
```

**影响范围**:
- **Web版本**: 高风险（同域名下所有用户共享localStorage）
- **Desktop版本**: 低风险（单用户应用）
- **Chrome扩展**: 中风险（取决于存储策略）

#### 修复建议
```typescript
// 短期方案：添加基于用户标识的数据隔离
class IsolatedFavoriteManager implements IFavoriteManager {
  constructor(
    private storageProvider: IStorageProvider,
    private userId?: string  // 可选的用户标识
  ) {
    this.STORAGE_KEYS = {
      FAVORITES: `favorites_${userId || 'default'}`,
      CATEGORIES: `favorite_categories_${userId || 'default'}`,
      STATS: `favorite_stats_${userId || 'default'}`
    };
  }
}

// 长期方案：实施端到端加密
import { encrypt, decrypt } from '@/utils/crypto';

async getFavorites(): Promise<FavoritePrompt[]> {
  const encrypted = await this.storageProvider.getItem(this.STORAGE_KEYS.FAVORITES);
  if (!encrypted) return [];

  const decrypted = decrypt(encrypted, this.getUserKey());
  return JSON.parse(decrypted);
}

async addFavorite(favorite: ...): Promise<string> {
  // ... 构建newFavorite
  const currentData = await this.getFavorites();
  const newData = [...currentData, newFavorite];
  const encrypted = encrypt(JSON.stringify(newData), this.getUserKey());
  await this.storageProvider.setItem(this.STORAGE_KEYS.FAVORITES, encrypted);
}

private getUserKey(): string {
  // 基于用户密码派生密钥，或使用Web Crypto API
  return derivedKey;
}
```

---

## 第四部分：安全建议

### 建议-1: 实施内容安全策略 (CSP)
虽然项目已有CSP安全模板处理，但应确保收藏内容也遵循相同标准：

```typescript
// 在FavoriteManager中添加CSP验证
import { CSPSafeProcessor } from '../template/csp-safe-processor';

private cspProcessor = new CSPSafeProcessor();

async addFavorite(favorite: Omit<...>): Promise<string> {
  // 验证内容不包含危险脚本
  if (this.cspProcessor.containsDangerousContent(favorite.content)) {
    throw new FavoriteValidationError('内容包含不安全的脚本或标签');
  }
  // ... 继续处理
}
```

### 建议-2: 添加审计日志
记录所有敏感操作（导入、批量删除等），便于追踪潜在的滥用行为：

```typescript
interface AuditLog {
  timestamp: number;
  action: 'import' | 'export' | 'bulk_delete' | 'clear';
  itemCount: number;
  userId?: string;
  ipAddress?: string;
}

async importFavorites(data: string, options?: {...}): Promise<...> {
  const result = { imported: 0, skipped: 0, errors: [] };

  try {
    // ... 现有导入逻辑

    // 记录审计日志
    await this.auditLog.log({
      timestamp: Date.now(),
      action: 'import',
      itemCount: result.imported,
      userId: this.getCurrentUserId()
    });

    return result;
  } catch (error) {
    // 记录失败的导入尝试
    await this.auditLog.logError({
      action: 'import',
      error: error.message
    });
    throw error;
  }
}
```

---

## 第五部分：优先级修复计划

### 立即修复 (1-3天)
1. **HIGH-1**: 修复原型污染漏洞 - 实施 `safeObjectMerge` 函数
2. **MEDIUM-1**: 添加导入数据大小和数量限制

### 短期修复 (1-2周)
3. **MEDIUM-2**: 严格定义 `metadata` 结构并添加白名单验证
4. **建议-1**: 集成CSP安全处理到收藏内容验证

### 长期改进 (1-2月)
5. **MEDIUM-3**: 设计并实施多用户数据隔离机制
6. **建议-2**: 添加完整的审计日志系统
7. 考虑为敏感收藏添加客户端加密

---

## 第六部分：测试建议

### 安全测试用例
```typescript
// 1. 原型污染测试
test('应拒绝包含__proto__的更新', async () => {
  const manager = new FavoriteManager(storageProvider);
  const id = await manager.addFavorite({...});

  await expect(
    manager.updateFavorite(id, {
      title: 'test',
      '__proto__': { isAdmin: true }
    } as any)
  ).rejects.toThrow(FavoriteValidationError);
});

// 2. DoS测试
test('应拒绝超大导入数据', async () => {
  const hugeData = JSON.stringify({
    favorites: Array(10000).fill({
      title: 'x'.repeat(1000),
      content: 'y'.repeat(10000)
    })
  });

  await expect(
    manager.importFavorites(hugeData)
  ).rejects.toThrow('导入数据过大');
});

// 3. XSS测试
test('应清理metadata中的危险内容', async () => {
  const id = await manager.addFavorite({
    title: 'test',
    content: 'test',
    metadata: {
      customStyle: "background: url('javascript:alert(1)')"
    } as any
  });

  const favorite = await manager.getFavorite(id);
  expect(favorite.metadata).not.toHaveProperty('customStyle');
});
```

---

## 结论

新增的收藏功能在基础XSS防护方面做得较好（使用DOMPurify），但在**输入验证**、**原型污染防护**和**授权机制**方面存在明显不足。建议按照优先级修复计划逐步改进，特别是立即修复原型污染漏洞（HIGH-1），该漏洞具有较高的可利用性和影响范围。

**总体风险评级**: 🟡 MEDIUM-HIGH
**建议修复时间线**: 关键漏洞 1-3 天内修复

---

## 附录：审查方法论

本次审查采用以下方法：
1. **代码流分析**: 追踪用户输入从UI层到存储层的完整流程
2. **依赖分析**: 检查第三方库（DOMPurify, markdown-it）的安全配置
3. **攻击面建模**: 识别所有可能的攻击入口点（导入、更新、metadata）
4. **漏洞模式匹配**: 对照OWASP Top 10和CWE常见漏洞模式
5. **实际可利用性评估**: 仅报告置信度 > 0.7 的漏洞

审查覆盖的文件：
- `packages/core/src/services/favorite/manager.ts` (565行)
- `packages/core/src/services/favorite/types.ts` (146行)
- `packages/ui/src/components/FavoriteCard.vue` (292行)
- `packages/ui/src/components/FavoriteListItem.vue` (305行)
- `packages/ui/src/components/FavoriteManager.vue` (965行)
- `packages/ui/src/components/OutputDisplayCore.vue` (549行)
- `packages/ui/src/components/MarkdownRenderer.vue` (280行)
- `packages/core/src/services/storage/localStorageProvider.ts` (165行)

**审查完成时间**: 2025-10-13
**审查耗时**: 约45分钟
**代码总行数**: ~3267行
