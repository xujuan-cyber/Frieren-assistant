<template>
  <NDrawer
    :show="show"
    :width="420"
    placement="right"
    :on-update:show="handleUpdateShow"
    data-testid="evaluation-panel-drawer"
  >
    <NDrawerContent :title="panelTitle" closable>
      <!-- 加载状态 -->
      <template v-if="isEvaluating">
        <div class="evaluation-loading">
          <NSpin size="large" />
          <NText depth="3" class="loading-text">{{ t('evaluation.loading') }}</NText>
          <!-- 流式内容预览 -->
          <div v-if="streamContent" class="stream-preview">
            <NText depth="3" class="stream-label">{{ t('evaluation.analyzing') }}</NText>
            <NScrollbar ref="streamScrollbarRef" style="max-height: 200px;">
              <NText class="stream-content">{{ streamContent }}</NText>
            </NScrollbar>
          </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <template v-else-if="error">
        <NResult status="error" :title="t('evaluation.error.title')">
          <template #default>
            <NText depth="3">{{ error }}</NText>
          </template>
          <template #footer>
            <NButton :disabled="isActionDisabled" @click="handleRetry">{{ t('common.retry') }}</NButton>
          </template>
        </NResult>
      </template>

      <!-- 评估结果 -->
      <template v-else-if="result">
        <NScrollbar style="max-height: calc(100vh - 120px);">
          <NSpace vertical :size="20">
            <NAlert
              v-if="stale"
              type="warning"
              :bordered="false"
              class="stale-alert"
            >
              {{ staleMessage || t('evaluation.stale.default') }}
            </NAlert>

            <!-- 总分展示 -->
            <div class="score-section">
              <div class="overall-score" :class="scoreLevelClass">
                <div class="score-value">{{ result.score.overall }}</div>
                <div class="score-label">{{ t('evaluation.overallScore') }}</div>
              </div>
              <NText depth="3" class="score-level-text">
                {{ scoreLevelText }}
              </NText>
            </div>


            <!-- 一句话总结 -->
            <NCard v-if="result.summary" size="small">
              <NText>{{ result.summary }}</NText>
            </NCard>

            <NCard
              v-if="compareDecisionSummary"
              :title="tOr('evaluation.compareMetadata.decision.title', 'Compare Decision')"
              size="small"
              data-testid="evaluation-panel-compare-decision"
            >
              <NSpace vertical :size="12">
                <div class="compare-decision-header">
                  <NTag
                    size="small"
                    :type="compareDecisionSummary.recommendationType"
                    round
                  >
                    {{ compareDecisionSummary.recommendationLabel }}
                  </NTag>
                  <NText class="compare-decision-headline">
                    {{ compareDecisionSummary.headline }}
                  </NText>
                </div>

                <NSpace
                  v-if="compareDecisionSummary.signalChips.length"
                  :size="8"
                  class="compare-decision-signals"
                >
                  <NTag
                    v-for="chip in compareDecisionSummary.signalChips"
                    :key="chip.key"
                    size="small"
                    :type="chip.type"
                    round
                  >
                    {{ chip.label }}: {{ chip.value }}
                  </NTag>
                </NSpace>

                <div v-if="compareDecisionSummary.evidence.length" class="compare-meta-block">
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.decision.keyEvidence', 'Key Evidence') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareDecisionSummary.evidence"
                      :key="`compare-decision-evidence-${item}`"
                    >
                      <NText>{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>

                <div v-if="compareDecisionSummary.nextActions.length" class="compare-meta-block">
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.decision.nextActions', 'Next Actions') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareDecisionSummary.nextActions"
                      :key="`compare-decision-action-${item}`"
                    >
                      <NText>{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>
              </NSpace>
            </NCard>

            <!-- Structured Compare 元信息 -->
            <NCard
              v-if="hasCompareMetadata"
              :title="tOr('evaluation.compareMetadata.title', 'Compare Metadata')"
              size="small"
              data-testid="evaluation-panel-compare-metadata"
            >
              <NSpace vertical :size="12">
                <div
                  v-if="compareMode"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-metadata-mode"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.mode', 'Mode') }}
                  </NText>
                  <NTag
                    size="small"
                    :type="compareMode === 'structured' ? 'success' : 'default'"
                    round
                    data-testid="evaluation-panel-compare-mode-value"
                  >
                    {{ formatCompareMode(compareMode) }}
                  </NTag>
                </div>

                <div
                  v-if="compareSnapshotRoleEntries.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-metadata-roles"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.roles', 'Snapshot Roles') }}
                  </NText>
                  <NSpace vertical :size="6">
                    <div
                      v-for="entry in compareSnapshotRoleEntries"
                      :key="entry.snapshotId"
                      class="compare-role-item"
                    >
                      <NText>{{ entry.snapshotId }}</NText>
                      <NTag size="small" type="info" round>{{ entry.role }}</NTag>
                    </div>
                  </NSpace>
                </div>

                <div
                  v-if="compareStopSignalEntries.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-metadata-stop-signals"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.stopSignals', 'Stop Signals') }}
                  </NText>
                  <NSpace vertical :size="6">
                    <div
                      v-for="entry in compareStopSignalEntries"
                      :key="entry.key"
                      class="compare-role-item"
                    >
                      <NText>{{ entry.label }}</NText>
                      <NTag size="small" :type="entry.type" round>{{ entry.value }}</NTag>
                    </div>
                  </NSpace>
                </div>
              </NSpace>
            </NCard>

            <NCard
              v-if="hasCompareInsights"
              :title="tOr('evaluation.compareMetadata.insights', 'Compare Insights')"
              size="small"
              data-testid="evaluation-panel-compare-insights"
            >
              <NSpace vertical :size="12">
                <div
                  v-if="compareInsightFocusSummaries.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-focus"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.focusSummaries', 'Focused Findings') }}
                  </NText>
                  <NSpace vertical :size="8">
                    <div
                      v-for="entry in compareInsightFocusSummaries"
                      :key="entry.key"
                      class="compare-judgement-item"
                    >
                      <div class="compare-judgement-header">
                        <NText strong>{{ entry.label }}</NText>
                        <NSpace :size="6">
                          <NTag size="small" type="info" round>{{ entry.pairSignal }}</NTag>
                          <NTag size="small" :type="entry.verdictType" round>{{ entry.verdict }}</NTag>
                          <NTag size="small" type="default" round>{{ entry.confidence }}</NTag>
                        </NSpace>
                      </div>
                      <NText depth="3" class="compare-judgement-side">
                        {{ entry.pairLabel }}
                      </NText>
                      <NText class="compare-judgement-analysis">{{ entry.analysis }}</NText>
                    </div>
                  </NSpace>
                </div>

                <div
                  v-if="compareInsightPairHighlights.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-pair-highlights"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.pairHighlights', 'Pair Highlights') }}
                  </NText>
                  <NSpace vertical :size="8">
                    <div
                      v-for="entry in compareInsightPairHighlights"
                      :key="entry.pairKey"
                      class="compare-judgement-item"
                    >
                      <div class="compare-judgement-header">
                        <NText strong>{{ entry.pairLabel }}</NText>
                        <NSpace :size="6">
                          <NTag size="small" type="info" round>{{ entry.pairSignal }}</NTag>
                          <NTag size="small" :type="entry.verdictType" round>{{ entry.verdict }}</NTag>
                          <NTag size="small" type="default" round>{{ entry.confidence }}</NTag>
                        </NSpace>
                      </div>
                      <NText class="compare-judgement-analysis">{{ entry.analysis }}</NText>
                    </div>
                  </NSpace>
                </div>

                <div
                  v-if="compareInsightEvidenceHighlights.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-evidence"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.evidenceHighlights', 'Evidence Highlights') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareInsightEvidenceHighlights"
                      :key="`compare-insight-evidence-${item}`"
                    >
                      <NText>{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>

                <div
                  v-if="compareInsightLearnableSignals.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-learnable"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.learnableSignals', 'Learnable Signals') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareInsightLearnableSignals"
                      :key="`compare-insight-signal-${item}`"
                    >
                      <NText>{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>

                <div
                  v-if="compareInsightOverfitWarnings.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-overfit"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.overfitWarnings', 'Overfit Warnings') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareInsightOverfitWarnings"
                      :key="`compare-insight-overfit-${item}`"
                    >
                      <NText type="warning">{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>

                <div
                  v-if="compareInsightConflictSignals.length"
                  class="compare-meta-block"
                  data-testid="evaluation-panel-compare-insights-conflict"
                >
                  <NText depth="3" class="compare-meta-label">
                    {{ tOr('evaluation.compareMetadata.conflictSignals', 'Conflict Checks') }}
                  </NText>
                  <NList>
                    <NListItem
                      v-for="item in compareInsightConflictSignals"
                      :key="`compare-insight-conflict-${item}`"
                    >
                      <NText type="warning">{{ item }}</NText>
                    </NListItem>
                  </NList>
                </div>
              </NSpace>
            </NCard>

            <NCard
              v-if="compareJudgementEntries.length"
              :title="tOr('evaluation.compareMetadata.judgements', 'Pairwise Judgements')"
              size="small"
              data-testid="evaluation-panel-compare-judgements"
            >
              <NSpace vertical :size="10">
                <div
                  v-for="entry in compareJudgementEntries"
                  :key="entry.pairKey"
                  class="compare-judgement-item"
                >
                  <div class="compare-judgement-header">
                    <NText strong>{{ entry.pairLabel }}</NText>
                    <NSpace :size="6">
                      <NTag size="small" type="info" round>{{ entry.pairSignal }}</NTag>
                      <NTag size="small" :type="entry.verdictType" round>{{ entry.verdict }}</NTag>
                      <NTag size="small" type="default" round>{{ entry.confidence }}</NTag>
                    </NSpace>
                  </div>
                  <NText depth="3" class="compare-judgement-side">
                    {{ entry.sideLabel }}
                  </NText>
                  <NText class="compare-judgement-analysis">{{ entry.analysis }}</NText>
                  <NText v-if="entry.evidenceText" depth="3" class="compare-judgement-extra">
                    {{ entry.evidenceText }}
                  </NText>
                  <NText v-if="entry.learnableSignalsText" depth="3" class="compare-judgement-extra">
                    {{ entry.learnableSignalsText }}
                  </NText>
                  <NText v-if="entry.overfitWarningsText" depth="3" type="warning" class="compare-judgement-extra">
                    {{ entry.overfitWarningsText }}
                  </NText>
                </div>
              </NSpace>
            </NCard>

            <!-- 四维度分数 -->
            <NCard :title="t('evaluation.dimensions')" size="small">
              <NSpace vertical :size="12">
                <div v-for="dim in result.score.dimensions" :key="dim.key" class="dimension-item">
                  <div class="dimension-header">
                    <NText>{{ dim.label }}</NText>
                    <NText :class="getDimensionScoreClass(dim.score)">{{ dim.score }}</NText>
                  </div>
                  <NProgress
                    :percentage="dim.score"
                    :status="getDimensionStatus(dim.score)"
                    :show-indicator="false"
                    :height="8"
                  />
                </div>
              </NSpace>
            </NCard>

            <!-- 精准修复（patchPlan） -->
            <NCard
              v-if="result.patchPlan && result.patchPlan.length > 0"
              :title="t('evaluation.diagnose.title')"
              size="small"
            >
              <NList>
                <NListItem v-for="(op, opIndex) in result.patchPlan" :key="opIndex">
                  <div class="patch-item">
                    <div class="patch-header">
                      <NTag :type="getOperationType(op.op)" size="tiny">
                        {{ getOperationLabel(op.op) }}
                      </NTag>
                      <NText class="patch-instruction">{{ op.instruction }}</NText>
                    </div>
                    <div class="patch-diff-inline">
                      <InlineDiff :old-text="op.oldText" :new-text="op.newText" />
                    </div>
                    <NButton size="tiny" type="primary" class="patch-apply-btn" @click="handleApplyPatchLocal(op)">
                      {{ t('evaluation.diagnose.replaceNow') }}
                    </NButton>
                  </div>
                </NListItem>
              </NList>
            </NCard>

            <!-- 改进建议 -->
            <NCard v-if="result.improvements && result.improvements.length > 0" :title="t('evaluation.improvements')" size="small">
              <NList>
                <NListItem v-for="(item, index) in result.improvements" :key="index">
                  <div class="improvement-item">
                    <NText type="info" class="improvement-text">{{ item }}</NText>
                    <NButton size="tiny" type="primary" @click="handleApplyImprovement(item)">
                      {{ t('evaluation.applyToIterate') }}
                    </NButton>
                  </div>
                </NListItem>
              </NList>
            </NCard>

            <!-- 反馈输入（可选） -->
            <NCard
              v-if="currentType"
              size="small"
              class="feedback-section"
            >
              <template #header>
                <NSpace align="center" :size="8">
                  <span class="feedback-card-title">{{ t('evaluation.feedbackTitle') }}</span>
                  <NTag size="small" round :bordered="false" type="default" class="optional-tag">
                    {{ t('evaluation.optional') }}
                  </NTag>
                </NSpace>
              </template>
              <FeedbackEditor
                v-model="feedbackDraft"
                :show-actions="false"
                :disabled="isActionDisabled"
              />
            </NCard>
          </NSpace>
        </NScrollbar>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <NSpace vertical :size="12" style="width: 100%;">
          <NEmpty :description="t('evaluation.noResult')">
            <template #icon>
              <NIcon :size="48" :depth="3" aria-hidden="true">
                <ChartBar />
              </NIcon>
            </template>
          </NEmpty>

          <NCard
            v-if="currentType"
            size="small"
            class="feedback-section"
          >
            <template #header>
              <NSpace align="center" :size="8">
                <span class="feedback-card-title">{{ t('evaluation.feedbackTitle') }}</span>
                <NTag size="small" round :bordered="false" type="default" class="optional-tag">
                  {{ t('evaluation.optional') }}
                </NTag>
              </NSpace>
            </template>
            <FeedbackEditor
              v-model="feedbackDraft"
              :show-actions="false"
              :disabled="isActionDisabled"
            />
          </NCard>
        </NSpace>
      </template>

      <!-- 底部操作栏 -->
      <template #footer>
        <NSpace justify="space-between" style="width: 100%;">
          <NButton v-if="result" @click="handleClear" quaternary>
            {{ t('common.clear') }}
          </NButton>
          <NSpace>
            <NButton
              v-if="canShowRewriteAction"
              type="primary"
              :disabled="isRewriteDisabled"
              data-testid="evaluation-panel-rewrite-from-evaluation"
              @click="handleRewriteFromEvaluation"
            >
              {{ t('evaluation.rewriteFromEvaluation') }}
            </NButton>
            <NButton
              v-if="currentType"
              type="primary"
              :disabled="isActionDisabled"
              :loading="isEvaluating"
              data-testid="evaluation-panel-re-evaluate"
              @click="handleReEvaluateClick"
            >
              {{ t('evaluation.reEvaluate') }}
            </NButton>
            <NButton @click="handleClose">
              {{ t('common.close') }}
            </NButton>
          </NSpace>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NCard,
  NText,
  NButton,
  NIcon,
  NProgress,
  NResult,
  NSpin,
  NScrollbar,
  NEmpty,
  NAlert,
  NList,
  NListItem,
  NTag,
  type ScrollbarInst,
} from 'naive-ui'
import { ChartBar } from '@vicons/tabler'
import type { EvaluationResponse, EvaluationType, PatchOperation } from '@prompt-optimizer/core'
import {
  getCompareEvaluationMetadata,
  getCompareInsights,
  getCompareJudgements,
  type CompareInsightRecord,
  type CompareJudgementRecord,
} from '../../composables/prompt/compareResultMetadata'
import InlineDiff from './InlineDiff.vue'
import FeedbackEditor from './FeedbackEditor.vue'

type CompareDecisionSummary = {
  recommendation: 'continue' | 'stop' | 'review'
  recommendationLabel: string
  recommendationType: 'success' | 'warning' | 'error' | 'info' | 'default'
  headline: string
  signalChips: Array<{
    key: string
    label: string
    value: string
    type: 'success' | 'warning' | 'error' | 'info' | 'default'
  }>
  evidence: string[]
  nextActions: string[]
}

// Props
const props = defineProps<{
  show: boolean
  isEvaluating: boolean
  currentType: EvaluationType | null
  result: EvaluationResponse | null
  streamContent: string
  error: string | null
  scoreLevel: 'excellent' | 'good' | 'acceptable' | 'poor' | 'very-poor' | null
  stale?: boolean
  staleMessage?: string
  disableEvaluate?: boolean
  canRewriteFromEvaluation?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'clear'): void
  (e: 'retry'): void
  (e: 're-evaluate'): void
  (e: 'evaluate-with-feedback', payload: { feedback: string }): void
  (e: 'apply-local-patch', payload: { operation: PatchOperation }): void
  (e: 'apply-improvement', payload: {
    improvement: string;
    type: EvaluationType;
  }): void
  (e: 'rewrite-from-evaluation', payload: {
    result: EvaluationResponse;
    type: EvaluationType;
  }): void
}>()

const { t } = useI18n()

// 流式内容滚动条引用
const streamScrollbarRef = ref<ScrollbarInst | null>(null)
const feedbackDraft = ref('')
const isActionDisabled = computed(() => props.isEvaluating || !!props.disableEvaluate)
const currentEvaluationType = computed<EvaluationType>(() =>
  props.currentType || props.result?.type || 'prompt-only'
)
const canShowRewriteAction = computed(() =>
  !!props.canRewriteFromEvaluation && !!props.result
)
const isRewriteDisabled = computed(() =>
  !props.result || props.isEvaluating || !!props.stale
)

// 监听流式内容变化，自动滚动到底部
watch(() => props.streamContent, () => {
  nextTick(() => {
    streamScrollbarRef.value?.scrollTo({ top: 999999, behavior: 'smooth' })
  })
})

const tOr = (key: string, fallback: string): string => {
  const translated = t(key)
  return translated === key ? fallback : translated
}

const normalizeInlineText = (value: string | undefined): string =>
  (value || '').replace(/\s+/gu, ' ').trim()

const collectUniqueCompareNotes = (
  values: Array<string | undefined>,
  limit = 4,
): string[] => {
  const seen = new Set<string>()
  const results: string[] = []

  for (const value of values) {
    const normalized = normalizeInlineText(value)
    if (!normalized) continue

    const dedupeKey = normalized.toLocaleLowerCase()
    if (seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    results.push(normalized)

    if (results.length >= limit) {
      break
    }
  }

  return results
}

const compareMetadata = computed(() =>
  props.currentType === 'compare' ? getCompareEvaluationMetadata(props.result) : null
)

const compareMode = computed(() =>
  compareMetadata.value?.compareMode ?? null
)

const compareStopSignals = computed(() =>
  compareMetadata.value?.compareStopSignals
)

const formatCompareMode = (mode: string | null): string => {
  if (!mode) return ''

  switch (mode) {
    case 'structured':
      return tOr('evaluation.compareMetadata.modeValues.structured', 'Structured')
    case 'generic':
      return tOr('evaluation.compareMetadata.modeValues.generic', 'Generic')
    default:
      return mode
  }
}

const formatCompareRole = (role: string): string => {
  switch (role) {
    case 'target':
      return tOr('evaluation.compareMetadata.roleValues.target', 'Target')
    case 'baseline':
      return tOr('evaluation.compareMetadata.roleValues.baseline', 'Baseline')
    case 'reference':
      return tOr('evaluation.compareMetadata.roleValues.reference', 'Reference')
    case 'referenceBaseline':
      return tOr('evaluation.compareMetadata.roleValues.referenceBaseline', 'Reference Baseline')
    case 'replica':
      return tOr('evaluation.compareMetadata.roleValues.replica', 'Replica')
    case 'auxiliary':
      return tOr('evaluation.compareMetadata.roleValues.auxiliary', 'Auxiliary')
    default:
      return role
  }
}

const compareSnapshotRoleEntries = computed(() => {
  return Object.entries(compareMetadata.value?.snapshotRoles || {}).map(([snapshotId, role]) => ({
    snapshotId,
    role: formatCompareRole(role),
  }))
})

const formatStopSignalValue = (key: string, value: string): string => {
  const translationKey = `evaluation.compareMetadata.signalValues.${key}.${value}`

  switch (key) {
    case 'targetVsBaseline':
      return tOr(translationKey, {
        improved: 'Improved',
        flat: 'Flat',
        regressed: 'Regressed',
      }[value] || value)
    case 'targetVsReferenceGap':
      return tOr(translationKey, {
        none: 'None',
        minor: 'Minor',
        major: 'Major',
      }[value] || value)
    case 'improvementHeadroom':
      return tOr(translationKey, {
        none: 'None',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      }[value] || value)
    case 'overfitRisk':
      return tOr(translationKey, {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      }[value] || value)
    case 'stopRecommendation':
      return tOr(translationKey, {
        continue: 'Continue',
        stop: 'Stop',
        review: 'Review',
      }[value] || value)
    default:
      return value
  }
}

const getStopSignalLabel = (key: string): string => {
  switch (key) {
    case 'targetVsBaseline':
      return tOr('evaluation.compareMetadata.targetVsBaseline', 'Target vs Baseline')
    case 'targetVsReferenceGap':
      return tOr('evaluation.compareMetadata.targetVsReferenceGap', 'Target vs Reference Gap')
    case 'improvementHeadroom':
      return tOr('evaluation.compareMetadata.improvementHeadroom', 'Improvement Headroom')
    case 'overfitRisk':
      return tOr('evaluation.compareMetadata.overfitRisk', 'Overfit Risk')
    case 'stopRecommendation':
      return tOr('evaluation.compareMetadata.stopRecommendation', 'Stop Recommendation')
    default:
      return key
  }
}

const getStopSignalType = (key: string, value: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (key === 'targetVsBaseline') {
    if (value === 'improved') return 'success'
    if (value === 'regressed') return 'error'
    return 'warning'
  }
  if (key === 'targetVsReferenceGap') {
    if (value === 'none') return 'success'
    if (value === 'major') return 'warning'
    return 'info'
  }
  if (key === 'improvementHeadroom') {
    if (value === 'none' || value === 'low') return 'success'
    if (value === 'high') return 'warning'
    return 'info'
  }
  if (key === 'overfitRisk') {
    if (value === 'high') return 'error'
    if (value === 'medium') return 'warning'
    return 'success'
  }
  if (key === 'stopRecommendation') {
    if (value === 'stop') return 'warning'
    if (value === 'review') return 'error'
    return 'success'
  }
  return 'default'
}

const compareStopSignalEntries = computed(() => {
  if (!compareStopSignals.value) return []

  const entries: Array<{ key: string; label: string; value: string; type: 'success' | 'warning' | 'error' | 'info' | 'default' }> = []

  ;([
    'targetVsBaseline',
    'targetVsReferenceGap',
    'improvementHeadroom',
    'overfitRisk',
    'stopRecommendation',
  ] as const).forEach((key) => {
    const value = compareStopSignals.value?.[key]
    if (!value) return
    entries.push({
      key,
      label: getStopSignalLabel(key),
      value: formatStopSignalValue(key, value),
      type: getStopSignalType(key, value),
    })
  })

  if (compareStopSignals.value?.stopReasons?.length) {
    entries.push({
      key: 'stopReasons',
      label: tOr('evaluation.compareMetadata.stopReasons', 'Stop Reasons'),
      value: compareStopSignals.value.stopReasons.join(' | '),
      type: 'default',
    })
  }

  return entries
})

const formatCompareJudgementVerdict = (value: CompareJudgementRecord['verdict']): string => {
  return tOr(`evaluation.compareMetadata.verdictValues.${value}`, {
    'left-better': 'Left Better',
    'right-better': 'Right Better',
    mixed: 'Mixed',
    similar: 'Similar',
  }[value] || value)
}

const formatCompareJudgementConfidence = (value: CompareJudgementRecord['confidence']): string => {
  return tOr(`evaluation.compareMetadata.confidenceValues.${value}`, {
    low: 'Low Confidence',
    medium: 'Medium Confidence',
    high: 'High Confidence',
  }[value] || value)
}

const getCompareJudgementVerdictType = (
  verdict: CompareJudgementRecord['verdict']
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (verdict === 'left-better') return 'success'
  if (verdict === 'right-better') return 'warning'
  if (verdict === 'mixed') return 'info'
  return 'default'
}

const compareJudgementEntries = computed(() => {
  return getCompareJudgements(props.currentType === 'compare' ? props.result : null).map((
    judgement: CompareJudgementRecord,
  ) => {
    const sideLabel = `${judgement.leftSnapshotLabel} (${formatCompareRole(judgement.leftRole || 'auxiliary')}) vs ${judgement.rightSnapshotLabel} (${formatCompareRole(judgement.rightRole || 'auxiliary')})`
    const evidenceText = judgement.evidence.length
      ? `${tOr('evaluation.compareMetadata.evidence', 'Evidence')}: ${judgement.evidence.join(' | ')}`
      : ''
    const learnableSignalsText = judgement.learnableSignals.length
      ? `${tOr('evaluation.compareMetadata.learnableSignals', 'Learnable Signals')}: ${judgement.learnableSignals.join(' | ')}`
      : ''
    const overfitWarningsText = judgement.overfitWarnings.length
      ? `${tOr('evaluation.compareMetadata.overfitWarnings', 'Overfit Warnings')}: ${judgement.overfitWarnings.join(' | ')}`
      : ''

    return {
      pairKey: judgement.pairKey,
      pairLabel: judgement.pairLabel,
      pairSignal: judgement.pairSignal,
      verdict: formatCompareJudgementVerdict(judgement.verdict),
      verdictType: getCompareJudgementVerdictType(judgement.verdict),
      confidence: formatCompareJudgementConfidence(judgement.confidence),
      sideLabel,
      analysis: judgement.analysis,
      evidenceText,
      learnableSignalsText,
      overfitWarningsText,
    }
  })
})

const compareInsights = computed(() =>
  props.currentType === 'compare'
    ? getCompareInsights(props.result)
    : undefined
)

const compareInsightPairHighlights = computed(() =>
  (compareInsights.value?.pairHighlights || []).map((highlight: CompareInsightRecord['pairHighlights'][number]) => ({
    pairKey: highlight.pairKey,
    pairLabel: highlight.pairLabel,
    pairSignal: highlight.pairSignal,
    verdict: formatCompareJudgementVerdict(highlight.verdict),
    verdictType: getCompareJudgementVerdictType(highlight.verdict),
    confidence: formatCompareJudgementConfidence(highlight.confidence),
    analysis: highlight.analysis,
  }))
)

const compareInsightFocusSummaries = computed(() => {
  const focusEntries = [
    {
      key: 'progressSummary',
      label: tOr('evaluation.compareMetadata.progressSummary', 'Progress Summary'),
      value: compareInsights.value?.progressSummary,
    },
    {
      key: 'referenceGapSummary',
      label: tOr('evaluation.compareMetadata.referenceGapSummary', 'Reference Gap'),
      value: compareInsights.value?.referenceGapSummary,
    },
    {
      key: 'promptChangeSummary',
      label: tOr('evaluation.compareMetadata.promptChangeSummary', 'Prompt Change Validity'),
      value: compareInsights.value?.promptChangeSummary,
    },
    {
      key: 'stabilitySummary',
      label: tOr('evaluation.compareMetadata.stabilitySummary', 'Stability'),
      value: compareInsights.value?.stabilitySummary,
    },
  ] as const

  return focusEntries
    .filter((entry) => !!entry.value)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      pairLabel: entry.value?.pairLabel || '',
      pairSignal: entry.value?.pairSignal || '',
      verdict: formatCompareJudgementVerdict(entry.value?.verdict || 'similar'),
      verdictType: getCompareJudgementVerdictType(entry.value?.verdict || 'similar'),
      confidence: formatCompareJudgementConfidence(entry.value?.confidence || 'low'),
      analysis: entry.value?.analysis || '',
    }))
})

const compareInsightEvidenceHighlights = computed(() =>
  compareInsights.value?.evidenceHighlights || []
)

const compareInsightLearnableSignals = computed(() =>
  compareInsights.value?.learnableSignals || []
)

const compareInsightOverfitWarnings = computed(() =>
  compareInsights.value?.overfitWarnings || []
)

const formatCompareConflictSignal = (
  signal: NonNullable<CompareInsightRecord['conflictSignals']>[number]
): string => {
  const fallbackMap: Record<NonNullable<CompareInsightRecord['conflictSignals']>[number], string> = {
    improvementNotSupportedOnReference:
      'The target improved over baseline, but the same prompt change is not supported on the reference side.',
    improvementUnstableAcrossReplicas:
      'The target improved in one comparison, but replica evidence suggests the gain may be unstable.',
    regressionOutweighsCosmeticGains:
      'Regression against the baseline should outweigh cosmetic improvements elsewhere.',
    sampleOverfitRiskVisible:
      'When reusable gains and sample-fitting gains coexist, prefer conservative conclusions and keep the overfit risk visible.',
  }

  return tOr(
    `evaluation.compareMetadata.conflictSignalValues.${signal}`,
    fallbackMap[signal] || signal
  )
}

const compareInsightConflictSignals = computed(() =>
  (compareInsights.value?.conflictSignals || []).map((signal) =>
    formatCompareConflictSignal(signal)
  )
)

const getCompareDecisionHeadline = (
  recommendation: 'continue' | 'stop' | 'review',
  targetVsBaseline: 'improved' | 'flat' | 'regressed' | undefined,
): string => {
  if (targetVsBaseline === 'regressed') {
    return tOr(
      'evaluation.compareMetadata.decision.headlines.regressed',
      'The target appears to have regressed relative to the previous version; do not accept this rewrite directly.'
    )
  }

  if (recommendation === 'stop') {
    return tOr(
      'evaluation.compareMetadata.decision.headlines.stop',
      'The current result looks close to convergence; further automatic rewrites are unlikely to help much.'
    )
  }

  if (recommendation === 'review') {
    return tOr(
      'evaluation.compareMetadata.decision.headlines.review',
      'The current compare result needs manual review before accepting another rewrite.'
    )
  }

  return tOr(
    'evaluation.compareMetadata.decision.headlines.continue',
    'The target is moving in the right direction, but there is still actionable improvement headroom.'
  )
}

const buildCompareDecisionAction = (action: string): string => {
  switch (action) {
    case 'inspectRegression':
      return tOr(
        'evaluation.compareMetadata.decision.actions.inspectRegression',
        'Inspect what the new version removed or weakened before attempting another rewrite.'
      )
    case 'reviewBeforeRewrite':
      return tOr(
        'evaluation.compareMetadata.decision.actions.reviewBeforeRewrite',
        'Review the conflicting evidence first, then decide whether to rewrite or keep the current version.'
      )
    case 'reviewPromptValidity':
      return tOr(
        'evaluation.compareMetadata.decision.actions.reviewPromptValidity',
        'Check whether the prompt change is actually transferable, because the reference-side evidence does not currently support it.'
      )
    case 'learnFromReference':
      return tOr(
        'evaluation.compareMetadata.decision.actions.learnFromReference',
        'Learn from the stronger reference-side structure before the next rewrite.'
      )
    case 'filterOverfit':
      return tOr(
        'evaluation.compareMetadata.decision.actions.filterOverfit',
        'Filter out sample-specific rules and keep only reusable guidance.'
      )
    case 'continueTargetedRewrite':
      return tOr(
        'evaluation.compareMetadata.decision.actions.continueTargetedRewrite',
        'If you continue rewriting, focus only on the highest-signal gap instead of broad changes.'
      )
    case 'acceptCurrent':
      return tOr(
        'evaluation.compareMetadata.decision.actions.acceptCurrent',
        'Treat the current workspace as near-converged and avoid adding more rules unless new evidence appears.'
      )
    case 'verifyStability':
      return tOr(
        'evaluation.compareMetadata.decision.actions.verifyStability',
        'Re-check stability with another shared input if the current judgement is still borderline.'
      )
    default:
      return action
  }
}

const compareDecisionSummary = computed<CompareDecisionSummary | null>(() => {
  if (props.currentType !== 'compare') return null

  const stopSignals = compareStopSignals.value
  const insights = compareInsights.value
  if (!stopSignals && !insights) return null

  const targetVsBaseline = stopSignals?.targetVsBaseline
  const targetVsReferenceGap = stopSignals?.targetVsReferenceGap
  const improvementHeadroom = stopSignals?.improvementHeadroom
  const overfitRisk = stopSignals?.overfitRisk

  const recommendation: 'continue' | 'stop' | 'review' =
    targetVsBaseline === 'regressed' || overfitRisk === 'high'
      ? 'review'
      : stopSignals?.stopRecommendation || 'continue'

  const recommendationType = recommendation === 'continue'
    ? 'success'
    : recommendation === 'stop'
      ? 'warning'
      : 'error'

  const signalChips = ([
    'targetVsBaseline',
    'targetVsReferenceGap',
    'improvementHeadroom',
    'overfitRisk',
  ] as const).flatMap((key) => {
    const value = stopSignals?.[key]
    if (!value) return []

    return [{
      key,
      label: getStopSignalLabel(key),
      value: formatStopSignalValue(key, value),
      type: getStopSignalType(key, value),
    }]
  })

  const evidence = collectUniqueCompareNotes([
    ...(stopSignals?.stopReasons || []),
    insights?.progressSummary
      ? `${insights.progressSummary.pairLabel}: ${insights.progressSummary.analysis}`
      : undefined,
    insights?.referenceGapSummary
      ? `${insights.referenceGapSummary.pairLabel}: ${insights.referenceGapSummary.analysis}`
      : undefined,
    insights?.promptChangeSummary
      ? `${insights.promptChangeSummary.pairLabel}: ${insights.promptChangeSummary.analysis}`
      : undefined,
    insights?.stabilitySummary
      ? `${insights.stabilitySummary.pairLabel}: ${insights.stabilitySummary.analysis}`
      : undefined,
    ...(compareInsightOverfitWarnings.value || []),
    ...compareInsightConflictSignals.value,
    props.result?.summary,
  ])

  const nextActionKeys = collectUniqueCompareNotes([
    targetVsBaseline === 'regressed' ? 'inspectRegression' : undefined,
    insights?.conflictSignals?.includes('regressionOutweighsCosmeticGains')
      ? 'inspectRegression'
      : undefined,
    recommendation === 'review' ? 'reviewBeforeRewrite' : undefined,
    insights?.conflictSignals?.includes('improvementNotSupportedOnReference')
      ? 'reviewPromptValidity'
      : undefined,
    targetVsReferenceGap === 'major' || targetVsReferenceGap === 'minor'
      ? 'learnFromReference'
      : undefined,
    overfitRisk === 'medium' || overfitRisk === 'high'
      ? 'filterOverfit'
      : undefined,
    insights?.conflictSignals?.includes('sampleOverfitRiskVisible')
      ? 'filterOverfit'
      : undefined,
    recommendation === 'continue' &&
    targetVsBaseline !== 'regressed' &&
    (improvementHeadroom === 'medium' ||
      improvementHeadroom === 'high' ||
      targetVsReferenceGap === 'major' ||
      targetVsReferenceGap === 'minor')
      ? 'continueTargetedRewrite'
      : undefined,
    recommendation === 'stop'
      ? 'acceptCurrent'
      : undefined,
    targetVsBaseline === 'flat' ||
    !!insights?.stabilitySummary ||
    insights?.conflictSignals?.includes('improvementUnstableAcrossReplicas')
      ? 'verifyStability'
      : undefined,
  ])

  return {
    recommendation,
    recommendationLabel: formatStopSignalValue('stopRecommendation', recommendation),
    recommendationType,
    headline: getCompareDecisionHeadline(recommendation, targetVsBaseline),
    signalChips,
    evidence,
    nextActions: nextActionKeys.map((item) => buildCompareDecisionAction(item)),
  }
})

const hasCompareInsights = computed(() =>
  compareInsightFocusSummaries.value.length > 0 ||
  compareInsightPairHighlights.value.length > 0 ||
  compareInsightEvidenceHighlights.value.length > 0 ||
  compareInsightLearnableSignals.value.length > 0 ||
  compareInsightOverfitWarnings.value.length > 0 ||
  compareInsightConflictSignals.value.length > 0
)

const hasCompareMetadata = computed(() =>
  !!compareMode.value ||
  compareSnapshotRoleEntries.value.length > 0 ||
  compareStopSignalEntries.value.length > 0
)

// 面板标题
const panelTitle = computed(() => {
  switch (props.currentType) {
    case 'result':
      return t('evaluation.title.result')
    case 'compare':
      return t('evaluation.title.compare')
    case 'prompt-only':
      return t('evaluation.title.promptOnly')
    case 'prompt-iterate':
      return t('evaluation.title.promptIterate')
    default:
      return t('evaluation.title.default')
  }
})

// 评分等级样式类
const scoreLevelClass = computed(() => {
  if (!props.scoreLevel) return ''
  return `score-${props.scoreLevel}`
})

// 评分等级文本
const scoreLevelText = computed(() => {
  switch (props.scoreLevel) {
    case 'excellent':
      return t('evaluation.level.excellent')
    case 'good':
      return t('evaluation.level.good')
    case 'acceptable':
      return t('evaluation.level.acceptable')
    case 'poor':
      return t('evaluation.level.poor')
    case 'very-poor':
      return t('evaluation.level.veryPoor')
    default:
      return ''
  }
})

// 获取维度分数样式类
const getDimensionScoreClass = (score: number): string => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 60) return 'score-acceptable'
  if (score >= 40) return 'score-poor'
  return 'score-very-poor'
}

