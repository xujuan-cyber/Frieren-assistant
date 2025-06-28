# 项目核心经验指南

## Vue 模态框（弹窗）渲染问题

**问题现象:**
应用启动时，`TemplateManager.vue` 和 `ModelManager.vue` 等模态框组件会立即显示在页面上，并且无法通过点击关闭按钮或外部区域来关闭。

**根本原因:**
组件的最外层元素（通常是带灰色蒙层的 `div`）没有使用 `v-if` 指令与控制其可见性的 `show` prop 绑定。因此，即使 `show` 的初始值为 `false`，该组件的 DOM 结构也已经被渲染到了页面上，导致蒙层和弹窗内容可见。点击关闭将 `show` 更新为 `false` 也无法移除已经渲染的 DOM，因此看起来"关不掉"。

**解决方案:**
在模态框组件的最外层元素上添加 `v-if="show"` 指令。

**示例 (`TemplateManager.vue` / `ModelManager.vue`):**
```vue
<template>
  <div
    v-if="show"  <!-- 关键修复 -->
    class="fixed inset-0 theme-mask z-[60] flex items-center justify-center overflow-y-auto"
    @click="close"
  >
    <!-- ... 弹窗内容 ... -->
  </div>
</template>
```

**结论:**
在创建可复用的模态框或弹窗组件时，必须确保组件的根元素或其容器的渲染与 `v-if` 或 `v-show` 指令绑定，以正确控制其在 DOM 中的存在和可见性。

## Vue 模态框组件的事件处理最佳实践

**问题描述:**
在模态框组件中，仅实现 `@click="$emit('close')"` 的关闭事件处理方式不支持 `v-model:show` 双向绑定，导致父组件必须显式处理关闭逻辑，代码冗余且不符合 Vue 最佳实践。

**最佳实践方案:**
实现统一的 `close` 方法，同时触发 `update:show` 和 `close` 事件，支持多种使用模式。

**组件定义示例:**
```vue
<template>
  <div v-if="show" @click="close">
    <!-- 弹窗内容 -->
    <button @click="close">×</button>
  </div>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:show', 'close']);

const close = () => {
  emit('update:show', false); // 支持 v-model
  emit('close');             // 向后兼容
}
</script>
```

**父组件使用方式:**
```vue
<!-- 推荐：使用 v-model 双向绑定 -->
<ModelManagerUI v-model:show="isModalVisible" />

<!-- 兼容：使用独立事件处理 -->
<ModelManagerUI :show="isModalVisible" @close="handleClose" />
```

**优势:**
1. **符合 Vue 的 `v-model` 规范**：通过触发 `update:show` 事件支持双向绑定
2. **代码封装和可维护性**：关闭逻辑集中在一个方法中，便于扩展和维护
3. **向后兼容**：同时支持 `v-model` 和传统的 `@close` 事件监听
4. **语义清晰**：模板中的 `@click="close"` 比 `@click="$emit('close')"` 更直观表达意图

**结论:**
在设计可复用的 Vue 模态框组件时，应同时实现 `show` prop 和 `close` 方法，确保组件既支持现代的 `v-model` 双向绑定，又保持良好的可读性和可维护性。

## 模态框组件最佳实践范式

**目标**: 创建一个可复用、功能完备、体验优秀且高度灵活的基础模态框组件。

**核心范式来源**: `FullscreenDialog.vue` 和 `Modal.vue`

**关键实现要点:**

1.  **标准化 `v-model`**:
    - **Prop**: 使用 `modelValue` 作为接收组件可见性状态的 prop。
    - **Event**: 触发 `update:modelValue` 事件来响应状态变更。

2.  **健壮的关闭机制**:
    - **统一关闭方法**: 封装一个 `close` 方法，集中处理所有关闭逻辑 (`emit('update:modelValue', false)`)。
    - **严谨的背景点击**: 使用 `event.target === event.currentTarget` 判断来确保只有直接点击背景遮罩时才关闭弹窗，防止点击内容区时意外关闭。
    - **键盘可访问性**: 监听 `Escape` 键，为用户提供通过键盘关闭弹窗的快捷方式。

