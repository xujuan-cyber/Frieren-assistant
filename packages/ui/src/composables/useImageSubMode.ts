import { ref, readonly, type Ref } from 'vue'
import type { AppServices } from '../types/services'
import { usePreferences } from './usePreferenceManager'
import { UI_SETTINGS_KEYS, type ImageSubMode } from '@prompt-optimizer/core'

interface UseImageSubModeApi {
  imageSubMode: Ref<ImageSubMode>
  setImageSubMode: (mode: ImageSubMode) => Promise<void>
  switchToText2Image: () => Promise<void>
  switchToImage2Image: () => Promise<void>
  ensureInitialized: () => Promise<void>
}

let singleton: {
  mode: Ref<ImageSubMode>
  initialized: boolean
  initializing: Promise<void> | null
} | null = null

/**
 * 图像模式的子模式单例
 * - 默认值为 'text2image'（文生图）
 * - 自动持久化
 * - 独立于基础模式和上下文模式
 */
export function useImageSubMode(services: Ref<AppServices | null>): UseImageSubModeApi {
  if (!singleton) {
    singleton = {
      mode: ref<ImageSubMode>('text2image'),
      initialized: false,
      initializing: null
    }
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
        const saved = await getPreference<ImageSubMode>(
          UI_SETTINGS_KEYS.IMAGE_SUB_MODE,
          'text2image'
        )
        singleton!.mode.value = (saved === 'text2image' || saved === 'image2image')
          ? saved
          : 'text2image'

        console.log(`[useImageSubMode] 初始化完成，当前值: ${singleton!.mode.value}`)

        // 持久化默认值（如果未设置过）
        if (saved !== 'text2image' && saved !== 'image2image') {
          await setPreference(UI_SETTINGS_KEYS.IMAGE_SUB_MODE, 'text2image')
          console.log('[useImageSubMode] 首次初始化，已持久化默认值: text2image')
        }
      } catch (e) {
        console.error('[useImageSubMode] 初始化失败，使用默认值 text2image:', e)
        // 读取失败则保持默认 'text2image'，并尝试持久化
        try {
          await setPreference(UI_SETTINGS_KEYS.IMAGE_SUB_MODE, 'text2image')
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

  const setImageSubMode = async (mode: ImageSubMode) => {
    await ensureInitialized()
    singleton!.mode.value = mode
    await setPreference(UI_SETTINGS_KEYS.IMAGE_SUB_MODE, mode)
    console.log(`[useImageSubMode] 子模式已切换并持久化: ${mode}`)
  }

  const switchToText2Image = () => setImageSubMode('text2image')
  const switchToImage2Image = () => setImageSubMode('image2image')

  return {
    imageSubMode: readonly(singleton.mode) as Ref<ImageSubMode>,
    setImageSubMode,
    switchToText2Image,
    switchToImage2Image,
    ensureInitialized
  }
}
