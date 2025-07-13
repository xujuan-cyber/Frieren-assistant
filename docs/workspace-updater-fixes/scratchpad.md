# 开发草稿本

记录当前开发任务的进展和思考。

---

## 版本更新系统修复 - 2025-01-11
**目标**: 修复版本更新系统中的状态管理、忽略版本功能和UI交互问题
**状态**: 进行中

### 问题清单

#### �� 严重问题（影响核心功能）
1. **版本检查并发冲突问题** - 正式版和预览版同时检查导致间歇性失败
   - 当前 `checkBothVersions()` 并发调用两次 `checkSpecificVersion()`
   - 主进程全局锁 `isCheckingForUpdate` 导致第二次调用被拒绝
   - electron-updater 内部状态冲突，导致403认证错误
   - 影响：版本信息间歇性缺失，用户体验不稳定

2. **403 认证失败问题** - setFeedURL 配置中 token 传递不完整
   - 原因：setFeedURL 中只设置了 `private: true`，但没有显式传递 token
   - 现象：间歇性的 Azure Blob Storage 认证失败错误
   - 影响：私有仓库更新检查失败，用户无法获取更新信息

3. **后端单一忽略版本局限性** - 无法同时忽略正式版和预览版
   - 当前只能存储一个 `ignoredVersion` 字符串
   - 忽略新版本会覆盖之前忽略的版本
   - 影响：用户忽略操作不可靠

4. **前端忽略版本状态重置不完整** - 状态重置不彻底
   - `ignoreUpdate()` 只重置 `hasUpdate` 和 `updateInfo`
   - 没有重置 `hasStableUpdate` 和 `hasPrereleaseUpdate`
   - 影响：忽略后主界面图标可能仍然高亮

#### 🟡 重要问题（影响用户体验）
5. **预览版更新对正式版用户的影响** - 不应该提示预览版更新
   - `state.hasUpdate = state.hasStableUpdate || state.hasPrereleaseUpdate`
   - 即使用户使用正式版，预览版有更新也会高亮图标
   - 影响：用户困惑，不相关的更新提示

6. **忽略按钮显示逻辑缺失** - 应该只在有更新时显示
   - 当前忽略按钮总是显示
   - 没有检查是否真的有更新
   - 影响：UI逻辑不合理

#### 🟢 次要问题（UI优化）
7. **版本检查时的偏好设置污染** - 有风险但可控
   - `checkSpecificVersion` 中临时修改设置
   - 如果异常可能不会恢复设置
   - 影响：设置状态可能不一致

### 计划步骤

[ ] 1. **修复版本检查并发冲突问题**（当前执行中）
    - 预期结果：主进程统一管理版本检查，避免并发冲突
    - 风险评估：中，需要修改IPC通信逻辑
    - 技术方案：在主进程添加 `updater-check-all-versions` 接口

[x] 2. **修复setFeedURL中的token传递问题**（已完成）
    - 预期结果：私有仓库更新检查正常，消除403认证错误
    - 风险评估：低，只是完善配置参数
    - 完成时间：2025-01-12
    - 实际结果：成功在setFeedURL中显式传递token参数，增加调试信息

[ ] 3. **修复后端忽略版本存储结构**
    - 预期结果：支持同时忽略多个版本
    - 风险评估：需要考虑向后兼容性

[ ] 4. **完善前端忽略版本状态管理**
    - 预期结果：忽略操作后正确重置所有相关状态
    - 风险评估：低，主要是状态管理逻辑

[ ] 5. **优化hasUpdate计算逻辑**
    - 预期结果：根据用户偏好设置合理计算更新状态
    - 风险评估：中，需要考虑各种场景

[ ] 6. **完善忽略按钮显示条件**
    - 预期结果：只在真正有更新时显示忽略按钮
    - 风险评估：低，UI逻辑优化

[ ] 7. **添加异常处理保护**
    - 预期结果：确保设置修改有完整的异常保护
    - 风险评估：低，添加try-finally即可

### 技术方案设计

#### 并发检查问题解决方案
**问题分析**：
- 当前前端并发调用两次 `checkSpecificVersion()`
- 每次调用都修改 `allowPrerelease` 设置并调用主进程
- 主进程全局锁导致第二次调用失败
- electron-updater 内部状态冲突

**解决方案**：主进程统一管理
```javascript
// 主进程新增接口
ipcMain.handle('updater-check-all-versions', async () => {
  const results = {}
  
  // 串行检查正式版
  autoUpdater.allowPrerelease = false
  const stableResult = await autoUpdater.checkForUpdates()
  results.stable = processResult(stableResult)
  
  // 延迟后检查预览版
  await new Promise(resolve => setTimeout(resolve, 1000))
  autoUpdater.allowPrerelease = true
  const prereleaseResult = await autoUpdater.checkForUpdates()
  results.prerelease = processResult(prereleaseResult)
  
  return results
})
```

