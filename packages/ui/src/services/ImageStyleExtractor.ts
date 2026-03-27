import {
  createImageUnderstandingService,
  TemplateProcessor,
  type ITemplateManager,
  type Message,
  type Template,
  type TextModelConfig,
} from '@prompt-optimizer/core'
import { VARIABLE_VALIDATION, isValidVariableName } from '../types/variable'

export type ImagePromptExtractionMode = 'text2image' | 'image2image'

export interface ExtractImageStyleResult {
  prompt: string
  variableDefaults: Record<string, string>
  rawText: string
}

interface ExtractionPrompts {
  systemPrompt: string
  userPrompt: string
}

const MAX_EXTRACTED_VARIABLES = 3
const IMAGE_PROMPT_EXTRACTION_TEMPLATE_ID = 'image-prompt-extraction'
const imageUnderstandingService = createImageUnderstandingService()

export async function extractImageStyle(
  modelConfig: TextModelConfig,
  imageB64: string,
  mimeType: string,
  mode: ImagePromptExtractionMode,
  templateManager: ITemplateManager | null | undefined
): Promise<ExtractImageStyleResult> {
  const prompts = await buildExtractionPrompts(templateManager, mode)
  const response = await imageUnderstandingService.understand({
    modelConfig,
    systemPrompt: prompts.systemPrompt || undefined,
    userPrompt: prompts.userPrompt,
    images: [
      {
        b64: imageB64,
        mimeType
      }
    ],
    paramOverrides: {
      temperature: 0.2
    },
    responseMimeType: 'application/json'
  })

  const rawText = typeof response.content === 'string' ? response.content.trim() : ''
  if (!rawText) {
    throw new Error('Model did not return a valid extraction result')
  }

  return normalizeExtractionResult(rawText)
}

async function buildExtractionPrompts(
  templateManager: ITemplateManager | null | undefined,
  mode: ImagePromptExtractionMode
): Promise<ExtractionPrompts> {
  if (!templateManager) {
    throw new Error('Template manager is not initialized')
  }

  const template = await templateManager.getTemplate(IMAGE_PROMPT_EXTRACTION_TEMPLATE_ID)
  const messages = TemplateProcessor.processTemplate(
    template,
    createExtractionTemplateContext(mode, template)
  )

  const systemPrompt = collectPromptByRole(messages, 'system')
  const userPrompt = collectPromptByRole(messages, 'user')

  if (!userPrompt) {
    throw new Error('Image extraction template is missing a user prompt')
  }

  return {
    systemPrompt,
    userPrompt
  }
}

function normalizeExtractionResult(rawText: string): ExtractImageStyleResult {
  const parsed = parseJsonObject(rawText)
  const { promptObject, variableDefaults } = parseExtractionEnvelope(parsed)
  const constrainedPromptObject = constrainPromptVariables(promptObject, variableDefaults)
  const keptVariableNames = scanVariablesFromValue(constrainedPromptObject)
  const filteredDefaults = buildFilteredDefaults(keptVariableNames, variableDefaults)
  const formattedPrompt = JSON.stringify(constrainedPromptObject, null, 2)

  if (!formattedPrompt || formattedPrompt === 'null') {
    throw new Error('Model response is not a valid JSON object')
  }

  return {
    prompt: formattedPrompt,
    variableDefaults: filteredDefaults,
    rawText
  }
}

function parseExtractionEnvelope(parsed: Record<string, unknown>): {
  promptObject: Record<string, unknown>
  variableDefaults: Record<string, string>
} {
  const promptCandidate = parsed.prompt
  const defaultsCandidate = parsed.defaults

  const promptObject = resolvePromptObject(promptCandidate ?? parsed)
  const variableDefaults = normalizeVariableDefaults(defaultsCandidate)

  return {
    promptObject,
    variableDefaults
  }
}

function resolvePromptObject(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (isRecord(parsed)) {
        return parsed
      }
    } catch {
      // ignore and fall through
    }
  }

  throw new Error('Extraction result is missing a usable JSON prompt object')
}

function normalizeVariableDefaults(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}

  const defaults: Record<string, string> = {}
  for (const [name, rawValue] of Object.entries(value)) {
    const variableName = name.trim()
    if (!isValidVariableName(variableName)) continue
    if (typeof rawValue !== 'string') continue

    const normalizedValue = rawValue.trim()
    if (!normalizedValue) continue

    defaults[variableName] = normalizedValue
  }

  return defaults
}

function constrainPromptVariables(
  promptObject: Record<string, unknown>,
  defaults: Record<string, string>
): Record<string, unknown> {
  const variableNames = scanVariablesFromValue(promptObject)
  const missingDefaults = variableNames.filter((name) => !defaults[name])

  if (missingDefaults.length > 0) {
    throw new Error(`Extraction result is missing variable default values: ${missingDefaults.join(', ')}`)
  }

  const keptNames = variableNames.slice(0, MAX_EXTRACTED_VARIABLES)
  const keptSet = new Set(keptNames)

  return replacePlaceholdersInValue(promptObject, keptSet, defaults) as Record<string, unknown>
}

