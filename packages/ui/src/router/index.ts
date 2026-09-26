import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { beforeRouteSwitch } from './guards'
import AppLauncher from '../components/launcher/AppLauncher.vue'
import ContextSystemWorkspace from '../components/context-mode/ContextSystemWorkspace.vue'
import ContextUserWorkspace from '../components/context-mode/ContextUserWorkspace.vue'

/**
 * Vue Router 配置
 *
 * 设计说明：
 * - 使用 hash 模式（#/basic/system），Electron 兼容
 * - 路由懒加载，减少初始 bundle
 * - 路由守卫：监控导航事件
 */

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    // 助手选择页（应用启动落地页）。
    // 改造前此处是 RootBootstrapRoute：等待 globalSettings 恢复后「静默跳转」到上次工作区。
    // 现改为显式选择 —— 先由用户在 AppLauncher 中选择助手，再决定进入哪个工作区。
    // 注意：该组件由 PromptOptimizerApp 的「裸布局分支」直接渲染（不套 MainLayout），
    // 因为头部导航无条件渲染、无开关，走 RouterView 会带上头部，得不到干净的启动页。
    name: 'root',
    component: AppLauncher
  },
  // ✨ Basic 模式重构：2 个独立路由
  {
    path: '/basic/system',
    name: 'basic-system',
    component: () => import('../components/basic-mode/BasicSystemWorkspace.vue')
  },
  {
    path: '/basic/user',
    name: 'basic-user',
    component: () => import('../components/basic-mode/BasicUserWorkspace.vue')
  },
  // ✨ Pro 模式：2 个独立路由
  // - /pro/multi: 多消息模式（ContextSystemWorkspace）
  // - /pro/variable: 变量模式（ContextUserWorkspace）
  {
    path: '/pro/multi',
    name: 'pro-multi',
    component: ContextSystemWorkspace
  },
  {
    path: '/pro/variable',
    name: 'pro-variable',
    component: ContextUserWorkspace
  },
  // ✨ Image 模式重构：2 个独立路由
  {
    path: '/image/text2image',
    name: 'image-text2image',
    component: () => import('../components/image-mode/ImageText2ImageWorkspace.vue')
  },
  {
    path: '/image/image2image',
    name: 'image-image2image',
    component: () => import('../components/image-mode/ImageImage2ImageWorkspace.vue')
  },
  {
    path: '/image/multiimage',
    name: 'image-multiimage',
    component: () => import('../components/image-mode/ImageMultiImageWorkspace.vue')
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('../components/favorites/FavoritesPage.vue')
  },
  {
    path: '/translate',
    name: 'translate',
    // 翻译助手：独立于 FunctionMode 体系，不接入会话持久化。
    // 路由切换器（workspaceRouteSwitch）识别不出工作区键时会直接返回，
    // 因此本路由不会误触发 session 的保存 / 恢复。
    component: () => import('../components/translate/TranslateWorkspace.vue')
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 挂载路由守卫
router.beforeEach(beforeRouteSwitch)

export default router
