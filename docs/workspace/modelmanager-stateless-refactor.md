# ModelManager 无状态重构记录

## 📅 时间
2025-01-09

## 🎯 重构目标
将 ModelManager 从有状态服务重构为无状态服务，解决内存和存储不一致问题，提升测试隔离性。

## 🔍 问题背景

### 原始问题
1. **双重状态管理**：ModelManager 同时维护内存状态 (`this.models`) 和存储状态
2. **状态不一致**：内存和存储可能不同步，导致数据不一致
3. **测试隔离困难**：清理存储无法清理内存状态，测试间有冲突
4. **模型key冲突**：测试中使用默认模型key导致 "Model xxx already exists" 错误

### 具体表现
```typescript
// 问题代码示例
constructor(storageProvider: IStorageProvider) {
  this.models = { ...defaultModels }; // ❌ 预加载到内存
}

async addModel(key: string, config: ModelConfig) {
  // ❌ 检查内存状态，即使存储已清理
  if (this.models[key]) {
    throw new ModelConfigError(`Model ${key} already exists`);
  }
}
```

## 🔧 重构方案

### 核心思路
**移除内存缓存，直接操作存储，统一在存储层实现缓存策略**

### 主要变更

#### 1. 移除内存状态
```typescript
// 重构前
export class ModelManager {
  private models: Record<string, ModelConfig>; // ❌ 移除
  
  constructor(storageProvider: IStorageProvider) {
    this.models = { ...defaultModels }; // ❌ 移除
  }
}

// 重构后
export class ModelManager {
  // ✅ 不再维护内存状态
  constructor(storageProvider: IStorageProvider) {
    this.storage = new StorageAdapter(storageProvider);
  }
}
```

#### 2. 添加统一数据获取方法
```typescript
/**
 * 从存储获取模型配置，如果不存在则返回默认配置
 */
private async getModelsFromStorage(): Promise<Record<string, ModelConfig>> {
  const storedData = await this.storage.getItem(this.storageKey);
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (error) {
      console.error('[ModelManager] Failed to parse stored models:', error);
    }
  }
  return this.getDefaultModels();
}
```

#### 3. 重构所有方法使用存储
```typescript
// 重构前
async getAllModels(): Promise<Array<ModelConfig & { key: string }>> {
  // 使用内存状态
  return Object.entries(this.models).map(([key, config]) => ({
    key, ...config
  }));
}

// 重构后
async getAllModels(): Promise<Array<ModelConfig & { key: string }>> {
  const models = await this.getModelsFromStorage(); // ✅ 直接从存储获取
  return Object.entries(models).map(([key, config]) => ({
    key, ...config
  }));
}
```

#### 4. 简化操作逻辑
```typescript
// 重构前 - addModel
await this.storage.updateData(this.storageKey, (currentModels) => {
  const models = { ...this.models }; // ❌ 使用内存状态
  if (currentModels) {
    Object.assign(models, currentModels);
  }
  // ...
});
this.models[key] = config; // ❌ 更新内存状态

// 重构后 - addModel
await this.storage.updateData(this.storageKey, (currentModels) => {
  const models = currentModels || this.getDefaultModels(); // ✅ 只使用存储
  if (models[key]) {
    throw new ModelConfigError(`Model ${key} already exists`);
  }
  return { ...models, [key]: config };
});
// ✅ 不需要更新内存状态
```

## 📊 重构成果

### ✅ 解决的问题
1. **单一数据源**：只有存储是真实状态，消除状态不一致
2. **测试隔离**：`storage.clearAll()` 能完全重置状态
3. **简化逻辑**：不需要同步两个状态，代码更简洁
4. **提高可靠性**：减少状态不一致的风险

### 📈 测试结果
- **ModelManager 单元测试**: ✅ `23 tests passed`
- **PromptService 集成测试**: ✅ `12 tests passed`  
- **PromptService 单元测试**: ✅ `5 tests passed`
- **Real Components 集成测试**: ✅ `10 tests passed`

### 🔧 修复的测试问题
1. **模型key冲突**：为每个测试使用唯一的模型key
2. **测试隔离**：修复 beforeEach 中的清理顺序
3. **状态重置**：确保测试间完全隔离

## 🚀 架构优势

### 1. 为未来缓存做准备
现在可以在存储层统一实现缓存策略，而不是在各个服务中分别实现。

### 2. 更好的并发安全
避免了内存状态的竞态条件。

### 3. 简化的错误处理
只需要处理存储层的错误。

### 4. 更清晰的数据流
数据流向更加明确和可预测。

## 💭 未来优化方向

### 1. 移除 init 方法
当前 ModelManager 仍有 `init` 方法用于：
- Electron 环境配置同步
- 默认模型初始化和迁移

**建议**：将其改为懒加载模式，在 `getModelsFromStorage()` 中按需处理。

### 2. 统一存储层缓存
在 StorageProvider 层实现统一的缓存策略，所有服务都能受益。

### 3. 完全无状态化
考虑将所有服务都改为无状态设计，提升系统的可维护性和可测试性。

## 📝 相关文件变更

### 核心文件
- `packages/core/src/services/model/manager.ts` - 主要重构文件
- `packages/core/tests/unit/model/manager.test.ts` - 单元测试修复
- `packages/core/tests/integration/real-components.test.ts` - 集成测试修复

### 测试修复
- `tests/integration/real-vs-mock.test.ts` - 模型key冲突修复
- `tests/integration/storage-implementations.test.ts` - 测试隔离修复
- `tests/integration/prompt/service.integration.test.ts` - beforeEach 顺序修复

## 🎉 总结

这次重构成功地将 ModelManager 从有状态服务改为无状态服务，不仅解决了当前的测试隔离问题，还为未来的性能优化和功能扩展奠定了更好的基础。

**核心理念**：服务应该是无状态的，状态管理应该统一在存储层，这样能获得更好的可维护性、可测试性和可扩展性。
