# "接收预览版更新"功能机制详解

## 功能概述

"接收预览版更新"是一个用户设置开关，控制应用是否检查和显示预览版本的更新。

## 问题发现

### ❌ 原始问题
在实现双版本显示功能时，发现"接收预览版更新"开关**失效**了：
- 无论用户是否开启此设置，都会检查预览版
- 开关只是装饰，不影响实际行为
- 用户设置被完全忽略

### 🔍 根本原因
新的双版本检查逻辑总是同时检查两种版本：
```typescript
// 错误的实现：忽略用户设置
const stableResult = await checkSpecificVersion(false)      // 总是检查正式版
const prereleaseResult = await checkSpecificVersion(true)   // 总是检查预览版
```

## 修复后的工作机制

### 1. 设置存储和读取

**保存设置**：
```typescript
const togglePrerelease = async () => {
  const newValue = !state.allowPrerelease
  await setPreference('updater.allowPrerelease', newValue)  // 保存到本地存储
  state.allowPrerelease = newValue
}
```

**读取设置**：
```typescript
// 应用启动时从本地存储读取
const allowPrerelease = await getPreference('updater.allowPrerelease', false)
state.allowPrerelease = allowPrerelease
```

### 2. 条件检查逻辑

**修复后的检查逻辑**：
```typescript
// 总是检查正式版
const stableResult = await checkSpecificVersion(false)

// 根据用户设置决定是否检查预览版
let prereleaseResult = null
if (state.allowPrerelease) {
  prereleaseResult = await checkSpecificVersion(true)
} else {
  // 用户禁用时清空预览版信息
  state.prereleaseVersion = null
  state.prereleaseReleaseUrl = null
}
```

### 3. UI交互逻辑

**版本切换按钮显示**：
```vue
<!-- 只有在启用预览版或当前正在查看预览版时才显示切换按钮 -->
<button v-if="state.allowPrerelease || state.currentViewMode === 'prerelease'">
  切换版本
</button>
```

**切换限制**：
```typescript
const switchViewMode = async () => {
  // 如果要切换到预览版，但用户禁用了预览版，则不允许切换
  if (state.currentViewMode === 'stable' && !state.allowPrerelease) {
    return
  }
  // 执行切换...
}
```

### 4. 设置变更响应

**自动切换视图**：
```typescript
// 如果禁用预览版且当前正在查看预览版，切换回正式版
if (!newValue && state.currentViewMode === 'prerelease') {
  state.currentViewMode = 'stable'
}
```

**重新检查更新**：
```typescript
// 设置改变后，重新检查更新以应用新设置
if (!state.isCheckingUpdate) {
  await checkUpdate()
}
```

## 完整的用户体验流程

### 场景1：启用预览版更新

1. **用户操作**：开启"接收预览版更新"开关
2. **系统响应**：
   - 保存设置到本地存储
   - 自动重新检查更新
   - 检查正式版和预览版
   - 显示版本切换按钮
   - 用户可以在两种版本间切换查看

### 场景2：禁用预览版更新

1. **用户操作**：关闭"接收预览版更新"开关
2. **系统响应**：
   - 保存设置到本地存储
   - 如果当前正在查看预览版，自动切换回正式版
   - 清空预览版信息
   - 隐藏版本切换按钮
   - 只检查和显示正式版

### 场景3：应用重启

1. **系统行为**：
   - 从本地存储读取用户设置
   - 根据设置决定检查哪些版本
   - 恢复用户的偏好设置

## 技术实现细节

### 存储机制
- **存储位置**：本地偏好设置存储
- **存储键**：`updater.allowPrerelease`
- **默认值**：`false`（默认只接收正式版）

### 状态管理
- **响应式状态**：`state.allowPrerelease`
- **持久化**：每次变更都保存到本地存储
- **同步**：UI状态与存储状态保持同步

### 网络优化
- **条件请求**：只在需要时检查预览版
- **减少请求**：禁用预览版时不发起预览版检查
- **缓存清理**：禁用时清空预览版缓存信息

## 用户界面状态

### 开关状态指示
- **开启**：✅ 接收预览版更新
- **关闭**：❌ 接收预览版更新

### 版本显示逻辑
- **仅正式版**：只显示正式版信息，无切换按钮
- **正式版+预览版**：显示当前查看的版本，提供切换按钮

### 按钮可见性
- **切换按钮**：仅在启用预览版时显示
- **下载按钮**：根据当前查看的版本类型显示对应的下载选项

## 兼容性考虑

### 向后兼容
- 保持原有的设置键名
- 默认行为与原版本一致
- 现有用户设置不受影响

### 错误处理
- 设置读取失败时使用默认值
- 网络错误时保持当前设置状态
- 存储失败时显示错误提示

## 测试场景

### 功能测试
1. 开关切换是否正确保存和读取
2. 版本检查是否遵循用户设置
3. UI显示是否与设置状态一致
4. 应用重启后设置是否保持

### 边界测试
1. 网络异常时的行为
2. 存储失败时的处理
3. 快速切换开关的响应
4. 并发检查更新的处理

这个机制确保了用户对预览版更新的完全控制权，同时提供了流畅的用户体验。
