# 项目经验总结

## 📋 快速索引
- [架构设计](#架构设计)
- [错误处理](#错误处理)
- [测试规范](#测试规范)
- [Vue开发](#vue开发)
- [工具使用](#工具使用)

## 架构设计

### API集成最佳实践
- 配置与业务逻辑分离
- 统一接口格式和认证机制
- 提示词模板独立管理
- 错误处理标准化

### 模块化设计规范
```src/```目录结构：
- ```api/```: 外部API封装
- ```services/```: 业务逻辑
- ```config/```: 配置文件
- ```components/```: UI组件
- ```prompts/```: 提示词模板

### LLM服务架构
1. API标准化
   - 统一使用OpenAI格式接口
   - 减少特殊适配代码
   > 📝 Gemini API兼容说明：使用 ```https://generativelanguage.googleapis.com/v1beta/openai```

2. Provider设计
   - 唯一标识：使用provider区分不同服务商
   - 配置完整性：必需字段(name、baseURL、models、defaultModel、enabled、apiKey)
   - 安全性：环境变量管理敏感信息
   - 扩展性：支持动态配置更新
   - 实例管理：使用缓存优化性能

## 错误处理

### ⚠️ 常见错误与解决方案

#### 1. 模板ID与模型key混淆
**问题**：将模型key错误用作模板ID导致模板加载失败
**解决**：
- 明确区分模板ID和模型key
- 使用固定功能ID(如'optimize')
- 模型key仅用于API配置

#### 2. 状态同步问题 (2024-03-22)
**问题**：UI选择的模型与服务实际使用的模型不同步
**解决**：
- 模型选择变更时同步更新服务状态
- 初始化时确保正确设置provider
- 添加专门的状态同步处理函数

#### 3. 组件状态独立性 (2024-03-22)
**问题**：不同功能区域共享状态导致混乱
**解决**：
- 为不同功能区域使用独立数据源
- 确保组件属性配置完整
- 使用清晰的命名区分状态

#### 4. API调用架构问题 (2024-03-22)
**问题**：全局currentProvider导致状态管理复杂
**解决**：
- 移除全局currentProvider
- API调用时显式传入模型参数
- 简化状态管理，减少同步需求

### 错误处理原则
- 开发环境保留原始错误信息
- 避免过度包装错误信息
- 直接展示具体错误信息
- 包含充分的上下文信息

## 测试规范

### 测试架构 (2024-03-22更新)
1. 配置管理
   - 将所有提供商配置集中管理
   - 为测试场景预留专门配置
   - 使用统一的配置更新机制

2. 测试用例编写
   - 避免使用已废弃方法
   - 优雅处理环境变量依赖
   - 使用清晰的跳过测试提示
   - 保持测试用例独立性

### 环境变量处理
⚠️ **注意**: Vite项目中必须使用```import.meta.env```而非```process.env```
```javascript
// ❌ 错误示例
const apiKey = process.env.GEMINI_API_KEY;

// ✅ 正确示例
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

### 测试文件组织
- 按功能模块拆分测试文件
- 使用目录结构组织不同类型测试
- 每个文件关注特定功能
- 相关文件集中管理

## Vue开发

### Composable使用规范
1. 基本原则
   - 顶层直接调用，避免在生命周期钩子中使用
   - 返回函数直接使用，无需.value
   - 返回的功能不需要ref包装

2. 模板引用最佳实践
   - 仅在必要时使用ref属性
   - 优先使用composable提供的方法
   - 优先使用响应式API

### 组件通信规范
1. Props和v-model
   - Props保持只读
   - 使用emit发送更新事件
   - 计算属性处理双向绑定

2. 状态同步
   ```vue
   <!-- 父组件 -->
   <template>
     <ModelManager @modelsUpdated="loadModels" />
   </template>

   <script setup>
   const loadModels = async () => {
     models.value = llmService.getAllModels()
     // 检查当前模型有效性
     if (!enabledModels.value.find(m => m.key === currentModel.value)) {
       currentModel.value = enabledModels.value[0]?.key
     }
   }
   </script>
   ```

### UI设计规范
1. 布局设计
   - Grid实现响应式布局
   - Flex处理组件内部结构
   - 统一使用Tailwind间距

2. 主题系统
   - CSS变量管理主题色
   - 合理使用透明度创建层次
   - 深色主题避免纯黑
   - 确保文本可读性

3. 交互反馈
   - 清晰的加载状态
   - 及时的操作反馈
   - 合理的禁用状态
   - 适度的过渡动画

## 工具使用

### NPM包版本管理
1. 常用命令
   ```bash
   npm list --depth=0  # 查看直接依赖
   npm outdated       # 查看可更新包
   npm view [包名] versions  # 查看可用版本
   ```

2. 版本规则
   - ^: 兼容小版本更新(1.2.3 → 1.3.0)
   - ~: 仅兼容补丁更新(1.2.3 → 1.2.4)
   - *: 接受所有更新

3. 更新最佳实践
   - 更新前提交代码备份
   - 更新后运行测试验证
   - 问题时回滚package.json
   - 建议逐个包更新(ncu -u [包名])