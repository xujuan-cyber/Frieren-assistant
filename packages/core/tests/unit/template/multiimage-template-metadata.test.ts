import { describe, expect, it } from 'vitest'

import { template as multiimageOptimizeEn } from '../../../src/services/template/default-templates/image-optimize/multiimage/multiimage-optimize_en'

describe('multiimage template metadata', () => {
  it('uses the standardized english builtin metadata', () => {
    expect(multiimageOptimizeEn.id).toBe('multiimage-optimize-en')
    expect(multiimageOptimizeEn.name).toBe('Multi-Image Optimization')
    expect(multiimageOptimizeEn.metadata.description).toBe(
      'Multi-image prompt optimization template, organizing user requests around Image 1 / Image 2 / Image 3 relationships',
    )
  })
})
