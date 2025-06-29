# 开发过程归档

这里按功能点归档了项目开发过程中的重构记录、设计文档、经验总结等，用于后续跟踪和排错。

## 📚 归档说明

### 编号规范
- **起始编号**：101
- **编号方式**：简单累加（101, 102, 103...）
- **编号保留**：即使功能废弃，编号也不重复使用

### 归档原则
- **按功能点归档**：同一功能的所有相关文档放在一起
- **完整上下文**：包含计划、设计、实现、经验等完整记录
- **时间顺序**：通过编号体现开发的时间顺序

## 🗂️ 功能点列表

### 已完成
- [101-singleton-refactor](./101-singleton-refactor/) - 单例模式重构 ✅
- [102-web-architecture-refactor](./102-web-architecture-refactor/) - Web架构重构 ✅
- [103-desktop-architecture](./103-desktop-architecture/) - 桌面端架构 ✅
- [108-layout-system](./108-layout-system/) - 布局系统经验总结 ✅
- [109-theme-system](./109-theme-system/) - 主题系统开发 ✅
- [110-desktop-indexeddb-fix](./110-desktop-indexeddb-fix/) - 桌面端IndexedDB问题修复 ✅

### 进行中
- [106-template-management](./106-template-management/) - 模板管理功能 🔄
- [107-component-standardization](./107-component-standardization/) - 组件标准化重构 🔄

### 计划中
- [104-test-panel-refactor](./104-test-panel-refactor/) - 测试面板重构 📋
- [105-output-display-v2](./105-output-display-v2/) - 输出显示v2 📋

## 📋 文档结构

每个功能点目录包含：
- **README.md** - 功能点概述、时间线、状态
- **核心文档**（根据实际情况）：
  - `plan.md` - 计划文档
  - `design.md` - 设计文档
  - `implementation.md` - 实现记录
  - `experience.md` - 经验总结
  - `troubleshooting.md` - 排查清单

## 🔍 查找指南

### 按时间查找
- 101-103：2024年12月底的架构重构
- 104-106：2024年12月底至2025年1月初的功能开发
- 107-109：2025年7月的组件和系统优化

### 按类型查找
- **架构重构**：101, 102, 103
- **功能开发**：106, 107
- **UI优化**：104, 105
- **系统经验**：108, 109

### 按状态查找
- **已完成**：101, 102, 103, 108, 109
- **进行中**：106, 107
- **计划中**：104, 105

## 📝 使用说明

1. **查找相关功能**：根据功能名称或编号找到对应目录
2. **了解背景**：先阅读README.md了解功能概述
3. **深入细节**：根据需要查看具体的计划、设计或经验文档
4. **问题排查**：如有相关问题，查看troubleshooting.md

## 🔄 维护说明

- **新功能归档**：从110开始继续编号
- **文档更新**：功能完成后及时更新状态和经验总结
- **交叉引用**：在相关功能点之间建立引用关系
