import {
  createImageUnderstandingService,
  type ExtractedVariable,
  type IPromptService,
  TemplateProcessor,
  type ITemplateManager,
  type IVariableExtractionService,
  type Message,
  type Template,
  type TextModelConfig,
} from '@prompt-optimizer/core'
import { VARIABLE_VALIDATION, isValidVariableName } from '../types/variable'

export type ImagePromptExtractionMode = 'text2image' | 'image2image'
export type ReferenceApplicationMode = 'replicate' | 'migrate'

export interface ReferenceSpec {
  spec: Record<string, unknown>
  rawText: string
}

export interface PromptDraft {
  prompt: string
  rawText: string
}

export interface VariableizedPrompt {
  prompt: string
  variableDefaults: Record<string, string>
  rawText: string
}

export type ReferencePromptPreview = VariableizedPrompt

const MAX_REFERENCE_DIALOG_VARIABLES = 5

interface ExtractionPrompts {
  systemPrompt: string
  userPrompt: string
}

export interface ResolveReferencePromptPreviewOptions {
  mode: ReferenceApplicationMode
  originalPrompt: string
  modelKey?: string
  promptService?: IPromptService | null
  variableExtractionService?: IVariableExtractionService | null
  referenceMode?: ImagePromptExtractionMode
  referenceSpec?: ReferenceSpec | null
  modelConfig?: TextModelConfig
  imageB64?: string
  mimeType?: string
  templateManager?: ITemplateManager | null
}

export interface ExtractPromptVariablesOptions {
  prompt: string
  rawText?: string
  modelKey?: string
  variableExtractionService?: IVariableExtractionService | null
}

const IMAGE_REFERENCE_SPEC_EXTRACTION_TEMPLATE_ID = 'image-reference-spec-extraction'
const IMAGE_PROMPT_COMPOSITION_TEMPLATE_ID = 'image-prompt-from-reference-spec'
const IMAGE_PROMPT_MIGRATION_TEMPLATE_ID = 'image-prompt-migration'
const imageUnderstandingService = createImageUnderstandingService()

export async function extractReferenceSpecFromImage(
  modelConfig: TextModelConfig,
  imageB64: string,
  mimeType: string,
  mode: ImagePromptExtractionMode,
  templateManager: ITemplateManager | null | undefined,
): Promise<ReferenceSpec> {
  const prompts = await buildReferenceSpecPrompts(templateManager, mode)
  const response = await imageUnderstandingService.understand({
    modelConfig,
    systemPrompt: prompts.systemPrompt || undefined,
    userPrompt: prompts.userPrompt,
    images: [
      {
        b64: imageB64,
        mimeType,
      },
    ],
    paramOverrides: {
      temperature: 0.2,
    },
    responseMimeType: 'application/json',
  })

  const rawText = typeof response.content === 'string' ? response.content.trim() : ''
  if (!rawText) {
    throw new Error('Model did not return a valid reference spec')
  }

  return normalizeReferenceSpecResult(rawText)
}

export async function composePromptFromReferenceSpec(options: {
  promptService?: IPromptService | null
  modelKey?: string
  referenceSpec: ReferenceSpec
  mode?: ImagePromptExtractionMode
}): Promise<PromptDraft> {
  const {
    promptService,
    modelKey,
    referenceSpec,
    mode = 'text2image',
  } = options

  if (!promptService) {
    throw new Error('Prompt service is not initialized')
  }

  if (!modelKey?.trim()) {
    throw new Error('Text model is required for reference prompt composition')
  }

  const rawText = await promptService.optimizePrompt({
    optimizationMode: 'user',
    targetPrompt: '',
    templateId: IMAGE_PROMPT_COMPOSITION_TEMPLATE_ID,
    modelKey: modelKey.trim(),
    advancedContext: {
      variables: {
        referenceSpecJson: JSON.stringify(referenceSpec.spec, null, 2),
        referenceMode: mode,
      },
    },
  })

  return normalizePromptDraftResult(rawText)
}

export async function migratePromptWithReferenceSpec(options: {
  promptService?: IPromptService | null
  modelKey?: string
  originalPrompt: string
  referenceSpec: ReferenceSpec
  mode?: ImagePromptExtractionMode
}): Promise<PromptDraft> {
  const {
    promptService,
    modelKey,
    originalPrompt,
    referenceSpec,
    mode = 'text2image',
  } = options

  if (!promptService) {
    throw new Error('Prompt service is not initialized')
  }

  if (!modelKey?.trim()) {
    throw new Error('Text model is required for reference prompt migration')
  }

  if (!originalPrompt.trim()) {
    throw new Error('Original prompt is required for reference prompt migration')
  }

  const rawText = await promptService.optimizePrompt({
    optimizationMode: 'user',
    targetPrompt: originalPrompt,
    templateId: IMAGE_PROMPT_MIGRATION_TEMPLATE_ID,
    modelKey: modelKey.trim(),
    advancedContext: {
      variables: {
        referenceSpecJson: JSON.stringify(referenceSpec.spec, null, 2),
        referenceMode: mode,
      },
    },
  })

  return normalizePromptDraftResult(rawText)
}

