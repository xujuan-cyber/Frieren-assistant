# 项目通用经验指南

本指南收录项目开发中的通用经验与最佳实践，快速解决常见问题，提升开发效率。

> **注意**: 功能特定的经验已归档到 `docs/archives/` 对应目录中。

## 📚 已归档的专项经验

- **模态框组件经验** → [106-template-management/modal-experience.md](../archives/106-template-management/modal-experience.md)
- **布局系统经验** → [108-layout-system/experience.md](../archives/108-layout-system/experience.md)
- **主题系统经验** → [109-theme-system/experience.md](../archives/109-theme-system/experience.md)
- **Composable架构经验** → [102-web-architecture-refactor/experience.md](../archives/102-web-architecture-refactor/experience.md)

## 🔧 通用开发规范

### API 集成
```typescript
// 统一 OpenAI 兼容格式
const config = {
  baseURL: "https://api.provider.com/v1",
  models: ["model-name"],
  apiKey: import.meta.env.VITE_API_KEY // 必须使用 Vite 环境变量
};
```

**核心原则**：
- 业务逻辑与API配置分离
- 只传递用户明确配置的参数，不设默认值
- 敏感信息通过环境变量管理

### 错误处理
```typescript
try {
  await apiCall();
} catch (error) {
  console.error('[Service Error]', error); // 开发日志
  throw new Error('操作失败，请稍后重试'); // 用户友好提示
}
```

### 测试规范
```javascript
describe("功能测试", () => {
  beforeEach(() => {
    testId = `test-${Date.now()}`; // 唯一标识避免冲突
  });
  
  // LLM参数测试：每个参数独立测试
  it("should handle temperature parameter", async () => {
    await modelManager.updateModel(configKey, {
      llmParams: { temperature: 0.7 } // 只测试一个参数
    });
  });
});
```

**要点**：
- 使用动态唯一标识符
- 每个LLM参数创建独立测试
- 覆盖异常场景
- 正确清理测试状态

### Vue 开发最佳实践

#### 多根组件的属性继承
**问题**：当一个Vue组件有多个根节点时，它无法自动继承父组件传递的非prop属性（如 `class`），并会产生警告。

**方案**：
1. 在 `<script setup>` 中使用 `defineOptions({ inheritAttrs: false })` 禁用默认的属性继承行为
2. 在模板中，将 `v-bind="$attrs"` 手动绑定到你希望接收这些属性的**特定**根节点上

**示例**:
```html
<template>
  <!-- $attrs 会将 class, id 等属性应用到此组件 -->
  <OutputDisplayCore v-bind="$attrs" ... />
  <OutputDisplayFullscreen ... />
</template>

<script setup>
defineOptions({
  inheritAttrs: false,
});
</script>
```

## ⚡ 快速问题排查

### 布局问题
1. 检查 Flex 约束链是否完整
2. 确认 `min-h-0` 是否添加
3. 验证父容器是否为 `display: flex`

### 滚动问题
1. 检查是否有中间层错误的 `overflow` 属性
2. 确认高度约束是否从顶层正确传递
3. 验证滚动容器是否有正确的 `overflow-y: auto`

### API调用问题
1. 检查环境变量是否正确设置（`VITE_` 前缀）
2. 确认参数是否过度设置默认值
3. 验证错误处理是否用户友好

### 测试失败
1. 检查测试ID是否唯一
2. 确认测试后是否正确清理状态
3. 验证LLM参数测试是否独立

## 🔄 版本管理

### 版本同步
```json
// package.json
{
  "scripts": {
    "version": "pnpm run version:sync && git add -A"
  }
}
```
**关键**：使用 `version` 钩子而非 `postversion`，确保同步文件包含在版本提交中。

### 模板管理
- **内置模板**：不可修改，不可导出
- **用户模板**：可修改，导入时生成新ID
- **导入规则**：跳过与内置模板ID重复的模板

## 🚨 关键Bug修复模式

### 参数透明化
```typescript
// ❌ 错误：自动设置默认值
if (!config.temperature) config.temperature = 0.7;

// ✅ 正确：只使用用户配置的参数
const requestConfig = {
  model: modelConfig.defaultModel,
  messages: formattedMessages,
  ...userLlmParams // 只传递用户明确配置的参数
};
```

### 数据导入安全验证
```typescript
// 白名单验证 + 类型检查
for (const [key, value] of Object.entries(importData)) {
  if (!ALLOWED_KEYS.includes(key)) {
    console.warn(`跳过未知配置: ${key}`);
    continue;
  }
  if (typeof value !== 'string') {
    console.warn(`跳过无效类型 ${key}: ${typeof value}`);
    continue;
  }
  await storage.setItem(key, value);
}
```

### 国际化(i18n)键值同步
**问题**：`[intlify] Not found 'key' in 'locale' messages` 错误，通常由中英文语言包键值不同步引起。

**方案**：创建自动化脚本比较两个语言文件，列出差异。

## 📝 文档更新规范

遇到新问题或找到更好解决方案时，应及时更新此文档：
1. 在对应章节添加新经验
2. 更新代码示例
3. 记录修复时间和问题背景
4. 保持文档简洁性，避免过度详细的过程描述

---

**记住**：好的经验文档应该能让团队成员快速找到解决方案，而不是重新踩坑。
