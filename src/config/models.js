// LLM 模型配置
export const DEFAULT_MODELS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-3.5-turbo', 'gpt-4'],
    defaultModel: 'gpt-3.5-turbo',
    envKey: 'VITE_OPENAI_API_KEY',
    enabled: false // 根据环境变量动态设置
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://geminiapi.always200.com/v1beta/openai/chat/completions',
    models: ['gemini-2.0-flash-exp'],
    defaultModel: 'gemini-2.0-flash-exp',
    envKey: 'VITE_GEMINI_API_KEY',
    enabled: false
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat'],
    defaultModel: 'deepseek-chat',
    envKey: 'VITE_DEEPSEEK_API_KEY',
    enabled: false
  }
};

// 从环境变量初始化模型配置
export function initializeModels() {
  const models = { ...DEFAULT_MODELS };
  
  // 检查环境变量并设置启用状态
  Object.keys(models).forEach(key => {
    const model = models[key];
    const apiKey = import.meta.env[model.envKey];
    model.enabled = !!apiKey;
    if (model.enabled) {
      model.apiKey = apiKey;
    }
  });
  
  return models;
}

// 自定义模型配置验证
export function validateModelConfig(config) {
  const required = ['name', 'baseUrl', 'models', 'defaultModel'];
  return required.every(field => config[field]);
}

// 获取已启用的模型列表
export function getEnabledModels(models) {
  return Object.entries(models)
    .filter(([_, config]) => config.enabled)
    .map(([key, config]) => ({
      key,
      name: config.name,
      model: config.defaultModel
    }));
}

// 构建统一的请求配置
export function buildRequestConfig(provider, model, apiKey, messages) {
  const config = DEFAULT_MODELS[provider];
  if (!config) throw new Error(`未知的提供商: ${provider}`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey
  };

  return {
    url: config.baseUrl,
    headers,
    body: {
      model: model || config.defaultModel,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    }
  };
} 