import { ref } from 'vue'
import { useToast } from './useToast'
import type { Ref } from 'vue'
import type { PromptService } from '../types'

export function usePromptTester(
  promptService: Ref<PromptService | null>,
  selectedTestModel: Ref<string>
) {
  const toast = useToast()
  
  // 状态
  const testContent = ref('')
  const testResult = ref('')
  const testError = ref('')
  const isTesting = ref(false)
  
  // 测试提示词
  const handleTest = async (optimizedPrompt: string) => {
    if (!promptService.value) {
      toast.error('服务未初始化，请稍后重试')
      return
    }
    
    if (!selectedTestModel.value || !testContent.value || !optimizedPrompt) {
      toast.error('请填写完整的测试信息')
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
            testError.value = error.message || '测试失败'
            isTesting.value = false
          }
        }
      )
    } catch (error: any) {
      console.error('测试失败:', error)
      testError.value = error.message || '测试过程中发生错误'
    } finally {
      isTesting.value = false
    }
  }

  return {
    // 状态
    testContent,
    testResult,
    testError,
    isTesting,
    
    // 方法
    handleTest
  }
} 