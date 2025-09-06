import { describe, it, expect, vi } from 'vitest'
import { useAccessibility } from '../../../src/composables/useAccessibility'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('useAccessibility 基础测试', () => {
  it('应该正确初始化', () => {
    const accessibility = useAccessibility('TestComponent')
    
    expect(accessibility).toBeDefined()
    expect(accessibility.aria).toBeDefined()
    expect(accessibility.aria.getLabel).toBeInstanceOf(Function)
  })
})