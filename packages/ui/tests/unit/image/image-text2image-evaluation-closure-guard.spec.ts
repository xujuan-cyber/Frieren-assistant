import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readWorkspaceSource = () =>
  readFileSync(
    resolve(process.cwd(), 'src/components/image-mode/ImageText2ImageWorkspace.vue'),
    'utf8',
  )

describe('image text2image evaluation closure guard', () => {
  it('does not force prompt-only analysis and wires prompt apply-improvement', () => {
    const source = readWorkspaceSource()

    expect(source).not.toContain('evaluation-type-override="prompt-only"')
    expect(source).toContain('@apply-improvement="handleApplyImprovement"')
  })

  it('wires result and compare evaluation actions back into optimization', () => {
    const source = readWorkspaceSource()

    expect(source).toContain('@apply-improvement="handleApplyImprovement"')
    expect(source).toContain('@apply-patch="handleApplyLocalPatch"')
    expect(source).toContain(':can-rewrite-from-evaluation="true"')
    expect(source).toContain('@apply-local-patch="handleApplyLocalPatch"')
    expect(source).toContain('@rewrite-from-evaluation="handleRewriteFromEvaluation"')
  })

  it('adds an original-input analyze button and a virtual V0 analysis flow', () => {
    const source = readWorkspaceSource()

    expect(source).toContain('data-testid="image-text2image-analyze-button"')
    expect(source).toContain(':loading="isAnalyzing"')
    expect(source).toContain('@click="handleAnalyze"')
    expect(source).toContain("evaluation.clearResult('prompt-only')")
    expect(source).toContain("evaluation.clearResult('prompt-iterate')")
    expect(source).toContain("await handleEvaluateInternal('prompt-only')")
  })
})
