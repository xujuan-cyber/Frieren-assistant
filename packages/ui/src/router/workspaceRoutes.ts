import type { SubModeKey } from '../stores/session/useSessionManager'
import type { GlobalSettingsApi } from '../stores/settings/useGlobalSettings'

export const DEFAULT_WORKSPACE_PATH = '/basic/system'

/** 助手选择页（应用启动落地页）。根路径不再自动重定向到工作区 */
export const LAUNCHER_PATH = '/'

/** 翻译助手工作区。不属于任何 FunctionMode，也不接入会话体系 */
export const TRANSLATE_PATH = '/translate'

export const WORKSPACE_SUB_MODE_KEYS: ReadonlyArray<SubModeKey> = [
  'basic-system',
  'basic-user',
  'pro-multi',
  'pro-variable',
  'image-text2image',
  'image-image2image',
  'image-multiimage',
]

const WORKSPACE_SUB_MODES = {
  basic: ['system', 'user'],
  pro: ['multi', 'variable'],
  image: ['text2image', 'image2image', 'multiimage'],
} as const

export type WorkspaceMode = keyof typeof WORKSPACE_SUB_MODES

export interface WorkspaceRouteInfo {
  mode: WorkspaceMode
  subMode: string
  subModeKey: SubModeKey
  path: string
}

export const parseWorkspaceRoutePath = (path: string): WorkspaceRouteInfo | null => {
  const cleanPath = path.split('?')[0].split('#')[0]
  const match = cleanPath.match(/^\/(basic|pro|image)\/([^/]+)$/)
  if (!match) return null

  const [, mode, subMode] = match as [string, WorkspaceMode, string]
  const allowedSubModes = WORKSPACE_SUB_MODES[mode] as readonly string[]
  if (!allowedSubModes.includes(subMode)) return null

  return {
    mode,
    subMode,
    subModeKey: `${mode}-${subMode}` as SubModeKey,
    path: `/${mode}/${subMode}`,
  }
}

export const isWorkspaceRoutePath = (path: string): boolean => {
  return parseWorkspaceRoutePath(path) !== null
}

export const normalizeWorkspacePath = (value: unknown): string | null => {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return null

  const parsed = parseWorkspaceRoutePath(candidate)
  return parsed?.path ?? null
}

export const resolveWorkspacePathFallback = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const value = typeof candidate === 'function' ? candidate() : candidate
    const workspacePath = normalizeWorkspacePath(value)
    if (workspacePath) return workspacePath
  }

  return DEFAULT_WORKSPACE_PATH
}

export const getDefaultSubModeForWorkspaceMode = (mode: WorkspaceMode): string => {
  if (mode === 'image') return 'text2image'
  if (mode === 'pro') return 'variable'
  return 'system'
}

/**
 * 计算「上次使用的工作区路径」。
 *
 * 用途：选择页的「提示词助手」卡片，以及头部助手切换器切回提示词助手时，
 * 都据此决定落点，保证与改造前的启动行为一致 ——
 * 首装无记录时落到 /basic/system，用过的用户回到上次的模式与子模式。
 *
 * 本函数原先位于 `router/RootBootstrapRoute.ts`。随「助手选择页」方案实施，
 * 该组件（职责为静默重定向）已被 AppLauncher 取代并移除，故决策函数迁至本模块。
 * 这也避免了 AppLauncher → RootBootstrapRoute 与路由注册之间形成循环依赖。
 */
export const getInitialRouteFromGlobalSettings = (globalSettings: GlobalSettingsApi): string => {
  const { functionMode, basicSubMode, proSubMode } = globalSettings.state

  switch (functionMode) {
    case 'pro':
      return `/pro/${proSubMode}`
    // 图像模式入口已隐藏（应用定位为解题提示词优化）：
    // 历史记录里遗留的 image 模式回落到基础模式，不再进入 /image/* 工作区
    case 'basic':
    case 'image':
    default:
      return `/basic/${basicSubMode}`
  }
}
