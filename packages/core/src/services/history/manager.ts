import { IHistoryManager, PromptRecord, PromptRecordChain } from './types';
import { IStorageProvider } from '../storage/types';
import { StorageFactory } from '../storage/factory';
import { StorageAdapter } from '../storage/adapter';
import { RecordNotFoundError, RecordValidationError, StorageError, HistoryError } from './errors';
import { v4 as uuidv4 } from 'uuid';
import { modelManager } from '../model/manager';

/**
 * History Manager implementation
 */
export class HistoryManager implements IHistoryManager {
  private readonly storageKey = 'prompt_history';
  private readonly maxRecords = 50; // Maximum 50 records
  private readonly storage: IStorageProvider;

  constructor(storageProvider: IStorageProvider) {
    // 使用适配器确保所有存储提供者都支持高级方法
    this.storage = new StorageAdapter(storageProvider);
  }

  /**
   * Helper function to get model name
   * @param modelKey model key
   * @returns model name or undefined
   */
  private async getModelNameByKey(modelKey: string): Promise<string | undefined> {
    if (!modelKey) return undefined;
    
    try {
      const model = await modelManager.getModel(modelKey);
      return model?.defaultModel;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Add a new record using atomic operation
   * @param record The record to add
   */
  async addRecord(record: PromptRecord): Promise<void> {
    try {
      this.validateRecord(record);
      
      // If modelName is not provided but modelKey exists, try to get model name
      if (!record.modelName && record.modelKey) {
        record.modelName = await this.getModelNameByKey(record.modelKey);
      }
      
      // Use updateData to handle concurrent modifications
      await this.storage.updateData<PromptRecord[]>(
        this.storageKey,
        (existingRecords: PromptRecord[] | null) => {
          const records = existingRecords || [];
          
          // Ensure record ID is unique
          if (records.some((r: PromptRecord) => r.id === record.id)) {
            throw new HistoryError(`Record with ID ${record.id} already exists`);
          }
          
          // Add record to existing records (at the beginning)
          const updatedRecords = [record, ...records];
          
          // Ensure we don't exceed maxRecords
          return updatedRecords.slice(0, this.maxRecords);
        }
      );
    } catch (err: any) {
      if (err instanceof HistoryError) {
        throw err;
      }
      if (err.message?.includes('Get')) {
        throw new StorageError('Failed to get history records', 'read');
      } else {
        throw new StorageError('Failed to save history records', 'write');
      }
    }
  }

  /**
   * Get all records
   * @returns Array of prompt records
   */
  async getRecords(): Promise<PromptRecord[]> {
    try {
      const data = await this.storage.getItem(this.storageKey);
      if (!data) return [];
      
      const records: PromptRecord[] = JSON.parse(data);
      
      // Sort records by timestamp (newest first)
      return records.sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      throw new StorageError('Failed to get history records', 'read');
    }
  }

  /**
   * Get a specific record by ID
   * @param id Record ID
   * @returns The record or null if not found
   */
  async getRecord(id: string): Promise<PromptRecord> {
    const records = await this.getRecords();
    const record = records.find(r => r.id === id);
    
    if (!record) {
      throw new RecordNotFoundError(`Record with ID ${id} not found`, id);
    }
    
    return record;
  }

  /**
   * Delete a record by ID
   * @param id Record ID
   */
  async deleteRecord(id: string): Promise<void> {
    try {
      const records = await this.getRecords();
      const recordIndex = records.findIndex(r => r.id === id);
      
      if (recordIndex === -1) {
        throw new RecordNotFoundError(`Record with ID ${id} not found`, id);
      }
      
      records.splice(recordIndex, 1);
      await this.saveToStorage(records);
    } catch (err) {
      if (err instanceof RecordNotFoundError) {
        throw err;
      }
      throw new StorageError('Failed to delete record', 'delete');
    }
  }

  /**
   * Get iteration chain for a record
   * @param recordId The ID of the record to start the chain from
   * @returns Array of records forming the iteration chain
   */
  async getIterationChain(recordId: string): Promise<PromptRecord[]> {
    const allRecords = await this.getRecords();
    const chain: PromptRecord[] = [];
    let currentId = recordId;
    
    while (currentId) {
      const record = allRecords.find(r => r.id === currentId);
      if (!record) break;
      
      chain.unshift(record);
      currentId = record.previousId ?? '';
    }
    
    return chain;
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      await this.storage.removeItem(this.storageKey);
    } catch (err) {
      throw new StorageError('Failed to clear history', 'delete');
    }
  }

  /**
   * Save records to storage
   * @param records Records to save
   */
  private async saveToStorage(records: PromptRecord[]): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(records));
  }

  /**
   * Validate a record
   * @param record Record to validate
   */
  private validateRecord(record: PromptRecord): void {
    const errors: string[] = [];
    
    if (!record.id) errors.push('ID is required');
    if (!record.originalPrompt) errors.push('Original prompt is required');
    if (!record.optimizedPrompt) errors.push('Optimized prompt is required');
    if (!record.type) errors.push('Type is required');
    if (!record.chainId) errors.push('Chain ID is required');
    if (record.version === undefined) errors.push('Version is required');
    
    if (errors.length > 0) {
      throw new RecordValidationError('Record validation failed', errors);
    }
  }

  /**
   * Create a new chain with initial record
   * @param params Initial record params
   * @returns The new chain
   */
  async createNewChain(params: Omit<PromptRecord, 'chainId' | 'version' | 'previousId'>): Promise<PromptRecordChain> {
    // Generate chain ID
    const chainId = uuidv4();
    
    // Create record with chainId and version=1
    const record: PromptRecord = {
      ...params,
      chainId,
      version: 1,
      previousId: undefined,
      timestamp: params.timestamp || Date.now()
    };
    
    // Add record
    await this.addRecord(record);
    
    // Return the new chain
    return this.getChain(chainId);
  }

  /**
   * Add an iteration to an existing chain
   * @param params Parameters for the iteration
   * @returns The updated chain
   */
  async addIteration(params: {
    chainId: string;
    originalPrompt: string;
    optimizedPrompt: string;
    modelKey: string;
    templateId: string;
    iterationNote?: string;
    metadata?: Record<string, any>;
  }): Promise<PromptRecordChain> {
    // Get the chain to ensure it exists and get current version
    const chain = await this.getChain(params.chainId);
    
    // Generate new record ID
    const newId = uuidv4();
    
    // Create new record with chainId and incremented version
    const record: PromptRecord = {
      id: newId,
      chainId: params.chainId,
      originalPrompt: params.originalPrompt,
      optimizedPrompt: params.optimizedPrompt,
      type: 'iterate',
      version: chain.currentRecord.version + 1,
      previousId: chain.currentRecord.id,
      timestamp: Date.now(),
      modelKey: params.modelKey,
      templateId: params.templateId,
      iterationNote: params.iterationNote,
      metadata: params.metadata
    };
    
    // Add record
    await this.addRecord(record);
    
    // Return the updated chain
    return this.getChain(params.chainId);
  }

  /**
   * Get a chain by ID
   * @param chainId Chain ID
   * @returns The chain
   */
  async getChain(chainId: string): Promise<PromptRecordChain> {
    try {
      const allRecords = await this.getRecords();
      
      // Filter records for this chain
      const chainRecords = allRecords.filter(r => r.chainId === chainId);
      
      if (chainRecords.length === 0) {
        throw new RecordNotFoundError(`Chain with ID ${chainId} not found`, chainId);
      }
      
      // Sort by version (ascending)
      const sortedRecords = chainRecords.sort((a, b) => a.version - b.version);
      
      // Get root record (version 1)
      const rootRecord = sortedRecords.find(r => r.version === 1);
      if (!rootRecord) {
        throw new HistoryError(`Chain ${chainId} has no root record (version 1)`);
      }
      
      // Get current record (highest version)
      const currentRecord = sortedRecords[sortedRecords.length - 1];
      
      return {
        chainId,
        rootRecord,
        currentRecord,
        versions: sortedRecords
      };
    } catch (err) {
      if (err instanceof RecordNotFoundError || err instanceof HistoryError) {
        throw err;
      }
      throw new StorageError('Failed to get chain', 'read');
    }
  }

  /**
   * Get all chains
   * @returns Array of chains
   */
  async getAllChains(): Promise<PromptRecordChain[]> {
    const records = await this.getRecords();
    
    // Group records by chainId
    const chains = new Map<string, PromptRecord[]>();
    
    records.forEach(record => {
      if (!chains.has(record.chainId)) {
        chains.set(record.chainId, []);
      }
      chains.get(record.chainId)!.push(record);
    });
    
    // Create PromptRecordChain objects for each chain
    const results: PromptRecordChain[] = [];
    
    for (const [chainId, chainRecords] of chains.entries()) {
      // Sort by version (ascending)
      const sortedRecords = chainRecords.sort((a, b) => a.version - b.version);
      
      // Get root record (version 1)
      const rootRecord = sortedRecords.find(r => r.version === 1);
      if (!rootRecord) continue; // Skip chains without root record
      
      // Get current record (highest version)
      const currentRecord = sortedRecords[sortedRecords.length - 1];
      
      results.push({
        chainId,
        rootRecord,
        currentRecord,
        versions: sortedRecords
      });
    }
    
    // 按照最新记录的时间戳排序，最新的在前
    results.sort((a, b) => b.currentRecord.timestamp - a.currentRecord.timestamp);
    
    return results;
  }
}

// Export singleton instance
export const historyManager = new HistoryManager(StorageFactory.createDefault());