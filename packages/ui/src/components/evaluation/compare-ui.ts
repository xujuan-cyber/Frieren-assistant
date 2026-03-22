import type {
  EvaluationPromptRef,
  StructuredCompareRole,
} from '@prompt-optimizer/core'

export type CompareUiTranslator = (
  key: string,
  params?: Record<string, unknown>
) => string

export type CompareRoleUiEntry = {
  effectiveRole?: StructuredCompareRole
  roleSource?: 'auto' | 'manual'
  staleManualRole?: StructuredCompareRole
  workspaceChangedManualRole?: StructuredCompareRole
}

export type CompareRoleReasonCandidate<Id extends string = string> = {
  id: Id
  promptRef: EvaluationPromptRef
  promptText?: string
  modelKey?: string
}

export const PRIMARY_COMPARE_ROLES: StructuredCompareRole[] = [
  'target',
  'baseline',
  'reference',
  'replica',
]

export const SECONDARY_COMPARE_ROLES: StructuredCompareRole[] = [
  'referenceBaseline',
  'auxiliary',
]

const UNIQUE_COMPARE_ROLE_SET = new Set<StructuredCompareRole>([
  'target',
  'baseline',
  'reference',
  'referenceBaseline',
  'replica',
])

export const COMPARE_PAIR_PREVIEW_ORDER = [
  'targetBaseline',
  'targetReference',
  'referenceBaseline',
  'targetReplica',
] as const

type ComparePairPreviewKey = typeof COMPARE_PAIR_PREVIEW_ORDER[number]

const normalizeInlineText = (value: string | undefined): string =>
  (value || '').replace(/\s+/gu, ' ').trim()

const tOr = (
  t: CompareUiTranslator,
  key: string,
  fallback: string,
  params?: Record<string, unknown>
): string => {
  const translated = t(key, params)
  return translated === key ? fallback : translated
}

export const getCompareRoleLabel = (
  t: CompareUiTranslator,
  role: StructuredCompareRole
): string =>
  tOr(
    t,
    `evaluation.compareShared.roleValues.${role}`,
    {
      target: 'Optimization Target',
      baseline: 'Previous Version',
      reference: 'Teacher',
      referenceBaseline: 'Teacher Previous Version',
      replica: 'Retest',
      auxiliary: 'Other Test',
    }[role] || role
  )

export const getCompareRoleDescription = (
  t: CompareUiTranslator,
  role: StructuredCompareRole
): string =>
  tOr(
    t,
    `evaluation.compareShared.roleDescriptions.${role}`,
    {
      target:
        'This is the prompt you are actively optimizing and trying to improve.',
      baseline:
        'This is the previous version of the optimization target, used to judge whether the latest rewrite is a real improvement.',
      reference:
        'This is the teacher output worth learning from, usually from a stronger or more stable model.',
      referenceBaseline:
        'This is the previous version on the teacher side, used to verify whether the same prompt change also helps the teacher side.',
      replica:
        'This is a retest used to check whether the observed gain is stable instead of a one-off win on the current sample.',
      auxiliary:
        'This test can still appear in standard comparison, but it will not become a core smart-compare pair.',
    }[role]
  )

export const getCompareModeLabel = (
  t: CompareUiTranslator,
  mode: 'structured' | 'generic'
): string =>
  tOr(
    t,
    `evaluation.compareShared.modeValues.${mode}`,
    mode === 'structured' ? 'Smart Compare' : 'Standard Compare'
  )

export const getCompareRecommendationLabel = (
  t: CompareUiTranslator,
  recommendation: 'continue' | 'stop' | 'review'
): string =>
  tOr(
    t,
    `evaluation.compareShared.recommendationValues.${recommendation}`,
    {
      continue: 'Keep Iterating',
      stop: 'Stop for Now',
      review: 'Needs Review',
    }[recommendation]
  )

export const getCompareRoleTagType = (
  role?: StructuredCompareRole
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (role) {
    case 'target':
      return 'success'
    case 'reference':
      return 'info'
    case 'referenceBaseline':
      return 'warning'
    case 'replica':
      return 'info'
    default:
      return 'default'
  }
}

