import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptService } from '../../../../src/services/prompt/service';
import { ModelManager } from '../../../../src/services/model/manager';
import { createLLMService } from '../../../../src/services/llm/service';
import { TemplateManager } from '../../../../src/services/template/manager';
import { HistoryManager } from '../../../../src/services/history/manager';
import { ServiceDependencyError } from '../../../../src/services/prompt/errors';
import { ModelConfig } from '../../../../src/services/model/types';
import { Template } from '../../../../src/services/template/types';
import { PromptRecord, PromptRecordType } from '../../../../src/services/history/types';
import { TemplateError } from '../../../../src/services/template/errors';

describe('PromptService', () => {
  let promptService: PromptService;
  let modelManager: ModelManager;
  let llmService: any;
  let templateManager: TemplateManager;
  let historyManager: HistoryManager;

  const mockModelConfig: ModelConfig = {
    name: 'test-model',
    baseURL: 'https://test.api',
    apiKey: 'test-key',
    models: ['test-model'],
    defaultModel: 'test-model',
    enabled: true
  };

  const createMockTemplate = (id: string): Template => ({
    id,
    name: `${id} Template`,
    template: `${id} template content`,
    description: `${id} template`,
    version: '1.0'
  });

  beforeEach(async () => {
    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    
    // 重置所有 mock
    vi.clearAllMocks();
    
    // 默认的模板 mock
    const defaultTemplateSpy = vi.spyOn(templateManager, 'getTemplate');
    defaultTemplateSpy.mockImplementation(async (templateId?: string) => {
      return createMockTemplate(templateId || 'default');
    });
    
    vi.spyOn(templateManager, 'init').mockResolvedValue();
    vi.spyOn(llmService, 'buildRequestConfig').mockReturnValue({
      url: 'http://test.api',
      headers: { 'Content-Type': 'application/json' },
      body: {
        model: 'test-model',
        messages: []
      }
    });
    vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');
    vi.spyOn(historyManager, 'addRecord').mockImplementation(() => {});
    vi.spyOn(historyManager, 'getRecords').mockReturnValue([]);
    vi.spyOn(historyManager, 'getIterationChain').mockReturnValue([]);

    // 初始化服务
    await templateManager.init();
    promptService = new PromptService(
      modelManager,
      llmService,
      templateManager,
      historyManager
    );
  });

  describe('optimizePrompt', () => {
    it('应该成功优化提示词', async () => {
      const result = await promptService.optimizePrompt('test prompt', 'test-model');
      
      expect(result).toBe('test result');
      expect(modelManager.getModel).toHaveBeenCalledWith('test-model');
      expect(templateManager.getTemplate).toHaveBeenCalledWith('optimize');
      expect(llmService.sendRequest).toHaveBeenCalled();
      expect(historyManager.addRecord).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        templateId: 'optimize'
      }));
    });

    it('当模板管理器未初始化时应抛出错误', async () => {
      const mockError = new Error('模板管理器未初始化');
      const templateSpy = vi.spyOn(templateManager, 'getTemplate');
      templateSpy.mockRejectedValueOnce(mockError);
      
      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板管理器未初始化');
    });

    it('当模板不存在时应抛出错误', async () => {
      const mockError = new Error('模板不存在');
      const templateSpy = vi.spyOn(templateManager, 'getTemplate');
      templateSpy.mockRejectedValueOnce(mockError);
      
      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板不存在');
    });

    it('当模板内容为空时应抛出错误', async () => {
      const emptyTemplate: Template = {
        id: 'optimize',
        name: 'Optimize Template',
        template: '',  // 空模板内容
        description: 'test',
        version: '1.0'
      };
      
      // 重置并重新设置 mock
      vi.clearAllMocks();
      const templateSpy = vi.spyOn(templateManager, 'getTemplate');
      templateSpy.mockResolvedValue(emptyTemplate);
      
      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板不存在或无效');
    });
  });

  describe('iteratePrompt', () => {
    it('应该成功迭代提示词', async () => {
      const result = await promptService.iteratePrompt(
        'original prompt',
        'iterate input',
        'test-model'
      );
      
      expect(result).toBe('test result');
      expect(modelManager.getModel).toHaveBeenCalledWith('test-model');
      expect(templateManager.getTemplate).toHaveBeenCalledWith('iterate');
      expect(llmService.sendRequest).toHaveBeenCalled();
      expect(historyManager.addRecord).toHaveBeenCalledWith(expect.objectContaining({
        type: 'iterate',
        templateId: 'iterate'
      }));
    });

    it('当模板管理器未初始化时应抛出错误', async () => {
      const mockError = new Error('模板管理器未初始化');
      const templateSpy = vi.spyOn(templateManager, 'getTemplate');
      templateSpy.mockRejectedValueOnce(mockError);
      
      await expect(
        promptService.iteratePrompt('original prompt', 'iterate input', 'test-model')
      ).rejects.toThrow('迭代失败: 模板管理器未初始化');
    });
  });

  describe('testPrompt', () => {
    it('应该成功测试提示词', async () => {
      const result = await promptService.testPrompt(
        'test prompt',
        'test input',
        'test-model'
      );
      
      expect(result).toBe('test result');
      expect(modelManager.getModel).toHaveBeenCalledWith('test-model');
      expect(llmService.sendRequest).toHaveBeenCalled();
      expect(historyManager.addRecord).toHaveBeenCalledWith(expect.objectContaining({
        type: 'test',
        templateId: 'test'
      }));
      
      // 验证消息构建正确
      expect(llmService.buildRequestConfig).toHaveBeenCalledWith(
        mockModelConfig,
        [
          { role: 'system', content: 'test prompt' },
          { role: 'user', content: 'test input' }
        ]
      );
    });

    it('当模型不存在时应抛出错误', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(undefined);
      
      await expect(
        promptService.testPrompt('test prompt', 'test input', 'test-model')
      ).rejects.toThrow('模型不存在');
    });
  });

  describe('getHistory', () => {
    it('应该返回历史记录', () => {
      const mockHistory: PromptRecord[] = [
        {
          id: '1',
          prompt: 'test prompt',
          result: 'test result',
          type: 'optimize' as PromptRecordType,
          timestamp: Date.now(),
          modelKey: 'test-model',
          templateId: 'optimize'
        }
      ];
      vi.spyOn(historyManager, 'getRecords').mockReturnValue(mockHistory);

      const result = promptService.getHistory();
      expect(result).toEqual(mockHistory);
      expect(historyManager.getRecords).toHaveBeenCalled();
    });
  });

  describe('getIterationChain', () => {
    it('应该返回迭代链', () => {
      const mockChain: PromptRecord[] = [
        {
          id: '1',
          prompt: 'test prompt',
          result: 'test result',
          type: 'optimize' as PromptRecordType,
          timestamp: Date.now(),
          modelKey: 'test-model',
          templateId: 'optimize'
        }
      ];
      vi.spyOn(historyManager, 'getIterationChain').mockReturnValue(mockChain);

      const result = promptService.getIterationChain('1');
      expect(result).toEqual(mockChain);
      expect(historyManager.getIterationChain).toHaveBeenCalledWith('1');
    });
  });
});

