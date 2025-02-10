/// <reference types="vite/client" />
import { ModelConfig } from './types';

// 从环境变量获取 API keys
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const CUSTOM_API_KEY = import.meta.env.VITE_CUSTOM_API_KEY || '';

export const defaultModels: Record<string, ModelConfig> = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-3.5-turbo',
    apiKey: OPENAI_API_KEY,
    enabled: !!OPENAI_API_KEY,
    provider: 'openai'
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://geminiapi.always200.com/v1beta/openai',
    models: ['gemini-2.0-flash-001'],
    defaultModel: 'gemini-2.0-flash-001',
    apiKey: GEMINI_API_KEY,
    enabled: !!GEMINI_API_KEY,
    provider: 'gemini'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.siliconflow.cn/v1',
    models: ['deepseek-ai/DeepSeek-V3'],
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    apiKey: DEEPSEEK_API_KEY,
    enabled: !!DEEPSEEK_API_KEY,
    provider: 'deepseek'
  },
  custom: {
    name: '自定义API',
    baseURL: import.meta.env.VITE_CUSTOM_API_BASE_URL,
    models: [import.meta.env.VITE_CUSTOM_API_MODEL],
    defaultModel: import.meta.env.VITE_CUSTOM_API_MODEL,
    apiKey: CUSTOM_API_KEY,
    enabled: !!CUSTOM_API_KEY,
    provider: 'custom'
  }
}; 