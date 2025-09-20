# 图像模式模板与迭代能力改造规范（Spec）

本文档定义在 UI 与 Core 中新增“图像模式”的三类模板类型与相关能力，使图像模式与基础模式在体验上对齐（不启用高级模式），并为图像场景提供专属的“迭代”模板与流程。

- 目标
  - 在核心模板体系中引入独立的 `imageIterate` 模板类型，避免通过 tags/id 的二次过滤。
  - 按文生图/图生图/图像迭代三类划分默认模板目录与加载逻辑。
  - 在模板管理界面添加图像三类的管理入口（与基础/上下文并列）。
  - 在图像模式工作区完善“迭代”模板的初始化、持久化与调用（无需高级模式）。

- 范围
  - Core：模板类型、默认模板、加载器与管理器 API 扩展。
  - UI：模板管理器新增标签、TemplateSelect 支持 `imageIterate`、图像工作区迭代逻辑完善。
  - 存储：图像模式专属的迭代模板选择键。
  - i18n：图像模板分类的界面文案。

## 一、Core 改造

### 1. 新增模板类型 `imageIterate`
- 文件：`packages/core/src/services/template/types.ts`
  - 在 `TemplateMetadata.templateType` union 与 zod schema 中新增 `'imageIterate'`。
  - 在 `ITemplateManager.listTemplatesByType` 的参数 union 中新增 `'imageIterate'`。
- 文件：`packages/core/src/services/template/manager.ts`
  - `listTemplatesByType` 参数 union 同步扩展（实现已按模板元数据类型过滤，兼容新增类型）。
- 文件：`packages/core/src/services/template/electron-proxy.ts`
  - 接口定义中的 union 同步增加 `'imageIterate'`。
- 文件：`packages/core/src/services/template/static-loader.ts`
  - `TemplateType` union 新增 `'imageIterate'`。
  - `byType` 初始化新增 `imageIterate` 节点。
  - 将 `metadata.templateType === 'imageIterate'` 规范化映射到 `normalizedType = 'imageIterate'`。
  - 日志统计中增加 `imageIterate` 的计数。
- 文件：`packages/core/src/services/prompt/service.ts`
  - `getDefaultTemplateId(...)` 对 `'imageIterate'` 增加处理与回退（若无可用 `imageIterate`，回退至 `iterate`）。

### 2. 默认模板目录重构与新增
- 目录：`packages/core/src/services/template/default-templates/image-optimize/`
  - `text2image/`
    - 存放文生图优化模板：`*-optimize(.ts|_en.ts)` （如 `dalle-optimize` / `general-image-optimize` / `chinese-model-optimize` / `stable-diffusion-optimize`）。
  - `image2image/`
    - 存放图生图优化模板：`image2image-optimize(.ts|_en.ts)`。
  - `iterate/`（新增）
    - 新增图像迭代模板（中/英）：
      - `image-iterate-general.ts`
      - `image-iterate-general_en.ts`
    - 模板元数据：`templateType: 'imageIterate'`，`language: 'zh'|'en'`，`version`，`lastModified`，`author`，`description`。
    - 内容要求（建议为高级模板：消息数组）：
      - System：描述“基于优化后图像提示词做定向改进”的规则，强调视觉意图/风格延续、构图/光照/风格参数、强度/seed 等可控性。
      - User：包含 `originalPrompt`（或 last optimized prompt）与 `iterateInput`，指示“直接输出新的优化图像提示词”。
- 文件：`packages/core/src/services/template/default-templates/index.ts`
  - 更新 import 路径（目录重构后）。
  - 引入并聚合 `image-iterate-general(.ts|_en.ts)` 到 `ALL_TEMPLATES`。

## 二、UI 改造

### 1. 模板管理器（TemplateManager.vue）
- 文件：`packages/ui/src/components/TemplateManager.vue`
- 新增三枚类别按钮（与现有两行三列布局一致）：
  - 图像 · 文生图 → `currentCategory='image-text2image-optimize'` → 类型 `'text2imageOptimize'`。
  - 图像 · 图生图 → `currentCategory='image-image2image-optimize'` → 类型 `'image2imageOptimize'`。
  - 图像 · 迭代 → `currentCategory='image-iterate'` → 类型 `'imageIterate'`。
- 类型映射：
  - props 支持初始 `templateType: 'text2imageOptimize' | 'image2imageOptimize' | 'imageIterate'`。
  - `getCategoryFromProps()` 增加以上映射。
  - `getCurrentTemplateType()` 返回当前分类对应的元数据类型（严格等值）。
- 列表过滤：
  - `filteredTemplates` 新增三类过滤条件：`text2imageOptimize` / `image2imageOptimize` / `imageIterate`。
