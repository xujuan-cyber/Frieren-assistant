# 项目文档索引

## 文档合并说明

为了提高文档的组织性和可读性，我们对项目文档进行了重构和合并。以下是文档合并情况：

| 新文档 | 包含原文档 | 说明 |
|-------|------------|------|
| [technical-development-guide.md](./technical-development-guide.md) | development-guidelines.md, technical-documentation.md | 技术开发指南，整合了开发规范和技术文档 |
| [project-structure.md](./project-structure.md) | file-structure.md, fileNames.md | 项目结构说明，包含文件结构和目录组织 |
| [project-status.md](./project-status.md) | progress.md, chrome-extension-plan.md | 项目状态，包含进度和Chrome扩展计划 |


## 核心文档

- [README.md](../README.md) - 项目总体介绍
- [technical-development-guide.md](./technical-development-guide.md) - 技术开发指南，包含技术栈和开发规范
- [project-structure.md](./project-structure.md) - 项目结构，专注于文件和目录组织
- [project-status.md](./project-status.md) - 项目状态，包含进度和计划
- [prd.md](./prd.md) - 产品需求文档

## 其他资源

- [experience.md](../experience.md) - 项目经验总结
- [scratchpad.md](../scratchpad.md) - 开发笔记
- [CHANGELOG.md](./CHANGELOG.md) - 文档更新日志

## 如何使用文档

1. **新成员入职**：
   - 首先阅读 README.md，了解项目概况
   - 查看 project-structure.md 了解项目结构
   - 参考 technical-development-guide.md 了解技术实现和开发规范

2. **开发参考**：
   - 遵循 technical-development-guide.md 中的开发规范
   - 查阅 technical-development-guide.md 了解应用流程
   - 参考 project-structure.md 了解代码组织

3. **项目进度**：
   - 通过 project-status.md 了解当前进度和计划
   - 关注 CHANGELOG.md 了解最新变更

## 文档维护说明

1. 所有文档采用 Markdown 格式
2. 文档更新后，请在文档末尾添加更新时间
3. 重要变更请同时更新 project-status.md 中的更新记录
4. 文档中的代码示例应确保可运行且符合项目规范
5. 注意区分不同文档的职责，避免内容重复
6. 弃用的文档应标记为已弃用，并引导用户使用新文档

最后更新：2024-03-02 