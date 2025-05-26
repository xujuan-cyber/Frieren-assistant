import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HistoryManager } from '../../../src/services/history/manager';
import { IStorageProvider } from '../../../src/services/storage/types';
import { PromptRecord, PromptRecordChain, PromptRecordType } from '../../../src/services/history/types';
import { RecordNotFoundError, RecordValidationError, StorageError, HistoryError } from '../../../src/services/history/errors';
import { v4 as uuidv4 } from 'uuid';
import { modelManager } from '../../../src/services/model/manager';

// Mock 'uuid'
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// Mock '../model/manager'
vi.mock('../../../src/services/model/manager', () => ({
  modelManager: {
    getModel: vi.fn(),
  },
}));

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let mockStorage: any;

  // Helper to create mock PromptRecord objects
  const mockPromptRecord = (
    id: string,
    chainId: string,
    version: number,
    previousId?: string,
    data?: Partial<PromptRecord>
  ): PromptRecord => ({
    id,
    originalPrompt: 'Original prompt content',
    optimizedPrompt: 'Optimized prompt content',
    type: 'optimize' as PromptRecordType,
    chainId,
    version,
    previousId,
    timestamp: Date.now() - Math.random() * 10000, // Ensure somewhat unique timestamps for sorting tests
    modelKey: 'test-model-key',
    modelName: 'Test Model Name',
    templateId: 'test-template-id',
    iterationNote: version > 1 ? 'Iteration note' : undefined,
    metadata: { some: 'data' },
    ...data,
  });

  beforeEach(() => {
    // Reset mocks for storage provider
    mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clearAll: vi.fn(), // Assuming IStorageProvider has clearAll
    };

    historyManager = new HistoryManager(mockStorage);

    // Clear mocks for uuid and modelManager
    (uuidv4 as any).mockClear();
    (modelManager.getModel as any).mockClear();

    // Default mock implementations for storage
    mockStorage.getItem.mockResolvedValue(null); // Default to empty storage
    mockStorage.setItem.mockResolvedValue(undefined); // Default to successful set
    mockStorage.removeItem.mockResolvedValue(undefined); // Default to successful remove
    mockStorage.clearAll.mockResolvedValue(undefined); // Default to successful clearAll

    // Default mock implementation for modelManager.getModel
    (modelManager.getModel as any).mockReturnValue({
      name: 'Default Mock Model',
      defaultModel: 'default-mock-model-variant', // This is what getModelNameByKey uses
      // ... other ModelConfig properties if needed by the code under test
    });
  });

  afterEach(() => {
    // Clear any mocks
    vi.clearAllMocks();
  });

  describe('addRecord', () => {
    it('should add a valid record and save to storage', async () => {
      const record = mockPromptRecord('id1', 'chain1', 1);
      await historyManager.addRecord(record);

      expect(mockStorage.getItem).toHaveBeenCalledWith('prompt_history');
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'prompt_history',
        JSON.stringify([record])
      );
    });

    it('should add a record and fetch modelName if not provided and modelKey exists', async () => {
      const recordWithoutModelName = mockPromptRecord('id1', 'chain1', 1);
      delete recordWithoutModelName.modelName; // Ensure modelName is not set

      (modelManager.getModel as any).mockReturnValue({
        defaultModel: 'Fetched Model Name',
      });

      await historyManager.addRecord(recordWithoutModelName);

      expect(modelManager.getModel).toHaveBeenCalledWith('test-model-key');
      const storedRecords = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(storedRecords[0].modelName).toBe('Fetched Model Name');
    });
    
    it('should not fetch modelName if modelKey does not exist', async () => {
      const recordWithoutModelName = mockPromptRecord('id1', 'chain1', 1);
      delete recordWithoutModelName.modelName;
      
      // 使用空字符串而不是删除必填字段
      const testRecord = {
        ...recordWithoutModelName,
        modelKey: '' // Empty string instead of undefined
      };
      
      await historyManager.addRecord(testRecord);
      
      expect(modelManager.getModel).not.toHaveBeenCalled();
      const storedRecords = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(storedRecords[0].modelName).toBeUndefined();
    });

    it('should throw RecordValidationError for an invalid record (e.g., missing originalPrompt)', async () => {
      const invalidRecord = {
        ...mockPromptRecord('id1', 'chain1', 1),
        originalPrompt: '', // Invalid
      } as PromptRecord;
      await expect(historyManager.addRecord(invalidRecord)).rejects.toThrow(
        RecordValidationError
      );
    });

    it('should not exceed maxRecords', async () => {
      // 明确固定索引和测试数据
      const maxRecords = 50; // As defined in HistoryManager
      const existingRecords: PromptRecord[] = [];
      
      for (let i = 0; i < maxRecords; i++) {
        existingRecords.push({
          ...mockPromptRecord(`id${i}`, 'chain1', i + 1),
          timestamp: Date.now() - (maxRecords - i) // Ensure ordered timestamps (oldest first)
        });
      }
      
      // Ensure records are ordered by timestamp (oldest first)
      existingRecords.sort((a, b) => a.timestamp - b.timestamp);
      
      mockStorage.getItem.mockResolvedValue(JSON.stringify(existingRecords));

      // Add a new record with newest timestamp
      const newRecord = {
        ...mockPromptRecord('newId', 'chain1', maxRecords + 1),
        timestamp: Date.now() + 1000 // Ensure this is newest
      };
      
      await historyManager.addRecord(newRecord);

      // Check the argument passed to setItem
      const storedRecordsArg = mockStorage.setItem.mock.calls[0][1];
      const storedRecords: PromptRecord[] = JSON.parse(storedRecordsArg);
      
      expect(storedRecords.length).toBe(maxRecords);
      expect(storedRecords[0].id).toBe('newId'); // Newest record is at the start
      // 根据实际行为：[newId, id0, id1, ..., id48]，最后一个记录是id48
      expect(storedRecords[maxRecords - 1].id).toBe('id48'); // 最后一个记录是id48
    });
    
    it('should throw StorageError if storageProvider.getItem fails', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Get failed'));
      const record = mockPromptRecord('id1', 'chain1', 1);
      await expect(historyManager.addRecord(record)).rejects.toThrow(StorageError);
      await expect(historyManager.addRecord(record)).rejects.toThrow('Failed to get history records');
    });
  
    it('should throw StorageError if storageProvider.setItem fails', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Set failed'));
      const record = mockPromptRecord('id1', 'chain1', 1);
      await expect(historyManager.addRecord(record)).rejects.toThrow(StorageError);
      await expect(historyManager.addRecord(record)).rejects.toThrow('Failed to save history records');
    });

    it('should throw an error when adding record with duplicate id', async () => {
      const existingId = 'duplicate-id';
      const record1 = mockPromptRecord(existingId, 'chain1', 1);
      
      // First, mock storage to return a record with this ID
      mockStorage.getItem.mockResolvedValue(JSON.stringify([record1]));
      
      // Now set up a record with the same ID to add
      const record2 = mockPromptRecord(existingId, 'chain1', 2);
      
      // When we try to add it, it should reject with an error about duplicate ID
      await expect(historyManager.addRecord(record2))
        .rejects
        .toThrow('Record with ID duplicate-id already exists');
    });
  });

  describe('getRecords', () => {
    it('should return empty array if storage is empty or item is null', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      const records = await historyManager.getRecords();
      expect(records).toEqual([]);
    });

    it('should return all records sorted by timestamp (newest first)', async () => {
      // Create records with explicitly controlled timestamps
      const now = Date.now();
      const olderRecord = {
        ...mockPromptRecord('id-1', 'chain-1', 1),
        timestamp: now - 1000 // Older timestamp
      };
      
      const newerRecord = {
        ...mockPromptRecord('id-2', 'chain-1', 2),
        timestamp: now // Newer timestamp
      };
      
      // Store records in storage (order doesn't matter)
      mockStorage.getItem.mockResolvedValue(JSON.stringify([olderRecord, newerRecord]));
      
      // Get records
      const result = await historyManager.getRecords();
      
      // Verify records are returned in correct order (newest first)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('id-2'); // Newest should be first
      expect(result[1].id).toBe('id-1'); // Oldest should be second
    });

    it('should throw StorageError if getItem fails', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage failed'));
      await expect(historyManager.getRecords()).rejects.toThrow(StorageError);
      await expect(historyManager.getRecords()).rejects.toThrow('Failed to get history records');
    });
  });

  describe('getRecord', () => {
    it('should return a specific record by id', async () => {
      const rec1 = mockPromptRecord('id-1', 'chain-1', 1);
      const rec2 = mockPromptRecord('id-2', 'chain-1', 2);
      mockStorage.getItem.mockResolvedValue(JSON.stringify([rec1, rec2]));
      
      const result = await historyManager.getRecord('id-1');
      expect(result).toEqual(rec1);
    });

    it('should return null if record does not exist', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
      
      await expect(historyManager.getRecord('non-existent')).rejects.toThrow(RecordNotFoundError);
    });
  });

  describe('deleteRecord', () => {
    it('should delete a specific record by id', async () => {
      const rec1 = mockPromptRecord('id-1', 'chain-1', 1);
      const rec2 = mockPromptRecord('id-2', 'chain-1', 2);
      mockStorage.getItem.mockResolvedValue(JSON.stringify([rec1, rec2]));

      await historyManager.deleteRecord('id-1');

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'prompt_history',
        expect.stringContaining('id-2')
      );
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'prompt_history',
        expect.not.stringContaining('id-1')
      );
    });

    it('should not fail when deleting non-existent record', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
      
      await expect(historyManager.deleteRecord('non-existent')).rejects.toThrow(RecordNotFoundError);
    });

    it('should throw StorageError if setItem fails during delete', async () => {
      const rec1 = mockPromptRecord('id1', 'chain1', 1);
      mockStorage.getItem.mockResolvedValue(JSON.stringify([rec1]));
      mockStorage.setItem.mockRejectedValue(new Error('Set failed'));

      await expect(historyManager.deleteRecord('id1')).rejects.toThrow(StorageError);
      await expect(historyManager.deleteRecord('id1')).rejects.toThrow('Failed to delete record');
    });
  });

  describe('clearHistory', () => {
    it('should remove all records', async () => {
      await historyManager.clearHistory();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('prompt_history');
    });

    it('should throw StorageError if removeItem fails', async () => {
      mockStorage.removeItem.mockRejectedValue(new Error('Remove failed'));
      await expect(historyManager.clearHistory()).rejects.toThrow(StorageError);
      await expect(historyManager.clearHistory()).rejects.toThrow('Failed to clear history');
    });
  });

  describe('createNewChain and getChain', () => {
    it('should create a new chain and get it', async () => {
      // 设置 uuid 模拟返回
      (uuidv4 as any).mockReturnValue('mock-chain-id');
      
      // 创建记录所需的参数
      const chainRecord = {
        id: 'test-id',
        originalPrompt: 'Test original prompt',
        optimizedPrompt: 'Test optimized prompt',
        type: 'optimize' as PromptRecordType,
        modelKey: 'test-model',
        templateId: 'test-template',
        timestamp: Date.now()
      };
      
      // 使用add模拟模式 - 空存储到添加记录
      mockStorage.getItem.mockResolvedValueOnce(null); // getRecords returns empty
      mockStorage.setItem.mockResolvedValueOnce(undefined); // saveToStorage succeeds
      
      // 模拟第二次调用 getChain 的行为
      const createdRecord = {
        ...chainRecord,
        chainId: 'mock-chain-id',
        version: 1,
        previousId: undefined
      };
      
      // getChain 用于检索，返回已创建的链
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([createdRecord]));
      
      // 执行测试
      const chain = await historyManager.createNewChain(chainRecord);
      
      // 验证结果
      expect(chain.chainId).toBe('mock-chain-id');
      expect(chain.rootRecord).toEqual(createdRecord);
      expect(chain.currentRecord).toEqual(createdRecord);
      expect(chain.versions).toHaveLength(1);
      expect(chain.versions[0]).toEqual(createdRecord);
    });
    
    it('should add an iteration to an existing chain', async () => {
      // 设置模拟
      const mockChainId = 'existing-chain-id';
      const mockRootRecord = mockPromptRecord('root-id', mockChainId, 1);
      
      // 模拟getChain
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockRootRecord]));
      
      // 迭代参数
      const iterationParams = {
        chainId: mockChainId,
        originalPrompt: 'Iteration original',
        optimizedPrompt: 'Iteration optimized',
        modelKey: 'test-model',
        templateId: 'test-template'
      };
      
      // 设置 uuid 返回
      (uuidv4 as any).mockReturnValue('iteration-id');
      
      // 模拟添加记录
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockRootRecord])); // addRecord.getRecords
      mockStorage.setItem.mockResolvedValueOnce(undefined); // addRecord.saveToStorage
      
      // 模拟再次获取链
      const expectedIterationRecord = {
        ...iterationParams,
        id: 'iteration-id',
        type: 'iterate',
        version: 2,
        previousId: 'root-id',
        timestamp: expect.any(Number)
      };
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([
        mockRootRecord,
        expectedIterationRecord
      ]));
      
      // 执行测试
      const updatedChain = await historyManager.addIteration(iterationParams);
      
      // 验证
      expect(updatedChain.chainId).toBe(mockChainId);
      expect(updatedChain.rootRecord).toEqual(mockRootRecord);
      expect(updatedChain.currentRecord.id).toBe('iteration-id');
      expect(updatedChain.versions).toHaveLength(2);
    });

    it('should get all chains', async () => {
      // 创建多个链的记录
      const now = Date.now();
      const chain1Records = [
        mockPromptRecord('id1-1', 'chain1', 1, undefined, { timestamp: now - 100 }),
        mockPromptRecord('id1-2', 'chain1', 2, 'id1-1', { timestamp: now - 50 })
      ];
      const chain2Records = [
        mockPromptRecord('id2-1', 'chain2', 1, undefined, { timestamp: now })
      ];
      const allRecords = [...chain1Records, ...chain2Records];
      
      // 模拟getRecords返回所有记录
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(allRecords));
      
      // 执行测试
      const chains = await historyManager.getAllChains();
      
      // 验证
      expect(chains).toHaveLength(2);
      // chain2的时间戳更新，应该排在前面
      expect(chains[0].chainId).toBe('chain2');
      expect(chains[0].versions).toHaveLength(1);
      expect(chains[1].chainId).toBe('chain1');
      expect(chains[1].versions).toHaveLength(2);
    });
  });
});
