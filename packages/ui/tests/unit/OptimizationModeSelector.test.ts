import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OptimizationModeSelector from '../../src/components/OptimizationModeSelector.vue'
import { createI18n } from 'vue-i18n'

describe('OptimizationModeSelector', () => {
  const i18n = createI18n({
    locale: 'zh-CN',
    fallbackLocale: 'en-US',
    messages: {
      'zh-CN': {
        promptOptimizer: {
          systemPrompt: 'System Prompt',
          userPrompt: 'User Prompt',
          systemPromptHelp: 'Optimize system prompts to define AI assistant role',
          userPromptHelp: 'Optimize user prompts to improve AI interaction'
        }
      }
    }
  })

  it('renders correctly with text content', () => {
    const wrapper = mount(OptimizationModeSelector, {
      global: {
        plugins: [i18n]
      }
    })

    expect(wrapper.text()).toContain('System Prompt')
    expect(wrapper.text()).toContain('User Prompt')
  })
}) 