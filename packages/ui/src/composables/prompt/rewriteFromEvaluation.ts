import type {
  CompareConflictSignal,
  CompareStopSignals,
  EvaluationResponse,
  EvaluationType,
} from '@prompt-optimizer/core'
import {
  getCompareEvaluationMetadata,
  getCompareStopSignals,
  type CompareInsightRecord,
} from './compareResultMetadata'

export type RewriteLanguage = 'zh' | 'en'

const normalizeInlineText = (content: string | undefined): string =>
  (content || '').replace(/\s+/gu, ' ').trim()

const truncateInline = (value: string | undefined, maxLength = 140): string => {
  const normalized = normalizeInlineText(value)
  if (!normalized) return ''
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized
}

const collectUniqueLines = (
  values: Array<string | undefined>,
  options?: {
    limit?: number
    maxLength?: number
  },
): string[] => {
  const limit = options?.limit ?? 5
  const maxLength = options?.maxLength ?? 220
  const seen = new Set<string>()
  const lines: string[] = []

  for (const value of values) {
    const normalized = normalizeInlineText(value)
    if (!normalized) continue

    const dedupeKey = normalized.toLocaleLowerCase()
    if (seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    lines.push(truncateInline(normalized, maxLength))

    if (lines.length >= limit) {
      break
    }
  }

  return lines
}

const buildPatchPlanLines = (
  patchPlan: EvaluationResponse['patchPlan'],
): string[] =>
  (patchPlan || []).map((operation, index) => {
    const oldText = truncateInline(operation.oldText)
    const newText = truncateInline(operation.newText)
    const segments = [
      `${index + 1}. [${operation.op}] ${operation.instruction}`,
    ]

    if (oldText) {
      segments.push(`old="${oldText}"`)
    }
    if (newText) {
      segments.push(`new="${newText}"`)
    }

    return segments.join(' | ')
  })

const buildDimensionLines = (
  result: EvaluationResponse,
): string[] =>
  (result.score?.dimensions || []).map((dimension) =>
    `${dimension.label}: ${dimension.score}`
  )

const buildStopSignalLines = (
  stopSignals: CompareStopSignals | undefined,
): string[] => {
  if (!stopSignals) return []

  const lines: string[] = []

  if (stopSignals.targetVsBaseline) {
    lines.push(`targetVsBaseline=${stopSignals.targetVsBaseline}`)
  }
  if (stopSignals.targetVsReferenceGap) {
    lines.push(`targetVsReferenceGap=${stopSignals.targetVsReferenceGap}`)
  }
  if (stopSignals.improvementHeadroom) {
    lines.push(`improvementHeadroom=${stopSignals.improvementHeadroom}`)
  }
  if (stopSignals.overfitRisk) {
    lines.push(`overfitRisk=${stopSignals.overfitRisk}`)
  }
  if (stopSignals.stopRecommendation) {
    lines.push(`stopRecommendation=${stopSignals.stopRecommendation}`)
  }
  if (stopSignals.stopReasons?.length) {
    lines.push(`stopReasons=${stopSignals.stopReasons.join(' | ')}`)
  }

  return lines
}

const buildCompareFocusSummaryLines = (
  compareInsights: CompareInsightRecord | undefined,
  language: RewriteLanguage,
): string[] =>
  collectUniqueLines(
    [
      compareInsights?.progressSummary
        ? `${language === 'en' ? 'Progress' : '进步判断'}: ${compareInsights.progressSummary.pairLabel} | signal=${compareInsights.progressSummary.pairSignal} | verdict=${compareInsights.progressSummary.verdict} | confidence=${compareInsights.progressSummary.confidence} | ${compareInsights.progressSummary.analysis}`
        : undefined,
      compareInsights?.referenceGapSummary
        ? `${language === 'en' ? 'Reference Gap' : '参考差距'}: ${compareInsights.referenceGapSummary.pairLabel} | signal=${compareInsights.referenceGapSummary.pairSignal} | verdict=${compareInsights.referenceGapSummary.verdict} | confidence=${compareInsights.referenceGapSummary.confidence} | ${compareInsights.referenceGapSummary.analysis}`
        : undefined,
      compareInsights?.promptChangeSummary
        ? `${language === 'en' ? 'Prompt Change Validity' : '改动有效性'}: ${compareInsights.promptChangeSummary.pairLabel} | signal=${compareInsights.promptChangeSummary.pairSignal} | verdict=${compareInsights.promptChangeSummary.verdict} | confidence=${compareInsights.promptChangeSummary.confidence} | ${compareInsights.promptChangeSummary.analysis}`
        : undefined,
      compareInsights?.stabilitySummary
        ? `${language === 'en' ? 'Stability' : '稳定性'}: ${compareInsights.stabilitySummary.pairLabel} | signal=${compareInsights.stabilitySummary.pairSignal} | verdict=${compareInsights.stabilitySummary.verdict} | confidence=${compareInsights.stabilitySummary.confidence} | ${compareInsights.stabilitySummary.analysis}`
        : undefined,
    ],
    { limit: 4, maxLength: 260 }
  )

const buildCompareSupportLines = (
  compareInsights: CompareInsightRecord | undefined,
): string[] =>
  collectUniqueLines(
    [
      ...(compareInsights?.pairHighlights || []).map((
        highlight: CompareInsightRecord['pairHighlights'][number],
        index: number,
      ) =>
        `${index + 1}. ${highlight.pairLabel} | signal=${highlight.pairSignal} | verdict=${highlight.verdict} | confidence=${highlight.confidence} | ${highlight.analysis}`
      ),
      ...(compareInsights?.evidenceHighlights || []),
    ],
    { limit: 4, maxLength: 240 }
  )

const formatCompareConflictSignal = (
  signal: CompareConflictSignal,
  language: RewriteLanguage,
): string => {
  switch (signal) {
    case 'improvementNotSupportedOnReference':
      return language === 'en'
        ? 'The target improved over baseline, but the same prompt change is not supported on the reference side.'
        : 'Target 相比 baseline 有进步，但同一类 prompt 改动在 reference 侧并未得到支持。'
    case 'improvementUnstableAcrossReplicas':
      return language === 'en'
        ? 'The target improved in one comparison, but replica evidence suggests the gain may be unstable.'
        : 'Target 在单组比较里有进步，但 replica 证据提示该收益可能不稳定。'
    case 'regressionOutweighsCosmeticGains':
      return language === 'en'
        ? 'Regression against the baseline should outweigh cosmetic improvements elsewhere.'
        : '相对 baseline 的回退应优先于其他表面优化。'
    case 'sampleOverfitRiskVisible':
      return language === 'en'
        ? 'When reusable gains and sample-fitting gains coexist, prefer conservative conclusions and keep the overfit risk visible.'
        : '如果“可复用收益”和“样例贴合收益”并存，应优先采用保守结论，并保持过拟合风险可见。'
    default:
      return signal
  }
}

const buildCompareConflictLines = (
  compareInsights: CompareInsightRecord | undefined,
  language: RewriteLanguage,
): string[] =>
  collectUniqueLines(
    (compareInsights?.conflictSignals || []).map((signal) =>
      formatCompareConflictSignal(signal, language)
    ),
    { limit: 4, maxLength: 260 }
  )

const buildRewriteTargetLines = (
  result: EvaluationResponse,
  language: RewriteLanguage,
): string[] =>
  collectUniqueLines(
    [
      result.summary
        ? `${language === 'en' ? 'Overall' : '总评'}: ${result.summary}`
        : undefined,
      ...(result.improvements || []).map((line) =>
        `${language === 'en' ? 'Priority' : '优先项'}: ${line}`
      ),
    ],
    { limit: 6, maxLength: 240 }
  )

export const normalizeRewriteLocaleLanguage = (
  locale: string | undefined,
): RewriteLanguage => locale?.toLowerCase().startsWith('en') ? 'en' : 'zh'

export const buildRewriteFromEvaluationInput = (
  payload: { result: EvaluationResponse; type: EvaluationType },
  language: RewriteLanguage = 'zh',
): string => {
  const { result, type } = payload
  const metadata = getCompareEvaluationMetadata(result) || undefined
  const compareInsights = metadata?.compareInsights
  const stopSignals = (getCompareStopSignals(result) ?? undefined) as CompareStopSignals | undefined
  const scoreLines = buildDimensionLines(result)
  const rewriteTargetLines = buildRewriteTargetLines(result, language)
  const patchPlanLines = collectUniqueLines(buildPatchPlanLines(result.patchPlan), {
    limit: 4,
    maxLength: 260,
  })
  const focusSummaryLines = buildCompareFocusSummaryLines(compareInsights, language)
  const supportEvidenceLines = buildCompareSupportLines(compareInsights)
  const conflictLines = buildCompareConflictLines(compareInsights, language)
  const learnableSignalLines = collectUniqueLines(compareInsights?.learnableSignals || [], {
    limit: 5,
    maxLength: 220,
  })
  const overfitWarningLines = collectUniqueLines(compareInsights?.overfitWarnings || [], {
    limit: 5,
    maxLength: 220,
  })
  const stopSignalLines = collectUniqueLines(buildStopSignalLines(stopSignals), {
    limit: 6,
    maxLength: 220,
  })

  const typeLabel = language === 'en'
    ? {
        result: 'Single Result Evaluation',
        compare: 'Compare Evaluation',
        'prompt-only': 'Prompt Design Analysis',
        'prompt-iterate': 'Prompt Iterate Analysis',
      }[type]
    : {
        result: '单结果评估',
        compare: '对比评估',
        'prompt-only': '提示词分析',
        'prompt-iterate': '迭代分析',
      }[type]

  const sections: string[] = language === 'en'
    ? [
        'Rewrite the current workspace prompt into a full new version based only on the compressed evaluation below.',
        'Requirements:',
        '1. Preserve the original prompt\'s core objective, hard constraints, and required boundaries unless the evaluation clearly shows they are harmful.',
        '2. Prioritize reusable improvements that should generalize across different inputs.',
        '3. Do not add rules that only fit the current sample, current output details, or one-off artifacts.',
        '4. If a suggestion looks sample-specific, weaken it, generalize it, or discard it.',
        '5. Output only the rewritten full prompt without explanations.',
        '6. When compare-specific sections overlap, trust the focused findings and stop signals over lower-level evidence excerpts.',
        '',
        `Evaluation Type: ${typeLabel}`,
        `Overall Score: ${result.score?.overall ?? 'N/A'}`,
      ]
    : [
        '请只根据下面这份“已经过滤压缩后的评估结果”，把当前工作区提示词直接重写成一个完整的新版本。',
        '要求：',
        '1. 保留原提示词的核心目标、硬约束和必要边界，除非评估明确表明这些内容本身有问题。',
        '2. 优先吸收可复用、跨输入也应成立的改进，不要为了当前样例、当前输出细节或一次性现象过拟合。',
        '3. 如果某条建议明显依赖当前样例，应主动将其泛化、弱化或舍弃。',
        '4. 不要自行发明新的测试证据，只能基于下面这份压缩评估结论来改写。',
        '5. 只输出重写后的完整提示词，不要额外解释。',
        '6. 如果 compare 相关条目之间有重叠，优先相信聚合焦点结论和停止信号，再参考较底层的证据摘录。',
        '',
        `评估类型：${typeLabel}`,
        `总分：${result.score?.overall ?? 'N/A'}`,
      ]

  if (scoreLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Dimension Scores:' : '维度分数：',
      ...scoreLines.map((line) => `- ${line}`),
    )
  }

  if (rewriteTargetLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Core Rewrite Targets:' : '核心改写目标：',
      ...rewriteTargetLines.map((line) => `- ${line}`),
    )
  }

  if (patchPlanLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Patch Anchors:' : '修复锚点：',
      ...patchPlanLines.map((line) => `- ${line}`),
    )
  }

  if (focusSummaryLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Focused Compare Findings:' : '聚合焦点结论：',
      ...focusSummaryLines.map((line) => `- ${line}`),
    )
  }

  if (stopSignalLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Compare Decision Snapshot:' : '对比决策快照：',
      ...stopSignalLines.map((line) => `- ${line}`),
    )
  }

  if (conflictLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Conflict Checks:' : '冲突检查：',
      ...conflictLines.map((line) => `- ${line}`),
    )
  }

  if (learnableSignalLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Keep / Learn Signals:' : '保留 / 学习信号：',
      ...learnableSignalLines.map((line) => `- ${line}`),
    )
  }

  if (overfitWarningLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Signals To Filter Out:' : '需要过滤的信号：',
      ...overfitWarningLines.map((line) => `- ${line}`),
    )
  }

  if (supportEvidenceLines.length) {
    sections.push(
      '',
      language === 'en' ? 'Supporting Evidence Anchors:' : '辅助证据锚点：',
      ...supportEvidenceLines.map((line: string) => `- ${line}`),
    )
  }

  if (type === 'result') {
    sections.push(
      '',
      language === 'en'
        ? 'This evidence comes from a single execution snapshot. Fix stable prompt issues, but do not overreact to one-off output noise.'
        : '这份证据来自单次执行快照。请修复稳定的提示词问题，但不要对一次性输出噪声反应过度。'
    )
  }

  if (type === 'prompt-only' || type === 'prompt-iterate') {
    sections.push(
      '',
      language === 'en'
        ? 'This is design-only analysis without execution output. Improve clarity, structure, and robustness rather than assuming result quality issues.'
        : '这是一份不含执行输出的设计态分析。请优先提升目标清晰度、结构性和稳健性，不要虚构执行层问题。'
    )
  }

  if (type === 'compare') {
    sections.push(
      '',
      language === 'en'
        ? 'Trust the compare insights above as the already-compressed evidence source. Learn stable structure from stronger comparisons, but reject sample-fitting rules.'
        : '请把上面的对比洞察视为已经压缩后的可信证据来源。优先学习更强结果背后的稳定结构策略，同时拒绝样例拟合型规则。'
    )
  }

  return sections.join('\n').trim()
}
