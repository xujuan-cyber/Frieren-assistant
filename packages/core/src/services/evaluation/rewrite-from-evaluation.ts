import { TemplateProcessor } from '../template/processor';
import type { TemplateContext } from '../template/processor';
import type {
  CompareConflictSignal,
  CompareInsights,
  CompareStopSignals,
  EvaluationModeConfig,
  EvaluationResponse,
  EvaluationType,
} from './types';
import { template as evaluationRewriteBasicSystemTemplate } from '../template/default-templates/evaluation-rewrite/basic-system';
import { template as evaluationRewriteBasicSystemTemplateEn } from '../template/default-templates/evaluation-rewrite/basic-system_en';
import { template as evaluationRewriteBasicUserTemplate } from '../template/default-templates/evaluation-rewrite/basic-user';
import { template as evaluationRewriteBasicUserTemplateEn } from '../template/default-templates/evaluation-rewrite/basic-user_en';
import { template as evaluationRewriteProMultiTemplate } from '../template/default-templates/evaluation-rewrite/pro-multi';
import { template as evaluationRewriteProMultiTemplateEn } from '../template/default-templates/evaluation-rewrite/pro-multi_en';
import { template as evaluationRewriteProVariableTemplate } from '../template/default-templates/evaluation-rewrite/pro-variable';
import { template as evaluationRewriteProVariableTemplateEn } from '../template/default-templates/evaluation-rewrite/pro-variable_en';
import { template as evaluationRewriteGenericTemplate } from '../template/default-templates/evaluation-rewrite/generic';
import { template as evaluationRewriteGenericTemplateEn } from '../template/default-templates/evaluation-rewrite/generic_en';

export type RewriteLanguage = 'zh' | 'en';
export type RewriteRecommendation = 'skip' | 'minor-rewrite' | 'rewrite';
export type RewriteFocusArea =
  | 'contract-repair'
  | 'generalization'
  | 'decision-stability';

export interface EvaluationRewriteLine {
  text: string;
}

export interface EvaluationRewritePromptParams {
  result: EvaluationResponse;
  type: EvaluationType;
  mode: EvaluationModeConfig;
  language?: RewriteLanguage;
  workspacePrompt?: string;
  referencePrompt?: string;
}

export interface EvaluationRewriteContext extends TemplateContext {
  language: RewriteLanguage;
  subjectLabel: string;
  evaluationTypeLabel: string;
  overallScore: string | number;
  rewritePayloadJson: string;
  hasWorkspacePrompt: boolean;
  workspacePrompt: string;
  hasReferencePrompt: boolean;
  referencePrompt: string;
  hasDimensionScoreLines: boolean;
  dimensionScoreLines: EvaluationRewriteLine[];
  hasRewriteTargetLines: boolean;
  rewriteTargetLines: EvaluationRewriteLine[];
  hasPatchPlanLines: boolean;
  patchPlanLines: EvaluationRewriteLine[];
  hasFocusSummaryLines: boolean;
  focusSummaryLines: EvaluationRewriteLine[];
  hasStopSignalLines: boolean;
  stopSignalLines: EvaluationRewriteLine[];
  hasConflictLines: boolean;
  conflictLines: EvaluationRewriteLine[];
  hasLearnableSignalLines: boolean;
  learnableSignalLines: EvaluationRewriteLine[];
  hasOverfitWarningLines: boolean;
  overfitWarningLines: EvaluationRewriteLine[];
  hasSupportEvidenceLines: boolean;
  supportEvidenceLines: EvaluationRewriteLine[];
  isCompareEvaluation: boolean;
  isResultEvaluation: boolean;
  isPromptOnlyEvaluation: boolean;
  isPromptIterateEvaluation: boolean;
}

export interface EvaluationRewritePayload {
  scenario: {
    language: RewriteLanguage;
    evaluationType: EvaluationType;
    evaluationTypeLabel: string;
    subjectLabel: string;
    mode: EvaluationModeConfig;
    overallScore: string | number;
  };
  sourcePrompts: {
    workspacePrompt?: string;
    referencePrompt?: string;
  };
  compressedEvaluation: {
    summary: string;
    dimensionScores: Array<{
      key: string;
      label: string;
      score: number;
    }>;
    improvements: string[];
    patchPlan: EvaluationResponse['patchPlan'];
    compareStopSignals?: CompareStopSignals;
    compareInsights?: CompareInsights;
    rewriteGuidance: {
      recommendation: RewriteRecommendation;
      reasons: string[];
      focusAreas: RewriteFocusArea[];
      priorityMoves: string[];
    };
    focusSummaryLines: string[];
    conflictLines: string[];
    learnableSignalLines: string[];
    overfitWarningLines: string[];
    supportEvidenceLines: string[];
  };
}

