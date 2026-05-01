import type { FavoritePrompt } from '../favorite/types';
import type { ConversationMessage } from '../prompt/types';
import {
  PROMPT_MODEL_SCHEMA_VERSION,
  type PromptAsset,
  type PromptExample,
  type PromptImageRef,
  type PromptRunInput,
  type PromptRunOutput,
  type PromptVariable,
  type PromptVariableType,
} from './types';
import { createPromptContract, isPromptModeKey, resolvePromptModeKey } from './mode';
import { promptContentFromText } from './content';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => Boolean(item));
};

const dedupeStrings = (items: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
};

const normalizeVariableType = (value: unknown): PromptVariableType | undefined => {
  if (value === 'string' || value === 'number' || value === 'boolean' || value === 'enum') {
    return value;
  }
  return undefined;
};

const parseVariable = (value: unknown): PromptVariable | null => {
  if (!isPlainObject(value)) return null;

  const name = asTrimmedString(value.name);
  if (!name) return null;

  return {
    name,
    description: asTrimmedString(value.description),
    type: normalizeVariableType(value.type),
    required: value.required === true,
    defaultValue: asTrimmedString(value.defaultValue ?? value.default ?? value.value),
    options: dedupeStrings(asStringArray(value.options)),
    source: asTrimmedString(value.source),
  };
};

const parseVariables = (value: unknown): PromptVariable[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => parseVariable(item))
      .filter((item): item is PromptVariable => Boolean(item));
  }

  if (!isPlainObject(value)) return [];

  return Object.entries(value)
    .map(([name, raw]): PromptVariable | null => {
      const normalizedName = name.trim();
      if (!normalizedName) return null;
      return {
        name: normalizedName,
        required: false,
        defaultValue: raw === undefined || raw === null ? undefined : String(raw),
        options: [],
      };
    })
    .filter((item): item is PromptVariable => Boolean(item));
};

const parseParameters = (value: unknown): Record<string, string> => {
  if (!isPlainObject(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const normalizedKey = key.trim();
    if (!normalizedKey || raw === undefined || raw === null) continue;
    out[normalizedKey] = String(raw);
  }
  return out;
};

const parseMessages = (value: unknown): ConversationMessage[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ConversationMessage | null => {
      if (!isPlainObject(item)) return null;
      if (
        item.role !== 'system' &&
        item.role !== 'user' &&
        item.role !== 'assistant' &&
        item.role !== 'tool'
      ) {
        return null;
      }

      const content = typeof item.content === 'string' ? item.content : '';
      return {
        ...(asTrimmedString(item.id) ? { id: asTrimmedString(item.id) } : {}),
        role: item.role,
        content,
        ...(asTrimmedString(item.originalContent)
          ? { originalContent: asTrimmedString(item.originalContent) }
          : {}),
        ...(asTrimmedString(item.name) ? { name: asTrimmedString(item.name) } : {}),
        ...(Array.isArray(item.tool_calls) ? { tool_calls: item.tool_calls as ConversationMessage['tool_calls'] } : {}),
        ...(asTrimmedString(item.tool_call_id) ? { tool_call_id: asTrimmedString(item.tool_call_id) } : {}),
      };
    })
    .filter((item): item is ConversationMessage => Boolean(item));
};

const imageRefsFromParts = (urls: unknown, assetIds: unknown): PromptImageRef[] => [
  ...dedupeStrings(asStringArray(urls)).map((url): PromptImageRef => ({ kind: 'url', url })),
  ...dedupeStrings(asStringArray(assetIds)).map((assetId): PromptImageRef => ({
    kind: 'asset',
    assetId,
  })),
];

const parseExample = (
  value: unknown,
  favorite: FavoritePrompt,
  index: number,
  basedOnVersionId: string,
): PromptExample | null => {
  if (!isPlainObject(value)) return null;

  const text = asTrimmedString(value.text);
  const description = asTrimmedString(value.description);
  const outputText = asTrimmedString(value.outputText);
  const messages = parseMessages(value.messages);
  const parameters = parseParameters(value.parameters);
  const inputImages = imageRefsFromParts(value.inputImages, value.inputImageAssetIds);
  const outputImages = imageRefsFromParts(
    value.url ? [value.url] : value.images,
    value.imageAssetIds,
  );

  const input: PromptRunInput = {};
  if (text) input.text = text;
  if (messages.length > 0) input.messages = messages;
  if (Object.keys(parameters).length > 0) input.parameters = parameters;
  if (inputImages.length > 0) input.images = inputImages;

  const output: PromptRunOutput = {};
  if (outputText) output.text = outputText;
  if (outputImages.length > 0) output.images = outputImages;

  const hasInputData = Boolean(input.text || input.messages || input.parameters || input.images);
  const hasOutputData = Boolean(output.text || output.images);
  if (!hasInputData && !hasOutputData && !description) return null;

  return {
    id: asTrimmedString(value.id) ?? `favorite:${favorite.id}:example:${index + 1}`,
    basedOnVersionId,
    description,
    input,
    output: hasOutputData ? output : undefined,
    source: { kind: 'favorite', id: favorite.id },
    metadata: isPlainObject(value.metadata) ? { ...value.metadata } : undefined,
  };
};

const parseExamples = (
  value: unknown,
  favorite: FavoritePrompt,
  basedOnVersionId: string,
): PromptExample[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => parseExample(item, favorite, index, basedOnVersionId))
    .filter((item): item is PromptExample => Boolean(item));
};

