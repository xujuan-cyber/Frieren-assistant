import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from '../../../../src/services/template/manager';
import { TemplateError, TemplateLoadError } from '../../../../src/services/template/errors';
import { Template } from '../../../../src/services/template/types';

describe('TemplateManager', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
    // Reset fetch mock
    vi.stubGlobal('fetch', vi.fn());
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
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(['optimize.yaml', 'test.yaml'])
      });
      vi.stubGlobal('fetch', mockFetch);

      await manager.init();
      expect(mockFetch).toHaveBeenCalledWith('./src/prompts/templates/_index.json');
    });

    it('should throw error when index file is not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(manager.init())
        .rejects
        .toThrow(TemplateError);
    });

    it('should throw error when default template is missing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(['test.yaml'])
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(manager.init())
        .rejects
        .toThrow(TemplateError);
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(['optimize.yaml', 'test.yaml'])
        });
      vi.stubGlobal('fetch', mockFetch);
      await manager.init();
    });

    it('should get template successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      const template = await manager.getTemplate('test');
      expect(template).toEqual(mockTemplate);
    });

    it('should throw error when template is not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(manager.getTemplate('invalid'))
        .rejects
        .toThrow(TemplateLoadError);
    });

    it('should throw error when YAML is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(invalidTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(manager.getTemplate('test'))
        .rejects
        .toThrow(TemplateLoadError);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(['optimize.yaml', 'test.yaml'])
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockTemplateYaml)
        });
      vi.stubGlobal('fetch', mockFetch);
      await manager.init();
      await manager.getTemplate('test');
    });

    it('should use cache for subsequent requests', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await manager.getTemplate('test');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should bypass cache when force is true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      await manager.loadTemplate('test.yaml', true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear specific template cache', async () => {
      manager.clearCache('test');
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      await manager.getTemplate('test');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear all cache', async () => {
      manager.clearCache();
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      await manager.getTemplate('test');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should respect cache timeout', async () => {
      manager.setCacheTimeout(0); // Set timeout to 0 to force cache expiry
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTemplateYaml)
      });
      vi.stubGlobal('fetch', mockFetch);

      await manager.getTemplate('test');
      expect(mockFetch).toHaveBeenCalled();
    });
  });
}); 