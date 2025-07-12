import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { usePreferences } from './usePreferenceManager'
import { inject } from 'vue'

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
  releaseUrl: string
}

export interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  total: number
  transferred: number
}

export interface UpdaterState {
  hasUpdate: boolean
  updateInfo: UpdateInfo | null
  downloadProgress: DownloadProgress | null
  isDownloading: boolean
  isDownloaded: boolean
  allowPrerelease: boolean
  isCheckingUpdate: boolean
}

export function useUpdater() {
  // 环境检测 - 仅在Electron环境中启用功能
  const isElectronEnvironment = isRunningInElectron()
  
  if (!isElectronEnvironment) {
    // 非Electron环境返回空实现，保持API一致性
    return {
      state: reactive({
        hasUpdate: false,
        updateInfo: null,
        downloadProgress: null,
        isDownloading: false,
        isDownloaded: false,
        allowPrerelease: false,
        isCheckingUpdate: false
      } as UpdaterState),
      checkUpdate: () => Promise.resolve(),
      startDownload: () => Promise.resolve(),
      installUpdate: () => Promise.resolve(),
      ignoreUpdate: () => Promise.resolve(),
      togglePrerelease: () => Promise.resolve(),
      openReleaseUrl: () => Promise.resolve()
    }
  }

  // Electron环境的实际实现
  const services = inject('services')
  const { getPreference, setPreference } = usePreferences(services)

  const state = reactive<UpdaterState>({
    hasUpdate: false,
    updateInfo: null,
    downloadProgress: null,
    isDownloading: false,
    isDownloaded: false,
    allowPrerelease: false,
    isCheckingUpdate: false
  })

  // IPC事件监听器引用，用于清理
  let updateAvailableListener: ((event: any, info: UpdateInfo) => void) | null = null
  let downloadProgressListener: ((event: any, progress: DownloadProgress) => void) | null = null
  let updateDownloadedListener: ((event: any, info: UpdateInfo) => void) | null = null
  let updateErrorListener: ((event: any, error: any) => void) | null = null

  // 检查更新
  const checkUpdate = async () => {
    if (!window.electronAPI?.updater) {
      console.warn('[useUpdater] Electron updater API not available')
      return
    }

    // 防止重复检查
    if (state.isCheckingUpdate) {
      console.log('[useUpdater] Update check already in progress')
      return
    }

    try {
      state.isCheckingUpdate = true

      // 智能状态重置：只在没有下载进行时才重置下载相关状态
      if (!state.isDownloading) {
        state.isDownloaded = false
        state.downloadProgress = null
        state.hasUpdate = false
        state.updateInfo = null
        console.log('[useUpdater] Reset download states for new update check')
      } else {
        console.log('[useUpdater] Download in progress, preserving download states')
      }

      const result = await window.electronAPI.updater.checkUpdate()

      if (!result.success) {
        console.error('[useUpdater] Check update failed:', result.error)
      } else if (result.data?.inProgress) {
        console.log('[useUpdater] Update check already in progress on main process')
      }
    } catch (error) {
      console.error('[useUpdater] Check update error:', error)
    } finally {
      state.isCheckingUpdate = false
    }
  }

  // 开始下载
  const startDownload = async () => {
    if (!window.electronAPI?.updater) return

    try {
      state.isDownloading = true
      state.downloadProgress = null // 重置进度

      const result = await window.electronAPI.updater.startDownload()

      if (!result.success) {
        console.error('[useUpdater] Start download failed:', result.error)
        state.isDownloading = false
        state.downloadProgress = null
      }
    } catch (error) {
      console.error('[useUpdater] Start download error:', error)
      state.isDownloading = false
      state.downloadProgress = null
    }
  }

  // 安装更新
  const installUpdate = async () => {
    if (!window.electronAPI?.updater) return

    try {
      const result = await window.electronAPI.updater.installUpdate()
      
      if (!result.success) {
        console.error('[useUpdater] Install update failed:', result.error)
      }
    } catch (error) {
      console.error('[useUpdater] Install update error:', error)
    }
  }

  // 忽略版本
  const ignoreUpdate = async (version?: string) => {
    if (!window.electronAPI?.updater) return

    try {
      const versionToIgnore = version || state.updateInfo?.version
      if (!versionToIgnore) return

      const result = await window.electronAPI.updater.ignoreVersion(versionToIgnore)
      
      if (result.success) {
        state.hasUpdate = false
        state.updateInfo = null
        console.log('[useUpdater] Version ignored:', versionToIgnore)
      } else {
        console.error('[useUpdater] Ignore version failed:', result.error)
      }
    } catch (error) {
      console.error('[useUpdater] Ignore version error:', error)
    }
  }

  // 切换预览版设置
  const togglePrerelease = async () => {
    try {
      const newValue = !state.allowPrerelease
      await setPreference('updater.allowPrerelease', newValue)
      state.allowPrerelease = newValue
      console.log('[useUpdater] Prerelease setting changed:', newValue)
    } catch (error) {
      console.error('[useUpdater] Toggle prerelease error:', error)
    }
  }

  // 打开发布页面
  const openReleaseUrl = async () => {
    if (!state.updateInfo?.releaseUrl || !window.electronAPI?.shell) return

    try {
      const result = await window.electronAPI.shell.openExternal(state.updateInfo.releaseUrl)
      
      if (!result.success) {
        console.error('[useUpdater] Open release URL failed:', result.error)
      }
    } catch (error) {
      console.error('[useUpdater] Open release URL error:', error)
    }
  }

  // 设置IPC事件监听器
  const setupEventListeners = () => {
    if (!window.electronAPI?.on) return

    // 更新可用
    updateAvailableListener = (info: UpdateInfo) => {
      console.log('[useUpdater] Update available:', info)
      state.hasUpdate = true
      state.updateInfo = info
    }
    window.electronAPI.on('update-available-info', updateAvailableListener)

    // 下载进度
    downloadProgressListener = (progress: DownloadProgress) => {
      console.log('[useUpdater] Download progress:', progress)
      state.downloadProgress = progress
    }
    window.electronAPI.on('update-download-progress', downloadProgressListener)

    // 下载完成
    updateDownloadedListener = (info: UpdateInfo) => {
      console.log('[useUpdater] Update downloaded:', info)
      state.isDownloading = false
      state.isDownloaded = true
    }
    window.electronAPI.on('update-downloaded', updateDownloadedListener)

    // 更新错误（包括下载错误）
    updateErrorListener = (error: any) => {
      console.error('[useUpdater] Update error:', error)

      // 简单处理：重置下载状态，保持更新信息让用户重试
      state.isDownloading = false
      state.downloadProgress = null
      // 保持 hasUpdate 和 updateInfo，让用户可以重新下载
    }
    window.electronAPI.on('update-error', updateErrorListener)
  }

  // 清理事件监听器
  const cleanupEventListeners = () => {
    if (!window.electronAPI?.off) return

    if (updateAvailableListener) {
      window.electronAPI.off('update-available-info', updateAvailableListener)
    }
    if (downloadProgressListener) {
      window.electronAPI.off('update-download-progress', downloadProgressListener)
    }
    if (updateDownloadedListener) {
      window.electronAPI.off('update-downloaded', updateDownloadedListener)
    }
    if (updateErrorListener) {
      window.electronAPI.off('update-error', updateErrorListener)
    }
  }

  // 初始化
  onMounted(async () => {
    try {
      // 加载预览版设置
      state.allowPrerelease = await getPreference('updater.allowPrerelease', false)

      // 设置事件监听器
      setupEventListeners()

      console.log('[useUpdater] Updater initialized')
    } catch (error) {
      console.error('[useUpdater] Initialization error:', error)
    }
  })

  // 清理
  onUnmounted(() => {
    cleanupEventListeners()
  })

  return {
    state,
    checkUpdate,
    startDownload,
    installUpdate,
    ignoreUpdate,
    togglePrerelease,
    openReleaseUrl
  }
}
