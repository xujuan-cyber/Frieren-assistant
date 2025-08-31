// Naive UI 主题配置 - 全面基于 Naive UI 的 themeOverrides 系统
import { computed, ref } from 'vue'
import { darkTheme, lightTheme, type GlobalThemeOverrides, type GlobalTheme } from 'naive-ui'

// 当前主题ID
export const currentThemeId = ref<string>('light')

// 主题类型定义
export interface ThemeConfig {
  id: string
  name: string
  naiveTheme: GlobalTheme | null
  themeOverrides: GlobalThemeOverrides
}

// 纯Naive UI主题配置 - 完全消除CSS依赖
export const naiveThemeConfigs: Record<string, ThemeConfig> = {
  light: {
    id: 'light',
    name: '日间模式',
    naiveTheme: lightTheme,
    themeOverrides: {
      common: {
        primaryColor: '#0ea5e9',
        primaryColorHover: '#0284c7',
        primaryColorPressed: '#0369a1',
        primaryColorSuppl: '#38bdf8',
        successColor: '#059669',
        successColorHover: '#047857',
        successColorPressed: '#065f46',
        successColorSuppl: '#dcfce7',
        errorColor: '#dc2626',
        errorColorHover: '#b91c1c',
        errorColorPressed: '#991b1b',
        errorColorSuppl: '#fee2e2',
      }
    }
  },

  dark: {
    id: 'dark', 
    name: '夜间模式',
    naiveTheme: darkTheme,
    themeOverrides: {
      common: {
        primaryColor: '#64748b',
        primaryColorHover: '#475569',
        primaryColorPressed: '#334155',
        primaryColorSuppl: '#94a3b8',
        successColor: '#22c55e',
        successColorHover: '#16a34a',
        successColorPressed: '#15803d',
        successColorSuppl: '#22543d',
        errorColor: '#ef4444',
        errorColorHover: '#dc2626',
        errorColorPressed: '#b91c1c',
        errorColorSuppl: '#7f1d1d',
      }
    }
  },

  blue: {
    id: 'blue',
    name: '蓝色模式',
    naiveTheme: lightTheme,
    themeOverrides: {
      common: {
        primaryColor: '#0ea5e9',
        primaryColorHover: '#0284c7',
        primaryColorPressed: '#0369a1',
        primaryColorSuppl: '#38bdf8',
        // 蓝色主题的背景色调整
        bodyColor: '#f0f9ff',
        cardColor: '#e0f2fe',
        modalColor: '#e0f2fe',
        popoverColor: '#e0f2fe',
        tableColor: '#f8fafc',
        // 蓝色主题的文本调整
        textColorBase: '#0c4a6e',
        textColor1: '#0c4a6e',
        textColor2: '#075985',
        textColor3: '#0369a1',
        placeholderColor: '#64748b',
        // 边框调整
        borderColor: '#7dd3fc',
        dividerColor: '#bae6fd',
        // 成功和错误颜色
        successColor: '#059669',
        successColorHover: '#047857',
        successColorPressed: '#065f46',
        successColorSuppl: '#dcfce7',
        errorColor: '#dc2626',
        errorColorHover: '#b91c1c',
        errorColorPressed: '#991b1b',
        errorColorSuppl: '#fee2e2',
      },
      Button: {
        textColorPrimary: '#ffffff',
        colorPrimary: '#0ea5e9',
        colorHoverPrimary: '#0284c7',
        colorPressedPrimary: '#0369a1',
        colorFocusPrimary: '#0ea5e9',
      }
    }
  },

  green: {
    id: 'green',
    name: '绿色模式',
    naiveTheme: darkTheme,
    themeOverrides: {
      common: {
        primaryColor: '#14b8a6',
        primaryColorHover: '#0d9488',
        primaryColorPressed: '#0f766e',
        primaryColorSuppl: '#5eead4',
        // 完整的背景色系
        bodyColor: '#0f1e1a',
        cardColor: '#1a2e25',
        modalColor: '#1a2e25',
        popoverColor: '#1a2e25',
        tableColor: '#1a2e25',
        tableHeaderColor: '#134e4a',
        inputColor: '#1a2e25',
        codeColor: '#134e4a',
        tabColor: '#134e4a',
        actionColor: '#134e4a',
        // 完整的文本色系
        textColorBase: '#e5f3f0',
        textColor1: 'rgba(229, 243, 240, 0.9)',
        textColor2: 'rgba(229, 243, 240, 0.82)',
        textColor3: 'rgba(229, 243, 240, 0.52)',
        textColorDisabled: 'rgba(229, 243, 240, 0.38)',
        placeholderColor: 'rgba(229, 243, 240, 0.6)',
        placeholderColorDisabled: 'rgba(229, 243, 240, 0.4)',
        iconColor: 'rgba(229, 243, 240, 0.7)',
        iconColorHover: 'rgba(229, 243, 240, 0.8)',
        iconColorPressed: 'rgba(229, 243, 240, 0.9)',
        iconColorDisabled: 'rgba(229, 243, 240, 0.4)',
        // 边框和分割线
        borderColor: 'rgba(20, 184, 166, 0.24)',
        dividerColor: 'rgba(20, 184, 166, 0.12)',
        // 滚动条
        scrollbarColor: 'rgba(20, 184, 166, 0.3)',
        scrollbarColorHover: 'rgba(20, 184, 166, 0.5)',
        // 其他交互色
        closeIconColor: 'rgba(229, 243, 240, 0.6)',
        closeIconColorHover: 'rgba(229, 243, 240, 0.8)',
        closeIconColorPressed: 'rgba(229, 243, 240, 0.9)',
        clearColor: 'rgba(229, 243, 240, 0.6)',
        clearColorHover: 'rgba(229, 243, 240, 0.8)',
        clearColorPressed: 'rgba(229, 243, 240, 0.9)',
        
        successColor: '#22c55e',
        successColorHover: '#16a34a',
        successColorPressed: '#15803d',
        successColorSuppl: '#22543d',
        errorColor: '#ef4444',
        errorColorHover: '#dc2626',
        errorColorPressed: '#b91c1c',
        errorColorSuppl: '#7f1d1d',
      },
      Button: {
        textColorPrimary: '#ffffff',
        textColorHoverPrimary: '#ffffff',
        textColorPressedPrimary: '#ffffff',
        textColorFocusPrimary: '#ffffff',
        textColorDisabledPrimary: '#ffffff',
        colorPrimary: '#14b8a6',
        colorHoverPrimary: '#0d9488',
        colorPressedPrimary: '#0f766e',
        colorFocusPrimary: '#14b8a6',
        colorDisabledPrimary: 'rgba(20, 184, 166, 0.5)',
        borderPrimary: '1px solid #14b8a6',
        borderHoverPrimary: '1px solid #0d9488',
        borderPressedPrimary: '1px solid #0f766e',
        borderFocusPrimary: '1px solid #14b8a6',
        borderDisabledPrimary: '1px solid rgba(20, 184, 166, 0.5)',
        rippleColorPrimary: '#14b8a6',
        // 次要按钮
        textColor: 'rgba(229, 243, 240, 0.9)',
        textColorHover: 'rgba(229, 243, 240, 0.9)',
        textColorPressed: 'rgba(229, 243, 240, 0.9)',
        color: '#1a2e25',
        colorHover: '#134e4a',
        colorPressed: '#0f3730',
        border: '1px solid rgba(20, 184, 166, 0.24)',
        borderHover: '1px solid rgba(20, 184, 166, 0.36)',
        borderPressed: '1px solid rgba(20, 184, 166, 0.48)',
      },
      Input: {
        color: '#1a2e25',
        colorDisabled: '#1a2e25',
        colorFocus: '#1a2e25',
        textColor: 'rgba(229, 243, 240, 0.9)',
        textColorDisabled: 'rgba(229, 243, 240, 0.6)',
        placeholderColor: 'rgba(229, 243, 240, 0.6)',
        placeholderColorDisabled: 'rgba(229, 243, 240, 0.4)',
        iconColor: 'rgba(229, 243, 240, 0.7)',
        iconColorHover: 'rgba(229, 243, 240, 0.8)',
        iconColorPressed: 'rgba(229, 243, 240, 0.9)',
        iconColorDisabled: 'rgba(229, 243, 240, 0.4)',
        clearColor: 'rgba(229, 243, 240, 0.6)',
        clearColorHover: 'rgba(229, 243, 240, 0.8)',
        clearColorPressed: 'rgba(229, 243, 240, 0.9)',
        border: '1px solid rgba(20, 184, 166, 0.24)',
        borderDisabled: '1px solid rgba(20, 184, 166, 0.12)',
        borderHover: '1px solid rgba(20, 184, 166, 0.36)',
        borderFocus: '1px solid #14b8a6',
        boxShadowFocus: '0 0 0 2px rgba(20, 184, 166, 0.2)',
        loadingColor: '#14b8a6',
        // 前缀后缀
        suffixTextColor: 'rgba(229, 243, 240, 0.7)',
        prefixTextColor: 'rgba(229, 243, 240, 0.7)',
      },
      Card: {
        color: '#1a2e25',
        colorModal: '#1a2e25',
        colorTarget: '#1a2e25',
        textColor: 'rgba(229, 243, 240, 0.9)',
        titleTextColor: 'rgba(229, 243, 240, 0.9)',
        borderColor: 'rgba(20, 184, 166, 0.24)',
        actionColor: '#134e4a',
        closeIconColor: 'rgba(229, 243, 240, 0.6)',
        closeIconColorHover: 'rgba(229, 243, 240, 0.8)',
        closeIconColorPressed: 'rgba(229, 243, 240, 0.9)',
      },
      Menu: {
        color: '#1a2e25',
        itemColorHover: 'rgba(20, 184, 166, 0.1)',
        itemColorActive: 'rgba(20, 184, 166, 0.2)',
        itemTextColor: 'rgba(229, 243, 240, 0.9)',
        itemTextColorHover: 'rgba(229, 243, 240, 1)',
        itemTextColorActive: '#ffffff',
        itemIconColor: 'rgba(229, 243, 240, 0.7)',
        itemIconColorHover: 'rgba(229, 243, 240, 0.8)',
        itemIconColorActive: '#ffffff',
        arrowColor: 'rgba(229, 243, 240, 0.7)',
        arrowColorHover: 'rgba(229, 243, 240, 0.8)',
        arrowColorActive: '#ffffff',
      }
    }
  },

  purple: {
    id: 'purple',
    name: '暗紫模式',
    naiveTheme: darkTheme,
    themeOverrides: {
      common: {
        primaryColor: '#a855f7',
        primaryColorHover: '#9333ea',
        primaryColorPressed: '#7c3aed',
        primaryColorSuppl: '#c4b5fd',
        // 完整的背景色系
        bodyColor: '#1a0f2e',
        cardColor: '#251a35',
        modalColor: '#251a35',
        popoverColor: '#251a35',
        tableColor: '#251a35',
        tableHeaderColor: '#581c87',
        inputColor: '#251a35',
        codeColor: '#581c87',
        tabColor: '#581c87',
        actionColor: '#581c87',
        // 完整的文本色系
        textColorBase: '#f0e5ff',
        textColor1: 'rgba(240, 229, 255, 0.9)',
        textColor2: 'rgba(240, 229, 255, 0.82)',
        textColor3: 'rgba(240, 229, 255, 0.52)',
        textColorDisabled: 'rgba(240, 229, 255, 0.38)',
        placeholderColor: 'rgba(240, 229, 255, 0.6)',
        placeholderColorDisabled: 'rgba(240, 229, 255, 0.4)',
        iconColor: 'rgba(240, 229, 255, 0.7)',
        iconColorHover: 'rgba(240, 229, 255, 0.8)',
        iconColorPressed: 'rgba(240, 229, 255, 0.9)',
        iconColorDisabled: 'rgba(240, 229, 255, 0.4)',
        // 边框和分割线
        borderColor: 'rgba(168, 85, 247, 0.24)',
        dividerColor: 'rgba(168, 85, 247, 0.12)',
        // 滚动条
        scrollbarColor: 'rgba(168, 85, 247, 0.3)',
        scrollbarColorHover: 'rgba(168, 85, 247, 0.5)',
        // 其他交互色
        closeIconColor: 'rgba(240, 229, 255, 0.6)',
        closeIconColorHover: 'rgba(240, 229, 255, 0.8)',
        closeIconColorPressed: 'rgba(240, 229, 255, 0.9)',
        clearColor: 'rgba(240, 229, 255, 0.6)',
        clearColorHover: 'rgba(240, 229, 255, 0.8)',
        clearColorPressed: 'rgba(240, 229, 255, 0.9)',
        
        successColor: '#22c55e',
        successColorHover: '#16a34a',
        successColorPressed: '#15803d',
        successColorSuppl: '#22543d',
        errorColor: '#ef4444',
        errorColorHover: '#dc2626',
        errorColorPressed: '#b91c1c',
        errorColorSuppl: '#7f1d1d',
      },
      Button: {
        textColorPrimary: '#ffffff',
        textColorHoverPrimary: '#ffffff',
        textColorPressedPrimary: '#ffffff',
        textColorFocusPrimary: '#ffffff',
        textColorDisabledPrimary: '#ffffff',
        colorPrimary: '#a855f7',
        colorHoverPrimary: '#9333ea',
        colorPressedPrimary: '#7c3aed',
        colorFocusPrimary: '#a855f7',
        colorDisabledPrimary: 'rgba(168, 85, 247, 0.5)',
        borderPrimary: '1px solid #a855f7',
        borderHoverPrimary: '1px solid #9333ea',
        borderPressedPrimary: '1px solid #7c3aed',
        borderFocusPrimary: '1px solid #a855f7',
        borderDisabledPrimary: '1px solid rgba(168, 85, 247, 0.5)',
        rippleColorPrimary: '#a855f7',
        // 次要按钮
        textColor: 'rgba(240, 229, 255, 0.9)',
        textColorHover: 'rgba(240, 229, 255, 0.9)',
        textColorPressed: 'rgba(240, 229, 255, 0.9)',
        color: '#251a35',
        colorHover: '#581c87',
        colorPressed: '#6b21a8',
        border: '1px solid rgba(168, 85, 247, 0.24)',
        borderHover: '1px solid rgba(168, 85, 247, 0.36)',
        borderPressed: '1px solid rgba(168, 85, 247, 0.48)',
      },
      Input: {
        color: '#251a35',
        colorDisabled: '#251a35',
        colorFocus: '#251a35',
        textColor: 'rgba(240, 229, 255, 0.9)',
        textColorDisabled: 'rgba(240, 229, 255, 0.6)',
        placeholderColor: 'rgba(240, 229, 255, 0.6)',
        placeholderColorDisabled: 'rgba(240, 229, 255, 0.4)',
        iconColor: 'rgba(240, 229, 255, 0.7)',
        iconColorHover: 'rgba(240, 229, 255, 0.8)',
        iconColorPressed: 'rgba(240, 229, 255, 0.9)',
        iconColorDisabled: 'rgba(240, 229, 255, 0.4)',
        clearColor: 'rgba(240, 229, 255, 0.6)',
        clearColorHover: 'rgba(240, 229, 255, 0.8)',
        clearColorPressed: 'rgba(240, 229, 255, 0.9)',
        border: '1px solid rgba(168, 85, 247, 0.24)',
        borderDisabled: '1px solid rgba(168, 85, 247, 0.12)',
        borderHover: '1px solid rgba(168, 85, 247, 0.36)',
        borderFocus: '1px solid #a855f7',
        boxShadowFocus: '0 0 0 2px rgba(168, 85, 247, 0.2)',
        loadingColor: '#a855f7',
        // 前缀后缀
        suffixTextColor: 'rgba(240, 229, 255, 0.7)',
        prefixTextColor: 'rgba(240, 229, 255, 0.7)',
      },
      Card: {
        color: '#251a35',
        colorModal: '#251a35',
        colorTarget: '#251a35',
        textColor: 'rgba(240, 229, 255, 0.9)',
        titleTextColor: 'rgba(240, 229, 255, 0.9)',
        borderColor: 'rgba(168, 85, 247, 0.24)',
        actionColor: '#581c87',
        closeIconColor: 'rgba(240, 229, 255, 0.6)',
        closeIconColorHover: 'rgba(240, 229, 255, 0.8)',
        closeIconColorPressed: 'rgba(240, 229, 255, 0.9)',
      },
      Menu: {
        color: '#251a35',
        itemColorHover: 'rgba(168, 85, 247, 0.1)',
        itemColorActive: 'rgba(168, 85, 247, 0.2)',
        itemTextColor: 'rgba(240, 229, 255, 0.9)',
        itemTextColorHover: 'rgba(240, 229, 255, 1)',
        itemTextColorActive: '#ffffff',
        itemIconColor: 'rgba(240, 229, 255, 0.7)',
        itemIconColorHover: 'rgba(240, 229, 255, 0.8)',
        itemIconColorActive: '#ffffff',
        arrowColor: 'rgba(240, 229, 255, 0.7)',
        arrowColorHover: 'rgba(240, 229, 255, 0.8)',
        arrowColorActive: '#ffffff',
      }
    }
  }
}

