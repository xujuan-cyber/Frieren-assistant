import { describe, expect, it } from 'vitest'

import type {
  PromptRecord,
  PromptRecordChain,
  PromptRecordType,
} from '../../../src/services/history/types'
import {
  createRootOnlyPromptOptimizationChain,
  promptRecordChainToOptimizationChain,
} from '../../../src/services/prompt-model'

const createRecord = (
  overrides: Partial<PromptRecord> = {},
): PromptRecord => ({
  id: 'record-1',
  originalPrompt: 'raw prompt',
  optimizedPrompt: 'optimized prompt',
  type: 'optimize',
  chainId: 'chain-1',
  version: 1,
  timestamp: 1000,
  modelKey: 'model-a',
  modelName: 'Model A',
  templateId: 'template-a',
  ...overrides,
})

const createChain = (
  rootRecord: PromptRecord,
  versions: PromptRecord[],
  currentRecord: PromptRecord,
): PromptRecordChain => ({
  chainId: 'chain-1',
  rootRecord,
  versions,
  currentRecord,
})

describe('promptRecordChainToOptimizationChain', () => {
  it('projects a legacy PromptRecordChain into a standard optimization chain', () => {
    const root = createRecord()
    const second = createRecord({
      id: 'record-2',
      originalPrompt: 'optimized prompt',
      optimizedPrompt: 'optimized prompt v2',
      type: 'iterate',
      version: 2,
      previousId: 'record-1',
      timestamp: 2000,
      iterationNote: 'make it shorter',
    })

    const chain = promptRecordChainToOptimizationChain(createChain(root, [root, second], second))

    expect(chain).toMatchObject({
      id: 'chain-1',
      modeKey: 'basic-system',
      currentRecordId: 'record-2',
      legacyPromptRecordChainId: 'chain-1',
      root: {
        id: 'chain-1:root',
        createdAt: 1000,
        sourceRecordId: 'record-1',
        content: { kind: 'text', text: 'raw prompt' },
      },
    })
    expect(chain.records).toHaveLength(2)
    expect(chain.records[1]).toMatchObject({
      id: 'record-2',
      version: 2,
      previousRecordId: 'record-1',
      input: { kind: 'text', text: 'optimized prompt' },
      output: { kind: 'text', text: 'optimized prompt v2' },
      iterationNote: 'make it shorter',
    })
  })

  it.each([
    ['contextUserOptimize', 'pro-variable'],
    ['conversationMessageOptimize', 'pro-conversation'],
    ['text2imageOptimize', 'image-text2image'],
    ['image2imageOptimize', 'image-image2image'],
    ['multiimageOptimize', 'image-multiimage'],
  ] as Array<[PromptRecordType, string]>)(
    'infers %s as %s',
    (type, expectedModeKey) => {
      const root = createRecord({ type })
      const chain = promptRecordChainToOptimizationChain(createChain(root, [root], root))

      expect(chain.modeKey).toBe(expectedModeKey)
    },
  )

  it('projects message optimization metadata into a target', () => {
    const root = createRecord({
      type: 'conversationMessageOptimize',
      metadata: {
        messageId: 'msg-1',
        messageRole: 'user',
      },
    })

    const chain = promptRecordChainToOptimizationChain(createChain(root, [root], root))

    expect(chain.target).toEqual({
      kind: 'message',
      id: 'msg-1',
      role: 'user',
    })
  })
})

describe('createRootOnlyPromptOptimizationChain', () => {
  it('creates a legal root-only chain for testing raw prompts', () => {
    const chain = createRootOnlyPromptOptimizationChain({
      chainId: 'chain-root-only',
      modeKey: 'basic-user',
      content: 'raw user prompt',
      createdAt: 1234,
    })

    expect(chain).toEqual({
      id: 'chain-root-only',
      modeKey: 'basic-user',
      root: {
        id: 'chain-root-only:root',
        content: { kind: 'text', text: 'raw user prompt' },
        createdAt: 1234,
      },
      records: [],
      target: undefined,
      metadata: undefined,
    })
  })
})
