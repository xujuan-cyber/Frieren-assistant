import { vi, describe, beforeEach, it, expect } from 'vitest'
import { 
  createLLMService, 
  LLMService, 
  ModelManager, 
  PromptService, 
  TemplateManager, 
  HistoryManager,
  ModelConfig,
  Template,
  PromptRecord,
  OptimizationError,
  IterationError,
  TestError,
  APIError,
  TemplateError
} from '../../../src'

// 模拟 fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PromptService', () => {
  let promptService: PromptService;
  let modelManager: ModelManager;
  let llmService: LLMService;
  let templateManager: TemplateManager;
  let historyManager: HistoryManager;

  const mockModelConfig: ModelConfig = {
    name: 'test-model',
    baseURL: 'https://test.api',
    apiKey: 'test-key',
    models: ['test-model'],
    defaultModel: 'test-model',
    enabled: true,
    provider: 'openai'
  };

  const mockTemplate: Template = {
    id: 'general-optimize',
    name: 'Test Template',
    content: 'test template content',
    metadata: {
      version: '1.0',
      lastModified: Date.now(),
      templateType: 'optimize' as const
    }
  };

  beforeEach(() => {
    // 重置所有mock
    mockFetch.mockReset();
    vi.clearAllMocks();

    // 模拟提示词索引请求
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(['optimize.yaml'])
    });

    // 模拟提示词内容请求
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockTemplate))
    });

    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    vi.spyOn(llmService, 'sendMessage').mockResolvedValue(JSON.stringify({ content: 'test result' }));

    // 初始化管理器
    promptService = new PromptService(modelManager, llmService, templateManager, historyManager);
  });

  describe('optimizePrompt', () => {
    it('应该成功优化提示词', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('优化后的提示词');

      const result = await promptService.optimizePrompt('test prompt', 'test-model');
      expect(result).toBe('优化后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
        throw new Error('提示词管理器未初始化');
      });

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当提示词不存在时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
        throw new Error('提示词不存在');
      });

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当提示词内容为空时应抛出错误', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        content: ''
      };
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(emptyTemplate);

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });
  });

  describe('iteratePrompt', () => {
    it('应该成功迭代提示词', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('迭代后的提示词');

      const result = await promptService.iteratePrompt('test prompt', 'test input', 'test-model');
      expect(result).toBe('迭代后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
        throw new Error('提示词管理器未初始化');
      });

      await expect(promptService.iteratePrompt('test prompt', 'test input', 'test-model'))
        .rejects
        .toThrow(IterationError);
    });
  });

  describe('testPrompt', () => {
    it('应该成功测试提示词', async () => {
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('测试结果');

      const result = await promptService.testPrompt('test prompt', 'test input', 'test-model');
      expect(result).toBe('测试结果');
    });

    it('当模型不存在时应抛出错误', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(undefined);

      await expect(promptService.testPrompt('test prompt', 'test input', 'test-model'))
        .rejects
        .toThrow(TestError);
    });
  });

  describe('getHistory', () => {
    it('应该返回历史记录', () => {
      const mockHistory: PromptRecord[] = [{
        id: '1',
        originalPrompt: 'test prompt',
        optimizedPrompt: 'test result',
        type: 'optimize',
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'test',
        chainId: 'test-chain',
        version: 1
      }];
      vi.spyOn(historyManager, 'getRecords').mockReturnValue(mockHistory);

      const history = promptService.getHistory();
      expect(history).toEqual(mockHistory);
    });
  });

  describe('getIterationChain', () => {
    it('应该返回迭代链', () => {
      const mockChain: PromptRecord[] = [{
        id: '1',
        originalPrompt: 'test prompt',
        optimizedPrompt: 'test result',
        type: 'iterate',
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'test',
        chainId: 'test-chain',
        version: 1
      }];
      vi.spyOn(historyManager, 'getIterationChain').mockReturnValue(mockChain);

      const chain = promptService.getIterationChain('test prompt');
      expect(chain).toEqual(mockChain);
    });
  });

  describe('边界条件测试', () => {
    it('当提示词为空字符串时应抛出错误', async () => {
      await expect(promptService.optimizePrompt('', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当模型Key为空时应抛出错误', async () => {
      await expect(promptService.optimizePrompt('test prompt', ''))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当LLM服务返回空结果时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('');

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当LLM服务超时时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockRejectedValue(new APIError('请求超时'));

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow(OptimizationError);
    });
  });

  describe('历史记录管理测试', () => {
    it('应该正确记录优化历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('优化结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.optimizePrompt('test prompt', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        originalPrompt: 'test prompt',
        optimizedPrompt: '优化结果',
        modelKey: 'test-model',
        templateId: 'optimize'
      }));
    });

    it('应该正确记录迭代历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('迭代结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.iteratePrompt('test prompt', 'test input', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'iterate',
        originalPrompt: 'test input',
        optimizedPrompt: '迭代结果',
        modelKey: 'test-model',
        templateId: 'iterate',
        previousId: 'test prompt',
        chainId: 'test prompt'
      }));
    });

    it('应该正确记录测试历史', async () => {
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('测试结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.testPrompt('test prompt', 'test input', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        originalPrompt: 'test prompt',
        optimizedPrompt: '测试结果',
        modelKey: 'test-model',
        templateId: 'test'
      }));
    });
  });

  describe('提示词管理器初始化测试', () => {
    describe('提示词管理器初始化场景', () => {
      it('提示词管理器未初始化时应抛出错误', async () => {
        // 创建一个未初始化的模板管理器
        templateManager = new TemplateManager();
        // 模拟getTemplate方法抛出错误
        vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
          throw new Error('提示词管理器未初始化');
        });
        
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        await expect(promptService.optimizePrompt('test', 'test-model'))
          .rejects
          .toThrow(OptimizationError);
      });

      it('optimize提示词不存在时应抛出错误', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
          throw new Error('提示词不存在');
        });
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        await expect(promptService.optimizePrompt('test', 'test-model'))
          .rejects
          .toThrow(OptimizationError);
      });

      it('提示词管理器正确初始化但提示词内容为空时应抛出错误', async () => {
        const emptyTemplate = { ...mockTemplate, content: '' };
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(emptyTemplate);
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        await expect(promptService.optimizePrompt('test', 'test-model'))
          .rejects
          .toThrow(OptimizationError);
      });

      it('提示词管理器初始化成功时应正常执行', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
        vi.spyOn(llmService, 'sendMessage').mockResolvedValue('test result');
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const result = await promptService.optimizePrompt('test', 'test-model');
        expect(result).toBe('test result');
      });
    });

    describe('提示词管理器状态检查', () => {
      it('应该能检测到提示词管理器的初始化状态', () => {
        templateManager = new TemplateManager();
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        expect(() => {
           templateManager.getTemplate('non-existent-template');
        }).toThrow(/提示词 non-existent-template 不存在/);
      });

      it('提示词管理器初始化后应该能正常工作', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
        vi.spyOn(llmService, 'sendMessage').mockResolvedValue('test result');
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const result = await promptService.optimizePrompt('test', 'test-model');
        expect(result).toBe('test result');
      });
    });
  });
});