// 获取可用主题列表
export const availableThemes = Object.values(naiveThemeConfigs)

// 当前主题配置
export const currentThemeConfig = computed(() => 
  naiveThemeConfigs[currentThemeId.value] || naiveThemeConfigs.light
)

// 当前 Naive UI 主题
export const currentNaiveTheme = computed<GlobalTheme | null>(() => 
  currentThemeConfig.value.naiveTheme
)

// 当前主题覆盖配置
export const currentThemeOverrides = computed<GlobalThemeOverrides>(() => 
  currentThemeConfig.value.themeOverrides || {}
)

// 纯Naive UI主题切换 - 无需DOM操作
export const switchTheme = (themeId: string): boolean => {
  if (!naiveThemeConfigs[themeId]) {
    console.warn(`Theme '${themeId}' not found`)
    return false
  }

  currentThemeId.value = themeId
  
  // 仅保存到 localStorage，完全依赖Naive UI的themeOverrides
  try {
    localStorage.setItem('naive-theme-id', themeId)
  } catch (error) {
    console.warn('Failed to save theme preference:', error)
  }
  
  console.log(`Pure Naive UI theme switched to: ${themeId}`)
  return true
}

// 获取当前主题ID
export const getCurrentThemeId = (): string => currentThemeId.value

// 获取主题配置
export const getThemeConfig = (themeId: string): ThemeConfig | null => {
  return naiveThemeConfigs[themeId] || null
}

// 初始化主题系统
export const initializeNaiveTheme = (): void => {
  // 从 localStorage 获取保存的主题
  let savedTheme: string | null = null
  try {
    savedTheme = localStorage.getItem('naive-theme-id')
  } catch (error) {
    console.warn('Failed to load theme preference:', error)
  }
  
  // 如果没有保存的主题，使用系统偏好
  if (!savedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    savedTheme = prefersDark ? 'dark' : 'light'
  }
  
  // 应用主题
  switchTheme(savedTheme)
}

// 检查是否为深色主题
export const isDarkTheme = computed(() => {
  const config = currentThemeConfig.value
  return config.naiveTheme === darkTheme
})

// 为向后兼容性导出的别名
export const naiveTheme = currentNaiveTheme
export const themeOverrides = currentThemeOverrides