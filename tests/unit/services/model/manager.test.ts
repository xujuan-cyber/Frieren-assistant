import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelManager } from '../../../../src/services/model/manager';
import { ModelConfig } from '../../../../src/services/model/types';
import { ModelConfigError } from '../../../../src/services/llm/errors';

describe('ModelManager', () => {
  let manager: ModelManager;
  let mockModelConfig: ModelConfig;

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    
    mockModelConfig = {
      name: 'Test Model',
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      models: ['test-model'],
      defaultModel: 'test-model',
      enabled: true
    };

    // 创建一个新的 ModelManager 实例，但先清除默认模型
    manager = new ModelManager();
    const defaultModels = manager.getAllModels();
    defaultModels.forEach(model => {
      manager.deleteModel(model.key);
    });
  });

  describe('addModel', () => {
    it('should add a valid model configuration', () => {
      manager.addModel('test', mockModelConfig);
      const models = manager.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0]).toMatchObject({ ...mockModelConfig, key: 'test' });
    });

    it('should throw error when adding duplicate model', () => {
      manager.addModel('test', mockModelConfig);
      expect(() => manager.addModel('test', mockModelConfig))
        .toThrow(ModelConfigError);
    });

    it('should throw error when adding invalid config', () => {
      const invalidConfig = { ...mockModelConfig, name: '' };
      expect(() => manager.addModel('test', invalidConfig))
        .toThrow(ModelConfigError);
    });
  });

  describe('updateModel', () => {
    it('should update existing model', () => {
      manager.addModel('test', mockModelConfig);
      const updateConfig = {
        name: 'Updated Model',
        baseURL: 'https://updated.api'
      };
      manager.updateModel('test', updateConfig);
      const models = manager.getAllModels();
      expect(models[0].name).toBe('Updated Model');
      expect(models[0].baseURL).toBe('https://updated.api');
    });

    it('should throw error when updating non-existent model', () => {
      expect(() => manager.updateModel('non-existent', { name: 'New Name' }))
        .toThrow(ModelConfigError);
    });

    it('should throw error when update makes config invalid', () => {
      manager.addModel('test', mockModelConfig);
      expect(() => manager.updateModel('test', { name: '' }))
        .toThrow(ModelConfigError);
    });
  });

  describe('deleteModel', () => {
    it('should delete existing model', () => {
      manager.addModel('test', mockModelConfig);
      manager.deleteModel('test');
      expect(manager.getAllModels()).toHaveLength(0);
    });

    it('should throw error when deleting non-existent model', () => {
      expect(() => manager.deleteModel('non-existent'))
        .toThrow(ModelConfigError);
    });
  });

  describe('getAllModels', () => {
    it('should return all models with their keys', () => {
      manager.addModel('test1', mockModelConfig);
      manager.addModel('test2', { ...mockModelConfig, name: 'Test Model 2' });
      const models = manager.getAllModels();
      expect(models).toHaveLength(2);
      expect(models[0]).toHaveProperty('key');
      expect(models[1]).toHaveProperty('key');
    });

    it('should return empty array when no models exist', () => {
      const models = manager.getAllModels();
      expect(models).toHaveLength(0);
    });
  });

  describe('storage operations', () => {
    it('should persist models to localStorage', () => {
      manager.addModel('test', mockModelConfig);
      const storedData = localStorage.getItem('models');
      expect(storedData).toBeDefined();
      const storedModels = JSON.parse(storedData!);
      expect(storedModels.test).toMatchObject(mockModelConfig);
    });

    it('should load models from localStorage', () => {
      localStorage.setItem('models', JSON.stringify({ test: mockModelConfig }));
      manager = new ModelManager();
      // 删除默认模型后再检查
      const defaultModels = manager.getAllModels();
      defaultModels.forEach(model => {
        if (model.key !== 'test') {
          manager.deleteModel(model.key);
        }
      });
      const models = manager.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0]).toMatchObject({ ...mockModelConfig, key: 'test' });
    });

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => new ModelManager()).not.toThrow();
    });
  });
}); 