```typescript
// 前端修改
const checkBothVersions = async () => {
  const results = await window.electronAPI.updater.checkAllVersions()
  // 处理返回的结果...
}
```

#### 进展记录
- [2025-01-11 23:55] 开始执行步骤1：修复版本检查并发冲突问题
- [2025-01-11 23:55] 分析问题：确认是并发检查导致的状态冲突
- [2025-01-11 23:55] 选择技术方案：主进程统一管理，避免前端并发调用
- [2025-01-12 00:10] 实施修改：
  - 在constants.js中添加UPDATE_CHECK_ALL_VERSIONS事件
  - 在main.js中添加新的IPC处理器，实现串行检查逻辑
  - 在preload.js中添加checkAllVersions API
  - 在useUpdater.ts中修改checkBothVersions函数使用新API
- [2025-01-12 00:10] 完成主要代码修改，待测试验证

---

## 开发环境更新测试支持 - 2025-01-11
**目标**: 让开发环境支持更新测试，为后续版本更新系统修复提供便利的测试环境
**状态**: 进行中

### 核心问题
当前开发环境被硬编码禁用更新功能，导致：
1. 无法在开发环境中测试更新功能
2. 每次测试都需要打包应用，效率低下
3. 开发者无法方便地验证更新相关的修复

### 解决方案
实现智能的环境变量驱动配置系统：
- 默认使用package.json中的仓库配置
- 通过环境变量动态覆盖配置
- 支持开发环境的更新测试

### 计划步骤

[x] 1. **修改package.json设置默认仓库信息**
    - 预期结果：设置默认的公开仓库配置
    - 风险评估：低，只是恢复默认配置
    - 完成时间：2025-01-11
    - 实际结果：成功设置默认仓库为 linshenkx/prompt-optimizer

[x] 2. **在main.js中实现环境变量动态配置**
    - 预期结果：支持通过环境变量动态配置更新源
    - 风险评估：中，需要正确处理setFeedURL
    - 完成时间：2025-01-11
    - 实际结果：成功实现环境变量检测和setFeedURL动态配置

[x] 3. **移除开发环境硬编码禁用逻辑**
    - 预期结果：开发环境可以正常进行更新检查
    - 风险评估：低，移除限制逻辑
    - 完成时间：2025-01-11
    - 实际结果：成功移除后端main.js中的硬编码禁用逻辑

[x] 4. **修改前端useUpdater.ts**
    - 预期结果：前端不再硬编码禁用开发环境更新
    - 风险评估：低，移除限制逻辑
    - 完成时间：2025-01-11
    - 实际结果：成功移除前端的开发环境检查逻辑

[x] 5. **添加开发环境更新调试支持**
    - 预期结果：完善的调试日志和开发模式支持
    - 风险评估：低，添加调试功能
    - 完成时间：2025-01-11
    - 实际结果：成功添加electron-log日志器和forceDevUpdateConfig支持

[x] 6. **更新环境变量配置说明**
    - 预期结果：清晰的开发环境测试指南
    - 风险评估：低，文档更新
    - 完成时间：2025-01-11
    - 实际结果：成功更新env.local.example文件，添加详细的配置说明

### 技术方案设计

#### 1. package.json默认配置
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "linshenkx",
      "repo": "prompt-optimizer",
      "private": false
    }
  }
}
```

#### 2. 环境变量动态配置逻辑
```javascript
// 检测环境变量并动态配置
const currentRepo = process.env.GITHUB_REPOSITORY || `${process.env.DEV_REPO_OWNER}/${process.env.DEV_REPO_NAME}`;
const defaultRepo = 'linshenkx/prompt-optimizer';

