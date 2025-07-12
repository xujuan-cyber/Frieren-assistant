# 经验总结

## 技术经验

### 多形态产品架构设计
- **环境检测**: 使用isRunningInElectron()进行运行时环境检测
- **条件渲染**: UI组件需要根据环境条件渲染，确保功能隔离
- **服务代理模式**: Electron环境使用代理服务，Web环境使用真实服务

## 问题解决

### 跨环境功能隔离
- **问题**: 桌面端特有功能(如自动更新)不应在web/extension环境中显示
- **解决方案**:
  - 在组件层面使用v-if="isRunningInElectron()"进行条件渲染
  - 在composable层面进行环境检测，避免非Electron环境的API调用
  - 确保功能对其他环境完全透明

## 最佳实践

### 环境感知的组件设计
```vue
<template>
  <!-- 仅在Electron环境中显示更新相关UI -->
  <UpdaterIcon v-if="isElectronEnvironment" />
</template>

<script setup>
import { isRunningInElectron } from '@prompt-optimizer/core'
const isElectronEnvironment = isRunningInElectron()
</script>
```

### 环境感知的Composable设计
```typescript
export function useUpdater() {
  // 环境检测
  if (!isRunningInElectron()) {
    return {
      // 返回空的状态和方法，确保API一致性
      state: reactive({ hasUpdate: false }),
      checkUpdate: () => Promise.resolve(),
      // ...
    }
  }

  // Electron环境的实际实现
  // ...
}
```

## 避坑指南

### 避免功能泄漏
- **不要**: 在非目标环境中暴露特定功能的UI或API
- **要做**: 始终进行环境检测，确保功能隔离
- **验证**: 在所有环境中测试，确保不相关功能不可见
