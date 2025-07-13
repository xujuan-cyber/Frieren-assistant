/**
 * Electron API Hook
 * 
 * 提供类型安全的Electron API访问，包含错误处理和环境检测
 * 不依赖core包，保持UI包的独立性
 */

import { computed, ref } from 'vue'
import { isRunningInElectron } from '@prompt-optimizer/core'
import type { ElectronAPI, ElectronResponse } from '@/types/electron'

// 本地工具函数
function isElectronAPIAvailable(): boolean {
  return isRunningInElectron() && typeof window !== 'undefined' && !!window.electronAPI
}

function getElectronAPI(): ElectronAPI | null {
  return window.electronAPI || null
}

export function useElectronAPI() {
  // 响应式的API可用性状态
  const isAvailable = ref(isElectronAPIAvailable())
  
  // 获取API实例
  const api = computed<ElectronAPI | null>(() => {
    return isAvailable.value ? getElectronAPI() : null
  })

  // 安全的API调用包装器
  const safeCall = async <T = any>(
    apiCall: (api: ElectronAPI) => Promise<T>,
    fallback?: T
  ): Promise<T | null> => {
    if (!api.value) {
      console.warn('[useElectronAPI] Electron API not available')
      return fallback ?? null
    }

    try {
      return await apiCall(api.value)
    } catch (error) {
      console.error('[useElectronAPI] API call failed:', error)
      return fallback ?? null
    }
  }

  // 安全的响应式API调用
  const safeCallWithResponse = async <T = any>(
    apiCall: (api: ElectronAPI) => Promise<ElectronResponse<T>>
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!api.value) {
      return {
        success: false,
        error: 'Electron API not available'
      }
    }

    try {
      const response = await apiCall(api.value)
      return {
        success: response.success,
        data: response.data,
        error: response.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // 常用API的便捷方法
  const app = {
    getVersion: () => safeCall(api => api.app.getVersion()),
    getPath: (name: string) => safeCall(api => api.app.getPath(name)),
    quit: () => safeCall(api => api.app.quit())
  }

  const updater = {
    checkUpdate: () => safeCallWithResponse(api => api.updater.checkUpdate()),
    checkAllVersions: () => safeCallWithResponse(api => api.updater.checkAllVersions()),
    downloadSpecificVersion: (versionType: 'stable' | 'prerelease') => 
      safeCallWithResponse(api => api.updater.downloadSpecificVersion(versionType)),
    installUpdate: () => safeCallWithResponse(api => api.updater.installUpdate()),
    ignoreVersion: (version: string, versionType?: 'stable' | 'prerelease') =>
      safeCall(api => api.updater.ignoreVersion(version, versionType))
  }

  const shell = {
    openExternal: (url: string) => safeCallWithResponse(api => api.shell.openExternal(url)),
    showItemInFolder: (path: string) => safeCallWithResponse(api => api.shell.showItemInFolder(path))
  }

  // 事件监听器管理
  const eventListeners = new Map<string, Set<(...args: any[]) => void>>()

  const on = (channel: string, listener: (...args: any[]) => void) => {
    if (!api.value) {
      console.warn('[useElectronAPI] Cannot add event listener: API not available')
      return
    }

    if (!eventListeners.has(channel)) {
      eventListeners.set(channel, new Set())
    }
    eventListeners.get(channel)!.add(listener)
    api.value.on(channel, listener)
  }

  const off = (channel: string, listener: (...args: any[]) => void) => {
    if (!api.value) {
      console.warn('[useElectronAPI] Cannot remove event listener: API not available')
      return
    }

    const listeners = eventListeners.get(channel)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        eventListeners.delete(channel)
      }
    }
    api.value.off(channel, listener)
  }

  // 清理所有事件监听器
  const cleanup = () => {
    if (!api.value) return

    for (const [channel, listeners] of eventListeners) {
      for (const listener of listeners) {
        api.value.off(channel, listener)
      }
    }
    eventListeners.clear()
  }

  return {
    // 状态
    isAvailable,
    api,
    
    // 通用方法
    safeCall,
    safeCallWithResponse,
    
    // 分类API
    app,
    updater,
    shell,
    
    // 事件管理
    on,
    off,
    cleanup
  }
}

// 导出工具函数供直接使用
export { isElectronAPIAvailable, getElectronAPI }
