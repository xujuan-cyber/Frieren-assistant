# Desktop IPC 修复与架构分析

## 📝 归档说明

- **任务名称**: Desktop IPC 修复与架构分析
- **完成日期**: 2025-07-03
- **核心问题**: Desktop 版本中 `BuiltinTemplateLanguageSwitch` 组件因服务未初始化和方法不存在而出错。

## 🔍 根本原因分析

### 1. 架构差异
- **Web环境（单进程）**: 可直接调用服务实例
- **Desktop环境（多进程）**: 必须通过IPC进行进程间通信

### 2. 契约缺失
- `ITemplateManager` 接口中缺少语言切换相关方法
- 导致代理类无法转发调用
- 接口定义与实际需求不匹配

### 3. 实现不完整
- ElectronTemplateManagerProxy 缺少必要的方法实现
- preload.js 和 main.js 中缺少完整的IPC通信链路

## 🛠️ 解决方案

### 1. 接口完善
在 `ITemplateManager` 接口中补充缺失的方法定义：
```typescript
export interface ITemplateManager {
  // 现有方法...
  
  // 新增语言切换相关方法
  getCurrentLanguage(): Promise<BuiltinTemplateLanguage>;
  setLanguage(language: BuiltinTemplateLanguage): Promise<void>;
  toggleLanguage(): Promise<BuiltinTemplateLanguage>;
  getSupportedLanguages(): Promise<BuiltinTemplateLanguage[]>;
}
```

### 2. 代理类修正
修正 `ElectronTemplateManagerProxy`，使其通过IPC正确转发调用：
```typescript
export class ElectronTemplateManagerProxy implements ITemplateManager {
  // 缓存同步方法的结果
  private cache = new Map<string, any>();
  
  async getCurrentLanguage(): Promise<BuiltinTemplateLanguage> {
    return await this.electronAPI.getCurrentLanguage();
  }
  
  async setLanguage(language: BuiltinTemplateLanguage): Promise<void> {
    await this.electronAPI.setLanguage(language);
    // 清除相关缓存
    this.cache.delete('currentLanguage');
  }
  
  // 其他方法实现...
}
```

### 3. IPC通信链路完善
在 `preload.js` 中添加IPC方法：
```javascript
// preload.js
const electronAPI = {
  // 现有方法...
  
  // 新增语言切换IPC方法
  getCurrentLanguage: () => ipcRenderer.invoke('template-getCurrentLanguage'),
  setLanguage: (language) => ipcRenderer.invoke('template-setLanguage', language),
  toggleLanguage: () => ipcRenderer.invoke('template-toggleLanguage'),
  getSupportedLanguages: () => ipcRenderer.invoke('template-getSupportedLanguages'),
};
```

在 `main.js` 中添加IPC处理器：
```javascript
// main.js
ipcMain.handle('template-getCurrentLanguage', async () => {
  try {
    const result = await templateManager.getCurrentLanguage();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 其他处理器...
```

## 💡 经验总结

### 接口驱动开发
- **原则**: 所有跨模块、跨进程的调用都应依赖于接口（契约），而不是具体实现
- **好处**: 确保不同环境下的实现一致性
- **实践**: 先定义接口，再实现具体功能

### 代理模式规范
- **原则**: IPC代理类应严格遵守接口，只做转发，不实现业务逻辑
- **好处**: 保持架构清晰，避免逻辑分散
- **实践**: 代理类只负责IPC调用和错误处理

### 环境差异处理
- **原则**: 必须充分考虑Web和Desktop环境的架构差异（单/多进程）
- **避免**: 依赖特定环境的"捷径"实现
- **实践**: 设计时优先考虑最复杂环境的需求

## 🔧 架构检查清单

### IPC接口完整性
- [ ] 接口中是否定义了所有需要的方法？
- [ ] 方法签名是否与实际需求匹配？
- [ ] 是否考虑了异步调用的需求？

### 代理类实现
- [ ] 代理类是否实现了接口的所有方法？
- [ ] 是否正确处理了IPC调用的异步性？
- [ ] 是否有适当的错误处理机制？

### IPC通信链路
- [ ] preload.js中是否有对应的IPC方法？
- [ ] main.js中是否有对应的IPC处理器？
- [ ] IPC调用是否使用统一的错误处理格式？

### 环境兼容性
- [ ] Web和Desktop环境是否使用相同的接口？
- [ ] 是否避免了环境特定的实现依赖？
- [ ] 是否有适当的环境检测和适配机制？

这次修复为后续的跨环境架构设计提供了重要的经验和规范。