3.  **通过插槽实现高度灵活性**:
    - 使用 `<slot name="title">`, `<slot></slot>` (默认插槽), 和 `<slot name="footer">` 来定义模态框的各个区域，使父组件可以完全自定义其内容和交互。

4.  **平滑的过渡动画**:
    - 使用 Vue 的 `<Transition>` 组件包裹模态框的根元素和内容，为其出现和消失添加 CSS 动画，提升用户体验。

**代码范例 (`BaseModal.vue`):**
```vue
<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="modelValue" class="backdrop" @click="handleBackdropClick">
        <Transition name="modal-content">
          <div class="modal-content" @click.stop>
            <header>
              <slot name="title"><h3>Default Title</h3></slot>
              <button @click="close">×</button>
            </header>
            <main>
              <slot></slot>
            </main>
            <footer>
              <slot name="footer">
                <button @click="close">Cancel</button>
              </slot>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const close = () => emit('update:modelValue', false);

const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    close();
  }
}

// 监听ESC键
// onMounted / onUnmounted ...
</script>
```

本指南收录项目开发中的关键经验与最佳实践，快速解决常见问题，提升开发效率。

---

## 🎯 核心布局经验：动态 Flex 布局

**这是本项目最重要的经验。** 摒弃固定尺寸，全面使用 Flexbox 动态空间分配。

### 核心原则
- **最高指导原则**：一个元素若要作为 Flex 子项（`flex-1`）进行伸缩，其直接父元素必须是 Flex 容器（`display: flex`）
- **约束链完整性**：从顶层到底层的所有相关父子元素都必须遵循 Flex 规则
- **黄金组合**：`flex: 1` + `min-h-0`（或 `min-w-0`）

### 实施要点
```css
/* 父容器 */
.parent {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 或其他明确高度 */
}

/* 动态子项 */
.child {
  flex: 1;
  min-height: 0; /* 关键：允许收缩 */
}

/* 滚动容器 */
.scrollable {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

### 调试方法
当 Flex 布局失效时，从出问题的元素开始，逐层向上检查父元素是否为 `display: flex`。

---

## 🔧 开发规范

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

#### 1. 多根组件的属性继承
**问题**：当一个Vue组件有多个根节点时，它无法自动继承父组件传递的非prop属性（如 `class`），并会产生警告。
**方案**：
1.  在 `<script setup>` 中使用 `defineOptions({ inheritAttrs: false })` 禁用默认的属性继承行为。
2.  在模板中，将 `v-bind="$attrs"` 手动绑定到你希望接收这些属性的**特定**根节点上。
**示例** (`OutputDisplay.vue`):
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
**优点**：代码意图清晰，避免了为解决问题而添加不必要的 `<div>` 包装器，同时精确控制了属性的流向。

---

## 🚨 关键Bug修复经验

### 1. 国际化(i18n)键值同步
**问题**：`[intlify] Not found 'key' in 'locale' messages` 错误，通常由中英文语言包键值不同步引起。
**方案**：手动排查耗时且易错。可以创建一个临时的Node.js脚本来自动化地比较两个语言文件，并列出差异。
**示例脚本** (`scripts/check-i18n.js`):
```javascript
const fs = require('fs');

// 递归函数，用于从对象中提取所有键路径
function getKeys(obj, prefix = '') { /* ... */ }

// 加载并解析语言文件内容
function loadLangFile(filePath) { /* ... */ }

const zhKeys = new Set(loadLangFile('zh-CN.ts'));
const enKeys = new Set(loadLangFile('en-US.ts'));

const missingInZh = [...enKeys].filter(key => !zhKeys.has(key));
const missingInEn = [...zhKeys].filter(key => !enKeys.has(key));

