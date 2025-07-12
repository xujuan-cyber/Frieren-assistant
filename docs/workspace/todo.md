# 任务清单

## 🚨 紧急任务

### 第一阶段：基础设施建设 (本周开始)
**优先级**: P0 - 阻塞后续开发
**预计时间**: 1-2周

#### 依赖管理 (今日完成)
- [ ] 添加electron-updater到dependencies - 30分钟
- [ ] 验证electron-updater与当前Electron版本兼容性 - 1小时

#### 核心前置任务 (今日完成)
- [ ] **关键**: 重定位数据存储路径 - 1小时
  - 在main.js中修改FileStorageProvider初始化路径为app.getPath('userData')
  - 确保所有后续数据读写使用标准用户数据目录

#### 构建配置修改 (本周完成)
- [ ] 修改desktop/package.json支持多格式构建 - 2小时
  - 添加nsis、dmg、AppImage目标
  - 配置publish参数指向GitHub仓库
- [ ] 更新CI/CD工作流支持新构建格式 - 3小时
  - 修改artifact上传配置
  - 更新release文件配置

#### 主进程更新逻辑 (本周完成)
- [ ] 实现checkUpdate函数 - 4小时
  - 集成PreferenceService读取设置
  - 配置autoUpdater参数
  - 处理update-available事件
- [ ] 添加IPC处理器 - 2小时
  - start-download-update
  - install-update
  - ignore-update
  - open-external-link

## ⭐ 重要任务

### 第二阶段：UI交互实现 (下周开始)
**优先级**: P1 - 核心功能
**预计时间**: 1周

#### Composable开发
- [ ] 创建useUpdater.ts - 4小时
  - 状态管理(hasUpdate, updateInfo, downloadProgress等)
  - IPC通信封装
  - 错误处理
  - **关键**: 环境检测，仅在Electron环境中启用功能

#### 组件开发
- [ ] 实现UpdaterIcon.vue - 3小时
  - 更新提示图标
  - 点击弹出面板
  - 状态指示器
  - **关键**: 使用isRunningInElectron()进行环境检测
- [ ] 实现UpdaterPanel.vue - 6小时
  - 多状态视图(默认/更新可用/下载中/下载完成)
  - 用户交互按钮
  - 进度显示
  - **关键**: 仅在Electron环境中渲染

#### 集成工作
- [ ] 集成到App.vue主界面 - 2小时
  - **关键**: 条件渲染，仅在desktop环境显示
  - 确保web/extension环境完全透明
- [ ] 多环境兼容性测试 - 3小时
  - 验证web环境中更新组件不显示
  - 验证extension环境中更新组件不显示
  - 验证desktop环境中更新功能正常

### 第三阶段：测试与优化 (第三周)
**优先级**: P1 - 质量保证
**预计时间**: 1周

#### 功能测试
- [ ] 端到端更新流程测试 - 4小时
- [ ] 多平台兼容性验证 - 6小时
- [ ] 错误场景测试 - 3小时
- [ ] 安全性测试 - 1小时
  - 验证open-external-link仅支持http/https协议
  - 确保正确拒绝file://等其他协议

#### 优化工作
- [ ] 用户体验优化 - 3小时
  - 慢速网络环境下载体验测试
  - 下载中断/应用退出处理验证
  - 更新提示文案优化
- [ ] 性能优化 - 2小时
- [ ] 文档编写 - 3小时
  - 用户手册：更新功能使用说明(如Beta通道开启)
  - 开发者文档：更新系统架构和IPC事件列表

## 📋 一般任务

### 后续优化 (第四周及以后)
**优先级**: P2 - 增强功能

- [ ] 添加更新日志显示功能 - 4小时
- [ ] 实现增量更新支持 - 8小时
- [ ] 添加更新统计和分析 - 6小时
- [ ] 创建用户手册和FAQ - 4小时

### 技术债务
- [ ] 重构现有错误处理机制 - 6小时
- [ ] 优化IPC通信性能 - 4小时
- [ ] 添加更多单元测试 - 8小时

## ✅ 已完成
- [x] 任务需求分析和技术方案设计
- [x] 历史经验查询和避坑要点识别
- [x] workspace初始化和任务规划
- [x] 详细实施计划制定
