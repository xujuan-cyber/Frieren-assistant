/**
 * Workspace related type definitions
 * Contains interfaces and types used by workspace components
 */
import type { FavoriteReproducibilityDraft } from '../utils/favorite-reproducibility'

/**
 * Payload for iterate optimization
 */
export interface IteratePayload {
  /** Original prompt text */
  originalPrompt: string
  /** Optimized prompt text */
  optimizedPrompt: string
  /** User input for iteration */
  iterateInput: string
}

/**
 * Payload for saving favorites
 */
export interface SaveFavoritePayload {
  /** Content to save */
  content: string
  /** Original content (optional) */
  originalContent?: string
  /** Optional favorite editor prefill data */
  prefill?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    functionMode?: 'basic' | 'context' | 'image'
    optimizationMode?: 'system' | 'user'
    imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
    metadata?: Record<string, unknown>
    reproducibilityDraft?: FavoriteReproducibilityDraft
  }
}
