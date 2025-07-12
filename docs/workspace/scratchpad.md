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
  - 原因：checkSpecificVersion返回的数据格式验证不充分
  - 修复：添加了对checkResult.success和updateInfo的验证
  - 确保只有在获得有效更新信息后才开始下载

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