export async function extractPromptVariables(
  options: ExtractPromptVariablesOptions,
): Promise<VariableizedPrompt> {
  const {
    prompt,
    rawText = prompt,
    modelKey,
    variableExtractionService,
  } = options

  if (!prompt.trim()) {
    return {
      prompt,
      variableDefaults: {},
      rawText,
    }
  }

  if (!variableExtractionService || !modelKey?.trim()) {
    return {
      prompt,
      variableDefaults: {},
      rawText,
    }
  }

  const result = await variableExtractionService.extract({
    promptContent: prompt,
    extractionModelKey: modelKey.trim(),
  })

  const limitedVariables = result.variables.slice(0, MAX_REFERENCE_DIALOG_VARIABLES)
  const variableizedPrompt = replaceExtractedVariablesInPrompt(prompt, limitedVariables)
  const keptVariableNames = scanVariablesFromValue(variableizedPrompt)

  return {
    prompt: variableizedPrompt,
    variableDefaults: buildFilteredDefaultsFromExtractedVariables(
      keptVariableNames,
      limitedVariables,
    ),
    rawText,
  }
}

export async function resolveReferencePromptPreview(
  options: ResolveReferencePromptPreviewOptions,
): Promise<ReferencePromptPreview> {
  const {
    mode,
    originalPrompt,
    modelKey,
    promptService,
    variableExtractionService,
    referenceMode = 'text2image',
  } = options

  const referenceSpec =
    options.referenceSpec ??
    (await extractReferenceSpecFromResolveOptions(options, referenceMode))

  const promptDraft =
    mode === 'migrate' && originalPrompt.trim()
      ? await migratePromptWithReferenceSpec({
          promptService,
          modelKey,
          originalPrompt,
          referenceSpec,
          mode: referenceMode,
        })
      : await composePromptFromReferenceSpec({
          promptService,
          modelKey,
          referenceSpec,
          mode: referenceMode,
        })

  return extractPromptVariables({
    prompt: promptDraft.prompt,
    rawText: promptDraft.rawText,
    modelKey,
    variableExtractionService,
  })
}

async function extractReferenceSpecFromResolveOptions(
  options: ResolveReferencePromptPreviewOptions,
  referenceMode: ImagePromptExtractionMode,
): Promise<ReferenceSpec> {
  const { modelConfig, imageB64, mimeType, templateManager } = options

  if (!modelConfig || !imageB64 || !mimeType) {
    throw new Error('Reference spec or image extraction inputs are required')
  }

  return extractReferenceSpecFromImage(
    modelConfig,
    imageB64,
    mimeType,
    referenceMode,
    templateManager,
  )
}

async function buildReferenceSpecPrompts(
  templateManager: ITemplateManager | null | undefined,
  mode: ImagePromptExtractionMode,
): Promise<ExtractionPrompts> {
  if (!templateManager) {
    throw new Error('Template manager is not initialized')
  }

  const template = await templateManager.getTemplate(IMAGE_REFERENCE_SPEC_EXTRACTION_TEMPLATE_ID)
  const messages = TemplateProcessor.processTemplate(
    template,
    createReferenceSpecTemplateContext(mode, template),
  )

  const systemPrompt = collectPromptByRole(messages, 'system')
  const userPrompt = collectPromptByRole(messages, 'user')

  if (!userPrompt) {
    throw new Error('Reference spec extraction template is missing a user prompt')
  }

  return {
    systemPrompt,
    userPrompt,
  }
}

function normalizeReferenceSpecResult(rawText: string): ReferenceSpec {
  const parsed = parseJsonObject(rawText)
  const spec = isRecord(parsed.referenceSpec) ? parsed.referenceSpec : parsed

  return {
    spec,
    rawText,
  }
}

