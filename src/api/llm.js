// API 密钥管理工具

/**
 * 获取指定模型的 API 密钥
 */
export async function getApiKey(model) {
  // 优先使用环境变量中的API密钥
  let apiKey = model === 'gemini' 
    ? import.meta.env.VITE_GEMINI_API_KEY 
    : import.meta.env.VITE_DEEPSEEK_API_KEY;

  // 如果环境变量中没有，则从localStorage获取
  if (!apiKey) {
    const savedKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}')
    apiKey = model === 'gemini' ? savedKeys.gemini : savedKeys.deepseek;
  }

  if (!apiKey) {
    throw new Error(`请先配置 ${model.toUpperCase()} API密钥`);
  }

  return apiKey;
}

/**
 * 保存 API 密钥到本地存储
 */
export function saveApiKeys(keys) {
  localStorage.setItem('apiKeys', JSON.stringify(keys));
}

/**
 * 获取所有保存的 API 密钥
 */
export function getApiKeys() {
  return JSON.parse(localStorage.getItem('apiKeys') || '{}');
}

/**
 * 验证 API 密钥格式
 */
export function validateApiKey(key) {
  return typeof key === 'string' && key.trim().length > 0;
} 