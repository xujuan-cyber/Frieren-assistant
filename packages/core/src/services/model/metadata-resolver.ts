import type { ITextAdapterRegistry } from '../llm/types'
import type { TextModel, TextProvider } from './types'

export interface ResolveTextModelMetadataInput {
  providerId: string
  modelId: string
  registry: ITextAdapterRegistry
  existingProviderMeta?: TextProvider
  existingModelMeta?: TextModel
}

export interface ResolvedTextModelMetadata {
  providerMeta: TextProvider
  modelMeta: TextModel
}

/**
 * Resolve provider/model metadata from the selected provider/model identity.
 *
 * Existing metadata is only reused when it belongs to the same identity. This
 * keeps edit flows from accidentally carrying stale provider snapshots across
 * provider switches.
 */
export function resolveTextModelMetadata({
  providerId,
  modelId,
  registry,
  existingProviderMeta,
  existingModelMeta,
}: ResolveTextModelMetadataInput): ResolvedTextModelMetadata {
  const adapter = registry.getAdapter(providerId)

  const providerMeta = existingProviderMeta?.id === providerId
    ? existingProviderMeta
    : adapter.getProvider()

  const modelMeta =
    existingModelMeta?.id === modelId && existingModelMeta.providerId === providerId
      ? existingModelMeta
      : adapter.getModels().find((model) => model.id === modelId) || adapter.buildDefaultModel(modelId)

  return {
    providerMeta,
    modelMeta,
  }
}

export function hasTextModelMetadataIdentityMismatch(
  providerMeta: Pick<TextProvider, 'id'> | undefined,
  modelMeta: Pick<TextModel, 'providerId'> | undefined
): boolean {
  return !!providerMeta?.id && !!modelMeta?.providerId && providerMeta.id !== modelMeta.providerId
}
