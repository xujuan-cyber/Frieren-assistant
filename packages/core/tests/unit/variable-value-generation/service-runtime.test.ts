import { describe, it, expect, vi } from 'vitest'

import { createVariableValueGenerationService } from '../../../src/services/variable-value-generation/service'

describe('VariableValueGenerationService runtime messages', () => {
  it('uses English warnings and fallback reason for alignment edge cases', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const service = createVariableValueGenerationService(
      {
        sendMessage: vi.fn(async () =>
          JSON.stringify({
            values: [
              { name: 'topic', value: 'cats', reason: 'first' },
              { name: 'topic', value: 'dogs', reason: 'second' },
              { name: 'extra', value: 'unused', reason: 'extra' },
            ],
            summary: 'done',
          }),
        ),
      } as any,
      {
        getModel: vi.fn(async () => ({ key: 'model-1' })),
      } as any,
      {
        getTemplate: vi.fn(async () => ({
          id: 'variable-value-generation',
          content: 'template',
        })),
      } as any,
    )

    const result = await service.generate({
      promptContent: 'Write about {{topic}} in a {{tone}} style.',
      generationModelKey: 'model-1',
      variables: [
        { name: 'topic' },
        { name: 'topic' },
        { name: 'tone' },
      ],
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[VariableValueGeneration] LLM returned a duplicate variable name: topic. The later value will overwrite the earlier one.',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[VariableValueGeneration] LLM returned a variable that was not requested: extra',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[VariableValueGeneration] The request list contains a duplicate variable name: topic. The generated result will be reused.',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[VariableValueGeneration] LLM did not return variable "tone". Filling it with an empty value.',
    )
    expect(result.values).toEqual([
      { name: 'topic', value: 'dogs', reason: 'second', confidence: undefined },
      { name: 'topic', value: 'dogs', reason: 'second', confidence: undefined },
      {
        name: 'tone',
        value: '',
        reason: 'LLM did not generate a value for this variable.',
        confidence: 0,
      },
    ])

    consoleWarnSpy.mockRestore()
  })
})
