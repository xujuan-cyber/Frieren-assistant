export type DynamicTestPanelVersionValue = 'workspace' | 'previous' | 0 | number

export interface TestPanelVersionEntryLike {
  version?: number | null
}

export interface TestPanelVersionLabels {
  workspace: string
  previous: string
  original: string
}

export interface TestPanelVersionOption {
  label: string
  fullLabel: string
  value: DynamicTestPanelVersionValue
}

export const getSortedSavedVersionNumbers = (
  versions: TestPanelVersionEntryLike[] | null | undefined,
): number[] =>
  (versions || [])
    .map((entry) => entry.version)
    .filter((version): version is number =>
      typeof version === 'number' && Number.isFinite(version) && version >= 1
    )
    .slice()
    .sort((left, right) => left - right)

export const getSelectablePreviousSavedVersionNumber = (
  versions: TestPanelVersionEntryLike[] | null | undefined,
): number | null => {
  const sortedVersions = getSortedSavedVersionNumbers(versions)
  return sortedVersions.length >= 2 ? sortedVersions[sortedVersions.length - 2] : null
}

export const resolvePreviousSavedVersionNumber = (
  versions: TestPanelVersionEntryLike[] | null | undefined,
): number | null => {
  const sortedVersions = getSortedSavedVersionNumbers(versions)
  if (sortedVersions.length >= 2) {
    return sortedVersions[sortedVersions.length - 2]
  }
  if (sortedVersions.length === 1) {
    return 0
  }
  return null
}

export const coerceTestPanelVersionValue = (
  value: unknown,
): DynamicTestPanelVersionValue | null => {
  if (value === 'workspace' || value === 'latest') return 'workspace'
  if (value === 'previous') return 'previous'
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return null
}

export const formatPreviousVersionLabel = (
  resolvedVersion: number | null | undefined,
  labels: Pick<TestPanelVersionLabels, 'previous' | 'original'>,
): string => {
  if (resolvedVersion === 0) {
    return `${labels.previous} (${labels.original})`
  }
  if (typeof resolvedVersion === 'number' && resolvedVersion >= 1) {
    return `${labels.previous} (v${resolvedVersion})`
  }
  return labels.previous
}

export const formatTestPanelVersionSelectionLabel = (
  selection: DynamicTestPanelVersionValue,
  resolvedVersion: number,
  labels: TestPanelVersionLabels,
): string => {
  if (selection === 'workspace') return labels.workspace
  if (selection === 'previous') {
    return formatPreviousVersionLabel(resolvedVersion >= 0 ? resolvedVersion : null, labels)
  }
  if (resolvedVersion === 0) return labels.original
  return `v${resolvedVersion}`
}

export const buildTestPanelVersionOptions = (
  versions: TestPanelVersionEntryLike[] | null | undefined,
  labels: TestPanelVersionLabels,
): TestPanelVersionOption[] => {
  const sortedVersions = getSortedSavedVersionNumbers(versions)
  const previousVersion = getSelectablePreviousSavedVersionNumber(versions)

  return [
    {
      label: labels.workspace,
      fullLabel: labels.workspace,
      value: 'workspace',
    },
    ...(previousVersion != null
      ? [{
          label: labels.previous,
          fullLabel: formatPreviousVersionLabel(previousVersion, labels),
          value: 'previous' as const,
        }]
      : []),
    {
      label: labels.original,
      fullLabel: labels.original,
      value: 0,
    },
    ...sortedVersions.map((version) => ({
      label: `v${version}`,
      fullLabel: `v${version}`,
      value: version,
    })),
  ]
}
