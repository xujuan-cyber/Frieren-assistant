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

// 更新器相关API - 简单直接的类型定义
interface UpdaterAPI {
  checkUpdate(): Promise<any>
  checkAllVersions(): Promise<{
    currentVersion: string
    stable?: {
      remoteVersion?: string
      remoteReleaseUrl?: string
      error?: string
      noVersionFound?: boolean
      hasUpdate?: boolean
      message?: string
      versionType?: string
      releaseDate?: string
      releaseNotes?: string
    }
    prerelease?: {
      remoteVersion?: string
      remoteReleaseUrl?: string
      error?: string
      noVersionFound?: boolean
      hasUpdate?: boolean
      message?: string
      versionType?: string
      releaseDate?: string
      releaseNotes?: string
    }
  }>
  downloadSpecificVersion(versionType: 'stable' | 'prerelease'): Promise<{
    hasUpdate: boolean
    message: string
    version?: string
    reason?: 'ignored' | 'latest' | 'error'
  }>
  installUpdate(): Promise<void>
  ignoreVersion(version: string, versionType?: 'stable' | 'prerelease'): Promise<void>
  unignoreVersion(versionType: 'stable' | 'prerelease'): Promise<void>
  getIgnoredVersions(): Promise<{
    stable: string | null
    prerelease: string | null
  }>
}

// Shell相关API - 简化类型
interface ShellAPI {
  openExternal(url: string): Promise<void>
  showItemInFolder(path: string): Promise<void>
}

// 事件监听API
interface EventAPI {
  on(channel: string, listener: (...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
  once(channel: string, listener: (...args: any[]) => void): void
}

// 图像生成API
interface ImageAPI {
  generate(request: any): Promise<any>
  validateRequest(request: any): Promise<any>
  testConnection(config: any): Promise<any>
  getDynamicModels(providerId: string, connectionConfig: any): Promise<any[]>
}

// 图像模型管理API
interface ImageModelAPI {
  ensureInitialized(): Promise<void>
  isInitialized(): Promise<boolean>
  getAllConfigs(): Promise<any[]>
  getConfig(id: string): Promise<any>
  addConfig(config: any): Promise<void>
  updateConfig(id: string, updates: any): Promise<void>
  deleteConfig(id: string): Promise<void>
  getEnabledConfigs(): Promise<any[]>
  exportData(): Promise<any>
  importData(data: any): Promise<void>
  getDataType(): Promise<string>
  validateData(data: any): Promise<boolean>
}

// 完整的ElectronAPI接口
interface ElectronAPI {
  app: AppAPI
  updater: UpdaterAPI
  shell: ShellAPI
  image: ImageAPI
  imageModel: ImageModelAPI
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
  ImageAPI,
  ImageModelAPI,
  ElectronAPI,
  DownloadProgress,
  UpdateInfo,
  VersionCheckResult,
  DownloadResult
}
