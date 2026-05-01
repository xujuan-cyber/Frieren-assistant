import { describe, expect, it } from 'vitest'

import { buildVariableValueGenerationPlan } from '../../../src/composables/variable/useSmartVariableValueGeneration'

describe('buildVariableValueGenerationPlan', () => {
  it('uses filled variables as context while generating only missing variables in batch mode', () => {
    const values: Record<string, string> = {
      topic: 'AI',
      style: '',
      length: '   ',
      audience: 'high school students',
    }

    const plan = buildVariableValueGenerationPlan(
      ['topic', 'style', 'length', 'audience'],
      (name) => values[name] ?? '',
      () => 'test'
    )

    expect(plan.variablesToGenerate).toEqual([
      { name: 'style', source: 'test' },
      { name: 'length', source: 'test' },
    ])
    expect(plan.contextVariables).toEqual([
      { name: 'topic', source: 'test', currentValue: 'AI' },
      { name: 'audience', source: 'test', currentValue: 'high school students' },
    ])
  })

  it('keeps single-variable generation scoped to the target variable', () => {
    const values: Record<string, string> = {
      topic: 'AI',
      style: 'explainer',
    }

    const plan = buildVariableValueGenerationPlan(
      ['topic', 'style'],
      (name) => values[name] ?? '',
      () => 'test',
      'style'
    )

    expect(plan.variablesToGenerate).toEqual([
      { name: 'style', source: 'test', currentValue: 'explainer' },
    ])
    expect(plan.contextVariables).toEqual([])
  })
})
