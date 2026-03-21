import { describe, expect, it } from 'vitest'
import type {
  EvaluationResponse,
  EvaluationType,
} from '@prompt-optimizer/core'
import {
  buildRewriteFromEvaluationInput,
  normalizeRewriteLocaleLanguage,
} from '../../../src/composables/prompt/rewriteFromEvaluation'

const createEvaluationResponse = (
  overall: number,
  type: EvaluationType = 'result'
): EvaluationResponse => ({
  type,
  score: {
    overall,
    dimensions: [
      {
        key: 'overall',
        label: 'Overall',
        score: overall,
      },
    ],
  },
  improvements: [],
  summary: `score-${overall}`,
  patchPlan: [],
})

describe('rewriteFromEvaluation', () => {
  it('builds a deduplicated compare rewrite brief in Chinese', () => {
    const input = buildRewriteFromEvaluationInput({
      type: 'compare',
      result: {
        ...createEvaluationResponse(88, 'compare'),
        summary: '当前版本比上一版本更稳定，但和参考模型相比还有轻微格式差距。',
        improvements: [
          '把输出结构约束写得更前置，并明确结尾不要附加解释。',
          '把输出结构约束写得更前置，并明确结尾不要附加解释。',
        ],
        patchPlan: [
          {
            op: 'replace',
            instruction: '将输出格式要求前置，并保留禁止附加说明的边界。',
            oldText: '请回答问题。',
            newText: '请先按固定结构回答，并且不要附加解释。',
          },
        ],
        metadata: {
          compareStopSignals: {
            targetVsBaseline: 'improved',
            targetVsReferenceGap: 'minor',
            improvementHeadroom: 'low',
            overfitRisk: 'medium',
            stopRecommendation: 'continue',
            stopReasons: ['still trailing the reference on format consistency'],
          },
          compareInsights: {
            progressSummary: {
              pairKey: 'target-vs-baseline',
              pairType: 'targetBaseline',
              pairLabel: 'Target vs Previous',
              pairSignal: 'improved',
              verdict: 'left-better',
              confidence: 'high',
              analysis: '当前版本结构更清晰，漏项更少。',
            },
            pairHighlights: [
              {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Previous',
                pairSignal: 'improved',
                verdict: 'left-better',
                confidence: 'high',
                analysis: '当前版本结构更清晰，漏项更少。',
              },
            ],
            learnableSignals: [
              '保留显式步骤结构。',
              '保留显式步骤结构。',
            ],
            overfitWarnings: [
              '不要为了这条样例单独添加领域规则。',
              '不要为了这条样例单独添加领域规则。',
            ],
            conflictSignals: [
              'sampleOverfitRiskVisible',
            ],
          },
        },
      },
    })

    expect(input).toContain('已经过滤压缩后的评估结果')
    expect(input).toContain('评估类型：对比评估')
    expect(input).toContain('核心改写目标：')
    expect(input).toContain('聚合焦点结论：')
    expect(input).toContain('对比决策快照：')
    expect(input).toContain('冲突检查：')
    expect(input).toContain('进步判断: Target vs Previous')
    expect(input).toContain('保留 / 学习信号：')
    expect(input).toContain('需要过滤的信号：')
    expect(input).toContain('如果“可复用收益”和“样例贴合收益”并存，应优先采用保守结论，并保持过拟合风险可见。')
    expect(input).toContain('不要为了这条样例单独添加领域规则。')
    expect(input).toContain('辅助证据锚点：')
    expect(input).toContain('targetVsBaseline=improved')
    expect(input).toContain('请把上面的对比洞察视为已经压缩后的可信证据来源')
    expect(input.match(/保留显式步骤结构。/g)?.length).toBe(1)
    expect(input.match(/不要为了这条样例单独添加领域规则。/g)?.length).toBe(1)
  })

  it('emits English rewrite guidance for design-only analysis', () => {
    const input = buildRewriteFromEvaluationInput(
      {
        type: 'prompt-only',
        result: {
          ...createEvaluationResponse(76, 'prompt-only'),
          summary: 'The prompt intent is clear, but the response boundary is still loose.',
          improvements: [
            'Move the output format requirement earlier.',
          ],
        },
      },
      'en'
    )

    expect(input).toContain('Rewrite the current workspace prompt into a full new version')
    expect(input).toContain('Evaluation Type: Prompt Design Analysis')
    expect(input).toContain('Core Rewrite Targets:')
    expect(input).toContain('Priority: Move the output format requirement earlier.')
    expect(input).toContain('This is design-only analysis without execution output.')
  })

  it('normalizes locale into supported rewrite languages', () => {
    expect(normalizeRewriteLocaleLanguage('en-US')).toBe('en')
    expect(normalizeRewriteLocaleLanguage('EN')).toBe('en')
    expect(normalizeRewriteLocaleLanguage('zh-CN')).toBe('zh')
    expect(normalizeRewriteLocaleLanguage(undefined)).toBe('zh')
  })
})
