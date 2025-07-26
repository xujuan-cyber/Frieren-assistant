/**
 * 环境变量配置管理
 *
 * 注意：环境变量已通过 preload-env.js 在应用启动前加载
 * 这里的 config() 调用是备用加载机制
 */

import { config } from 'dotenv';

// 备用环境变量加载（preload-env.js 已经处理了主要加载）
config();

// 从Docker环境变量映射到MCP环境变量
const envMappings = {
  'VITE_OPENAI_API_KEY': 'OPENAI_API_KEY',
  'VITE_GEMINI_API_KEY': 'GEMINI_API_KEY',
  'VITE_DEEPSEEK_API_KEY': 'DEEPSEEK_API_KEY',
  'VITE_SILICONFLOW_API_KEY': 'SILICONFLOW_API_KEY',
  'VITE_CUSTOM_API_KEY': 'CUSTOM_API_KEY',
  'VITE_CUSTOM_API_BASE_URL': 'CUSTOM_API_BASE_URL',
  'VITE_CUSTOM_API_MODEL': 'CUSTOM_API_MODEL'
};

Object.entries(envMappings).forEach(([viteKey, mcpKey]) => {
  if (process.env[viteKey] && !process.env[mcpKey]) {
    process.env[mcpKey] = process.env[viteKey];
  }
});

export interface MCPServerConfig {
  httpPort: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  defaultLanguage: string;
  preferredModelProvider?: string;
}

export function loadConfig(): MCPServerConfig {
  return {
    httpPort: parseInt(process.env.MCP_HTTP_PORT || '3000'),
    logLevel: (process.env.MCP_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'debug',
    defaultLanguage: process.env.MCP_DEFAULT_LANGUAGE || 'zh',
    preferredModelProvider: process.env.MCP_DEFAULT_MODEL_PROVIDER
  };
}

export function validateConfig(config: MCPServerConfig): void {
  if (config.httpPort < 1 || config.httpPort > 65535) {
    throw new Error('HTTP port must be between 1 and 65535');
  }

  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`Log level must be one of: ${validLogLevels.join(', ')}`);
  }
}
