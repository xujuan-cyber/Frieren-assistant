# 开发经验记录

记录开发过程中的重要经验和最佳实践。

## 🔧 技术经验

### 架构设计
- [经验描述] - [适用场景] - [记录日期]

### 错误处理
- [错误类型] - [解决方案] - [预防措施] - [记录日期]

### 性能优化
- [优化点] - [优化方法] - [效果] - [记录日期]

### 测试实践
- [测试类型] - [最佳实践] - [工具推荐] - [记录日期]

## 🛠️ 工具配置

### 开发工具
- [工具名称] - [配置要点] - [使用技巧] - [记录日期]

### 调试技巧
- [问题类型] - [调试方法] - [工具使用] - [记录日期]

## 📚 学习资源

### 有用文档
- [文档标题] - [链接] - [要点总结] - [记录日期]

### 代码示例
- [功能描述] - [代码片段或文件位置] - [使用场景] - [记录日期]

## 🚫 避坑指南

### 常见错误
- [错误描述] - [原因分析] - [避免方法] - [记录日期]

### 设计陷阱
- [设计问题] - [问题后果] - [正确做法] - [记录日期]

## 🔄 流程改进

### 工作流优化
- [改进点] - [改进方法] - [效果评估] - [记录日期]

### 文档管理
- [管理经验] - [工具使用] - [效率提升] - [记录日期]

## 接口驱动架构改造

### 核心原则
- **接口优先**: 所有跨模块和跨进程调用必须通过明确定义的接口
- **严格约束**: Web和Desktop环境都使用相同的接口，确保行为一致性
- **代理转发**: Desktop环境的ElectronProxy只做IPC转发，不实现业务逻辑

### 避免过度设计 ⚠️
**重要教训**: 在ModelManager重构中添加了未使用的`getModelOptions`方法

**问题分析**:
- 盲目补全接口方法，没有验证实际需求
- 想当然认为"应该"需要某个方法
- 导致接口膨胀和维护负担

**最佳实践**:
1. **需求驱动**: 只有确实需要的方法才添加到接口
2. **使用验证**: 每个新增方法都要有明确的使用场景
3. **定期审核**: 检查接口中是否有未使用的方法
4. **YAGNI原则**: You Aren't Gonna Need It - 不要提前实现可能用不到的功能

**审核检查清单**:
- [ ] 新增方法是否有明确的调用方？
- [ ] 是否能在UI层找到实际使用？
- [ ] 是否有测试用例覆盖？
- [ ] 是否符合当前业务需求？

### 接口管理规范

**添加新方法流程**:
1. 确认实际需求 - 必须有具体的使用场景
2. 在接口中声明 - 完整的类型定义
3. 实现类中实现 - 完整的业务逻辑
4. Web适配器暴露 - 严格按接口约束
5. Desktop IPC转发 - 完整的调用链
6. UI层验证使用 - 确保功能可达
7. workspace记录 - 详细的变更记录

**移除无用方法流程**:
1. 搜索使用情况 - 确认真的没有使用
2. 逆向清理链路 - 从UI层到核心层完全移除
3. 更新类型定义 - 保持类型系统一致
4. 记录清理原因 - 在workspace中详细记录

### 变更管理

**workspace记录要求**:
- 所有接口变更都必须记录
- 包含变更原因和影响范围
- 记录学到的经验教训
- 便于后续审核和回溯

**审核检查点**:
- 重构开始前：明确需求边界
- 实现过程中：验证每个新增方法
- 完成后：全面审核是否有冗余
- 定期维护：清理累积的技术债务

### 适配器和IPC链检查经验 ⚠️

**重要发现**: 在接口驱动架构改造过程中，发现了代理模式实现的关键问题

#### 正确的代理模式原则

**ElectronProxy类的唯一职责**: 
- ✅ **只做IPC转发**，绝不实现任何业务逻辑
- ✅ **严格遵循接口**，确保方法签名完全一致
- ✅ **错误透传**，让主进程处理所有业务错误
- ✅ **无状态设计**，不维护任何本地状态

#### ❌ 错误实现案例：TemplateManager ElectronProxy

**问题1**: `ensureInitialized()`错误实现
```typescript
// ❌ 错误：返回空实现
async ensureInitialized(): Promise<void> {
  return Promise.resolve();
}

// ✅ 正确：应该转发到主进程
async ensureInitialized(): Promise<void> {
  return this.electronAPI.template.ensureInitialized();
}
```

**问题2**: `isInitialized()`错误实现  
```typescript
// ❌ 错误：返回硬编码值
isInitialized(): boolean {
  return true;
}

// ✅ 正确：应该转发到主进程
isInitialized(): boolean {
  return this.electronAPI.template.isInitialized();
}
```

**问题3**: 缺少关键方法的IPC转发
- `changeBuiltinTemplateLanguage()` - UI层实际使用但未转发
- `getCurrentBuiltinTemplateLanguage()` - UI层实际使用但未转发
- `getSupportedBuiltinTemplateLanguages()` - UI层实际使用但未转发
- `getSupportedLanguages()` - UI层实际使用但未转发

#### ✅ 正确实现案例：ModelManager ElectronProxy

```typescript
export class ElectronModelManagerProxy implements IModelManager {
  async getAllModels(): Promise<Array<ModelConfig & { key: string }>> {
    return this.electronAPI.model.getAllModels(); // 纯转发
  }
  
  async getModel(key: string): Promise<ModelConfig | undefined> {
    return this.electronAPI.model.getModel(key); // 纯转发
  }
  
  // 所有方法都是纯转发，无任何业务逻辑
}
```

#### Web适配器的职责

**目标**: 确保Web环境也通过接口调用，而不是直接访问实现类

