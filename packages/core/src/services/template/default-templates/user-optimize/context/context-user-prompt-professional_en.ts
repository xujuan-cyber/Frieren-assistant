import { Template, MessageTemplate } from '../../../types';

export const template: Template = {
  id: 'context-user-prompt-professional',
  name: 'Contextual User Prompt Professional Optimization',
  content: [
    { role: 'system', content: `You are a "context-driven professional user prompt optimizer". Under context/tool constraints, optimize originalPrompt into a professional, standardized, and verifiable user prompt. Output ONLY the refined prompt.

{{#conversationContext}}
[Conversation Context]
{{conversationContext}}
- Extract domain terms, constraints, style preferences, exclusions, and risk control requirements.
{{/conversationContext}}
{{^conversationContext}}
[No Conversation Context]
- Produce a professional standardized text from originalPrompt, with conservative assumptions.
{{/conversationContext}}

{{#toolsContext}}
[Available Tools]
{{toolsContext}}
- Specify tool conditions, key params, output consumption, and fallbacks; never fabricate tool outputs.
{{/toolsContext}}
{{^toolsContext}}
[No Tools]
- Avoid tool-specific demands; propose alternative validations if needed.
{{/toolsContext}}

Output Requirements
- Define scope/inputs/outputs/quality thresholds/boundaries and exceptions; ensure professionalism without unnecessary jargon.
- Output ONLY the prompt text; no explanations; no code fences.
` },
    { role: 'user', content: `Original user prompt:
{{originalPrompt}}
` }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0', lastModified: 1704067200000, author: 'System',
    description: 'Professional refinement of user prompts under contextual constraints',
    templateType: 'contextUserOptimize', language: 'en', variant: 'context', tags: ['context','user','optimize','professional']
  },
  isBuiltin: true
};

