import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  TemplateManager,
  Template,
  TemplateValidationError,
  DEFAULT_TEMPLATES
} from '../../../src';

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  // 模拟用户提示词
  const mockUserTemplate: Template = {
    id: 'user-template',
    name: '用户自定义提示词',
    content: '这是一个测试提示词',
    metadata: {
      version: '1.0.0',
      lastModified: Date.now(),
      author: 'Test User',
      description: '测试用的提示词',
      templateType: 'optimize'
    },
    isBuiltin: false
  };

  beforeEach(() => {
    console.log('开始新的测试用例');
    templateManager = new TemplateManager();
    console.log('提示词管理器已初始化');
  });

  afterEach(() => {
    console.log('测试用例结束，清理 mock');
    vi.clearAllMocks();
  });

  describe('初始化测试', () => {
    it('应该正确初始化内置提示词', () => {
      console.log('开始新的测试用例');
      console.log('提示词管理器已初始化');
      
      console.log('测试: 初始化内置提示词');
      // 重新创建模板管理器实例，而不是直接调用私有的init方法
      templateManager = new TemplateManager();
      
      const templates = templateManager.getTemplatesByType('optimize');
      expect(templates.length).toBeGreaterThan(0);
      console.log('验证: 内置提示词加载正确');
      
      console.log('测试用例结束，清理 mock');
    });

    it('应该正确加载用户提示词', () => {
      console.log('开始新的测试用例');
      console.log('提示词管理器已初始化');
      
      console.log('测试: 加载用户提示词');
      // 模拟localStorage中有用户提示词
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify([mockUserTemplate])),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      vi.stubGlobal('localStorage', mockStorage);
      
      // 重新创建模板管理器实例，而不是直接调用私有的init方法
      templateManager = new TemplateManager();
      
      const template = templateManager.getTemplate('user-template');
      expect(template).toBeDefined();
      expect(template.id).toBe('user-template');
      console.log('验证: 用户提示词加载正确');
      
      console.log('测试用例结束，清理 mock');
      vi.unstubAllGlobals();
    });
  });

  describe('提示词操作测试', () => {
    beforeEach(() => {
      console.log('开始新的测试用例');
      console.log('提示词管理器已初始化');
      
      // 重新创建模板管理器实例，而不是直接调用私有的init方法
      templateManager = new TemplateManager();
      
      console.log('准备: 提示词操作测试');
    });

    it('应该能获取内置提示词', () => {
      console.log('测试: 获取内置提示词');
      // 获取第一个optimize类型的提示词
      const templates = templateManager.getTemplatesByType('optimize');
      const optimizeTemplate = templates[0];
      
      const template = templateManager.getTemplate(optimizeTemplate.id);
      
      expect(template).toBeDefined();
      expect(template.metadata.templateType).toBe('optimize');
      expect(template.isBuiltin).toBe(true);
      console.log('验证: 内置提示词获取正确');
    });

    it('应该能保存和获取用户提示词', () => {
      console.log('测试: 保存和获取用户提示词');
      const template = { ...mockUserTemplate };
      templateManager.saveTemplate(template);
      
      const saved = templateManager.getTemplate('user-template');
      expect(saved.id).toBe(template.id);
      expect(saved.name).toBe(template.name);
      expect(saved.content).toBe(template.content);
      expect(saved.metadata.version).toBe(template.metadata.version);
      console.log('验证: 用户提示词保存和获取正确');
    });

    it('不应该覆盖内置提示词', () => {
      console.log('测试: 尝试覆盖内置提示词');
      // 获取第一个内置optimize提示词的ID
      const templates = templateManager.getTemplatesByType('optimize');
      const builtinTemplateId = templates[0].id;
      
      const badTemplate = { ...mockUserTemplate, id: builtinTemplateId };
      
      // 使用正确的断言方式
      try {
        templateManager.saveTemplate(badTemplate);
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false); // 强制测试失败
      } catch (error) {
        expect(error.message).toBe(`不能覆盖内置提示词: ${builtinTemplateId}`);
      }
      console.log('验证: 正确阻止覆盖内置提示词');
    });

    it('应该能删除用户提示词', () => {
      console.log('测试: 删除用户提示词');
      // 先保存用户模板
      templateManager.saveTemplate(mockUserTemplate);
      // 然后删除
      templateManager.deleteTemplate('user-template');
      
      // 更新期望的错误消息，使用正确的断言方式
      try {
        templateManager.getTemplate('user-template');
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false); // 强制测试失败
      } catch (error) {
        expect(error.message).toBe('提示词 user-template 不存在');
      }
      console.log('验证: 用户提示词删除正确');
    });

    it('不应该删除内置提示词', () => {
      console.log('测试: 尝试删除内置提示词');
      // 获取第一个内置optimize提示词的ID
      const templates = templateManager.getTemplatesByType('optimize');
      const builtinTemplateId = templates[0].id;
      
      // 使用正确的断言方式
      try {
        templateManager.deleteTemplate(builtinTemplateId);
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false); // 强制测试失败
      } catch (error) {
        expect(error.message).toBe(`不能删除内置提示词: ${builtinTemplateId}`);
      }
      console.log('验证: 正确阻止删除内置提示词');
    });
  });

  describe('提示词验证测试', () => {
    it('应该验证提示词格式', () => {
      console.log('测试: 提示词格式验证');
      const invalidTemplate = {
        id: '',  // 无效的ID
        name: '测试提示词',
        content: '',  // 无效的内容
        metadata: {
          version: '1.0.0',
          lastModified: Date.now()
        }
      } as Template;

      // 使用正确的断言方式
      try {
        templateManager.saveTemplate(invalidTemplate);
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false); // 强制测试失败
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateValidationError);
      }
      console.log('验证: 正确拒绝无效提示词');
    });
  });

  describe('导入导出测试', () => {
    beforeEach(() => {
      // 重新创建模板管理器实例，而不是直接调用私有的init方法
      templateManager = new TemplateManager();
      console.log('提示词管理器已初始化');
    });

    it('应该能导出用户提示词', () => {
      console.log('测试: 导出用户提示词');
      const template = { ...mockUserTemplate };
      templateManager.saveTemplate(template);
      
      const exported = templateManager.exportTemplate('user-template');
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(template.id);
      expect(parsed.name).toBe(template.name);
      expect(parsed.content).toBe(template.content);
      console.log('验证: 提示词导出正确');
    });

    it('应该能导入用户提示词', () => {
      console.log('测试: 导入用户提示词');
      const template = { ...mockUserTemplate };
      const templateJson = JSON.stringify(template);
      
      templateManager.importTemplate(templateJson);
      const imported = templateManager.getTemplate('user-template');
      
      expect(imported.id).toBe(template.id);
      expect(imported.name).toBe(template.name);
      expect(imported.content).toBe(template.content);
      console.log('验证: 提示词导入正确');
    });

    it('应该验证导入的提示词', () => {
      console.log('测试: 验证导入提示词');
      const invalidTemplate = { ...mockUserTemplate, id: '' };
      
      // 使用正确的断言方式
      try {
        templateManager.importTemplate(JSON.stringify(invalidTemplate));
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false); // 强制测试失败
      } catch (error) {
        expect(error.message).toMatch(/提示词验证失败/);
      }
      console.log('验证: 正确拒绝无效的导入提示词');
    });
  });

  describe('列表和排序测试', () => {
    beforeEach(() => {
      console.log('开始新的测试用例');
      console.log('提示词管理器已初始化');
      
      // 重新创建模板管理器实例，而不是直接调用私有的init方法
      templateManager = new TemplateManager();
    });

    it('应该正确排序提示词列表', () => {
      console.log('测试: 提示词列表排序');      
      const baseTime = Date.now();
      
      // 创建两个时间戳不同的用户提示词
      const template1 = { 
        ...mockUserTemplate,
        id: 'user-template-1',
        metadata: { 
          ...mockUserTemplate.metadata,
          lastModified: baseTime
        }
      };
      
      const template2 = {
        ...mockUserTemplate,
        id: 'user-template-2',
        metadata: {
          ...mockUserTemplate.metadata,
          lastModified: baseTime + 1000
        }
      };
      
      templateManager.saveTemplate(template1);
      templateManager.saveTemplate(template2);
      
      const templates = templateManager.listTemplates();
      
      // 验证内置提示词在前
      expect(templates[0].isBuiltin).toBe(true);
      
      // 验证用户提示词按时间倒序排序
      const userTemplates = templates.filter(t => !t.isBuiltin);
      expect(userTemplates[0].id).toBe('user-template-2');
      expect(userTemplates[1].id).toBe('user-template-1');
      
      console.log('验证: 提示词列表排序正确');
    });
  });
}); 