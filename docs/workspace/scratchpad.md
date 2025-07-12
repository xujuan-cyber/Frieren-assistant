# 开发草稿本

记录当前开发任务的进展和思考。

## 当前任务

### 存储键架构重构与一致性优化 - 2025-01-08
**目标**: 解决存储键使用不一致导致的数据导出不完整问题，统一存储架构设计
**状态**: 代码完成，文档整理中

#### 计划步骤
[x] 1. 问题分析与根因定位
    - 预期结果：识别存储键不一致的具体问题
    - 风险评估：可能影响用户数据导出功能
[x] 2. 架构设计优化
    - 预期结果：统一存储键管理方式，简化过度设计
    - 风险评估：需要保持向后兼容性
[x] 3. 代码实现与修复
    - 预期结果：修复DataManager导出逻辑，统一PreferenceService使用
    - 风险评估：需要更新所有相关文件和测试
[x] 4. 测试文件更新
    - 预期结果：所有测试通过，API变更得到验证
    - 风险评估：测试覆盖可能不完整
[ ] 5. 文档整理与评审
    - 预期结果：完整的架构文档和变更记录
    - 风险评估：文档可能遗漏重要细节

#### 进展记录
- 2025-01-08 识别问题：用户导出JSON只有4个设置项而不是8个
- 2025-01-08 发现根因：存储键物理存储与逻辑键名不一致
- 2025-01-08 完成架构重构：统一PreferenceService，移除过度设计
- 2025-01-08 更新所有相关文件：工厂函数、测试、应用初始化
- 2025-01-08 创建架构文档：storage-key-architecture.md和重构总结
- 2025-01-08 架构优化：PreferenceService提供getAll()批量接口，统一Manager模式
- 2025-01-08 重大架构重构：实现IImportExportable接口，DataManager改为协调者模式
- 2025-01-08 简化设计：移除registerService过度设计，改为构造函数注入
- 2025-01-08 修正破坏性更新：恢复字符串接口，保持向后兼容性
- 2025-01-08 发现问题：原DataManager仍在使用，新的DataCoordinator是重复实现
- 2025-01-08 重构完成：清理DataManager中的具体实现，改为调用各服务的exportData/importData接口
- 2025-01-08 修复编译错误：删除过度设计的验证函数，解决循环依赖问题
- 2025-01-08 完善向后兼容性：在PreferenceService中处理旧版本键名转换，删除不需要的storage参数
- 2025-01-08 统一存储键管理：删除UI包重复定义，统一使用Core包作为唯一数据源
- 2025-01-08 修复导入导出功能缺失：参考manager.backup.ts恢复原有的健壮逻辑
- 2025-01-08 清理无用代码：删除TemplateManager从未使用的config配置
- 2025-01-08 完成测试用例：为各服务的导入导出功能编写完整的单元测试和集成测试

#### 重要发现
- 存储键有两种用途：物理存储键vs逻辑JSON键，需要明确映射关系
- TemplateManager的storageKey配置是过度设计，实际从未使用
- PreferenceService不仅管理UI设置，也应管理所有用户偏好（如内置模板语言）
- DataManager需要区分不同存储方式来正确获取数据
- PreferenceService应该提供批量接口，保持与其他Manager的架构一致性
- DataManager职责过重，应该抽象IImportExportable接口，让各服务自己负责导入导出实现
- registerService/unregisterService是过度设计，应用中的服务是固定的，直接构造函数注入更简单
- 避免破坏性更新，保持现有接口的向后兼容性，特别是字符串vs对象的接口变更

---

## 技术细节分析

### 存储键架构分析

#### Core与UI层storage-keys.ts的关系
```typescript
// packages/ui/src/constants/storage-keys.ts - UI层常量定义
export const UI_SETTINGS_KEYS = {
  THEME_ID: 'app:settings:ui:theme-id',
  PREFERRED_LANGUAGE: 'app:settings:ui:preferred-language',
  BUILTIN_TEMPLATE_LANGUAGE: 'app:settings:ui:builtin-template-language',
} as const

// packages/core/src/constants/storage-keys.ts - Core层常量定义
export const UI_SETTINGS_KEYS = {
  // 与UI包保持同步的相同定义
} as const

export const CORE_SERVICE_KEYS = {
  MODELS: 'models',
  USER_TEMPLATES: 'user-templates',
  PROMPT_HISTORY: 'prompt_history',
} as const
```

