import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readWorkspaceSource = () =>
  readFileSync(
    resolve(process.cwd(), 'src/components/image-mode/ImageText2ImageWorkspace.vue'),
    'utf8',
  )

describe('reference image workspace theme guards', () => {
  it('uses the rebuilt reference-image dialog information architecture and removes legacy markup', () => {
    const source = readWorkspaceSource()

    expect(source).toMatch(/reference-dialog-source-row/)
    expect(source).toMatch(/reference-dialog-thumbnail/)
    expect(source).toMatch(/reference-dialog-current-prompt/)
    expect(source).toMatch(/reference-dialog-section/)
    expect(source).toMatch(/reference-dialog-results-grid/)
    expect(source).toMatch(/detectedCurrentPromptTitle/)
    expect(source).toMatch(/styleTransfer/)
    expect(source).toMatch(/replicateImage/)
    expect(source).toMatch(/grid-template-columns:\s*minmax\(0,\s*2fr\)\s*minmax\(0,\s*1fr\)/)
    expect(source).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*reference-dialog-results-grid[\s\S]*grid-template-columns:\s*1fr/)
    expect(source).toMatch(/reference-dialog-prompt-input/)
    expect(source).toMatch(/min-height:\s*220px/)
    expect(source).toMatch(/reference-dialog-variables-panel/)
    expect(source).toMatch(/max-height:\s*280px/)
    expect(source).toMatch(/width:\s*min\(880px,\s*calc\(100vw - 32px\)\)/)
    expect(source).not.toMatch(/showSyncVariablesAction/)
    expect(source).not.toMatch(/syncVariables/)
    expect(source).not.toMatch(/reextractVariables/)
    expect(source).not.toMatch(/generatedPromptPlaceholder/)
    expect(source).not.toMatch(/<NAlert/)
    expect(source).not.toMatch(/reference-undo-alert/)
    expect(source).not.toMatch(/reference-undo-banner/)
    expect(source).not.toMatch(/reference-dialog-preview-card/)
    expect(source).not.toMatch(/migrateToCurrentPrompt(?:Description)?/)
    expect(source).not.toMatch(/replicateOnly(?:Description)?/)
    expect(source).not.toMatch(/referenceImage\.detectedCurrentPrompt(?=['")},\s])/)
    expect(source).not.toMatch(/imageWorkspace\.referenceImage\.uploadFirst/)
    expect(source).not.toMatch(/rgba\(16,\s*185,\s*129,\s*0\.08\)/)
    expect(source).not.toMatch(/rgba\(0,\s*0,\s*0,\s*0\.04\)/)
  })
})