// 输出差异报告
console.log('Missing in zh-CN:', missingInZh);
console.log('Missing in en-US:', missingInEn);
```
**优点**：快速、准确地定位所有缺失或多余的翻译键，保证多语言体验的一致性。

### 2. 参数透明化（2024-12-20）
**问题**：LLM参数默认值误导用户
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

### 3. 数据导入安全验证
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

### 4. Flex 约束链断裂修复
**典型错误**：
```html
<!-- ❌ 父容器不是 flex，子元素 flex-1 失效 -->
<div class="h-full relative">
  <TextDiff class="flex-1 min-h-0" />
</div>

<!-- ✅ 正确：父容器必须是 flex -->
<div class="h-full flex flex-col">
  <TextDiff class="flex-1 min-h-0" />
</div>
```

### 5. TestPanel 复杂响应式布局修复（2024-12-21）

**问题现象**：TestPanel.vue 中的测试结果区域存在 flex 布局问题，内容被推向上方而非正确占用可用空间，特别是在小屏模式下使用垂直堆叠布局时。

**根本原因**：
1. **高度约束传递不完整**：flex 容器缺少 `min-h-0` 约束，导致子项无法正确缩小
2. **混合布局模式处理不当**：大屏使用绝对定位，小屏使用 flex 布局，但两种模式下的高度约束规则不一致
3. **标题元素参与空间分配**：h3 标题未标记为 `flex-none`，错误地参与了 flex 空间分配

**修复方案**：
```html
<!-- 修复前：缺少关键的 min-h-0 约束 -->
<div class="flex flex-col transition-all duration-300 min-h-[80px]">
  <h3 class="text-lg font-semibold theme-text truncate mb-3">标题</h3>
  <OutputDisplay class="flex-1" />
</div>

<!-- 修复后：完整的 flex 约束链 -->
<div class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]">
  <h3 class="text-lg font-semibold theme-text truncate mb-3 flex-none">标题</h3>
  <OutputDisplay class="flex-1 min-h-0" />
</div>
```

**关键修复点**：
- 为每个结果容器添加 `min-h-0` 约束
- 将标题标记为 `flex-none`，防止参与空间分配  
- 为 OutputDisplay 组件添加 `min-h-0`，确保高度约束正确传递到组件内部

**经验总结**：
- 复杂响应式布局中，每种布局模式（flex vs absolute）都需要独立验证高度约束
- 混合布局模式的组件特别容易出现约束传递断裂，需要逐层检查
- 标题等固定高度元素必须明确标记为 `flex-none`

### 6. UI状态同步与响应式数据流最佳实践（2024-12-21）

**典型问题**：在复杂的Vue组件交互中，子组件内部状态的变更未能正确反映到其他兄弟组件，导致UI显示与底层数据不一致。例如，用户在A组件中编辑内容后，B组件（如测试面板）获取到的仍然是编辑前的数据。

**根因分析**：该问题的核心在于 **单向数据流** 与 **组件本地状态** 之间的同步间隙。当一个子组件（如`OutputDisplay`）的内部状态（`editingContent`）发生变化时，它通过`emit`事件通知父组件更新顶层状态。然而，依赖同一顶层状态的其他兄弟组件（如`TestPanel`）接收到的`props`是静态的，不会自动响应由`emit`触发的间接状态变更，从而导致数据不同步。

```mermaid
graph TD
    subgraph App.vue (顶层状态)
        A[state: optimizedPrompt]
    end

    subgraph "子/兄弟组件"
        B(OutputDisplay)
        C(TestPanel)
    end

    A -- "Props (v-model)" --> B
    A -- "Props (静态传递)" --> C

    B -- "1. 用户编辑触发内部状态变更" --> B_InternalState(Local state: editingContent)
    B_InternalState -- "2. emit('update:content')" --> A
    A -- "3. 顶层状态更新" --> A
    
    C -- "4. 用户操作触发" --> C_InternalState(props.optimizedPrompt 仍为旧值)
    
    subgraph "问题"
        D{C组件数据未同步}
    end

    C_InternalState -- "使用旧数据执行操作" --> D
