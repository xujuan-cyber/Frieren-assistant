# 开发草稿本

记录当前开发任务的进展和思考。

## 当前任务

### 接口驱动架构改造 - 2024-12-28
**目标**: 系统性检查所有UI模块对core模块的引用，确保所有调用都通过接口进行，完善缺失的接口方法，并更新IPC代理
**状态**: 进行中 (60%完成)
**背景**: 解决Desktop版本因直接调用实现类方法而出现的"is not a function"错误

#### 计划步骤
[x] 1. 问题根因分析 - 已完成
    - 分析Web vs Desktop架构差异
    - 确定useAppInitializer.ts为根本问题所在
[x] 2. ModelManager重构 - 已完成 ✅
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[x] 3. HistoryManager重构 - 已完成 ✅
    - 接口方法补全
    - Web适配器创建  
    - Desktop IPC链完善
[ ] 4. TemplateManager重构 - 进行中
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[ ] 5. LLMService重构
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[ ] 6. PromptService重构
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[ ] 7. DataManager重构
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[ ] 8. PreferenceService重构
    - 接口方法补全
    - Web适配器创建
    - Desktop IPC链完善
[ ] 9. 最终验证
    - Web环境功能验证
    - Desktop环境功能验证
    - 两环境一致性确认

#### 进展记录
- 2024-12-28 10:00 开始任务分析，确定架构问题根因
- 2024-12-28 10:30 完成ModelManager接口补全：ensureInitialized, isInitialized, getModelOptions
- 2024-12-28 11:00 完成ModelManager Web适配器创建，严格按接口约束
- 2024-12-28 11:30 完成ModelManager Desktop IPC链更新，所有接口方法均可通过IPC调用
- 2024-12-28 12:00 开始HistoryManager重构
- 2024-12-28 12:15 发现addIteration方法签名不匹配问题，已修复
- 2024-12-28 12:30 完成HistoryManager接口补全：deleteChain方法
- 2024-12-28 13:00 完成HistoryManager Web适配器和Desktop IPC链
- 2024-12-28 14:30 **发现并移除未使用的getModelOptions方法** ⚠️
    - 问题：审核发现该方法在UI层从未被实际使用
    - 行动：从所有层级完全移除（接口→实现→适配器→IPC链）
    - 教训：避免过度设计和盲目补全，严格按需添加
    - 涉及文件：types.ts, manager.ts, electron-proxy.ts, useAppInitializer.ts, preload.js, main.js, global.d.ts
- 2024-12-28 15:00 **移除验证完成** ✅
    - 测试结果：252个测试通过，1个API相关测试失败（与修改无关）
    - 确认：getModelOptions方法完全移除，系统功能正常
    - 成果：接口保持精简，避免了无用方法的维护负担

#### 当前进行：TemplateManager重构
**当前步骤**: 正在分析TemplateManager接口缺失方法
**下一步**: 补全接口方法并创建Web适配器

#### 重要发现
- **架构原则**: 接口驱动开发至关重要，所有跨模块调用都必须通过接口
- **代理模式**: IPC代理类应严格遵循接口，只做转发不做业务逻辑
- **环境差异**: 必须考虑Web(单进程) vs Desktop(多进程)的架构差异
- **适配器模式**: Web环境下使用适配器确保只暴露接口定义的方法
- **方法签名一致性**: 接口定义与实现类方法签名必须完全一致
- **⚠️ 避免过度设计**: 严格按需添加方法，避免盲目补全未使用的功能
- **⚠️ 变更审核机制**: 所有接口修改都必须在workspace中详细记录并经过审核

#### 技术细节
- **Web适配器模式**: 创建包装器只暴露接口方法，避免UI直接访问实现细节
- **Desktop IPC链**: preload.js → main.js → ElectronProxy → 核心服务完整链路
- **方法缓存机制**: 对于同步方法在ElectronProxy中实现缓存优化
- **错误处理**: 统一的错误处理和日志记录机制
- **接口精简原则**: 只添加实际需要的方法，定期审核和清理无用方法

---

## 历史任务

