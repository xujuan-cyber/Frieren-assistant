import { describe, it, expect } from 'vitest'
import { buildCompareEvaluationPayload } from '../../../src/composables/prompt/compareEvaluation'

describe('buildCompareEvaluationPayload', () => {
  it('returns null when workspace prompt is empty', () => {
    const payload = buildCompareEvaluationPayload({
      target: {
        workspacePrompt: '   ',
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
    })

    expect(payload).toBeNull()
  })

  it('returns null when fewer than two valid snapshots remain', () => {
    const payload = buildCompareEvaluationPayload({
      target: {
        workspacePrompt: ' Current prompt ',
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
          output: '   ',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' },
          promptText: '   ',
          output: 'Output B',
        },
      ],
    })

    expect(payload).toBeNull()
  })

  it('normalizes target, test cases, snapshots, and compare hints', () => {
    const payload = buildCompareEvaluationPayload({
      target: {
        workspacePrompt: ' Current prompt ',
        referencePrompt: ' Reference prompt ',
        designContext: {
          kind: 'json',
          label: ' Design Context ',
          content: ' { "mode": "variable" } ',
          summary: ' Schema only ',
        },
      },
      testCases: [
        {
          id: ' tc-1 ',
          label: ' Shared Case ',
          input: {
            kind: 'text',
            label: ' Shared Input ',
            content: ' Input A ',
            summary: ' Summary A ',
          },
          settingsSummary: ' model=dashscope ',
        },
      ],
      snapshots: [
        {
          id: ' a ',
          label: ' A ',
          testCaseId: ' tc-1 ',
          promptRef: { kind: 'workspace', label: ' Workspace ' },
          promptText: ' Prompt A ',
          output: ' Output A ',
          reasoning: ' Why A ',
          modelKey: ' model-a ',
          versionLabel: ' v1 ',
          executionInput: {
            kind: 'custom',
            label: ' Rendered Content ',
            content: ' Extra A ',
            summary: ' Summary Extra ',
          },
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 2 },
          promptText: 'Prompt B',
          output: 'Output B',
          executionInput: {
            kind: 'custom',
            label: 'Ignored',
            content: '   ',
            summary: '   ',
          },
        },
        null,
      ],
    })

    expect(payload).toEqual({
      target: {
        workspacePrompt: 'Current prompt',
        referencePrompt: 'Reference prompt',
        designContext: {
          kind: 'json',
          label: 'Design Context',
          content: '{ "mode": "variable" }',
          summary: 'Schema only',
        },
      },
      testCases: [
        {
          id: 'tc-1',
          label: 'Shared Case',
          input: {
            kind: 'text',
            label: 'Shared Input',
            content: 'Input A',
            summary: 'Summary A',
          },
          settingsSummary: 'model=dashscope',
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace', label: ' Workspace ' },
          promptText: 'Prompt A',
          output: 'Output A',
          reasoning: 'Why A',
          modelKey: 'model-a',
          versionLabel: 'v1',
          executionInput: {
            kind: 'custom',
            label: 'Rendered Content',
            content: 'Extra A',
            summary: 'Summary Extra',
          },
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 2 },
          promptText: 'Prompt B',
          output: 'Output B',
          reasoning: undefined,
          modelKey: undefined,
          versionLabel: undefined,
          executionInput: undefined,
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
    })
  })

  it('keeps all valid snapshots in multi-snapshot compare payloads', () => {
    const payload = buildCompareEvaluationPayload({
      target: {
        workspacePrompt: ' Workspace prompt ',
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
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt B',
          output: 'Output B',
          executionInput: {
            kind: 'custom',
            label: 'Input Snapshot',
            content: 'Input B',
            summary: 'Vars: tone=formal',
          },
        },
        {
          id: 'c',
          label: 'C',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 2 },
          promptText: 'Prompt C',
          output: 'Output C',
          reasoning: 'Reasoning C',
          modelKey: 'model-c',
          versionLabel: 'v2',
        },
      ],
    })

    expect(payload).toEqual({
      target: {
        workspacePrompt: 'Workspace prompt',
        referencePrompt: undefined,
        designContext: undefined,
      },
      testCases: [
        {
          id: 'tc-1',
          label: undefined,
          input: {
            kind: 'text',
            label: 'Shared Input',
            content: 'Input A',
            summary: undefined,
          },
          settingsSummary: undefined,
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
          reasoning: undefined,
          modelKey: undefined,
          versionLabel: undefined,
          executionInput: undefined,
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt B',
          output: 'Output B',
          reasoning: undefined,
          modelKey: undefined,
          versionLabel: undefined,
          executionInput: {
            kind: 'custom',
            label: 'Input Snapshot',
            content: 'Input B',
            summary: 'Vars: tone=formal',
          },
        },
        {
          id: 'c',
          label: 'C',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 2 },
          promptText: 'Prompt C',
          output: 'Output C',
          reasoning: 'Reasoning C',
          modelKey: 'model-c',
          versionLabel: 'v2',
          executionInput: undefined,
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
    })
  })

  it('treats distinct testCaseIds with the same effective input as shared evidence', () => {
    const payload = buildCompareEvaluationPayload({
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCases: [
        {
          id: 'tc-a',
          input: {
            kind: 'conversation',
            label: 'Conversation Snapshot',
            summary: 'same shared conversation',
            content: 'system: marker\nuser: hello',
          },
        },
        {
          id: 'tc-b',
          input: {
            kind: 'conversation',
            label: 'Conversation Snapshot',
            summary: 'same shared conversation',
            content: 'system: marker\nuser: hello',
          },
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-a',
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt A',
          output: 'Output A',
          modelKey: 'model-a',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-b',
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt A',
          output: 'Output B',
          modelKey: 'model-b',
        },
      ],
    })

    expect(payload).not.toBeNull()
    expect(payload?.compareHints).toEqual({
      hasSharedTestCases: true,
      hasSamePromptSnapshots: true,
      hasCrossModelComparison: true,
    })
  })
})
