# 开发草稿本

记录当前开发任务的进展和思考。

---

## 版本更新系统修复 - 2025-01-11
**目标**: 修复版本更新系统中的状态管理、忽略版本功能和UI交互问题
**状态**: 进行中

### 问题清单

#### 🔴 严重问题（影响核心功能）
1. **后端单一忽略版本局限性** - 无法同时忽略正式版和预览版
   - 当前只能存储一个 `ignoredVersion` 字符串
   - 忽略新版本会覆盖之前忽略的版本
   - 影响：用户忽略操作不可靠

2. **前端忽略版本状态重置不完整** - 状态重置不彻底
   - `ignoreUpdate()` 只重置 `hasUpdate` 和 `updateInfo`
   - 没有重置 `hasStableUpdate` 和 `hasPrereleaseUpdate`
   - 影响：忽略后主界面图标可能仍然高亮

#### 🟡 重要问题（影响用户体验）
3. **预览版更新对正式版用户的影响** - 不应该提示预览版更新
   - `state.hasUpdate = state.hasStableUpdate || state.hasPrereleaseUpdate`
   - 即使用户使用正式版，预览版有更新也会高亮图标
   - 影响：用户困惑，不相关的更新提示

4. **忽略按钮显示逻辑缺失** - 应该只在有更新时显示
   - 当前忽略按钮总是显示
   - 没有检查是否真的有更新
   - 影响：UI逻辑不合理

#### 🟢 次要问题（UI优化）
5. **版本检查时的偏好设置污染** - 有风险但可控
   - `checkSpecificVersion` 中临时修改设置
   - 如果异常可能不会恢复设置
   - 影响：设置状态可能不一致

### 计划步骤

[x] 1. **修复后端忽略版本存储结构**
    - 预期结果：支持同时忽略多个版本 ✅
    - 风险评估：需要考虑向后兼容性 ✅
    - 实施内容：
      - 添加新的 `IGNORED_VERSIONS` 常量
      - 实现 `getIgnoredVersions()` 函数支持数据迁移
      - 实现 `isVersionIgnored()` 函数检查忽略状态
      - 更新 `update-available` 事件处理器
      - 更新 `UPDATE_IGNORE_VERSION` IPC处理器支持版本类型

[x] 2. **完善前端忽略版本状态管理**
    - 预期结果：忽略操作后正确重置所有相关状态 ✅
    - 风险评估：低，主要是状态管理逻辑 ✅
    - 实施内容：
      - 修改 `ignoreUpdate` 函数支持版本类型参数
      - 添加对应状态重置逻辑（hasStableUpdate/hasPrereleaseUpdate）
      - 更新 `handleIgnoreStableUpdate` 和 `handleIgnorePrereleaseUpdate`
      - 使用 `calculateHasUpdate()` 重新计算总体状态

[x] 3. **优化hasUpdate计算逻辑**
    - 预期结果：根据用户偏好设置合理计算更新状态 ✅
    - 风险评估：中，需要考虑各种场景 ✅
    - 实施内容：
      - 创建 `calculateHasUpdate()` 函数
      - 在 `checkBothVersions` 中使用新的计算逻辑
      - 考虑用户的 `allowPrerelease` 设置

[x] 4. **完善忽略按钮显示条件**
    - 预期结果：只在真正有更新时显示忽略按钮 ✅
    - 风险评估：低，UI逻辑优化 ✅
    - 实施内容：
      - 添加 `v-if="state.hasStableUpdate"` 到正式版忽略按钮
      - 添加 `v-if="state.hasPrereleaseUpdate"` 到预览版忽略按钮

[x] 5. **添加异常处理保护**
    - 预期结果：确保设置修改有完整的异常保护 ✅
    - 风险评估：低，添加try-finally即可 ✅
    - 实施内容：
      - 在 `checkSpecificVersion` 中添加 try-finally 保护
      - 确保偏好设置在异常时能正确恢复

### 技术方案设计

#### 后端存储结构改进
```javascript
// 当前：单一版本存储
ignoredVersion: "1.3.0"

// 改进：支持多版本存储
ignoredVersions: {
  stable: "1.3.0",
  prerelease: "1.4.0-beta1"
}
```