const buildRewriteGuidance = (
  params: EvaluationRewritePromptParams,
): EvaluationRewritePayload['compressedEvaluation']['rewriteGuidance'] => {
  const language = params.language || 'zh';
  const stopSignals = params.result.metadata?.compareStopSignals;
  const compareInsights = params.result.metadata?.compareInsights;
  const conflictSignals = new Set(compareInsights?.conflictSignals || []);
  const reasons: string[] = [];
  const focusAreas = new Set<RewriteFocusArea>();
  const priorityMoves: string[] = [];

  if (params.type !== 'compare') {
    return {
      recommendation: 'rewrite',
      reasons: [
        language === 'en'
          ? 'This is not a compare evaluation, so the rewrite flow should apply the evaluation evidence normally.'
          : '当前不是对比评估结果，应按评估证据正常执行改写。',
      ],
      focusAreas: [],
      priorityMoves: [],
    };
  }

  if (!params.workspacePrompt?.trim()) {
    return {
      recommendation: 'rewrite',
      reasons: [
        language === 'en'
          ? 'No workspace prompt snapshot is available, so the rewrite flow cannot safely short-circuit.'
          : '缺少当前工作区提示词快照，无法安全短路为 no-op。',
      ],
      focusAreas: [],
      priorityMoves: [],
    };
  }

  if (stopSignals?.stopRecommendation === 'stop') {
    reasons.push(
      language === 'en'
        ? 'Compare already recommends stopping, so the safest action is to keep the current workspace prompt unchanged.'
        : '对比评估已经建议停止优化，最保守的动作就是保持当前工作区提示词不变。'
    );

    return {
      recommendation: 'skip',
      reasons,
      focusAreas: [],
      priorityMoves: [],
    };
  }

  const hasRegressionConflict = conflictSignals.has('regressionOutweighsCosmeticGains');
  const hasUnsupportedImprovementConflict = conflictSignals.has('improvementNotSupportedOnReference');
  const hasInstabilityConflict = conflictSignals.has('improvementUnstableAcrossReplicas');
  const hasOverfitRisk =
    stopSignals?.overfitRisk === 'medium' ||
    stopSignals?.overfitRisk === 'high' ||
    conflictSignals.has('sampleOverfitRiskVisible');

  if (hasRegressionConflict || hasUnsupportedImprovementConflict) {
    focusAreas.add('contract-repair');
    priorityMoves.push(
      language === 'en'
        ? 'Repair regressions first: preserve the stable schema, field names, output contract, and protocol boundaries before adding nicer wording.'
        : '先修复回退：优先恢复稳定的 schema、字段名、输出 contract 与协议边界，再考虑更好看的表达。'
    );
  }

  if (hasOverfitRisk) {
    focusAreas.add('generalization');
    priorityMoves.push(
      language === 'en'
        ? 'Remove or weaken sample-specific trigger rules. Prefer reusable principles that should still hold on different inputs.'
        : '删除或弱化样例触发式规则，优先改写成跨输入也应成立的通用原则。'
    );
  }

  if (hasInstabilityConflict) {
    focusAreas.add('decision-stability');
    priorityMoves.push(
      language === 'en'
        ? 'Add explicit decision criteria for core verdict fields, so the model does not change its conclusion across replicas when the evidence is similar.'
        : '为核心结论字段补上显式判定标准，避免证据相近时在不同执行里得出不同结论。'
    );
    priorityMoves.push(
      language === 'en'
        ? 'Add a tie-break or conservative fallback rule for mixed or underspecified evidence, instead of leaving the final recommendation implicit.'
        : '为证据混合或不足的情况补上 tie-break / 保守默认规则，不要把最终结论留给模型自由发挥。'
    );
    priorityMoves.push(
      language === 'en'
        ? 'Separate formatting requirements from decision logic: keep the JSON contract, but prioritize stabilizing recommendation logic over cosmetic wording.'
        : '把格式要求和决策逻辑分开写：保留 JSON contract，但优先稳定 recommendation 的判定逻辑，而不是只修表面措辞。'
    );
  }

  const isFlatAndClosedGap =
    stopSignals?.targetVsBaseline === 'flat' &&
    stopSignals?.targetVsReferenceGap === 'none' &&
    stopSignals?.improvementHeadroom !== 'high' &&
    !hasRegressionConflict &&
    !hasUnsupportedImprovementConflict &&
    !hasInstabilityConflict;

  if (isFlatAndClosedGap) {
    reasons.push(
      language === 'en'
        ? 'Target vs baseline is flat and the reference gap is already closed, so a rewrite is more likely to create noise than value.'
        : '当前版本相对 baseline 为 flat，且与 reference 的差距已经闭合，再改写更可能引入噪音而不是带来真实收益。'
    );

    if (stopSignals?.overfitRisk === 'medium' || stopSignals?.overfitRisk === 'high') {
      reasons.push(
        language === 'en'
          ? 'Keep the current prompt unchanged unless later evidence shows a real generalization issue.'
          : '即使存在一定过拟合担忧，也应先保持当前 prompt 不变，等待后续更强证据再改。'
      );
    }

    return {
      recommendation: 'skip',
      reasons,
      focusAreas: Array.from(focusAreas),
      priorityMoves: Array.from(new Set(priorityMoves)),
    };
  }

  const isNearDoneButNotStop =
    (stopSignals?.targetVsBaseline === 'improved' || stopSignals?.targetVsBaseline === 'flat') &&
    stopSignals?.targetVsReferenceGap === 'none' &&
    stopSignals?.improvementHeadroom === 'low' &&
    !hasRegressionConflict &&
    !hasUnsupportedImprovementConflict &&
    !hasInstabilityConflict;

  if (isNearDoneButNotStop) {
    reasons.push(
      language === 'en'
        ? 'Most of the useful gain is already present, so only minimal, contract-preserving edits are justified.'
        : '当前主要收益已经基本到位，只适合做最小、保守、保持 contract 的微调。'
    );

    if (stopSignals?.overfitRisk === 'medium' || conflictSignals.has('sampleOverfitRiskVisible')) {
      reasons.push(
        language === 'en'
          ? 'If you touch the prompt at all, focus on small generalization-oriented wording repairs rather than a broad rewrite.'
          : '如果还要改，只能做轻量泛化修补，不能再做大幅重写。'
      );
    }

    return {
      recommendation: 'minor-rewrite',
      reasons,
      focusAreas: Array.from(focusAreas),
      priorityMoves: Array.from(new Set(priorityMoves)),
    };
  }

  reasons.push(
    language === 'en'
      ? 'There is still meaningful improvement headroom or unresolved risk, so a substantive rewrite remains justified.'
      : '当前仍存在明确改进空间或未解决风险，继续做实质性改写仍然有必要。'
  );

  if (hasRegressionConflict) {
    reasons.push(
      language === 'en'
        ? 'Regression against the baseline must be repaired before pursuing cosmetic gains.'
        : '需要先修复相对 baseline 的回退，再谈其他表层优化。'
    );
  }

  if (hasUnsupportedImprovementConflict) {
    reasons.push(
      language === 'en'
        ? 'The current prompt change is not supported on the reference side, so the rewrite should actively repair unsupported drift.'
        : '当前改动在 reference 侧不被支持，改写时应主动修复这种不被支持的漂移。'
    );
  }

  if (hasInstabilityConflict) {
    reasons.push(
      language === 'en'
        ? 'Replica evidence shows instability, so the rewrite should target decision stability rather than superficial formatting.'
        : 'replica 证据显示当前行为不稳定，改写时应优先修复决策稳定性，而不是只修表面格式。'
    );
  }

  return {
    recommendation: 'rewrite',
    reasons,
    focusAreas: Array.from(focusAreas),
    priorityMoves: Array.from(new Set(priorityMoves)),
  };
};

