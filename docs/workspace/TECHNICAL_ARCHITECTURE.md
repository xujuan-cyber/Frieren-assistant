# 高级变量管理功能 - 技术设计与架构

## 🏗️ 系统架构

### 整体架构设计 (2025-01-25更新)
```
┌─────────────────────────────────────────┐
│                 UI 层                    │
├─────────────────────────────────────────┤
│ MainLayout (导航菜单集成)                │
│ ├── AdvancedModeNavigation (模式切换)   │
│ ├── VariableManagerModal (变量管理弹窗)  │
│ └── 其他导航按钮                         │
├─────────────────────────────────────────┤
│              测试面板层                   │
├─────────────────────────────────────────┤
│ AdvancedTestPanel                       │
│ ├── ConversationManager                 │
│ ├── BasicTestMode                       │
│ └── AdvancedModeToggle (已移除)         │
├─────────────────────────────────────────┤
│                服务层                    │
├─────────────────────────────────────────┤
│ VariableManager (UI服务)                │
│ ├── 自定义变量 CRUD                      │
│ ├── 预定义变量集成                       │
│ └── 变量解析和验证                       │
├─────────────────────────────────────────┤
│                核心层                    │
├─────────────────────────────────────────┤
│ PromptService (扩展)                    │
│ ├── testCustomConversationStream       │
│ └── OptimizationRequest 扩展            │
│                                         │
│ TemplateProcessor (复用)                │
│ ├── CSP安全变量替换                      │
│ └── 统一变量处理逻辑                     │
└─────────────────────────────────────────┘
```

### 设计原则
1. **最小侵入**: 基于现有架构进行最小化扩展
2. **职责分离**: UI层管理变量，Core层处理逻辑
3. **数据统一**: 使用统一的ConversationMessage结构
4. **向后兼容**: 所有新功能都是可选的
5. **渐进式发现**: 通过导航菜单集成实现功能的渐进式发现 (2025-01-25新增)

## 📊 核心接口设计

### 1. 数据结构定义

```typescript
// 统一的消息结构 - 支持优化和测试两种场景
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;  // 支持变量语法 {{variableName}}
}

// 扩展的优化请求接口 - 保持向后兼容
export interface OptimizationRequest {
  optimizationMode: OptimizationMode;
  targetPrompt: string;
  templateId?: string;
  modelKey: string;
  // 新增：高级模式上下文（可选）
  advancedContext?: {
    variables?: Record<string, string>;     // 自定义变量
    messages?: ConversationMessage[];       // 自定义会话消息
  };
}

// 自定义会话测试请求
export interface CustomConversationRequest {
  modelKey: string;
  messages: ConversationMessage[];          // 使用相同的消息结构
  variables: Record<string, string>;       // 包含预定义+自定义变量
}
```

### 2. 服务接口扩展

```typescript
// UI层变量管理服务
export interface IVariableManager {
  // 变量CRUD操作
  setVariable(name: string, value: string): void;
  getVariable(name: string): string | undefined;
  deleteVariable(name: string): void;
  listVariables(): Record<string, string>;
  
  // 变量解析和验证
  resolveAllVariables(context: TemplateContext): Record<string, string>;
  validateVariableName(name: string): boolean;
  scanVariablesInContent(content: string): string[];
}

// 扩展的提示词服务
export interface IPromptService {
  // ... 现有方法保持不变
  
  // 新增：自定义会话测试方法
  testCustomConversationStream(
    request: CustomConversationRequest, 
    callbacks: StreamHandlers
  ): Promise<void>;
}
```

## 🎨 UI组件架构

### 主要组件设计

#### 1. AdvancedTestPanel (主组件) - 2025-01-25更新
```vue
<template>
  <div class="advanced-test-panel">
    <!-- 基础模式 - 始终显示基础测试功能 -->
    <BasicTestMode 
      :prompt-service="promptService"
      :advanced-mode-enabled="advancedModeEnabled"
    />
    
    <!-- 高级模式内容 - 仅在高级模式下显示 -->
    <div v-if="advancedModeEnabled" class="advanced-mode-content">
      <!-- 会话管理区域 -->
      <ConversationManager 
        v-model:messages="conversationMessages"
        :all-variables="allVariables"
      />
      
      <!-- 测试控制区域 -->
      <TestControls
        :model-key="modelKey"
        :is-testing="isTesting"
        @start-test="handleStartTest"
      />
    </div>
  </div>
</template>
```

