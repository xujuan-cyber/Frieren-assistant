import { PromptRecord } from '../history/types';
import { StreamHandlers } from '../llm/types';

/**
 * 提示词服务接口
 */
export interface IPromptService {
  /** 优化提示词 */
  optimizePrompt(prompt: string, modelKey: string, templateId?: string): Promise<string>;
  
  /** 迭代优化提示词 */
  iteratePrompt(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    templateId?: string
  ): Promise<string>;
  
  /** 测试提示词 */
  testPrompt(
    prompt: string,
    testInput: string,
    modelKey: string
  ): Promise<string>;
  
  /** 获取历史记录 */
  getHistory(): Promise<PromptRecord[]>;
  
  /** 获取迭代链 */
  getIterationChain(recordId: string): Promise<PromptRecord[]>;

  /** 优化提示词（流式） */
  optimizePromptStream(
    prompt: string,
    modelKey: string,
    templateId: string,
    callbacks: StreamHandlers
  ): Promise<void>;

  /** 迭代优化提示词（流式） */
  iteratePromptStream(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    templateId: string
  ): Promise<void>;

  /** 测试提示词（流式） */
  testPromptStream(
    prompt: string,
    testInput: string,
    modelKey: string,
    callbacks: StreamHandlers
  ): Promise<void>;
} 