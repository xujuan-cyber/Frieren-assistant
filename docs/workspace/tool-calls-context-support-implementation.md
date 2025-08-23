# 工具调用上下文支持完整实现方案

## 📋 项目背景

基于用户需求：
- 从LangFuse等格式导入时，能识别和处理工具调用消息
- 将工具从消息流中分离，作为独立的工具配置管理
- 在上下文编辑器中提供完整的工具管理功能
- 支持不同格式间的工具转换（OpenAI vs LangFuse格式差异）

## 🔍 当前实现状况分析

### ✅ 已实现的部分
1. **完整类型支持**：`StandardPromptData`已包含`tools`字段，支持OpenAI标准的工具定义
2. **工具分离逻辑**：`PromptDataConverter.fromLangFuse()`已实现将`role: "tool"`消息转换为工具定义
3. **基础导入框架**：支持多格式导入，包括LangFuse智能识别

### ❌ 需要增强的关键部分
1. **UI工具管理界面**：ContextEditor缺少工具列表展示和编辑功能  
2. **数据完整性**：导出时`tools`数据丢失
3. **变量集成**：工具定义中的变量未被扫描和管理
4. **格式转换**：缺少导出到不同格式时的工具处理
5. **工具编辑器**：需要可视化的工具参数编辑界面

## 📋 实施计划概览

### 1. **数据层增强** (核心基础)
- 修复ContextEditor导出逻辑，确保tools数据完整性
- 增强变量扫描系统，支持工具定义中的变量提取
- 完善导出时的格式转换（OpenAI vs LangFuse格式差异）

### 2. **UI组件开发** (用户界面)
- 在ContextEditor中添加工具管理面板
- 实现工具列表展示组件（可折叠）
- 开发工具编辑器组件（JSON Schema支持）
- 添加工具添加/删除/复制功能

### 3. **变量系统集成** (数据一致性)
- 扩展变量扫描函数，支持工具参数中的变量
- 在工具预览中支持变量替换和高亮
- 集成工具变量到缺失变量检测系统

### 4. **增强导入/导出** (格式兼容)
- 完善LangFuse格式的工具处理
- 实现导出时根据目标格式处理工具
- 支持工具定义的模板化和变量化

## 🎯 实施优先级与详细步骤

### P0: 数据完整性修复 (导出tools数据)

#### 修复目标
- ContextEditor导出时保留tools数据
- 确保导入的工具不会在导出时丢失

#### 实施步骤
1. **修改ContextEditor.vue exportData计算属性**
   ```typescript
   const exportData = computed(() => {
     const data: StandardPromptData = {
       messages: messages.value,
       tools: tools.value, // 添加工具数据
       metadata: {
         source: 'context_editor',
         variables: {},
         tools_count: tools.value?.length || 0,
         exported_at: new Date().toISOString()
       }
     }
     return JSON.stringify(data, null, 2)
   })
   ```

2. **添加tools响应式状态**
   ```typescript
   const tools = ref<ToolDefinition[]>([])
   ```

3. **修改导入处理逻辑**
   - 在handleImport中保存导入的工具数据
   - 在contextEditor的返回结果中提取tools

### P1: 基础工具管理UI (展示+编辑)

#### UI设计目标
- 在消息列表下方添加工具管理区域
- 支持工具列表展示（可折叠）
- 提供基础的添加/删除/编辑功能

#### 实施步骤
1. **在ContextEditor模板中添加工具面板**
   ```vue
   <!-- 工具管理面板 -->
   <div v-if="tools.length > 0 || showToolsPanel" class="tools-panel">
     <div class="tools-header">
       <h4>工具定义 ({{ tools.length }})</h4>
       <button @click="toggleToolsPanel">{{ showToolsPanel ? '收起' : '展开' }}</button>
     </div>
     
     <div v-if="showToolsPanel" class="tools-content">
       <!-- 工具列表 -->
       <div v-for="(tool, index) in tools" :key="`tool-${index}`" class="tool-item">
         <div class="tool-header">
           <span class="tool-name">{{ tool.function.name }}</span>
           <div class="tool-actions">
             <button @click="editTool(index)">编辑</button>
             <button @click="deleteTool(index)">删除</button>
           </div>
         </div>
         <div class="tool-description">{{ tool.function.description }}</div>
       </div>
       
       <!-- 添加工具按钮 -->
       <button @click="addNewTool" class="add-tool-btn">+ 添加工具</button>
     </div>
   </div>
   ```

