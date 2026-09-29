// Windows 无边框窗口的标题栏 overlay 配色同步。
//
// 背景：桌面端（packages/desktop）在 Windows 上启用
// `titleBarStyle: 'hidden' + titleBarOverlay`，右上角系统的
// 最小化/最大化/关闭 按钮底色由主进程维护。应用内切换主题时需要把
// overlay 底色/符号色同步为当前主题配色，否则会出现一条与界面割裂的色带。
//
// 配色取值（与 packages/ui/src/config/naive-theme.ts 的主题令牌一一对应）：
// - header：主布局页头的实际背景。NLayoutHeader 的背景是
//   naive-ui 的 headerColor = common.cardColor（不是 bodyColor）；
// - page：助手选择页（AppLauncher，裸布局、无页头）的背景，
//   即 common.bodyColor。
//
// 安全性：本模块只在 `navigator.windowControlsOverlay.visible === true`
// （即 Electron 的 overlay 实际生效）时动作；普通浏览器中该 API 不存在，
// 所有调用都是 no-op，对 web / extension 端无影响。

interface TitleBarOverlaySyncColors {
  color: string
  symbolColor: string
}

type OverlaySurface = 'header' | 'page'

interface ThemeOverlayColors {
  header: TitleBarOverlaySyncColors
  page: TitleBarOverlaySyncColors
}

// dark 主题未覆盖 bodyColor/cardColor，取 naive-ui 深色主题默认值
// （rgb(16, 16, 20) / rgb(24, 24, 28)）；符号色取接近其 textColor1 的浅灰。
const OVERLAY_COLORS_BY_THEME: Record<string, ThemeOverlayColors> = {
  light: {
    header: { color: '#ffffff', symbolColor: '#1f2933' },
    page: { color: '#f5f6f8', symbolColor: '#1f2933' },
  },
  dark: {
    header: { color: '#18181c', symbolColor: '#e5e7eb' },
    page: { color: '#101014', symbolColor: '#e5e7eb' },
  },
  blue: {
    header: { color: '#f6faff', symbolColor: '#0f2f55' },
    page: { color: '#e4f0ff', symbolColor: '#0f2f55' },
  },
  classic: {
    header: { color: '#fefcf8', symbolColor: '#403830' },
    page: { color: '#f5f2ec', symbolColor: '#403830' },
  },
  green: {
    header: { color: '#174737', symbolColor: '#e9fbf4' },
    page: { color: '#0f342b', symbolColor: '#e9fbf4' },
  },
  purple: {
    header: { color: '#2a1f45', symbolColor: '#f5ecff' },
    page: { color: '#1f1633', symbolColor: '#f5ecff' },
  },
}

// 主进程创建窗口时的初始 overlay 配色，必须与 light 主题页头保持一致
// （packages/desktop/main.js 中的初始值与本表 light.header 相同，改动需两侧同步）。
export const DEFAULT_TITLE_BAR_OVERLAY: TitleBarOverlaySyncColors =
  OVERLAY_COLORS_BY_THEME.light.header

type ElectronWindowBridge = {
  setTitleBarOverlay?: (options: TitleBarOverlaySyncColors) => Promise<boolean>
}

export const isWindowControlsOverlayActive = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const overlay = (
    navigator as Navigator & { windowControlsOverlay?: { visible?: boolean } }
  ).windowControlsOverlay
  return overlay?.visible === true
}

/**
 * 把当前主题的配色同步到 Windows 标题栏 overlay。
 *
 * @param themeId 当前主题 id（与 naiveThemeConfigs 的键一致）
 * @param surface 目标表面：'header' = 主布局页头（默认），
 *                'page' = 无页头的助手选择页
 *
 * 非 Electron / overlay 未生效的环境直接忽略；IPC 失败只告警，不阻断主题切换。
 */
export const syncWindowControlsOverlayTheme = (
  themeId: string,
  surface: OverlaySurface = 'header'
): void => {
  if (!isWindowControlsOverlayActive()) return

  const bridge = (
    window as { electronAPI?: { window?: ElectronWindowBridge } }
  ).electronAPI?.window
  if (typeof bridge?.setTitleBarOverlay !== 'function') return

  const themeColors = OVERLAY_COLORS_BY_THEME[themeId]
  const colors = themeColors
    ? themeColors[surface]
    : DEFAULT_TITLE_BAR_OVERLAY
  bridge
    .setTitleBarOverlay(colors)
    .catch((error: unknown) => {
      console.warn('[windowControlsOverlay] Failed to sync title bar overlay colors:', error)
    })
}
