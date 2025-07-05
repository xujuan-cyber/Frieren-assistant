# 开发经验总结

## 🎯 核心经验

### 1. IPC 异步调用一致性原则

**核心发现**: Web 和 Electron 环境必须使用完全相同的异步接口签名。

**问题表现**:
- UI 显示 "Object Promise" 而不是实际值
- 异步方法被当作同步使用
- 跨环境行为不一致

**解决原则**:
```typescript
// ✅ 正确：统一的异步接口
export interface ITemplateLanguageService {
  getCurrentLanguage(): Promise<BuiltinTemplateLanguage>;
  getSupportedLanguages(): Promise<BuiltinTemplateLanguage[]>;
}

// ❌ 错误：混合同步/异步接口
export interface ITemplateLanguageService {
  getCurrentLanguage(): BuiltinTemplateLanguage; // 同步
  getSupportedLanguages(): Promise<BuiltinTemplateLanguage[]>; // 异步
}
```

**检查清单**:
- [ ] IPC 方法是否返回 Promise？
- [ ] 代理类方法签名是否与 IPC 方法匹配？
- [ ] 调用方是否正确使用 `await`？
- [ ] 接口定义是否反映真实的异步性质？
- [ ] Web 和 Electron 环境是否使用相同的接口？

### 2. preload.js 架构原则

**核心原则**: preload.js 严禁自己实现功能，所有方法都必须通过 IPC 调用主进程。

**错误模式**:
```javascript
// ❌ 错误：在 preload.js 中自己实现功能
isInitialized: () => {
  return true; // 硬编码返回值
},
```

**正确模式**:
```javascript
// ✅ 正确：通过 IPC 调用主进程
isInitialized: async () => {
  const result = await ipcRenderer.invoke('model-isInitialized');
  if (!result.success) throw new Error(result.error);
  return result.data;
},
```

**架构检查要点**:
- [ ] 是否所有方法都通过 `ipcRenderer.invoke()` 调用？
- [ ] 是否没有任何硬编码的返回值？
- [ ] 是否没有本地状态管理？
- [ ] 是否使用统一的错误处理格式？
- [ ] 是否与对应的 ElectronProxy 类方法签名一致？

### 3. 接口驱动设计原则

**核心原则**: 在服务注入和类型声明中必须使用接口类型，不能使用具体类类型。

**问题表现**:
```typescript
// ❌ 错误：使用具体类类型
let dataManager: DataManager;
export interface AppServices {
  dataManager: DataManager;
}
```

**正确实现**:
```typescript
// ✅ 正确：使用接口类型
let dataManager: IDataManager;
export interface AppServices {
  dataManager: IDataManager;
}
```

**设计优势**:
- **跨环境兼容性** - 接口确保 Web 和 Electron 环境的实现可以互换
- **代理模式支持** - ElectronProxy 类可以正确实现接口而不需要继承具体类
- **类型安全** - TypeScript 编译器确保接口实现的完整性

## 🛠️ 技术实现经验

### 1. Promise 对象显示问题诊断

**问题识别**:
当 UI 显示 "Object Promise" 时，通常表示异步方法被当作同步使用。

**诊断步骤**:
1. 检查显示异常的 UI 组件
2. 追踪数据来源的方法调用
3. 确认方法是否返回 Promise 对象
4. 检查调用方是否使用 `await`

**修复模式**:
```vue
<!-- 修复前 -->
<template>
  <span>{{ currentLanguage }}</span> <!-- 显示 "Object Promise" -->
</template>

<script>
const currentLanguage = computed(() => {
  return service.getCurrentLanguage(); // 返回 Promise
});
</script>

<!-- 修复后 -->
<template>
  <span>{{ currentLanguage }}</span> <!-- 显示 "中文" -->
</template>

<script>
const currentLanguage = ref('');

const loadCurrentLanguage = async () => {
  currentLanguage.value = await service.getCurrentLanguage(); // 正确使用 await
};
</script>
```

### 2. 接口实现完整性检查

**常见问题**: 在创建适配器时遗漏某些接口方法。

