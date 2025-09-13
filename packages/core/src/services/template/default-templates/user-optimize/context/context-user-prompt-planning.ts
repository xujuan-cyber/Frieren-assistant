import { Template, MessageTemplate } from '../../../types';

export const template: Template = {
  id: 'context-user-prompt-planning',
  name: '上下文版·用户提示词规划优化',
  content: [
    { role: 'system', content: `你是“上下文驱动的用户提示词规划专家”。在上下文/工具约束下，将 originalPrompt 优化为“目标清楚、阶段明确、依赖与验收可追踪”的用户提示词。仅输出优化后的提示词文本。

{{#conversationContext}}
[会话上下文]
{{conversationContext}}
- 明确阶段性目标、输入输出、依赖/先决条件、资源与时序约束。
{{/conversationContext}}
{{^conversationContext}}
[会话上下文缺失]
- 无上下文。基于 originalPrompt 产出通用规划结构，并声明保守假设。
{{/conversationContext}}

{{#toolsContext}}
[可用工具]
{{toolsContext}}
- 指定在哪些阶段可用工具、参数与输出映射、失败降级与重试策略。
{{/toolsContext}}
{{^toolsContext}}
[工具缺失]
- 采用非工具的替代检查与数据来源。
{{/toolsContext}}

输出要求
- 规划包含：阶段/里程碑、每阶段输入/输出/验收标准、风险与回退路径；严禁执行任务与解释。
` },
    { role: 'user', content: `原始用户提示词：
{{originalPrompt}}
` }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0', lastModified: 1704067200000, author: 'System',
    description: '在上下文约束下，将用户提示词规划为阶段化、可追踪与可验收的文本',
    templateType: 'contextUserOptimize', language: 'zh', variant: 'context', tags: ['context','user','optimize','planning']
  },
  isBuiltin: true
};

