import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useTestModeConfig } from '../../../src/composables/useTestModeConfig'

// Mock OptimizationMode type
type OptimizationMode = 'system' | 'user'

describe('useTestModeConfig', () => {
  let optimizationMode: ReturnType<typeof ref<OptimizationMode>>

  beforeEach(() => {
    optimizationMode = ref<OptimizationMode>('system')
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig).toBeDefined()
      expect(testModeConfig.currentModeConfig).toBeDefined()
      expect(testModeConfig.showTestInput).toBeDefined()
      expect(testModeConfig.canStartTest).toBeDefined()
    })

    it('应该提供正确的配置对象结构', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.currentModeConfig.value).toHaveProperty('showTestInput')
      expect(testModeConfig.currentModeConfig.value).toHaveProperty('enableCompareMode')
      expect(testModeConfig.currentModeConfig.value).toHaveProperty('inputLabel')
      expect(testModeConfig.currentModeConfig.value).toHaveProperty('canStartTest')
    })
  })

  describe('system模式', () => {
    beforeEach(() => {
      optimizationMode.value = 'system'
    })

    it('应该显示测试输入', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.showTestInput.value).toBe(true)
    })

    it('应该要求测试内容', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.requiresTestContent.value).toBe(true)
    })

    it('应该有正确的输入标签', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.inputLabel.value).toBe('test.content')
    })

    it('应该有正确的验证逻辑', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const canStartWithContent = testModeConfig.canStartTest.value('test content', true)
      const canStartWithoutContent = testModeConfig.canStartTest.value('', true)
      const canStartWithoutPrompt = testModeConfig.canStartTest.value('test content', false)
      
      expect(canStartWithContent).toBe(true)
      expect(canStartWithoutContent).toBe(false)
      expect(canStartWithoutPrompt).toBe(false)
    })
  })

  describe('user模式', () => {
    beforeEach(() => {
      optimizationMode.value = 'user'
    })

    it('应该隐藏测试输入', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.showTestInput.value).toBe(false)
    })

    it('应该不要求测试内容', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.requiresTestContent.value).toBe(false)
    })

    it('应该有正确的输入标签', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.inputLabel.value).toBe('test.userPromptTest')
    })

    it('应该有正确的验证逻辑', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const canStartWithPrompt = testModeConfig.canStartTest.value('', true)
      const canStartWithoutPrompt = testModeConfig.canStartTest.value('test content', false)
      
      expect(canStartWithPrompt).toBe(true)
      expect(canStartWithoutPrompt).toBe(false)
    })
  })

  describe('响应式行为', () => {
    it('应该响应optimizationMode的变化', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      // 初始为system模式
      expect(testModeConfig.showTestInput.value).toBe(true)
      
      // 切换到user模式
      optimizationMode.value = 'user'
      expect(testModeConfig.showTestInput.value).toBe(false)
      
      // 切换回system模式
      optimizationMode.value = 'system'
      expect(testModeConfig.showTestInput.value).toBe(true)
    })

    it('当模式变化时应该更新配置', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const systemConfig = testModeConfig.currentModeConfig.value
      
      optimizationMode.value = 'user'
      const userConfig = testModeConfig.currentModeConfig.value
      
      expect(systemConfig).not.toEqual(userConfig)
      expect(systemConfig.showTestInput).toBe(true)
      expect(userConfig.showTestInput).toBe(false)
    })
  })

  describe('工具函数', () => {
    it('getDynamicButtonText应该返回正确的按钮文本', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      expect(testModeConfig.getDynamicButtonText(false, false)).toBe('test.startTest')
      expect(testModeConfig.getDynamicButtonText(true, false)).toBe('test.startCompare')
      expect(testModeConfig.getDynamicButtonText(false, true)).toBe('test.testing')
    })

    it('validateTestSetup应该正确验证设置', () => {
      optimizationMode.value = 'system'
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const validSetup = testModeConfig.validateTestSetup('test content', true)
      const invalidSetup = testModeConfig.validateTestSetup('', true)
      const noPrompt = testModeConfig.validateTestSetup('test content', false)
      
      expect(validSetup.isValid).toBe(true)
      expect(validSetup.errors).toHaveLength(0)
      
      expect(invalidSetup.isValid).toBe(false)
      expect(invalidSetup.errors).toContain('需要提供测试内容')
      
      expect(noPrompt.isValid).toBe(false)
      expect(noPrompt.errors).toContain('需要提供提示词')
    })

    it('getModeConfig应该返回指定模式的配置', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const systemConfig = testModeConfig.getModeConfig('system')
      const userConfig = testModeConfig.getModeConfig('user')
      
      expect(systemConfig.showTestInput).toBe(true)
      expect(userConfig.showTestInput).toBe(false)
    })

    it('checkModeCompatibility应该检查模式兼容性', () => {
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const compatibility = testModeConfig.checkModeCompatibility('system', 'user')
      
      expect(compatibility.requiresTestContentChange).toBe(true)
      expect(compatibility.requiresUIReset).toBe(true)
    })
  })

  describe('高级功能配置', () => {
    it('应该支持禁用高级功能', () => {
      const testModeConfig = useTestModeConfig(optimizationMode, {
        enableAdvancedFeatures: false
      })
      
      expect(testModeConfig.showConversationManager.value).toBe(false)
    })

    it('应该支持自定义模式配置', () => {
      const customConfig = {
        system: {
          inputLabel: 'custom.label'
        }
      }
      
      const testModeConfig = useTestModeConfig(optimizationMode, {
        customModeConfig: customConfig
      })
      
      expect(testModeConfig.inputLabel.value).toBe('custom.label')
    })

    it('应该支持默认覆盖', () => {
      const testModeConfig = useTestModeConfig(optimizationMode, {
        defaultOverrides: {
          enableCompareMode: false
        }
      })
      
      expect(testModeConfig.enableCompareMode.value).toBe(false)
    })
  })

  describe('帮助信息', () => {
    it('应该提供system模式的帮助信息', () => {
      optimizationMode.value = 'system'
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const helpInfo = testModeConfig.getModeHelpInfo.value
      
      expect(helpInfo.title).toBe('系统提示词测试模式')
      expect(helpInfo.requirements).toContain('需要提供测试内容作为用户问题')
      expect(helpInfo.features).toContain('智能输入框')
    })

    it('应该提供user模式的帮助信息', () => {
      optimizationMode.value = 'user'
      const testModeConfig = useTestModeConfig(optimizationMode)
      
      const helpInfo = testModeConfig.getModeHelpInfo.value
      
      expect(helpInfo.title).toBe('用户提示词测试模式')
      expect(helpInfo.requirements).toContain('无需额外测试内容')
      expect(helpInfo.features).toContain('简化界面')
    })
  })
})