// 获取进度条状态
const getDimensionStatus = (score: number): 'success' | 'warning' | 'error' | 'default' => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'error'
}

// 处理显示更新
const handleUpdateShow = (value: boolean) => {
  emit('update:show', value)
}

// 关闭面板
const handleClose = () => {
  emit('update:show', false)
}

// 清除结果
const handleClear = () => {
  emit('clear')
}

// 重试评估
const handleRetry = () => {
  if (isActionDisabled.value) return
  emit('retry')
}

// 重新评估
const handleReEvaluateClick = () => {
  if (isActionDisabled.value) return

  const trimmed = feedbackDraft.value.trim()

  if (trimmed) {
    emit('evaluate-with-feedback', { feedback: trimmed })
    feedbackDraft.value = ''
    return
  }

  emit('re-evaluate')
}

// 应用改进建议到迭代
const handleApplyImprovement = (improvement: string) => {
  emit('apply-improvement', {
    improvement,
    type: currentEvaluationType.value
  })
}

const handleRewriteFromEvaluation = () => {
  if (isRewriteDisabled.value || !props.result) return

  emit('rewrite-from-evaluation', {
    result: props.result,
    type: currentEvaluationType.value,
  })
}

// ===== patchPlan 相关逻辑 =====

// 获取操作类型样式
const getOperationType = (op: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (op) {
    case 'insert': return 'success'
    case 'replace': return 'warning'
    case 'delete': return 'error'
    default: return 'info'
  }
}

