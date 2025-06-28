const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 加载环境变量文件（如果存在）
try {
  // 首先尝试加载项目根目录的 .env.local 文件（与测试配置保持一致）
  const rootEnvPath = path.resolve(__dirname, '../../.env.local');
  require('dotenv').config({ path: rootEnvPath });
  console.log('[Main Process] .env.local file loaded from project root');
  
  // 然后尝试加载桌面应用目录的 .env 文件（作为补充）
  const localEnvPath = path.join(__dirname, '.env');
  require('dotenv').config({ path: localEnvPath });
  console.log('[Main Process] .env file loaded from desktop directory');
} catch (error) {
  console.log('[Main Process] No .env files found or dotenv not installed, using system environment variables');
}

// Import core services
const { 
  createLLMService, 
  createModelManager,
  createTemplateManager,
  createHistoryManager,
  createTemplateLanguageService,
  StorageFactory
} = require('@prompt-optimizer/core');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Global service instances
let llmService;
let modelManager;
let templateManager;
let historyManager;
let templateLanguageService;

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

// Initialize core services
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
    
    // Use memory storage for Node.js environment (Electron main process)
    console.log('[DESKTOP] Creating memory storage provider for Node.js environment');
    const storageProvider = StorageFactory.create('memory');
    
    // Create core service instances
    console.log('[DESKTOP] Creating model manager...');
    modelManager = createModelManager(storageProvider);
    
    console.log('[DESKTOP] Creating template language service...');
    templateLanguageService = createTemplateLanguageService(storageProvider);
    
    console.log('[DESKTOP] Creating template manager...');
    templateManager = createTemplateManager(storageProvider, templateLanguageService);
    
    console.log('[DESKTOP] Creating history manager...');
    historyManager = createHistoryManager(storageProvider, modelManager);
    
    // Initialize managers if needed
    console.log('[DESKTOP] Initializing model manager...');
    await modelManager.ensureInitialized();
    
    // Create LLM service
    console.log('[DESKTOP] Creating LLM service...');
    llmService = createLLMService(modelManager);
    
    console.log('[Main Process] Core services initialized successfully.');
    console.log('[Main Process] Using MemoryStorageProvider for Node.js environment.');
    
    return true;
  } catch (error) {
    console.error('[Main Process] Failed to initialize core services:', error);
    console.error('[Main Process] Error details:', error.stack);
    return false;
  }
}

// --- High-Level IPC Service Handlers ---
function setupIPC() {
  console.log('[Main Process] Setting up high-level service IPC handlers...');
  
  // LLM Service handlers
  ipcMain.handle('llm-testConnection', async (event, provider) => {
    try {
      await llmService.testConnection(provider);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] LLM testConnection failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm-sendMessage', async (event, messages, provider) => {
    try {
      const result = await llmService.sendMessage(messages, provider);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] LLM sendMessage failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm-sendMessageStructured', async (event, messages, provider) => {
    try {
      const result = await llmService.sendMessageStructured(messages, provider);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] LLM sendMessageStructured failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm-fetchModelList', async (event, provider, customConfig) => {
    try {
      const result = await llmService.fetchModelList(provider, customConfig);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] LLM fetchModelList failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Streaming handler - more complex due to callbacks
  ipcMain.handle('llm-sendMessageStream', async (event, messages, provider, streamId) => {
    try {
      const callbacks = {
        onContent: (content) => {
          event.sender.send(`stream-content-${streamId}`, content);
        },
        onThinking: (thinking) => {
          event.sender.send(`stream-thinking-${streamId}`, thinking);
        },
        onFinish: () => {
          event.sender.send(`stream-finish-${streamId}`);
        },
        onError: (error) => {
          event.sender.send(`stream-error-${streamId}`, error.message);
        }
      };
      
      await llmService.sendMessageStream(messages, provider, callbacks);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] LLM sendMessageStream failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Model Manager handlers
  ipcMain.handle('model-getModels', async (event) => {
    try {
      const result = await modelManager.getModels();
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] Model getModels failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model-addModel', async (event, model) => {
    try {
      await modelManager.addModel(model);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Model addModel failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model-updateModel', async (event, id, updates) => {
    try {
      await modelManager.updateModel(id, updates);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Model updateModel failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model-deleteModel', async (event, id) => {
    try {
      await modelManager.deleteModel(id);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Model deleteModel failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model-getModelOptions', async (event) => {
    try {
      const result = await modelManager.getModelOptions();
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] Model getModelOptions failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Template Manager handlers
  ipcMain.handle('template-getTemplates', async (event) => {
    try {
      const result = templateManager.listTemplates();
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] Template getTemplates failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template-getTemplate', async (event, id) => {
    try {
      const result = await templateManager.getTemplate(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] Template getTemplate failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template-createTemplate', async (event, template) => {
    try {
      await templateManager.saveTemplate(template);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Template createTemplate failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template-updateTemplate', async (event, id, updates) => {
    try {
      // Get existing template and merge with updates
      const existingTemplate = templateManager.getTemplate(id);
      const updatedTemplate = { ...existingTemplate, ...updates, id };
      await templateManager.saveTemplate(updatedTemplate);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Template updateTemplate failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template-deleteTemplate', async (event, id) => {
    try {
      await templateManager.deleteTemplate(id);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Template deleteTemplate failed:', error);
      return { success: false, error: error.message };
    }
  });

  // History Manager handlers
  ipcMain.handle('history-getHistory', async (event) => {
    try {
      const result = await historyManager.getRecords();
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History getHistory failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-addRecord', async (event, record) => {
    try {
      const result = await historyManager.addRecord(record);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History addRecord failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-deleteRecord', async (event, id) => {
    try {
      await historyManager.deleteRecord(id);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] History deleteRecord failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-clearHistory', async (event) => {
    try {
      await historyManager.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('[Main Process] History clearHistory failed:', error);
      return { success: false, error: error.message };
    }
  });

  // 添加缺失的历史记录链功能
  ipcMain.handle('history-getIterationChain', async (event, recordId) => {
    try {
      const result = await historyManager.getIterationChain(recordId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History getIterationChain failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-getAllChains', async (event) => {
    try {
      const result = await historyManager.getAllChains();
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History getAllChains failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-getChain', async (event, chainId) => {
    try {
      const result = await historyManager.getChain(chainId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History getChain failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-createNewChain', async (event, record) => {
    try {
      const result = await historyManager.createNewChain(record);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History createNewChain failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history-addIteration', async (event, params) => {
    try {
      const result = await historyManager.addIteration(params);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main Process] History addIteration failed:', error);
      return { success: false, error: error.message };
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
      return { success: true, data: envVars };
    } catch (error) {
      console.error('[Main Process] Failed to get environment variables:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[Main Process] High-level service IPC handlers ready.');
}

// This method is called when Electron has finished initialization.
app.whenReady().then(async () => {
  // Initialize services first
  const servicesReady = await initializeServices();
  
  if (servicesReady) {
    // Set up IPC with the initialized services
    setupIPC();
    
    // Create the main window
    createWindow();
  } else {
    console.error('[Main Process] Failed to start application due to service initialization failure.');
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