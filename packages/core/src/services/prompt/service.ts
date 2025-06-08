import { IPromptService } from './types';
import { Message, StreamHandlers } from '../llm/types';
import { PromptRecord } from '../history/types';
import { ModelManager, modelManager as defaultModelManager } from '../model/manager';
import { LLMService, createLLMService } from '../llm/service';
import { TemplateManager, templateManager as defaultTemplateManager } from '../template/manager';
import { HistoryManager, historyManager as defaultHistoryManager } from '../history/manager';
import { OptimizationError, IterationError, TestError, ServiceDependencyError } from './errors';
import { ERROR_MESSAGES } from '../llm/errors';
import { TemplateProcessor, TemplateContext } from '../template/processor';
import { v4 as uuidv4 } from 'uuid';
import { MessageTemplate } from '../template/types';

/**
 * 提示词服务实现
 */
export class PromptService implements IPromptService {
  constructor(
    private modelManager: ModelManager,
    private llmService: LLMService,
    private templateManager: TemplateManager,
    private historyManager: HistoryManager
  ) {
    this.checkDependencies();
  }

  /**
   * 检查依赖服务是否已初始化
   */
  private checkDependencies() {
    if (!this.modelManager) {
      throw new ServiceDependencyError('模型管理器未初始化', 'ModelManager');
    }
    if (!this.llmService) {
      throw new ServiceDependencyError('LLM服务未初始化', 'LLMService');
    }
    if (!this.templateManager) {
      throw new ServiceDependencyError('提示词管理器未初始化', 'TemplateManager');
    }
    if (!this.historyManager) {
      throw new ServiceDependencyError('历史记录管理器未初始化', 'HistoryManager');
    }
  }

  /**
   * 验证输入参数
   */
  private validateInput(prompt: string, modelKey: string) {
    if (!prompt?.trim()) {
      throw new OptimizationError(
        `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.EMPTY_INPUT}`,
        prompt
      );
    }

    if (!modelKey?.trim()) {
      throw new OptimizationError(
        `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_KEY_REQUIRED}`,
        prompt
      );
    }
  }

  /**
   * 验证LLM响应
   */
  private validateResponse(response: string, prompt: string) {
    if (!response?.trim()) {
      throw new OptimizationError('优化失败: LLM服务返回结果为空', prompt);
    }
  }

