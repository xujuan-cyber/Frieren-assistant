import { ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import type { IPromptService, PromptType } from '@prompt-optimizer/core'

export function usePromptTester(
  promptService: Ref<IPromptService | null>,
  selectedTestModel: Ref<string>,
  promptType?: Ref<PromptType>,
  contextPrompt?: Ref<string>
) {
  const toast = useToast()
  const { t } = useI18n()
  
  // States
  const testContent = ref('')
  const testResult = ref('')
  const testError = ref('')
  const isTesting = ref(false)
  
  // Test prompt with context awareness
  const handleTest = async (optimizedPrompt: string) => {
    if (!promptService.value) {
      toast.error(t('toast.error.serviceInit'))
      return
    }

    if (!selectedTestModel.value || !optimizedPrompt) {
      toast.error(t('toast.error.incompleteTestInfo'))
      return
    }

    // For system prompt optimization, we need test content
    // For user prompt optimization, we don't need test content (the optimized prompt IS the user input)
    const currentPromptType = promptType?.value || 'system'
    if (currentPromptType === 'system' && !testContent.value) {
      toast.error(t('test.error.noTestContent'))
      return
    }

    isTesting.value = true
    testError.value = ''
    testResult.value = ''

    try {
      // Determine system and user prompts based on prompt type
      let systemPrompt = ''
      let userPrompt = ''

      if (currentPromptType === 'user') {
        // For user prompt optimization: context is system, optimized is user
        systemPrompt = contextPrompt?.value || ''
        userPrompt = optimizedPrompt
      } else {
        // For system prompt optimization: optimized is system, test content is user
        systemPrompt = optimizedPrompt
        userPrompt = testContent.value
      }

      // Use updated testPromptStream method with flexible parameters
      await promptService.value.testPromptStream(
        systemPrompt,
        userPrompt,
        selectedTestModel.value,
        {
          onToken: (token: string) => {
            testResult.value += token
          },
          onComplete: () => {
            isTesting.value = false
          },
          onError: (error: Error) => {
            testError.value = error.message || t('toast.error.testFailed')
            isTesting.value = false
          }
        }
      )
    } catch (error: any) {
      console.error(t('toast.error.testFailed'), error)
      testError.value = error.message || t('toast.error.testProcessError')
    } finally {
      isTesting.value = false
    }
  }

  // Test with explicit context (for advanced use cases)
  const handleTestWithContext = async (
    systemPrompt: string,
    userPrompt: string
  ) => {
    if (!promptService.value) {
      toast.error(t('toast.error.serviceInit'))
      return
    }

    if (!selectedTestModel.value || !userPrompt) {
      toast.error(t('toast.error.incompleteTestInfo'))
      return
    }

    isTesting.value = true
    testError.value = ''
    testResult.value = ''

    try {
      // Use updated testPromptStream method with flexible parameters
      await promptService.value.testPromptStream(
        systemPrompt,
        userPrompt,
        selectedTestModel.value,
        {
          onToken: (token: string) => {
            testResult.value += token
          },
          onComplete: () => {
            isTesting.value = false
          },
          onError: (error: Error) => {
            testError.value = error.message || t('toast.error.testFailed')
            isTesting.value = false
          }
        }
      )
    } catch (error: any) {
      console.error(t('toast.error.testFailed'), error)
      testError.value = error.message || t('toast.error.testProcessError')
    } finally {
      isTesting.value = false
    }
  }

  return {
    // States
    testContent,
    testResult,
    testError,
    isTesting,

    // Methods
    handleTest,
    handleTestWithContext
  }
} 