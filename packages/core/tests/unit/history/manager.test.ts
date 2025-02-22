import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  HistoryManager,
  HistoryError,
  RecordNotFoundError,
  StorageError,
  PromptRecord,
  RecordValidationError
} from '@prompt-optimizer/core';

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let mockStorage: Record<string, any> = {};
  
  const mockRecord: PromptRecord = {
    id: '1',
    originalPrompt: 'test prompt',
    optimizedPrompt: 'optimized prompt',
    type: 'optimize',
    chainId: 'test-chain',
    version: 1,
    timestamp: Date.now(),
    modelKey: 'test-model',
    templateId: 'template-1'
  };

  const mockIterationRecord: PromptRecord = {
    id: '2',
    originalPrompt: 'iteration input',
    optimizedPrompt: 'iterated prompt',
    type: 'iterate',
    chainId: 'test-chain',
    version: 2,
    previousId: '1',
    timestamp: Date.now(),
    modelKey: 'test-model',
    templateId: 'template-2'
  };

  beforeEach(() => {
    // 清理 mock storage
    mockStorage = {};
    
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    });
    
    // 初始化管理器
    manager = new HistoryManager();
  });

  describe('addRecord', () => {
    it('should add valid record', () => {
      manager.addRecord(mockRecord);
      const records = manager.getRecords();
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(mockRecord);
    });

    it('should throw error when adding invalid record', () => {
      const invalidRecord = { ...mockRecord, id: undefined };
      expect(() => manager.addRecord(invalidRecord as any)).toThrow('记录验证失败');
    });

    it('should limit the number of records', () => {
      for (let i = 0; i < 60; i++) {
        manager.addRecord({
          ...mockRecord,
          id: `${i}`,
          timestamp: Date.now() + i
        });
      }
      const records = manager.getRecords();
      expect(records).toHaveLength(50);
    });

    it('should handle storage errors', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => manager.addRecord(mockRecord)).toThrow('保存历史记录失败');
    });
  });

  describe('getRecord', () => {
    it('should get existing record', () => {
      manager.addRecord(mockRecord);
      const record = manager.getRecord(mockRecord.id);
      expect(record).toEqual(mockRecord);
    });

    it('should throw error when record not found', () => {
      expect(() => manager.getRecord('non-existent')).toThrow('记录不存在');
    });
  });

  describe('deleteRecord', () => {
    it('should delete existing record', () => {
      manager.addRecord(mockRecord);
      manager.deleteRecord(mockRecord.id);
      expect(() => manager.getRecord(mockRecord.id)).toThrow('记录不存在');
    });

    it('should throw error when deleting non-existent record', () => {
      expect(() => manager.deleteRecord('non-existent')).toThrow('记录不存在');
    });

    it('should handle storage errors', () => {
      // 先正常添加记录
      manager.addRecord(mockRecord);
      
      // 然后模拟删除时的存储错误
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => manager.deleteRecord(mockRecord.id)).toThrow('删除记录失败');
      
      // 清理 spy
      setItemSpy.mockRestore();
    });
  });

  describe('getIterationChain', () => {
    it('should get complete iteration chain', () => {
      manager.addRecord(mockRecord);
      manager.addRecord(mockIterationRecord);
      const chain = manager.getIterationChain(mockIterationRecord.id);
      expect(chain).toHaveLength(2);
      expect(chain[0]).toEqual(mockRecord);
      expect(chain[1]).toEqual(mockIterationRecord);
    });

    it('should handle broken chains gracefully', () => {
      manager.addRecord(mockIterationRecord);
      const chain = manager.getIterationChain(mockIterationRecord.id);
      expect(chain).toHaveLength(1);
      expect(chain[0]).toEqual(mockIterationRecord);
    });

    it('should return single record for no previous', () => {
      manager.addRecord(mockRecord);
      const chain = manager.getIterationChain(mockRecord.id);
      expect(chain).toHaveLength(1);
      expect(chain[0]).toEqual(mockRecord);
    });
  });

  describe('clearHistory', () => {
    it('should clear all records', () => {
      manager.addRecord(mockRecord);
      manager.clearHistory();
      expect(manager.getRecords()).toHaveLength(0);
    });

    it('should handle storage errors', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => manager.clearHistory()).toThrow('清除历史记录失败');
    });
  });

  describe('getChain', () => {
    it('should get chain by chainId', () => {
      manager.addRecord(mockRecord);
      manager.addRecord(mockIterationRecord);
      const chain = manager.getChain(mockRecord.chainId);
      expect(chain.chainId).toBe(mockRecord.chainId);
      expect(chain.rootRecord).toEqual(mockRecord);
      expect(chain.currentRecord).toEqual(mockIterationRecord);
      expect(chain.versions).toHaveLength(2);
    });

    it('should throw error when chain not found', () => {
      expect(() => manager.getChain('non-existent')).toThrow('记录链不存在');
    });
  });

  describe('getAllChains', () => {
    it('should get all chains', () => {
      manager.addRecord(mockRecord);
      manager.addRecord(mockIterationRecord);
      const chains = manager.getAllChains();
      expect(chains).toHaveLength(1);
      expect(chains[0].chainId).toBe(mockRecord.chainId);
      expect(chains[0].versions).toHaveLength(2);
    });

    it('should return empty array when no chains exist', () => {
      const chains = manager.getAllChains();
      expect(chains).toHaveLength(0);
    });
  });
}); 