if (currentRepo && currentRepo !== defaultRepo) {
  // 使用setFeedURL动态配置
  const [owner, repo] = currentRepo.split('/');
  autoUpdater.setFeedURL({
    provider: 'github',
    owner,
    repo,
    private: process.env.GH_TOKEN ? true : false
  });
}
```

#### 3. 开发环境支持
```javascript
// 开发环境调试支持
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'debug';
  autoUpdater.forceDevUpdateConfig = true;
}
```

---

## 进展记录

### 2025-01-11
- 完成问题分析和技术方案设计
- 确定修复优先级和实施计划
- 14:30 开始执行开发环境更新测试支持任务
- 14:35 完成package.json默认仓库配置修改
- 14:40 完成main.js环境变量动态配置实现
- 14:45 完成开发环境硬编码禁用逻辑移除
- 14:50 完成前端useUpdater.ts开发环境检查移除
- 14:55 完成开发环境调试支持添加
- 15:00 完成环境变量配置说明更新
- 15:05 所有计划步骤完成，开发环境更新测试支持已实现

### 2025-01-12
- 16:00 发现新问题：下载完成后没有安装按钮
- 16:05 分析问题：前端UpdaterModal.vue中下载完成视图缺少安装按钮
- 16:10 开始修复：增强后端update-downloaded事件处理
- 16:15 完成后端main.js修改：添加详细日志和信息传递
- 16:20 完成前端UpdaterModal.vue修改：添加"安装并重启"按钮
- 16:25 完成国际化支持：添加中英文翻译文本
- 16:30 完成应用重新构建：生成新的exe文件
- 16:35 用户确认修复成功：下载完成后正确显示安装按钮
- 16:40 发现新问题：点击安装按钮后出现数据保存死循环
- 16:45 分析问题：quitAndInstall触发before-quit事件，导致数据保存循环
- 16:50 开始修复：添加isUpdaterQuitting标志跳过数据保存逻辑
- 16:55 完成修复：在UPDATE_INSTALL和before-quit事件中添加标志检查
- 17:00 完成应用重新构建：生成修复死循环问题的exe文件

---

## 重要发现

### 开发环境更新测试支持实现
- electron-updater完全支持开发环境更新测试，无需禁用
- 通过forceDevUpdateConfig可以强制启用开发模式更新检查
- setFeedURL方法支持动态配置，可以通过环境变量灵活切换仓库
- electron-log提供完善的调试日志支持，便于问题排查

### 架构优化经验
- 默认配置 + 环境变量覆盖的模式比动态修改源码文件更安全
- 前后端都需要移除开发环境的硬编码限制
- 环境变量检测逻辑应该在setupUpdateHandlers早期执行
- 开发环境和生产环境应该使用相同的更新逻辑，只是配置不同

### 技术细节
- autoUpdater.setFeedURL支持对象参数，包含provider、owner、repo、private等字段
- 环境变量优先级：GITHUB_REPOSITORY > DEV_REPO_OWNER+DEV_REPO_NAME > 默认配置
- 开发环境日志自动保存到用户数据目录的logs/auto-updater.log

### 更新UI流程修复经验
- electron-updater的update-downloaded事件只是通知下载完成，不会自动安装
- 需要手动调用autoUpdater.quitAndInstall()来执行安装和重启
- 前端UI需要在下载完成后提供明确的"安装并重启"按钮
- 后端可以通过update-downloaded事件向前端传递详细的安装指导信息
- 安装按钮应该调用UPDATE_INSTALL IPC事件，触发quitAndInstall()
- quitAndInstall()会立即关闭应用并启动新版本，是原子操作

### 更新安装死循环修复经验
- quitAndInstall()会触发app的before-quit事件，可能与数据保存逻辑冲突
- 需要区分正常退出和更新安装退出，避免在更新时保存数据
- 使用isUpdaterQuitting标志来跳过更新安装时的数据保存逻辑
- 在窗口关闭和应用退出事件中都需要检查这个标志
- 更新安装时不应该保存数据，因为新版本会重新初始化数据

---

## 待办事项

### 紧急
- [ ] 修复后端忽略版本存储结构
- [ ] 完善前端状态重置逻辑

### 重要  
- [ ] 优化hasUpdate计算逻辑
- [ ] 完善UI显示条件

### 一般
- [ ] 添加异常处理保护
- [ ] 完善错误恢复机制

---

## 问题记录

### 未解决
- 后端单一忽略版本局限性 - 2025-01-11
- 前端状态重置不完整 - 2025-01-11

### 已解决
- (待记录)

---

## 备注

### 设计原则
- 避免过度设计，专注于真实存在的问题
- 保持现有简单设计的优势
- 确保向后兼容性

### 里程碑
- [x] 完成开发环境更新测试支持 - 2025-01-11
- [x] 完成package.json默认仓库配置 - 2025-01-11
- [x] 完成环境变量动态配置实现 - 2025-01-11
- [x] 完成开发环境硬编码禁用逻辑移除 - 2025-01-11
- [x] 完成相关文档更新 - 2025-01-11
- [x] 完成下载完成后安装按钮修复 - 2025-01-12
- [x] 完成更新安装死循环问题修复 - 2025-01-12
- [ ] 完成后端存储结构改进（待后续任务）
- [ ] 完成前端状态管理修复（待后续任务）
- [ ] 完成UI逻辑优化（待后续任务）
- [ ] 所有修复功能测试通过（待后续任务）
