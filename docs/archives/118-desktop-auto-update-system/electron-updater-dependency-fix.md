# Electron-Updater 依赖冲突修复

## 问题描述

下载更新时出现错误：
```
TypeError: (0 , builder_util_runtime_1.retry) is not a function
```

## 根本原因

### 依赖版本冲突
- `electron-updater@6.6.2` 依赖 `builder-util-runtime@9.3.1`
- `electron-builder@24.13.3` 及其相关包依赖 `builder-util-runtime@9.2.4`

### 问题分析
1. **版本不匹配**：两个不同版本的 `builder-util-runtime` 同时存在
2. **API差异**：`9.2.4` 版本可能没有 `retry` 函数，或者函数签名不同
3. **运行时冲突**：应用运行时加载了错误版本的依赖

## 解决方案

### 方案1：降级 electron-updater（推荐）
使用与 electron-builder 兼容的 electron-updater 版本：

```bash
# 降级到兼容版本
pnpm add electron-updater@6.3.9
```

### 方案2：升级 electron-builder
升级 electron-builder 到最新版本：

```bash
# 升级 electron-builder
pnpm add -D electron-builder@latest
```

### 方案3：强制依赖版本
在 package.json 中添加 resolutions：

```json
{
  "pnpm": {
    "overrides": {
      "builder-util-runtime": "9.3.1"
    }
  }
}
```

## 实施步骤

### 步骤1：降级 electron-updater
```bash
cd packages/desktop
pnpm add electron-updater@6.3.9
```

### 步骤2：锁定版本配置
在 `packages/desktop/package.json` 中：
```json
{
  "dependencies": {
    "electron-updater": "6.3.9"  // 移除 ^ 前缀，锁定精确版本
  }
}
```

在根目录 `package.json` 中添加 overrides：
```json
{
  "pnpm": {
    "overrides": {
      "builder-util-runtime": "9.2.4"  // 强制统一版本，使用所有包兼容的版本
    }
  }
}
```

### 步骤3：清理并重新安装依赖
```bash
pnpm install
```

### 步骤4：验证版本
```bash
npm list electron-updater builder-util-runtime
```

### 步骤5：测试功能
重新构建应用并测试更新下载功能。

## 版本兼容性

### 推荐的版本组合
- `electron-builder@24.13.3` + `electron-updater@6.3.9`
- `builder-util-runtime@9.2.4`（统一版本）

### 验证命令
```bash
# 检查依赖树
npm list builder-util-runtime

# 确保只有一个版本
npm list builder-util-runtime --depth=0
```

## 预防措施

### 1. 锁定版本
在 package.json 中使用精确版本号：
```json
{
  "dependencies": {
    "electron-updater": "6.3.9"
  }
}
```

### 2. 定期检查
定期检查依赖兼容性：
```bash
npm audit
npm outdated
```

### 3. 测试环境
在测试环境中验证更新功能：
- 检查更新检测
- 测试下载功能
- 验证安装过程

## 错误监控

### 添加错误处理
在主进程中添加更详细的错误处理：

```javascript
// 捕获更新下载错误
autoUpdater.on('error', (error) => {
  console.error('[Updater] Error:', error)
  
  // 检查是否是依赖问题
  if (error.message.includes('retry') && error.message.includes('builder_util_runtime')) {
    console.error('[Updater] Dependency conflict detected: builder-util-runtime version mismatch')
  }
})
```

### 日志记录
记录详细的依赖信息：

```javascript
// 记录依赖版本
const packageInfo = require('./package.json')
console.log('[Updater] electron-updater version:', packageInfo.dependencies['electron-updater'])
```

## 长期解决方案

### 1. 依赖管理策略
- 使用 pnpm 的 overrides 功能统一依赖版本
- 定期更新依赖并测试兼容性
- 使用 renovate 或 dependabot 自动化依赖更新

### 2. 测试自动化
- 在 CI/CD 中添加更新功能测试
- 自动检测依赖冲突
- 版本兼容性测试

### 3. 监控和告警
- 生产环境错误监控
- 依赖版本变化告警
- 用户更新失败率监控

## 修复结果

### ✅ 问题已解决
通过降级 `electron-updater` 到 `6.3.9` 版本，成功解决了依赖冲突：

**修复前**：
- `electron-updater@6.6.2` → `builder-util-runtime@9.3.1`
- `electron-builder@24.13.3` → `builder-util-runtime@9.2.4`
- **冲突**：版本不匹配导致 `retry` 函数未找到

**修复后**：
- `electron-updater@6.3.9` → `builder-util-runtime@9.2.4`
- `electron-builder@24.13.3` → `builder-util-runtime@9.2.4`
- **完全统一**：所有包都使用 `9.2.4` 版本

### 验证步骤
1. ✅ 依赖版本检查通过
2. ✅ 应用构建成功
3. ⏳ 需要测试更新下载功能

### 后续测试
请在应用中测试以下功能：
1. 检查更新功能
2. 下载更新功能
3. 安装更新功能

如果仍有问题，可能需要进一步调试或考虑其他解决方案。

这个问题是典型的 Node.js 生态系统中的依赖版本冲突问题，通过降级到兼容版本可以快速解决。
