# 前端开发指南

## 1. 项目架构

### 1.1 包结构
```
packages/
  ├── core/       # 核心功能包
  └── web/        # Web前端包
```

### 1.2 Web包结构
```
web/
  ├── src/
  │   ├── components/  # Vue组件
  │   ├── assets/      # 静态资源
  │   └── styles/      # 样式
  └── tests/           # 测试文件
```

## 2. 服务使用规范

### 2.1 核心服务导入
```typescript
// 正确的导入方式
import { 
  createLLMService,
  createPromptService,
  modelManager,
  templateManager,
  historyManager 
} from '@prompt-optimizer/core'

// 错误的导入方式
import { createLLMService } from '../services/llm'  // ❌ 不要直接从本地导入
```

### 2.2 服务初始化
```typescript
// 在组件中初始化服务
const llmService = createLLMService()
const promptService = createPromptService()

// 使用全局单例
const { models } = modelManager
const { templates } = templateManager
const { history } = historyManager
```

### 2.3 错误处理
```typescript
try {
  await llmService.optimize(prompt)
} catch (err) {
  if (err instanceof APIError) {
    // 处理API错误
  } else if (err instanceof ValidationError) {
    // 处理验证错误
  } else {
    // 处理其他错误
  }
}
```

## 3. 组件开发规范

### 3.1 命名规范
- 组件文件名：PascalCase
- 组件名：PascalCase
- Props：camelCase
- 事件：camelCase
- CSS类名：kebab-case

### 3.2 组件结构
```vue
<script setup lang="ts">
// 1. 类型导入
import type { ModelConfig } from '@prompt-optimizer/core'

// 2. 服务导入
import { modelManager } from '@prompt-optimizer/core'

// 3. Props定义
interface Props {
  modelConfig: ModelConfig
  onSuccess?: (result: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  onSuccess: undefined
})

// 4. 响应式数据
const models = ref(modelManager.getModels())

// 5. 计算属性
const enabledModels = computed(() => {
  return models.value.filter(m => m.enabled)
})

// 6. 方法
const handleModelSelect = async (model: string) => {
  try {
    await modelManager.setActiveModel(model)
    props.onSuccess?.(model)
  } catch (err) {
    // 错误处理
  }
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

## 4. 类型系统

### 4.1 类型导入
```typescript
// 从核心包导入类型
import type {
  ModelConfig,
  PromptConfig,
  TemplateConfig,
  LLMResponse
} from '@prompt-optimizer/core'

// 本地类型定义
interface LocalConfig extends ModelConfig {
  customField: string
}
```

### 4.2 类型检查
- 启用严格模式
- 使用类型断言
- 处理空值情况
- 避免any类型

## 5. 状态管理

### 5.1 服务状态
- 使用核心包提供的管理器
- 避免重复状态管理
- 统一的状态更新流程

### 5.2 组件状态
- 使用组合式API
- 保持状态最小化
- 合理使用响应式

## 6. 性能优化

### 6.1 导入优化
```typescript
// 按需导入
import { createLLMService } from '@prompt-optimizer/core/llm'
import { modelManager } from '@prompt-optimizer/core/model'

// 避免导入整个包
import * as Core from '@prompt-optimizer/core'  // ❌
```

### 6.2 渲染优化
- 使用v-show代替v-if（频繁切换）
- 合理使用计算属性
- 避免不必要的监听

## 7. 测试规范

### 7.1 单元测试
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelManager from './ModelManager.vue'
import { modelManager } from '@prompt-optimizer/core'

describe('ModelManager', () => {
  it('should load models correctly', async () => {
    const wrapper = mount(ModelManager)
    const models = await modelManager.getModels()
    expect(wrapper.text()).toContain(models[0].name)
  })
})
```

### 7.2 集成测试
- 测试组件交互
- 测试服务集成
- 测试错误处理

## 8. 代码审查清单
- 正确的服务导入方式
- 类型定义完整性
- 错误处理完整性
- 性能优化措施
- 测试覆盖率
- 代码规范遵守
- 文档更新 