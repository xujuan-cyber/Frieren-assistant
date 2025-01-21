# 项目经验总结

## 架构与开发规范

### API集成
- 配置与业务逻辑分离，便于扩展
- API配置统一接口格式
- 提示词模板独立管理
- 统一错误处理机制
- Header认证(Bearer Token)
- 统一认证处理机制

### 模块化设计
- 明确模块职责边界
- 避免功能重复实现
- 保持接口一致性
- 目录结构（src）：
  - api/: 外部API封装
  - services/: 业务逻辑
  - config/: 配置文件
  - components/: UI组件
  - prompts/: 提示词模板

## LLM服务最佳实践

### API标准化
- 使用OpenAI格式作为标准接口
- 不同模型只需配置baseURL
- 统一使用ChatOpenAI类
- 减少特殊适配代码
- gemini兼容：baseURL为https://generativelanguage.googleapis.com/v1beta/openai

### 配置管理
- 统一配置结构
- 模型选择和参数配置
- 提示词模板管理
- 错误处理和日志记录


### Provider设计
1. 唯一标识
   - provider作为模型服务唯一标识符
   - 用于区分不同AI模型服务提供商

2. 配置完整性
   - 包含完整配置信息
   - 必要字段：name、baseURL、models、defaultModel、enabled、apiKey

3. 安全性
   - 保护默认模型防止误删除
   - API密钥与provider绑定
   - 使用环境变量管理敏感信息

4. 扩展性
   - 支持自定义模型提供商
   - 允许动态更新配置
   - 提供模型切换机制

5. 实例管理
   - 使用缓存管理模型实例
   - 配置变更时清理缓存
   - 统一实例创建和获取接口

## 错误处理最佳实践

### 2024-03-21更新
- 开发环境保留原始错误信息
- 避免过度包装错误信息
- 直接展示具体错误信息
- 包含足够的上下文信息

### 模板ID与模型key区分
1. 问题描述
   - 避免将模型key作为模板ID
   - 防止加载不存在的模板文件

2. 解决方案
   - 明确区分模板ID和模型key
   - 使用固定功能ID(如'optimize')
   - 模型key仅用于API配置

## 测试规范

### 测试组织
- 按功能模块组织测试
- 测试正常和错误情况
- 验证状态变化
- 检查边界条件

### 环境变量处理
- 不强制要求所有环境变量
- 优雅跳过缺失环境变量
- 提供清晰的跳过原因

### 测试文件组织
- 按功能模块拆分测试文件
- 使用目录结构组织不同类型测试
- 测试运行器自动发现执行
- 每个文件关注特定功能
- 相关文件放同一目录

## 开发工具使用

### NPM包版本管理
1. 版本查看命令
   ```bash
   npm list --depth=0  # 查看直接依赖
   npm outdated       # 查看可更新包
   npm view [包名] versions  # 查看可用版本
   ```

2. 版本号规则
   - ^: 兼容小版本更新(1.2.3 → 1.3.0)
   - ~: 仅兼容补丁更新(1.2.3 → 1.2.4)
   - *: 接受所有更新

3. 更新最佳实践
   - 更新前提交代码备份
   - 更新后运行测试验证
   - 问题时可回滚package.json
   - 建议逐个包更新(ncu -u [包名])

## Vue组件开发

### Props和v-model
- Props是只读的，禁止直接修改
- 使用emit发送更新事件
- 计算属性处理双向绑定

### UI设计规范
1. 布局设计
   - 使用grid实现响应式布局
   - flex处理组件内部结构
   - 统一使用tailwind间距

2. 视觉系统
   - CSS变量管理主题色
   - 合理使用透明度创建层次
   - 确保颜色对比度
   - 统一的命名规范

3. 深色主题
   - 避免纯黑色背景
   - 使用半透明提升层次
   - 确保文本可读性
   - 优化强调色使用

4. 交互反馈
   - 清晰的加载状态
   - 及时的操作反馈
   - 合理的禁用状态
   - 适度的过渡动画

## 提示词迭代功能开发经验

### 1. 模板设计
- 迭代优化模板需要保持原有提示词的核心意图
- 模板结构要清晰，包含输入说明和输出格式
- 优化说明要包含保留部分和改进部分
- 避免过度修改导致偏离原意

### 2. UI交互设计
- 将迭代功能集成到现有界面，保持一致性
- 使用弹出式输入框收集优化需求
- 提供清晰的操作反馈和状态提示
- 优化按钮布局和交互流程

