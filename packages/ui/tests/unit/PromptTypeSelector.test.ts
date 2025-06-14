import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PromptTypeSelector from '../../src/components/PromptTypeSelector.vue'

describe('PromptTypeSelector', () => {
  let wrapper: any
  let i18n: any

  beforeEach(() => {
    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          promptOptimizer: {
            promptType: 'Prompt Type',
            systemPrompt: 'System Prompt',
            userPrompt: 'User Prompt',
            systemPromptHelp: 'Optimize system prompts to define AI assistant role, behavior and response style',
            userPromptHelp: 'Optimize user prompts to improve AI interaction effectiveness and accuracy'
          }
        }
      }
    })
  })

  it('renders correctly with default props', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    expect(wrapper.find('.prompt-type-selector').exists()).toBe(true)
    expect(wrapper.text()).toContain('Prompt Type')
    expect(wrapper.text()).toContain('System Prompt')
    expect(wrapper.text()).toContain('User Prompt')
  })

  it('shows system prompt as active by default', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const systemButton = buttons[0]
    const userButton = buttons[1]

    expect(systemButton.attributes('aria-pressed')).toBe('true')
    expect(userButton.attributes('aria-pressed')).toBe('false')
  })

  it('shows user prompt as active when selected', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'user'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const systemButton = buttons[0]
    const userButton = buttons[1]

    expect(systemButton.attributes('aria-pressed')).toBe('false')
    expect(userButton.attributes('aria-pressed')).toBe('true')
  })

  it('emits update:modelValue when system prompt button is clicked', async () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'user'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const systemButton = buttons[0]

    await systemButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['system'])
  })

  it('emits update:modelValue when user prompt button is clicked', async () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const userButton = buttons[1]

    await userButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['user'])
  })

  it('emits change event when prompt type changes', async () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const userButton = buttons[1]

    await userButton.trigger('click')

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')[0]).toEqual(['user'])
  })

  it('does not emit events when clicking the already selected button', async () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')
    const systemButton = buttons[0]

    await systemButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('shows simplified design without help text', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    // Should show prompt type label and buttons, but no help text
    expect(wrapper.text()).toContain('Prompt Type')
    expect(wrapper.text()).toContain('System Prompt')
    expect(wrapper.text()).toContain('User Prompt')
    // Should not contain help text (simplified design)
    expect(wrapper.text()).not.toContain('Optimize system prompts to define AI assistant role')
  })

  it('maintains compact design for user prompt selection', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'user'
      },
      global: {
        plugins: [i18n]
      }
    })

    // Should show compact design without help text
    expect(wrapper.text()).toContain('Prompt Type')
    expect(wrapper.text()).toContain('System Prompt')
    expect(wrapper.text()).toContain('User Prompt')
    // Should not contain help text (simplified design)
    expect(wrapper.text()).not.toContain('Optimize user prompts to improve AI interaction')
  })

  it('has proper accessibility attributes', () => {
    wrapper = mount(PromptTypeSelector, {
      props: {
        modelValue: 'system'
      },
      global: {
        plugins: [i18n]
      }
    })

    const buttons = wrapper.findAll('button')

    buttons.forEach(button => {
      expect(button.attributes('aria-pressed')).toBeDefined()
      expect(button.attributes('title')).toBeDefined() // Using title instead of aria-label
    })
  })
})