**检查方法**:
1. 利用 TypeScript 编译器检查接口实现
2. 确保适配器实现接口的所有方法
3. 验证方法签名与接口定义完全匹配

**修复示例**:
```typescript
// 修复前 - 缺失 getRecord 方法
const historyManagerAdapter: IHistoryManager = {
  getRecords: () => historyManagerInstance.getRecords(),
  // ❌ 缺失 getRecord 方法
  addRecord: (record) => historyManagerInstance.addRecord(record),
};

// 修复后 - 完整实现
const historyManagerAdapter: IHistoryManager = {
  getRecords: () => historyManagerInstance.getRecords(),
  getRecord: (id) => historyManagerInstance.getRecord(id), // ✅ 添加缺失方法
  addRecord: (record) => historyManagerInstance.addRecord(record),
};
```

### 3. 冗余代码清理策略

**识别标准**:
- 方法标记为 `@deprecated`
- 实现只是简单转发到其他方法
- 没有实际调用的代码

**清理步骤**:
1. 确认方法已被替代且无实际使用
2. 从接口定义中删除
3. 从所有实现类中删除
4. 从代理类和适配器中删除
5. 验证构建和功能正常

## 🚫 避坑指南

### 1. 异步接口设计陷阱

**陷阱**: 在不同环境中使用不同的方法签名（同步 vs 异步）。

**避免方法**:
- 设计接口时优先考虑最复杂环境的需求（通常是 Electron）
- 如果任何环境需要异步，所有环境都使用异步接口
- 使用 TypeScript 接口确保实现一致性

### 2. preload.js 实现陷阱

**陷阱**: 为了简化而在 preload.js 中直接返回硬编码值。

**避免方法**:
- 严格遵循"只做 IPC 转发"原则
- 所有业务逻辑都在主进程中实现
- 使用统一的错误处理格式

### 3. 类型安全陷阱

**陷阱**: 在服务注入中混合使用接口类型和具体类类型。

**避免方法**:
- 统一使用接口类型进行服务注入
- 在 AppServices 接口中只使用接口类型
- 利用 TypeScript 编译器检查类型一致性

### 4. 错误处理陷阱

**陷阱**: 使用 try-catch 掩盖错误，静默处理异常。

**避免方法**:
- 应用立即错误原则，让错误自然传播
- 只在确实需要处理的地方使用 try-catch
- 提供明确的错误信息，便于调试

## 🔄 架构设计经验

### 1. 跨环境接口设计

**设计原则**:
- **统一性优先** - 所有环境使用相同的接口
- **异步优先** - 如果任何环境需要异步，全部使用异步
- **类型安全** - 利用 TypeScript 确保实现一致性

**实现模式**:
```typescript
// 1. 定义统一接口
export interface IService {
  method(): Promise<Result>;
}

// 2. Web 环境实现
export class WebService implements IService {
  async method(): Promise<Result> {
    // 同步逻辑包装为异步
    return Promise.resolve(syncResult);
  }
}

// 3. Electron 环境实现
export class ElectronServiceProxy implements IService {
  async method(): Promise<Result> {
    // 直接调用异步 IPC
    return this.electronAPI.method();
  }
}
```

### 2. 错误处理架构

**立即错误原则**:
- 错误应该在发生的地方立即抛出
- 不要使用默认值掩盖错误
- 让调用者决定如何处理错误

**实现模式**:
```typescript
// ✅ 正确：立即抛出错误
const refresh = async () => {
  const service = getService();
  if (!service) {
    throw new Error('Service not available');
  }
  
  return await service.getData(); // 让错误自然传播
};

// ❌ 错误：掩盖错误
const refresh = async () => {
  try {
    const service = getService();
    return await service.getData();
  } catch (error) {
    console.error('Error:', error);
    return []; // 掩盖了问题
  }
};
```

### 3. 代码清理策略

**清理时机**:
- 功能完成后立即清理
- 发现冗余代码时及时处理
- 定期审查标记为 `@deprecated` 的代码

**清理原则**:
- 确保没有实际使用
- 完整删除（接口、实现、调用）
- 验证删除后功能正常

这些经验为后续的 IPC 开发和跨环境架构设计提供了重要的参考和指导。
