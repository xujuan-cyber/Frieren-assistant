import { PromptRecord } from '../history/types';

/**
 * 提示词服务接口
 */
export interface IPromptService {
  /** 优化提示词 */
  optimizePrompt(prompt: string, modelKey: string): Promise<string>;
  
  /** 迭代优化提示词 */
  iteratePrompt(
    originalPrompt: string,
    iterateInput: string,
    modelKey: string
  ): Promise<string>;
  
  /** 测试提示词 */
  testPrompt(
    prompt: string,
    testInput: string,
    modelKey: string
  ): Promise<string>;
  
  /** 获取历史记录 */
  getHistory(): PromptRecord[];
  
  /** 获取迭代链 */
  getIterationChain(recordId: string): PromptRecord[];
} 