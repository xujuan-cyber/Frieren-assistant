import { ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import type { IPromptService } from '@prompt-optimizer/core'

export function usePromptTester(
  promptService: Ref<IPromptService | null>,
  selectedTestModel: Ref<string>
) {
  const toast = useToast()
  const { t } = useI18n()
  
  // States
  const testContent = ref('')
  const testResult = ref('')
  const testError = ref('')
  const isTesting = ref(false)
  
  // Test prompt
  const handleTest = async (optimizedPrompt: string) => {
    if (!promptService.value) {
      toast.error(t('toast.error.serviceInit'))
      return
    }
    
    if (!selectedTestModel.value || !testContent.value || !optimizedPrompt) {
      toast.error(t('toast.error.incompleteTestInfo'))
      return
    }

    isTesting.value = true
    testError.value = ''
    testResult.value = ''

    try {
      await promptService.value.testPromptStream(
        optimizedPrompt,
        testContent.value,
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
    handleTest
  }
} 