**关系说明**：
- UI层定义用户界面相关的存储键
- Core层同步UI层定义，并添加核心服务存储键
- 两层保持同步，避免不一致

#### 配置项的存储与导入导出流程

**1. 用户偏好设置的存储流程**：
```
用户操作 → UI组件 → usePreferences → PreferenceService → 物理存储
例如：切换主题 → ThemeToggleUI.vue → setPreference('app:settings:ui:theme-id', 'dark')
     → PreferenceService.set() → 存储为 'pref:app:settings:ui:theme-id'
```

**2. 配置项的导出流程（优化后）**：
```
DataManager.exportAllData() → PreferenceService.getAll() → 获取所有偏好设置
→ 以逻辑键名写入JSON
例如：preferenceService.getAll() → {"app:settings:ui:theme-id": "dark", ...}
     → 直接写入JSON userSettings字段
```

**3. 配置项的导入流程（优化后）**：
```
JSON解析 → 标准化键名 → 统一通过PreferenceService存储
例如：{"app:settings:ui:theme-id": "dark"} → 标准化键名
     → preferenceService.set('app:settings:ui:theme-id', 'dark')
```

#### 核心服务数据的存储与导入导出

**1. 模型数据存储流程**：
```
ModelManager → 直接使用StorageProvider → 物理存储
例如：modelManager.addModel() → storage.setItem('models', JSON.stringify(models))
```

**2. 模型数据导出流程**：
```
DataManager.exportAllData() → modelManager.getAllModels() → 获取所有模型配置
→ 写入JSON的models字段
```

**3. 模型数据导入流程**：
```
JSON解析 → 提取models数组 → 逐个验证和导入 → modelManager.addModel()
→ 最终存储到 'models' 键
```

**核心差异**：
- **用户偏好**：通过PreferenceService，带前缀存储，提供getAll()批量接口
- **核心数据**：直接存储，无前缀，各服务提供getAllXxx()批量接口

**架构一致性**：
- ModelManager.getAllModels() → 返回所有模型配置
- TemplateManager.listTemplates() → 返回所有用户模板
- HistoryManager.getAllRecords() → 返回所有历史记录
- PreferenceService.getAll() → 返回所有用户偏好设置

---

## 架构改进总结

### 修改的文件清单
1. **Core层**：
   - `services/template/types.ts` - 移除storageKey配置
   - `services/template/manager.ts` - 直接使用常量
   - `services/template/languageService.ts` - 使用PreferenceService
   - `services/data/manager.ts` - 统一存储键分类
   - `constants/storage-keys.ts` - 新增常量文件

2. **UI层**：
   - `composables/useAppInitializer.ts` - 更新服务创建
   - `constants/storage-keys.ts` - 添加核心服务键

3. **Desktop层**：
   - `main.js` - 更新服务创建参数

4. **测试层**：
   - `template/languageService.test.ts` - 更新API调用
   - `template/manager.test.ts` - 添加PreferenceService依赖

### 向后兼容性保证
- LEGACY_KEY_MAPPING确保旧版本键名自动转换
- 数据导入时自动识别和转换格式
- 用户数据不会丢失

---

## 问题记录

### 已解决
- 用户导出JSON缺少设置项 - 修复DataManager存储键获取逻辑 - 2025-01-08
- 存储键使用不一致 - 统一使用PreferenceService管理用户偏好 - 2025-01-08
- TemplateManager过度设计 - 移除不必要的storageKey配置 - 2025-01-08

---

## 备注
- 任务代码已完成，需要用户评审架构设计和实现细节
- 重点关注存储键的两种用途映射关系是否清晰
- 确认核心服务数据与用户偏好数据的处理方式区分是否合理
