import { describe, it, expect, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
import { useEvaluationHandler } from '../../../src/composables/prompt/useEvaluationHandler'
import type {
  ScoreLevel,
  SingleEvaluationState,
  UseEvaluationReturn,
} from '../../../src/composables/prompt/useEvaluation'
import type { PersistedEvaluationResults } from '../../../src/types/evaluation'
import type {
  EvaluationContentBlock,
  EvaluationResponse,
  EvaluationType,
  ProEvaluationContext,
  ResultEvaluationRequest,
} from '@prompt-optimizer/core'

const createEvaluationResponse = (
  overall: number,
  type: EvaluationType = 'result'
): EvaluationResponse => ({
  type,
  score: {
    overall,
    dimensions: [
      {
        key: 'overall',
        label: 'Overall',
        score: overall,
      },
    ],
  },
  improvements: [],
  summary: `score-${overall}`,
  patchPlan: [],
})

const createSingleState = (result: EvaluationResponse | null = null): SingleEvaluationState =>
  reactive({
    isEvaluating: false,
    result,
    streamContent: '',
    error: null,
  }) as SingleEvaluationState

const toScoreLevel = (score: number | null): ScoreLevel | null => {
  if (score === null) return null
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 60) return 'acceptable'
  if (score >= 40) return 'poor'
  return 'very-poor'
}

const createMockEvaluation = (
  seed: Partial<PersistedEvaluationResults> & {
    result?: Record<string, EvaluationResponse | null>
  } = {},
): UseEvaluationReturn => {
  const resultState = reactive<Record<string, SingleEvaluationState>>({})
  const ensureResultState = (variantId: string): SingleEvaluationState => {
    if (!resultState[variantId]) {
      resultState[variantId] = createSingleState(seed.result?.[variantId] ?? null)
    }
    return resultState[variantId]
  }

  Object.keys(seed.result || {}).forEach((variantId) => {
    ensureResultState(variantId)
  })

  const state = reactive({
    result: resultState,
    compare: createSingleState(seed.compare ?? null),
    'prompt-only': createSingleState(seed['prompt-only'] ?? null),
    'prompt-iterate': createSingleState(seed['prompt-iterate'] ?? null),
    activeDetail: null as { type: EvaluationType; variantId?: string } | null,
  })

  const isPanelVisible = ref(false)

  const getTargetState = (type: EvaluationType, variantId?: string): SingleEvaluationState | null => {
    if (type === 'result') {
      if (!variantId) return null
      return ensureResultState(variantId)
    }
    return state[type]
  }

  return {
    state,
    isPanelVisible,
    compareScore: computed(() => state.compare.result?.score?.overall ?? null),
    compareLevel: computed(() => toScoreLevel(state.compare.result?.score?.overall ?? null)),
    isEvaluatingCompare: computed(() => state.compare.isEvaluating),
    hasCompareResult: computed(() => state.compare.result !== null),
    promptOnlyScore: computed(() => state['prompt-only'].result?.score?.overall ?? null),
    promptOnlyLevel: computed(() => toScoreLevel(state['prompt-only'].result?.score?.overall ?? null)),
    isEvaluatingPromptOnly: computed(() => state['prompt-only'].isEvaluating),
    hasPromptOnlyResult: computed(() => state['prompt-only'].result !== null),
    promptIterateScore: computed(() => state['prompt-iterate'].result?.score?.overall ?? null),
    promptIterateLevel: computed(() => toScoreLevel(state['prompt-iterate'].result?.score?.overall ?? null)),
    isEvaluatingPromptIterate: computed(() => state['prompt-iterate'].isEvaluating),
    hasPromptIterateResult: computed(() => state['prompt-iterate'].result !== null),
    isAnyEvaluating: computed(() => false),
    activeResult: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      return getTargetState(active.type, active.variantId)?.result ?? null
    }),
    activeStreamContent: computed(() => {
      const active = state.activeDetail
      if (!active) return ''
      return getTargetState(active.type, active.variantId)?.streamContent ?? ''
    }),
    activeError: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      return getTargetState(active.type, active.variantId)?.error ?? null
    }),
    activeScoreLevel: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      const score = getTargetState(active.type, active.variantId)?.result?.score?.overall ?? null
      return toScoreLevel(score)
    }),
    evaluateResult: vi.fn(async () => {}),
    evaluateCompare: vi.fn(async () => {}),
    evaluatePromptOnly: vi.fn(async () => {}),
    evaluatePromptIterate: vi.fn(async () => {}),
    clearResult: vi.fn((type: EvaluationType, variantId?: string) => {
      const target = getTargetState(type, variantId)
      if (!target) return
      target.result = null
      target.streamContent = ''
      target.error = null
      target.isEvaluating = false
    }),
    clearAllResults: vi.fn(),
    showDetail: vi.fn((type: EvaluationType, variantId?: string) => {
      state.activeDetail = { type, variantId }
      isPanelVisible.value = true
    }),
    closePanel: vi.fn(() => {
      isPanelVisible.value = false
    }),
    getScoreLevel: (score: number | null) => toScoreLevel(score),
    getResultState: ensureResultState,
    getResultScore: (variantId: string) => ensureResultState(variantId).result?.score?.overall ?? null,
    getResultLevel: (variantId: string) =>
      toScoreLevel(ensureResultState(variantId).result?.score?.overall ?? null),
    isEvaluatingResult: (variantId: string) => ensureResultState(variantId).isEvaluating,
    hasResultEvaluation: (variantId: string) => ensureResultState(variantId).result !== null,
  } as UseEvaluationReturn
}

