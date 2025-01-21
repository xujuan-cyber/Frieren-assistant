import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptService } from './service';
import { ModelManager } from '../model/manager';
import { LLMService } from '../llm/service';
import { TemplateManager } from '../template/manager';
import { HistoryManager } from '../history/manager';
import { ServiceDependencyError } from './errors';
import { ModelConfig } from '../model/types';
import { Template } from '../template/types';
import { PromptRecord, PromptRecordType } from '../history/types';

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
    enabled: true
  };

  const mockTemplate: Template = {
    id: 'test-template',
    name: 'Test Template',
    template: 'test template content',
    description: 'test template',
    version: '1.0',
    prompt: 'test prompt',
    variables: []
  };

  beforeEach(() => {
    modelManager = new ModelManager();
    llmService = new LLMService(modelManager);
    templateManager = new TemplateManager();
    historyManager = new HistoryManager();

    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
    vi.spyOn(templateManager, 'getTemplate').mockResolvedValue(mockTemplate);
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

    promptService = new PromptService(
      modelManager,
      llmService,
      templateManager,
      historyManager
    );
  });
}); 