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
  lastCheckResult: 'none' | 'available' | 'not-available' | 'error' | 'dev-disabled'
  lastCheckMessage: string
  stableVersion: string | null
  stableReleaseUrl: string | null
  prereleaseVersion: string | null
  prereleaseReleaseUrl: string | null
  hasStableUpdate: boolean
  hasPrereleaseUpdate: boolean
  currentVersion: string | null
  isDownloadingStable: boolean
  isDownloadingPrerelease: boolean
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
        isCheckingUpdate: false,
        lastCheckResult: 'none',
        lastCheckMessage: '',
        stableVersion: null,
        stableReleaseUrl: null,
        prereleaseVersion: null,
        prereleaseReleaseUrl: null,
        hasStableUpdate: false,
        hasPrereleaseUpdate: false,
        currentVersion: null,
        isDownloadingStable: false,
        isDownloadingPrerelease: false
      } as UpdaterState),
      checkUpdate: () => Promise.resolve(),
      startDownload: () => Promise.resolve(),
      installUpdate: () => Promise.resolve(),
      ignoreUpdate: () => Promise.resolve(),
      togglePrerelease: () => Promise.resolve(),
      openReleaseUrl: () => Promise.resolve(),
      downloadStableVersion: () => Promise.resolve(),
      downloadPrereleaseVersion: () => Promise.resolve()
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
    isCheckingUpdate: false,
    lastCheckResult: 'none',
    lastCheckMessage: '',
    stableVersion: null,
    stableReleaseUrl: null,
    prereleaseVersion: null,
    prereleaseReleaseUrl: null,
    hasStableUpdate: false,
    hasPrereleaseUpdate: false,
    currentVersion: null,
    isDownloadingStable: false,
    isDownloadingPrerelease: false
  })

  // IPC事件监听器引用，用于清理
  let updateAvailableListener: ((event: any, info: UpdateInfo) => void) | null = null
  let updateNotAvailableListener: ((event: any, info: any) => void) | null = null
  let downloadProgressListener: ((event: any, progress: DownloadProgress) => void) | null = null
  let updateDownloadedListener: ((event: any, info: UpdateInfo) => void) | null = null
  let updateErrorListener: ((event: any, error: any) => void) | null = null

  // 检查两种版本的内部函数
  const checkBothVersions = async () => {
    try {
      // 获取当前版本
      state.currentVersion = await getCurrentVersion()

      // 同时检查正式版和预览版
      console.log('[useUpdater] Checking stable version...')
      const stableResult = await checkSpecificVersion(false)

      console.log('[useUpdater] Checking prerelease version...')
      const prereleaseResult = await checkSpecificVersion(true)

      // 检查是否是开发环境
      const isDevelopmentEnv = (stableResult?.isDevelopmentEnvironment || prereleaseResult?.isDevelopmentEnvironment)

      if (isDevelopmentEnv) {
        // 开发环境的处理
        state.lastCheckResult = 'dev-disabled'
        state.lastCheckMessage = stableResult?.message || prereleaseResult?.message || 'Development environment: Update checking is disabled'
        console.log('[useUpdater] Development environment detected, update checking disabled')
        return
      }

      // 保存正式版信息
      if (stableResult && !stableResult.isDevelopmentEnvironment && !stableResult.noVersionFound) {
        state.stableVersion = stableResult.remoteVersion
        state.stableReleaseUrl = stableResult.remoteReleaseUrl
        state.hasStableUpdate = hasUpdate(state.currentVersion || '0.0.0', state.stableVersion || '0.0.0')
        console.log(`[useUpdater] Stable version comparison: current=${state.currentVersion}, remote=${state.stableVersion}, hasUpdate=${state.hasStableUpdate}`)
      } else {
        state.stableVersion = null
        state.stableReleaseUrl = null
        state.hasStableUpdate = false
        if (stableResult?.noVersionFound) {
          console.log('[useUpdater] No stable version found - this is normal if no stable releases exist yet')
        }
      }

      // 保存预览版信息
      if (prereleaseResult && !prereleaseResult.isDevelopmentEnvironment && !prereleaseResult.noVersionFound) {
        state.prereleaseVersion = prereleaseResult.remoteVersion
        state.prereleaseReleaseUrl = prereleaseResult.remoteReleaseUrl
        state.hasPrereleaseUpdate = hasUpdate(state.currentVersion || '0.0.0', state.prereleaseVersion || '0.0.0')
        console.log(`[useUpdater] Prerelease version comparison: current=${state.currentVersion}, remote=${state.prereleaseVersion}, hasUpdate=${state.hasPrereleaseUpdate}`)
      } else {
        state.prereleaseVersion = null
        state.prereleaseReleaseUrl = null
        state.hasPrereleaseUpdate = false
        if (prereleaseResult?.noVersionFound) {
          console.log('[useUpdater] No prerelease version found - this is normal if no prerelease releases exist yet')
        }
      }

      // 更新总体状态 - 根据用户偏好计算
      state.hasUpdate = calculateHasUpdate()

      // 设置检查结果消息
      if (state.hasStableUpdate || state.hasPrereleaseUpdate) {
        const updates = []
        if (state.hasStableUpdate) updates.push(`stable v${state.stableVersion}`)
        if (state.hasPrereleaseUpdate) updates.push(`prerelease v${state.prereleaseVersion}`)
        state.lastCheckResult = 'available'
        state.lastCheckMessage = `New versions available: ${updates.join(', ')}`
      } else if (state.stableVersion || state.prereleaseVersion) {
        state.lastCheckResult = 'not-available'
        state.lastCheckMessage = 'You are using the latest versions'
      } else {
        // 检查是否是因为没有发布版本
        const hasStableNoVersionFound = stableResult?.noVersionFound
        const hasPrereleaseNoVersionFound = prereleaseResult?.noVersionFound

        if (hasStableNoVersionFound && hasPrereleaseNoVersionFound) {
          state.lastCheckResult = 'not-available'
          state.lastCheckMessage = 'No releases found. This project may not have published any versions yet.'
        } else if (hasStableNoVersionFound) {
          state.lastCheckResult = 'not-available'
          state.lastCheckMessage = 'No stable releases found. Only prerelease versions may be available.'
        } else {
          state.lastCheckResult = 'error'
          state.lastCheckMessage = 'Unable to check for updates'
        }
      }

    } catch (error) {
      console.error('[useUpdater] Error checking both versions:', error)
      state.lastCheckResult = 'error'
      state.lastCheckMessage = error instanceof Error ? error.message : String(error)
    }
  }

  // 检查特定类型版本的内部函数
  const checkSpecificVersion = async (allowPrerelease: boolean) => {
    // 临时设置预览版偏好
    const originalPreference = state.allowPrerelease

    try {
      await setPreference('updater.allowPrerelease', allowPrerelease)

      // 执行检查
      const checkData = await window.electronAPI!.updater.checkUpdate()

      // 检查是否是开发环境的成功响应
      if (checkData && checkData.message &&
          (checkData.message.includes('Development environment') ||
           checkData.message.includes('dev-app-update.yml'))) {
        return {
          isDevelopmentEnvironment: true,
          message: checkData.message
        }
      }

      return checkData
    } catch (error) {
      console.error(`[useUpdater] Error checking ${allowPrerelease ? 'prerelease' : 'stable'} version:`, error)

      // 检查是否是开发环境的错误情况
      if (error instanceof Error && error.detailedMessage) {
        if (error.detailedMessage.includes('Development environment') ||
            error.detailedMessage.includes('dev-app-update.yml')) {
          // 开发环境的错误情况，返回特殊标记
          return {
            isDevelopmentEnvironment: true,
            message: error.detailedMessage
          }
        }
      }

      // 检查是否是"找不到版本"的错误（正常情况，比如还没有正式版）
      if (error instanceof Error &&
          (error.code === 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' ||
           error.message?.includes('Unable to find latest version'))) {
        console.log(`[useUpdater] No ${allowPrerelease ? 'prerelease' : 'stable'} version found (normal if no releases exist)`)
        return {
          noVersionFound: true,
          versionType: allowPrerelease ? 'prerelease' : 'stable'
        }
      }

      return null
    } finally {
      // 确保在任何情况下都恢复原始偏好设置
      try {
        await setPreference('updater.allowPrerelease', originalPreference)
      } catch (restoreError) {
        console.error('[useUpdater] Failed to restore preference setting:', restoreError)
      }
    }
  }

  // 获取当前应用版本
  const getCurrentVersion = async (): Promise<string | null> => {
    if (isRunningInElectron() && window.electronAPI?.app) {
      try {
        return await window.electronAPI.app.getVersion()
      } catch (error) {
        console.error('[useUpdater] Failed to get app version:', error)
        return null
      }
    }
    console.warn('[useUpdater] Not running in Electron environment')
    return null
  }

  // 语义化版本比较函数
  const compareVersions = (version1: string, version2: string): number => {
    // 移除 'v' 前缀（如果存在）
    const v1 = version1.replace(/^v/, '')
    const v2 = version2.replace(/^v/, '')

    // 解析版本号
    const parseVersion = (version: string) => {
      const parts = version.split('-')
      const mainVersion = parts[0]
      const prerelease = parts[1] || null

      const [major, minor, patch] = mainVersion.split('.').map(num => parseInt(num) || 0)

      return {
        major,
        minor,
        patch,
        prerelease,
        original: version
      }
    }

    const parsed1 = parseVersion(v1)
    const parsed2 = parseVersion(v2)

    // 比较主版本号
    if (parsed1.major !== parsed2.major) {
      return parsed1.major - parsed2.major
    }

    // 比较次版本号
    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor - parsed2.minor
    }

    // 比较修订版本号
    if (parsed1.patch !== parsed2.patch) {
      return parsed1.patch - parsed2.patch
    }

    // 如果主版本号相同，比较预发布版本
    if (parsed1.prerelease && parsed2.prerelease) {
      // 两个都是预发布版本，按字符串比较
      return parsed1.prerelease.localeCompare(parsed2.prerelease)
    } else if (parsed1.prerelease && !parsed2.prerelease) {
      // v1是预发布版本，v2是正式版本，v1 < v2
      return -1
    } else if (!parsed1.prerelease && parsed2.prerelease) {
      // v1是正式版本，v2是预发布版本，v1 > v2
      return 1
    }

    // 版本完全相同
    return 0
  }

  // 检查是否有更新（新版本大于当前版本）
  const hasUpdate = (currentVersion: string, remoteVersion: string): boolean => {
    if (!currentVersion || !remoteVersion) return false
    return compareVersions(remoteVersion, currentVersion) > 0
  }

  // 根据用户偏好计算是否有更新
  const calculateHasUpdate = (): boolean => {
    if (state.allowPrerelease) {
      // 预览版用户：正式版或预览版有更新都提示
      return state.hasStableUpdate || state.hasPrereleaseUpdate
    } else {
      // 正式版用户：只有正式版更新才提示
      return state.hasStableUpdate
    }
  }

  // 检查更新 - 增强版本，支持双重检查
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
        state.lastCheckResult = 'none'
        state.lastCheckMessage = ''
        console.log('[useUpdater] Reset states for new update check')
      } else {
        console.log('[useUpdater] Download in progress, preserving download states')
      }

      // 检查两种版本：正式版和预览版
      await checkBothVersions()
    } catch (error) {
      console.error('[useUpdater] Check update error:', error)
      console.error('[DEBUG] Error properties:', {
        message: error?.message,
        detailedMessage: error?.detailedMessage,
        originalError: error?.originalError,
        stack: error?.stack
      })

      state.lastCheckResult = 'error'
      // 对于前端 catch 的错误，优先使用详细信息
      if (error instanceof Error) {
        // 优先使用 preload.js 中保存的详细错误信息
        if (error.detailedMessage) {
          console.log('[DEBUG] Using detailedMessage:', error.detailedMessage)
          // 检查是否是开发环境的配置文件缺失错误
          if (error.detailedMessage.includes('dev-app-update.yml') && error.detailedMessage.includes('ENOENT')) {
            state.lastCheckMessage = 'Development environment: Update checking is disabled (no dev-app-update.yml configured)'
          } else {
            state.lastCheckMessage = error.detailedMessage
          }
        } else if (error.originalError) {
          console.log('[DEBUG] Using originalError:', error.originalError)
          state.lastCheckMessage = error.originalError
        } else {
          // 兜底：构建详细错误信息
          let detailedMessage = `Client Error: ${error.message}`
          if (error.stack) {
            detailedMessage += `\n\nStack Trace:\n${error.stack}`
          }
          console.log('[DEBUG] Using constructed detailed message:', detailedMessage)
          state.lastCheckMessage = detailedMessage
        }
      } else {
        const fallbackMessage = String(error) || 'Update check failed'
        console.log('[DEBUG] Using fallback message:', fallbackMessage)
        state.lastCheckMessage = fallbackMessage
      }

      console.log('[DEBUG] Final lastCheckMessage set to:', state.lastCheckMessage)
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
  const ignoreUpdate = async (version?: string, versionType?: 'stable' | 'prerelease') => {
    if (!window.electronAPI?.updater) return

    try {
      const versionToIgnore = version || state.updateInfo?.version
      if (!versionToIgnore) return

      // 如果没有指定类型，根据版本号自动判断
      const actualVersionType = versionType || (versionToIgnore.includes('-') ? 'prerelease' : 'stable')

      const result = await window.electronAPI.updater.ignoreVersion(versionToIgnore, actualVersionType)

      if (result.success) {
        // 根据版本类型重置对应的状态
        if (actualVersionType === 'stable') {
          state.hasStableUpdate = false
          // 如果忽略的是当前显示的正式版，清理相关状态
          if (state.stableVersion === versionToIgnore) {
            state.stableVersion = null
            state.stableReleaseUrl = null
          }
        } else if (actualVersionType === 'prerelease') {
          state.hasPrereleaseUpdate = false
          // 如果忽略的是当前显示的预览版，清理相关状态
          if (state.prereleaseVersion === versionToIgnore) {
            state.prereleaseVersion = null
            state.prereleaseReleaseUrl = null
          }
        }

        // 重新计算总体更新状态
        state.hasUpdate = calculateHasUpdate()

        // 如果忽略的是当前的updateInfo，清理它
        if (state.updateInfo?.version === versionToIgnore) {
          state.updateInfo = null
        }

        console.log('[useUpdater] Version ignored:', versionToIgnore, 'type:', actualVersionType)
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

      // 设置改变后，重新检查更新
      if (!state.isCheckingUpdate) {
        console.log('[useUpdater] Re-checking updates after prerelease setting change')
        await checkUpdate()
      }
    } catch (error) {
      console.error('[useUpdater] Toggle prerelease error:', error)
    }
  }

  // 下载正式版
  const downloadStableVersion = async () => {
    if (!state.stableVersion) {
      console.warn('[useUpdater] No stable version available for download')
      return
    }

    // 防止重复点击
    if (state.isDownloadingStable || state.isDownloading) {
      console.log('[useUpdater] Stable download already in progress')
      return
    }

    try {
      console.log('[useUpdater] Starting stable version download...')
      state.isDownloadingStable = true

      // 步骤1：切换到正式版通道
      const originalPreference = state.allowPrerelease
      await setPreference('updater.allowPrerelease', false)
      state.allowPrerelease = false

      // 步骤2：在新通道上检查更新，让主进程知道要下载什么
      console.log('[useUpdater] Checking for stable version updates before download...')
      const checkResult = await checkSpecificVersion(false)

      if (!checkResult || checkResult.isDevelopmentEnvironment || checkResult.noVersionFound) {
        console.error('[useUpdater] Failed to get stable version info for download')
        // 恢复原始设置
        await setPreference('updater.allowPrerelease', originalPreference)
        state.allowPrerelease = originalPreference
        return
      }

      // 验证检查结果是否包含有效的更新信息
      if (!checkResult.success || !checkResult.data || !checkResult.data.updateInfo) {
        console.error('[useUpdater] Check result does not contain valid update info:', checkResult)
        // 恢复原始设置
        await setPreference('updater.allowPrerelease', originalPreference)
        state.allowPrerelease = originalPreference
        return
      }

      // 步骤3：现在主进程知道要下载什么了，开始下载
      console.log('[useUpdater] Starting download for stable version:', checkResult.data.updateInfo.version)
      await startDownload()

    } catch (error) {
      console.error('[useUpdater] Download stable version error:', error)
      // 确保下载状态被重置
      state.isDownloading = false
      state.downloadProgress = null
    } finally {
      state.isDownloadingStable = false
    }
  }

  // 下载预览版
  const downloadPrereleaseVersion = async () => {
    if (!state.prereleaseVersion) {
      console.warn('[useUpdater] No prerelease version available for download')
      return
    }

    // 防止重复点击
    if (state.isDownloadingPrerelease || state.isDownloading) {
      console.log('[useUpdater] Prerelease download already in progress')
      return
    }

    try {
      console.log('[useUpdater] Starting prerelease version download...')
      state.isDownloadingPrerelease = true

      // 步骤1：切换到预览版通道
      const originalPreference = state.allowPrerelease
      await setPreference('updater.allowPrerelease', true)
      state.allowPrerelease = true

      // 步骤2：在新通道上检查更新，让主进程知道要下载什么
      console.log('[useUpdater] Checking for prerelease version updates before download...')
      const checkResult = await checkSpecificVersion(true)

      if (!checkResult || checkResult.isDevelopmentEnvironment || checkResult.noVersionFound) {
        console.error('[useUpdater] Failed to get prerelease version info for download')
        // 恢复原始设置
        await setPreference('updater.allowPrerelease', originalPreference)
        state.allowPrerelease = originalPreference
        return
      }

      // 验证检查结果是否包含有效的更新信息
      if (!checkResult.success || !checkResult.data || !checkResult.data.updateInfo) {
        console.error('[useUpdater] Check result does not contain valid update info:', checkResult)
        // 恢复原始设置
        await setPreference('updater.allowPrerelease', originalPreference)
        state.allowPrerelease = originalPreference
        return
      }

      // 步骤3：现在主进程知道要下载什么了，开始下载
      console.log('[useUpdater] Starting download for prerelease version:', checkResult.data.updateInfo.version)
      await startDownload()

    } catch (error) {
      console.error('[useUpdater] Download prerelease version error:', error)
      // 确保下载状态被重置
      state.isDownloading = false
      state.downloadProgress = null
    } finally {
      state.isDownloadingPrerelease = false
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

  // 设置IPC事件监听器 - 现在主要用于下载相关事件
  const setupEventListeners = () => {
    if (!window.electronAPI?.on) return

    // 更新可用 - 保留用于自动检查等场景
    updateAvailableListener = (info: UpdateInfo) => {
      console.log('[useUpdater] Update available (from auto-check):', info)
      state.hasUpdate = true
      state.updateInfo = info
      state.lastCheckResult = 'available'
      state.lastCheckMessage = `New version ${info.version} is available`
      // 同时更新远程版本信息
      state.remoteVersion = info.version
      try {
        // 这里可能需要构建URL，但为了简化，我们使用现有的releaseUrl
        state.remoteReleaseUrl = info.releaseUrl
      } catch (error) {
        console.warn('[useUpdater] Failed to set remote release URL:', error)
      }
    }
    window.electronAPI.on('update-available-info', updateAvailableListener)

    // 无更新可用 - 现在主要用于日志，实际逻辑在请求-响应中处理
    updateNotAvailableListener = (info: any) => {
      console.log('[useUpdater] No update available (from auto-check):', info)
      // 注意：不再在这里更新UI状态，避免与请求-响应模式冲突
    }
    window.electronAPI.on('update-not-available', updateNotAvailableListener)

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
      // 重置特定下载状态
      state.isDownloadingStable = false
      state.isDownloadingPrerelease = false
    }
    window.electronAPI.on('update-downloaded', updateDownloadedListener)

    // 更新错误（包括下载错误）
    updateErrorListener = (error: any) => {
      console.error('[useUpdater] Update error:', error)

      // 简单处理：重置下载状态，保持更新信息让用户重试
      state.isDownloading = false
      state.downloadProgress = null
      state.lastCheckResult = 'error'
      // 重置特定下载状态
      state.isDownloadingStable = false
      state.isDownloadingPrerelease = false
      // 使用详细的错误信息，优先使用 message 字段（包含详细信息）
      state.lastCheckMessage = error.message || error.error || 'Update check failed'
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
    if (updateNotAvailableListener) {
      window.electronAPI.off('update-not-available', updateNotAvailableListener)
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
      // 获取当前版本
      state.currentVersion = await getCurrentVersion()
      console.log('[useUpdater] Current version loaded:', state.currentVersion)

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
    openReleaseUrl,
    downloadStableVersion,
    downloadPrereleaseVersion
  }
}
