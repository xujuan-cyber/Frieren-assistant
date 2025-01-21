import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryManager } from '../../../../src/services/history/manager';
import { HistoryError, RecordNotFoundError, StorageError } from '../../../../src/services/history/errors';
import { PromptRecord } from '../../../../src/services/history/types';

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let mockStorage: { [key: string]: string } = {};
  
  const mockRecord: PromptRecord = {
    id: 'test-1',
    prompt: 'Test prompt',
    timestamp: Date.now(),
    type: 'optimize',
    result: 'Test result',
    modelKey: 'test-model',
    templateId: 'optimize'
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
      })
    });
    
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
      const invalidRecord = {
        prompt: 'Test prompt',
        timestamp: Date.now(),
        type: 'optimize',
        result: 'Test result',
        modelKey: 'test-model',
        templateId: 'optimize'
      };
      expect(() => manager.addRecord(invalidRecord as PromptRecord))
        .toThrow(HistoryError);
    });

    it('should limit the number of records', () => {
      const maxRecords = 50;
      for (let i = 0; i < maxRecords + 10; i++) {
        manager.addRecord({
          ...mockRecord,
          id: `test-${i + 1}`
        });
      }
      expect(manager.getRecords()).toHaveLength(maxRecords);
    });

    it('should handle storage errors', () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => manager.addRecord(mockRecord))
        .toThrow(StorageError);
    });
  });

  describe('getRecord', () => {
    beforeEach(() => {
      manager.addRecord(mockRecord);
    });

    it('should get existing record', () => {
      const record = manager.getRecord('test-1');
      expect(record).toEqual(mockRecord);
    });

    it('should throw error when record not found', () => {
      expect(() => manager.getRecord('invalid'))
        .toThrow(RecordNotFoundError);
    });
  });

  describe('deleteRecord', () => {
    beforeEach(() => {
      manager.addRecord(mockRecord);
    });

    it('should delete existing record', () => {
      manager.deleteRecord('test-1');
      expect(manager.getRecords()).toHaveLength(0);
    });

    it('should throw error when deleting non-existent record', () => {
      expect(() => manager.deleteRecord('invalid'))
        .toThrow(RecordNotFoundError);
    });

    it('should handle storage errors', () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => manager.deleteRecord('test-1'))
        .toThrow(StorageError);
    });
  });

  describe('getIterationChain', () => {
    beforeEach(() => {
      manager.addRecord({
        ...mockRecord,
        id: 'record-1'
      });
      manager.addRecord({
        ...mockRecord,
        id: 'record-2',
        parentId: 'record-1'
      });
      manager.addRecord({
        ...mockRecord,
        id: 'record-3',
        parentId: 'record-2'
      });
    });

    it('should get complete iteration chain', () => {
      const chain = manager.getIterationChain('record-3');
      expect(chain).toHaveLength(3);
      expect(chain[0].id).toBe('record-1');
      expect(chain[1].id).toBe('record-2');
      expect(chain[2].id).toBe('record-3');
    });

    it('should handle broken chains gracefully', () => {
      const chain = manager.getIterationChain('record-2');
      expect(chain).toHaveLength(2);
      expect(chain[0].id).toBe('record-1');
      expect(chain[1].id).toBe('record-2');
    });

    it('should return single record for no parent', () => {
      const chain = manager.getIterationChain('record-1');
      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('record-1');
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      manager.addRecord(mockRecord);
    });

    it('should clear all records', () => {
      manager.clearHistory();
      expect(manager.getRecords()).toHaveLength(0);
    });

    it('should handle storage errors', () => {
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => manager.clearHistory())
        .toThrow(StorageError);
    });
  });
}); 