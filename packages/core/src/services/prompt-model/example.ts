import type {
  PromptExample,
  PromptRevisionRef,
  PromptRunInput,
  PromptRunOutput,
  PromptSourceRef,
  PromptTestRun,
} from './types';

export interface PromptExampleFromTestRunOptions {
  basedOnVersionId: string;
  id?: string;
  title?: string;
  description?: string;
  source?: PromptSourceRef;
}

const hasRunInput = (input: PromptRunInput): boolean =>
  Boolean(
    input.text ||
    (input.messages && input.messages.length > 0) ||
    (input.parameters && Object.keys(input.parameters).length > 0) ||
    (input.images && input.images.length > 0),
  );

const hasRunOutput = (output: PromptRunOutput | undefined): output is PromptRunOutput =>
  Boolean(
    output &&
    (
      output.text ||
      (output.images && output.images.length > 0)
    ),
  );

const cloneRevisionRef = (revision: PromptRevisionRef): PromptRevisionRef => ({ ...revision });

const inferSourceFromRevision = (revision: PromptRevisionRef): PromptSourceRef => {
  if (revision.kind === 'asset-version') {
    return {
      kind: 'favorite',
      id: revision.assetId,
      metadata: {
        versionId: revision.versionId,
      },
    };
  }

  return {
    kind: 'workspace',
    id: revision.kind === 'workspace' ? revision.sessionId : revision.chainId,
  };
};

export const promptExampleFromTestRun = (
  run: PromptTestRun,
  options: PromptExampleFromTestRunOptions,
): PromptExample | null => {
  if (run.status !== 'success' || !hasRunOutput(run.output)) {
    return null;
  }

  const input: PromptRunInput = {
    ...(run.input.text ? { text: run.input.text } : {}),
    ...(run.input.messages && run.input.messages.length > 0
      ? { messages: run.input.messages.map((message) => ({ ...message })) }
      : {}),
    ...(run.input.parameters && Object.keys(run.input.parameters).length > 0
      ? { parameters: { ...run.input.parameters } }
      : {}),
    ...(run.input.images && run.input.images.length > 0
      ? { images: run.input.images.map((image) => ({ ...image })) }
      : {}),
    ...(run.input.metadata ? { metadata: { ...run.input.metadata } } : {}),
  };

  if (!hasRunInput(input)) {
    return null;
  }

  const output: PromptRunOutput = {
    ...(run.output.text ? { text: run.output.text } : {}),
    ...(run.output.images && run.output.images.length > 0
      ? { images: run.output.images.map((image) => ({ ...image })) }
      : {}),
    ...(run.output.metadata ? { metadata: { ...run.output.metadata } } : {}),
  };

  return {
    id: options.id ?? `test-run:${run.id}`,
    basedOnVersionId: options.basedOnVersionId,
    title: options.title,
    description: options.description,
    input,
    output,
    createdAt: run.createdAt,
    source: options.source ?? inferSourceFromRevision(run.revision),
    metadata: {
      testRunId: run.id,
      revision: cloneRevisionRef(run.revision),
      ...(run.modelKey ? { modelKey: run.modelKey } : {}),
      ...(run.modelName ? { modelName: run.modelName } : {}),
      ...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
      ...(run.metadata ? { runMetadata: { ...run.metadata } } : {}),
    },
  };
};