#### 2. MainLayout (导航菜单集成) - 2025-01-25新增
```vue
<template>
  <div class="main-layout">
    <!-- 导航菜单区域 -->
    <div class="navigation-actions">
      <!-- 高级模式导航按钮 - 始终显示 -->
      <ActionButtonUI
        icon="🚀"
        :text="$t('nav.advancedMode')"
        @click="toggleAdvancedMode"
        :class="{ 'active-button': advancedModeEnabled }"
      />
      
      <!-- 变量管理按钮 - 仅在高级模式下显示 -->
      <ActionButtonUI
        v-if="advancedModeEnabled"
        icon="📊"
        :text="$t('nav.variableManager')"
        @click="showVariableManager = true"
      />
      
      <!-- 其他导航按钮... -->
    </div>
    
    <!-- 主内容区域 -->
    <div class="main-content">
      <AdvancedTestPanel 
        :advanced-mode-enabled="advancedModeEnabled"
        :services="services"
      />
    </div>
    
    <!-- 变量管理弹窗 -->
    <VariableManagerModal
      v-if="showVariableManager"
      v-model:visible="showVariableManager"
      :variable-manager="variableManager"
    />
  </div>
</template>
```

#### 3. VariableManagerModal (变量管理弹窗组件) - 2025-01-25更新
```vue
<template>
  <div class="variable-manager">
    <div class="variable-header">
      <h3>{{ t('variables.title') }}</h3>
      <div class="variable-stats">
        {{ t('variables.stats', { total: totalVariables, custom: customVariables.length }) }}
      </div>
    </div>
    
    <!-- 变量列表 -->
    <div class="variable-list">
      <VariableItem
        v-for="(value, name) in allVariables"
        :key="name"
        :name="name"
        :value="value"
        :is-predefined="isPredefinedVariable(name)"
        @update="updateVariable"
        @delete="deleteVariable"
      />
    </div>
    
    <!-- 添加变量 -->
    <AddVariableForm @add="addVariable" />
  </div>
</template>
```

#### 4. ConversationManager (会话管理组件)
```vue
<template>
  <div class="conversation-manager">
    <div class="conversation-header">
      <h3>{{ t('conversation.title') }}</h3>
      <div class="conversation-stats">
        {{ t('conversation.stats', { count: messages.length }) }}
      </div>
    </div>
    
    <!-- 消息列表 -->
    <div class="message-list">
      <ConversationMessageEditor
        v-for="(message, index) in messages"
        :key="index"
        :message="message"
        :variables="allVariables"
        :missing-variables="getMissingVariables(message.content)"
        @update="updateMessage(index, $event)"
        @delete="deleteMessage(index)"
        @move-up="moveMessage(index, -1)"
        @move-down="moveMessage(index, 1)"
      />
    </div>
    
    <!-- 操作按钮 -->
    <div class="conversation-actions">
      <button @click="addMessage">{{ t('conversation.addMessage') }}</button>
      <QuickTemplateSelector @select="applyTemplate" />
      <button @click="showPreview = !showPreview">
        {{ t('conversation.togglePreview') }}
      </button>
    </div>
    
    <!-- 预览面板 -->
    <MessagePreview 
      v-if="showPreview"
      :messages="messages"
      :variables="allVariables"
    />
  </div>
</template>
```

## ⚙️ 核心实现逻辑

### 1. 变量管理实现

```typescript
// packages/ui/src/services/VariableManager.ts
export class VariableManager implements IVariableManager {
  private customVariables: Record<string, string> = {};
  private readonly predefinedVariables = [
    'originalPrompt', 
    'lastOptimizedPrompt', 
    'iterateInput'
  ];
  
  constructor(private preferenceService: IPreferenceService) {
    this.loadCustomVariables();
  }
  
  // 变量CRUD操作
  setVariable(name: string, value: string): void {
    if (!this.validateVariableName(name)) {
      throw new Error(`Invalid variable name: ${name}`);
    }
    
    this.customVariables[name] = value;
    this.saveCustomVariables();
  }
  
  deleteVariable(name: string): void {
    if (this.predefinedVariables.includes(name)) {
      throw new Error('Cannot delete predefined variable');
    }
    
    delete this.customVariables[name];
    this.saveCustomVariables();
  }
  
  // 解析所有变量（预定义 + 自定义）
  resolveAllVariables(context: TemplateContext): Record<string, string> {
    const predefinedVars = this.extractPredefinedVariables(context);
    return { ...predefinedVars, ...this.customVariables };
  }
  
  // 扫描内容中的变量引用
  scanVariablesInContent(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)];
  }
  
  // 变量名验证
  validateVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }
}
```

### 2. 会话管理实现