  /**
   * 优化提示词
   */
  async optimizePrompt(prompt: string, modelKey: string): Promise<string> {
    try {
      this.validateInput(prompt, modelKey);

      // 获取模型配置（使用统一错误）
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new OptimizationError(
          `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_NOT_FOUND}`,
          prompt
        );
      }

      // 获取优化提示词
      let template;
      try {
        template = this.templateManager.getTemplate('general-optimize');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new OptimizationError(`优化失败: ${errorMessage}`, prompt);
      }

      if (!template?.content) {
        throw new OptimizationError('优化失败: 提示词不存在或无效', prompt);
      }

      // 使用TemplateProcessor处理模板和变量替换
      const context: TemplateContext = { originalPrompt: prompt };
      const messages = TemplateProcessor.processTemplate(template, context);

      // 发送请求
      const result = await this.llmService.sendMessage(messages, modelKey);

      // 验证响应
      this.validateResponse(result, prompt);

      // 保存历史记录
      await this.historyManager.addRecord({
        id: uuidv4(),
        originalPrompt: prompt,
        optimizedPrompt: result,
        type: 'optimize',
        chainId: uuidv4(),
        version: 1,
        timestamp: Date.now(),
        modelKey,
        templateId: 'optimize'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new OptimizationError(`优化失败: ${errorMessage}`, prompt);
    }
  }

  /**
   * 迭代优化提示词
   */
  async iteratePrompt(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string
  ): Promise<string> {
    try {
      this.validateInput(originalPrompt, modelKey);
      this.validateInput(lastOptimizedPrompt, modelKey);
      this.validateInput(iterateInput, modelKey);

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      // 获取迭代提示词
      let template;
      try {
        template = this.templateManager.getTemplate('iterate');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new IterationError(`迭代失败: ${errorMessage}`, originalPrompt, iterateInput);
      }

      if (!template?.content) {
        throw new IterationError('迭代失败: 提示词不存在或无效', originalPrompt, iterateInput);
      }

      // 使用TemplateProcessor处理模板和变量替换
      const context: TemplateContext = {
        originalPrompt,
        lastOptimizedPrompt,
        iterateInput
      };
      const messages = TemplateProcessor.processTemplate(template, context);

      // 发送请求
      const result = await this.llmService.sendMessage(messages, modelKey);

      // 保存历史记录
      await this.historyManager.addRecord({
        id: uuidv4(),
        originalPrompt: iterateInput,
        optimizedPrompt: result,
        type: 'iterate',
        chainId: originalPrompt,
        version: 1,
        previousId: originalPrompt,
        timestamp: Date.now(),
        modelKey,
        templateId: 'iterate'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IterationError(`迭代失败: ${errorMessage}`, originalPrompt, iterateInput);
    }
  }

  /**
   * 测试提示词
   */
  async testPrompt(prompt: string, testInput: string, modelKey: string): Promise<string> {
    try {
      this.validateInput(prompt, modelKey);
      this.validateInput(testInput, modelKey);

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      // 构建消息
      const messages: Message[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: testInput }
      ];

      // 发送请求
      const result = await this.llmService.sendMessage(messages, modelKey);

      // 保存历史记录
      await this.historyManager.addRecord({
        id: uuidv4(),
        originalPrompt: prompt,
        optimizedPrompt: result,
        type: 'optimize',
        chainId: prompt,
        version: 1,
        timestamp: Date.now(),
        modelKey,
        templateId: 'test'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TestError(`测试失败: ${errorMessage}`, prompt, testInput);
    }
  }

  /**
   * 获取历史记录
   */
  async getHistory(): Promise<PromptRecord[]> {
    return await this.historyManager.getRecords();
  }

  /**
   * 获取迭代链
   */
  async getIterationChain(recordId: string): Promise<PromptRecord[]> {
    return await this.historyManager.getIterationChain(recordId);
  }

  async testPromptStream(
    prompt: string,
    testInput: string,
    modelKey: string,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      this.validateInput(prompt, modelKey);
      this.validateInput(testInput, modelKey);

      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      const messages: Message[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: testInput }
      ];

      await this.llmService.sendMessageStream(messages, modelKey, callbacks);
      
      // 移除历史记录相关操作
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TestError(`测试失败: ${errorMessage}`, prompt, testInput);
    }
  }

  /**
   * 优化提示词（流式）
   */
  async optimizePromptStream(
    prompt: string,
    modelKey: string,
    template: string,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      this.validateInput(prompt, modelKey);

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new OptimizationError(
          `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_NOT_FOUND}`,
          prompt
        );
      }

      // 为了保持向后兼容，这里直接使用传入的template字符串
      // 构建消息
      const messages: Message[] = [
        { role: 'system', content: template },
        { role: 'user', content: prompt }
      ];

      // 使用流式调用
      let result = '';
      await this.llmService.sendMessageStream(
        messages,
        modelKey,
        {
          onToken: (token) => {
            result += token;
            callbacks.onToken(token);
          },
          onComplete: () => {
            // 验证响应
            this.validateResponse(result, prompt);
            callbacks.onComplete();
          },
          onError: callbacks.onError
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new OptimizationError(`优化失败: ${errorMessage}`, prompt);
    }
  }

  /**
   * 迭代优化提示词（流式）
   */
  async iteratePromptStream(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    template: { content: string | MessageTemplate[] } | string
  ): Promise<void> {
    try {
      this.validateInput(originalPrompt, modelKey);
      this.validateInput(lastOptimizedPrompt, modelKey);
      this.validateInput(iterateInput, modelKey);

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      let messages: Message[];

      // 处理不同类型的模板
      if (typeof template === 'string') {
        // 字符串模板，保持向后兼容
        messages = [
          { role: 'system', content: template },
          { role: 'user', content: `原始提示词：${originalPrompt}\n\n上一次优化版本：${lastOptimizedPrompt}\n\n优化需求：${iterateInput}` }
        ];
      } else if (template && template.content) {
        // Template对象，使用TemplateProcessor处理
        const templateObj = {
          id: 'temp',
          name: 'temp',
          content: template.content,
          metadata: { version: '1.0', lastModified: Date.now(), templateType: 'iterate' as const }
        };

        const context: TemplateContext = {
          originalPrompt,
          lastOptimizedPrompt,
          iterateInput
        };
        messages = TemplateProcessor.processTemplate(templateObj, context);
      } else {
        throw new IterationError('迭代失败: 未提供有效的提示词模板', originalPrompt, iterateInput);
      }

      // 使用流式调用
      let result = '';
      await this.llmService.sendMessageStream(
        messages,
        modelKey,
        {
          onToken: (token) => {
            result += token;
            handlers.onToken(token);
          },
          onComplete: () => {
            handlers.onComplete();
          },
          onError: handlers.onError
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IterationError(`迭代失败: ${errorMessage}`, originalPrompt, iterateInput);
    }
  }
}

// 导出工厂函数
export function createPromptService(
  modelManager: ModelManager = defaultModelManager,
  llmService: LLMService = createLLMService(modelManager),
  templateManager: TemplateManager = defaultTemplateManager,
  historyManager: HistoryManager = defaultHistoryManager
): PromptService {
  try {
    return new PromptService(modelManager, llmService, templateManager, historyManager);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Initialization failed: ${errorMessage}`);
  }
} 