2. **实现工具管理方法**
   ```typescript
   const showToolsPanel = ref(false)
   
   const toggleToolsPanel = () => {
     showToolsPanel.value = !showToolsPanel.value
   }
   
   const addNewTool = () => {
     tools.value.push({
       type: 'function',
       function: {
         name: 'new_tool',
         description: '新建工具',
         parameters: {
           type: 'object',
           properties: {},
           required: []
         }
       }
     })
   }
   
   const deleteTool = (index: number) => {
     tools.value.splice(index, 1)
   }
   
   const editTool = (index: number) => {
     // TODO: 打开工具编辑器
   }
   ```

### P2: 变量系统集成 (扫描+替换)

#### 集成目标
- 工具参数中的变量能被扫描识别
- 支持工具参数的变量预览和替换
- 集成到现有的缺失变量检测系统

#### 实施步骤
1. **扩展变量扫描函数**
   ```typescript
   // 扫描工具中的变量
   const scanToolVariables = (tools: ToolDefinition[]): string[] => {
     const variables = new Set<string>()
     
     tools.forEach(tool => {
       const toolStr = JSON.stringify(tool)
       const matches = toolStr.match(/\{\{\s*([^}]+)\s*\}\}/g)
       if (matches) {
         matches.forEach(match => {
           const varName = match.replace(/\{\{\s*|\s*\}\}/g, '')
           variables.add(varName)
         })
       }
     })
     
     return Array.from(variables)
   }
   
   // 更新allUsedVariables计算属性
   const allUsedVariables = computed(() => {
     const variables = new Set<string>()
     
     // 扫描消息中的变量
     messages.value.forEach(message => {
       const messageVars = scanVariables(message.content)
       messageVars.forEach(v => variables.add(v))
     })
     
     // 扫描工具中的变量
     const toolVars = scanToolVariables(tools.value)
     toolVars.forEach(v => variables.add(v))
     
     return Array.from(variables)
   })
   ```

2. **工具变量替换和预览**
   ```typescript
   const replaceToolVariables = (tools: ToolDefinition[], variables: Record<string, string>): ToolDefinition[] => {
     return tools.map(tool => {
       const toolStr = JSON.stringify(tool)
       const replacedStr = replaceVariables(toolStr, variables)
       return JSON.parse(replacedStr)
     })
   }
   ```

### P3: 高级功能 (预览+验证+模板化)

#### 功能目标
- 工具定义的JSON Schema验证
- 工具参数的可视化编辑器
- 工具模板化支持

#### 实施步骤
1. **工具编辑器组件开发**
2. **JSON Schema验证集成**
3. **工具模板化功能**

## 🏗️ 技术架构设计

### 数据流设计
```
导入数据 -> PromptDataConverter -> StandardPromptData -> ContextEditor
                                      ├─ messages[]
                                      ├─ tools[] 
                                      └─ metadata
```

### 变量扫描范围扩展
```
扫描范围:
├─ messages[].content (现有)
├─ tools[].function.description (新增)
├─ tools[].function.parameters (新增)
└─ metadata.* (可选)
```

### UI组件层次
```
ContextEditor
├─ MessageList (现有)
├─ ToolsPanel (新增)
│   ├─ ToolList
│   └─ ToolEditor
└─ ImportExportDialogs (增强)
```

## 📊 预期效果

### 用户体验提升
- **完整性**：导入的工具调用信息不会丢失
- **可视化**：工具定义以友好界面展示和编辑
- **一致性**：工具变量与消息变量统一管理
- **兼容性**：支持多种格式的无缝转换

### 开发收益
- **标准化**：统一的工具数据处理流程
- **扩展性**：易于添加新的工具类型支持
- **维护性**：清晰的数据分离和组件职责

## 🧪 测试策略

### 单元测试
- 工具导入转换逻辑测试
- 变量扫描和替换测试
- 数据完整性验证测试

### 集成测试
- LangFuse格式完整导入导出测试
- 工具+变量联合管理测试
- 多格式转换兼容性测试

### 用户测试
- 使用真实LangFuse数据测试导入
- 工具编辑和管理流程测试
- 变量管理集成体验测试

## 📅 开发时间估算

- **P0 数据完整性修复**: 0.5天
- **P1 基础工具UI**: 1-1.5天
- **P2 变量系统集成**: 1天
- **P3 高级功能**: 1.5-2天

**总计**: 4-5天完整实现

## 🔄 迭代计划

### 第一版 (MVP)
- 数据完整性修复
- 基础工具列表展示
- 基本的添加/删除功能

### 第二版 (增强)
- 变量系统完整集成
- 工具参数编辑器
- 预览和验证功能

### 第三版 (完善)
- JSON Schema支持
- 工具模板化
- 高级导入导出选项

---

*文档创建时间: 2025-08-28*  
*实施状态: 准备开始*