```typescript
// packages/ui/src/composables/useConversationManager.ts
export function useConversationManager() {
  const messages = ref<ConversationMessage[]>([]);
  const variableManager = inject<VariableManager>('variableManager')!;
  
  // 添加消息
  const addMessage = (role: 'system' | 'user' | 'assistant' = 'user') => {
    messages.value.push({
      role,
      content: ''
    });
  };
  
  // 更新消息
  const updateMessage = (index: number, message: ConversationMessage) => {
    if (index >= 0 && index < messages.value.length) {
      messages.value[index] = { ...message };
    }
  };
  
  // 删除消息
  const deleteMessage = (index: number) => {
    if (index >= 0 && index < messages.value.length) {
      messages.value.splice(index, 1);
    }
  };
  
  // 检测缺失变量
  const getMissingVariables = (content: string): string[] => {
    const referencedVars = variableManager.scanVariablesInContent(content);
    const availableVars = Object.keys(variableManager.listVariables());
    
    return referencedVars.filter(variable => !availableVars.includes(variable));
  };
  
  // 预览消息（变量替换后）
  const previewMessages = (variables: Record<string, string>): ConversationMessage[] => {
    return messages.value.map(message => ({
      ...message,
      content: replaceVariables(message.content, variables)
    }));
  };
  
  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    getMissingVariables,
    previewMessages
  };
}
```

### 3. 测试流程实现

```typescript
// packages/core/src/services/prompt/service.ts (扩展)
export class PromptService implements IPromptService {
  // ... 现有方法保持不变
  
  // 新增：自定义会话流式测试
  async testCustomConversationStream(
    request: CustomConversationRequest,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      // 1. 验证请求
      this.validateCustomConversationRequest(request);
      
      // 2. 解析变量
      const processedMessages = this.processMessagesVariables(
        request.messages,
        request.variables
      );
      
      // 3. 规范化角色
      const normalizedMessages = this.normalizeMessageRoles(processedMessages);
      
      // 4. 调用LLM服务
      await this.llmService.streamChatCompletion({
        modelKey: request.modelKey,
        messages: normalizedMessages,
        onProgress: callbacks.onProgress,
        onComplete: callbacks.onComplete,
        onError: callbacks.onError
      });
      
    } catch (error) {
      callbacks.onError?.(error as Error);
    }
  }
  
  // 处理消息中的变量
  private processMessagesVariables(
    messages: ConversationMessage[],
    variables: Record<string, string>
  ): ConversationMessage[] {
    return messages.map(message => ({
      ...message,
      content: this.templateProcessor.replaceVariables(message.content, variables)
    }));
  }
  
  // 规范化消息角色 (ai -> assistant)
  private normalizeMessageRoles(
    messages: ConversationMessage[]
  ): ConversationMessage[] {
    return messages.map(message => ({
      ...message,
      role: message.role === 'ai' ? 'assistant' : message.role
    })) as ConversationMessage[];
  }
}
```

## 🔧 关键技术决策

### 1. 接口扩展策略
**决策**: 使用可选字段扩展现有接口
```typescript
// 扩展而非重写
interface OptimizationRequest {
  // ... 现有字段保持不变
  advancedContext?: {  // 可选字段，保持向后兼容
    variables?: Record<string, string>;
    messages?: ConversationMessage[];
  };
}
```
**优势**: 保持向后兼容，现有代码无需修改

### 2. 变量管理位置
**决策**: UI层管理自定义变量，Core层处理预定义变量
**理由**: 
- 避免后端复杂度
- 用户自定义变量本质上是前端配置
- 保持Core层的纯净性

### 3. 消息结构统一
**决策**: 优化和测试阶段使用相同的ConversationMessage结构
**优势**: 
- 减少类型复杂度
- 组件可复用
- 用户理解一致

### 4. CSP安全保证
**决策**: 复用现有CSPSafeTemplateProcessor
**实现**: 
```typescript
// 复用现有安全机制
const processedContent = this.templateProcessor.replaceVariables(
  message.content, 
  variables
);
```

### 5. 导航菜单集成策略 (2025-01-25新增)
**决策**: 将高级模式切换集成到导航菜单，变量管理改为独立弹窗
**实现**: 
```typescript
// 导航菜单状态管理
const advancedModeEnabled = ref(false)
const showVariableManager = ref(false)

// 交互逻辑
const toggleAdvancedMode = () => {
  advancedModeEnabled.value = !advancedModeEnabled.value
}

const openVariableManager = () => {
  showVariableManager.value = true
}
```
**优势**: 
- 基础模式下界面几乎不变
- 渐进式功能发现
- 独立的变量管理界面

### 6. 变量状态同步策略 (2025-08-26新增)
**决策**: 使用统一的变量管理器实例，避免多实例导致的数据不同步
**问题**: AdvancedTestPanel 创建独立的变量管理器实例，导致与主应用实例数据不同步
**解决方案**: 
```typescript
// 在AdvancedTestPanel中优先使用传入的变量管理器实例
const variableManager: Ref<VariableManagerHooks | null> = computed(() => {
  if (props.variableManager) {
    return props.variableManager  // 使用App.vue传入的统一实例
  }
  return localVariableManager      // 后备方案：本地实例
})
```
**技术实现**:
- App.vue 将其变量管理器实例传递给所有子组件
- 所有组件使用相同的变量管理器实例
- 确保变量数据的实时同步和一致性