function replacePlaceholdersInValue(
  value: unknown,
  keptNames: Set<string>,
  defaults: Record<string, string>
): unknown {
  if (typeof value === 'string') {
    VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN.lastIndex = 0

    return value.replace(
      VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN,
      (match, rawVariableName: string) => {
        const variableName = rawVariableName.trim()

        if (!isValidVariableName(variableName)) {
          return match
        }

        if (keptNames.has(variableName)) {
          return `{{${variableName}}}`
        }

        return defaults[variableName] ?? match
      }
    )
  }

  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholdersInValue(item, keptNames, defaults))
  }

  if (isRecord(value)) {
    const next: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      next[key] = replacePlaceholdersInValue(child, keptNames, defaults)
    }
    return next
  }

  return value
}

function scanVariablesFromValue(value: unknown): string[] {
  const found: string[] = []

  const visitString = (content: string) => {
    VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN.lastIndex = 0
    const matches = content.matchAll(VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN)

    for (const match of matches) {
      const variableName = match[1]?.trim() || ''
      if (!variableName || !isValidVariableName(variableName)) continue
      if (!found.includes(variableName)) {
        found.push(variableName)
      }
    }
  }

  const visit = (current: unknown) => {
    if (typeof current === 'string') {
      visitString(current)
      return
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item)
      }
      return
    }

    if (isRecord(current)) {
      for (const child of Object.values(current)) {
        visit(child)
      }
    }
  }

  visit(value)
  return found
}

function buildFilteredDefaults(
  variableNames: string[],
  defaults: Record<string, string>
): Record<string, string> {
  const next: Record<string, string> = {}
  for (const name of variableNames) {
    const value = defaults[name]
    if (value) {
      next[name] = value
    }
  }
  return next
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fencedMatch?.[1]?.trim() || trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const jsonText =
    start >= 0 && end >= start
      ? candidate.slice(start, end + 1)
      : candidate

  try {
    const parsed = JSON.parse(jsonText)
    if (!isRecord(parsed)) {
      throw new Error('Model response is not a valid JSON object')
    }
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'Model response is not a valid JSON object') {
      throw error
    }
    throw new Error('Model response is not valid JSON', { cause: error })
  }
}

function createExtractionTemplateContext(
  mode: ImagePromptExtractionMode,
  template: Template
): Record<string, string | number> {
  const isEnglish = template.metadata.language === 'en'
  const variablePlaceholderExample = '{{snake_case}}'

  if (mode === 'image2image') {
    return {
      modeGoal: isEnglish ? 'image-to-image generation' : '图生图',
      modeSpecificRequirement: isEnglish
        ? 'For image-to-image workflows, you may explicitly describe what to preserve and what to change relative to the reference image, but do not invent content that is not visually present.'
        : '图生图场景下，可以在 JSON 中明确“保留/改变”的参考图指导，但不要虚构输入图中不存在的内容。',
      recommendedStructure: isEnglish
        ? [
            '{',
            '  "scene": { },',
            '  "reference_guidance": {',
            '    "use_input_image_as_reference": true,',
            '    "preserve": ["..."],',
            '    "change": ["..."]',
            '  },',
            '  "constraints": { "must_keep": ["..."], "avoid": ["..."] },',
            '  "negative_prompt": ["..."]',
            '}'
          ].join('\n')
        : [
            '{',
            '  "场景": { },',
            '  "参考图指导": {',
            '    "使用输入图作为参考": true,',
            '    "保留": ["..."],',
            '    "改变": ["..."]',
            '  },',
            '  "约束": { "必须保留": ["..."], "避免": ["..."] },',
            '  "负面提示词": ["..."]',
            '}'
          ].join('\n'),
      maxExtractedVariables: MAX_EXTRACTED_VARIABLES,
      variablePlaceholderExample
    }
  }

  return {
    modeGoal: isEnglish ? 'text-to-image generation' : '文生图',
    modeSpecificRequirement: isEnglish
      ? 'For text-to-image workflows, organize the subject, environment, camera, lighting, and style into a JSON structure that can be used directly for generation.'
      : '文生图场景下，请把画面主体、环境、镜头、光影和风格描述整理成便于直接生图的 JSON 结构。',
    recommendedStructure: isEnglish
      ? [
          '{',
          '  "scene": {',
          '    "description": "...",',
          '    "subjects": [',
          '      { "type": "...", "description": "...", "attributes": { } }',
          '    ],',
          '    "environment": { },',
          '    "action": { },',
          '    "composition": { },',
          '    "camera": { },',
          '    "lighting": { },',
          '    "color": { },',
          '    "style": { },',
          '    "details": ["..."]',
          '  },',
          '  "constraints": { "must_keep": ["..."], "avoid": ["..."] },',
          '  "negative_prompt": ["..."]',
          '}'
        ].join('\n')
      : [
          '{',
          '  "场景": {',
          '    "描述": "...",',
          '    "主体": [',
          '      { "类型": "...", "描述": "...", "属性": { } }',
          '    ],',
          '    "环境": { },',
          '    "动作": { },',
          '    "构图": { },',
          '    "相机": { },',
          '    "光照": { },',
          '    "色彩": { },',
          '    "风格": { },',
          '    "细节": ["..."]',
          '  },',
          '  "约束": { "必须保留": ["..."], "避免": ["..."] },',
          '  "负面提示词": ["..."]',
          '}'
        ].join('\n'),
    maxExtractedVariables: MAX_EXTRACTED_VARIABLES,
    variablePlaceholderExample
  }
}

function collectPromptByRole(messages: Message[], role: Message['role']): string {
  return messages
    .filter((message) => message.role === role && typeof message.content === 'string')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
