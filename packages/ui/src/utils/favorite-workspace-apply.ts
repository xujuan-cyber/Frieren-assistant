import {
  promptModeKeyToFavoriteMode,
  type FavoriteModeCompat,
  type PromptAsset,
  type PromptContent,
  type PromptModeKey,
} from '@prompt-optimizer/core'

import {
  createFavoriteReproducibilityProjection,
  pickFavoriteReproducibilityExample,
  type FavoriteReproducibility,
  type FavoriteReproducibilityExample,
} from './favorite-reproducibility'

export type FavoriteWorkspaceTargetKey =
  | 'basic-system'
  | 'basic-user'
  | 'pro-variable'
  | 'pro-multi'
  | 'image-text2image'
  | 'image-image2image'
  | 'image-multiimage'

export type FavoriteWorkspaceApplySource = {
  content: string
  functionMode?: 'basic' | 'pro' | 'image' | 'context'
  optimizationMode?: 'system' | 'user'
  imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
  metadata?: Record<string, unknown>
}

export type FavoriteWorkspaceApplyOptions = {
  applyExample?: boolean
  exampleId?: string
  exampleIndex?: number
}

export type FavoriteWorkspaceApplyDraft = {
  targetKey: FavoriteWorkspaceTargetKey | null
  favoriteMode: FavoriteModeCompat | null
  content: string
  promptContent: PromptContent | null
  promptAsset: PromptAsset | null
  metadata?: Record<string, unknown>
  reproducibility: FavoriteReproducibility
  selectedExample: FavoriteReproducibilityExample | null
}

export const promptModeKeyToWorkspaceTargetKey = (
  modeKey: PromptModeKey,
): FavoriteWorkspaceTargetKey => {
  switch (modeKey) {
    case 'basic-user':
      return 'basic-user'
    case 'pro-variable':
      return 'pro-variable'
    case 'pro-conversation':
      return 'pro-multi'
    case 'image-text2image':
      return 'image-text2image'
    case 'image-image2image':
      return 'image-image2image'
    case 'image-multiimage':
      return 'image-multiimage'
    case 'basic-system':
    default:
      return 'basic-system'
  }
}

const favoriteModeToWorkspaceTargetKey = (
  mode: FavoriteModeCompat,
): FavoriteWorkspaceTargetKey => {
  if (mode.functionMode === 'image') {
    return `image-${mode.imageSubMode || 'text2image'}`
  }

  if (mode.functionMode === 'context') {
    return mode.optimizationMode === 'system' ? 'pro-multi' : 'pro-variable'
  }

  return mode.optimizationMode === 'user' ? 'basic-user' : 'basic-system'
}

const legacyFavoriteModeFromSource = (
  favorite: FavoriteWorkspaceApplySource,
): FavoriteModeCompat | null => {
  if (favorite.functionMode === 'image') {
    return {
      functionMode: 'image',
      imageSubMode: favorite.imageSubMode || 'text2image',
    }
  }

  if (favorite.functionMode === 'context' || favorite.functionMode === 'pro') {
    return {
      functionMode: 'context',
      ...(favorite.optimizationMode === 'system' || favorite.optimizationMode === 'user'
        ? { optimizationMode: favorite.optimizationMode }
        : {}),
    }
  }

  if (favorite.functionMode === 'basic') {
    return {
      functionMode: 'basic',
      ...(favorite.optimizationMode === 'system' || favorite.optimizationMode === 'user'
        ? { optimizationMode: favorite.optimizationMode }
        : {}),
    }
  }

  return null
}

const currentPromptContentFromAsset = (asset: PromptAsset | null): PromptContent | null => {
  if (!asset) return null
  return asset.versions.find((version) => version.id === asset.currentVersionId)?.content || null
}

const promptContentToWorkspaceText = (
  content: PromptContent,
  fallback: string,
): string => {
  if (content.kind === 'text') {
    return content.text
  }

  if (content.kind === 'image-prompt') {
    return content.text
  }

  const messageTexts = content.messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content)

  if (messageTexts.length === 0) return fallback

  return messageTexts
    .map((message) => `[${message.role}]\n${message.content}`)
    .join('\n\n')
}

export const createFavoriteWorkspaceApplyDraft = (
  favorite: FavoriteWorkspaceApplySource,
  options: FavoriteWorkspaceApplyOptions = {},
): FavoriteWorkspaceApplyDraft => {
  const projection = createFavoriteReproducibilityProjection(favorite)
  const promptAsset = projection.promptAsset
  const promptContent = currentPromptContentFromAsset(promptAsset)
  const favoriteMode = promptAsset
    ? promptModeKeyToFavoriteMode(promptAsset.contract.modeKey)
    : legacyFavoriteModeFromSource(favorite)
  const targetKey = promptAsset
    ? promptModeKeyToWorkspaceTargetKey(promptAsset.contract.modeKey)
    : favoriteMode
      ? favoriteModeToWorkspaceTargetKey(favoriteMode)
      : null

  return {
    targetKey,
    favoriteMode,
    content: promptContent
      ? promptContentToWorkspaceText(promptContent, favorite.content)
      : favorite.content,
    promptContent,
    promptAsset,
    metadata: favorite.metadata,
    reproducibility: projection.reproducibility,
    selectedExample: pickFavoriteReproducibilityExample(
      projection.reproducibility.examples,
      options,
    ),
  }
}
