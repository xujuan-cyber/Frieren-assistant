import { IPromptService } from './types';
import { Message, StreamHandlers } from '../llm/types';
import { PromptRecord } from '../history/types';
import { ModelManager, modelManager as defaultModelManager } from '../model/manager';
import { LLMService, createLLMService } from '../llm/service';
import { TemplateManager, templateManager as defaultTemplateManager } from '../template/manager';
import { HistoryManager, historyManager as defaultHistoryManager } from '../history/manager';
import { OptimizationError, IterationError, TestError, ServiceDependencyError } from './errors';
import { ERROR_MESSAGES } from '../llm/errors';

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
      throw new ServiceDependencyError('模板管理器未初始化', 'TemplateManager');
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

    if (prompt.length > 5000) {
      throw new OptimizationError(
        `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: 提示词长度超过限制（最大5000字符）`,
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
      // 前置验证
      this.validateInput(prompt, modelKey);
      
      // 获取模型配置（使用统一错误）
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new OptimizationError(
          `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_NOT_FOUND}`,
          prompt
        );
      }

      // 获取优化模板
      let template;
      try {
        template = await this.templateManager.getTemplate('optimize');
      } catch (error) {
        // 包装错误消息
        throw new OptimizationError(`优化失败: ${error.message}`, prompt);
      }

      if (!template?.template) {
        throw new OptimizationError('优化失败: 模板不存在或无效', prompt);
      }

      // 构建消息
      const messages: Message[] = [
        { role: 'system', content: template.template },
        { role: 'user', content: prompt }
      ];

      // 构建请求配置
      const requestConfig = this.llmService.buildRequestConfig(modelConfig, messages);

      // 发送请求
      const result = await this.llmService.sendRequest(requestConfig);

      // 验证响应
      this.validateResponse(result, prompt);

      // 保存历史记录
      this.historyManager.addRecord({
        id: Date.now().toString(),
        prompt,
        result,
        type: 'optimize',
        timestamp: Date.now(),
        modelKey,
        templateId: 'optimize'
      });

      return result;
    } catch (error) {
      // 统一错误处理
      if (error instanceof OptimizationError) {
        throw error;
      }
      throw new OptimizationError(
        `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${error.message}`,
        prompt
      );
    }
  }

  /**
   * 迭代优化提示词
   */
  async iteratePrompt(
    originalPrompt: string,
    iterateInput: string,
    modelKey: string
  ): Promise<string> {
    try {
      // 获取模型配置
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      // 获取迭代模板
      let template;
      try {
        template = await this.templateManager.getTemplate('iterate');
      } catch (error) {
        // 包装错误消息
        throw new IterationError(`迭代失败: ${error.message}`, originalPrompt, iterateInput);
      }

      if (!template?.template) {
        throw new IterationError('迭代失败: 模板不存在或无效', originalPrompt, iterateInput);
      }

      // 构建消息
      const messages: Message[] = [
        { role: 'system', content: template.template },
        { role: 'user', content: `原始提示词：${originalPrompt}\n\n优化需求：${iterateInput}` }
      ];

      // 构建请求配置
      const requestConfig = this.llmService.buildRequestConfig(modelConfig, messages);

      // 发送请求
      const result = await this.llmService.sendRequest(requestConfig);

      // 保存历史记录
      this.historyManager.addRecord({
        id: Date.now().toString(),
        prompt: iterateInput,
        result,
        type: 'iterate',
        parentId: originalPrompt,
        timestamp: Date.now(),
        modelKey,
        templateId: 'iterate'
      });

      return result;
    } catch (error) {
      if (error instanceof IterationError) {
        throw error;
      }
      throw new IterationError(
        `迭代失败: ${error.message}`,
        originalPrompt,
        iterateInput
      );
    }
  }

  /**
   * 测试提示词
   */
  async testPrompt(
    prompt: string,
    testInput: string,
    modelKey: string
  ): Promise<string> {
    try {
      // 获取模型配置
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      // 构建消息
      const messages: Message[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: testInput }
      ];

      // 构建请求配置
      const requestConfig = this.llmService.buildRequestConfig(modelConfig, messages);

      // 发送请求
      const result = await this.llmService.sendRequest(requestConfig);

      // 保存历史记录
      this.historyManager.addRecord({
        id: Date.now().toString(),
        prompt: testInput,
        result,
        type: 'test',
        parentId: prompt,
        timestamp: Date.now(),
        modelKey,
        templateId: 'test'
      });

      return result;
    } catch (error) {
      if (error instanceof TestError) {
        throw error;
      }
      throw new TestError(
        `测试失败: ${error.message}`,
        prompt,
        testInput
      );
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(): PromptRecord[] {
    return this.historyManager.getRecords();
  }

  /**
   * 获取迭代链
   */
  getIterationChain(recordId: string): PromptRecord[] {
    return this.historyManager.getIterationChain(recordId);
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
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      const messages: Message[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: testInput }
      ];

      await this.llmService.sendMessageStream(messages, modelKey, callbacks);

      // 完成后保存历史记录
      this.historyManager.addRecord({
        id: Date.now().toString(),
        prompt: testInput,
        result: '流式响应',  // 可以考虑在回调中收集完整响应
        type: 'test',
        parentId: prompt,
        timestamp: Date.now(),
        modelKey,
        templateId: 'test'
      });
    } catch (error) {
      if (error instanceof TestError) {
        throw error;
      }
      throw new TestError(
        `测试失败: ${error.message}`,
        prompt,
        testInput
      );
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
      // 前置验证
      this.validateInput(prompt, modelKey);
      
      // 获取模型配置
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new OptimizationError(
          `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_NOT_FOUND}`,
          prompt
        );
      }

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

            // 保存历史记录
            this.historyManager.addRecord({
              id: Date.now().toString(),
              prompt,
              result,
              type: 'optimize',
              timestamp: Date.now(),
              modelKey,
              templateId: 'optimize'
            });

            callbacks.onComplete();
          },
          onError: callbacks.onError
        }
      );
    } catch (error) {
      if (error instanceof OptimizationError) {
        callbacks.onError(error);
        throw error;
      }
      const wrappedError = new OptimizationError(
        `${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${error.message}`,
        prompt
      );
      callbacks.onError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * 迭代优化提示词（流式）
   */
  async iteratePromptStream(
    originalPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    template?: string
  ): Promise<void> {
    try {
      // 获取模型配置
      const modelConfig = this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      }

      // 获取迭代模板
      let templateToUse;
      if (template) {
        templateToUse = template;
      } else {
        templateToUse = await this.templateManager.getTemplate('iterate');
      }

      if (!templateToUse?.content) {
        throw new IterationError('迭代失败: 模板不存在或无效', originalPrompt, iterateInput);
      }

      // 构建消息
      const messages: Message[] = [
        {
          role: 'system',
          content: templateToUse.content
        },
        { role: 'user', content: `原始提示词：${originalPrompt}\n\n优化需求：${iterateInput}` }
      ];

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
            // 保存历史记录
            this.historyManager.addRecord({
              id: Date.now().toString(),
              prompt: iterateInput,
              result,
              type: 'iterate',
              parentId: originalPrompt,
              timestamp: Date.now(),
              modelKey,
              templateId: 'iterate'
            });

            handlers.onComplete();
          },
          onError: handlers.onError
        }
      );
    } catch (error) {
      if (error instanceof IterationError) {
        handlers.onError(error);
        throw error;
      }
      const wrappedError = new IterationError(
        `迭代失败: ${error.message}`,
        originalPrompt,
        iterateInput
      );
      handlers.onError(wrappedError);
      throw wrappedError;
    }
  }
}

// 导出工厂函数
export async function createPromptService(
  modelManager: ModelManager = defaultModelManager,
  llmService: LLMService = createLLMService(modelManager),
  templateManager: TemplateManager = defaultTemplateManager,
  historyManager: HistoryManager = defaultHistoryManager
): Promise<PromptService> {
  try {
    // 初始化依赖服务
    await templateManager.init();
    await historyManager.init();

    // 创建并返回服务实例
    return new PromptService(
      modelManager,
      llmService,
      templateManager,
      historyManager
    );
  } catch (error) {
    console.error('创建 PromptService 失败:', error);
    throw new ServiceDependencyError(
      `模板管理器初始化失败: ${error.message}`,
      'TemplateManager'
    );
  }
} 