const normalizeInlineText = (content: string | undefined): string =>
  (content || '').replace(/\s+/gu, ' ').trim();

const truncateInline = (value: string | undefined, maxLength = 140): string => {
  const normalized = normalizeInlineText(value);
  if (!normalized) return '';

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
};

const collectUniqueLines = (
  values: Array<string | undefined>,
  options?: {
    limit?: number;
    maxLength?: number;
  },
): string[] => {
  const limit = options?.limit ?? 5;
  const maxLength = options?.maxLength ?? 220;
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const value of values) {
    const normalized = normalizeInlineText(value);
    if (!normalized) continue;

    const dedupeKey = normalized.toLocaleLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    lines.push(truncateInline(normalized, maxLength));

    if (lines.length >= limit) {
      break;
    }
  }

  return lines;
};

const buildPatchPlanLines = (
  patchPlan: EvaluationResponse['patchPlan'],
): string[] =>
  (patchPlan || []).map((operation, index) => {
    const oldText = truncateInline(operation.oldText);
    const newText = truncateInline(operation.newText);
    const segments = [
      `${index + 1}. [${operation.op}] ${operation.instruction}`,
    ];

    if (oldText) {
      segments.push(`old="${oldText}"`);
    }
    if (newText) {
      segments.push(`new="${newText}"`);
    }

    return segments.join(' | ');
  });