#### 前端状态管理改进
```typescript
// 改进忽略逻辑
const ignoreUpdate = async (version?: string, type?: 'stable' | 'prerelease') => {
  // 调用后端忽略
  await window.electronAPI.updater.ignoreVersion(version, type)
  
  // 重置对应状态
  if (type === 'stable') {
    state.hasStableUpdate = false
  } else if (type === 'prerelease') {
    state.hasPrereleaseUpdate = false
  }
  
  // 重新计算总体状态
  state.hasUpdate = state.hasStableUpdate || state.hasPrereleaseUpdate
}
```

#### hasUpdate计算逻辑优化
```typescript
// 考虑用户偏好的更新状态计算
const calculateHasUpdate = () => {
  if (state.allowPrerelease) {
    // 预览版用户：正式版或预览版有更新都提示
    return state.hasStableUpdate || state.hasPrereleaseUpdate
  } else {
    // 正式版用户：只有正式版更新才提示
    return state.hasStableUpdate
  }
}
```

---

## 进展记录

### 2025-01-11
- 完成问题分析和技术方案设计
- 确定修复优先级和实施计划
- ✅ 完成后端忽略版本存储结构修复
  - 添加新的多版本存储格式
  - 实现向后兼容的数据迁移
  - 更新IPC处理器支持版本类型
- ✅ 完成前端状态管理修复
  - 修改ignoreUpdate函数支持版本类型
  - 完善状态重置逻辑
  - 实现基于用户偏好的更新计算
- ✅ 完成UI逻辑优化
  - 添加忽略按钮显示条件
  - 添加异常处理保护机制
- ✅ 完成基础功能测试
  - 项目构建成功（core包和ui包）
  - 桌面应用启动成功，无相关错误
  - 需要进一步测试更新功能的具体行为
- ✅ 完成代码审查和修复
  - 修复了函数作用域问题（getIgnoredVersions移到全局作用域）
  - 修复了preload.js中ignoreVersion函数的参数问题
  - 修复了前端消息显示逻辑
  - 所有修复后的代码构建成功
- ✅ 修复下载失败问题
  - 问题：下载时出现"Please check update first"错误
  - 根本原因：在没有更新可用时仍然尝试下载
  - 分析过程：
    - 查阅electron-updater官方文档确认API行为
    - 验证后端返回的数据结构与文档一致
    - 发现问题在于hasUpdate=false时仍然调用startDownload()
  - 修复：
    - 添加hasUpdate检查，只有在真正有更新时才下载
    - 保持原有的数据结构验证逻辑
    - 提供清晰的日志信息区分不同的退出原因
- ✅ 修复下载失败无提醒问题
  - 问题：下载失败时用户没有任何可见的反馈
  - 影响：用户点击下载按钮后不知道为什么没有反应
  - 修复：
    - 添加downloadError和lastDownloadAttempt状态字段
    - 在所有下载失败场景中设置用户友好的错误信息
    - 在UI中显示红色错误提示框，包含具体错误原因
    - 提供"关闭"按钮让用户可以手动清除错误提示
    - 在下载成功时自动清除错误状态
- ✅ 修复状态恢复逻辑严重缺陷
  - 问题：下载过程中异常时，用户的allowPrerelease偏好设置不会恢复
  - 影响：用户的更新通道设置可能被永久性意外改变
  - 修复：
    - 将originalPreference声明提升到try块外
    - 使用try...finally结构确保状态恢复
    - 在finally块中统一恢复偏好设置和下载状态
    - 添加恢复失败的错误处理
- ✅ 完善国际化支持
  - 问题：错误信息硬编码中文，不支持多语言
  - 修复：
    - 将所有错误信息添加到i18n文件
    - 使用参数化的错误信息支持动态内容
    - 添加英文和中文的完整翻译
- ✅ 第三轮审查发现并修复新问题
  - 问题1：UI消息类型混淆 - "已是最新版本"显示为红色错误
  - 问题2：嵌套状态修改冲突 - checkSpecificVersion与下载函数的状态冲突
  - 修复：
    - 引入downloadMessage类型系统（error/warning/info）
    - 修改checkSpecificVersion支持skipRestore参数
    - 区分错误信息和普通信息的UI显示
    - 解决嵌套状态修改的竞态条件
- ✅ 实施原子操作架构重构
  - 问题：两阶段调用导致electron-updater状态丢失
  - 根本原因：checkUpdate和startDownload之间的状态依赖性
  - 解决方案：实施单一原子操作API
  - 实施内容：
    - 添加UPDATE_DOWNLOAD_SPECIFIC_VERSION IPC事件
    - 后端实现原子操作：检查+下载+状态恢复
    - 前端简化为单一API调用
    - 彻底解决"Please check update first"错误
    - 消除状态丢失和竞态条件问题
