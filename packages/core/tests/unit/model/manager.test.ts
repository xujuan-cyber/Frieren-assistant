import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ModelManager,
  ModelConfig,
  ModelConfigError
} from '../../../src/index';

describe('ModelManager', () => {
  let manager: ModelManager;
  let mockModelConfig: ModelConfig;

  beforeEach(() => {
    mockModelConfig = {
      name: 'Test Model',
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      models: ['test-model'],
      defaultModel: 'test-model',
      enabled: true,
      provider: 'openai'
    };

    manager = new ModelManager();
    // 清除默认模型
    const defaultModels = manager.getAllModels();
    defaultModels.forEach(model => {
      if (model.key) {
        manager.deleteModel(model.key);
      }
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
      const model = manager.getModel('test');
      if (!model) {
        throw new Error('Model should exist');
      }
      expect(model.name).toBe('Updated Model');
      expect(model.baseURL).toBe('https://updated.api');
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
      expect(manager.getModel('test')).toBeUndefined();
    });

    it('should throw error when deleting non-existent model', () => {
      expect(() => manager.deleteModel('non-existent'))
        .toThrow(ModelConfigError);
    });
  });

  describe('getModel', () => {
    it('should return model by key', () => {
      manager.addModel('test', mockModelConfig);
      const model = manager.getModel('test');
      if (!model) {
        throw new Error('Model should exist');
      }
      expect(model).toMatchObject(mockModelConfig);
    });

    it('should return undefined for non-existent model', () => {
      expect(manager.getModel('non-existent')).toBeUndefined();
    });
  });
}); 