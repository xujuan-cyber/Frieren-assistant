# Changelog

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