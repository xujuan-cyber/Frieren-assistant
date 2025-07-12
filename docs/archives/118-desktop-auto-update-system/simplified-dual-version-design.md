# 简化的双版本显示设计

## 设计理念

基于用户反馈，采用更简单直接的设计方案：
- **同时显示**：总是检查并显示正式版和预览版（如果存在）
- **用户选择**：让用户直接看到所有选项，自主选择下载哪个版本
- **简化逻辑**：移除复杂的切换机制和条件检查

## 界面设计

### 新的布局结构
```
┌─────────────────────────────────────────┐
│ 当前版本: v1.2.0                        │
│                                         │
│ ┌─ 最新正式版 ─────────────────────────┐ │
│ │ 正式版 [有更新] v1.2.1 [GitHub][下载] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ 最新预览版 ─────────────────────────┐ │
│ │ 预览版 [有更新] v1.3.0-beta.1 [GitHub][下载] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [关闭] [检查更新]                        │
└─────────────────────────────────────────┘
```

### 视觉设计特点
- **正式版**：绿色主题，表示稳定可靠
- **预览版**：橙色主题，表示新功能但可能不稳定
- **更新标识**：蓝色"有更新"标签，清楚标识哪些版本有更新
- **独立操作**：每个版本都有独立的GitHub链接和下载按钮

## 技术实现

### 数据结构简化
```typescript
export interface UpdaterState {
  // 移除复杂的切换相关字段
  // currentViewMode, remoteVersion, remoteReleaseUrl
  
  // 简化为直接的版本信息
  stableVersion: string | null
  stableReleaseUrl: string | null
  prereleaseVersion: string | null
  prereleaseReleaseUrl: string | null
  hasStableUpdate: boolean
  hasPrereleaseUpdate: boolean
  currentVersion: string | null
}
```

### 检查逻辑简化
```typescript
// 总是同时检查两种版本
const stableResult = await checkSpecificVersion(false)
const prereleaseResult = await checkSpecificVersion(true)

// 直接保存结果，无需复杂的切换逻辑
state.stableVersion = stableResult?.remoteVersion
state.prereleaseVersion = prereleaseResult?.remoteVersion
state.hasStableUpdate = state.stableVersion !== state.currentVersion
state.hasPrereleaseUpdate = state.prereleaseVersion !== state.currentVersion
```

### 下载逻辑分离
```typescript
// 分别处理两种版本的下载
const downloadStableVersion = async () => {
  await setPreference('updater.allowPrerelease', false)
  await startDownload()
}

const downloadPrereleaseVersion = async () => {
  await setPreference('updater.allowPrerelease', true)
  await startDownload()
}
```

## 用户体验改进

### 1. 信息透明化
- **一目了然**：用户可以同时看到所有可用版本
- **清楚标识**：每个版本的类型和更新状态都有明确标识
- **独立操作**：每个版本都有独立的操作按钮

### 2. 操作简化
- **无需切换**：不需要在不同模式间切换
- **直接选择**：用户可以直接选择想要的版本
- **减少困惑**：避免了复杂的状态管理和切换逻辑

### 3. 视觉优化
- **颜色区分**：正式版绿色，预览版橙色，易于区分
- **状态清晰**：更新状态用蓝色标签明确标识
- **布局整洁**：每个版本独立的卡片式布局

## 功能对比

### 旧设计 vs 新设计

| 特性 | 旧设计（切换模式） | 新设计（同时显示） |
|------|------------------|------------------|
| 版本显示 | 单一版本，需切换查看 | 同时显示两个版本 |
| 用户操作 | 切换 → 查看 → 下载 | 直接选择下载 |
| 界面复杂度 | 较复杂（切换按钮、状态管理） | 简单（直接显示） |
| 认知负担 | 需要理解切换概念 | 直观，无需学习 |
| 代码复杂度 | 高（状态切换逻辑） | 低（直接显示逻辑） |

## 移除的复杂功能

### 1. 版本切换机制
- 移除 `currentViewMode` 状态
- 移除 `switchViewMode` 函数
- 移除切换按钮和相关逻辑

### 2. 条件检查逻辑
- 移除基于用户设置的条件检查
- 简化为总是检查两种版本
- 移除复杂的状态覆盖保护

### 3. 显示模式管理
- 移除 `updateDisplayForCurrentMode` 函数
- 移除 `remoteVersion` 和 `remoteReleaseUrl` 字段
- 简化状态管理逻辑

## 保留的核心功能

### 1. 版本检查
- 保持双重版本检查能力
- 保持开发环境检测
- 保持错误处理机制

### 2. 下载功能
- 保持分别下载不同版本的能力
- 保持下载进度显示
- 保持安装和重启功能

### 3. 用户设置
- 保持"接收预览版更新"设置（用于其他功能）
- 保持版本忽略功能
- 保持偏好设置存储

## 实现优势

### 1. 代码简化
- 减少约40%的状态管理代码
- 移除复杂的切换逻辑
- 简化UI组件结构

### 2. 维护性提升
- 减少状态同步问题
- 降低bug出现概率
- 简化测试场景

### 3. 用户体验优化
- 减少学习成本
- 提高操作效率
- 降低使用门槛

## 后续优化建议

### 1. 性能优化
- 考虑缓存版本检查结果
- 优化网络请求频率
- 实现增量更新检查

### 2. 功能增强
- 添加版本变更日志显示
- 实现版本比较功能
- 添加自动更新选项

### 3. 用户体验
- 添加版本推荐逻辑
- 实现智能下载建议
- 优化错误提示信息

这个简化设计大大降低了复杂度，同时提供了更直观的用户体验，是一个更好的解决方案。
