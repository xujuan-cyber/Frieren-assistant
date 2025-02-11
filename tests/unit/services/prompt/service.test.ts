import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptService } from '../../../../src/services/prompt/service';
import { ModelManager } from '../../../../src/services/model/manager';
import { TemplateManager } from '../../../../src/services/template/manager';
import { HistoryManager } from '../../../../src/services/history/manager';
import { createLLMService } from '../../../../src/services/llm/service';
import { ModelConfig } from '../../../../src/services/model/types';
import { Template } from '../../../../src/services/template/types';
import { PromptRecord } from '../../../../src/services/history/types';
import { LLMService } from '../../../../src/services/llm/service';
import { OptimizationError, IterationError, TestError } from '../../../../src/services/prompt/errors';
import { v4 as uuidv4 } from 'uuid';

// 模拟 fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PromptService', () => {
  let promptService: PromptService;
  let modelManager: ModelManager;
  let llmService: LLMService;
  let templateManager: TemplateManager;
  let historyManager: HistoryManager;

  const ERROR_MESSAGES = {
    EMPTY_INPUT: '输入不能为空',
    OPTIMIZATION_FAILED: '优化失败',
    MODEL_NOT_FOUND: '模型未找到',
    TEMPLATE_NOT_FOUND: '提示词未找到',
    TEMPLATE_EMPTY: '提示词内容为空'
  };

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
    id: 'test',
    name: 'Test Template',
    content: 'test template content',
    version: '1.0'
  };

  beforeEach(async () => {
    // 重置所有mock
    mockFetch.mockReset();

    // 模拟提示词索引请求
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ['optimize.yaml']
    });

    // 模拟提示词内容请求
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTemplate)
    });

    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    vi.spyOn(llmService, 'buildRequestConfig').mockReturnValue({
      url: 'http://test.api',
      headers: { 'Content-Type': 'application/json' },
      body: {
        model: 'test-model',
        messages: []
      }
    });
    vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');

    // 初始化管理器
    await templateManager.init();
    await historyManager.init();

    promptService = new PromptService(modelManager, llmService, templateManager, historyManager);
  });

  describe('optimizePrompt', () => {
    it('应该成功优化提示词', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('优化后的提示词');

      const result = await promptService.optimizePrompt('test prompt', 'test-model');
      expect(result).toBe('优化后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('提示词管理器未初始化'));

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词管理器未初始化');
    });

    it('当提示词不存在时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('提示词不存在'));

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词不存在');
    });

    it('当提示词内容为空时应抛出错误', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        content: ''
      };
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(emptyTemplate);

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词不存在或无效');
    });
  });

  describe('iteratePrompt', () => {
    it('应该成功迭代提示词', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('迭代后的提示词');

      const result = await promptService.iteratePrompt('test prompt', 'test input', 'test-model');
      expect(result).toBe('迭代后的提示词');
    });

    it('当提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('提示词管理器未初始化'));

      await expect(promptService.iteratePrompt('test prompt', 'test input', 'test-model'))
        .rejects
        .toThrow('迭代失败: 提示词管理器未初始化');
    });
  });

  describe('testPrompt', () => {
    it('应该成功测试提示词', async () => {
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('测试结果');

      const result = await promptService.testPrompt('test prompt', 'test input', 'test-model');
      expect(result).toBe('测试结果');
    });

    it('当模型不存在时应抛出错误', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(undefined);

      await expect(promptService.testPrompt('test prompt', 'test input', 'test-model'))
        .rejects
        .toThrow('测试失败: 模型不存在');
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
        .toThrow('优化失败: 提示词不能为空');
    });

    it('当提示词超过最大长度时应抛出错误', async () => {
      const longPrompt = 'a'.repeat(10000);
      await expect(promptService.optimizePrompt(longPrompt, 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词长度超过限制');
    });

    it('当模型Key为空时应抛出错误', async () => {
      await expect(promptService.optimizePrompt('test prompt', ''))
        .rejects
        .toThrow('优化失败: 模型Key不能为空');
    });

    it('当LLM服务返回空结果时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('');

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: LLM服务返回结果为空');
    });

    it('当LLM服务超时时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockRejectedValue(new Error('请求超时'));

      await expect(promptService.optimizePrompt('test prompt', 'test-model'))
        .rejects
        .toThrow('优化失败: 请求超时');
    });
  });

  describe('历史记录管理测试', () => {
    it('应该正确记录优化历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('优化结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.optimizePrompt('test prompt', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        originalPrompt: 'test prompt',
        optimizedPrompt: '优化结果',
        modelKey: 'test-model'
      }));
    });

    it('应该正确记录迭代历史', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('迭代结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.iteratePrompt('original', 'iteration input', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'iterate',
        originalPrompt: 'iteration input',
        optimizedPrompt: '迭代结果',
        modelKey: 'test-model',
        chainId: 'original',
        previousId: 'original'
      }));
    });

    it('应该正确记录测试历史', async () => {
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('测试结果');
      const addRecordSpy = vi.spyOn(historyManager, 'addRecord');

      await promptService.testPrompt('test prompt', 'test input', 'test-model');

      expect(addRecordSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'optimize',
        originalPrompt: 'test prompt',
        optimizedPrompt: '测试结果',
        modelKey: 'test-model',
        chainId: 'test prompt'
      }));
    });
  });
});

describe('PromptService 提示词管理器初始化测试', () => {
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
    id: 'test',
    name: 'Test Template',
    content: 'test template content',
    version: '1.0'
  };

  beforeEach(async () => {
    // 基础设置
    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    // 初始化管理器
    await templateManager.init();
    await historyManager.init();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    vi.spyOn(llmService, 'buildRequestConfig').mockReturnValue({
      url: 'http://test.api',
      headers: { 'Content-Type': 'application/json' },
      body: {
        model: 'test-model',
        messages: []
      }
    });
    vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');
  });

  describe('提示词管理器初始化场景', () => {
    it('提示词管理器未初始化时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('提示词管理器未初始化'));
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

      await expect(promptService.optimizePrompt('test', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词管理器未初始化');
    });

    it('optimize提示词不存在时应抛出错误', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockRejectedValue(new Error('提示词不存在'));
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

      await expect(promptService.optimizePrompt('test', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词不存在');
    });

    it('提示词管理器正确初始化但提示词内容为空时应抛出错误', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        content: ''
      };
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(emptyTemplate);
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

      await expect(promptService.optimizePrompt('test', 'test-model'))
        .rejects
        .toThrow('优化失败: 提示词不存在或无效');
    });

    it('提示词管理器初始化成功时应正常执行', async () => {
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

      const result = await promptService.optimizePrompt('test', 'test-model');
      expect(result).toBe('test result');
    });
  });

  describe('提示词管理器状态检查', () => {
    it('应该能检测到提示词管理器的初始化状态', async () => {
      vi.spyOn(templateManager, 'init').mockResolvedValue();
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);
      
      await templateManager.init();
      expect(templateManager.init).toHaveBeenCalled();
    });

    it('提示词管理器初始化后应该能正常工作', async () => {
      vi.spyOn(templateManager, 'init').mockResolvedValue();
      vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
      vi.spyOn(llmService, 'sendRequest').mockResolvedValue('test result');
      promptService = new PromptService(modelManager, llmService, templateManager, historyManager);

      await templateManager.init();
      const result = await promptService.optimizePrompt('test', 'test-model');
      expect(result).toBe('test result');
    });
  });
}); 