const buildDimensionLines = (
  result: EvaluationResponse,
): string[] =>
  (result.score?.dimensions || []).map((dimension) =>
    `${dimension.label}: ${dimension.score}`
  );

const buildStopSignalLines = (
  stopSignals: CompareStopSignals | undefined,
): string[] => {
  if (!stopSignals) return [];

  const lines: string[] = [];

  if (stopSignals.targetVsBaseline) {
    lines.push(`targetVsBaseline=${stopSignals.targetVsBaseline}`);
  }
  if (stopSignals.targetVsReferenceGap) {
    lines.push(`targetVsReferenceGap=${stopSignals.targetVsReferenceGap}`);
  }
  if (stopSignals.improvementHeadroom) {
    lines.push(`improvementHeadroom=${stopSignals.improvementHeadroom}`);
  }
  if (stopSignals.overfitRisk) {
    lines.push(`overfitRisk=${stopSignals.overfitRisk}`);
  }
  if (stopSignals.stopRecommendation) {
    lines.push(`stopRecommendation=${stopSignals.stopRecommendation}`);
  }
  if (stopSignals.stopReasons?.length) {
    lines.push(`stopReasons=${stopSignals.stopReasons.join(' | ')}`);
  }

  return lines;
};

const formatCompareConflictSignal = (
  signal: CompareConflictSignal,
  language: RewriteLanguage,
): string => {
  switch (signal) {
    case 'improvementNotSupportedOnReference':
      return language === 'en'
        ? 'The target improved over baseline, but the same prompt change is not supported on the reference side.'
        : 'Target 相比 baseline 有进步，但同一类 prompt 改动在 reference 侧并未得到支持。';
    case 'improvementUnstableAcrossReplicas':
      return language === 'en'
        ? 'The target improved in one comparison, but replica evidence suggests the gain may be unstable.'
        : 'Target 在单组比较里有进步，但 replica 证据提示该收益可能不稳定。';
    case 'regressionOutweighsCosmeticGains':
      return language === 'en'
        ? 'Regression against the baseline should outweigh cosmetic improvements elsewhere.'
        : '相对 baseline 的回退应优先于其他表面优化。';
    case 'sampleOverfitRiskVisible':
      return language === 'en'
        ? 'When reusable gains and sample-fitting gains coexist, prefer conservative conclusions and keep the overfit risk visible.'
        : '如果“可复用收益”和“样例贴合收益”并存，应优先采用保守结论，并保持过拟合风险可见。';
    default:
      return signal;
  }
};

const buildCompareFocusSummaryLines = (
  compareInsights: CompareInsights | undefined,
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
  );

const buildCompareSupportLines = (
  compareInsights: CompareInsights | undefined,
): string[] =>
  collectUniqueLines(
    [
      ...(compareInsights?.pairHighlights || []).map((highlight, index) =>
        `${index + 1}. ${highlight.pairLabel} | signal=${highlight.pairSignal} | verdict=${highlight.verdict} | confidence=${highlight.confidence} | ${highlight.analysis}`
      ),
      ...(compareInsights?.evidenceHighlights || []),
    ],
    { limit: 4, maxLength: 240 }
  );

const buildCompareConflictLines = (
  compareInsights: CompareInsights | undefined,
  language: RewriteLanguage,
): string[] =>
  collectUniqueLines(
    (compareInsights?.conflictSignals || []).map((signal) =>
      formatCompareConflictSignal(signal, language)
    ),
    { limit: 4, maxLength: 260 }
  );

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
  );

