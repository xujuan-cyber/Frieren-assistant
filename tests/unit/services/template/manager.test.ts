import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from '../../../../src/services/template/manager';
import { TemplateError, TemplateLoadError } from '../../../../src/services/template/errors';
import { Template } from '../../../../src/services/template/types';
import { readFile } from 'fs/promises';
import { join } from 'path';

vi.mock('fs/promises');
vi.mock('path');

describe('TemplateManager', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
    vi.clearAllMocks();
  });

  const mockTemplate: Template = {
    name: 'Test Template',
    description: 'A test template',
    template: 'You are a test assistant. Help the user with their task.'
  };

  const mockTemplateYaml = `
name: Test Template
description: A test template
template: You are a test assistant. Help the user with their task.
`;

  const invalidTemplateYaml = `
name: Test Template
  description: A test template
    template: [Invalid indentation
      and missing closing bracket
`;

  describe('init', () => {
    it('should initialize successfully', async () => {
      vi.mocked(join).mockReturnValue('test/path/_index.json');
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(['optimize.yaml', 'test.yaml']));

      await manager.init();
      expect(readFile).toHaveBeenCalledWith('test/path/_index.json', 'utf-8');
    });

    it('should throw error when index file is not found', async () => {
      vi.mocked(join).mockReturnValue('test/path/_index.json');
      vi.mocked(readFile).mockRejectedValueOnce(new Error('File not found'));

      await expect(manager.init())
        .rejects
        .toThrow(TemplateError);
    });

    it('should throw error when default template is missing', async () => {
      vi.mocked(join).mockReturnValue('test/path/_index.json');
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(['test.yaml']));

      await expect(manager.init())
        .rejects
        .toThrow(TemplateError);
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      vi.mocked(join)
        .mockReturnValueOnce('test/path/_index.json')
        .mockReturnValue('test/path/test.yaml');
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(['optimize.yaml', 'test.yaml']))
        .mockResolvedValue(mockTemplateYaml);
      await manager.init();
    });

    it('should get template successfully', async () => {
      const template = await manager.getTemplate('test');
      expect(template).toEqual(mockTemplate);
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('File not found'));

      await expect(manager.getTemplate('invalid'))
        .rejects
        .toThrow(TemplateLoadError);
    });

    it('should throw error when YAML is invalid', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(invalidTemplateYaml);

      await expect(manager.getTemplate('test'))
        .rejects
        .toThrow(TemplateLoadError);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      vi.mocked(join)
        .mockReturnValueOnce('test/path/_index.json')
        .mockReturnValue('test/path/test.yaml');
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(['optimize.yaml', 'test.yaml']))
        .mockResolvedValue(mockTemplateYaml);
      await manager.init();
      await manager.getTemplate('test');
    });

    it('should use cache for subsequent requests', async () => {
      await manager.getTemplate('test');
      expect(readFile).toHaveBeenCalledTimes(2); // Once for init, once for first getTemplate
    });

    it('should bypass cache when force is true', async () => {
      await manager.loadTemplate('test.yaml', true);
      expect(readFile).toHaveBeenCalledTimes(3); // Once for init, once for first getTemplate, once for force load
    });

    it('should clear specific template cache', async () => {
      manager.clearCache('test');
      await manager.getTemplate('test');
      expect(readFile).toHaveBeenCalledTimes(3); // Once for init, once for first getTemplate, once after cache clear
    });

    it('should clear all cache', async () => {
      manager.clearCache();
      await manager.getTemplate('test');
      expect(readFile).toHaveBeenCalledTimes(3); // Once for init, once for first getTemplate, once after cache clear
    });

    it('should respect cache timeout', async () => {
      manager.setCacheTimeout(0); // Set timeout to 0 to force cache expiry
      await manager.getTemplate('test');
      expect(readFile).toHaveBeenCalledTimes(3); // Once for init, once for first getTemplate, once after cache timeout
    });
  });
}); 