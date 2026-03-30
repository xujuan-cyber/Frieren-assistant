import { describe, expect, it } from 'vitest'

import { ALL_TEMPLATES } from '../../../src/services/template/default-templates'
import { StaticLoader } from '../../../src/services/template/static-loader'
import { templateSchema } from '../../../src/services/template/types'

describe('image reference template types', () => {
  it('accepts the new internal image reference template types', () => {
    const base = {
      id: 'test-template',
      name: 'test template',
      content: 'test content',
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
      },
    }

    expect(
      templateSchema.safeParse({
        ...base,
        metadata: {
          ...base.metadata,
          templateType: 'image-reference-spec-extraction',
        },
      }).success,
    ).toBe(true)

    expect(
      templateSchema.safeParse({
        ...base,
        metadata: {
          ...base.metadata,
          templateType: 'image-prompt-composition',
        },
      }).success,
    ).toBe(true)

    expect(
      templateSchema.safeParse({
        ...base,
        metadata: {
          ...base.metadata,
          templateType: 'image-prompt-migration',
        },
      }).success,
    ).toBe(true)
  })

  it('rejects the removed image-prompt-extraction template type', () => {
    const result = templateSchema.safeParse({
      id: 'legacy-template',
      name: 'legacy template',
      content: 'legacy content',
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
        templateType: 'image-prompt-extraction',
      },
    })

    expect(result.success).toBe(false)
  })

  it('registers the new internal template ids and removes the legacy extractor id', () => {
    const loader = new StaticLoader()
    const templates = loader.loadTemplates()
    const templateIds = Object.values(ALL_TEMPLATES).map((template) => template.id)

    expect(templateIds).toContain('image-reference-spec-extraction')
    expect(templateIds).toContain('image-prompt-from-reference-spec')
    expect(templateIds).toContain('image-prompt-migration')
    expect(templateIds).not.toContain('image-prompt-extraction')

    expect(templates.all['image-reference-spec-extraction']).toBeDefined()
    expect(templates.all['image-prompt-from-reference-spec']).toBeDefined()
    expect(templates.all['image-prompt-migration']).toBeDefined()
    expect(templates.all['image-prompt-extraction']).toBeUndefined()
    expect(
      templates.byType['image-reference-spec-extraction'].zh['image-reference-spec-extraction'],
    ).toBeDefined()
    expect(
      templates.byType['image-prompt-composition'].zh['image-prompt-from-reference-spec'],
    ).toBeDefined()
    expect(templates.byType['image-prompt-migration'].zh['image-prompt-migration']).toBeDefined()
  })
})