### 3. 数据结构设计
- 历史记录需要支持迭代关系
- 使用parentId追踪优化链
- 区分optimize和iterate两种类型
- 记录完整的优化过程

### 4. 最佳实践
1. 模板管理
   - 使用YAML格式存储模板
   - 统一的模板索引管理
   - 模板版本控制
   - 清晰的模板命名规范

2. 状态管理
   - 区分不同的加载状态
   - 合理的错误处理
   - 用户友好的提示信息
   - 状态重置的时机控制

3. 历史记录
   - 限制历史记录数量
   - 提供迭代链查询
   - 优化存储结构
   - 异常处理机制

4. 性能优化
   - 合理使用缓存
   - 避免重复API调用
   - 优化组件更新逻辑
   - 控制迭代深度

## Vue 3 开发经验总结

### Toast 组件和 Composable 使用

#### 1. Composable 的正确使用
- 当使用 composable 返回的功能时，不需要用 ref 包装
- composable 应该在组件顶层直接调用，而不是在生命周期钩子中
- 如果 composable 返回的是函数，直接使用即可，不需要 .value

#### 2. 模板引用的最佳实践
- 只在真正需要访问 DOM 元素时使用 ref 属性
- 使用 composable 时，优先使用其提供的方法而不是模板引用
- 如果组件提供了响应式 API，优先使用响应式 API 而不是模板引用

### 单元测试最佳实践

#### 1. Composable 的模拟
```typescript
// 正确的模拟方式
const mockSuccess = vi.fn()
const mockError = vi.fn()

vi.mock('./composables/useToast', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError
  })
}))

// 在 beforeEach 中重置
beforeEach(() => {
  mockSuccess.mockClear()
  mockError.mockClear()
})
```

#### 2. 测试用例编写技巧
- 每个测试用例只测试一个功能点
- 使用具名的 mock 函数便于跟踪和验证
- 在 beforeEach 中重置所有状态
- 正确处理异步操作和错误情况
- 验证组件的所有可能状态

#### 3. 错误处理和调试
- 使用 console.error 记录详细错误信息
- 在测试中验证错误处理逻辑
- 使用 try-catch 包装可能失败的操作
- 提供有意义的错误消息

### 代码组织和优化

#### 1. 组件状态管理
- 将相关的状态和方法组织在一起
- 使用计算属性而不是方法来派生状态
- 避免在模板中使用复杂的表达式

#### 2. 性能优化
- 避免不必要的响应式包装
- 及时清理不再需要的监听器和定时器
- 使用 computed 缓存计算结果

#### 3. 代码可维护性
- 使用清晰的命名约定
- 将复杂逻辑抽取到 composable 中
- 保持组件的单一职责

## 数据结构一致性

### 1. 命名规范
- 在整个应用中保持一致的数据结构命名
- 修改数据结构时需要同步更新所有相关组件
- 使用TypeScript类型定义避免命名不一致

### 2. 最佳实践
1. 数据接口定义
   ```typescript
   // 集中定义数据接口
   interface HistoryRecord {
     id: string
     prompt: string
     result: string
     type: 'optimize' | 'iterate'
     parentId: string | null
     timestamp: number
   }
   ```

2. 组件通信
   - 明确定义props和emit的数据格式
   - 使用TypeScript类型检查
   - 添加运行时验证

3. 数据转换
   - 在数据层统一处理格式转换
   - 避免在组件中直接修改数据结构
   - 提供清晰的数据转换方法

### 3. 常见问题
1. 数据结构不一致
   - 症状：组件显示空白或功能失效
   - 原因：属性名不匹配
   - 解决：统一命名规范，添加类型检查

2. 数据转换错误
   - 症状：数据显示异常
   - 原因：格式转换逻辑错误
   - 解决：集中管理数据转换逻辑

### 4. 测试策略
1. 单元测试
   - 测试数据结构的完整性
   - 验证数据转换方法
   - 检查边界情况

2. 集成测试
   - 测试组件间的数据传递
   - 验证状态管理
   - 测试用户交互流程

## Vue响应式数据更新

### 1. 响应式数据同步
- 在数据变更后立即更新响应式引用
- 避免依赖页面刷新更新数据
- 确保UI状态与数据状态同步

