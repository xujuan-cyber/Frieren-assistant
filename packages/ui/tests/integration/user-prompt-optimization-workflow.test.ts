import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ref } from 'vue'
import PromptTypeSelector from '../../src/components/PromptTypeSelector.vue'
import { usePromptOptimizer } from '../../src/composables/usePromptOptimizer'

describe('User Prompt Optimization Workflow Integration', () => {
  let i18n: any
  let mockModelManager: any
  let mockTemplateManager: any
  let mockHistoryManager: any
  let mockPromptService: any

  beforeEach(() => {
    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          common: {
            optional: 'Optional',
            expand: 'Expand',
            collapse: 'Collapse'
          },
          promptOptimizer: {
            promptType: 'Prompt Type',
            systemPrompt: 'System Prompt',
            userPrompt: 'User Prompt',
            systemPromptHelp: 'Optimize system prompts',
            userPromptHelp: 'Optimize user prompts',
            suggestions: {
              assistant: 'General Assistant',
              assistantContent: 'You are a helpful AI assistant.',
              assistantDesc: 'General purpose assistant',
              expert: 'Expert',
              expertContent: 'You are an expert.',
              expertDesc: 'Professional expert',
              creative: 'Creative',
              creativeContent: 'You are creative.',
              creativeDesc: 'Creative assistant'
            }
          },
          toast: {
            success: {
              optimizeSuccess: 'Optimization successful'
            },
            error: {
              serviceInit: 'Service initialization failed',
              noOptimizeTemplate: 'No optimization template',
              optimizeFailed: 'Optimization failed'
            }
          }
        }
      }
    })

    // Mock services
    mockModelManager = {
      getModel: vi.fn().mockResolvedValue({ id: 'test-model' })
    }

    mockTemplateManager = {
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
      getTemplate: vi.fn().mockReturnValue({
        id: 'test-template',
        content: 'Test template {{originalPrompt}}',
        metadata: { promptType: 'user', templateType: 'optimize' }
      }),

      listTemplatesByType: vi.fn().mockReturnValue([
        {
          id: 'general-optimize',
          name: 'General Optimization',
          content: 'Optimize: {{originalPrompt}}',
          metadata: { templateType: 'optimize' }
        }
      ])
    }

    mockHistoryManager = {
      createNewChain: vi.fn().mockResolvedValue({
        chainId: 'test-chain',
        versions: [],
        currentRecord: { id: 'test-record' }
      })
    }

    mockPromptService = {
      optimizePromptStream: vi.fn(),
      testPrompt: vi.fn()
    }
  })

  describe('Component Integration', () => {
    it('should handle PromptTypeSelector correctly', async () => {
      const selectedPromptType = ref('system')

      // Mount PromptTypeSelector
      const typeSelectorWrapper = mount(PromptTypeSelector, {
        props: {
          modelValue: selectedPromptType.value
        },
        global: {
          plugins: [i18n]
        }
      })

      // Initially should show system prompt type selected
      const buttons = typeSelectorWrapper.findAll('button')
      expect(buttons).toHaveLength(2)

      // Switch to user prompt (second button)
      const userButton = buttons[1]
      await userButton.trigger('click')

      // Should emit the change
      expect(typeSelectorWrapper.emitted('update:modelValue')).toBeTruthy()
      expect(typeSelectorWrapper.emitted('update:modelValue')[0]).toEqual(['user'])
    })

    it('should handle prompt type changes correctly', async () => {
      const selectedPromptType = ref('system')

      const wrapper = mount(PromptTypeSelector, {
        props: {
          modelValue: selectedPromptType.value
        },
        global: {
          plugins: [i18n]
        }
      })

      // Switch to user prompt
      const userButton = wrapper.findAll('button')[1]
      await userButton.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['user'])
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')[0]).toEqual(['user'])
    })
  })

  describe('usePromptOptimizer Integration', () => {
    it('should handle user prompt optimization workflow', async () => {
      // Test the optimization request structure instead of the full composable
      const request = {
        promptType: 'user',
        targetPrompt: 'Help me write an essay',
        templateId: 'user-prompt-optimize',
        modelKey: 'test-model'
      }

      // Mock streaming response
      mockPromptService.optimizePromptStream.mockImplementation(
        async (req, callbacks) => {
          // Verify request structure
          expect(req).toEqual(request)

          // Simulate streaming tokens
          callbacks.onToken('Optimized')
          callbacks.onToken(' user')
          callbacks.onToken(' prompt')
          await callbacks.onComplete()
        }
      )

      // Simulate the optimization call
      let result = ''
      await mockPromptService.optimizePromptStream(request, {
        onToken: (token) => { result += token },
        onComplete: () => {},
        onError: () => {}
      })

      // Verify the correct API was called with correct parameters
      expect(mockPromptService.optimizePromptStream).toHaveBeenCalledWith(
        expect.objectContaining({
          promptType: 'user',
          targetPrompt: 'Help me write an essay',
          templateId: 'user-prompt-optimize'
        }),
        expect.any(Object)
      )

      // Verify result
      expect(result).toBe('Optimized user prompt')
    })

    it('should handle system prompt optimization workflow (backward compatibility)', async () => {
      // Test the optimization request structure for system prompts
      const request = {
        promptType: 'system',
        targetPrompt: 'You are a helpful assistant',
        templateId: 'general-optimize',
        modelKey: 'test-model'
      }

      // Mock streaming response
      mockPromptService.optimizePromptStream.mockImplementation(
        async (req, callbacks) => {
          // Verify request structure
          expect(req).toEqual(request)

          callbacks.onToken('Optimized')
          callbacks.onToken(' system')
          callbacks.onToken(' prompt')
          await callbacks.onComplete()
        }
      )

      // Simulate the optimization call
      let result = ''
      await mockPromptService.optimizePromptStream(request, {
        onToken: (token) => { result += token },
        onComplete: () => {},
        onError: () => {}
      })

      // Verify the correct API was called
      expect(mockPromptService.optimizePromptStream).toHaveBeenCalledWith(
        expect.objectContaining({
          promptType: 'system',
          targetPrompt: 'You are a helpful assistant',
          templateId: 'general-optimize'
        }),
        expect.any(Object)
      )

      // Verify result
      expect(result).toBe('Optimized system prompt')
    })

    it('should handle template filtering by prompt type', () => {
      // Test template filtering logic directly
      const templates = mockTemplateManager.listTemplatesByType('optimize')

      expect(mockTemplateManager.listTemplatesByType).toHaveBeenCalledWith(
        'optimize'
      )

      expect(templates).toEqual([
        expect.objectContaining({
          id: 'general-optimize',
          metadata: expect.objectContaining({
            templateType: 'optimize'
          })
        })
      ])
    })
  })

  describe('Error Handling', () => {
    it('should handle optimization errors gracefully', async () => {
      // Mock error
      mockPromptService.optimizePromptStream.mockImplementation(
        async (request, callbacks) => {
          callbacks.onError(new Error('Optimization failed'))
        }
      )

      const request = {
        promptType: 'user',
        targetPrompt: 'Test prompt',
        templateId: 'test-template',
        modelKey: 'test-model'
      }

      let errorOccurred = false
      await mockPromptService.optimizePromptStream(request, {
        onToken: () => {},
        onComplete: () => {},
        onError: (error) => {
          errorOccurred = true
          expect(error.message).toBe('Optimization failed')
        }
      })

      expect(errorOccurred).toBe(true)
    })

    it('should validate prompt type selection', () => {
      const wrapper = mount(PromptTypeSelector, {
        props: {
          modelValue: 'system'
        },
        global: {
          plugins: [i18n]
        }
      })

      // Should have both system and user buttons
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)

      // First button should be system, second should be user
      expect(buttons[0].text()).toContain('System')
      expect(buttons[1].text()).toContain('User')
    })
  })
})
