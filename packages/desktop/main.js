const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const {
  PreferenceService,
  createModelManager,
  createTemplateManager,
  createHistoryManager,
  createLLMService,
  createPromptService,
  createTemplateLanguageService,
  StorageFactory,
} = require('@prompt-optimizer/core');

let mainWindow;
let modelManager, templateManager, historyManager, llmService, promptService, templateLanguageService, preferenceService;

async function initializePreferenceService(storageProvider) {
  console.log('[DESKTOP] Initializing PreferenceService with the provided storage provider...');
  preferenceService = new PreferenceService(storageProvider);
  console.log('[DESKTOP] PreferenceService initialized.');
}

function setupPreferenceHandlers() {
  ipcMain.handle('preference-get', async (event, key, defaultValue) => {
    try {
      const value = await preferenceService.get(key, defaultValue);
      return createSuccessResponse(value);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('preference-set', async (event, key, value) => {
    try {
      await preferenceService.set(key, value);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In development, we can point to the vite dev server
  if (process.env.NODE_ENV === 'development') {
    console.log('[Main Process] Running in development mode, loading from Vite dev server');
    mainWindow.loadURL('http://localhost:18181');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built file from the web package
    const webDistPath = path.join(__dirname, 'web-dist/index.html');
    console.log('[Main Process] Loading web app from:', webDistPath);
    if (require('fs').existsSync(webDistPath)) {
      mainWindow.loadFile(webDistPath);
    } else {
      console.error('[Main Process] Web dist not found at:', webDistPath);
      console.error('[Main Process] Please run: pnpm run build:web and ensure it is copied to the desktop package.');
    }
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object
    mainWindow = null;
  });
}

async function initializeServices() {
  try {
    console.log('[Main Process] Initializing core services...');
    
    // 设置环境变量，确保主进程能访问API密钥
    // 这些环境变量应该在启动桌面应用之前设置
    console.log('[Main Process] Checking environment variables...');
    const envVars = [
      'VITE_OPENAI_API_KEY',
      'VITE_GEMINI_API_KEY', 
      'VITE_DEEPSEEK_API_KEY',
      'VITE_SILICONFLOW_API_KEY',
      'VITE_ZHIPU_API_KEY',
      'VITE_CUSTOM_API_KEY',
      'VITE_CUSTOM_API_BASE_URL',
      'VITE_CUSTOM_API_MODEL'
    ];
    
    let hasApiKeys = false;
    envVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        console.log(`[Main Process] Found ${envVar}: ${value.substring(0, 10)}...`);
        hasApiKeys = true;
      } else {
        console.log(`[Main Process] Missing ${envVar}`);
      }
    });
    
    if (!hasApiKeys) {
      console.warn('[Main Process] No API keys found in environment variables.');
      console.warn('[Main Process] Please set environment variables before starting the desktop app.');
      console.warn('[Main Process] Example: VITE_OPENAI_API_KEY=your_key_here npm start');
    }
    
    console.log('[DESKTOP] Creating memory storage provider for Node.js environment');
    const storageProvider = StorageFactory.create('memory');
    
    await initializePreferenceService(storageProvider);
    
    console.log('[DESKTOP] Creating model manager...');
    modelManager = createModelManager(storageProvider);
    
    console.log('[DESKTOP] Creating template language service...');
    templateLanguageService = createTemplateLanguageService(storageProvider);
    
    console.log('[DESKTOP] Creating template manager...');
    templateManager = createTemplateManager(storageProvider, templateLanguageService);
    
    console.log('[DESKTOP] Creating history manager...');
    historyManager = createHistoryManager(storageProvider, modelManager);
    
    console.log('[DESKTOP] Initializing model manager...');
    await modelManager.ensureInitialized();
    
    console.log('[DESKTOP] Creating LLM service...');
    llmService = createLLMService(modelManager);

    console.log('[DESKTOP] Creating Prompt service...');
    promptService = createPromptService(modelManager, llmService, templateManager, historyManager);
    
    console.log('[Main Process] Core services initialized successfully.');
    
    return true;
  } catch (error) {
    console.error('[Main Process] Failed to initialize core services:', error);
    console.error('[Main Process] Error details:', error.stack);
    return false;
  }
}

// --- IPC Response Helpers ---
function createSuccessResponse(data) {
  return { success: true, data };
}

function createErrorResponse(error) {
  console.error('[Main Process IPC Error]', error);
  // 对于非 Error 实例，包装一下
  const errorMessage = error instanceof Error ? error.message : String(error);
  return { success: false, error: errorMessage };
}

// --- High-Level IPC Service Handlers ---
function setupIPC() {
  console.log('[Main Process] Setting up high-level service IPC handlers...');
  setupPreferenceHandlers();
  
  // LLM Service handlers
  ipcMain.handle('llm-testConnection', async (event, provider) => {
    try {
      await llmService.testConnection(provider);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('llm-sendMessage', async (event, messages, provider) => {
    try {
      const result = await llmService.sendMessage(messages, provider);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('llm-sendMessageStructured', async (event, messages, provider) => {
    try {
      const result = await llmService.sendMessageStructured(messages, provider);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('llm-fetchModelList', async (event, provider, customConfig) => {
    try {
      const result = await llmService.fetchModelList(provider, customConfig);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Streaming handler - more complex due to callbacks
  ipcMain.handle('llm-sendMessageStream', async (event, messages, provider, streamId) => {
    try {
      const callbacks = {
        onContent: (content) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            event.sender.send(`stream-content-${streamId}`, content);
          }
        },
        onThinking: (thinking) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            event.sender.send(`stream-thinking-${streamId}`, thinking);
          }
        },
        onFinish: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            event.sender.send(`stream-finish-${streamId}`);
          }
        },
        onError: (error) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            event.sender.send(`stream-error-${streamId}`, error.message);
          }
        }
      };
      
      await llmService.sendMessageStream(messages, provider, callbacks);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Prompt Service handlers
  ipcMain.handle('prompt-optimizePrompt', async (event, request) => {
    try {
      const result = await promptService.optimizePrompt(request);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-iteratePrompt', async (event, originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId) => {
    try {
      const result = await promptService.iteratePrompt(originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-testPrompt', async (event, systemPrompt, userPrompt, modelKey) => {
    try {
      const result = await promptService.testPrompt(systemPrompt, userPrompt, modelKey);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-getHistory', async () => {
    try {
      const result = await historyManager.getHistory();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-getIterationChain', async (event, recordId) => {
    try {
      const result = await historyManager.getIterationChain(recordId);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Helper for creating stream handlers that send data to the renderer process
  const createIpcStreamHandlers = (window, streamId) => ({
    onToken: (token) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(`stream-token-${streamId}`, token);
      }
    },
    onReasoningToken: (token) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(`stream-reasoning-token-${streamId}`, token);
      }
    },
    onComplete: () => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(`stream-finish-${streamId}`);
      }
    },
    onError: (error) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(`stream-error-${streamId}`, error.message);
      }
    },
  });

  ipcMain.handle('prompt-optimizePromptStream', async (event, request, streamId) => {
    const streamHandlers = createIpcStreamHandlers(mainWindow, streamId);
    try {
      await promptService.optimizePromptStream(request, streamHandlers);
      return createSuccessResponse(null);
    } catch (error) {
      streamHandlers.onError(error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-iteratePromptStream', async (event, originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId, streamId) => {
    const streamHandlers = createIpcStreamHandlers(mainWindow, streamId);
    try {
      await promptService.iteratePromptStream(originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, streamHandlers, templateId);
      return createSuccessResponse(null);
    } catch (error) {
      streamHandlers.onError(error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('prompt-testPromptStream', async (event, systemPrompt, userPrompt, modelKey, streamId) => {
    const streamHandlers = createIpcStreamHandlers(mainWindow, streamId);
    try {
      await promptService.testPromptStream(systemPrompt, userPrompt, modelKey, streamHandlers);
      return createSuccessResponse(null);
    } catch (error) {
      streamHandlers.onError(error);
      return createErrorResponse(error);
    }
  });

  // Model Manager handlers
  ipcMain.handle('model-getModels', async (event) => {
    try {
      const result = await modelManager.getAllModels();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('model-addModel', async (event, model) => {
    try {
      // model应该包含key和config，需要分离
      const { key, ...config } = model;
      await modelManager.addModel(key, config);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('model-updateModel', async (event, id, updates) => {
    try {
      await modelManager.updateModel(id, updates);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('model-deleteModel', async (event, id) => {
    try {
      await modelManager.deleteModel(id);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('model-getModelOptions', async (event) => {
    try {
      const result = await modelManager.getModelOptions();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Template Manager handlers
  ipcMain.handle('template-getTemplates', async (event) => {
    try {
      const result = await templateManager.listTemplates();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('template-getTemplate', async (event, id) => {
    try {
      const result = await templateManager.getTemplate(id);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('template-createTemplate', async (event, template) => {
    try {
      await templateManager.saveTemplate(template);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('template-updateTemplate', async (event, id, updates) => {
    try {
      // Get existing template and merge with updates
      const existingTemplate = await templateManager.getTemplate(id);
      const updatedTemplate = { ...existingTemplate, ...updates, id };
      await templateManager.saveTemplate(updatedTemplate);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('template-deleteTemplate', async (event, id) => {
    try {
      await templateManager.deleteTemplate(id);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('template-listTemplatesByType', async (event, type) => {
    try {
      const result = await templateManager.listTemplatesByType(type);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // History Manager handlers
  ipcMain.handle('history-getHistory', async (event) => {
    try {
      const result = await historyManager.getRecords();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-addRecord', async (event, record) => {
    try {
      const result = await historyManager.addRecord(record);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-deleteRecord', async (event, id) => {
    try {
      await historyManager.deleteRecord(id);
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-clearHistory', async (event) => {
    try {
      await historyManager.clearHistory();
      return createSuccessResponse(null);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // 添加缺失的历史记录链功能
  ipcMain.handle('history-getIterationChain', async (event, recordId) => {
    try {
      const result = await historyManager.getIterationChain(recordId);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-getAllChains', async (event) => {
    try {
      const result = await historyManager.getAllChains();
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-getChain', async (event, chainId) => {
    try {
      const result = await historyManager.getChain(chainId);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-createNewChain', async (event, record) => {
    try {
      const result = await historyManager.createNewChain(record);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle('history-addIteration', async (event, params) => {
    try {
      const result = await historyManager.addIteration(params);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // 环境配置同步 - 主进程作为唯一配置源
  ipcMain.handle('config-getEnvironmentVariables', async (event) => {
    try {
      const envVars = {
        VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY || '',
        VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY || '',
        VITE_DEEPSEEK_API_KEY: process.env.VITE_DEEPSEEK_API_KEY || '',
        VITE_SILICONFLOW_API_KEY: process.env.VITE_SILICONFLOW_API_KEY || '',
        VITE_ZHIPU_API_KEY: process.env.VITE_ZHIPU_API_KEY || '',
        VITE_CUSTOM_API_KEY: process.env.VITE_CUSTOM_API_KEY || '',
        VITE_CUSTOM_API_BASE_URL: process.env.VITE_CUSTOM_API_BASE_URL || '',
        VITE_CUSTOM_API_MODEL: process.env.VITE_CUSTOM_API_MODEL || ''
      };
      
      console.log('[Main Process] Environment variables requested by UI process');
      return createSuccessResponse(envVars);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  console.log('[Main Process] High-level service IPC handlers ready.');
}

// This method is called when Electron has finished initialization.
app.whenReady().then(async () => {
  const servicesInitialized = await initializeServices();
  if (servicesInitialized) {
    // 必须先设置IPC监听器，再创建窗口
    // 以防止窗口中的代码在监听器准备好之前就发送IPC消息
    setupIPC();
    createWindow();
  } else {
    console.error('[Main Process] Failed to start application due to service initialization failure.');
    // Optionally, show a dialog to the user
    // dialog.showErrorBox('Application Error', 'Could not initialize critical services.');
    app.quit();
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 