export const buildCompareToolbarStatus = (
  t: CompareUiTranslator,
  needsTargetSelection: boolean,
  needsManualReview: boolean
): { label: string; type: 'warning' | 'info' } | null => {
  if (needsTargetSelection) {
    return {
      label: tOr(
        t,
        'evaluation.compareShared.status.needTarget',
        'Please choose the optimization target first.'
      ),
      type: 'warning',
    }
  }

  if (needsManualReview) {
    return {
      label: tOr(
        t,
        'evaluation.compareShared.status.needReview',
        'Settings changed. Please confirm again.'
      ),
      type: 'warning',
    }
  }

  return null
}

export const buildCompareRoleAssignmentSummary = (
  t: CompareUiTranslator,
  role: StructuredCompareRole | undefined,
  source: 'auto' | 'manual' | undefined
): string => {
  if (!role) {
    return tOr(
      t,
      'evaluation.compareShared.assignment.unassigned',
      'No role has been assigned yet.'
    )
  }

  const roleLabel = getCompareRoleLabel(t, role)
  if (source === 'manual') {
    return tOr(
      t,
      'evaluation.compareShared.assignment.manual',
      'You selected: {role}',
      { role: roleLabel }
    )
  }

  return tOr(
    t,
    'evaluation.compareShared.assignment.auto',
    'System suggestion: {role}',
    { role: roleLabel }
  )
}

export const buildCompareRoleTooltipCopy = (
  t: CompareUiTranslator,
  entry: CompareRoleUiEntry
): {
  label: string
  description: string
  source: string
  warning: string | null
  action: string
} | null => {
  const unresolved =
    !entry.effectiveRole || entry.effectiveRole === 'auxiliary'

  const label = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.label',
        'Not Clear Yet'
      )
    : getCompareRoleLabel(t, entry.effectiveRole)

  const description = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.description',
        'This column is not clearly assigned to a core compare role yet.'
      )
    : getCompareRoleDescription(t, entry.effectiveRole)

  const source = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.source',
        'The system could not map this column to optimization target, previous version, teacher, or retest.'
      )
    : entry.roleSource === 'manual'
      ? tOr(
          t,
          'evaluation.compareShared.roleSource.manual',
          'You manually confirmed this role.'
        )
      : tOr(
          t,
          'evaluation.compareShared.roleSource.auto',
          'This role is suggested automatically by the system.'
        )

  const warning = entry.workspaceChangedManualRole
    ? tOr(
        t,
        'evaluation.compareShared.review.workspaceChanged',
        'The workspace content changed after this role was confirmed. Please review it again.'
      )
    : null

  const action = tOr(
    t,
    'evaluation.compareShared.roleAction',
    'Click this tag to update the comparison role.'
  )

  return {
    label,
    description,
    source,
    warning,
    action,
  }
}

export const isUniqueCompareRole = (
  role: StructuredCompareRole | undefined,
): boolean => !!role && UNIQUE_COMPARE_ROLE_SET.has(role)

export const applyCompareManualRoleSelection = <Id extends string = string>(
  selectedRoles: Partial<Record<Id, StructuredCompareRole>>,
  params: {
    entryId: Id
    nextRole?: StructuredCompareRole
    suggestedRole?: StructuredCompareRole
  }
): Partial<Record<Id, StructuredCompareRole>> => {
  const nextSelectedRoles = { ...selectedRoles }

  if (isUniqueCompareRole(params.nextRole)) {
    Object.entries(nextSelectedRoles).forEach(([snapshotId, role]) => {
      if (
        snapshotId !== params.entryId &&
        role === params.nextRole
      ) {
        delete nextSelectedRoles[snapshotId as Id]
      }
    })
  }

  if (!params.nextRole || params.nextRole === params.suggestedRole) {
    delete nextSelectedRoles[params.entryId]
    return nextSelectedRoles
  }

  nextSelectedRoles[params.entryId] = params.nextRole
  return nextSelectedRoles
}