const stringifyContext = (context: ProEvaluationContext | undefined): string =>
  context ? JSON.stringify(context, null, 2) : ''

const createDesignContext = (
  context: ProEvaluationContext | undefined,
  label: string
): EvaluationContentBlock | undefined => {
  const content = stringifyContext(context)
  if (!content) return undefined
  return {
    kind: 'json',
    label,
    content,
  }
}

const createVariableDesignContext = (
  names: string[],
): EvaluationContentBlock | undefined => {
  const normalized = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
  if (!normalized.length) return undefined
  return {
    kind: 'variables',
    label: 'Variable Structure',
    summary: '这里只说明模板变量结构，不包含任何测试值。',
    content: `变量: ${normalized.join(', ')}`,
  }
}

const createConversationDesignContext = (
  role: string,
  messages: Array<{ role: string; content: string }>,
): EvaluationContentBlock => ({
  kind: 'conversation',
  label: 'Conversation Design Context',
  summary: `当前分析目标是 ${role} 消息；会话中的该位置已用“【当前工作区要优化的提示词】”标记。`,
  content: [
    `目标消息角色: ${role}`,
    '会话上下文:',
    ...messages.map((message) => `- ${message.role}: ${message.content}`),
  ].join('\n'),
})

const createResultTarget = (overrides: Partial<ResultEvaluationRequest> = {}) => ({
  variantId: 'a',
  target: {
    workspacePrompt: 'Workspace prompt',
    ...(overrides.type === 'result' ? overrides.target : {}),
  },
  testCase: {
    id: 'tc-a',
    input: {
      kind: 'text' as const,
      label: 'Test Input',
      content: 'Input A',
    },
    ...(overrides.type === 'result' ? overrides.testCase : {}),
  },
  snapshot: {
    id: 'snap-a',
    label: 'A',
    testCaseId: 'tc-a',
    promptRef: { kind: 'workspace' as const, label: 'Workspace' },
    promptText: 'Prompt A',
    output: 'Output A',
    ...(overrides.type === 'result' ? overrides.snapshot : {}),
  },
})

