import { PromptService } from './service';
import { TemplateManager } from '../template/manager';
import { HistoryManager } from '../history/manager';
import { ModelManager } from '../model/manager';
import { LLMService } from '../llm/service';

export async function createPromptService() {
  const modelManager = new ModelManager();
  const llmService = new LLMService(modelManager);
  const templateManager = new TemplateManager();
  const historyManager = new HistoryManager();


  return new PromptService(modelManager, llmService, templateManager, historyManager);
} 