### 2. 最佳实践
1. 数据更新时机
   ```javascript
   // 正确的做法：立即更新响应式数据
   const handleAction = async () => {
     try {
       const result = await someAction()
       // 立即更新响应式数据
       data.value = result
       // 更新相关状态
       relatedData.value = promptManager.getRelatedData()
     } catch (error) {
       console.error(error)
     }
   }
   ```

2. 组件通信
   - 使用props传递数据时确保父组件数据更新
   - 子组件emit事件后更新相关状态
   - 考虑使用computed处理派生状态

3. 状态管理
   - 集中管理共享状态
   - 提供清晰的状态更新方法
   - 保持状态更新的一致性

### 3. 常见问题
1. 数据更新不及时
   - 症状：UI不能实时反映数据变化
   - 原因：没有及时更新响应式引用
   - 解决：在数据变更后立即更新

2. 状态不同步
   - 症状：组件间数据不一致
   - 原因：更新不完整或时机不对
   - 解决：确保所有相关状态同步更新

### 4. 调试技巧
1. Vue Devtools
   - 监控组件状态变化
   - 追踪数据流转过程
   - 验证更新是否生效

2. 响应式调试
   - 使用watchEffect跟踪依赖
   - 检查响应式引用是否正确
   - 验证计算属性的依赖关系

# Vue 测试经验总结

## 1. 测试框架选择
- 使用 Vitest 而不是 Jest 时，需要使用 `vi` 而不是 `jest` API
- 常见的替换：
  - `jest.clearAllMocks()` -> `vi.clearAllMocks()`
  - `jest.spyOn()` -> `vi.spyOn()`
  - `jest.fn()` -> `vi.fn()`

## 2. Vue 组件测试注意事项
### 2.1 数据修改
- 使用 `setData` 可能会遇到对象不可扩展的问题
- 推荐直接通过 `wrapper.vm` 修改数据，并使用 `nextTick` 等待更新：
  ```js
  // 不推荐
  await wrapper.setData({ prop: value })
  
  // 推荐
  wrapper.vm.prop = value
  await nextTick()
  ```

### 2.2 事件处理
- 异步事件处理需要使用 `await`
- 验证事件处理结果时，应该等待所有异步操作完成

### 2.3 Mock 使用
- 在 `beforeEach` 中重置所有 mock
- 使用 `mockResolvedValue` 和 `mockRejectedValue` 模拟异步操作
- 使用 `mockReturnValue` 模拟同步操作
- 使用 `mockImplementation` 自定义复杂的 mock 行为

### 2.4 断言最佳实践
- 验证函数调用时，使用 `toHaveBeenCalledWith` 检查参数
- 验证函数是否被调用，使用 `toHaveBeenCalled` 或 `not.toHaveBeenCalled`
- 验证异步操作后的状态变化，记得等待 `nextTick`

## 3. 常见问题及解决方案
### 3.1 对象不可扩展
**问题**：使用 `setData` 时遇到 "Cannot add property, object is not extensible" 错误
**原因**：Vue 3 的响应式系统使用 Proxy，某些对象可能被设置为不可扩展
**解决方案**：
1. 直接通过 `wrapper.vm` 修改数据
2. 使用 `nextTick` 等待更新
3. 确保数据结构在组件中已经定义

### 3.2 异步操作处理
**问题**：测试异步操作时结果不符合预期
**原因**：没有正确等待异步操作完成
**解决方案**：
1. 使用 `async/await` 处理所有异步操作
2. 在状态变化后使用 `nextTick`
3. 确保 mock 的异步操作返回 Promise

### 3.3 Mock 状态残留
**问题**：测试之间的 mock 状态互相影响
**原因**：没有正确重置 mock 状态
**解决方案**：
1. 在 `beforeEach` 中使用 `vi.clearAllMocks()`
2. 使用 `mockReset` 或 `mockRestore` 重置特定的 mock
3. 避免在测试套件级别共享可变的 mock 状态

### 2024-03-22 模型选择状态同步
1. 问题描述
   - UI选择的模型与服务实际使用的模型不同步
   - 导致请求使用了错误的模型

2. 解决方案
   - 在模型选择变更时同步更新服务状态
   - 在初始化时确保正确设置provider
   - 添加专门的状态同步处理函数

3. 最佳实践
   - UI状态变更时及时同步到服务层
   - 关键状态需要在所有相关组件间保持一致
   - 初始化时注意检查并同步所有相关状态
   - 使用专门的处理函数管理状态更新

