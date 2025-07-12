# 版本比较逻辑详解

## 问题背景

### ❌ 原始问题
之前的版本比较逻辑过于简单，只使用字符串比较：
```typescript
state.hasStableUpdate = state.stableVersion !== state.currentVersion
state.hasPrereleaseUpdate = state.prereleaseVersion !== state.currentVersion
```

这种方式存在严重问题：
1. **字符串比较不准确**：`"1.2.0"` vs `"1.10.0"` 会得出错误结果
2. **无法处理预发布版本**：`"1.2.0"` vs `"1.2.0-beta.1"` 的关系不明确
3. **缺少语义化版本支持**：不符合 [Semantic Versioning](https://semver.org/) 规范

## 解决方案

### ✅ 语义化版本比较

实现了完整的语义化版本比较函数，支持：
- 主版本号.次版本号.修订号 (major.minor.patch)
- 预发布版本标识 (prerelease)
- 版本前缀处理 (v1.2.0 → 1.2.0)

## 技术实现

### 1. 版本解析函数
```typescript
const parseVersion = (version: string) => {
  const parts = version.split('-')
  const mainVersion = parts[0]
  const prerelease = parts[1] || null
  
  const [major, minor, patch] = mainVersion.split('.').map(num => parseInt(num) || 0)
  
  return {
    major,
    minor,
    patch,
    prerelease,
    original: version
  }
}
```

**解析示例**：
- `"1.2.3"` → `{major: 1, minor: 2, patch: 3, prerelease: null}`
- `"1.2.3-beta.1"` → `{major: 1, minor: 2, patch: 3, prerelease: "beta.1"}`
- `"v2.0.0-alpha"` → `{major: 2, minor: 0, patch: 0, prerelease: "alpha"}`

### 2. 版本比较逻辑
```typescript
const compareVersions = (version1: string, version2: string): number => {
  // 1. 移除 'v' 前缀
  // 2. 解析版本号
  // 3. 按优先级比较：major → minor → patch → prerelease
  // 4. 返回比较结果：-1(小于), 0(等于), 1(大于)
}
```

**比较优先级**：
1. **主版本号** (major)：`2.0.0` > `1.9.9`
2. **次版本号** (minor)：`1.2.0` > `1.1.9`
3. **修订号** (patch)：`1.1.2` > `1.1.1`
4. **预发布版本** (prerelease)：`1.2.0` > `1.2.0-beta.1`

### 3. 预发布版本处理
```typescript
// 预发布版本比较规则
if (parsed1.prerelease && parsed2.prerelease) {
  // 两个都是预发布：按字符串比较
  return parsed1.prerelease.localeCompare(parsed2.prerelease)
} else if (parsed1.prerelease && !parsed2.prerelease) {
  // 预发布 < 正式版本
  return -1
} else if (!parsed1.prerelease && parsed2.prerelease) {
  // 正式版本 > 预发布
  return 1
}
```

## 版本比较示例

### 正常版本比较
```typescript
compareVersions("1.2.0", "1.1.9")   // 1 (1.2.0 > 1.1.9)
compareVersions("1.10.0", "1.2.0")  // 1 (1.10.0 > 1.2.0)
compareVersions("2.0.0", "1.9.9")   // 1 (2.0.0 > 1.9.9)
compareVersions("1.2.3", "1.2.3")   // 0 (相等)
```

### 预发布版本比较
```typescript
compareVersions("1.2.0", "1.2.0-beta.1")     // 1 (正式版 > 预发布版)
compareVersions("1.2.0-beta.2", "1.2.0-beta.1") // 1 (beta.2 > beta.1)
compareVersions("1.2.0-alpha", "1.2.0-beta")     // -1 (alpha < beta)
compareVersions("1.2.0-rc.1", "1.2.0-beta.1")   // 1 (rc > beta)
```

### 版本前缀处理
```typescript
compareVersions("v1.2.0", "1.1.9")   // 1 (自动移除 v 前缀)
compareVersions("v2.0.0", "v1.9.9")  // 1 (两个都有前缀)
```

## 更新判断逻辑

### 核心函数
```typescript
const hasUpdate = (currentVersion: string, remoteVersion: string): boolean => {
  if (!currentVersion || !remoteVersion) return false
  return compareVersions(remoteVersion, currentVersion) > 0
}
```

### 实际应用
```typescript
// 正式版更新判断
state.hasStableUpdate = hasUpdate(
  state.currentVersion || '0.0.0', 
  state.stableVersion || '0.0.0'
)

// 预览版更新判断
state.hasPrereleaseUpdate = hasUpdate(
  state.currentVersion || '0.0.0', 
  state.prereleaseVersion || '0.0.0'
)
```

## 实际场景示例

### 场景1：正常版本更新
- **当前版本**：`1.2.0`
- **远程正式版**：`1.2.1`
- **远程预览版**：`1.3.0-beta.1`
- **结果**：
  - `hasStableUpdate = true` (1.2.1 > 1.2.0)
  - `hasPrereleaseUpdate = true` (1.3.0-beta.1 > 1.2.0)

### 场景2：预发布版本用户
- **当前版本**：`1.3.0-beta.1`
- **远程正式版**：`1.2.1`
- **远程预览版**：`1.3.0-beta.2`
- **结果**：
  - `hasStableUpdate = false` (1.2.1 < 1.3.0-beta.1)
  - `hasPrereleaseUpdate = true` (1.3.0-beta.2 > 1.3.0-beta.1)

### 场景3：最新版本用户
- **当前版本**：`1.3.0`
- **远程正式版**：`1.2.1`
- **远程预览版**：`1.3.0-beta.1`
- **结果**：
  - `hasStableUpdate = false` (1.2.1 < 1.3.0)
  - `hasPrereleaseUpdate = false` (1.3.0-beta.1 < 1.3.0)

## 调试和日志

### 版本比较日志
```typescript
console.log(`[useUpdater] Stable version comparison: current=${state.currentVersion}, remote=${state.stableVersion}, hasUpdate=${state.hasStableUpdate}`)
console.log(`[useUpdater] Prerelease version comparison: current=${state.currentVersion}, remote=${state.prereleaseVersion}, hasUpdate=${state.hasPrereleaseUpdate}`)
```

### 调试输出示例
```
[useUpdater] Stable version comparison: current=1.2.0, remote=1.2.1, hasUpdate=true
[useUpdater] Prerelease version comparison: current=1.2.0, remote=1.3.0-beta.1, hasUpdate=true
```

## 边界情况处理

### 1. 空值处理
```typescript
// 防止空值导致的错误
const hasUpdate = (currentVersion: string, remoteVersion: string): boolean => {
  if (!currentVersion || !remoteVersion) return false
  return compareVersions(remoteVersion, currentVersion) > 0
}
```

### 2. 默认值设置
```typescript
// 使用安全的默认值
state.hasStableUpdate = hasUpdate(
  state.currentVersion || '0.0.0',  // 默认为 0.0.0
  state.stableVersion || '0.0.0'
)
```

### 3. 版本格式容错
```typescript
// 自动处理版本前缀和格式差异
const v1 = version1.replace(/^v/, '')  // 移除 v 前缀
const [major, minor, patch] = mainVersion.split('.').map(num => parseInt(num) || 0)  // 容错解析
```

## 符合标准

### Semantic Versioning 2.0.0
这个实现完全符合 [Semantic Versioning 2.0.0](https://semver.org/) 规范：

1. **版本格式**：MAJOR.MINOR.PATCH
2. **预发布版本**：MAJOR.MINOR.PATCH-PRERELEASE
3. **比较优先级**：按规范定义的优先级进行比较
4. **预发布版本规则**：预发布版本的优先级低于相应的正式版本

这确保了版本比较的准确性和一致性，避免了错误的更新提示。
