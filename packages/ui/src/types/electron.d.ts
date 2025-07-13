/**
 * Electron API 类型定义
 * 
 * 仅用于UI包，定义通过 contextBridge 暴露给渲染进程的 Electron API 类型
 * 保持与 desktop/preload.js 中的实际实现同步
 */

// 基础响应类型
interface ElectronResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 应用相关API
interface AppAPI {
  getVersion(): Promise<string>
  getPath(name: string): Promise<string>
  quit(): Promise<void>
}

// 更新器相关API
interface UpdaterAPI {
  checkUpdate(): Promise<ElectronResponse>
  checkAllVersions(): Promise<ElectronResponse<{
    stable?: {
      remoteVersion?: string
      remoteReleaseUrl?: string
      error?: string
      noVersionFound?: boolean
    }
    prerelease?: {
      remoteVersion?: string
      remoteReleaseUrl?: string
      error?: string
      noVersionFound?: boolean
    }
  }>>
  downloadSpecificVersion(versionType: 'stable' | 'prerelease'): Promise<ElectronResponse<{
    hasUpdate: boolean
    message: string
    version?: string
    reason?: 'ignored' | 'latest' | 'error'
  }>>
  installUpdate(): Promise<ElectronResponse>
  ignoreVersion(version: string, versionType?: 'stable' | 'prerelease'): Promise<any>
}

// Shell相关API
interface ShellAPI {
  openExternal(url: string): Promise<ElectronResponse>
  showItemInFolder(path: string): Promise<ElectronResponse>
}

// 事件监听API
interface EventAPI {
  on(channel: string, listener: (...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
  once(channel: string, listener: (...args: any[]) => void): void
}

// 完整的ElectronAPI接口
interface ElectronAPI {
  app: AppAPI
  updater: UpdaterAPI
  shell: ShellAPI
  on: EventAPI['on']
  off: EventAPI['off']
  once: EventAPI['once']
}

// 全局Window类型扩展
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }

  // 扩展Error接口，支持自定义属性
  interface Error {
    detailedMessage?: string
    originalError?: any
    code?: string
  }
}

// 下载进度类型
interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

// 更新信息类型
interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseUrl?: string
  releaseNotes?: string
}

// 版本检查结果类型
interface VersionCheckResult {
  remoteVersion?: string
  remoteReleaseUrl?: string
  error?: string
  noVersionFound?: boolean
}

// 下载结果类型
interface DownloadResult {
  hasUpdate: boolean
  message: string
  version?: string
  reason?: 'ignored' | 'latest' | 'error'
}

// 导出类型（可选，用于其他文件引用）
export type {
  ElectronResponse,
  AppAPI,
  UpdaterAPI,
  ShellAPI,
  EventAPI,
  ElectronAPI,
  DownloadProgress,
  UpdateInfo,
  VersionCheckResult,
  DownloadResult
}
