import type { FavoritePrompt } from '@prompt-optimizer/core'

export type FavoriteReproducibilitySource = 'none' | 'garden' | 'reproducibility' | 'metadata'

export type FavoriteReproducibilityVariable = {
  name: string
  description?: string
  type?: 'string' | 'number' | 'boolean' | 'enum'
  required: boolean
  defaultValue?: string
  options: string[]
  source?: string
}

export type FavoriteReproducibilityExample = {
  id?: string
  text?: string
  description?: string
  parameters: Record<string, string>
  images: string[]
  imageAssetIds: string[]
  inputImages: string[]
  inputImageAssetIds: string[]
}

export type FavoriteReproducibility = {
  source: FavoriteReproducibilitySource
  variables: FavoriteReproducibilityVariable[]
  examples: FavoriteReproducibilityExample[]
  variableCount: number
  exampleCount: number
  hasInputImages: boolean
  hasData: boolean
}

export type FavoriteReproducibilityDraft = {
  variables: FavoriteReproducibilityVariable[]
  examples: FavoriteReproducibilityExample[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => Boolean(item))
}

const dedupeStrings = (items: string[]): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const normalized = item.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

const parseParameters = (value: unknown): Record<string, string> => {
  if (!isPlainObject(value)) return {}

  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    const normalizedKey = key.trim()
    if (!normalizedKey || raw === undefined || raw === null) continue
    out[normalizedKey] = String(raw)
  }
  return out
}

const normalizeVariableType = (value: unknown): FavoriteReproducibilityVariable['type'] => {
  return value === 'string' || value === 'number' || value === 'boolean' || value === 'enum'
    ? value
    : undefined
}

const parseVariable = (value: unknown): FavoriteReproducibilityVariable | null => {
  if (!isPlainObject(value)) return null

  const name = asTrimmedString(value.name)
  if (!name) return null

  return {
    name,
    description: asTrimmedString(value.description),
    type: normalizeVariableType(value.type),
    required: value.required === true,
    defaultValue: asTrimmedString(value.defaultValue ?? value.default ?? value.value),
    options: dedupeStrings(asStringArray(value.options)),
    source: asTrimmedString(value.source),
  }
}

const parseVariables = (value: unknown): FavoriteReproducibilityVariable[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => parseVariable(item))
      .filter((item): item is FavoriteReproducibilityVariable => Boolean(item))
  }

  if (!isPlainObject(value)) return []

  const variables: FavoriteReproducibilityVariable[] = []
  for (const [name, raw] of Object.entries(value)) {
    const normalizedName = name.trim()
    if (!normalizedName) continue

    variables.push({
      name: normalizedName,
      required: false,
      defaultValue: raw === undefined || raw === null ? undefined : String(raw),
      options: [],
    })
  }
  return variables
}

const parseExample = (value: unknown): FavoriteReproducibilityExample | null => {
  if (!isPlainObject(value)) return null

  const url = asTrimmedString(value.url)
  const images = dedupeStrings([
    ...(url ? [url] : []),
    ...asStringArray(value.images),
  ])

  const example: FavoriteReproducibilityExample = {
    id: asTrimmedString(value.id),
    text: asTrimmedString(value.text),
    description: asTrimmedString(value.description),
    parameters: parseParameters(value.parameters),
    images,
    imageAssetIds: dedupeStrings(asStringArray(value.imageAssetIds)),
    inputImages: dedupeStrings(asStringArray(value.inputImages)),
    inputImageAssetIds: dedupeStrings(asStringArray(value.inputImageAssetIds)),
  }

  const hasData = Boolean(
    example.id ||
      example.text ||
      example.description ||
      Object.keys(example.parameters).length > 0 ||
      example.images.length > 0 ||
      example.imageAssetIds.length > 0 ||
      example.inputImages.length > 0 ||
      example.inputImageAssetIds.length > 0,
  )

  return hasData ? example : null
}

const parseExamples = (value: unknown): FavoriteReproducibilityExample[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => parseExample(item))
    .filter((item): item is FavoriteReproducibilityExample => Boolean(item))
}

const buildReproducibility = (
  source: FavoriteReproducibilitySource,
  variables: FavoriteReproducibilityVariable[],
  examples: FavoriteReproducibilityExample[],
): FavoriteReproducibility => {
  const variableCount = variables.length
  const exampleCount = examples.length
  const hasInputImages = examples.some(
    (example) => example.inputImages.length > 0 || example.inputImageAssetIds.length > 0,
  )

  return {
    source: variableCount > 0 || exampleCount > 0 ? source : 'none',
    variables,
    examples,
    variableCount,
    exampleCount,
    hasInputImages,
    hasData: variableCount > 0 || exampleCount > 0,
  }
}

export const parseFavoriteReproducibilityFromMetadata = (
  metadata: unknown,
): FavoriteReproducibility => {
  if (!isPlainObject(metadata)) {
    return buildReproducibility('none', [], [])
  }

  const gardenSnapshot = isPlainObject(metadata.gardenSnapshot)
    ? metadata.gardenSnapshot
    : null
  if (gardenSnapshot) {
    const assets = isPlainObject(gardenSnapshot.assets) ? gardenSnapshot.assets : {}
    const variables = parseVariables(gardenSnapshot.variables)
    const examples = parseExamples(assets.examples)
    return buildReproducibility('garden', variables, examples)
  }

  const reproducibility = isPlainObject(metadata.reproducibility)
    ? metadata.reproducibility
    : null
  if (reproducibility) {
    const variables = parseVariables(reproducibility.variables)
    const examples = parseExamples(reproducibility.examples)
    return buildReproducibility('reproducibility', variables, examples)
  }

  const variables = parseVariables(metadata.variables)
  const examples = parseExamples(metadata.examples)
  return buildReproducibility('metadata', variables, examples)
}

