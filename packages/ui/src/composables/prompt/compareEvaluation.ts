import type {
  CompareAnalysisHints,
  EvaluationContentBlock,
  EvaluationSnapshot,
  EvaluationTarget,
  EvaluationTestCase,
} from '@prompt-optimizer/core'

export interface CompareEvaluationTestCaseDraft {
  id: string
  label?: string
  input?: EvaluationContentBlock | null
  settingsSummary?: string
}

export interface CompareEvaluationSnapshotDraft {
  id: string
  label: string
  testCaseId: string
  promptRef: EvaluationSnapshot['promptRef']
  promptText?: string
  output?: string
  reasoning?: string
  modelKey?: string
  versionLabel?: string
  executionInput?: EvaluationContentBlock | null
}

export interface CompareEvaluationPayload {
  target: EvaluationTarget
  testCases: EvaluationTestCase[]
  snapshots: EvaluationSnapshot[]
  compareHints: CompareAnalysisHints
}

const normalizeContentBlock = (
  block: EvaluationContentBlock | null | undefined
): EvaluationContentBlock | undefined => {
  const label = block?.label?.trim() || ''
  const content = block?.content?.trim() || ''
  if (!label || !content) return undefined

  const summary = block?.summary?.trim() || ''
  return {
    kind: block?.kind || 'custom',
    label,
    content,
    summary: summary || undefined,
  }
}

const normalizeTestCase = (
  testCase: CompareEvaluationTestCaseDraft | null | undefined
): EvaluationTestCase | null => {
  if (!testCase?.id?.trim()) return null
  const input = normalizeContentBlock(testCase.input)
  if (!input) return null

  const label = testCase.label?.trim() || ''
  const settingsSummary = testCase.settingsSummary?.trim() || ''

  return {
    id: testCase.id.trim(),
    label: label || undefined,
    input,
    settingsSummary: settingsSummary || undefined,
  }
}

const normalizeSnapshot = (
  snapshot: CompareEvaluationSnapshotDraft | null | undefined,
  validTestCaseIds: Set<string>,
): EvaluationSnapshot | null => {
  const promptText = snapshot?.promptText?.trim() || ''
  const output = snapshot?.output?.trim() || ''
  const testCaseId = snapshot?.testCaseId?.trim() || ''
  if (
    !snapshot?.id?.trim() ||
    !snapshot?.label?.trim() ||
    !testCaseId ||
    !validTestCaseIds.has(testCaseId) ||
    !promptText ||
    !output
  ) {
    return null
  }

  return {
    id: snapshot.id.trim(),
    label: snapshot.label.trim(),
    testCaseId,
    promptRef: snapshot.promptRef,
    promptText,
    output,
    reasoning: snapshot.reasoning?.trim() || undefined,
    modelKey: snapshot.modelKey?.trim() || undefined,
    versionLabel: snapshot.versionLabel?.trim() || undefined,
    executionInput: normalizeContentBlock(snapshot.executionInput),
  }
}

const buildTestCaseEvidenceKey = (testCase: EvaluationTestCase | undefined): string =>
  JSON.stringify({
    kind: testCase?.input.kind || '',
    summary: testCase?.input.summary || '',
    content: testCase?.input.content || '',
    settingsSummary: testCase?.settingsSummary || '',
  })

const deriveCompareHints = (
  snapshots: EvaluationSnapshot[],
  testCases: EvaluationTestCase[],
): CompareAnalysisHints => {
  const testCaseMap = new Map(testCases.map((testCase) => [testCase.id, testCase]))
  const testCaseCount = new Set(
    snapshots.map((snapshot) => buildTestCaseEvidenceKey(testCaseMap.get(snapshot.testCaseId)))
  ).size
  const promptCount = new Set(
    snapshots.map((snapshot) => snapshot.promptText.trim())
  ).size
  const modelCount = new Set(
    snapshots
      .map((snapshot) => (snapshot.modelKey || '').trim())
      .filter(Boolean)
  ).size

  const hasSharedTestCases = testCaseCount === 1
  const hasSamePromptSnapshots = promptCount === 1
  const hasCrossModelComparison =
    hasSharedTestCases &&
    hasSamePromptSnapshots &&
    modelCount > 1

  return {
    hasSharedTestCases,
    hasSamePromptSnapshots,
    hasCrossModelComparison,
  }
}

export const buildCompareEvaluationPayload = (params: {
  target: EvaluationTarget
  testCases: Array<CompareEvaluationTestCaseDraft | null | undefined>
  snapshots: Array<CompareEvaluationSnapshotDraft | null | undefined>
}): CompareEvaluationPayload | null => {
  const workspacePrompt = params.target.workspacePrompt?.trim() || ''
  if (!workspacePrompt) {
    return null
  }

  const referencePrompt = params.target.referencePrompt?.trim() || ''
  const designContext = normalizeContentBlock(params.target.designContext)
  const target: EvaluationTarget = {
    workspacePrompt,
    referencePrompt: referencePrompt || undefined,
    designContext,
  }

  const testCases = params.testCases
    .map((testCase) => normalizeTestCase(testCase))
    .filter((testCase): testCase is EvaluationTestCase => !!testCase)

  if (!testCases.length) {
    return null
  }

  const validTestCaseIds = new Set(testCases.map((testCase) => testCase.id))
  const snapshots = params.snapshots
    .map((snapshot) => normalizeSnapshot(snapshot, validTestCaseIds))
    .filter((snapshot): snapshot is EvaluationSnapshot => !!snapshot)

  if (snapshots.length < 2) {
    return null
  }

  return {
    target,
    testCases,
    snapshots,
    compareHints: deriveCompareHints(snapshots, testCases),
  }
}
