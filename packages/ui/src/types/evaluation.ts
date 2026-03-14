import type { EvaluationResponse, EvaluationType } from '@prompt-optimizer/core'

/**
 * Persisted evaluation results for a single workspace/submode.
 *
 * Note:
 * - We persist only stable data (results) for restart restore.
 * - We do NOT persist transient UI state (panel open, streaming, isEvaluating).
 */
export interface PersistedEvaluationResults {
  result: Record<string, EvaluationResponse | null>
  compare: EvaluationResponse | null
  'prompt-only': EvaluationResponse | null
  'prompt-iterate': EvaluationResponse | null
}

export const createDefaultEvaluationResults = (): PersistedEvaluationResults => ({
  result: {},
  compare: null,
  'prompt-only': null,
  'prompt-iterate': null,
})

export const EVALUATION_TYPES: EvaluationType[] = [
  'result',
  'compare',
  'prompt-only',
  'prompt-iterate',
]