```

---

#### 解决方案：构建可靠的响应式数据流架构

**核心目标**：确保任何源于用户交互的状态变更，都能**立即、单向地**同步回单一数据源（Single Source of Truth），并使所有依赖该数据源的组件都能自动响应更新。

**实施模式**:

1.  **模式一：实时状态提升 (Real-time State Hoisting)**

    子组件不应持有临时的、未同步的"草稿"状态。任何可编辑的状态都应在变更的瞬间通过`emit`事件向上同步，而不是等待某个特定动作（如"保存"或"失焦"）触发。

    ```typescript
    // 子组件：OutputDisplayCore.vue
    // 通过 watch 实时将内部编辑内容同步到父级
    watch(editingContent, (newContent) => {
      if (isEditing.value) {
        emit('update:content', newContent);
      }
    }, { immediate: false });
    ```

2.  **模式二：时序与竞态控制 (Timing and Race Condition Control)**

    对于需要清空或重置状态的异步操作（如开始流式加载），必须确保状态变更操作（如退出编辑、清空内容）在异步任务启动前完成。`nextTick` 是解决此类DOM更新与状态变更竞态问题的关键。

    ```typescript
    // 状态管理方：usePromptOptimizer.ts
    async function handleOptimize() {
        isOptimizing.value = true;
        optimizedPrompt.value = ''; // 1. 同步清空状态
        await nextTick();          // 2. 等待DOM和状态更新完成
        
        // 3. 启动异步服务
        await promptService.value.optimizePromptStream(...);
    }
    ```
   
3.  **模式三：外部事件驱动的状态重置**

    当一个动作（如优化）需要影响兄弟组件的状态（如强制退出编辑）时，应通过顶层组件的监听与方法调用（`ref.method()`）来实现，而不是让组件间直接通信。

    ```typescript
    // 父组件：PromptPanel.vue
    // 监听顶层状态变化，调用子组件方法
    watch(() => props.isOptimizing, (newVal) => {
      if (newVal) {
        outputDisplayRef.value?.forceExitEditing();
      }
    });
    ```

#### 核心设计原则
- **单一数据源 (Single Source of Truth)**：任何共享状态都必须由唯一的、高阶的组件或状态管理器拥有。子组件只能通过`props`接收和通过`emit`请求变更。
- **响应式数据流闭环**：确保"用户输入 -> `emit` -> 更新顶层状态 -> `props` -> 更新所有相关子组件"这个数据流是完整且自动响应的。
- **系统化调试策略**：当遇到状态不同步问题时，从数据源头（顶层状态）到消费端（子组件Props）逐级添加临时日志，是快速定位数据流"断点"的最有效方法。

---

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

---

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

### 4. 数组内容深度比较修复（2025-01-27）
**问题**：BugBot 发现模板内容比较使用引用比较而非深度比较
```typescript
// ❌ 错误：数组引用比较
if (updatedTemplate.content !== currentTemplate.content) {
  // 数组内容相同但引用不同时会触发不必要更新
}

// ✅ 正确：深度比较函数
const deepCompareTemplateContent = (content1, content2) => {
  if (typeof content1 !== typeof content2) return false;
  
  if (typeof content1 === 'string') return content1 === content2;
  
  if (Array.isArray(content1) && Array.isArray(content2)) {
    if (content1.length !== content2.length) return false;
    return content1.every((item1, index) => {
      const item2 = content2[index];
      return item1.role === item2.role && item1.content === item2.content;
    });
  }
  
  return JSON.stringify(content1) === JSON.stringify(content2);
};