export const parseFavoriteReproducibility = (
  favorite: Pick<FavoritePrompt, 'metadata'> | null | undefined,
): FavoriteReproducibility => {
  return parseFavoriteReproducibilityFromMetadata(favorite?.metadata)
}

const normalizeVariablesForSave = (
  variables: FavoriteReproducibilityVariable[],
): FavoriteReproducibilityVariable[] => {
  const seen = new Set<string>()

  return variables
    .map((variable) => ({
      name: variable.name.trim(),
      description: asTrimmedString(variable.description),
      type: normalizeVariableType(variable.type),
      required: variable.required === true,
      defaultValue: asTrimmedString(variable.defaultValue),
      options: dedupeStrings(variable.options || []),
      source: asTrimmedString(variable.source),
    }))
    .filter((variable) => {
      if (!variable.name || seen.has(variable.name)) return false
      seen.add(variable.name)
      return true
    })
}

const normalizeExamplesForSave = (
  examples: FavoriteReproducibilityExample[],
): FavoriteReproducibilityExample[] => {
  return examples
    .map((example) => ({
      id: asTrimmedString(example.id),
      text: asTrimmedString(example.text),
      description: asTrimmedString(example.description),
      parameters: parseParameters(example.parameters),
      images: dedupeStrings(example.images || []),
      imageAssetIds: dedupeStrings(example.imageAssetIds || []),
      inputImages: dedupeStrings(example.inputImages || []),
      inputImageAssetIds: dedupeStrings(example.inputImageAssetIds || []),
    }))
    .filter((example) =>
      Boolean(
        example.id ||
          example.text ||
          example.description ||
          Object.keys(example.parameters).length > 0 ||
          example.images.length > 0 ||
          example.imageAssetIds.length > 0 ||
          example.inputImages.length > 0 ||
          example.inputImageAssetIds.length > 0,
      ),
    )
}

const toGardenVariable = (variable: FavoriteReproducibilityVariable): Record<string, unknown> => ({
  name: variable.name,
  ...(variable.description ? { description: variable.description } : {}),
  ...(variable.type ? { type: variable.type } : {}),
  ...(variable.required ? { required: true } : {}),
  ...(variable.defaultValue ? { defaultValue: variable.defaultValue } : {}),
  ...(variable.options.length > 0 ? { options: variable.options } : {}),
  ...(variable.source ? { source: variable.source } : {}),
})

const toGardenExample = (example: FavoriteReproducibilityExample): Record<string, unknown> => ({
  ...(example.id ? { id: example.id } : {}),
  ...(example.text ? { text: example.text } : {}),
  ...(example.description ? { description: example.description } : {}),
  ...(Object.keys(example.parameters).length > 0 ? { parameters: example.parameters } : {}),
  ...(example.images.length > 0 ? { images: example.images } : {}),
  ...(example.imageAssetIds.length > 0 ? { imageAssetIds: example.imageAssetIds } : {}),
  ...(example.inputImages.length > 0 ? { inputImages: example.inputImages } : {}),
  ...(example.inputImageAssetIds.length > 0 ? { inputImageAssetIds: example.inputImageAssetIds } : {}),
})

export const applyFavoriteReproducibilityToMetadata = (
  metadata: Record<string, unknown>,
  draft: FavoriteReproducibilityDraft,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...metadata }
  const current = parseFavoriteReproducibilityFromMetadata(metadata)
  const targetSource: FavoriteReproducibilitySource = isPlainObject(metadata.gardenSnapshot)
    ? 'garden'
    : isPlainObject(metadata.reproducibility)
      ? 'reproducibility'
      : current.source
  const variables = normalizeVariablesForSave(draft.variables || [])
  const examples = normalizeExamplesForSave(draft.examples || [])
  const hasDraftData = variables.length > 0 || examples.length > 0

  if (targetSource === 'garden') {
    const gardenSnapshot = isPlainObject(next.gardenSnapshot)
      ? { ...next.gardenSnapshot }
      : {}
    const assets = isPlainObject(gardenSnapshot.assets)
      ? { ...gardenSnapshot.assets }
      : {}

    gardenSnapshot.variables = variables.map(toGardenVariable)
    assets.examples = examples.map(toGardenExample)
    gardenSnapshot.assets = assets
    next.gardenSnapshot = gardenSnapshot
    return next
  }

  if (targetSource === 'metadata') {
    if (variables.length > 0) {
      next.variables = variables.map(toGardenVariable)
    } else {
      delete next.variables
    }

    if (examples.length > 0) {
      next.examples = examples.map(toGardenExample)
    } else {
      delete next.examples
    }
    return next
  }

  if (hasDraftData) {
    next.reproducibility = {
      variables: variables.map(toGardenVariable),
      examples: examples.map(toGardenExample),
    }
  } else {
    delete next.reproducibility
  }

  return next
}
