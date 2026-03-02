import { describe, expect, it } from 'vitest'

import { generateCustomModelName } from '../../../src/services/model/model-utils'

describe('generateCustomModelName', () => {
  it('should format numeric version suffix with dot', () => {
    expect(generateCustomModelName('qwen3_5')).toBe('Qwen3.5')
  })

  it('should keep hyphenated words as spaced title case', () => {
    expect(generateCustomModelName('qwen3-coder-next')).toBe('Qwen3 Coder Next')
  })

  it('should preserve non-version underscores as spaces', () => {
    expect(generateCustomModelName('my_local_model')).toBe('My Local Model')
  })
})
