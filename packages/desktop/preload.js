const { contextBridge, ipcRenderer } = require('electron');

// 生成唯一的流式请求ID
function generateStreamId() {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // IPC event listeners
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // High-level LLM service interface
  llm: {
    // Test connection to a provider
    testConnection: async (provider) => {
      const result = await ipcRenderer.invoke('llm-testConnection', provider);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Send a simple message
    sendMessage: async (messages, provider) => {
      const result = await ipcRenderer.invoke('llm-sendMessage', messages, provider);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Send a structured message
    sendMessageStructured: async (messages, provider) => {
      const result = await ipcRenderer.invoke('llm-sendMessageStructured', messages, provider);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Fetch model list
    fetchModelList: async (provider, customConfig) => {
      const result = await ipcRenderer.invoke('llm-fetchModelList', provider, customConfig);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Send streaming message
    sendMessageStream: async (messages, provider, callbacks) => {
      const streamId = generateStreamId();
      
      // Set up event listeners for streaming responses
      const contentListener = (event, content) => {
        if (callbacks.onContent) callbacks.onContent(content);
      };
      const thinkingListener = (event, thinking) => {
        if (callbacks.onThinking) callbacks.onThinking(thinking);
      };
      const finishListener = (event) => {
        cleanup();
        if (callbacks.onFinish) callbacks.onFinish();
      };
      const errorListener = (event, error) => {
        cleanup();
        if (callbacks.onError) callbacks.onError(new Error(error));
      };

      // Clean up listeners
      const cleanup = () => {
        ipcRenderer.removeListener(`stream-content-${streamId}`, contentListener);
        ipcRenderer.removeListener(`stream-thinking-${streamId}`, thinkingListener);
        ipcRenderer.removeListener(`stream-finish-${streamId}`, finishListener);
        ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener);
      };

      // Register listeners
      ipcRenderer.on(`stream-content-${streamId}`, contentListener);
      ipcRenderer.on(`stream-thinking-${streamId}`, thinkingListener);
      ipcRenderer.on(`stream-finish-${streamId}`, finishListener);
      ipcRenderer.on(`stream-error-${streamId}`, errorListener);

      // Send the streaming request
      try {
        const result = await ipcRenderer.invoke('llm-sendMessageStream', messages, provider, streamId);
        if (!result.success) {
          cleanup();
          throw new Error(result.error);
        }
      } catch (error) {
        cleanup();
        throw error;
      }
    }
  },

  // Model Manager interface
  model: {
    ensureInitialized: async () => {
      const result = await ipcRenderer.invoke('model-ensureInitialized');
      if (!result.success) throw new Error(result.error);
    },

    isInitialized: async () => {
      const result = await ipcRenderer.invoke('model-isInitialized');
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    // Get all models
    getAllModels: async () => {
      const result = await ipcRenderer.invoke('model-getAllModels');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Get all models
    getModels: async () => {
      console.warn('`getModels` is deprecated, please use `getAllModels`');
      const result = await ipcRenderer.invoke('model-getAllModels');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Add a new model
    addModel: async (model) => {
      const result = await ipcRenderer.invoke('model-addModel', model);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Update an existing model
    updateModel: async (id, updates) => {
      const result = await ipcRenderer.invoke('model-updateModel', id, updates);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    // Delete a model
    deleteModel: async (id) => {
      const result = await ipcRenderer.invoke('model-deleteModel', id);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    getEnabledModels: async () => {
      const result = await ipcRenderer.invoke('model-getEnabledModels');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
  },

  // Template Manager interface
  template: {
    // Get all templates
    getTemplates: async () => {
      const result = await ipcRenderer.invoke('template-getTemplates');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Get a specific template
    getTemplate: async (id) => {
      const result = await ipcRenderer.invoke('template-getTemplate', id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Create a new template
    createTemplate: async (template) => {
      const result = await ipcRenderer.invoke('template-createTemplate', template);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Update an existing template
    updateTemplate: async (id, updates) => {
      const result = await ipcRenderer.invoke('template-updateTemplate', id, updates);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    // Delete a template
    deleteTemplate: async (id) => {
      const result = await ipcRenderer.invoke('template-deleteTemplate', id);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    // Add listTemplatesByType
    listTemplatesByType: async (type) => {
      const result = await ipcRenderer.invoke('template-listTemplatesByType', type);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Template Import/Export
    exportTemplate: async (id) => {
      const result = await ipcRenderer.invoke('template-exportTemplate', id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    importTemplate: async (jsonString) => {
      const result = await ipcRenderer.invoke('template-importTemplate', jsonString);
      if (!result.success) throw new Error(result.error);
    },

    // Template language methods
    changeBuiltinTemplateLanguage: async (language) => {
      const result = await ipcRenderer.invoke('template-changeBuiltinTemplateLanguage', language);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    getCurrentBuiltinTemplateLanguage: async () => {
      const result = await ipcRenderer.invoke('template-getCurrentBuiltinTemplateLanguage');
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    getSupportedBuiltinTemplateLanguages: async () => {
      const result = await ipcRenderer.invoke('template-getSupportedBuiltinTemplateLanguages');
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

  },

  // History Manager interface
  history: {
    // Get all history records
    getHistory: async () => {
      const result = await ipcRenderer.invoke('history-getHistory');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Add a new history record
    addRecord: async (record) => {
      const result = await ipcRenderer.invoke('history-addRecord', record);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Delete a history record
    deleteRecord: async (id) => {
      const result = await ipcRenderer.invoke('history-deleteRecord', id);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    // Clear all history
    clearHistory: async () => {
      const result = await ipcRenderer.invoke('history-clearHistory');
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    // 添加缺失的历史记录链功能
    getIterationChain: async (recordId) => {
      const result = await ipcRenderer.invoke('history-getIterationChain', recordId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    getAllChains: async () => {
      const result = await ipcRenderer.invoke('history-getAllChains');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    getChain: async (chainId) => {
      const result = await ipcRenderer.invoke('history-getChain', chainId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    createNewChain: async (record) => {
      const result = await ipcRenderer.invoke('history-createNewChain', record);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    addIteration: async (params) => {
      const result = await ipcRenderer.invoke('history-addIteration', params);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    deleteChain: async (chainId) => {
      const result = await ipcRenderer.invoke('history-deleteChain', chainId);
      if (!result.success) {
        throw new Error(result.error);
      }
    }
  },

  // Prompt Service interface
  prompt: {
    optimizePrompt: async (request) => {
      const result = await ipcRenderer.invoke('prompt-optimizePrompt', request);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    optimizePromptStream: async (request, streamId) => {
      const result = await ipcRenderer.invoke('prompt-optimizePromptStream', request, streamId);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    iteratePromptStream: async (originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId, streamId) => {
      const result = await ipcRenderer.invoke('prompt-iteratePromptStream', originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId, streamId);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    testPromptStream: async (systemPrompt, userPrompt, modelKey, streamId) => {
      const result = await ipcRenderer.invoke('prompt-testPromptStream', systemPrompt, userPrompt, modelKey, streamId);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    iteratePrompt: async (originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId) => {
      const result = await ipcRenderer.invoke('prompt-iteratePrompt', originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    testPrompt: async (systemPrompt, userPrompt, modelKey) => {
      const result = await ipcRenderer.invoke('prompt-testPrompt', systemPrompt, userPrompt, modelKey);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    getHistory: async () => {
      const result = await ipcRenderer.invoke('prompt-getHistory');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    getIterationChain: async (recordId) => {
      const result = await ipcRenderer.invoke('prompt-getIterationChain', recordId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
  },

  // 配置同步接口 - 从主进程获取统一配置
  config: {
    // 获取环境变量（主进程作为唯一源）
    getEnvironmentVariables: async () => {
      const result = await ipcRenderer.invoke('config-getEnvironmentVariables');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    }
  },


  
  // Data Manager interface
  data: {
    // Export all data
    exportAllData: async () => {
      const result = await ipcRenderer.invoke('data-exportAllData');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    // Import all data
    importAllData: async (dataString) => {
      const result = await ipcRenderer.invoke('data-importAllData', dataString);
      if (!result.success) {
        throw new Error(result.error);
      }
    }
  },

  // Add an identifier so the frontend knows it's running in Electron
  isElectron: true,

  // Preference Service interface
  preference: {
    get: async (key, defaultValue) => {
      const result = await ipcRenderer.invoke('preference-get', key, defaultValue);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    set: async (key, value) => {
      const result = await ipcRenderer.invoke('preference-set', key, value);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    delete: async (key) => {
      const result = await ipcRenderer.invoke('preference-delete', key);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    keys: async () => {
      const result = await ipcRenderer.invoke('preference-keys');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    clear: async () => {
      const result = await ipcRenderer.invoke('preference-clear');
      if (!result.success) {
        throw new Error(result.error);
      }
    },
  },

  // Shell operations
  shell: {
    openExternal: async (url) => {
      const result = await ipcRenderer.invoke('shell-openExternal', url);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
  },
});