- i18n：
  - 在 `zh-CN.ts` / `en-US.ts` 新增：
    - `templateManager.imageText2ImageTemplates`
    - `templateManager.imageImage2ImageTemplates`
    - `templateManager.imageIterateTemplates`

### 2. 模板选择器（TemplateSelect.vue）
- 文件：`packages/ui/src/components/TemplateSelect.vue`
  - props.validator 支持 `'imageIterate'`。
  - 其余无需变更，`listTemplatesByType(props.type)` 会加载 `imageIterate`。

## 三、图像模式工作区（useImageWorkspace）

### 1. 存储键（Storage Keys）
- 文件：`packages/core/src/constants/storage-keys.ts`
  - 在 `IMAGE_MODE_KEYS` 中新增：
    - `SELECTED_ITERATE_TEMPLATE: 'app:image-mode:selected-iterate-template'`

### 2. 迭代模板的初始化、恢复与保存
- 文件：`packages/ui/src/composables/useImageWorkspace.ts`
  - 在 `initialize()/restoreSelections()` 阶段：
    - 读取 `IMAGE_MODE_KEYS.SELECTED_ITERATE_TEMPLATE`；若为空，则 `listTemplatesByType('imageIterate')` 并选择第一个可用模板。
  - 在 `saveSelections()` 中：
    - 若存在 `selectedIterateTemplate`，保存其 `id` 至上述存储键。

### 3. 触发迭代时使用所选模板
- 与 PromptPanel 的迭代对接：
  - 推荐绑定到现有 `handleIteratePrompt`（其签名包含 `templateId`），或在 `handleIterate` 内部调用 `iteratePromptStream` 时明确传入 `state.selectedIterateTemplate.id`。
  - 若未选择，toast 明确提示“请选择图像迭代模板”。

### 4. 打开模板管理器类型（修复与支持）
- 文件：`packages/ui/src/composables/useImageWorkspace.ts`
  - 修正 `handleOpenTemplateManager` 的优先级与类型选择：
    - 传入 `'text2imageOptimize' | 'image2imageOptimize' | 'imageIterate'`。
    - 未传入参数时，根据 `imageMode` 推断 `'text2imageOptimize' | 'image2imageOptimize'`。

## 四、验收标准（Acceptance Criteria）
- Core
  - TS 编译通过，`imageIterate` 类型在各接口与实现中受支持。
  - 静态加载器日志显示 `imageIterate` 模板数量 > 0（默认模板存在）。
  - `TemplateManager.listTemplatesByType('imageIterate')` 返回新增默认模板。
- UI
  - 模板管理器出现 9 个分类（基础 3 + 上下文 3 + 图像 3）。
  - 每个“图像”分类仅显示相应类型的模板。
  - TemplateSelect 可传入 `'imageIterate'` 并正确加载列表。
- 图像工作区
  - 首次进入时，若无保存记录，自动选择一个 `imageIterate` 默认模板。
  - 点击“继续优化”（图像模式）能直接弹出迭代输入弹窗，不再提示“请选择迭代模板”。
  - 从图像工作区打开“管理模板”，能够跳转到正确的图像分类。

## 五、实施计划（Rollout Plan）
1) Phase 1 — Core
- 新增 `imageIterate` 类型（types/manager/proxy/static-loader/service）。
- 重构默认模板目录，并新增 `image-iterate`（中/英）。
- 更新 `default-templates/index.ts` 聚合导入。

2) Phase 2 — UI
- TemplateManager 新增图像三类按钮与过滤。
- TemplateSelect 支持 `'imageIterate'`。
- i18n 新增相关文案。

3) Phase 3 — Image Workspace
- 增加/恢复 `selectedIterateTemplate` 逻辑与存储。
- 迭代调用传递所选模板 `id`；修复打开模板管理器类型。

4) Phase 4 — 验证
- 编译 core/ui 包，确保类型与构建通过。
- 验证模板列表、选择与迭代弹窗的端到端流程。
- 回归基础/上下文模板管理无回归。

## 六、风险与对策
- 类型遗漏：通过全局检索 `listTemplatesByType(...)` 与 `templateType` union 的使用点，保证全部覆盖；CI 构建验证。
- 兼容性：旧数据若仅保存 `iterate`，恢复时提示用户切换至 `imageIterate`；必要时提供回退逻辑（仅临时）。
- UI 对接：图像工作区与全局 TemplateManager 的控制方式需统一（建议通过 provide/inject 或复用 `useTemplateManager`）。

---
如需补充更多内置模板（如“风格保持迭代”“细节增强迭代”等），可在 `image-optimize/iterate/` 下继续添加，并在 `index.ts` 中聚合导出。