const toTemplateLines = (values: string[]): EvaluationRewriteLine[] =>
  values.map((text) => ({ text }));

const resolveSubjectLabel = (
  mode: EvaluationModeConfig,
  language: RewriteLanguage,
): string => {
  const subjectLabelsZh: Record<string, string> = {
    'basic:system': '系统提示词',
    'basic:user': '用户提示词',
    'pro:multi': '多消息 system 提示词',
    'pro:variable': '变量用户提示词',
    'image:text2image': '文生图提示词',
    'image:image2image': '图生图提示词',
  };

  const subjectLabelsEn: Record<string, string> = {
    'basic:system': 'system prompt',
    'basic:user': 'user prompt',
    'pro:multi': 'multi-message system prompt',
    'pro:variable': 'variable user prompt',
    'image:text2image': 'text-to-image prompt',
    'image:image2image': 'image-to-image prompt',
  };

  const key = `${mode.functionMode}:${mode.subMode}`;
  const labels = language === 'en' ? subjectLabelsEn : subjectLabelsZh;

  return labels[key] || (language === 'en' ? 'workspace prompt' : '工作区提示词');
};

const resolveEvaluationTypeLabel = (
  type: EvaluationType,
  language: RewriteLanguage,
): string | undefined => {
  const labels = language === 'en'
    ? {
        result: 'Single Result Evaluation',
        compare: 'Compare Evaluation',
        'prompt-only': 'Prompt Design Analysis',
        'prompt-iterate': 'Prompt Iterate Analysis',
      }
    : {
        result: '单结果评估',
        compare: '对比评估',
        'prompt-only': '提示词分析',
        'prompt-iterate': '迭代分析',
      };

  return labels[type];
};

const resolveRewriteTemplate = (
  mode: EvaluationModeConfig,
  language: RewriteLanguage,
) => {
  const isEnglish = language === 'en';

  if (mode.functionMode === 'basic' && mode.subMode === 'system') {
    return isEnglish ? evaluationRewriteBasicSystemTemplateEn : evaluationRewriteBasicSystemTemplate;
  }

  if (mode.functionMode === 'basic' && mode.subMode === 'user') {
    return isEnglish ? evaluationRewriteBasicUserTemplateEn : evaluationRewriteBasicUserTemplate;
  }

  if (mode.functionMode === 'pro' && mode.subMode === 'multi') {
    return isEnglish ? evaluationRewriteProMultiTemplateEn : evaluationRewriteProMultiTemplate;
  }

  if (mode.functionMode === 'pro' && mode.subMode === 'variable') {
    return isEnglish ? evaluationRewriteProVariableTemplateEn : evaluationRewriteProVariableTemplate;
  }

  return isEnglish ? evaluationRewriteGenericTemplateEn : evaluationRewriteGenericTemplate;
};

export const normalizeRewriteLocaleLanguage = (
  locale: string | undefined,
): RewriteLanguage => locale?.toLowerCase().startsWith('en') ? 'en' : 'zh';

