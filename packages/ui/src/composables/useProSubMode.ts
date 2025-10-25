import { ref, readonly, type Ref } from 'vue'

import type { AppServices } from '../types/services'
import { usePreferences } from './usePreferenceManager'
import { UI_SETTINGS_KEYS, type ProSubMode } from '@prompt-optimizer/core'

interface UseProSubModeApi {
  proSubMode: Ref<ProSubMode>
  setProSubMode: (mode: ProSubMode) => Promise<void>
  switchToSystem: () => Promise<void>
  switchToUser: () => Promise<void>
  ensureInitialized: () => Promise<void>
}

let singleton: {
  mode: Ref<ProSubMode>
  initialized: boolean
  initializing: Promise<void> | null
} | null = null

/**
 * 上下文模式（Pro模式）的子模式单例。读取/写入 PreferenceService。
 * - 默认值为 'system'（系统提示词优化）
 * - 第一次调用时异步初始化
 * - 状态独立于基础模式，实现不同功能模式下的子模式状态隔离
 */
export function useProSubMode(services: Ref<AppServices | null>): UseProSubModeApi {
  if (!singleton) {
    singleton = { mode: ref<ProSubMode>('system'), initialized: false, initializing: null }
  }

  const { getPreference, setPreference } = usePreferences(services)

  const ensureInitialized = async () => {
    if (singleton!.initialized) return
    if (singleton!.initializing) {
      await singleton!.initializing
      return
    }
    singleton!.initializing = (async () => {
      try {
        // 读取 pro-sub-mode；若不存在，返回默认 'system'
        const saved = await getPreference<ProSubMode>(UI_SETTINGS_KEYS.PRO_SUB_MODE, 'system')
        singleton!.mode.value = (saved === 'system' || saved === 'user') ? saved : 'system'
        console.log(`[useProSubMode] 初始化完成，当前值: ${singleton!.mode.value}`)

        // 将默认值持久化（若未设置过）
        if (saved !== 'system' && saved !== 'user') {
          await setPreference(UI_SETTINGS_KEYS.PRO_SUB_MODE, 'system')
          console.log('[useProSubMode] 首次初始化，已持久化默认值: system')
        }
      } catch (e) {
        console.error('[useProSubMode] 初始化失败，使用默认值 system:', e)
        // 读取失败则保持默认 'system'，并尝试持久化
        try {
          await setPreference(UI_SETTINGS_KEYS.PRO_SUB_MODE, 'system')
        } catch {
          // 忽略设置失败错误
        }
      } finally {
        singleton!.initialized = true
        singleton!.initializing = null
      }
    })()
    await singleton!.initializing
  }

  const setProSubMode = async (mode: ProSubMode) => {
    await ensureInitialized()
    singleton!.mode.value = mode
    await setPreference(UI_SETTINGS_KEYS.PRO_SUB_MODE, mode)
    console.log(`[useProSubMode] 子模式已切换并持久化: ${mode}`)
  }

  const switchToSystem = () => setProSubMode('system')
  const switchToUser = () => setProSubMode('user')

  return {
    proSubMode: readonly(singleton.mode) as Ref<ProSubMode>,
    setProSubMode,
    switchToSystem,
    switchToUser,
    ensureInitialized
  }
}
