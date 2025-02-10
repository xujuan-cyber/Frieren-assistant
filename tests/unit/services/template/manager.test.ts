import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateManager } from '../../../../src/services/template/manager';
import { DEFAULT_TEMPLATES } from '../../../../src/services/template/defaults';
import { Template } from '../../../../src/services/template/types';
import { TemplateValidationError } from '../../../../src/services/template/errors';

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
    }
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
    it('应该正确初始化内置提示词', async () => {
      console.log('测试: 初始化内置提示词');
      await templateManager.init();
      
      const templates = await templateManager.listTemplates();
      expect(templates).toHaveLength(Object.keys(DEFAULT_TEMPLATES).length);
      expect(templates[0].isBuiltin).toBe(true);
      console.log('验证: 内置提示词加载正确');
    });

    it('应该正确加载用户提示词', async () => {
      console.log('测试: 加载用户提示词');
      // 预先存储一个用户提示词
      localStorage.setItem('app:templates', JSON.stringify([mockUserTemplate]));
      
      await templateManager.init();
      const templates = await templateManager.listTemplates();
      
      expect(templates).toHaveLength(Object.keys(DEFAULT_TEMPLATES).length + 1);
      expect(templates.find(t => t.id === 'user-template')).toBeTruthy();
      console.log('验证: 用户提示词加载正确');
    });
  });

  describe('提示词操作测试', () => {
    beforeEach(async () => {
      console.log('准备: 提示词操作测试');
      await templateManager.init();
    });

    it('应该能获取内置提示词', async () => {
      console.log('测试: 获取内置提示词');
      // 获取第一个optimize类型的提示词
      const templates = await templateManager.getTemplatesByType('optimize');
      const optimizeTemplate = templates[0];
      
      const template = await templateManager.getTemplate(optimizeTemplate.id);
      
      expect(template).toBeDefined();
      expect(template.metadata.templateType).toBe('optimize');
      expect(template.isBuiltin).toBe(true);
      console.log('验证: 内置提示词获取正确');
    });

    it('应该能保存和获取用户提示词', async () => {
      console.log('测试: 保存和获取用户提示词');
      const template = { ...mockUserTemplate };
      await templateManager.saveTemplate(template);
      
      const saved = await templateManager.getTemplate('user-template');
      expect(saved.id).toBe(template.id);
      expect(saved.name).toBe(template.name);
      expect(saved.content).toBe(template.content);
      expect(saved.metadata.version).toBe(template.metadata.version);
      console.log('验证: 用户提示词保存和获取正确');
    });

    it('不应该覆盖内置提示词', async () => {
      console.log('测试: 尝试覆盖内置提示词');
      // 获取第一个内置optimize提示词的ID
      const templates = await templateManager.getTemplatesByType('optimize');
      const builtinTemplateId = templates[0].id;
      
      const badTemplate = { ...mockUserTemplate, id: builtinTemplateId };
      
      await expect(() => templateManager.saveTemplate(badTemplate))
        .rejects.toThrow('不能覆盖内置提示词');
      console.log('验证: 正确阻止覆盖内置提示词');
    });

    it('应该能删除用户提示词', async () => {
      console.log('测试: 删除用户提示词');
      await templateManager.saveTemplate(mockUserTemplate);
      await templateManager.deleteTemplate('user-template');
      
      await expect(() => templateManager.getTemplate('user-template'))
        .rejects.toThrow('提示词 user-template 不存在');
      console.log('验证: 用户提示词删除正确');
    });

    it('不应该删除内置提示词', async () => {
      console.log('测试: 尝试删除内置提示词');
      // 获取第一个内置optimize提示词的ID
      const templates = await templateManager.getTemplatesByType('optimize');
      const builtinTemplateId = templates[0].id;
      
      await expect(() => templateManager.deleteTemplate(builtinTemplateId))
        .rejects.toThrow('不能删除内置提示词');
      console.log('验证: 正确阻止删除内置提示词');
    });
  });

  describe('提示词验证测试', () => {
    it('应该验证提示词格式', async () => {
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

      await expect(() => templateManager.saveTemplate(invalidTemplate))
        .rejects.toThrowError(TemplateValidationError);
      console.log('验证: 正确拒绝无效提示词');
    });
  });

  describe('导入导出测试', () => {
    beforeEach(async () => {
      await templateManager.init();
    });

    it('应该能导出用户提示词', async () => {
      console.log('测试: 导出用户提示词');
      const template = { ...mockUserTemplate };
      await templateManager.saveTemplate(template);
      
      const exported = templateManager.exportTemplate('user-template');
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(template.id);
      expect(parsed.name).toBe(template.name);
      expect(parsed.content).toBe(template.content);
      console.log('验证: 提示词导出正确');
    });

    it('应该能导入用户提示词', async () => {
      console.log('测试: 导入用户提示词');
      const template = { ...mockUserTemplate };
      const templateJson = JSON.stringify(template);
      
      await templateManager.importTemplate(templateJson);
      const imported = await templateManager.getTemplate('user-template');
      
      expect(imported.id).toBe(template.id);
      expect(imported.name).toBe(template.name);
      expect(imported.content).toBe(template.content);
      console.log('验证: 提示词导入正确');
    });

    it('应该验证导入的提示词', async () => {
      console.log('测试: 验证导入提示词');
      const invalidTemplate = { ...mockUserTemplate, id: '' };
      
      await expect(() => templateManager.importTemplate(JSON.stringify(invalidTemplate)))
        .rejects.toThrowError(TemplateValidationError);
      console.log('验证: 正确拒绝无效的导入提示词');
    });
  });

  describe('列表和排序测试', () => {
    it('应该正确排序提示词列表', async () => {
      console.log('测试: 提示词列表排序');
      await templateManager.init();
      
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
      
      await templateManager.saveTemplate(template1);
      await templateManager.saveTemplate(template2);
      
      const templates = await templateManager.listTemplates();
      
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