function normalizePromptDraftResult(rawText: string): PromptDraft {
  const parsed = parseJsonObject(rawText)
  const promptObject = resolvePromptObject(parsed.prompt ?? parsed)
  const formattedPrompt = JSON.stringify(promptObject, null, 2)

  if (!formattedPrompt || formattedPrompt === 'null') {
    throw new Error('Model response is not a valid JSON object')
  }

  return {
    prompt: formattedPrompt,
    rawText,
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

  throw new Error('Model response is missing a usable JSON prompt object')
}

function buildFilteredDefaultsFromExtractedVariables(
  variableNames: string[],
  variables: ExtractedVariable[],
): Record<string, string> {
  const keptNames = new Set(variableNames)

  return variables.reduce<Record<string, string>>((acc, variable) => {
    const name = variable.name.trim()
    const value = variable.value.trim()

    if (!name || !value || !keptNames.has(name) || !isValidVariableName(name)) {
      return acc
    }

    acc[name] = value
    return acc
  }, {})
}

function findExtractedVariableOccurrenceIndex(
  text: string,
  searchText: string,
  occurrence: number,
): number {
  let count = 0
  let index = -1

  while (count < occurrence) {
    index = text.indexOf(searchText, index + 1)
    if (index === -1) {
      return -1
    }
    count += 1
  }

  return index
}

export function replaceExtractedVariablesInPrompt(
  prompt: string,
  variables: ExtractedVariable[],
): string {
  let nextPrompt = prompt

  const sortedVariables = [...variables].sort((a, b) => {
    const indexA = findExtractedVariableOccurrenceIndex(
      prompt,
      a.position.originalText,
      a.position.occurrence,
    )
    const indexB = findExtractedVariableOccurrenceIndex(
      prompt,
      b.position.originalText,
      b.position.occurrence,
    )
    return indexB - indexA
  })

  for (const variable of sortedVariables) {
    const index = findExtractedVariableOccurrenceIndex(
      nextPrompt,
      variable.position.originalText,
      variable.position.occurrence,
    )

    if (index === -1) {
      continue
    }

    nextPrompt =
      nextPrompt.slice(0, index) +
      `{{${variable.name}}}` +
      nextPrompt.slice(index + variable.position.originalText.length)
  }

  return nextPrompt
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

function createReferenceSpecTemplateContext(
  mode: ImagePromptExtractionMode,
  template: Template,
): Record<string, string> {
  const isEnglish = template.metadata.language === 'en'

  if (mode === 'image2image') {
    return {
      modeGoal: isEnglish ? 'image-to-image reference analysis' : '图生图参考分析',
      modeSpecificRequirement: isEnglish
        ? 'Focus on what the image is visually doing and what should be preserved or changed when used as a reference for image-to-image editing.'
        : '重点说明这张图的视觉语言，以及在图生图参考场景下适合保留或改变的部分。',
      recommendedStructure: isEnglish
        ? [
            '{',
            '  "subject_observation": { },',
            '  "visual_language": { },',
            '  "composition_camera": { },',
            '  "lighting_color": { },',
            '  "material_medium": { },',
            '  "reference_guidance": { "preserve": ["..."], "change": ["..."] },',
            '  "reconstruction_priorities": ["..."]',
            '}',
          ].join('\n')
        : [
            '{',
            '  "主体观察": { },',
            '  "视觉语言": { },',
            '  "构图镜头": { },',
            '  "光线色彩": { },',
            '  "材质媒介": { },',
            '  "参考图指导": { "保留": ["..."], "改变": ["..."] },',
            '  "复现重点": ["..."]',
            '}',
          ].join('\n'),
    }
  }

  return {
    modeGoal: isEnglish ? 'text-to-image reference analysis' : '文生图参考分析',
    modeSpecificRequirement: isEnglish
      ? 'Focus on the image as a reusable visual direction, so later steps can transfer its style into a new generation prompt.'
      : '把这张图视为可迁移的视觉方向，为后续生成新的文生图提示词提供参考规格。',
    recommendedStructure: isEnglish
      ? [
          '{',
          '  "subject_observation": { },',
          '  "visual_language": { },',
          '  "composition_camera": { },',
          '  "lighting_color": { },',
          '  "material_medium": { },',
          '  "layout_details": { },',
          '  "reconstruction_priorities": ["..."]',
          '}',
        ].join('\n')
      : [
          '{',
          '  "主体观察": { },',
          '  "视觉语言": { },',
          '  "构图镜头": { },',
          '  "光线色彩": { },',
          '  "材质媒介": { },',
          '  "版式细节": { },',
          '  "复现重点": ["..."]',
          '}',
        ].join('\n'),
  }
}

function collectPromptByRole(messages: Message[], role: Message['role']): string {
  return messages
    .filter((message) => message.role === role && typeof message.content === 'string')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n')
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