export const buildRewriteFromEvaluationContext = (
  params: EvaluationRewritePromptParams,
): EvaluationRewriteContext => {
  const language = params.language || 'zh';
  const { result, type, mode } = params;
  const metadata = result.metadata;
  const compareInsights = metadata?.compareInsights;
  const stopSignals = metadata?.compareStopSignals;
  const dimensionScoreLines = toTemplateLines(buildDimensionLines(result));
  const rewriteTargetLines = toTemplateLines(buildRewriteTargetLines(result, language));
  const patchPlanLines = toTemplateLines(
    collectUniqueLines(buildPatchPlanLines(result.patchPlan), {
      limit: 4,
      maxLength: 260,
    })
  );
  const focusSummaryLines = toTemplateLines(
    buildCompareFocusSummaryLines(compareInsights, language)
  );
  const stopSignalLines = toTemplateLines(
    collectUniqueLines(buildStopSignalLines(stopSignals), {
      limit: 6,
      maxLength: 220,
    })
  );
  const conflictLines = toTemplateLines(
    buildCompareConflictLines(compareInsights, language)
  );
  const learnableSignalLines = toTemplateLines(
    collectUniqueLines(compareInsights?.learnableSignals || [], {
      limit: 5,
      maxLength: 220,
    })
  );
  const overfitWarningLines = toTemplateLines(
    collectUniqueLines(compareInsights?.overfitWarnings || [], {
      limit: 5,
      maxLength: 220,
    })
  );
  const supportEvidenceLines = toTemplateLines(
    buildCompareSupportLines(compareInsights)
  );
  const rewritePayload = buildRewritePayload(params);

  return {
    language,
    subjectLabel: resolveSubjectLabel(mode, language),
    evaluationTypeLabel: resolveEvaluationTypeLabel(type, language) || type,
    overallScore: result.score?.overall ?? 'N/A',
    rewritePayloadJson: JSON.stringify(rewritePayload, null, 2),
    hasWorkspacePrompt: !!params.workspacePrompt?.trim(),
    workspacePrompt: params.workspacePrompt?.trim() || '',
    hasReferencePrompt: !!params.referencePrompt?.trim(),
    referencePrompt: params.referencePrompt?.trim() || '',
    hasDimensionScoreLines: dimensionScoreLines.length > 0,
    dimensionScoreLines,
    hasRewriteTargetLines: rewriteTargetLines.length > 0,
    rewriteTargetLines,
    hasPatchPlanLines: patchPlanLines.length > 0,
    patchPlanLines,
    hasFocusSummaryLines: focusSummaryLines.length > 0,
    focusSummaryLines,
    hasStopSignalLines: stopSignalLines.length > 0,
    stopSignalLines,
    hasConflictLines: conflictLines.length > 0,
    conflictLines,
    hasLearnableSignalLines: learnableSignalLines.length > 0,
    learnableSignalLines,
    hasOverfitWarningLines: overfitWarningLines.length > 0,
    overfitWarningLines,
    hasSupportEvidenceLines: supportEvidenceLines.length > 0,
    supportEvidenceLines,
    isCompareEvaluation: type === 'compare',
    isResultEvaluation: type === 'result',
    isPromptOnlyEvaluation: type === 'prompt-only',
    isPromptIterateEvaluation: type === 'prompt-iterate',
  };
};

export const buildRewritePayload = (
  params: EvaluationRewritePromptParams,
): EvaluationRewritePayload => {
  const language = params.language || 'zh';
  const { result, type, mode } = params;
  const evaluationTypeLabel = resolveEvaluationTypeLabel(type, language) || type;
  const subjectLabel = resolveSubjectLabel(mode, language);
  const compareInsights = result.metadata?.compareInsights;
  const stopSignals = result.metadata?.compareStopSignals;
  const rewriteGuidance = buildRewriteGuidance(params);

  return {
    scenario: {
      language,
      evaluationType: type,
      evaluationTypeLabel,
      subjectLabel,
      mode,
      overallScore: result.score?.overall ?? 'N/A',
    },
    sourcePrompts: {
      ...(params.workspacePrompt?.trim()
        ? { workspacePrompt: params.workspacePrompt.trim() }
        : {}),
      ...(params.referencePrompt?.trim()
        ? { referencePrompt: params.referencePrompt.trim() }
        : {}),
    },
    compressedEvaluation: {
      summary: result.summary,
      dimensionScores: (result.score?.dimensions || []).map((dimension) => ({
        key: dimension.key,
        label: dimension.label,
        score: dimension.score,
      })),
      improvements: [...(result.improvements || [])],
      patchPlan: [...(result.patchPlan || [])],
      ...(stopSignals ? { compareStopSignals: stopSignals } : {}),
      ...(compareInsights ? { compareInsights } : {}),
      rewriteGuidance,
      focusSummaryLines: buildCompareFocusSummaryLines(compareInsights, language),
      conflictLines: buildCompareConflictLines(compareInsights, language),
      learnableSignalLines: collectUniqueLines(compareInsights?.learnableSignals || [], {
        limit: 5,
        maxLength: 220,
      }),
      overfitWarningLines: collectUniqueLines(compareInsights?.overfitWarnings || [], {
        limit: 5,
        maxLength: 220,
      }),
      supportEvidenceLines: buildCompareSupportLines(compareInsights),
    },
  };
};

export const buildRewritePromptFromEvaluation = (
  params: EvaluationRewritePromptParams,
): string => {
  const language = params.language || 'zh';
  const template = resolveRewriteTemplate(params.mode, language);
  const context = buildRewriteFromEvaluationContext(params);
  const messages = TemplateProcessor.processTemplate(template, context);

  return messages.map((message) => message.content.trim()).filter(Boolean).join('\n\n').trim();
};