// 使用深度比较
if (!deepCompareTemplateContent(updatedTemplate.content, currentTemplate.content)) {
  // 只有内容真正改变时才更新
}
```

**关键**：Template 接口的 content 可以是 `string | Array<{role: string; content: string}>`，必须支持两种类型的正确比较。

### 5. 模板类型过滤器验证修复（2025-01-27）
**问题**：BugBot 发现 refreshTemplates 函数可能选择不匹配类型过滤器的模板
```typescript
// ❌ 问题：更新模板后直接返回，未验证类型匹配
if (updatedTemplate && contentChanged) {
  emit('update:modelValue', updatedTemplate)
  return // 跳过了类型验证
}

// ✅ 修复：添加类型验证
if (updatedTemplate && contentChanged) {
  // 验证更新后的模板是否还匹配当前类型过滤器
  if (updatedTemplate.metadata.templateType === props.type) {
    emit('update:modelValue', updatedTemplate)
    return
  }
  // 类型不匹配时继续执行后续逻辑
}
```
**修复效果**：确保模板选择器只选择匹配当前类型的模板，避免类型不一致的问题。

---

## 📝 文档更新规范

遇到新问题或找到更好解决方案时，应及时更新此文档：
1. 在对应章节添加新经验
2. 更新代码示例
3. 记录修复时间和问题背景
4. 保持文档简洁性，避免过度详细的过程描述

---

**记住**：好的经验文档应该能让团队成员快速找到解决方案，而不是重新踩坑。

## 7. UI 主题系统与第三方库样式冲突处理

**问题场景**: 在开发多主题功能（特别是紫色、绿色等自定义深色主题）时，发现集成了 Tailwind Typography (`prose`) 插件的 Markdown 渲染组件，其背景和文本颜色无法正确应用主题色，而是被覆盖为不协调的亮色样式（如白色背景）。

**根本原因分析**:

问题的核心在于项目自定义的、基于 `data-theme` 属性的颜色主题系统，与 Tailwind Typography (`prose`) 插件预设的、自成体系的颜色方案发生了直接冲突。

1.  **`prose` 的强主张**: `@tailwindcss/typography` 插件不仅仅是一个布局工具，它会为 HTML 内容注入一套完整的视觉方案，其中**包含了固定的颜色、字体、背景等样式**。
2.  **默认亮色偏好**: `prose` 的默认配置（如 `prose-stone`）是为亮色背景设计的，它会强制设定深色的文本颜色。
3.  **`dark:` 模式的局限性**: `prose` 的颜色反转机制 (`dark:prose-invert`) 强依赖于 `<html>` 标签上的 `dark` 类。我们自定义的深色主题（如 `data-theme="purple"`）虽然视觉上是深色的，但并未触发 Tailwind 的 `dark` 模式，因此 `prose` 依然应用其默认的亮色样式，导致了颜色覆盖。

**解决方案与最佳实践**:

面对这种强样式主张的第三方库，必须采取**彻底隔离**的策略，不能试图"混合"使用。

1.  **禁止部分应用**: 实践证明，试图通过 `@apply prose-sm` 等方式只"借用" `prose` 的布局功能是行不通的。这依然会引入我们不希望的颜色样式，导致不可预测的覆盖问题。

2.  **手动重建布局**: 最稳健的解决方案是，在需要应用自定义主题的组件中，**完全移除** `@apply prose` 或其任何变体。然后，参考 `prose` 的文档或默认样式，**手动为各个 Markdown 元素 (`h1`, `p`, `ul` 等) 添加纯粹的、不包含颜色的布局和间距样式**。

3.  **控制权归还**: 通过手动重建布局，我们将样式的控制权完全收归到自己的主题系统中。这样，我们在各个主题下为元素定义的颜色、背景、边框等样式才能不受干扰地、正确地应用。

**示例 - 手动重建的 Markdown 布局**:

```css
/* 在全局 theme.css 中定义，不属于任何特定主题 */
.theme-markdown-content {
  @apply max-w-none;
}