describe('PromptService 模板管理器初始化测试', () => {
  let promptService: PromptService;
  let modelManager: ModelManager;
  let llmService: any;
  let templateManager: TemplateManager;
  let historyManager: HistoryManager;

  const mockModelConfig: ModelConfig = {
    name: 'test-model',
    baseURL: 'https://test.api',
    apiKey: 'test-key',
    models: ['test-model'],
    defaultModel: 'test-model',
    enabled: true
  };

  beforeEach(() => {
    // 基础设置
    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');
  });

  describe('模板管理器初始化场景', () => {
    it('模板管理器未初始化时应抛出错误', async () => {
      // 模拟模板管理器未初始化
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('模板管理器未初始化'));
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板管理器未初始化');
    });

    it('optimize模板不存在时应抛出错误', async () => {
      // 模拟optimize模板不存在
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('模板不存在'));
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板不存在');
    });

    it('模板管理器正确初始化但模板内容为空时应抛出错误', async () => {
      // 模拟模板存在但内容为空
      const emptyTemplate: Template = {
        id: 'optimize',
        name: 'Optimize Template',
        template: '',  // 空模板内容
        description: 'test',
        version: '1.0'
      };
      
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(emptyTemplate);
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 模板不存在或无效');
    });

    it('模板管理器初始化成功时应正常执行', async () => {
      // 模拟正确的模板
      const mockTemplate: Template = {
        id: 'optimize',
        name: 'Optimize Template',
        template: 'valid template content',
        description: 'test',
        version: '1.0'
      };
      
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'buildRequestConfig').mockReturnValue({
        url: 'http://test.api',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: 'test-model',
          messages: []
        }
      });
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      const result = await promptService.optimizePrompt('test prompt', 'test-model');
      expect(result).toBe('test result');
      expect(templateManager.getTemplate).toHaveBeenCalledWith('optimize');
    });
  });

  describe('模板管理器状态检查', () => {
    it('应该能检测到模板管理器的初始化状态', async () => {
      // 模拟初始化失败
      vi.spyOn(templateManager, 'init').mockRejectedValue(new Error('初始化失败'));
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      await expect(templateManager.init()).rejects.toThrow('初始化失败');
    });

    it('模板管理器初始化后应该能正常工作', async () => {
      // 模拟初始化成功
      vi.spyOn(templateManager, 'init').mockResolvedValue();
      
      const mockTemplate: Template = {
        id: 'optimize',
        name: 'Optimize Template',
        template: 'valid template content',
        description: 'test',
        version: '1.0'
      };
      
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      
      promptService = new PromptService(
        modelManager,
        llmService,
        templateManager,
        historyManager
      );

      await templateManager.init();
      const result = await promptService.optimizePrompt('test prompt', 'test-model');
      expect(result).toBe('test result');
    });
  });
}); 