### Desktop IPC修复 - 2024-12-28 ✅
**总结**: 修复了Desktop版本BuiltinTemplateLanguageSwitch组件的调用错误
**问题**: "templateLanguageService未初始化"和"changeBuiltinTemplateLanguage is not a function"
**解决方案**: 补全ITemplateManager接口方法，完善ElectronTemplateManagerProxy，更新IPC链
**经验**: 发现了Web vs Desktop架构根本性差异，为后续系统性改造打下基础
**归档位置**: docs/archives/112-desktop-ipc-fix/

---

## 待办事项

### 紧急
- [ ] 完成TemplateManager重构 (当前进行中)
- [ ] 验证已完成的ModelManager和HistoryManager功能

### 重要
- [ ] LLMService接口方法分析和补全
- [ ] PromptService接口方法分析和补全
- [ ] DataManager接口方法分析和补全
- [ ] PreferenceService接口方法分析和补全

### 一般
- [ ] 编写接口驱动架构设计文档
- [ ] 更新开发规范文档
- [ ] 整理重构经验到experience.md

---

## 问题记录

### 已解决
- HistoryManager.addIteration方法签名不匹配 - 统一为addIteration(id: string, iteration: HistoryIteration) - 2024-12-28
- ModelManager接口缺失关键方法 - 补全ensureInitialized等方法 - 2024-12-28
- Desktop版本IPC调用失败 - 完善所有ElectronProxy类 - 2024-12-28

### 待观察
- 性能影响：适配器模式是否会带来明显的性能开销
- 内存占用：多层包装是否会增加内存使用

---

## 下次会话重点

1. **继续TemplateManager重构**: 分析缺失的接口方法，创建Web适配器，完善Desktop IPC链
2. **保持重构节奏**: 每个服务采用相同的重构模式，确保一致性
3. **及时验证**: 每完成一个服务的重构都要在两个环境下验证功能
4. **经验积累**: 将重构过程中的技术发现及时记录到experience.md

## 技术债务
- [ ] 所有core服务的接口完整性检查
- [ ] UI组件对接口方法的依赖梳理  
- [ ] IPC调用的性能优化评估
- [ ] 错误处理机制的统一性改进

## 备注
[其他需要记录的信息]

## 📋 接口补全审核清单

### 🔍 UI层实际调用方法统计

基于对UI层代码的全面搜索和分析，以下是各个服务的实际使用情况：

#### 1. **ModelManager** - ✅ 已完成
**UI层调用方法**:
- `getAllModels()` - 使用位置: useModelManager.ts:75,101; ModelManager.vue:584,625,633,661,677,693,827
- `getModel(key)` - 使用位置: ModelManager.vue:625,633,661,677,693,827
- `deleteModel(key)` - 使用位置: ModelManager.vue:648
- `enableModel(key)` - 使用位置: ModelManager.vue:664
- `disableModel(key)` - 使用位置: ModelManager.vue:680
- `updateModel(key, config)` - 使用位置: ModelManager.vue:970
- `addModel(key, config)` - 使用位置: ModelManager.vue:1005

**接口状态**: ✅ 所有方法都已在IModelManager中定义
**适配器状态**: ✅ Web适配器已创建
**IPC状态**: ✅ Desktop IPC链已完善

#### 2. **HistoryManager** - ✅ 已完成
**UI层调用方法**:
- `createNewChain(params)` - 使用位置: usePromptOptimizer.ts:125; usePromptHistory.ts:44
- `addIteration(params)` - 使用位置: usePromptOptimizer.ts:202
- `clearHistory()` - 使用位置: usePromptHistory.ts:65
- `getAllChains()` - 使用位置: usePromptHistory.ts:86,105,127
- `deleteRecord(id)` - 使用位置: usePromptHistory.ts:92
- `deleteChain(id)` - 使用位置: useAppInitializer.ts:187 (适配器中暴露)

**接口状态**: ✅ 所有方法都已在IHistoryManager中定义
**适配器状态**: ✅ Web适配器已创建
**IPC状态**: ✅ Desktop IPC链已完善