4. 代码实现
   ```js
   // 模型选择更新处理
   const handleModelChange = (model) => {
     selectedModel.value = model
     llmService.setProvider(model)
   }
   
   // 初始化时同步状态
   if (defaultModel) {
     selectedModel.value = defaultModel
     llmService.setProvider(defaultModel)
   }
   ```

### 2024-03-22 组件状态独立性
1. 问题描述
   - 不同功能区域共享同一个数据源导致状态混乱
   - 组件属性配置不完整导致功能失效

2. 解决方案
   - 为不同功能区域使用独立的数据源
   - 确保组件所需的所有必要属性都已配置
   - 使用正确的状态变量和事件处理器

3. 最佳实践
   - 避免不相关组件共享状态
   - 组件属性要完整配置
   - 使用清晰的命名区分不同区域的状态
   - 保持状态的独立性和隔离性

4. 代码示例
   ```vue
   <!-- 错误示例：共享状态 -->
   <InputPanel v-model="sharedContent" />
   <InputPanel v-model="sharedContent" />

   <!-- 正确示例：独立状态 -->
   <InputPanel v-model="promptContent" />
   <InputPanel v-model="testContent" />
   ```

### 2024-03-22 API调用架构改进
1. 问题描述
   - 使用全局 currentProvider 导致状态管理复杂
   - 模型切换需要同步多处状态
   - 不够灵活，难以支持多模型并行使用

2. 解决方案
   - 移除全局 currentProvider
   - 每次API调用时直接传入要使用的模型
   - 简化状态管理，减少同步需求

3. 最佳实践
   - API调用时显式指定使用的模型
   - 避免使用全局状态存储当前模型
   - 保持服务层的无状态性
   - 状态管理由调用方负责

4. 代码示例
   ```js
   // 改进前：依赖全局状态
   class LLMService {
     async sendMessage(messages) {
       const config = this.models[this.currentProvider];
       // ...
     }
   }

   // 改进后：显式传入模型
   class LLMService {
     async sendMessage(messages, model) {
       const config = this.models[model];
       // ...
     }
   }
   ```

5. 优势
   - 代码更清晰，依赖关系明确
   - 更容易测试，不需要管理全局状态
   - 支持不同组件使用不同模型
   - 减少状态同步错误

# 开发经验总结

## 2024-03-22 测试架构改进

### 问题描述
在重构 LLM 服务架构后，测试用例出现了多个问题：
1. 测试用例仍在使用已移除的 `setApiKey` 和 `setProvider` 方法
2. 测试提供商未在系统中注册，导致"未知的提供商"错误
3. 环境变量处理方式不够优雅

### 解决方案
1. 架构调整：
   - 添加测试提供商到 `DEFAULT_MODELS` 配置中
   - 改进 `buildRequestConfig` 函数以更灵活地处理 API 密钥

2. 测试用例改进：
   - 移除对已废弃方法的依赖
   - 使用 `updateModelConfig` 统一管理配置
   - 在 API 调用时直接传递提供商参数
   - 优化环境变量检查的处理方式

### 代码示例
```javascript
// 1. 添加测试提供商配置
export const DEFAULT_MODELS = {
  // ... 其他提供商配置 ...
  test: {
    name: 'Test Model',
    baseUrl: 'https://test.api/chat/completions',
    models: ['test-model'],
    defaultModel: 'test-model',
    enabled: true // 测试模型默认启用
  }
};

// 2. 改进 buildRequestConfig 函数
export function buildRequestConfig(provider, model, apiKey, messages) {
  const config = DEFAULT_MODELS[provider];
  if (!config) throw new Error(`未知的提供商: ${provider}`);

  const headers = {
    'Content-Type': 'application/json'
  };

  // 灵活处理 API 密钥
  if (apiKey || config.apiKey) {
    headers['Authorization'] = 'Bearer ' + (apiKey || config.apiKey);
  }

  return {
    url: config.baseUrl,
    headers,
    body: {
      model: model || config.defaultModel,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    }
  };
}

// 3. 测试用例改进示例
describe('API 测试', () => {
  beforeEach(() => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未设置 API_KEY 环境变量');
      return;
    }
    
    // 使用 updateModelConfig 更新配置
    llmService.updateModelConfig(provider, { apiKey });
  });

  it('测试用例', async () => {
    // 直接传递提供商参数
    const response = await llmService.sendMessage(messages, provider);
    expect(response).toBeDefined();
  });
});
```