.theme-markdown-content > :first-child { @apply mt-0; }
.theme-markdown-content > :last-child { @apply mb-0; }
.theme-markdown-content h1 { @apply text-2xl font-bold my-4; }
.theme-markdown-content h2 { @apply text-xl font-semibold my-3; }
.theme-markdown-content p { @apply my-3 leading-relaxed; }
.theme-markdown-content ul,
.theme-markdown-content ol { @apply my-3 pl-6 space-y-2; }
.theme-markdown-content pre { @apply my-4 p-4 rounded-lg text-sm; }
/* ... etc ... */
```
通过这种方式，我们既保留了优美的排版，又确保了自定义主题的颜色能够正确渲染。

## 8. Vue Composable 架构重构：解决异步初始化问题

### 问题背景
在异步回调中调用Vue Composable函数会导致错误：`Uncaught (in promise) SyntaxError: Must be called at the top of a 'setup' function`。这违反了Vue Composition API的核心规则，需要重构架构。

### 核心解决方案：顶层声明，响应式连接，内部自治
```typescript
// ❌ 错误：在异步回调中调用Composable
onMounted(async () => {
  const services = await initServices();
  const modelManager = useModelManager(); // 错误：不在setup顶层调用
});

// ✅ 正确：顶层声明，响应式连接
const { services } = useAppInitializer(); // 在顶层调用
const modelManager = useModelManager(services); // 在顶层调用，传入services引用