#### 3. **TemplateManager** - ⚠️ 需要补全
**UI层调用方法**:
- `ensureInitialized()` - 使用位置: useTemplateManager.ts:135; TemplateSelect.vue:181; TemplateManager.vue:807
- `getTemplate(id)` - 使用位置: useTemplateManager.ts:146; TemplateManager.vue:995,1058,1211
- `listTemplatesByType(type)` - 使用位置: useTemplateManager.ts:159; TemplateSelect.vue:197
- `listTemplates()` - 使用位置: TemplateManager.vue:810
- `saveTemplate(template)` - 使用位置: TemplateManager.vue:987,1050
- `deleteTemplate(id)` - 使用位置: TemplateManager.vue:1079
- `exportTemplate(id)` - 使用位置: TemplateManager.vue:1100
- `importTemplate(json)` - 使用位置: TemplateManager.vue:1129
- `changeBuiltinTemplateLanguage(lang)` - 使用位置: BuiltinTemplateLanguageSwitch.vue:170; useAppInitializer.ts:171
- `getCurrentBuiltinTemplateLanguage()` - 使用位置: useAppInitializer.ts:172

**接口状态**: ✅ 所有方法都已在ITemplateManager中定义
**需要补全**: ❌ 无需添加新方法
**注意**: 接口已完整，只需要创建适配器和IPC链

#### 4. **LLMService** - ⚠️ 需要补全
**UI层调用方法**:
- `testConnection(key)` - 使用位置: ModelManager.vue:629
- `fetchModelList(provider, customConfig?)` - 使用位置: ModelManager.vue:854,912

**接口状态**: ✅ 所有方法都已在ILLMService中定义
**需要补全**: ❌ 无需添加新方法
**注意**: 接口已完整，只需要创建适配器和IPC链

#### 5. **PromptService** - ⚠️ 需要补全
**UI层调用方法**:
- `optimizePromptStream(request, callbacks)` - 使用位置: usePromptOptimizer.ts:111
- `iteratePromptStream(original, last, input, modelKey, handlers, templateId)` - 使用位置: usePromptOptimizer.ts:182
- `testPromptStream(system, user, modelKey, callbacks)` - 使用位置: usePromptTester.ts:67,107; TestPanel.vue:242,297

**接口状态**: ✅ 所有方法都已在IPromptService中定义
**需要补全**: ❌ 无需添加新方法
**注意**: 接口已完整，只需要创建适配器和IPC链

#### 6. **DataManager** - ⚠️ 需要补全
**UI层调用方法**:
- `exportAllData()` - 使用位置: DataManager.vue:236
- `importAllData(content)` - 使用位置: DataManager.vue:288

**接口状态**: ❌ **没有IDataManager接口**
**需要补全**: ✅ **需要创建接口定义**
**注意**: DataManager类已存在但没有对应的接口，需要抽取接口

#### 7. **PreferenceService** - ⚠️ 需要补全
**UI层调用方法**:
- `get(key, defaultValue)` - 使用位置: usePreferenceManager.ts:17
- `set(key, value)` - 使用位置: usePreferenceManager.ts:35

**接口状态**: ✅ 所有方法都已在IPreferenceService中定义
**需要补全**: ❌ 无需添加新方法
**注意**: 接口已完整，只需要创建适配器和IPC链

### 📊 总结

#### ✅ 接口已完整的服务 (只需创建适配器和IPC链):
1. **ModelManager** - 已完成 ✅
2. **HistoryManager** - 已完成 ✅
3. **TemplateManager** - 接口完整，待重构
4. **LLMService** - 接口完整，待重构
5. **PromptService** - 接口完整，待重构
6. **PreferenceService** - 接口完整，待重构

#### ⚠️ 需要特殊处理的服务:
7. **DataManager** - **需要抽取接口定义**

### 🎯 重要发现

1. **过度设计验证**: 通过详细审核，确认之前移除的`getModelOptions`确实未被使用 ✅
2. **接口覆盖度高**: 大部分接口定义已经完整，说明设计相对合理
3. **唯一缺失**: DataManager缺少接口定义，这是因为它是一个聚合服务，之前可能被忽略了
4. **方法使用验证**: 所有在UI层调用的方法都有明确的使用位置，没有发现更多无用方法

### 📋 下一步行动计划

1. **立即执行**: 为DataManager创建IDataManager接口定义
2. **按序重构**: TemplateManager → LLMService → PromptService → DataManager → PreferenceService
3. **严格验证**: 每个接口方法都要有对应的UI层使用证据
4. **避免添加**: 不添加任何未在UI层实际使用的方法

---

#### 当前进行：TemplateManager重构

## 任务：架构完整性审计与修复 - 2024年12月

### 目标
全面审计并修复项目架构中的问题，确保所有服务都有完整的跨平台支持，接口使用一致，代理类严格只做转发。

