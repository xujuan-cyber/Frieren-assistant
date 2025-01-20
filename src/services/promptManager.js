import yaml from 'js-yaml';

class PromptManager {
  constructor() {
    this.templateDir = './src/prompts/templates';
    this.defaultTemplate = 'optimize';
    this.initialized = false;
    this.templateCache = new Map(); // 使用 Map 存储模板和其加载时间
    this.cacheTimeout = 5000; // 缓存过期时间（毫秒）
  }

  // 初始化：加载模板索引
  async init() {
    try {
      await this.loadTemplateIndex();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize templates:', error);
      this.initialized = false;
      throw new Error(`Template initialization failed: ${error.message}`);
    }
  }

  // 加载模板索引
  async loadTemplateIndex() {
    const response = await fetch(`${this.templateDir}/_index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch template index: ${response.status} ${response.statusText}`);
    }
    
    const templateFiles = await response.json();
    if (!Array.isArray(templateFiles) || templateFiles.length === 0) {
      throw new Error('Template index is empty or invalid');
    }

    // 验证默认模板是否在索引中
    if (!templateFiles.includes(`${this.defaultTemplate}.yaml`)) {
      throw new Error(`Default template '${this.defaultTemplate}' not found in index`);
    }

    return templateFiles;
  }

  // 加载单个模板文件
  async loadTemplate(fileName, force = false) {
    const templateId = fileName.replace('.yaml', '');
    const cached = this.templateCache.get(templateId);
    
    // 如果缓存存在且未过期，且不是强制刷新，则使用缓存
    if (!force && cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.template;
    }

    try {
      const response = await fetch(`${this.templateDir}/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template file: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      const template = yaml.load(content);
      
      // 验证模板格式
      if (!template.name || !template.description || !template.template) {
        throw new Error(`Invalid template format in ${fileName}: missing required fields`);
      }

      // 更新缓存
      this.templateCache.set(templateId, {
        template,
        timestamp: Date.now()
      });

      return template;
    } catch (error) {
      console.error(`Failed to load template ${fileName}:`, error);
      // 如果加载失败且没有缓存，则抛出错误
      if (!cached) {
        throw error;
      }
      // 如果加载失败但有缓存，使用缓存并记录警告
      console.warn(`Using cached template for ${fileName} due to load failure`);
      return cached.template;
    }
  }

  // 获取指定模板
  async getTemplate(templateId = this.defaultTemplate) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const template = await this.loadTemplate(`${templateId}.yaml`);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  // 强制重新加载指定模板
  async reloadTemplate(templateId) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }
    return await this.loadTemplate(`${templateId}.yaml`, true);
  }

  // 清除模板缓存
  clearCache(templateId) {
    if (templateId) {
      this.templateCache.delete(templateId);
    } else {
      this.templateCache.clear();
    }
  }

  // 设置缓存超时时间
  setCacheTimeout(timeout) {
    this.cacheTimeout = timeout;
  }

  // 获取历史记录
  getHistory() {
    try {
      const historyStr = localStorage.getItem('promptHistory');
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }

  // 添加到历史记录
  addToHistory(prompt, result, type = 'optimize', parentId = null) {
    try {
      const history = this.getHistory();
      const newRecord = {
        id: Date.now().toString(),
        prompt,
        result,
        type,
        parentId,
        timestamp: Date.now()
      };
      
      history.unshift(newRecord);
      localStorage.setItem('promptHistory', JSON.stringify(history.slice(0, 50))); // 只保留最近50条记录
      return newRecord;
    } catch (error) {
      console.error('添加历史记录失败:', error);
      throw error;
    }
  }

  // 获取迭代链
  getIterationChain(recordId) {
    try {
      const history = this.getHistory();
      const chain = [];
      let currentId = recordId;

      while (currentId) {
        const record = history.find(h => h.id === currentId);
        if (!record) break;
        
        chain.unshift(record);
        currentId = record.parentId;
      }

      return chain;
    } catch (error) {
      console.error('获取迭代链失败:', error);
      return [];
    }
  }

  // 清除历史记录
  clearHistory() {
    try {
      localStorage.removeItem('promptHistory');
    } catch (error) {
      console.error('清除历史记录失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const promptManager = new PromptManager(); 