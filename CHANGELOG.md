# Changelog

Full release narratives now live in versioned files under `releases/`. This file stays as the index and summary entry point.

## [2.9.2] - 2026-04-07
- EN: This release fixes the desktop updater path for both stable and prerelease downloads, hardens invalid preference-key handling, and expands the bilingual image workflow documentation. See [Release Notes (EN)](releases/v2.9.2.en.md).
- 中文：本次发布修复了桌面端正式版与预览版下载更新链路，强化了无效偏好键处理，并补充了双语图像工作流文档。参见 [版本说明（中文）](releases/v2.9.2.zh-CN.md)。

## [2.9.1] - 2026-04-06
- EN: This hotfix restores a more visible remove affordance in the multi-image upload area, replacing the footer text action with a clearer top-right icon button. See [Release Notes (EN)](releases/v2.9.1.en.md).
- 中文：本次热修复让多图上传区域的删除入口重新变得更直观，用更明显的右上角图标按钮替代底部文字按钮。参见 [版本说明（中文）](releases/v2.9.1.zh-CN.md)。

## [2.9.0] - 2026-04-06
- EN: End-to-end multi-image generation, stronger storage safety and favorite asset handling, and a clearer data manager storage overview. See [Release Notes (EN)](releases/v2.9.0.en.md).
- 中文：本次发布带来端到端多图生图、更稳健的存储安全与收藏资源治理，以及更清晰的数据管理存储概览。参见 [版本说明（中文）](releases/v2.9.0.zh-CN.md)。

## [2.8.0] - 2026-04-03
- EN: Text-to-image evaluation, smoother reference-image workflows, and stronger Cloudflare-backed model support. See [Release Notes (EN)](releases/v2.8.0.en.md).
- 中文：本次发布聚焦文生图评估、更顺畅的参考图工作流，以及更稳健的 Cloudflare 模型支持。参见 [版本说明（中文）](releases/v2.8.0.zh-CN.md)。

## [2.7.0] - 2026-03-25
- EN: Structured compare evaluation, smoother compare UX, and refreshed docs and website surfaces. See [Release Notes (EN)](releases/v2.7.0.en.md).
- 中文：本次发布聚焦结构化对比评估、更顺畅的对比体验，以及焕新的文档与站点展示。参见 [版本说明（中文）](releases/v2.7.0.zh-CN.md)。

## [2.6.3] - 2026-03-22
- EN: Image prompt extraction, stronger image understanding, and a safer desktop release pipeline. See [Release Notes (EN)](releases/v2.6.3.en.md).
- 中文：本次发布带来图像提示词提取、更强的图像理解能力，以及更稳健的桌面端发布链路。参见 [版本说明（中文）](releases/v2.6.3.zh-CN.md)。

## [2.6.2] - 2026-03-15
- EN: Reworked evaluation architecture, cleaner workspace/result/compare flows, and more stable variable handling. See [Release Notes (EN)](releases/v2.6.2.en.md).
- 中文：本次发布重构了评估架构，梳理了工作区 / 结果 / 对比流程，并让变量处理更稳定。参见 [版本说明（中文）](releases/v2.6.2.zh-CN.md)。

## [2.6.1] - 2026-03-12
- EN: Better model management, richer image generation metadata, and stronger custom model configuration support. See [Release Notes (EN)](releases/v2.6.1.en.md).
- 中文：本次发布改进了模型管理、补充了更丰富的图像生成元数据，并增强了自定义模型配置能力。参见 [版本说明（中文）](releases/v2.6.1.zh-CN.md)。

## [2.6.0] - 2026-03-09
- EN: MiniMax provider support, stronger model management, and more usable temporary-variable and XML inspection workflows. See [Release Notes (EN)](releases/v2.6.0.en.md).
- 中文：本次发布带来 MiniMax provider 支持，进一步强化了模型管理，也让临时变量与 XML 检查体验更顺手。参见 [版本说明（中文）](releases/v2.6.0.zh-CN.md)。

## [2.5.5] - 2026-03-01
- EN: Media-aware favorites, Prompt Garden asset imports, and more durable preview storage. See [Release Notes (EN)](releases/v2.5.5.en.md).
- 中文：本次发布让收藏夹支持媒体内容、Prompt Garden 资源导入，并让预览资源存储更可靠。参见 [版本说明（中文）](releases/v2.5.5.zh-CN.md)。

## [2.5.4] - 2026-02-10
- EN: Feedback-driven evaluation, stronger parsing robustness, and smoother analyze interactions. See [Release Notes (EN)](releases/v2.5.4.en.md).
- 中文：本次发布强化了反馈驱动评估、结果解析鲁棒性，以及分析交互体验。参见 [版本说明（中文）](releases/v2.5.4.zh-CN.md)。

## [2.1.0] - 2025-01-19

### 🎉 Added - 收藏管理重构 (Favorite Management Refactor)

#### 🏗️ 核心架构改进
- **三层分类体系**:
  - `functionMode`: `basic | context | image` (必填)
  - `optimizationMode`: `system | user` (basic模式)
  - `imageSubMode`: `text2image | image2image` (image模式)
  - **Category**: 主题分类 (学习研究、日常助手等)
- **元数据重组**: `originalContent` 和 `sourceHistoryId` 移至 `metadata` 对象
- **TypeMapper 工具类**: 自动从历史记录类型推断功能模式

#### 🏷️ 独立标签库系统
- **标签全生命周期管理**: 重命名、合并、删除、统计
- **智能标签自动完成**: 基于使用频率的建议排序
- **独立标签存储**: 支持零使用次数的标签

#### 📁 分类管理增强
- **分类排序**: 支持上移/下移调整顺序
- **使用统计**: 计算每个分类的收藏数量
- **删除保护**: 有收藏的分类无法删除
- **颜色标识**: 支持自定义分类颜色

#### 🎨 UI 组件重构
- **SaveFavoriteDialog**: 统一的创建/编辑对话框，支持功能模式选择
- **TagManager**: 完整的标签管理界面
- **CategoryManager**: 分类管理界面，支持颜色选择和排序
- **标签自动完成**: `useTagSuggestions` + `NAutoComplete` 集成

#### 🔄 向后兼容性
- **数据迁移**: 自动检测和迁移旧数据
- **渐进式迁移**: 保留现有分类，不强制迁移

### 💔 Breaking Changes
- **移除 `isPublic` 字段**: 单机应用中无意义的公开字段
- **`FavoritePrompt` 接口变更**: `functionMode` 变为必填，`metadata` 结构重组

### 📝 Migration Guide
系统会自动检测旧数据并迁移，所有现有收藏保持不变，向后兼容。

### 🐛 Bug Fixes
- 修复导入导出数据完整性问题
- 修复标签计数不准确问题
- 修复E2E测试中遮罩层拦截点击问题

---

## [2.0.0] - 2025-01-XX

### 🎉 Initial Release
- 基础收藏管理功能
- 优化历史集成
- 标签和分类基础支持
- 导入导出功能