export const buildComparePairPreviewEntries = (
  t: CompareUiTranslator,
  enabledPairs: Iterable<ComparePairPreviewKey>,
): Array<{
  key: ComparePairPreviewKey
  enabled: boolean
  label: string
}> => {
  const enabledPairSet = new Set(enabledPairs)

  return COMPARE_PAIR_PREVIEW_ORDER.map((pairKey) => ({
    key: pairKey,
    enabled: enabledPairSet.has(pairKey),
    label: tOr(
      t,
      `evaluation.compareConfig.pairValues.${pairKey}`,
      pairKey,
    ),
  }))
}

export const buildCompareRoleSuggestionReason = (
  t: CompareUiTranslator,
  params: {
    candidate: CompareRoleReasonCandidate
    suggestedRole?: StructuredCompareRole
    candidates: CompareRoleReasonCandidate[]
    snapshotRoles: Record<string, StructuredCompareRole | undefined>
  }
): string => {
  const { candidate, suggestedRole, candidates, snapshotRoles } = params
  const workspaceCandidates = candidates.filter(
    (entry) => entry.promptRef.kind === 'workspace',
  )

  const findCandidateByRole = (
    role: StructuredCompareRole,
  ): CompareRoleReasonCandidate | undefined =>
    candidates.find((entry) => snapshotRoles[entry.id] === role)

  const targetCandidate = findCandidateByRole('target')
  const referenceCandidate = findCandidateByRole('reference')
  const normalizedCandidatePrompt = normalizeInlineText(candidate.promptText)
  const normalizedTargetPrompt = normalizeInlineText(targetCandidate?.promptText)
  const normalizedReferencePrompt = normalizeInlineText(referenceCandidate?.promptText)
  const normalizedCandidateModel = (candidate.modelKey || '').trim()
  const normalizedTargetModel = (targetCandidate?.modelKey || '').trim()
  const normalizedReferenceModel = (referenceCandidate?.modelKey || '').trim()

  switch (suggestedRole) {
    case 'target':
      if (candidate.promptRef.kind === 'workspace' && workspaceCandidates.length === 1) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.target.uniqueWorkspace',
          '这是当前唯一的工作区，所以建议作为优化目标。'
        )
      }

      return tOr(
        t,
        'evaluation.compareConfig.suggestionReasons.target.workspace',
        '这是当前工作区列，所以建议作为优化目标。'
      )
    case 'baseline':
      if (candidate.promptRef.dynamicAlias === 'previous') {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.baseline.dynamicPrevious',
          '这是当前工作区的上一版，所以建议作为上一版。'
        )
      }

      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedTargetModel &&
        normalizedCandidatePrompt !== normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.baseline.sameModelDifferentPrompt',
          '它与优化目标模型相同、提示词不同，所以建议作为上一版。'
        )
      }

      break
    case 'reference':
      if (
        normalizedCandidateModel &&
        normalizedCandidateModel !== normalizedTargetModel &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.reference.samePromptDifferentModel',
          '这是不同模型的工作区结果，所以建议作为教师。'
        )
      }

      if (normalizedCandidateModel && normalizedCandidateModel !== normalizedTargetModel) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.reference.differentModel',
          '它与优化目标使用不同模型，所以建议作为教师。'
        )
      }

      break
    case 'referenceBaseline':
      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedReferenceModel &&
        normalizedCandidatePrompt !== normalizedReferencePrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.referenceBaseline.sameModelDifferentPrompt',
          '它与教师模型相同、提示词不同，所以建议作为教师的上一版。'
        )
      }

      break
    case 'replica':
      if (
        candidate.promptRef.dynamicAlias === 'previous' &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.replica.previousMatchesWorkspace',
          '它和工作区当前内容相同，所以建议按复测处理。'
        )
      }

      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedTargetModel &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.replica.samePromptAsTarget',
          '它与优化目标使用相同提示词，所以建议作为复测。'
        )
      }

      break
    case 'auxiliary':
      return tOr(
        t,
        'evaluation.compareConfig.suggestionReasons.auxiliary.default',
        '这列不会进入核心逐组比较，所以保留为其他测试。'
      )
  }

  return tOr(
    t,
    'evaluation.compareConfig.suggestionReasons.default',
    '系统根据当前版本、模型和提示词关系给出这个建议。'
  )
}
