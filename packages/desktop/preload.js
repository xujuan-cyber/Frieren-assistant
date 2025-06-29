const { contextBridge, ipcRenderer } = require('electron');

// 生成唯一的流式请求ID
function generateStreamId() {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

contextBridge.exposeInMainWorld('electronAPI', {
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
    // Get all models
    getModels: async () => {
      const result = await ipcRenderer.invoke('model-getModels');
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

    // Get model options for dropdowns
    getModelOptions: async () => {
      const result = await ipcRenderer.invoke('model-getModelOptions');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    }
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
    }
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
    }
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
  
  // Add an identifier so the frontend knows it's running in Electron
  isElectron: true
}); 