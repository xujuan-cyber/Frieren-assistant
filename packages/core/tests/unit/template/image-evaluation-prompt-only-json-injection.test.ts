import { describe, it, expect } from 'vitest';
import { TemplateProcessor, type TemplateContext } from '../../../src/services/template/processor';
import { template as text2imagePromptOnlyZh } from '../../../src/services/template/default-templates/evaluation/image/text2image/evaluation-prompt-only';
import { template as text2imagePromptOnlyEn } from '../../../src/services/template/default-templates/evaluation/image/text2image/evaluation-prompt-only_en';
import { template as image2imagePromptOnlyZh } from '../../../src/services/template/default-templates/evaluation/image/image2image/evaluation-prompt-only';
import { template as image2imagePromptOnlyEn } from '../../../src/services/template/default-templates/evaluation/image/image2image/evaluation-prompt-only_en';

describe('image evaluation prompt-only templates JSON evidence injection', () => {
  const baseContext: TemplateContext = {
    originalPrompt: '原始提示词含 {{subject_name}}。\n```json\n{"negative_prompt":["crowded"]}\n```',
    optimizedPrompt: '工作区提示词含 {{style_hint}}。\n## Notes\n- keep cinematic realism',
    userFeedback: '优先关注：不要让输出出现代码块；保持 {{subject_name}}。',
    hasOriginalPrompt: true,
    hasUserFeedback: true,
  };

  it.each([
    ['zh-text2image', text2imagePromptOnlyZh],
    ['en-text2image', text2imagePromptOnlyEn],
    ['zh-image2image', image2imagePromptOnlyZh],
    ['en-image2image', image2imagePromptOnlyEn],
  ])('should render %s image evaluation prompt-only template with JSON-wrapped evidence', (_label, template) => {
    const messages = TemplateProcessor.processTemplate(template, baseContext);

    expect(messages[1].content).toContain('"originalPrompt": ');
    expect(messages[1].content).toContain('"optimizedPrompt": ');
    expect(messages[1].content).toContain('"userFeedback": ');
    expect(messages[1].content).toContain('{{subject_name}}');
    expect(messages[1].content).toContain('{{style_hint}}');
    expect(messages[1].content).toContain('\\"negative_prompt\\"');
  });
});
