import { IPromptService, OptimizationRequest, PromptType } from './types';
import { Message, StreamHandlers } from '../llm/types';
import { PromptRecord } from '../history/types';
import { ModelManager, modelManager as defaultModelManager } from '../model/manager';
import { LLMService, createLLMService } from '../llm/service';
import { TemplateManager, templateManager as defaultTemplateManager } from '../template/manager';
import { HistoryManager, historyManager as defaultHistoryManager } from '../history/manager';
import { OptimizationError, IterationError, TestError, ServiceDependencyError } from './errors';
import { ERROR_MESSAGES } from '../llm/errors';
import { TemplateProcessor, TemplateContext } from '../template/processor';
import { DEFAULT_TEMPLATES as TEMPLATE_DEFAULTS } from '../template/defaults';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default template IDs used by the system
 */
const DEFAULT_TEMPLATES = {
  OPTIMIZE: 'general-optimize',
  ITERATE: 'iterate',
  TEST: 'test-prompt'
} as const;

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
        throw new OptimizationError('Optimization failed: LLM service returned empty result', prompt);
    }
  }

  /**
   * 优化提示词 - 支持提示词类型和增强功能
   */
  async optimizePrompt(request: OptimizationRequest): Promise<string> {
    try {
      this.validateOptimizationRequest(request);

      const modelConfig = await this.modelManager.getModel(request.modelKey);
      if (!modelConfig) {
        throw new OptimizationError('Model not found', request.targetPrompt);
      }

      const template = this.templateManager.getTemplate(
        request.templateId || this.getDefaultTemplateId('optimize', request.promptType)
      );

      if (!template?.content) {
        throw new OptimizationError('Template not found or invalid', request.targetPrompt);
      }

      const context: TemplateContext = {
        originalPrompt: request.targetPrompt,
        promptType: request.promptType
      };

      const messages = TemplateProcessor.processTemplate(template, context);
      const result = await this.llmService.sendMessage(messages, request.modelKey);

      this.validateResponse(result, request.targetPrompt);
      await this.saveOptimizationHistory(request, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new OptimizationError(`Optimization failed: ${errorMessage}`, request.targetPrompt);
    }
  }

  /**
   * 迭代优化提示词
   */
  async iteratePrompt(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    templateId?: string
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
        template = this.templateManager.getTemplate(templateId || DEFAULT_TEMPLATES.ITERATE);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new IterationError(`迭代失败: ${errorMessage}`, originalPrompt, iterateInput);
      }

      if (!template?.content) {
        throw new IterationError('Iteration failed: Template not found or invalid', originalPrompt, iterateInput);
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
        templateId: templateId || DEFAULT_TEMPLATES.ITERATE
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IterationError(`迭代失败: ${errorMessage}`, originalPrompt, iterateInput);
    }
  }

  /**
   * 测试提示词 - 支持可选系统提示词
   */
  async testPrompt(systemPrompt: string, userPrompt: string, modelKey: string): Promise<string> {
    try {
      // 对于用户提示词优化，systemPrompt 可以为空
      if (!userPrompt?.trim()) {
        throw new TestError('User prompt is required', systemPrompt, userPrompt);
      }
      if (!modelKey?.trim()) {
        throw new TestError('Model key is required', systemPrompt, userPrompt);
      }

      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new TestError('Model not found', systemPrompt, userPrompt);
      }

      const messages: Message[] = [];

      // 只有当 systemPrompt 不为空时才添加 system 消息
      if (systemPrompt?.trim()) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: userPrompt });

      const result = await this.llmService.sendMessage(messages, modelKey);

      // 保存历史记录
      await this.historyManager.addRecord({
        id: uuidv4(),
        originalPrompt: systemPrompt || userPrompt,
        optimizedPrompt: result,
        type: 'optimize',
        chainId: systemPrompt || userPrompt,
        version: 1,
        timestamp: Date.now(),
        modelKey,
        templateId: DEFAULT_TEMPLATES.TEST
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TestError(`Test failed: ${errorMessage}`, systemPrompt, userPrompt);
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

  /**
   * 测试提示词（流式）- 支持可选系统提示词
   */
  async testPromptStream(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      // 对于用户提示词优化，systemPrompt 可以为空
      if (!userPrompt?.trim()) {
        throw new TestError('User prompt is required', systemPrompt, userPrompt);
      }
      if (!modelKey?.trim()) {
        throw new TestError('Model key is required', systemPrompt, userPrompt);
      }

      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new TestError('Model not found', systemPrompt, userPrompt);
      }

      const messages: Message[] = [];

      // 只有当 systemPrompt 不为空时才添加 system 消息
      if (systemPrompt?.trim()) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: userPrompt });

      await this.llmService.sendMessageStream(messages, modelKey, callbacks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TestError(`Test failed: ${errorMessage}`, systemPrompt, userPrompt);
    }
  }

  /**
   * 优化提示词（流式）- 支持提示词类型和增强功能
   */
  async optimizePromptStream(
    request: OptimizationRequest,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      this.validateOptimizationRequest(request);

      const modelConfig = await this.modelManager.getModel(request.modelKey);
      if (!modelConfig) {
        throw new OptimizationError('Model not found', request.targetPrompt);
      }

      const template = this.templateManager.getTemplate(
        request.templateId || this.getDefaultTemplateId('optimize', request.promptType)
      );

      if (!template?.content) {
        throw new OptimizationError('Template not found or invalid', request.targetPrompt);
      }

      const context: TemplateContext = {
        originalPrompt: request.targetPrompt,
        promptType: request.promptType
      };

      const messages = TemplateProcessor.processTemplate(template, context);

      let result = '';
      await this.llmService.sendMessageStream(
        messages,
        request.modelKey,
        {
          onToken: (token) => {
            result += token;
            callbacks.onToken(token);
          },
          onComplete: async () => {
            this.validateResponse(result, request.targetPrompt);
            await this.saveOptimizationHistory(request, result);
            callbacks.onComplete();
          },
          onError: callbacks.onError
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new OptimizationError(`Optimization failed: ${errorMessage}`, request.targetPrompt);
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
    templateId: string
  ): Promise<void> {
    try {
      this.validateInput(originalPrompt, modelKey);
      this.validateInput(lastOptimizedPrompt, modelKey);
      this.validateInput(iterateInput, modelKey);

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey);
      if (!modelConfig) {
        throw new ServiceDependencyError('Model not found', 'ModelManager');
      }

      // 获取迭代提示词
      let template;
      try {
        template = this.templateManager.getTemplate(templateId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new IterationError(`Iteration failed: ${errorMessage}`, originalPrompt, iterateInput);
      }

      if (!template?.content) {
        throw new IterationError('Iteration failed: Template not found or invalid', originalPrompt, iterateInput);
      }

      // 使用TemplateProcessor处理模板和变量替换
      const context: TemplateContext = {
        originalPrompt,
        lastOptimizedPrompt,
        iterateInput
      };
      const messages = TemplateProcessor.processTemplate(template, context);

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
      throw new IterationError(`Iteration failed: ${errorMessage}`, originalPrompt, iterateInput);
    }
  }

  // === 新增：支持提示词类型的增强方法 ===

  /**
   * 验证优化请求参数
   */
  private validateOptimizationRequest(request: OptimizationRequest) {
    if (!request.targetPrompt?.trim()) {
      throw new OptimizationError('Target prompt is required', '');
    }
    if (!request.modelKey?.trim()) {
      throw new OptimizationError('Model key is required', request.targetPrompt);
    }
    // 用户提示词优化时，contextPrompt 是可选的
    // 不再强制要求 contextPrompt
  }

  /**
   * 获取默认模板ID
   */
  private getDefaultTemplateId(templateType: 'optimize' | 'iterate', promptType: PromptType): string {
    // 尝试获取特定类型的模板
    try {
      // 根据promptType确定实际的templateType
      let actualTemplateType: 'optimize' | 'userOptimize' | 'iterate';
      if (templateType === 'optimize') {
        actualTemplateType = promptType === 'user' ? 'userOptimize' : 'optimize';
      } else {
        actualTemplateType = 'iterate';
      }

      const templates = this.templateManager.listTemplatesByType(actualTemplateType);
      if (templates.length > 0) {
        return templates[0].id;
      }
    } catch (error) {
      console.warn(`Failed to get templates for type ${templateType}:${promptType}`, error);
    }

    // 回退到通用模板ID
    if (templateType === 'optimize') {
      // 对于用户提示词优化，优先使用用户提示词优化模板
      if (promptType === 'user' && TEMPLATE_DEFAULTS['user-prompt-optimize']) {
        return 'user-prompt-optimize';
      }
      // 回退到通用优化模板
      return 'general-optimize';
    } else {
      // 迭代使用通用迭代模板，不区分提示词类型
      return 'iterate';
    }
  }

  /**
   * 保存优化历史记录
   */
  private async saveOptimizationHistory(request: OptimizationRequest, result: string) {
    await this.historyManager.addRecord({
      id: uuidv4(),
      originalPrompt: request.targetPrompt,
      optimizedPrompt: result,
      type: 'optimize',
      chainId: uuidv4(),
      version: 1,
      timestamp: Date.now(),
      modelKey: request.modelKey,
      templateId: request.templateId || this.getDefaultTemplateId('optimize', request.promptType),
      metadata: {
        promptType: request.promptType
      }
    });
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
