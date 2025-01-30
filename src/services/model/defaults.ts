/// <reference types="vite/client" />
import { ModelConfig } from './types';

// 从环境变量获取 API keys
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

// 调试日志
console.log('环境变量状态:', {
  OPENAI_API_KEY: !!OPENAI_API_KEY,
  GEMINI_API_KEY: !!GEMINI_API_KEY,
  DEEPSEEK_API_KEY: !!DEEPSEEK_API_KEY,
  env: import.meta.env
});

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
    models: ['gemini-2.0-flash-exp'],
    defaultModel: 'gemini-2.0-flash-exp',
    apiKey: GEMINI_API_KEY,
    enabled: !!GEMINI_API_KEY,
    provider: 'gemini'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat'],
    defaultModel: 'deepseek-chat',
    apiKey: DEEPSEEK_API_KEY,
    enabled: !!DEEPSEEK_API_KEY,
    provider: 'deepseek'
  }
}; 