export interface OpenExternalUrlOptions {
  target?: string
  features?: string
  logPrefix?: string
}

export const openExternalUrl = async (
  url: string,
  options: OpenExternalUrlOptions = {},
): Promise<boolean> => {
  if (!url || typeof window === 'undefined') return false

  const target = options.target ?? '_blank'
  const features = options.features ?? 'noopener,noreferrer'

  if (window.electronAPI?.shell?.openExternal) {
    try {
      await window.electronAPI.shell.openExternal(url)
      return true
    } catch (error) {
      const prefix = options.logPrefix ?? 'openExternalUrl'
      console.error(`[${prefix}] Failed to open external URL in Electron:`, error)
    }
  }

  window.open(url, target, features)
  return true
}
