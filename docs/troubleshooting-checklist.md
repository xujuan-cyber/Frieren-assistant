# UI 模块文件级排查清单 (v3)

本文档将常见问题排查清单以**具体文件为单位**进行组织和索引。当遇到问题时，可直接定位到相关文件，并检查下文中列出的所有关键点。每次团队成员根据此清单解决问题后，都应考虑更新此文件，以保证其时效性。

---

## Part 1: 应用入口与状态组装

### 📍 `packages/web/src/App.vue`

这是组装所有核心 Composable 和 UI 组件的主入口，是检查问题的起点。

- **[x] 顶层 Composable 调用**: 确认所有 `use...()` hook 都在 `<script setup>` 的顶层被调用。它们绝不能存在于 `async` 函数、`.then()` 回调或任何其他异步逻辑内部。
- **[x] `toRef` 适配器**: 检查所有传递给子 Composable 的 props。如果一个 `reactive` 对象的属性（如 `optimizerState.currentChainId`）被传递给一个期望 `Ref` 类型参数的 Composable，请确保它被 `toRef(optimizerState, 'currentChainId')` 正确包装。

---

## Part 2: Composable 架构与逻辑

### 📍 `packages/ui/src/composables/useAppInitializer.ts`
- **[x] 依赖注入完整性**: 确认所有被应用依赖的服务（如 `templateLanguageService`）都已在 `services` 对象中正确注册并返回。

### 📍 `packages/ui/src/composables/usePromptOptimizer.ts`
- **[x] 返回 `reactive`**: 确认 `return` 语句返回的是单一的 `reactive` 对象。
- **[x] `nextTick` 防护**: 在 `handleOptimizePrompt` 等函数中，确认在 `await` 异步服务**之前**，已同步完成状态清理（如 `optimizedPrompt.value = ''`），并紧跟 `await nextTick()`。

### 📍 `packages/ui/src/composables/useModelManager.ts`
- **[x] 返回 `reactive`**: 确认 `return` 语句返回的是单一的 `reactive` 对象。
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态来执行初始化逻辑。

### 📍 `packages/ui/src/composables/useTemplateManager.ts`
- **[x] 返回 `reactive`**: 确认 `return` 语句返回的是单一的 `reactive` 对象。
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态。

### 📍 `packages/ui/src/composables/useHistoryManager.ts`
- **[x] 返回 `reactive`**: 确认 `return` 语句返回的是单一的 `reactive` 对象。
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态。

### 📍 `packages/ui/src/composables/usePromptHistory.ts`
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态。
- **[x] `Ref` 参数类型**: 确认其接收的 `currentChainId` 等参数都是 `Ref` 类型。

### 📍 `packages/ui/src/composables/usePromptTester.ts`
- **[x] 返回 `reactive`**: 确认 `return` 语句返回的是单一的 `reactive` 对象。
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态。

### 📍 `packages/ui/src/composables/useStorage.ts`
- **[x] `watch` 内部依赖**: 确认其内部通过 `watch` 监听 `services` 的就绪状态，以避免 `Invalid watch source` 警告。

---

## Part 3: UI 组件实现

### 📍 `packages/ui/src/components/MainLayout.vue`
- **[x] Flexbox 父容器**: 检查根元素是否为 `flex` 容器，为子元素（如 `InputPanel`）的 `flex-1` 提供约束。

### 📍 `packages/ui/src/components/InputPanel.vue`
- **[x] `min-h-0` 约束**: 检查内部需要滚动的 `textarea` 区域，其父级容器链条上是否应用了 `flex-1 min-h-0` 以实现正确的空间分配。

### 📍 `packages/ui/src/components/OutputPanel.vue`
- **[x] `min-h-0` 约束**: 同 `InputPanel.vue`，检查滚动区域的 Flex 约束。

### 📍 `packages/ui/src/components/TestPanel.vue`
- **[x] `min-h-0` 约束**: 特别注意检查此组件，因其布局复杂，需要确保所有 `flex` 子项都有正确的 `min-h-0` 约束。

### 📍 `packages/ui/src/components/Modal.vue`
- **[x] `v-if` 根元素**: 确认组件的根 DOM 元素上有 `v-if="modelValue"` 指令。
- **[x] `v-model` 支持**: 确认 `close()` 方法中调用了 `emit('update:modelValue', false)`。
- **[x] 安全背景点击**: 确认背景遮罩层的 `@click` 事件处理函数中使用了 `event.target === event.currentTarget` 判断。

### 📍 `packages/ui/src/components/FullscreenDialog.vue`
- **[x] `v-if` / `v-model`**: 同 `Modal.vue`。
- **[x] 安全背景点击**: 同 `Modal.vue`。

### 📍 `packages/ui/src/components/TemplateManager.vue`
- **[x] `v-if` / `v-model`**: 同 `Modal.vue`。
- **[x] 安全背景点击**: 同 `Modal.vue`。

### 📍 `packages/ui/src/components/ModelManager.vue`
- **[x] `v-if` / `v-model`**: 同 `Modal.vue`。
- **[x] 安全背景点击**: 同 `Modal.vue`。

### 📍 `packages/ui/src/components/HistoryDrawer.vue`
- **[x] `v-if` / `v-model`**: 检查 `v-if="show"` 和 `emit('update:show', false)`。
- **[x] 安全背景点击**: 同 `Modal.vue`。

### 📍 `packages/ui/src/components/OutputDisplayCore.vue`
- **[x] 实时 `emit`**: 检查 `<script setup>` 中是否存在一个 `watch`，它正在监听本地的编辑状态，并在内容变化时**立即**通过 `emit('update:content', ...)` 通知父组件。

### 📍 `packages/ui/src/components/MarkdownRenderer.vue`
- **[x] 实时 `emit`**: 检查 `<script setup>` 中是否存在一个 `watch`，它正在监听本地的编辑状态，并在内容变化时**立即**通过 `emit('update:content', ...)` 通知父组件。
- **[x] 无 `prose` 类**: 检查组件模板中的 `class` 属性，确认其中没有 `@apply prose` 或其变体，以避免与自定义主题的样式冲突。