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
  MessageTemplate,
  PromptRecord,
  PromptRecordType,
  OptimizationError,
  IterationError,
  TestError,
  APIError,
  TemplateError,
  ServiceDependencyError
} from '../../../src'
import { createMockStorage } from '../../mocks/mockStorage';

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

  const mockIterateTemplate: Template = {
    id: 'iterate',
    name: 'Iterate Template',
    content: [
      {
        role: 'system',
        content: 'You are a prompt optimizer.'
      },
      {
        role: 'user',
        content: 'Original: {{originalPrompt}}\n\nImprove: {{iterateInput}}'
      }
    ] as MessageTemplate[],
    metadata: {
      version: '1.0',
      lastModified: Date.now(),
      templateType: 'iterate' as const
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

    const mockStorage = createMockStorage();
    modelManager = new ModelManager(mockStorage);
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager(mockStorage);
    historyManager = new HistoryManager(mockStorage);

    vi.spyOn(modelManager, 'getModel').mockResolvedValue(mockModelConfig);
    vi.spyOn(llmService, 'sendMessage').mockResolvedValue(JSON.stringify({ content: 'test result' }));

    // 初始化管理器
    promptService = new PromptService(modelManager, llmService, templateManager, historyManager);
  });

  describe('optimizePrompt', () => {
    it('应该成功优化提示词', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('优化后的提示词');

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      const result = await promptService.optimizePrompt(request);
      expect(result).toBe('优化后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
        throw new Error('提示词管理器未初始化');
      });

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
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
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockIterateTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('迭代后的提示词');

      const result = await promptService.iteratePrompt('test prompt', 'last optimized prompt', 'test input', 'test-model');
      expect(result).toBe('迭代后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
        throw new Error('提示词管理器未初始化');
      });

      await expect(promptService.iteratePrompt('test prompt', 'last optimized prompt', 'test input', 'test-model'))
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
      vi.spyOn(llmService, 'sendMessage').mockImplementation(() => {
        throw new ServiceDependencyError('模型不存在', 'ModelManager');
      });

      await expect(
        promptService.testPrompt('test prompt', 'test input', 'test-model')
      ).rejects.toThrow(TestError);
    });
  });

  describe('getHistory', () => {
    it('应该返回历史记录', async () => {
      const mockHistory: PromptRecord[] = [
        {
          id: '1',
          chainId: 'test-chain',
          originalPrompt: 'test prompt',
          optimizedPrompt: 'test result',
          templateId: 'test',
          modelKey: 'test-model',
          timestamp: expect.any(Number),
          type: 'optimize' as PromptRecordType,
          version: 1
        }
      ];

      vi.spyOn(historyManager, 'getRecords').mockResolvedValue(mockHistory);

      const history = await promptService.getHistory();
      expect(history).toEqual(mockHistory);
    });
  });

  describe('getIterationChain', () => {
    it('应该返回迭代链', async () => {
      const mockChain: PromptRecord[] = [
        {
          id: '1',
          chainId: 'test-chain',
          originalPrompt: 'test prompt',
          optimizedPrompt: 'test result',
          templateId: 'test',
          modelKey: 'test-model',
          timestamp: expect.any(Number),
          type: 'iterate' as PromptRecordType,
          version: 1
        }
      ];

      vi.spyOn(historyManager, 'getIterationChain').mockResolvedValue(mockChain);

      const chain = await promptService.getIterationChain('test-chain');
      expect(chain).toEqual(mockChain);
    });
  });

  describe('边界条件测试', () => {
    it('当提示词为空字符串时应抛出错误', async () => {
      const request = {
        promptType: 'system' as const,
        targetPrompt: '',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当模型Key为空时应抛出错误', async () => {
      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: ''
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当LLM服务返回空结果时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('');

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当LLM服务超时时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockRejectedValue(new APIError('请求超时'));

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });
  });

  describe('历史记录管理测试', () => {
    it('应该正确记录优化历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('优化结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await promptService.optimizePrompt(request);

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        originalPrompt: 'test prompt',
        optimizedPrompt: '优化结果',
        modelKey: 'test-model'
      }));
    });

    it('应该正确记录迭代历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockIterateTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('迭代结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.iteratePrompt('test prompt', 'last optimized prompt', 'test input', 'test-model');

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
        modelKey: 'test-model'
      }));
    });
  });

  describe('提示词管理器初始化测试', () => {
    describe('提示词管理器初始化场景', () => {
      it('提示词管理器未初始化时应抛出错误', async () => {
        // 创建一个未初始化的模板管理器
        const mockStorage = createMockStorage();
        templateManager = new TemplateManager(mockStorage);
        // 模拟getTemplate方法抛出错误
        vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
          throw new Error('提示词管理器未初始化');
        });
        
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const request = {
          promptType: 'system' as const,
          targetPrompt: 'test',
          modelKey: 'test-model'
        };
        await expect(promptService.optimizePrompt(request))
          .rejects
          .toThrow(OptimizationError);
      });

      it('optimize提示词不存在时应抛出错误', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockImplementation(() => {
          throw new Error('提示词不存在');
        });
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const request = {
          promptType: 'system' as const,
          targetPrompt: 'test',
          modelKey: 'test-model'
        };
        await expect(promptService.optimizePrompt(request))
          .rejects
          .toThrow(OptimizationError);
      });

      it('提示词管理器正确初始化但提示词内容为空时应抛出错误', async () => {
        const emptyTemplate = { ...mockTemplate, content: '' };
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(emptyTemplate);
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const request = {
          promptType: 'system' as const,
          targetPrompt: 'test',
          modelKey: 'test-model'
        };
        await expect(promptService.optimizePrompt(request))
          .rejects
          .toThrow(OptimizationError);
      });

      it('提示词管理器初始化成功时应正常执行', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
        vi.spyOn(llmService, 'sendMessage').mockResolvedValue('test result');
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const request = {
          promptType: 'system' as const,
          targetPrompt: 'test',
          modelKey: 'test-model'
        };
        const result = await promptService.optimizePrompt(request);
        expect(result).toBe('test result');
      });
    });

    describe('提示词管理器状态检查', () => {
      it('应该能检测到提示词管理器的初始化状态', async () => {
        // 确保模板管理器已初始化
        await templateManager.ensureInitialized();
        
        expect(() => {
          templateManager.getTemplate('non-existent-template');
        }).toThrow('Template non-existent-template not found');
      });

      it('提示词管理器初始化后应该能正常工作', async () => {
        vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
        vi.spyOn(llmService, 'sendMessage').mockResolvedValue('test result');
        promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

        const request = {
          promptType: 'system' as const,
          targetPrompt: 'test',
          modelKey: 'test-model'
        };
        const result = await promptService.optimizePrompt(request);
        expect(result).toBe('test result');
      });
    });
  });

  describe('异步操作失败测试', () => {
    it('当addRecord失败时optimizePrompt应该抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('优化结果');
      vi.spyOn(historyManager, 'addRecord').mockRejectedValue(new Error('Storage failed'));

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当addRecord失败时iteratePrompt应该抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockReturnValue(mockTemplate);
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('迭代结果');
      vi.spyOn(historyManager, 'addRecord').mockRejectedValue(new Error('Storage failed'));

      await expect(promptService.iteratePrompt('test prompt', 'last optimized prompt', 'test input', 'test-model'))
        .rejects
        .toThrow(IterationError);
    });

    it('当addRecord失败时testPrompt应该抛出错误', async () => {
      vi.spyOn(llmService, 'sendMessage').mockResolvedValue('测试结果');
      vi.spyOn(historyManager, 'addRecord').mockRejectedValue(new Error('Storage failed'));

      await expect(promptService.testPrompt('test prompt', 'test input', 'test-model'))
        .rejects
        .toThrow(TestError);
    });

    it('当getModel失败时optimizePrompt应该抛出错误', async () => {
      vi.spyOn(modelManager, 'getModel').mockRejectedValue(new Error('Model fetch failed'));

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当getModel返回null时应该抛出错误', async () => {
      vi.spyOn(modelManager, 'getModel').mockResolvedValue(undefined);

      const request = {
        promptType: 'system' as const,
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      };
      await expect(promptService.optimizePrompt(request))
        .rejects
        .toThrow(OptimizationError);
    });

    it('当getRecords失败时getHistory应该抛出错误', async () => {
      vi.spyOn(historyManager, 'getRecords').mockRejectedValue(new Error('Storage read failed'));

      await expect(promptService.getHistory())
        .rejects
        .toThrow('Storage read failed');
    });

    it('当getIterationChain失败时应该抛出错误', async () => {
      vi.spyOn(historyManager, 'getIterationChain').mockRejectedValue(new Error('Chain fetch failed'));

      await expect(promptService.getIterationChain('test-chain'))
        .rejects
        .toThrow('Chain fetch failed');
    });
  });
});