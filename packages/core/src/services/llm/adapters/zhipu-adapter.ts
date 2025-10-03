import type { TextModel, TextProvider } from '../types'
import { OpenAIAdapter } from './openai-adapter'

interface ModelOverride {
  id: string
  name: string
  description: string
  capabilities?: Partial<TextModel['capabilities']>
  defaultParameterValues?: Record<string, unknown>
}

const ZHIPU_STATIC_MODELS: ModelOverride[] = [
  {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    description: 'High-performance GLM-4 Plus model from Zhipu',
    capabilities: {
      supportsTools: true,
      maxContextLength: 128000
    }
  },
  {
    id: 'glm-4-0520',
    name: 'GLM-4 0520',
    description: 'GLM-4 model (0520 release) with balanced cost and quality',
    capabilities: {
      supportsTools: true,
      maxContextLength: 128000
    }
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    description: 'Flagship GLM-4 model from Zhipu',
    capabilities: {
      supportsTools: true,
      maxContextLength: 128000
    }
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4 Air',
    description: 'Cost-effective GLM-4 Air model',
    capabilities: {
      supportsTools: false,
      maxContextLength: 128000
    }
  },
  {
    id: 'glm-4-airx',
    name: 'GLM-4 AirX',
    description: 'Turbo GLM-4 AirX model for fast iteration',
    capabilities: {
      supportsTools: false,
      maxContextLength: 128000
    }
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    description: 'Fast GLM-4 Flash model from Zhipu',
    capabilities: {
      supportsTools: true,
      maxContextLength: 128000
    },
    defaultParameterValues: {
      temperature: 0.95
    }
  }
]

export class ZhipuAdapter extends OpenAIAdapter {
  public getProvider(): TextProvider {
    return {
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
    }
  }

  public getModels(): TextModel[] {
    return ZHIPU_STATIC_MODELS.map((definition) => {
      const baseModel = this.buildDefaultModel(definition.id)

      return {
        ...baseModel,
        name: definition.name,
        description: definition.description,
        capabilities: {
          ...baseModel.capabilities,
          ...(definition.capabilities ?? {})
        },
        defaultParameterValues: definition.defaultParameterValues
          ? {
              ...(baseModel.defaultParameterValues ?? {}),
              ...definition.defaultParameterValues
            }
          : baseModel.defaultParameterValues
      }
    })
  }
}
