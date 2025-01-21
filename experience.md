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