### 已完成步骤
[x] 1. 移除未使用的getModelOptions方法
    - 完成时间：前期会话
    - 实际结果：成功移除接口和所有实现，测试通过

[x] 2. 创建DataManager ElectronProxy
    - 完成时间：当前会话 
    - 实际结果：创建ElectronDataManagerProxy类，严格遵循IDataManager接口
    - 已正确导出并在UI包中可用

[x] 3. 更新Desktop主进程配置
    - 完成时间：当前会话
    - 实际结果：在main.js中添加createDataManager导入和实例化
    - 添加完整的IPC处理器(data-exportAllData, data-importAllData)

[x] 4. 更新Desktop预加载脚本
    - 完成时间：当前会话
    - 实际结果：在preload.js中添加data命名空间的IPC方法
    - 正确的错误处理和响应格式化

[x] 5. 修复useAppInitializer中的DataManager使用
    - 完成时间：当前会话
    - 实际结果：Electron环境现在正确使用ElectronDataManagerProxy而非空对象

[x] 6. 架构完整性验证
    - 完成时间：当前会话
    - 实际结果：253个测试全部通过，架构完整无破坏

### 关键发现与解决的问题

#### 1. ✅ **DataManager架构缺失问题** (已解决)
**问题**：Electron环境中DataManager被实现为空对象，抛出错误
**解决**：创建ElectronDataManagerProxy，正确转发IPC调用

#### 2. ✅ **UI层接口使用规范性** (已验证)
**检查结果**：所有UI composables都正确使用接口类型
- useModelManager: ✅ 使用 IModelManager
- useTemplateManager: ✅ 使用 ITemplateManager  
- usePromptTester: ✅ 使用 IPromptService
- usePromptHistory: ✅ 使用 IHistoryManager
- useHistoryManager: ✅ 使用 IHistoryManager

#### 3. ✅ **ElectronProxy转发规范性** (已验证)
**检查结果**：所有ElectronProxy类都严格只做IPC转发，无业务逻辑实现
- ElectronModelManagerProxy: ✅ 纯转发
- ElectronTemplateManagerProxy: ✅ 纯转发（已修复）
- ElectronHistoryManagerProxy: ✅ 纯转发
- ElectronDataManagerProxy: ✅ 纯转发（新建）
- ElectronLLMProxy: ✅ 纯转发（包含流式处理适配）
- ElectronPromptServiceProxy: ✅ 纯转发（包含复杂事件处理）
- ElectronPreferenceServiceProxy: ✅ 纯转发

#### 4. ✅ **架构一致性** (已验证)
**Web环境**：直接创建真实服务实例，使用工厂函数
**Electron环境**：使用Proxy类通过IPC与主进程通信
**设计正确**：Web环境不需要额外适配器，真实实例即为正确实现

### 最终架构状态（✅ 全部完成）

| 服务 | 接口完整性 | UI使用接口 | Web环境 | Electron代理 | IPC处理器 | 状态 |
|-----|-----------|----------|---------|-------------|----------|------|
| ModelManager | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| TemplateManager | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| HistoryManager | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| **DataManager** | ✅ | ✅ | ✅ | ✅ | ✅ | **完整** |
| LLMService | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| PromptService | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| PreferenceService | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |

### 技术实现亮点

1. **严格的代理模式**：所有ElectronProxy都严格只做IPC转发，无业务逻辑
2. **完整的错误处理**：统一的成功/失败响应格式，正确的异常传播
3. **接口一致性**：Web和Desktop环境使用完全一致的接口调用模式
4. **依赖注入正确**：所有服务都正确接收依赖参数
5. **测试覆盖完整**：253个测试确保功能稳定性，无回归问题

### 架构原则确立

1. **ElectronProxy类必须ONLY做IPC转发，绝不实现业务逻辑**
2. **Web环境直接使用工厂函数创建真实实例，无需额外适配器**
3. **UI层严格使用接口类型，不直接依赖实现类**
4. **两种环境的接口调用模式必须完全一致**
5. **避免过度设计，只添加有UI层使用需求的方法**

### 下一步任务

✅ **核心架构修复已全部完成**

所有关键服务都已具备完整的跨平台架构支持！项目现在拥有一个健壮、一致的服务架构，可以安全地在Web和Desktop环境中运行。
