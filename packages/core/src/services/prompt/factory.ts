import { PromptService } from './service';
import { TemplateManager } from '../template/manager';
import { HistoryManager } from '../history/manager';
import { ModelManager } from '../model/manager';
import { LLMService } from '../llm/service';
import { StorageFactory } from '../storage/factory';

// 创建共享的存储提供器实例
const storageProvider = StorageFactory.createDefault();

export async function createPromptService() {
  const modelManager = new ModelManager(storageProvider);
  const llmService = new LLMService(modelManager);
  const templateManager = new TemplateManager(storageProvider);
  const historyManager = new HistoryManager(storageProvider);

  return new PromptService(modelManager, llmService, templateManager, historyManager);
} 