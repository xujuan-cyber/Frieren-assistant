# 工具调用测试集成完整设计方案

## 📋 问题分析

你的观察非常准确！当前系统存在以下关键问题：

### 1. **类型定义缺失工具支持**
- `CustomConversationRequest` 类型不包含 `tools` 字段
- 测试请求时无法传递工具定义到LLM服务

### 2. **测试流程工具数据丢失**
- `AdvancedTestPanel` 在创建测试请求时不包含工具数据
- 即使ContextEditor中定义了工具，测试时也不会被使用

### 3. **工具调用响应处理缺失**
- 当前系统不处理LLM返回的工具调用请求
- 没有工具调用结果的回传机制

## 🎯 完整解决方案

### 阶段1: 类型系统扩展

#### 1.1 扩展 `CustomConversationRequest` 类型
```typescript
// packages/core/src/services/prompt/types.ts
export interface CustomConversationRequest {
  modelKey: string;
  messages: ConversationMessage[];
  variables: Record<string, string>;
  tools?: ToolDefinition[];  // 🆕 添加工具支持
}
```

#### 1.2 扩展 LLM 服务接口
```typescript
// packages/core/src/services/llm/types.ts
export interface LLMRequest {
  messages: StandardMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];  // 🆕 添加工具支持
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls';
  toolCalls?: ToolCall[];  // 🆕 工具调用信息
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### 阶段2: 服务层集成

#### 2.1 更新 PromptService
```typescript
// packages/core/src/services/prompt/service.ts
async testCustomConversationStream(
  request: CustomConversationRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  // ... 现有逻辑 ...
  
  const llmRequest: LLMRequest = {
    messages: processedMessages,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.maxTokens,
    tools: request.tools,  // 🆕 传递工具定义
    stream: true
  }

  // 处理工具调用响应
  const response = await llmService.generateStream(llmRequest, {
    onToken: callbacks.onToken,
    onToolCall: callbacks.onToolCall,  // 🆕 工具调用回调
    onComplete: callbacks.onComplete,
    onError: callbacks.onError
  })
}
```

#### 2.2 更新 LLM Service 实现
```typescript
// packages/core/src/services/llm/openai-service.ts
async generateStream(request: LLMRequest, callbacks: StreamCallbacks): Promise<void> {
  const openaiRequest = {
    messages: request.messages,
    model: request.model,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    tools: request.tools,  // 🆕 传递工具到 OpenAI
    stream: true
  }

  const stream = await this.client.chat.completions.create(openaiRequest)
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta
    
    if (delta.content) {
      callbacks.onToken?.(delta.content)
    }
    
    if (delta.tool_calls) {  // 🆕 处理工具调用
      callbacks.onToolCall?.(delta.tool_calls)
    }
  }
}
```

### 阶段3: UI层集成

#### 3.1 更新 AdvancedTestPanel
```typescript
// packages/ui/src/components/AdvancedTestPanel.vue
interface Props {
  // ... 现有属性 ...
  tools?: ToolDefinition[];  // 🆕 接收工具定义
}

const testCustomConversationWithMode = async (mode: 'original' | 'optimized') => {
  // ... 现有逻辑 ...

  const request: CustomConversationRequest = {
    modelKey: selectedTestModel.value,
    messages: conversationMessages.value,
    variables: contextVariables,
    tools: props.tools  // 🆕 传递工具定义
  }

  await props.services.promptService.testCustomConversationStream(
    request,
    {
      onToken: (token: string) => {
        resultRef.value += token
      },
      onToolCall: (toolCalls: ToolCall[]) => {  // 🆕 处理工具调用
        handleToolCalls(toolCalls, resultRef)
      },
      onComplete: () => {
        isTestingRef.value = false
      },
      onError: (error) => {
        errorRef.value = error.message
        isTestingRef.value = false
      }
    }
  )
}
```

#### 3.2 父组件传递工具数据
```vue
<!-- 主应用组件 -->
<AdvancedTestPanel 
  :tools="currentTools"  
  :originalPrompt="originalPrompt"
  :optimizedPrompt="optimizedPrompt"
  @showConfig="showConfig"
/>
```

### 阶段4: 工具调用处理机制

#### 4.1 工具调用执行框架
```typescript
// packages/ui/src/composables/useToolExecution.ts
export interface ToolExecutionResult {
  toolCallId: string;
  result: string;
  error?: string;
}

export function useToolExecution() {
  const executeToolCall = async (toolCall: ToolCall): Promise<ToolExecutionResult> => {
    try {
      // 这里可以实现实际的工具执行逻辑
      // 或者显示模拟结果
      const result = await simulateToolExecution(toolCall)
      
      return {
        toolCallId: toolCall.id,
        result: JSON.stringify(result)
      }
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        result: '',
        error: error.message
      }
    }
  }
  
  return { executeToolCall }
}
```

#### 4.2 工具调用UI显示
```vue
<!-- 在测试结果中显示工具调用 -->
<div v-if="toolCalls.length > 0" class="tool-calls-section mt-4">
  <h4 class="text-sm font-medium mb-2">🛠️ 工具调用</h4>
  <div v-for="toolCall in toolCalls" :key="toolCall.id" 
       class="tool-call-item p-3 bg-blue-50 border-l-4 border-blue-400 mb-2">
    <div class="text-sm font-medium text-blue-700">
      {{ toolCall.function.name }}
    </div>
    <div class="text-xs text-blue-600 mt-1">
      参数: {{ toolCall.function.arguments }}
    </div>
    <div class="text-xs text-green-600 mt-1">
      结果: {{ getToolCallResult(toolCall.id) }}
    </div>
  </div>
</div>
```

## 📊 实施优先级

### P1: 核心类型和服务扩展 (高优先级)
- [ ] 扩展 `CustomConversationRequest` 包含 tools
- [ ] 更新 LLM 服务接口支持工具传递
- [ ] 修改 PromptService 传递工具数据

### P2: UI集成和数据传递 (中优先级)
- [ ] AdvancedTestPanel 接收和使用工具数据
- [ ] ContextEditor 与测试面板的工具数据传递
- [ ] 父组件协调工具数据流

### P3: 工具调用响应处理 (高价值)
- [ ] 工具调用结果显示UI
- [ ] 工具执行模拟框架
- [ ] 工具调用的流式响应处理

### P4: 高级功能 (后期优化)
- [ ] 实际工具执行集成
- [ ] 工具调用链追踪
- [ ] 工具性能统计

## 🎯 预期效果

### 用户体验
- ✅ 在ContextEditor中定义的工具能在测试中生效
- ✅ 测试结果显示AI的工具调用意图
- ✅ 完整的工具调用上下文保持

### 开发收益
- ✅ 统一的工具调用处理架构
- ✅ 类型安全的工具数据传递
- ✅ 易于扩展的工具执行框架

## 🔄 实施步骤

1. **立即开始**: P1 核心类型扩展
2. **第二阶段**: P2 UI集成
3. **第三阶段**: P3 工具调用响应处理
4. **后续迭代**: P4 高级功能

---

*文档创建时间: 2025-08-28*  
*状态: 设计完成，准备实施*