### 7. 主题CSS集成策略 (2025-08-26新增)
**决策**: 统一使用项目的主题CSS系统，避免硬编码样式
**实现**:
```typescript
// 使用主题管理器类替换硬编码样式
<div class="add-message-row theme-manager-card">
  <button class="add-message-btn theme-manager-button-secondary">
    添加消息
  </button>
</div>
```
**优势**:
- 保持UI风格一致性
- 支持主题切换
- 减少维护成本

### 8. 设置持久化策略 (2025-08-26新增)
**决策**: 使用项目统一的 preferenceService 进行设置持久化
**实现**:
```typescript
// 高级模式状态持久化
const loadAdvancedModeSetting = async () => {
  if (services.value?.preferenceService) {
    const saved = await services.value.preferenceService.get('advancedModeEnabled', false)
    advancedModeEnabled.value = saved
  }
}

const saveAdvancedModeSetting = async (enabled: boolean) => {
  if (services.value?.preferenceService) {
    await services.value.preferenceService.set('advancedModeEnabled', enabled)
  }
}
```
**优势**:
- 用户设置在重启后保持
- 使用统一的存储机制
- 支持跨平台数据同步

## 🧪 测试策略

### 单元测试覆盖
```typescript
// 变量管理器测试
describe('VariableManager', () => {
  it('should handle custom variables CRUD', () => {
    // 测试自定义变量的增删改查
  });
  
  it('should integrate with predefined variables', () => {
    // 测试与预定义变量的集成
  });
  
  it('should validate variable names', () => {
    // 测试变量名验证逻辑
  });
});

// 会话管理测试
describe('ConversationManager', () => {
  it('should detect missing variables', () => {
    // 测试缺失变量检测
  });
  
  it('should preview variable replacement', () => {
    // 测试变量替换预览
  });
});
```

### 集成测试验证
- 完整的变量管理流程测试
- 会话编辑到测试的端到端流程
- 不同模式之间的切换测试
- 错误处理和恢复测试

## 📈 性能考虑

### 优化点
1. **变量扫描缓存**: 避免重复的正则表达式匹配
2. **组件懒加载**: 高级模式组件按需加载
3. **状态更新节流**: 避免频繁的存储写入
4. **虚拟滚动**: 大量变量时的列表渲染优化

### 内存管理
```typescript
// 组件卸载时清理监听器
onUnmounted(() => {
  // 清理变量管理器的事件监听
  variableManager.removeAllListeners();
  
  // 清理会话管理器的状态
  conversationManager.cleanup();
});
```

## 🔒 安全考虑

### 1. 变量注入安全
- 所有变量替换都通过CSPSafeTemplateProcessor处理
- 防止XSS攻击和代码注入
- 变量名和值的严格验证

### 2. 数据存储安全
- 自定义变量存储在本地LocalStorage
- 敏感信息不包含在变量系统中
- 定期清理无效的变量数据

### 9. Apply to Test 功能架构设计 (2025-08-27新增)
**决策**: 将"应用到测试"从简单高级模式启用转变为智能测试配置系统
**问题背景**: 
- 用户反馈原有功能只是启用高级模式，缺乏实际价值
- 需要根据优化模式智能创建合适的测试环境

**技术架构**:
```typescript
// 核心变量系统扩展
export const PREDEFINED_VARIABLES = [
  'originalPrompt',
  'lastOptimizedPrompt', 
  'iterateInput',
  'currentPrompt'  // 测试阶段使用的当前提示词变量
] as const;

// 智能模板配置方法
const applyOptimizedPromptToTest = (optimizationData: {
  originalPrompt: string
  optimizedPrompt: string
  optimizationMode: string
}) => {
  if (optimizationData.optimizationMode === 'system') {
    // 系统提示词优化：系统消息 + 用户交互消息
    conversationMessages.value = [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '请按照你的角色设定，展示你的能力并与我互动。' }
    ]
  } else {
    // 用户提示词优化：仅用户消息
    conversationMessages.value = [
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  }
}

// 组件通信实现
const handleApplyToTest = () => {
  // 自动启用高级模式
  if (!advancedModeEnabled.value) {
    advancedModeEnabled.value = true
    saveAdvancedModeSetting(true)
  }
  
  // 调用高级测试面板的配置方法
  nextTick(() => {
    advancedTestPanel.applyOptimizedPromptToTest({
      originalPrompt: optimizer.prompt,
      optimizedPrompt: optimizer.optimizedPrompt,
      optimizationMode: selectedOptimizationMode.value
    })
  })
}
```

**优势**: 
- 智能生成测试模板，节省用户配置时间
- 模式感知配置，提供最佳测试场景
- 统一变量系统，支持灵活的提示词切换