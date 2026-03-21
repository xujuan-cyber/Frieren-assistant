import { describe, expect, it } from 'vitest'
import {
  buildTestPanelVersionOptions,
  formatTestPanelVersionSelectionLabel,
  getSelectablePreviousSavedVersionNumber,
  resolvePreviousSavedVersionNumber,
} from '../../../src/utils/testPanelVersion'

const labels = {
  workspace: 'Workspace',
  previous: 'Previous',
  original: 'Original',
}

describe('testPanelVersion', () => {
  it('resolves the selectable previous version as the saved version before head', () => {
    expect(getSelectablePreviousSavedVersionNumber([
      { version: 1 },
      { version: 2 },
      { version: 3 },
    ])).toBe(2)
  })

  it('falls back to original when resolving previous for a single saved version chain', () => {
    expect(resolvePreviousSavedVersionNumber([
      { version: 1 },
    ])).toBe(0)
  })

  it('builds version options with a dynamic previous alias ahead of fixed versions', () => {
    expect(buildTestPanelVersionOptions([
      { version: 1 },
      { version: 2 },
      { version: 3 },
    ], labels)).toEqual([
      { label: 'Workspace', fullLabel: 'Workspace', value: 'workspace' },
      { label: 'Previous', fullLabel: 'Previous (v2)', value: 'previous' },
      { label: 'Original', fullLabel: 'Original', value: 0 },
      { label: 'v1', fullLabel: 'v1', value: 1 },
      { label: 'v2', fullLabel: 'v2', value: 2 },
      { label: 'v3', fullLabel: 'v3', value: 3 },
    ])
  })

  it('formats previous labels using the resolved saved version', () => {
    expect(formatTestPanelVersionSelectionLabel('previous', 2, labels)).toBe('Previous (v2)')
    expect(formatTestPanelVersionSelectionLabel('previous', 0, labels)).toBe('Previous (Original)')
  })
})
