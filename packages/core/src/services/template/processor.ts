import { Template } from './types';
import { Message } from '../llm/types';
import { Handlebars } from './minimal';

/**
 * 模板变量上下文
 */
export interface TemplateContext {
  originalPrompt?: string;
  iterateInput?: string;
  lastOptimizedPrompt?: string;
  [key: string]: string | undefined;
}

/**
 * 超级简化模板处理器
 */
export class TemplateProcessor {
  /**
   * 处理模板，返回消息数组
   */
  static processTemplate(template: Template, context: TemplateContext): Message[] {
    // 检查迭代场景必须使用高级模板
    const isIterateContext = context.originalPrompt && context.iterateInput;
    if (isIterateContext && typeof template.content === 'string') {
      throw new Error(
        `迭代场景必须使用高级模板（消息数组格式），因为需要进行变量替换。\n` +
        `模板ID: ${template.id}\n` +
        `当前模板类型: 简单模板（字符串格式）\n` +
        `建议: 请使用支持变量替换的消息数组格式模板`
      );
    }

    // 简单模板：不使用模板技术，直接作为系统提示词
    if (typeof template.content === 'string') {
      const messages: Message[] = [
        { role: 'system', content: template.content }
      ];
      
      // 添加用户消息 - 直接传入用户内容，不进行模板替换
      if (context.originalPrompt) {
        messages.push({ role: 'user', content: context.originalPrompt });
      }
      
      return messages;
    }

    // 高级模板：使用模板技术进行变量替换
    if (Array.isArray(template.content)) {
      return template.content.map(msg => ({
        role: msg.role,
        content: Handlebars.compile(msg.content, { noEscape: true })(context)
      }));
    }

    throw new Error(`Invalid template content format for template: ${template.id}`);
  }

  /**
   * 判断模板是否为简单模板
   */
  static isSimpleTemplate(template: Template): boolean {
    return typeof template.content === 'string';
  }
} 