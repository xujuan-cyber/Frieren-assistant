import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorageProvider } from '../../../src/services/storage/fileStorageProvider';

// Mock fs module
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

describe('FileStorageProvider Recovery Safety', () => {
  let provider: FileStorageProvider;
  let tempDir: string;
  let storagePath: string;
  let backupPath: string;

  beforeEach(() => {
    tempDir = '/tmp/test-storage';
    storagePath = path.join(tempDir, 'storage.json');
    backupPath = path.join(tempDir, 'storage.json.backup');
    provider = new FileStorageProvider(tempDir);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Backup Protection During Recovery', () => {
    it('should not overwrite good backup when recovering from corrupted main file', async () => {
      // Setup: corrupted main file, good backup
      const goodBackupData = { models: { openai: 'config1', gemini: 'config2' } };
      const corruptedMainContent = '{ invalid json';
      const goodBackupContent = JSON.stringify(goodBackupData);

      // Mock file system calls
      mockFs.access
        .mockResolvedValueOnce(undefined) // main file exists
        .mockRejectedValueOnce(new Error('File not found')) // backup access for createBackup
        .mockResolvedValueOnce(undefined); // backup file exists for recovery

      mockFs.readFile
        .mockResolvedValueOnce(corruptedMainContent) // corrupted main file
        .mockResolvedValueOnce(goodBackupContent); // good backup file

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      // Initialize provider (this should trigger recovery)
      await provider.getItem('test');

      // Verify that copyFile was NOT called during recovery
      // (which would mean the corrupted main file didn't overwrite the good backup)
      const copyFileCalls = mockFs.copyFile.mock.calls;
      const dangerousCopyCall = copyFileCalls.find(call => 
        call[0] === storagePath && call[1] === backupPath
      );
      
      expect(dangerousCopyCall).toBeUndefined();
      
      // Verify that writeFile was called to recreate the main file
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // Verify that rename was called (atomic write)
      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should refresh backup after successful recovery', async () => {
      // Setup: corrupted main file, good backup
      const goodBackupData = { models: { openai: 'config1' } };
      const corruptedMainContent = '{ invalid json';
      const goodBackupContent = JSON.stringify(goodBackupData);

      // Mock file system calls
      mockFs.access
        .mockResolvedValueOnce(undefined) // main file exists
        .mockResolvedValueOnce(undefined) // backup file exists for recovery
        .mockResolvedValueOnce(undefined); // main file exists for backup refresh

      mockFs.readFile
        .mockResolvedValueOnce(corruptedMainContent) // corrupted main file
        .mockResolvedValueOnce(goodBackupContent); // good backup file

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      // Initialize provider (this should trigger recovery)
      await provider.getItem('test');

      // Verify that copyFile was called AFTER recovery to refresh backup
      // This should be the ONLY copyFile call
      expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
      expect(mockFs.copyFile).toHaveBeenCalledWith(storagePath, backupPath);
    });

    it('should handle backup refresh failure gracefully', async () => {
      // Setup: corrupted main file, good backup
      const goodBackupData = { models: { openai: 'config1' } };
      const corruptedMainContent = '{ invalid json';
      const goodBackupContent = JSON.stringify(goodBackupData);

      // Mock file system calls
      mockFs.access
        .mockResolvedValueOnce(undefined) // main file exists
        .mockResolvedValueOnce(undefined) // backup file exists for recovery
        .mockResolvedValueOnce(undefined); // main file exists for backup refresh

      mockFs.readFile
        .mockResolvedValueOnce(corruptedMainContent) // corrupted main file
        .mockResolvedValueOnce(goodBackupContent); // good backup file

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      // Make backup refresh fail
      mockFs.copyFile.mockRejectedValue(new Error('Backup refresh failed'));

      // Initialize provider (this should trigger recovery)
      // Should not throw error even if backup refresh fails
      await expect(provider.getItem('test')).resolves.not.toThrow();
    });
  });

  describe('Data Integrity During Recovery', () => {
    it('should preserve all data from backup during recovery', async () => {
      const originalData = {
        models: JSON.stringify({ openai: 'config1', gemini: 'config2' }),
        templates: JSON.stringify({ template1: 'content1' }),
        history: JSON.stringify({ record1: 'data1' })
      };
      
      const corruptedMainContent = '{ invalid json';
      const goodBackupContent = JSON.stringify(originalData);

      // Mock file system calls
      mockFs.access
        .mockResolvedValueOnce(undefined) // main file exists
        .mockResolvedValueOnce(undefined); // backup file exists

      mockFs.readFile
        .mockResolvedValueOnce(corruptedMainContent) // corrupted main file
        .mockResolvedValueOnce(goodBackupContent); // good backup file

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      // Test data retrieval after recovery
      const modelsData = await provider.getItem('models');
      const templatesData = await provider.getItem('templates');
      const historyData = await provider.getItem('history');

      expect(modelsData).toBe(originalData.models);
      expect(templatesData).toBe(originalData.templates);
      expect(historyData).toBe(originalData.history);
    });
  });
});