const readReproducibility = (
  metadata: Record<string, unknown> | undefined,
  favorite: FavoritePrompt,
  basedOnVersionId: string,
): {
  variables: PromptVariable[];
  examples: PromptExample[];
  sourceKind?: 'garden' | 'favorite';
} => {
  if (!metadata) {
    return { variables: [], examples: [] };
  }

  const reproducibility = isPlainObject(metadata.reproducibility)
    ? metadata.reproducibility
    : null;
  if (reproducibility) {
    return {
      variables: parseVariables(reproducibility.variables),
      examples: parseExamples(reproducibility.examples, favorite, basedOnVersionId),
      sourceKind: 'favorite',
    };
  }

  const gardenSnapshot = isPlainObject(metadata.gardenSnapshot) ? metadata.gardenSnapshot : null;
  if (gardenSnapshot) {
    const assets = isPlainObject(gardenSnapshot.assets) ? gardenSnapshot.assets : {};
    return {
      variables: parseVariables(gardenSnapshot.variables),
      examples: parseExamples(assets.examples, favorite, basedOnVersionId),
      sourceKind: 'garden',
    };
  }

  return {
    variables: parseVariables(metadata.variables),
    examples: parseExamples(metadata.examples, favorite, basedOnVersionId),
    sourceKind: 'favorite',
  };
};

const stripWorkspaceDraftReproducibility = (
  reproducibility: ReturnType<typeof readReproducibility>,
): ReturnType<typeof readReproducibility> => ({
  ...reproducibility,
  variables: reproducibility.variables.map((variable) => {
    if (variable.source !== 'workspace') return variable;
    const next: PromptVariable = {
      name: variable.name,
      required: variable.required,
      options: variable.options,
    };
    if (variable.description !== undefined) next.description = variable.description;
    if (variable.type !== undefined) next.type = variable.type;
    if (variable.source !== undefined) next.source = variable.source;
    return next;
  }),
  examples: reproducibility.examples.filter((example) => example.id !== 'workspace-current'),
});

const isPromptAsset = (value: unknown): value is PromptAsset => {
  if (!isPlainObject(value)) return false;
  if (value.schemaVersion !== PROMPT_MODEL_SCHEMA_VERSION) return false;
  if (!asTrimmedString(value.id) || !asTrimmedString(value.title)) return false;
  if (!isPlainObject(value.contract) || !isPromptModeKey(value.contract.modeKey)) return false;
  if (!asTrimmedString(value.currentVersionId) || !Array.isArray(value.versions)) return false;
  if (!Array.isArray(value.examples)) return false;
  return typeof value.createdAt === 'number' && typeof value.updatedAt === 'number';
};

export interface PromptAssetFromFavoriteOptions {
  ignoreEmbeddedAsset?: boolean;
  stripWorkspaceDraft?: boolean;
}

export const promptAssetFromFavorite = (
  favorite: FavoritePrompt,
  options: PromptAssetFromFavoriteOptions = {},
): PromptAsset => {
  const metadata = isPlainObject(favorite.metadata) ? favorite.metadata : undefined;
  if (!options.ignoreEmbeddedAsset && isPromptAsset(metadata?.promptAsset)) {
    return metadata.promptAsset;
  }

  const modeKey = resolvePromptModeKey({
    functionMode: favorite.functionMode,
    optimizationMode: favorite.optimizationMode,
    imageSubMode: favorite.imageSubMode,
  });
  const versionId = `favorite:${favorite.id}:current`;
  const rawReproducibility = readReproducibility(metadata, favorite, versionId);
  const reproducibility = options.stripWorkspaceDraft
    ? stripWorkspaceDraftReproducibility(rawReproducibility)
    : rawReproducibility;
  const sourceKind = reproducibility.sourceKind ?? 'favorite';

  const contentMetadata: Record<string, unknown> = {};
  if (metadata?.originalContent !== undefined) contentMetadata.originalContent = metadata.originalContent;
  if (metadata?.sourceHistoryId !== undefined) contentMetadata.sourceHistoryId = metadata.sourceHistoryId;
  if (metadata?.modelKey !== undefined) contentMetadata.modelKey = metadata.modelKey;
  if (metadata?.modelName !== undefined) contentMetadata.modelName = metadata.modelName;
  if (metadata?.templateId !== undefined) contentMetadata.templateId = metadata.templateId;

  return {
    schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
    id: `favorite:${favorite.id}`,
    title: favorite.title,
    description: favorite.description,
    tags: [...favorite.tags],
    category: favorite.category,
    contract: createPromptContract(modeKey, {
      variables: reproducibility.variables,
    }),
    currentVersionId: versionId,
    versions: [
      {
        id: versionId,
        version: 1,
        title: favorite.title,
        content: promptContentFromText(favorite.content, modeKey),
        createdAt: favorite.createdAt,
        updatedAt: favorite.updatedAt,
        source: { kind: 'favorite', id: favorite.id },
        metadata: Object.keys(contentMetadata).length > 0 ? contentMetadata : undefined,
      },
    ],
    examples: reproducibility.examples,
    source: { kind: sourceKind, id: favorite.id },
    createdAt: favorite.createdAt,
    updatedAt: favorite.updatedAt,
  };
};
