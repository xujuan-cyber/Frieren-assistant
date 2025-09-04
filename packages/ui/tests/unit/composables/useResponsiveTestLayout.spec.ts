import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createApp } from 'vue'
import { useResponsiveTestLayout } from '../../../src/composables/useResponsiveTestLayout'

// Mock window对象
const mockWindow = {
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight
})

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: mockWindow.addEventListener
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: mockWindow.removeEventListener
})

describe('useResponsiveTestLayout', () => {
  let app: ReturnType<typeof createApp>
  
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置为默认值
    mockWindow.innerWidth = 1200
    mockWindow.innerHeight = 800
    
    // 创建Vue应用实例以提供组件上下文
    app = createApp({})
  })

  afterEach(() => {
    vi.clearAllTimers()
    app?.unmount()
  })

  const runWithComponent = (fn: () => any) => {
    let result: any
    const component = {
      setup() {
        result = fn()
        return {}
      },
      template: '<div></div>'
    }
    
    const instance = app.mount(document.createElement('div'))
    app.component('TestComponent', component)
    return result
  }

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const layout = useResponsiveTestLayout()
      
      expect(layout).toBeDefined()
      expect(layout.windowWidth).toBeDefined()
      expect(layout.windowHeight).toBeDefined()
      expect(layout.currentScreenSize).toBeDefined()
      expect(layout.testAreaConfig).toBeDefined()
    })

    it('应该设置事件监听器', () => {
      useResponsiveTestLayout()
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('应该支持禁用自动监听', () => {
      useResponsiveTestLayout({ enableAutoResize: false })
      expect(mockWindow.addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('屏幕尺寸检测', () => {
    it('应该正确检测大屏幕', () => {
      mockWindow.innerWidth = 1200
      const layout = useResponsiveTestLayout()
      
      expect(layout.currentScreenSize.value).toBe('xl')
      expect(layout.isDesktop.value).toBe(true)
      expect(layout.isMobile.value).toBe(false)
      expect(layout.isTablet.value).toBe(false)
    })

    it('应该正确检测中等屏幕', () => {
      mockWindow.innerWidth = 768
      const layout = useResponsiveTestLayout()
      
      expect(layout.currentScreenSize.value).toBe('md')
      expect(layout.isTablet.value).toBe(true)
      expect(layout.isMobile.value).toBe(false)
      expect(layout.isDesktop.value).toBe(false)
    })

    it('应该正确检测小屏幕', () => {
      mockWindow.innerWidth = 400
      const layout = useResponsiveTestLayout()
      
      expect(layout.currentScreenSize.value).toBe('xs')
      expect(layout.isMobile.value).toBe(true)
      expect(layout.isTablet.value).toBe(false)
      expect(layout.isDesktop.value).toBe(false)
    })

    it('应该正确检测超大屏幕', () => {
      mockWindow.innerWidth = 1800
      const layout = useResponsiveTestLayout()
      
      expect(layout.currentScreenSize.value).toBe('xxl')
      expect(layout.isLargeScreen.value).toBe(true)
    })
  })

  describe('智能配置生成', () => {
    it('应该为移动端生成合适的配置', () => {
      mockWindow.innerWidth = 400
      const layout = useResponsiveTestLayout()
      
      expect(layout.smartComponentSize.value).toBe('small')
      expect(layout.smartButtonSize.value).toBe('small')
      expect(layout.recommendedInputMode.value).toBe('compact')
      expect(layout.recommendedControlBarLayout.value).toBe('minimal')
    })

    it('应该为平板生成合适的配置', () => {
      mockWindow.innerWidth = 768
      const layout = useResponsiveTestLayout()
      
      expect(layout.smartComponentSize.value).toBe('medium')
      expect(layout.smartButtonSize.value).toBe('medium')
      expect(layout.recommendedInputMode.value).toBe('normal')
      expect(layout.recommendedControlBarLayout.value).toBe('compact')
    })

    it('应该为桌面端生成合适的配置', () => {
      mockWindow.innerWidth = 1200
      const layout = useResponsiveTestLayout()
      
      expect(layout.smartComponentSize.value).toBe('large')
      expect(layout.smartButtonSize.value).toBe('medium')
      expect(layout.recommendedInputMode.value).toBe('normal')
      expect(layout.recommendedControlBarLayout.value).toBe('default')
    })
  })

  describe('Grid配置', () => {
    it('应该生成正确的Grid响应式配置', () => {
      const layout = useResponsiveTestLayout()
      const config = layout.gridResponsiveConfig.value
      
      expect(config.modelSelectSpan.xs).toBe(24)
      expect(config.modelSelectSpan.lg).toBe(8)
      expect(config.controlButtonsSpan.xs).toBe(24)
      expect(config.controlButtonsSpan.lg).toBe(16)
    })

    it('应该根据屏幕尺寸调整Grid配置', () => {
      mockWindow.innerWidth = 400 // xs
      const layout = useResponsiveTestLayout()
      const config = layout.gridResponsiveConfig.value
      
      // 在小屏幕上，所有元素都应该占满宽度
      expect(config.modelSelectSpan.xs).toBe(24)
      expect(config.controlButtonsSpan.xs).toBe(24)
    })
  })

  describe('高度配置', () => {
    it('应该根据屏幕高度计算高度配置', () => {
      mockWindow.innerHeight = 600
      const layout = useResponsiveTestLayout()
      const heights = layout.responsiveHeights.value
      
      expect(heights.testInputMin).toBeGreaterThan(0)
      expect(heights.testInputMax).toBeGreaterThan(heights.testInputMin)
      expect(heights.conversationMax).toMatch(/\d+px/)
    })

    it('应该为移动端调整高度配置', () => {
      mockWindow.innerWidth = 400
      mockWindow.innerHeight = 600
      const layout = useResponsiveTestLayout()
      const heights = layout.responsiveHeights.value
      
      expect(heights.testInputMin).toBe(2)
      expect(heights.testInputMax).toBe(4)
      expect(heights.conversationMax).toBe('200px')
    })
  })

  describe('完整配置对象', () => {
    it('应该生成完整的TestAreaConfig', () => {
      const layout = useResponsiveTestLayout()
      const config = layout.testAreaConfig.value
      
      expect(config).toHaveProperty('layout')
      expect(config).toHaveProperty('features')
      expect(config).toHaveProperty('heights')
      expect(config).toHaveProperty('responsive')
      
      expect(config.layout.inputMode).toBeDefined()
      expect(config.layout.controlBarLayout).toBeDefined()
      expect(config.layout.buttonSize).toBeDefined()
    })

    it('应该生成合适的功能开关配置', () => {
      // 移动端配置
      mockWindow.innerWidth = 400
      const mobileLayout = useResponsiveTestLayout()
      const mobileConfig = mobileLayout.testAreaConfig.value
      
      expect(mobileConfig.features.compareMode).toBe(false) // 移动端不建议对比模式
      expect(mobileConfig.layout.enableFullscreen).toBe(false) // 移动端不建议全屏编辑
      
      // 桌面端配置
      mockWindow.innerWidth = 1200
      const desktopLayout = useResponsiveTestLayout()
      const desktopConfig = desktopLayout.testAreaConfig.value
      
      expect(desktopConfig.features.compareMode).toBe(true)
      expect(desktopConfig.features.advancedMode).toBe(true)
      expect(desktopConfig.layout.enableFullscreen).toBe(true)
    })
  })

  describe('工具方法', () => {
    it('recalculate应该触发重新计算', () => {
      const layout = useResponsiveTestLayout()
      
      const originalWidth = layout.windowWidth.value
      mockWindow.innerWidth = 800
      
      layout.recalculate()
      
      expect(layout.windowWidth.value).toBe(800)
    })

    it('getConfigForBreakpoint应该返回特定断点的配置', () => {
      const layout = useResponsiveTestLayout()
      
      const xsConfig = layout.getConfigForBreakpoint('xs')
      const lgConfig = layout.getConfigForBreakpoint('lg')
      
      expect(xsConfig).toBeDefined()
      expect(lgConfig).toBeDefined()
      expect(xsConfig).toEqual(lgConfig) // 当前实现返回相同配置
    })
  })

  describe('自定义配置', () => {
    it('应该支持初始配置覆盖', () => {
      const customConfig = {
        layout: {
          buttonSize: 'large' as const
        }
      }
      
      const layout = useResponsiveTestLayout({ initialConfig: customConfig })
      const config = layout.testAreaConfig.value
      
      expect(config.layout.buttonSize).toBe('large')
    })

    it('应该支持自定义断点', () => {
      const customBreakpoints = {
        md: 900
      }
      
      const layout = useResponsiveTestLayout({ customBreakpoints })
      
      expect(layout.breakpoints.md).toBe(900)
    })
  })

  describe('响应式行为', () => {
    it('应该响应窗口大小变化', async () => {
      const layout = useResponsiveTestLayout()
      
      const initialSize = layout.currentScreenSize.value
      
      // 模拟窗口大小变化
      mockWindow.innerWidth = 500
      layout.recalculate()
      
      expect(layout.currentScreenSize.value).not.toBe(initialSize)
      expect(layout.currentScreenSize.value).toBe('xs')
    })

    it('应该正确更新配置', async () => {
      const layout = useResponsiveTestLayout()
      
      // 桌面端配置
      mockWindow.innerWidth = 1200
      layout.recalculate()
      const desktopConfig = layout.testAreaConfig.value
      
      // 移动端配置
      mockWindow.innerWidth = 400
      layout.recalculate()
      const mobileConfig = layout.testAreaConfig.value
      
      expect(desktopConfig.layout.inputMode).toBe('normal')
      expect(mobileConfig.layout.inputMode).toBe('compact')
    })
  })

  describe('边界情况', () => {
    it('应该处理极端窗口尺寸', () => {
      // 极小窗口
      mockWindow.innerWidth = 100
      mockWindow.innerHeight = 100
      
      const layout = useResponsiveTestLayout()
      
      expect(layout.currentScreenSize.value).toBe('xs')
      expect(layout.responsiveHeights.value.resultAreaMax).toBe('200px') // 最小高度
    })

    it('应该处理未定义的window对象', () => {
      // 在服务端渲染环境中测试
      const originalWindow = global.window
      delete (global as any).window
      
      const layout = useResponsiveTestLayout()
      expect(layout.windowWidth.value).toBe(1200) // 默认值
      expect(layout.windowHeight.value).toBe(800) // 默认值
      
      global.window = originalWindow
    })
  })
})