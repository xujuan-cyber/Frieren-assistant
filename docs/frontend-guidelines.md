# 前端开发指南

## 1. 项目结构
- 遵循功能模块化组织
- 保持目录结构清晰
- 避免过深的嵌套

```javascript
src/
  ├── api/        // API接口
  ├── assets/     // 静态资源
  ├── components/ // 组件
  ├── services/   // 业务逻辑
  ├── config/     // 配置
  └── styles/     // 样式
```

## 2. 组件开发规范

### 2.1 命名规范
- 组件文件名：PascalCase
- 组件名：PascalCase
- Props：camelCase
- 事件：camelCase
- CSS类名：kebab-case

### 2.2 组件结构
```vue
<script setup>
// 1. 导入
import { ref, computed } from 'vue'

// 2. Props定义
const props = defineProps({
  modelValue: String,
  label: String
})

// 3. Emits定义
const emit = defineEmits(['update:modelValue'])

// 4. 响应式数据
const localValue = ref('')

// 5. 计算属性
const computedValue = computed(() => {
  return localValue.value.trim()
})

// 6. 方法
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="component-wrapper">
    <!-- 组件模板 -->
  </div>
</template>

<style scoped>
/* 组件样式 */
</style>
```

## 3. 样式指南

### 3.1 TailwindCSS使用
- 优先使用工具类
- 抽取重复样式为组件
- 使用主题变量
- 响应式设计优先

### 3.2 CSS命名规范
- 使用BEM命名法
- 避免深层嵌套
- 保持选择器简单

## 4. TypeScript使用

### 4.1 类型定义
- 使用接口定义数据结构
- 导出公共类型
- 避免any类型

```typescript
interface ModelConfig {
  name: string
  baseURL: string
  models: string[]
  defaultModel: string
  enabled: boolean
}
```

### 4.2 类型检查
- 启用严格模式
- 使用类型断言
- 处理空值情况

## 5. 性能优化

### 5.1 代码优化
- 组件懒加载
- 代码分割
- 缓存优化
- 避免内存泄漏

### 5.2 构建优化
- 压缩资源
- Tree Shaking
- 按需加载
- 缓存策略

## 6. 测试规范

### 6.1 单元测试
- 测试组件行为
- 测试业务逻辑
- 模拟API调用

### 6.2 集成测试
- 测试组件交互
- 测试状态管理
- 测试路由功能

## 7. 代码审查清单
- 代码格式规范
- 命名规范
- 注释完整性
- 类型定义
- 错误处理
- 性能考虑
- 测试覆盖 