describe('useEvaluationHandler', () => {
  it('routes result, compare, and prompt analysis requests with the right context', async () => {
    const analysisContext: ProEvaluationContext = {
      variables: [{ name: 'schemaOnly', source: 'temporary' }],
      rawPrompt: 'analysis raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Current prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('variable'),
      analysisContext: ref(analysisContext),
      resultTargets: ref({
        a: createResultTarget(),
      }),
      comparePayload: ref({
        target: {
          workspacePrompt: 'Workspace prompt',
        },
        testCases: [
          {
            id: 'tc-1',
            input: {
              kind: 'text',
              label: 'Shared Input',
              content: 'Input A',
            },
          },
        ],
        snapshots: [
          {
            id: 'a',
            label: 'A',
            testCaseId: 'tc-1',
            promptRef: { kind: 'workspace' },
            promptText: 'Prompt A',
            output: 'Output A',
          },
          {
            id: 'b',
            label: 'B',
            testCaseId: 'tc-1',
            promptRef: { kind: 'version', version: 1 },
            promptText: 'Prompt B',
            output: 'Output B',
          },
        ],
        compareHints: {
          hasSharedTestCases: true,
          hasSamePromptSnapshots: false,
          hasCrossModelComparison: false,
        },
      }),
      currentIterateRequirement: ref(''),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('result', {
      variantId: 'a',
      userFeedback: '  make it stricter  ',
    })
    expect(mockEvaluation.evaluateResult).toHaveBeenCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: 'make it stricter',
    })

    await handler.handleEvaluate('compare', {
      userFeedback: '  compare carefully  ',
    })
    expect(mockEvaluation.evaluateCompare).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCases: [
        {
          id: 'tc-1',
          input: {
            kind: 'text',
            label: 'Shared Input',
            content: 'Input A',
          },
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt A',
          output: 'Output A',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 1 },
          promptText: 'Prompt B',
          output: 'Output B',
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
      focus: 'compare carefully',
    })

    await handler.handleEvaluate('prompt-only')
    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Current prompt',
        designContext: createVariableDesignContext(['schemaOnly']),
      },
      focus: undefined,
    })
  })

  it('uses workspace prompt only and falls back to global analysis context', async () => {
    const globalContext: ProEvaluationContext = {
      variables: [{ name: 'global', source: 'temporary', value: '1' }],
      rawPrompt: 'global raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      proContext: ref(globalContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only', {
      userFeedback: '  tighten the scope  ',
    })

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      focus: 'tighten the scope',
    })
  })

  it('routes prompt-iterate to prompt-only when requirement is empty and to prompt-iterate when present', async () => {
    const mockEvaluation = createMockEvaluation()
    const iterateRequirement = ref('   ')

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      currentIterateRequirement: iterateRequirement,
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-iterate')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      focus: undefined,
    })
    expect(mockEvaluation.evaluatePromptIterate).not.toHaveBeenCalled()

    iterateRequirement.value = '  add an explicit JSON schema  '

    await handler.handleEvaluate('prompt-iterate', {
      userFeedback: '  keep the tone concise  ',
    })

    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      iterateRequirement: 'add an explicit JSON schema',
      focus: 'keep the tone concise',
    })
  })

  it('formats pro-variable analysis context as minimal variable structure', async () => {
    const analysisContext: ProEvaluationContext = {
      variables: [
        { name: 'schemaOnly', source: 'temporary' },
        { name: 'audience', source: 'global' },
      ],
      rawPrompt: 'analysis raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Current prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('variable'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Current prompt',
        designContext: createVariableDesignContext(['schemaOnly', 'audience']),
      },
      focus: undefined,
    })
  })

  it('formats pro-multi analysis context as a minimal conversation summary', async () => {
    const analysisContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'Ask clarifying questions first',
        originalContent: 'Give advice directly',
      },
      conversationMessages: [
        { role: 'system', content: 'Ask clarifying questions first', isTarget: true },
        { role: 'user', content: 'I need a team wiki for a fast-growing startup team.', isTarget: false },
        { role: 'assistant', content: 'You should first clarify team size and collaboration style.', isTarget: false },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('multi'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: createConversationDesignContext('system', [
          { role: 'system', content: '【当前工作区要优化的提示词】' },
          { role: 'user', content: 'I need a team wiki for a fast-growing startup team.' },
          { role: 'assistant', content: 'You should first clarify team size and collaboration style.' },
        ]),
      },
      focus: undefined,
    })
  })

  it('keeps the target marker visible when pro-multi conversation context is long', async () => {
    const analysisContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'Ask clarifying questions first',
        originalContent: 'Give advice directly',
      },
      conversationMessages: [
        { role: 'user', content: 'm1', isTarget: false },
        { role: 'assistant', content: 'm2', isTarget: false },
        { role: 'user', content: 'm3', isTarget: false },
        { role: 'assistant', content: 'm4', isTarget: false },
        { role: 'user', content: 'm5', isTarget: false },
        { role: 'system', content: 'Ask clarifying questions first', isTarget: true },
        { role: 'user', content: 'm7', isTarget: false },
        { role: 'assistant', content: 'm8', isTarget: false },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('multi'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: createConversationDesignContext('system', [
          { role: 'user', content: 'm3' },
          { role: 'assistant', content: 'm4' },
          { role: 'user', content: 'm5' },
          { role: 'system', content: '【当前工作区要优化的提示词】' },
          { role: 'user', content: 'm7' },
          { role: 'assistant', content: 'm8' },
        ]),
      },
      focus: undefined,
    })
  })

  it('uses minimal input for basic-system prompt analysis as well', async () => {
    const globalContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'System prompt',
      },
      conversationMessages: [
        {
          role: 'user',
          content: 'User question',
        },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('system'),
      proContext: ref(globalContext),
      currentIterateRequirement: ref('  strengthen no-chain-of-thought rule  '),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only', {
      userFeedback: '  suppress reasoning traces  ',
    })

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: undefined,
      },
      focus: 'suppress reasoning traces',
    })

    await handler.handleEvaluate('prompt-iterate')

    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: undefined,
      },
      iterateRequirement: 'strengthen no-chain-of-thought rule',
      focus: undefined,
    })
  })

  it('short-circuits missing result/compare targets and re-evaluates the active detail target', async () => {
    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      resultTargets: ref({
        a: createResultTarget(),
      }),
      comparePayload: ref(null),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('result', { variantId: 'missing' })
    await handler.handleEvaluate('compare')

    expect(mockEvaluation.evaluateResult).not.toHaveBeenCalled()
    expect(mockEvaluation.evaluateCompare).not.toHaveBeenCalled()

    mockEvaluation.state.activeDetail = {
      type: 'result',
      variantId: 'a',
    }
    await handler.handleReEvaluate()

    expect(mockEvaluation.evaluateResult).toHaveBeenCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: undefined,
    })

    mockEvaluation.state.activeDetail = {
      type: 'result',
      variantId: 'a',
    }
    await handler.handleEvaluateActiveWithFeedback('  focus on factual accuracy  ')

    expect(mockEvaluation.evaluateResult).toHaveBeenLastCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: 'focus on factual accuracy',
    })
  })

  it('re-evaluates the active compare detail with trimmed feedback', async () => {
    const mockEvaluation = createMockEvaluation()

    const comparePayload = {
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCases: [
        {
          id: 'tc-1',
          input: {
            kind: 'text' as const,
            label: 'Shared Input',
            content: 'Input A',
          },
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' as const },
          promptText: 'Prompt A',
          output: 'Output A',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version' as const, version: 1 },
          promptText: 'Prompt B',
          output: 'Output B',
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
    }

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      comparePayload: ref(comparePayload),
      externalEvaluation: mockEvaluation,
    })

    mockEvaluation.state.activeDetail = {
      type: 'compare',
    }
    await handler.handleReEvaluate()

    expect(mockEvaluation.evaluateCompare).toHaveBeenCalledWith({
      ...comparePayload,
      focus: undefined,
    })

    mockEvaluation.state.activeDetail = {
      type: 'compare',
    }
    await handler.handleEvaluateActiveWithFeedback('  compare consistency only  ')

    expect(mockEvaluation.evaluateCompare).toHaveBeenLastCalledWith({
      ...comparePayload,
      focus: 'compare consistency only',
    })
  })

  it('hydrates and syncs persisted evaluation buckets by variant id', async () => {
    const persistedResults = ref<PersistedEvaluationResults>({
      result: {
        a: createEvaluationResponse(81),
      },
      compare: createEvaluationResponse(82, 'compare'),
      'prompt-only': createEvaluationResponse(83, 'prompt-only'),
      'prompt-iterate': createEvaluationResponse(84, 'prompt-iterate'),
    })

    const mockEvaluation = createMockEvaluation()

    useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      externalEvaluation: mockEvaluation,
      persistedResults,
    })

    expect(mockEvaluation.getResultState('a').result?.score.overall).toBe(81)
    expect(mockEvaluation.state.compare.result?.score.overall).toBe(82)
    expect(mockEvaluation.state['prompt-only'].result?.score.overall).toBe(83)
    expect(mockEvaluation.state['prompt-iterate'].result?.score.overall).toBe(84)

    mockEvaluation.getResultState('a').result = createEvaluationResponse(91)
    mockEvaluation.getResultState('b').result = createEvaluationResponse(77)
    mockEvaluation.state.compare.result = createEvaluationResponse(79, 'compare')
    await nextTick()

    expect(persistedResults.value.result).toEqual({
      a: createEvaluationResponse(91),
      b: createEvaluationResponse(77),
    })
    expect(persistedResults.value.compare?.score.overall).toBe(79)
  })

  it('clears all result buckets before a new test run', () => {
    const mockEvaluation = createMockEvaluation({
      result: {
        a: createEvaluationResponse(71),
        b: createEvaluationResponse(72),
      },
      compare: createEvaluationResponse(73, 'compare'),
    })

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      externalEvaluation: mockEvaluation,
    })

    handler.clearBeforeTest()

    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('result', 'a')
    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('result', 'b')
    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('compare')
  })
})