- ✅ 修复关键逻辑缺陷
  - 问题：原子操作中缺少downloadUpdate()调用
  - 根本原因：错误假设autoDownload=true，实际为false
  - 后果：假性成功，用户等待永不开始的下载
  - 修复：添加手动downloadUpdate()调用和错误处理
  - 确保下载真正开始执行
- ✅ 修复最终审查发现的Bug
  - Bug1：状态接口不一致 - 移除废弃的downloadError字段
  - Bug2：后端返回值不一致 - 统一返回version字段
  - Bug3：状态重置时机问题 - 改进错误处理中的状态管理
  - 确保前后端数据结构完全一致
  - 所有构建测试通过
- ✅ 修复用户体验问题
  - 问题：版本被忽略时显示"已是最新版本"而非"版本被忽略"
  - 修复：添加reason字段区分不同情况
  - 改进：准确的用户消息显示
  - 结果：用户能正确理解版本状态
- ✅ 修复严重的竞态条件Bug
  - 问题：并发检查和状态设置之间存在巨大时间窗口
  - 影响：多个并发请求可能同时通过检查，导致状态混乱
  - 修复：立即设置isDownloadingUpdate状态锁
  - 确保：在所有早期返回路径中重置状态
- ✅ 修复运行时安全问题
  - 问题：API调用缺少存在性检查
  - 影响：preload脚本加载失败时导致运行时错误
  - 修复：添加API可用性检查
  - 保护：所有关键API调用都有安全检查
- ✅ 修复状态同步严重问题
  - 问题：原子操作没有设置state.isDownloading=true
  - 影响：UI显示错误，用户看不到"下载中"状态
  - 修复：下载开始时立即设置正确的UI状态
- ✅ 修复并发检查不完整问题
  - 问题：没有检查交叉下载（正式版vs预览版）
  - 影响：用户可能同时触发多个下载
  - 修复：完善并发检查，检查所有下载状态
- ✅ 解决API冲突风险
  - 问题：新旧下载API共存，可能冲突
  - 修复：弃用旧API，重定向到新的原子操作
  - 保持：向后兼容性
- ✅ 修复渠道切换配置问题
  - 问题1：autoUpdater实例配置不同步
    - 原因：只修改了磁盘配置，未直接设置autoUpdater属性
    - 影响：checkForUpdates()使用错误的渠道配置
  - 问题2：缺少allowDowngrade支持
    - 场景：从预览版(v2.0.0-beta.1)切换到正式版(v1.5.0)需要降级
    - 影响：降级操作会失败
  - 修复方案：
    - 直接配置autoUpdater.allowPrerelease和allowDowngrade
    - 保存和恢复autoUpdater实例的原始配置
    - 在finally块中确保配置恢复
    - 支持所有渠道切换场景（包括降级）
- ✅ 修复下载超时逻辑严重缺陷
  - 问题：await autoUpdater.downloadUpdate()等待整个下载完成
  - 影响：大文件下载超过30秒必然超时失败
  - 后果：UI显示错误但后台仍在下载，状态完全脱节
  - 修复：分离下载启动和完成，只等待启动不等待完成
  - 改进：添加异步错误处理，确保下载失败能正确通知UI
- ✅ 修复UI状态同步延迟问题
  - 问题：原子操作没有立即发送UI状态更新事件
  - 影响：用户点击下载后UI状态更新延迟，体验困惑
  - 修复：添加UPDATE_DOWNLOAD_STARTED事件立即同步UI
  - 改进：前端监听新事件，立即设置正确的下载状态
- ✅ 修复IPC事件常量缺失问题
  - 问题：preload.js中缺少新的IPC事件常量定义
  - 错误：Error processing argument at index 1, conversion failure from undefined
  - 原因：UPDATE_DOWNLOAD_SPECIFIC_VERSION和UPDATE_DOWNLOAD_STARTED未定义
  - 修复：在preload.js中添加缺失的IPC事件常量

---

## 重要发现

- 版本更新系统的核心问题是状态管理不一致
- 后端存储结构的局限性是根本原因
- 需要前后端协同修复才能彻底解决问题

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
- [ ] 完成后端存储结构改进
- [ ] 完成前端状态管理修复
- [ ] 完成UI逻辑优化
- [ ] 所有修复功能测试通过
- [ ] 完成相关文档更新