**错误模式**:
```typescript
// ❌ 错误：直接使用实现类实例
llmService = createLLMService(modelManagerInstance);

// useAppInitializer中返回
services.value = {
  llmService, // 直接暴露实现类
}
```

**正确模式**:
```typescript
// ✅ 正确：创建严格遵循接口的适配器
const llmServiceAdapter: ILLMService = {
  testConnection: (provider) => llmServiceInstance.testConnection(provider),
  fetchModelList: (provider, config) => llmServiceInstance.fetchModelList(provider, config),
  // 只暴露接口定义的方法
};

services.value = {
  llmService: llmServiceAdapter, // 使用适配器
}
```

#### 检查清单 📋

**ElectronProxy检查要点**:
- [ ] 是否只做IPC转发，无业务逻辑？
- [ ] 是否严格实现接口的所有方法？
- [ ] 是否正确处理异步方法的返回？
- [ ] 是否正确处理错误传播？
- [ ] `ensureInitialized`和`isInitialized`是否正确转发？

**Web适配器检查要点**:
- [ ] 是否严格按接口定义暴露方法？
- [ ] 是否避免暴露实现类的额外方法？
- [ ] useAppInitializer中是否使用适配器而非直接实例？
- [ ] 适配器的方法签名是否与接口完全一致？

**IPC链完整性检查**:
- [ ] preload.js中是否暴露所有接口方法？
- [ ] main.js中是否处理所有接口方法？
- [ ] 方法命名是否保持一致性？
- [ ] 异步方法是否正确使用ipcRenderer.invoke？

#### 架构一致性原则

1. **Web和Desktop必须使用相同的调用模式**
   - 都通过接口调用，绝不直接访问实现类
   - 确保行为完全一致，避免环境差异导致的bug

2. **代理类职责单一**
   - ElectronProxy只做IPC转发
   - Web适配器只做接口约束
   - 业务逻辑只在实现类中

3. **接口驱动开发**
   - 先定义接口，再实现功能
   - 跨模块调用必须通过接口
   - 定期审核避免过度设计

#### 修复优先级

**紧急修复** (阻塞Desktop功能):
1. TemplateManager ElectronProxy转发问题
2. 缺失的语言相关方法IPC链

**重要修复** (架构一致性):
1. 创建缺失的Web适配器  
2. 创建DataManager ElectronProxy
3. 统一useAppInitializer的调用模式

这次检查揭示了代理模式实现中的关键错误，强调了严格按接口转发的重要性。

---

## TemplateManager 初始化逻辑重构与依赖注入

### 初始状态与问题
- **问题描述**: `TemplateManager` 内部包含了一套复杂的异步初始化逻辑，使用了 `init()`, `initPromise`, `ensureInitialized()` 和 `initialized` 标志。这套机制虽然解决了并发初始化的问题，但逻辑混乱且难以理解。
- **深层原因**: `TemplateManager` 承担了其依赖项 `LanguageService` 的初始化责任，违反了单一职责和依赖注入原则。一个服务不应该负责其依赖的生命周期管理。

### 核心争论与解决方案
- **关键洞察**: 用户提出，当 `LanguageService` 被注入到 `TemplateManager` 的构造函数时，就应该假定它已经被完全初始化了。这是正确的架构思想。
- **解决方案**:
  1. **责任上移**: 将初始化 `LanguageService` 的责任从 `TemplateManager` 中完全移除，并上移到更高层次的"组装层"——`useAppInitializer.ts`。
  2. **状态移除**: 删除 `TemplateManager` 内部所有与初始化相关的状态和方法（`init`, `initPromise`, `initialized`, `ensureInitialized`），使其成为一个完全无状态的、更纯粹的管理器。
  3. **集中管理**: 在 `useAppInitializer.ts` 的 `initialize` 函数中，通过 `Promise.all` 统一、并行地初始化所有需要的服务，包括 `LanguageService`。

### 重构后的架构
- **清晰的依赖关系**: `useAppInitializer` 负责创建和初始化所有服务实例。
- **简化的服务**: `TemplateManager` 只关注其核心业务（模板的增删改查），不再关心其依赖项的状态。
- **健壮的启动流程**: 所有服务的初始化流程都被集中在一个地方管理，使得启动逻辑更清晰，也更容易排查问题。

### 附带清理：移除无用的 `getSupportedLanguages` 方法
- **问题**: 在重构过程中，我们审查了 `ITemplateManager` 接口，发现 `getSupportedLanguages(template)` 方法是一个典型的"过度设计"。虽然它提供了一个统一的抽象，但在实际UI中，逻辑是分开处理的：内置模板需要语言列表，而用户模板则不需要。
- **验证**: 通过全局搜索发现，该方法虽然被完整地实现了（包括IPC链），但从未被任何有意义的业务逻辑调用。真正被调用的是更直接的 `getSupportedBuiltinTemplateLanguages()`。
- **行动**: 我们果断地将 `getSupportedLanguages` 从接口、实现、代理和IPC链中彻底移除，减少了代码的冗余和复杂性。

**经验总结**:
1.  **坚持依赖注入**: 服务应该接收"准备就绪"的依赖，而不是自己去初始化它们。
2.  **YAGNI (You Aren't Gonna Need It)**: 避免为了理论上的"优雅"而进行过度设计。只有在真实需求出现时，才添加对应的抽象层。
3.  **定期代码审查**: 像这次一样，通过提问和讨论，可以有效地发现并清理无用的代码和不合理的设计。

## 📝 使用说明

1. **及时记录** - 遇到重要经验立即记录
2. **分类整理** - 按照上述分类组织内容
3. **定期回顾** - 每周回顾一次，提取可复用经验
4. **归档整理** - 任务完成时将相关经验归档到archives
