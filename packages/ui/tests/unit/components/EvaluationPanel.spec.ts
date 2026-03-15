import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EvaluationPanel from '../../../src/components/evaluation/EvaluationPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const naiveStubs = {
  NDrawer: {
    name: 'NDrawer',
    template: '<div v-if="show" class="n-drawer"><slot /></div>',
    props: ['show', 'width', 'placement', 'onUpdateShow'],
  },
  NDrawerContent: {
    name: 'NDrawerContent',
    template: '<section class="n-drawer-content"><slot /><slot name="footer" /></section>',
    props: ['title', 'closable'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'justify', 'align'],
  },
  NCard: {
    name: 'NCard',
    template: '<div class="n-card"><slot /><slot name="header" /></div>',
    props: ['title', 'size', 'embedded', 'bordered'],
  },
  NText: {
    name: 'NText',
    template: '<span><slot /></span>',
    props: ['depth', 'type'],
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'disabled', 'loading', 'quaternary'],
    emits: ['click'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<span class="n-icon"><slot /></span>',
    props: ['size', 'depth'],
  },
  NProgress: {
    name: 'NProgress',
    template: '<div class="n-progress" />',
    props: ['percentage', 'status', 'showIndicator', 'height'],
  },
  NResult: {
    name: 'NResult',
    template: '<div class="n-result"><slot /><slot name="footer" /></div>',
    props: ['status', 'title'],
  },
  NSpin: {
    name: 'NSpin',
    template: '<div class="n-spin" />',
    props: ['size'],
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty"><slot /><slot name="icon" /></div>',
    props: ['description'],
  },
  NAlert: {
    name: 'NAlert',
    template: '<div class="n-alert"><slot /></div>',
    props: ['type', 'bordered'],
  },
  NList: {
    name: 'NList',
    template: '<div class="n-list"><slot /></div>',
  },
  NListItem: {
    name: 'NListItem',
    template: '<div class="n-list-item"><slot /></div>',
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'size', 'round', 'bordered'],
  },
}

const baseResult = {
  type: 'compare',
  score: {
    overall: 85,
    dimensions: [
      { key: 'goal', label: '目标达成度', score: 90 },
    ],
  },
  summary: 'summary',
  improvements: [],
  patchPlan: [],
}

describe('EvaluationPanel stale state', () => {
  it('shows stale warning when detail result is outdated', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        stale: true,
        staleMessage: '当前测试配置或工作区内容已变更，这份对比评估基于旧快照。',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
        },
      },
    })

    expect(wrapper.text()).toContain('当前测试配置或工作区内容已变更，这份对比评估基于旧快照。')
    expect(wrapper.find('.n-alert').exists()).toBe(true)
  })

  it('disables feedback and re-evaluate actions when detail is stale and not re-runnable', async () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        stale: true,
        staleMessage: '当前测试配置或工作区内容已变更，这份对比评估基于旧快照。',
        disableEvaluate: true,
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: {
            name: 'FeedbackEditor',
            template: '<div class="feedback-editor" :data-disabled="String(disabled)" />',
            props: ['modelValue', 'showActions', 'disabled'],
          },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
        },
      },
    })

    const reEvaluateButton = wrapper.get('[data-testid="evaluation-panel-re-evaluate"]')
    expect(reEvaluateButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.feedback-editor').attributes('data-disabled')).toBe('true')

    await reEvaluateButton.trigger('click')
    expect(wrapper.emitted('re-evaluate')).toBeFalsy()
    expect(wrapper.emitted('evaluate-with-feedback')).toBeFalsy()
  })
})