// 内部实现：响应式连接
export function useModelManager(services: Ref<AppServices | null>) {
  // 状态定义...
  
  // 响应式连接：监听服务就绪
  watch(services, (newServices) => {
    if (!newServices) return;
    // 使用已就绪的服务...
  }, { immediate: true });
  
  return { /* 返回状态和方法 */ };
}
```

### 架构设计要点
1. **统一服务接口**：创建`AppServices`接口，统一管理所有核心服务
   ```typescript
   // packages/ui/src/types/services.ts
   export interface AppServices {
     storageProvider: IStorageProvider;
     modelManager: IModelManager;
     templateManager: ITemplateManager;
     historyManager: IHistoryManager;
     dataManager: DataManager;
     llmService: ILLMService;
     promptService: IPromptService;
   }
   ```

2. **服务初始化器**：`useAppInitializer`负责创建和初始化所有服务
   ```typescript
   // 返回带有错误处理的服务引用
   export function useAppInitializer() {
     const services = ref<AppServices | null>(null);
     const isInitializing = ref(true);
     const error = ref<Error | null>(null);
     
     onMounted(async () => {
       try {
         // 初始化服务...
         services.value = { /* 服务实例 */ };
       } catch (err) {
         error.value = err instanceof Error ? err : new Error(String(err));
       } finally {
         isInitializing.value = false;
       }
     });
     
     return { services, isInitializing, error };
   }
   ```

3. **Composable参数模式**：所有Composable接收`services`引用作为参数
   ```typescript
   export function useModelManager(services: Ref<AppServices | null>) {
     // ...
   }
   
   export function useTemplateManager(services: Ref<AppServices | null>) {
     // ...
   }
   ```

### 关键经验
1. **Vue响应式上下文**: Vue Composable必须在`<script setup>`顶层同步调用，异步回调中调用会导致错误
2. **响应式连接模式**: 使用`watch`监听服务就绪，而不是在回调中调用Composable
3. **快速失败原则**: 在开发环境中，快速暴露问题比隐藏问题更有价值，有助于及早发现和修复问题
4. **统一架构**: 保持所有Composable的一致架构模式，有助于代码理解和维护
5. **类型系统挑战**: 复杂的类型系统可能导致接口不匹配问题，需要仔细处理类型定义和实现

### 实施建议
- 所有Composable在`<script setup>`顶层调用
- 使用`watch`监听服务就绪，而不是在回调中调用Composable
- 使用TypeScript非空断言操作符`!`快速暴露潜在问题
- 统一服务接口和参数模式，提高代码一致性
- 详细记录架构决策和经验，便于团队知识传承

### 7. Composable 重构：`reactive` vs `ref` 的深度实践 (2024-07-28)

**背景**: 为解决 Vue 深层嵌套 `ref` 无法自动解包的问题，我们将多个核心 Composables（如 `usePromptOptimizer`）的返回值从包含多个 `ref` 的对象，重构为了单一的 `reactive` 对象。此举虽然简化了顶层状态管理，但引发了一系列复杂的联动错误。

**核心挑战与解决方案**:

1.  **依赖注入失败 (`templateLanguageService`)**
    *   **现象**: `BuiltinTemplateLanguageSwitch` 组件无法通过 `inject` 获取 `templateLanguageService` 实例，导致初始化失败。
    *   **根因**: `useAppInitializer.ts` 在初始化服务时，虽然创建了 `languageService`，但**没有将其添加到最终提供给整个应用的 `services` 对象中**。
    *   **修复步骤**:
        1.  修改 `useAppInitializer.ts`，将 `templateLanguageService` 添加到返回的 `services` 对象中。
        2.  修改 `packages/ui/src/types/services.ts`，在 `AppServices` 接口中添加 `templateLanguageService: TemplateLanguageService` 类型定义，解决 TypeScript 报错。
    *   **教训**: 依赖注入的链条必须完整。服务不仅要被创建，还要被正确地"注册"和"提供"。

2.  **响应式接口不匹配 (`reactive` -> `ref`)**
    *   **现象**: `useTemplateManager` 中出现 `Cannot read properties of null (reading 'value')` 错误。
    *   **根因**: `useTemplateManager` 期望接收一个 `ref` 类型的参数 (`selectedTemplate`)，以便能通过 `.value` 进行双向绑定。而重构后的 `App.vue` 直接传递了 `optimizer.selectedOptimizeTemplate`，这是一个普通值，而非 `ref`。
    *   **优雅的解决方案**: 使用 `toRef` 作为"适配器"。
        ```typescript
        // App.vue
        import { toRef } from 'vue';

        const optimizer = usePromptOptimizer(...);
        
        // 为 reactive 对象的属性创建一个双向绑定的 ref
        const selectedOptimizeTemplateRef = toRef(optimizer, 'selectedOptimizeTemplate');

        const templateManager = useTemplateManager({
            // 将创建的 ref 传入，满足 useTemplateManager 的接口期望
            selectedTemplate: selectedOptimizeTemplateRef,
            // ...
        });
        ```
    *   **教训**: 在 Composable 之间传递响应式状态时，必须注意"接口"匹配。`toRef` 是连接 `reactive` 对象和期望 `ref` 的旧代码或子模块的完美桥梁。

3.  **健壮性修复 (Vercel API 检测)**
    *   **现象**: 控制台出现 `Vercel API detection failed SyntaxError: Unexpected token '<'` 警告。
    *   **根因**: `environment.ts` 中的检测函数在服务端返回 HTML 错误页面（而非 JSON）时，依然尝试调用 `response.json()`，导致解析失败。
    *   **修复**: 在解析前增加 `Content-Type` 响应头检查，确保只在内容为 `application/json` 时才执行解析。
    *   **教训**: 所有与外部 API 的交互都应假定可能失败。在解析响应前，务必检查其内容类型和状态码。

**总结**: 本次重构深刻揭示了 Vue 3 响应式系统的几个关键点：
- `reactive` 适用于管理**一组**相关状态，简化顶层 API。
- `ref` 依然是跨组件或 Composable 边界传递**单个**响应式变量的可靠方式。
- `toRef` 和 `toRefs` 是在 `reactive` 和 `ref` 之间无缝切换、适配新旧代码的必备工具。
- 依赖注入和服务初始化流程的正确性，是复杂应用稳定运行的基石。
