# 待办事项

管理当前和未来的开发任务。

## 🔥 紧急任务

### 本周必须完成
- [ ] 修复TemplateManager ElectronProxy - 2024-12-29 - 当前阻塞Desktop功能
- [ ] 完成DataManager完整重构 - 2024-12-29 - 高优先级
- [ ] 创建其他服务Web适配器 - 2024-12-30 - 保证架构一致性
- [ ] 最终功能验证 - 2024-12-30 - 确保质量

### 今日重点 - 修复现有问题
- [ ] 修复TemplateManager ElectronProxy转发问题 - 2小时 ⚠️ 紧急
- [ ] 创建TemplateManager Web适配器 - 1小时
- [ ] 创建DataManager ElectronProxy - 1.5小时  
- [ ] 创建DataManager Web适配器 - 1小时

## ⭐ 重要任务

### 接口驱动架构改造 (当前任务)
- [x] ModelManager重构 - 已完成 - 2024-12-28 ✅
- [x] HistoryManager重构 - 已完成 - 2024-12-28 ✅  
- [ ] **TemplateManager重构** - 进行中 - 预计1天 ⚠️ 发现ElectronProxy有问题
- [ ] **DataManager重构** - 高优先级 - 预计1天 ⚠️ 缺少ElectronProxy
- [ ] LLMService重构 - 高优先级 - 预计0.5天
- [ ] PromptService重构 - 高优先级 - 预计0.5天
- [ ] PreferenceService重构 - 中优先级 - 预计0.5天
- [ ] 最终验证 - 高优先级 - 预计0.5天

### 技术债务
- [ ] 所有core服务的接口完整性检查 - 高影响 - 预计1天
- [ ] UI组件对接口方法的依赖梳理 - 中影响 - 预计0.5天  
- [ ] IPC调用的性能优化评估 - 中影响 - 预计1天
- [ ] 错误处理机制的统一性改进 - 低影响 - 预计0.5天

### 文档更新
- [ ] 接口驱动架构设计文档 - 架构说明 - 预计2小时
- [ ] 开发规范文档更新 - 规范补充 - 预计1小时
- [ ] 重构经验整理到experience.md - 经验记录 - 预计1小时

## 📋 一般任务

### 优化改进
- [ ] Web适配器性能优化 - 减少性能开销
- [ ] IPC调用缓存机制优化 - 提升响应速度
- [ ] 错误信息国际化 - 提升用户体验

### 学习研究
- [ ] Electron多进程架构最佳实践 - 深化理解
- [ ] TypeScript接口设计模式 - 提升设计能力
- [ ] Vue3 Composition API与TypeScript集成 - 技能提升

### 测试完善
- [ ] 增加Desktop环境集成测试 - 确保质量
- [ ] Web环境与Desktop环境对比测试 - 验证一致性
- [ ] IPC调用的单元测试 - 提升覆盖率

## ✅ 已完成

### 本周完成
- [x] Desktop IPC修复 - 2024-12-28 - 解决了BuiltinTemplateLanguageSwitch错误
- [x] 架构问题根因分析 - 2024-12-28 - 发现Web vs Desktop差异
- [x] ModelManager接口补全 - 2024-12-28 - 添加ensureInitialized等方法
- [x] ModelManager Web适配器 - 2024-12-28 - 严格接口约束实现
- [x] ModelManager Desktop IPC链 - 2024-12-28 - 完整IPC转发
- [x] HistoryManager接口补全 - 2024-12-28 - 添加deleteChain方法
- [x] HistoryManager方法签名修复 - 2024-12-28 - 统一addIteration签名
- [x] HistoryManager Web适配器 - 2024-12-28 - 接口驱动实现
- [x] HistoryManager Desktop IPC链 - 2024-12-28 - 完整转发机制
- [x] 移除未使用的getModelOptions方法 - 2024-12-28 - 避免过度设计，保持接口精简

### 历史完成
- [x] 任务112归档整理 - 2024-12-28 - Desktop IPC修复经验总结

## 🗓️ 未来计划

### 下周计划 (2024-12-30 - 2025-01-03)
- 完成所有核心服务的接口驱动改造 - 确保架构一致性
- 进行全面的功能验证测试 - 保证Web和Desktop版本功能一致
- 整理完整的架构改造文档 - 为后续开发提供指导

### 本月目标 (2025年1月)
- 接口驱动架构改造完全完成 - 消除Web vs Desktop架构差异
- 建立完善的开发规范 - 避免类似问题再次发生
- 性能优化和用户体验提升 - 基于新架构进行优化

---

## 🎯 当前焦点：TemplateManager重构

### 具体子任务
- [ ] 分析ITemplateManager接口缺失的方法
- [ ] 更新ITemplateManager接口定义
- [ ] 在TemplateManager类中实现缺失方法
- [ ] 创建templateManagerAdapter适配器
- [ ] 更新ElectronTemplateManagerProxy
- [ ] 更新preload.js IPC暴露
- [ ] 更新main.js IPC处理
- [ ] 测试Web环境功能
- [ ] 测试Desktop环境功能
- [ ] 更新progress记录

### 风险点关注
- 模板语言切换功能的复杂性
- 内置模板与用户模板的处理差异
- 缓存机制的一致性
- 国际化支持的完整性

---

## 📝 使用说明

1. **优先级管理** - 按紧急程度分类任务，当前聚焦接口驱动架构改造
2. **时间估算** - 为每个任务估算所需时间，便于进度规划
3. **定期更新** - 每完成一个服务重构都及时更新状态
4. **完成标记** - 及时标记完成的任务并记录重要发现

**重要提醒**: 当前正在执行的是系统性架构改造，每个服务的重构都要遵循相同的模式：接口补全 → Web适配器 → Desktop IPC链 → 功能验证

### 经验教训总结
- [x] 建立过度设计识别机制 - 2024-12-28 - 严格按需求添加接口方法
- [x] 强化workspace变更记录规范 - 2024-12-28 - 所有修改都要详细记录便于审核

### 发现的问题 ⚠️
- [x] **移除未使用的getModelOptions方法** - 2024-12-28 - 避免过度设计 ✅
- [ ] **修复TemplateManager ElectronProxy** - 发现问题：
  - ensureInitialized()返回空实现而非转发
  - isInitialized()返回硬编码true而非转发  
  - 缺少语言相关方法的IPC转发
- [ ] **创建DataManager ElectronProxy** - 完全缺失
- [ ] **修复useAppInitializer直接使用实例问题** - 应该使用接口适配器

### 适配器和IPC链问题清单
#### ✅ 正确实现
- ModelManager: ElectronProxy + Web适配器 
- HistoryManager: ElectronProxy + Web适配器
- LLMService: ElectronProxy正确
- PromptService: ElectronProxy正确  
- PreferenceService: ElectronProxy正确

#### ⚠️ 有问题
- TemplateManager: ElectronProxy转发有误 + 缺少Web适配器

#### ❌ 缺失
- DataManager: 缺少ElectronProxy + 缺少Web适配器
- LLMService: 缺少Web适配器
- PromptService: 缺少Web适配器
- PreferenceService: 缺少Web适配器
