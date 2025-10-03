import type { TextModelConfig, TextProvider, TextModel } from './types';

/**
 * 创建文本模型的默认配置（TextModelConfig格式）
 * 使用 Provider-Adapter 架构生成完整的元数据
 */
export function createDefaultTextModels(envVars: {
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SILICONFLOW_API_KEY: string;
  ZHIPU_API_KEY: string;
  CUSTOM_API_KEY: string;
  CUSTOM_API_BASE_URL: string;
  CUSTOM_API_MODEL: string;
}): Record<string, TextModelConfig> {
  // ===== OpenAI Provider =====
  const openaiProvider: TextProvider = {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT models and OpenAI-compatible APIs',
    requiresApiKey: true,
    defaultBaseURL: 'https://api.openai.com/v1',
    supportsDynamicModels: true,
    connectionSchema: {
      required: ['apiKey'],
      optional: ['baseURL', 'organization', 'timeout'],
      fieldTypes: {
        apiKey: 'string',
        baseURL: 'string',
        organization: 'string',
        timeout: 'number'
      }
    }
  };

  const gpt4oMiniModel: TextModel = {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable and intelligent small model for fast, lightweight tasks',
    providerId: 'openai',
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsReasoning: false,
      maxContextLength: 128000
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        description: 'Sampling temperature (0-2)',
        default: 1,
        min: 0,
        max: 2
      },
      {
        name: 'max_tokens',
        type: 'number',
        description: 'Maximum tokens to generate',
        min: 1
      }
    ],
    defaultParameterValues: {
      temperature: 1,
      top_p: 1
    }
  };

  // ===== Gemini Provider =====
  const geminiProvider: TextProvider = {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Generative AI models',
    requiresApiKey: true,
    defaultBaseURL: 'https://generativelanguage.googleapis.com',
    supportsDynamicModels: false,
    connectionSchema: {
      required: ['apiKey'],
      optional: ['baseURL', 'timeout'],
      fieldTypes: {
        apiKey: 'string',
        baseURL: 'string',
        timeout: 'number'
      }
    }
  };

  // ===== DeepSeek Provider =====
  const deepseekProvider: TextProvider = {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek OpenAI-compatible models',
    requiresApiKey: true,
    defaultBaseURL: 'https://api.deepseek.com/v1',
    supportsDynamicModels: true,
    connectionSchema: {
      required: ['apiKey'],
      optional: ['baseURL', 'timeout'],
      fieldTypes: {
        apiKey: 'string',
        baseURL: 'string',
        timeout: 'number'
      }
    }
  };

  // ===== SiliconFlow Provider =====
  const siliconflowProvider: TextProvider = {
    id: 'siliconflow',
    name: 'SiliconFlow',
    description: 'SiliconFlow OpenAI-compatible models',
    requiresApiKey: true,
    defaultBaseURL: 'https://api.siliconflow.cn/v1',
    supportsDynamicModels: true,
    connectionSchema: {
      required: ['apiKey'],
      optional: ['baseURL', 'timeout'],
      fieldTypes: {
        apiKey: 'string',
        baseURL: 'string',
        timeout: 'number'
      }
    }
  };

  // ===== Zhipu Provider =====
  const zhipuProvider: TextProvider = {
    id: 'zhipu',
    name: 'Zhipu AI',
    description: 'Zhipu GLM OpenAI-compatible models',
    requiresApiKey: true,
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    supportsDynamicModels: false,
    connectionSchema: {
      required: ['apiKey'],
      optional: ['baseURL', 'timeout'],
      fieldTypes: {
        apiKey: 'string',
        baseURL: 'string',
        timeout: 'number'
      }
    }
  };

  const gemini2FlashModel: TextModel = {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Latest Gemini 2.0 Flash model',
    providerId: 'gemini',
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsReasoning: false,
      maxContextLength: 1000000
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        description: 'Sampling temperature (0-2)',
        default: 1,
        min: 0,
        max: 2
      },
      {
        name: 'maxOutputTokens',
        type: 'number',
        description: 'Maximum tokens to generate',
        default: 8192,
        min: 1
      }
    ],
    defaultParameterValues: {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  // ===== DeepSeek (使用 OpenAI 兼容 API) =====
  const deepseekChatModel: TextModel = {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'DeepSeek chat model via OpenAI-compatible API',
    providerId: 'deepseek',
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsReasoning: false,
      maxContextLength: 64000
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        description: 'Sampling temperature',
        default: 1,
        min: 0,
        max: 2
      }
    ],
    defaultParameterValues: {
      temperature: 1
    }
  };

  // ===== SiliconFlow (使用 OpenAI 兼容 API) =====
  const siliconflowModel: TextModel = {
    id: 'Qwen/Qwen3-8B',
    name: 'Qwen3-8B',
    description: 'Qwen3-8B model via SiliconFlow',
    providerId: 'siliconflow',
    capabilities: {
      supportsStreaming: true,
      supportsTools: false,
      supportsReasoning: false,
      maxContextLength: 8192
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        default: 1,
        min: 0,
        max: 2
      }
    ],
    defaultParameterValues: {
      temperature: 1
    }
  };

  // ===== Zhipu (使用 OpenAI 兼容 API) =====
  const zhipuModel: TextModel = {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    description: 'GLM-4 Flash model via Zhipu',
    providerId: 'zhipu',
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsReasoning: false,
      maxContextLength: 128000
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        default: 0.95,
        min: 0,
        max: 1
      }
    ],
    defaultParameterValues: {
      temperature: 0.95
    }
  };

  // ===== Custom (使用 OpenAI 兼容 API) =====
  const customModel: TextModel = {
    id: envVars.CUSTOM_API_MODEL || 'custom-model',
    name: envVars.CUSTOM_API_MODEL || 'Custom Model',
    description: 'Custom model via OpenAI-compatible API',
    providerId: 'openai',
    capabilities: {
      supportsStreaming: true,
      supportsTools: false,
      supportsReasoning: false,
      maxContextLength: 4096
    },
    parameterDefinitions: [
      {
        name: 'temperature',
        type: 'number',
        default: 1,
        min: 0,
        max: 2
      }
    ],
    defaultParameterValues: {
      temperature: 1
    }
  };

  // ===== 构建完整的 TextModelConfig =====
  return {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      enabled: !!envVars.OPENAI_API_KEY,
      providerMeta: openaiProvider,
      modelMeta: gpt4oMiniModel,
      connectionConfig: {
        apiKey: envVars.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1'
      },
      paramOverrides: {}
    },
    gemini: {
      id: 'gemini',
      name: 'Gemini',
      enabled: !!envVars.GEMINI_API_KEY,
      providerMeta: geminiProvider,
      modelMeta: gemini2FlashModel,
      connectionConfig: {
        apiKey: envVars.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com'
      },
      paramOverrides: {}
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      enabled: !!envVars.DEEPSEEK_API_KEY,
      providerMeta: deepseekProvider,
      modelMeta: deepseekChatModel,
      connectionConfig: {
        apiKey: envVars.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1'
      },
      paramOverrides: {}
    },
    siliconflow: {
      id: 'siliconflow',
      name: 'SiliconFlow',
      enabled: !!envVars.SILICONFLOW_API_KEY,
      providerMeta: siliconflowProvider,
      modelMeta: siliconflowModel,
      connectionConfig: {
        apiKey: envVars.SILICONFLOW_API_KEY,
        baseURL: 'https://api.siliconflow.cn/v1'
      },
      paramOverrides: {}
    },
    zhipu: {
      id: 'zhipu',
      name: 'Zhipu',
      enabled: !!envVars.ZHIPU_API_KEY,
      providerMeta: zhipuProvider,
      modelMeta: zhipuModel,
      connectionConfig: {
        apiKey: envVars.ZHIPU_API_KEY,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4'
      },
      paramOverrides: {}
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      enabled: !!envVars.CUSTOM_API_KEY,
      providerMeta: openaiProvider, // 使用 OpenAI Provider（兼容 API）
      modelMeta: customModel,
      connectionConfig: {
        apiKey: envVars.CUSTOM_API_KEY,
        baseURL: envVars.CUSTOM_API_BASE_URL || 'http://localhost:11434/v1'
      },
      paramOverrides: {}
    }
  };
}
