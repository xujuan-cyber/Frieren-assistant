import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateManager } from '../../../../src/services/template/manager';
import { load } from 'js-yaml';

// 模拟 fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  const mockTemplate = {
    name: '测试模板',
    description: '这是一个测试模板',
    template: 'Hello {{name}}',
    variables: ['name']
  };

  beforeEach(() => {
    console.log('开始新的测试用例');
    templateManager = new TemplateManager();
    mockFetch.mockReset();
    console.log('Mock fetch 已重置');
  });

  afterEach(() => {
    console.log('测试用例结束，清理 mock');
    vi.clearAllMocks();
  });

  describe('初始化测试', () => {
    it('应该正确初始化模板管理器', async () => {
      console.log('测试: 正确初始化模板管理器');
      // 模拟索引文件请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['optimize.yaml', 'test.yaml']
      });
      console.log('Mock: 设置索引文件响应');

      await templateManager.init();
      console.log('模板管理器初始化完成');

      expect(mockFetch).toHaveBeenCalledWith('/templates/_index.json');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      console.log('验证: fetch 调用正确');
    });

    it('初始化失败时应该抛出错误', async () => {
      console.log('测试: 初始化失败场景');
      // 模拟请求失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: '404 Not Found'
      });
      console.log('Mock: 设置失败响应');

      await expect(templateManager.init()).rejects.toThrow('加载模板索引失败');
      console.log('验证: 正确抛出错误');
    });
  });

  describe('模板操作测试', () => {
    beforeEach(async () => {
      console.log('准备: 模板操作测试');
      // 模拟成功初始化
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['optimize.yaml']
      });
      await templateManager.init();
      console.log('模板管理器已初始化');
    });

    it('应该能够获取默认模板', async () => {
      console.log('测试: 获取默认模板');
      // 模拟模板文件请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTemplate)
      });
      console.log('Mock: 设置模板响应');

      const template = await templateManager.getTemplate();
      console.log('获取到模板:', template);

      expect(template).toEqual(mockTemplate);
      expect(mockFetch).toHaveBeenCalledWith('/templates/optimize.yaml');
      console.log('验证: 模板内容和请求路径正确');
    });

    it('获取不存在的模板时应该抛出错误', async () => {
      console.log('测试: 获取不存在的模板');
      // 模拟请求失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: '404 Not Found'
      });
      console.log('Mock: 设置失败响应');

      await expect(templateManager.getTemplate('nonexistent')).rejects.toThrow('加载模板失败');
      console.log('验证: 正确抛出错误');
    });
  });

  describe('缓存测试', () => {
    it('应该正确处理缓存超时', async () => {
      console.log('测试: 缓存超时处理');
      // 设置较短的缓存超时时间
      templateManager.setCacheTimeout(100);
      console.log('设置缓存超时时间: 100ms');
      
      // 模拟成功初始化
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['optimize.yaml']
      });
      await templateManager.init();
      console.log('模板管理器已初始化');

      // 模拟第一次请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTemplate)
      });
      const firstResult = await templateManager.getTemplate();
      console.log('第一次获取模板:', firstResult);

      // 等待缓存过期
      console.log('等待缓存过期...');
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('缓存已过期');

      // 模拟第二次请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTemplate)
      });
      const secondResult = await templateManager.getTemplate();
      console.log('第二次获取模板:', secondResult);

      // 验证fetch被调用了三次（一次初始化 + 两次模板请求）
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(firstResult).toEqual(secondResult);
      console.log('验证: 请求次数和结果一致');
    });

    it('应该能够清除缓存', async () => {
      console.log('测试: 清除缓存');
      // 模拟成功初始化
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['optimize.yaml']
      });
      await templateManager.init();
      console.log('模板管理器已初始化');

      // 模拟第一次请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTemplate)
      });
      const firstResult = await templateManager.getTemplate();
      console.log('第一次获取模板:', firstResult);

      // 清除缓存
      templateManager.clearCache();
      console.log('缓存已清除');

      // 模拟第二次请求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTemplate)
      });
      const secondResult = await templateManager.getTemplate();
      console.log('第二次获取模板:', secondResult);

      // 验证fetch被调用了三次（一次初始化 + 两次模板请求）
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(firstResult).toEqual(secondResult);
      console.log('验证: 请求次数和结果一致');
    });
  });
}); 