### 最佳实践
1. 配置管理：
   - 将所有提供商配置集中在一处管理
   - 为测试场景预留专门的提供商配置
   - 使用统一的配置更新机制

2. 测试用例编写：
   - 避免在测试中使用已废弃的方法
   - 优雅处理环境变量依赖
   - 使用清晰的跳过测试提示
   - 保持测试用例的独立性

3. API 调用：
   - 直接传递必要参数，避免依赖全局状态
   - 灵活处理配置项，支持多种使用场景
   - 提供清晰的错误提示

### 收获
1. 测试架构应该随着主架构的演进而更新
2. 好的测试设计可以帮助发现架构中的问题
3. 环境变量处理需要在便利性和健壮性之间找到平衡
4. 统一的配置管理可以简化测试用例的编写和维护

## 2024-03-22 Vite环境变量处理

### 问题描述
在集成测试中遇到环境变量读取问题：
1. 测试用例使用 `process.env` 读取环境变量
2. 实际环境变量是以 `VITE_` 前缀定义的
3. 导致测试无法正确读取环境变量而被跳过

### 解决方案
1. 在 Vite 项目中使用 `import.meta.env` 读取环境变量
2. 确保环境变量名称包含 `VITE_` 前缀
3. 更新测试用例以匹配正确的环境变量访问方式

### 代码示例
```javascript
// 错误示例：使用 process.env
const apiKey = process.env.GEMINI_API_KEY;

// 正确示例：使用 import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

### 最佳实践
1. 环境变量命名：
   - Vite 项目中使用 `VITE_` 前缀
   - 使用大写字母和下划线
   - 名称要清晰表达用途

2. 环境变量访问：
   - 在 Vite 项目中统一使用 `import.meta.env`
   - 避免使用 `process.env`
   - 注意开发环境和生产环境的差异

3. 测试用例编写：
   - 正确处理环境变量依赖
   - 提供清晰的跳过测试提示
   - 验证环境变量存在性

### 收获
1. Vite 项目有其特定的环境变量处理方式
2. 需要注意开发框架的特性和约定
3. 统一的环境变量访问方式有助于代码维护
4. 清晰的错误提示有助于问题诊断

## 2024-03-22 组件状态同步

### 问题描述
在模型设置界面修改模型名称后，模型下拉选择框没有立即更新，需要页面刷新才能看到更改。这是由于：
1. 组件间状态同步不完整
2. 事件处理机制未正确实现
3. 模型更新后的状态检查不够完善

### 解决方案
1. 事件通信：
   - 子组件触发 `modelsUpdated` 事件
   - 父组件监听并处理更新事件
   - 确保所有模型操作后都触发更新

2. 状态更新：
   - 重新加载模型列表
   - 检查当前选择的模型是否有效
   - 必要时更新为默认模型

### 代码示例
```vue
<!-- 父组件 -->
<template>
  <ModelManager
    @modelsUpdated="loadModels"
  />
</template>

<script setup>
const loadModels = async () => {
  models.value = llmService.getAllModels()
  
  // 设置默认模型
  const defaultModel = enabledModels.value[0]?.key
  if (defaultModel) {
    // 检查当前选择的模型是否有效
    if (!enabledModels.value.find(m => m.key === currentModel.value)) {
      currentModel.value = defaultModel
    }
  }
}
</script>

<!-- 子组件 -->
<script setup>
const emit = defineEmits(['modelsUpdated'])

const updateModel = () => {
  // 更新模型配置
  llmService.updateModelConfig(...)
  
  // 触发更新事件
  loadModels()
}

const loadModels = () => {
  models.value = llmService.getAllModels()
  emit('modelsUpdated', models.value)
}
</script>
```

### 最佳实践
1. 组件通信：
   - 使用事件机制进行组件间通信
   - 明确定义事件名称和参数
   - 确保事件在适当时机触发

2. 状态管理：
   - 集中管理共享状态
   - 及时更新相关组件状态
   - 处理无效状态的情况

3. 数据校验：
   - 检查数据有效性
   - 提供合理的默认值
   - 处理异常情况

### 收获
1. 组件间的状态同步需要特别注意
2. 事件机制是组件通信的重要方式
3. 状态更新后需要进行有效性检查
4. 提供良好的用户体验需要及时的状态更新