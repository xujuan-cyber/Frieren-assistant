import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('naive-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('naive-ui')>()

  return {
    ...actual,
    NButton: defineComponent({
      name: 'NButton',
      setup(_, { slots, attrs }) {
        return () => h('button', attrs, slots.default?.())
      },
    }),
    NPopover: defineComponent({
      name: 'NPopover',
      setup(_, { slots }) {
        return () =>
          h('div', { class: 'n-popover-stub' }, [
            h('div', { class: 'n-popover-trigger' }, slots.trigger?.()),
            h('div', { class: 'n-popover-content' }, slots.default?.()),
          ])
      },
    }),
    NTag: defineComponent({
      name: 'NTag',
      setup(_, { slots, attrs }) {
        return () => h('span', { class: 'n-tag-stub', ...attrs }, slots.default?.())
      },
    }),
    NText: defineComponent({
      name: 'NText',
      setup(_, { slots }) {
        return () => h('span', { class: 'n-text-stub' }, slots.default?.())
      },
    }),
  }
})

import AppHeaderActions from '../../../src/components/app-layout/AppHeaderActions.vue'

describe('AppHeaderActions about menu layout hooks', () => {
  it('renders the about popover with naive-themed panel content', () => {
    const wrapper = mount(AppHeaderActions, {
      props: {
        appVersion: 'v2.7.0',
      },
      global: {
        renderStubDefaultSlot: true,
        mocks: {
          $t: (key: string) => {
            const map: Record<string, string> = {
              'nav.templates': 'Templates',
              'nav.history': 'History',
              'nav.modelManager': 'Model Manager',
              'nav.favorites': 'Favorite Library',
              'nav.dataManager': 'Data Manager',
              'nav.variableManager': 'Variable Manager',
              'nav.about': 'About',
              'updater.viewOnGitHub': 'View on GitHub',
              'about.title': 'Prompt Optimizer',
              'about.website': 'Website',
              'about.websiteLabel': 'always200.com',
              'about.documentation': 'Docs',
              'about.documentationLabel': 'docs.always200.com',
            }
            return map[key] ?? key
          },
        },
        stubs: {
          ThemeToggleUI: true,
          LanguageSwitchDropdown: true,
          UpdaterIcon: true,
          ActionButtonUI: true,
        },
      },
    })

    expect(wrapper.find('.about-flyout').exists()).toBe(false)
    expect(wrapper.findAll('.about-chip')).toHaveLength(0)
    expect(wrapper.find('.about-panel').exists()).toBe(true)
    expect(wrapper.find('.about-version-tag').text()).toContain('v2.7.0')
    expect(wrapper.findAll('.about-link-button')).toHaveLength(2)
    expect(wrapper.text()).toContain('always200.com')
    expect(wrapper.text()).toContain('docs.always200.com')
  })
})
