/// <reference types="vite/client" />
import { ModelConfig } from './types';

// 获取环境变量的辅助函数
const getEnvVar = (key: string): string => {
  // 1. 首先尝试 process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }

  // 2. 然后尝试 import.meta.env（Vite 环境）
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env[key];
      if (value) return value;
    }
  } catch {
    // 忽略错误
  }

  // 3. 最后尝试 globalThis
  try {
    // @ts-ignore
    if (typeof globalThis !== 'undefined' && globalThis[key]) {
      // @ts-ignore
      return globalThis[key];
    }
  } catch {
    // 忽略错误
  }

  return '';
};

// 从环境变量获取 API keys
const OPENAI_API_KEY = getEnvVar('VITE_OPENAI_API_KEY').trim();
const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY').trim();
const DEEPSEEK_API_KEY = getEnvVar('VITE_DEEPSEEK_API_KEY').trim();
const CUSTOM_API_KEY = getEnvVar('VITE_CUSTOM_API_KEY').trim();
const CUSTOM_API_BASE_URL = getEnvVar('VITE_CUSTOM_API_BASE_URL');
const CUSTOM_API_MODEL = getEnvVar('VITE_CUSTOM_API_MODEL');

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
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash'],
    defaultModel: 'gemini-2.0-flash',
    apiKey: GEMINI_API_KEY,
    enabled: !!GEMINI_API_KEY,
    provider: 'gemini'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.siliconflow.cn/v1',
    models: ['Pro/deepseek-ai/DeepSeek-V3'],
    defaultModel: 'Pro/deepseek-ai/DeepSeek-V3',
    apiKey: DEEPSEEK_API_KEY,
    enabled: !!DEEPSEEK_API_KEY,
    provider: 'deepseek'
  },
  custom: {
    name: '自定义API',
    baseURL: CUSTOM_API_BASE_URL,
    models: [CUSTOM_API_MODEL],
    defaultModel: CUSTOM_API_MODEL,
    apiKey: CUSTOM_API_KEY,
    enabled: !!CUSTOM_API_KEY,
    provider: 'custom'
  }
}; 