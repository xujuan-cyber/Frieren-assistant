import type { IHistoryManager, PromptRecord, PromptRecordChain } from './types';

/**
 * Electron环境下的历史记录管理器代理
 * 通过IPC与主进程中的真实HistoryManager通信
 */
export class ElectronHistoryManagerProxy implements IHistoryManager {
  private get electronAPI() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI;
  }

  async addRecord(record: PromptRecord): Promise<void> {
    return this.electronAPI.history.addRecord(record);
  }

  async getRecords(): Promise<PromptRecord[]> {
    return this.electronAPI.history.getHistory();
  }

  async getRecord(id: string): Promise<PromptRecord> {
    const records = await this.getRecords();
    const record = records.find(r => r.id === id);
    if (!record) {
      throw new Error(`Record with id ${id} not found`);
    }
    return record;
  }

  async deleteRecord(id: string): Promise<void> {
    return this.electronAPI.history.deleteRecord(id);
  }

  async getIterationChain(recordId: string): Promise<PromptRecord[]> {
    return this.electronAPI.history.getIterationChain(recordId);
  }

  async clearHistory(): Promise<void> {
    return this.electronAPI.history.clearHistory();
  }

  async getAllChains(): Promise<PromptRecordChain[]> {
    return this.electronAPI.history.getAllChains();
  }

  async getChain(chainId: string): Promise<PromptRecordChain> {
    return this.electronAPI.history.getChain(chainId);
  }

  async createNewChain(record: Omit<PromptRecord, 'chainId' | 'version' | 'previousId'>): Promise<PromptRecordChain> {
    return this.electronAPI.history.createNewChain(record);
  }

  async addIteration(params: {
    chainId: string;
    originalPrompt: string;
    optimizedPrompt: string;
    iterationNote?: string;
    modelKey: string;
    templateId: string;
  }): Promise<PromptRecordChain> {
    return this.electronAPI.history.addIteration(params);
  }

  async deleteChain(chainId: string): Promise<void> {
    return this.electronAPI.history.deleteChain(chainId);
  }
} 