const getOperationLabel = (op: string): string => {
  return tOr(`evaluation.diagnose.operation.${op}`, op)
}

const handleApplyPatchLocal = (operation: PatchOperation) => {
  emit('apply-local-patch', { operation })
}

watch(() => props.show, (visible) => {
  if (!visible) {
    feedbackDraft.value = ''
  }
})
</script>

<style scoped>
.evaluation-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
}

.loading-text {
  font-size: 14px;
}

.stream-preview {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: var(--n-color-embedded);
  border-radius: 8px;
}

.stream-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
}

.stream-content {
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: var(--n-color-embedded);
  border-radius: 12px;
}

.overall-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid currentColor;
  margin-bottom: 12px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
}

.score-label {
  font-size: 12px;
  opacity: 0.8;
}

.score-level-text {
  font-size: 14px;
}

/* 评分等级颜色 */
.score-excellent {
  color: #18a058;
}

.score-good {
  color: #2080f0;
}

.score-acceptable {
  color: #f0a020;
}

.score-poor {
  color: #d03050;
}

.score-very-poor {
  color: #d03050;
}

.dimension-item {
  width: 100%;
}

.compare-meta-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-meta-label {
  font-size: 12px;
}

.compare-role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.compare-judgement-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.16);
}

.compare-judgement-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.compare-decision-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-decision-headline {
  line-height: 1.6;
}

.compare-decision-signals {
  flex-wrap: wrap;
}

.compare-judgement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.compare-judgement-side {
  font-size: 12px;
}

.compare-judgement-analysis {
  line-height: 1.5;
}

.compare-judgement-extra {
  font-size: 12px;
  line-height: 1.5;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.analysis-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

/* 改进建议项 */
.improvement-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.improvement-text {
  flex: 1;
  word-break: break-word;
}

/* patchPlan 相关样式 */
.patch-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.patch-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.patch-instruction {
  flex: 1;
  word-break: break-word;
  font-size: 13px;
}

.patch-diff-inline {
  background: var(--n-color-embedded);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
}

.patch-apply-btn {
  align-self: flex-end;
}

.feedback-section {
  margin: 0;
}

.feedback-section :deep(.n-card__header) {
  padding: 10px 12px 6px;
}

.feedback-section :deep(.n-card__content) {
  padding: 0 12px 12px;
}

.feedback-card-title {
  font-weight: 600;
}

.optional-tag {
  opacity: 0.85;
}

.stale-alert {
  margin-bottom: -4px;
}

</style>
