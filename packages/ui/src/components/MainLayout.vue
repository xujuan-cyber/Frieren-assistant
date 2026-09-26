<template>
  <!-- 使用ToastUI包装整个布局以提供NMessageProvider -->
  <ToastUI>
    <NLayout style="position: fixed; inset: 0; width: 100vw; height: 100vh;
    max-height: 100vh;
    overflow: hidden; display: flex; min-height: 0;"
    content-style="height: 100%; max-height: 100%; min-height: 0; overflow: hidden;"
    >

      <NFlex vertical style="position: fixed; inset: 0; width: 100vw; max-height: 100vh; height: 100vh; min-height: 0;">
      <!-- 顶部导航栏 -->
      <NLayoutHeader class="theme-header nav-header-enhanced">
        <NFlex justify="space-between" align="center" class="w-full nav-content" :wrap="true" :size="[16, 12]">
          <!-- 左侧：Logo + 标题 + 核心导航 -->
          <NFlex align="center" :size="16" :wrap="false">
            <!-- Logo + 标题 -->
            <!-- 品牌区：纯展示，不承担跳转职责（原实现点击会打开上游作者站点） -->
            <NButton
              text
              tag="div"
              class="brand-link"
            >
              <NFlex align="center" :size="8" :wrap="false">
                <AppPreviewImage
                  :src="logoSrc"
                  alt="Logo"
                  :width="logoSize"
                  :height="logoSize"
                  object-fit="cover"
                  class="logo-image"
                  :show-toolbar="false"
                  :preview-disabled="true"
                  :fallback-src="fallbackLogoSrc"
                />
                <NText class="text-lg sm:text-xl font-bold theme-title" tag="h2">
                  <slot name="title">{{ t('common.appName') }}</slot>
                </NText>
              </NFlex>
            </NButton>

            <!-- 核心导航元素 -->
            <div class="core-navigation">
              <slot name="core-nav"></slot>
            </div>
          </NFlex>

          <!-- 右侧：操作按钮 -->
          <NFlex align="center" :size="8" :wrap="true" justify="end" class="nav-actions">
            <slot name="actions"></slot>
          </NFlex>
        </NFlex>
      </NLayoutHeader>

      <!-- 主要内容区域 - 严格控制在剩余空间内 -->
      <NLayoutContent has-sider
        style="flex: 1; min-height: 0; overflow: hidden;"
        content-style="height: 100%; max-height: 100%; min-height: 0; box-sizing: border-box; padding: 24px clamp(16px, 2vw, 48px) 40px; display: flex; flex-direction: column; align-items: stretch; overflow: hidden;"
      >
        <div class="main-content-wrapper">
          <slot name="main"></slot>
        </div>
      </NLayoutContent>
      </NFlex>

      <!-- 弹窗插槽 -->
      <slot name="modals"></slot>

    </NLayout>
  </ToastUI>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

import { useI18n } from 'vue-i18n'
import { NButton, NLayout, NLayoutHeader, NLayoutContent, NFlex, NText } from 'naive-ui'
import ToastUI from './Toast.vue'
import logoImage from '../assets/logo.png'
import AppPreviewImage from './media/AppPreviewImage.vue'

const { t } = useI18n()

// Logo图片配置
const logoSrc = logoImage

// 创建简单的SVG fallback logo
const createFallbackSvg = () => {
  const svg = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#3b82f6"/>
      <text x="16" y="21" text-anchor="middle" fill="white" font-family="system-ui" font-size="14" font-weight="bold">P</text>
    </svg>
  `)}`
  return svg
}

const fallbackLogoSrc = createFallbackSvg()

// 响应式Logo尺寸 - 使用更智能的检测
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
    window.addEventListener('resize', updateWindowWidth)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowWidth)
  }
})

const logoSize = computed(() => {
  if (windowWidth.value < 480) {
    return 20 // 超小屏幕
  } else if (windowWidth.value < 640) {
    return 24 // 小屏幕
  }
  return 28 // 默认尺寸
})
</script>

<style>
.main-content-wrapper {
  width: 100%;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
  /* 右侧工作区工具列的预留位：当页面留白不足以容纳浮动按钮时，
     WorkspaceUtilityMenu 会写入 --workspace-tools-reserve，让内容主动让出宽度，
     从而保证浮动按钮永不压住内容（留白足够时变量为空，行为与原来完全一致）。 */
  padding-right: var(--workspace-tools-reserve, 0px);
}

.main-content-wrapper > * {
  flex: 1;
  min-height: 0;
}

/* 增强导航栏样式 */
.nav-header-enhanced {
  min-height: 64px !important;
  padding: 12px 16px !important;
}

.nav-content {
  min-height: 40px;
}

.nav-actions {
  min-height: 40px;
}

.brand-link {
  align-items: center;
  padding: 6px 10px 6px 6px;
  border-radius: 12px;
  color: inherit;
  /* 品牌区已不再是交互元素：去掉指针样式与所有 hover/focus 反馈 */
  cursor: default;
}

/* Logo样式优化 */
.logo-image {
  border-radius: 6px;
  transition: transform 0.2s ease-in-out;
  flex-shrink: 0;
}

/* 标题文字对齐优化 */
.theme-title {
  line-height: 1.2 !important;
  margin: 0 !important;
  white-space: nowrap;
  transition: opacity 0.2s ease-in-out;
}

/* 核心导航样式 */
.core-navigation {
  display: flex;
  align-items: center;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid var(--n-border-color);
  min-height: 32px;
  /* 允许在窄屏下继续收缩，避免顶开右侧操作区 */
  min-width: 0;
}

/* ==========================================================================
 * 头部响应式阶梯
 *
 * 背景：头部内容的最小宽度是硬约束，无法靠 flex 收缩化解。
 *   brand-link 172 + core-navigation 272 + modal-action-group 626 + 内边距 32
 *   ≈ 1142px
 * 视口低于该值时，早期版本会把操作按钮组顶出视口，并被根节点
 * 的 overflow:hidden 裁切（既不可见也不可点击）。
 *
 * 处理原则：
 *   1. .nav-content 允许换行，保证任何宽度下都不出现互相压盖；
 *   2. 先隐藏按钮文字（降为图标 + title/aria-label），把最小宽度从 626 降到 ~332；
 *   3. 仍不足时让操作组独占一行；
 *   4. 最后才让核心导航横向滚动。
 * ========================================================================== */

/* 各个 flex 子项都允许收缩，否则负剩余空间会转化为溢出 */
.nav-content > *,
.nav-content .nav-actions > * {
  min-width: 0;
}

/* 断点 1（≤1139px）：隐藏头部按钮文字，最小宽度 626 → 332 */
@media (max-width: 1139px) {
  .nav-actions .action-button__label {
    display: none;
  }
}

/* 断点 2（≤879px）：操作组独占一行，避免与品牌/核心导航争抢 */
@media (max-width: 879px) {
  .nav-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}

/* 断点 3（≤767px）：移动端——收紧头部内边距并允许核心导航横向滚动 */
@media (max-width: 767px) {
  .nav-header-enhanced {
    min-height: 0 !important;
    padding: 8px 12px !important;
  }

  .nav-content {
    row-gap: 6px;
  }

  .core-navigation {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .core-navigation::-webkit-scrollbar {
    display: none;
  }

  .nav-actions {
    justify-content: flex-start;
  }

  /* 触摸端分隔条无法拖动，单列后也无意义 */
  .split-divider {
    display: none !important;
  }

  /* 分栏改为上下；列宽由组件以行内样式写入，必须 !important 才能覆盖 */
  .basic-system-split,
  .basic-user-split,
  .context-system-split,
  .context-user-split,
  .image-image2image-split,
  .image-multiimage-split,
  .image-text2image-split {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) !important;
  }

  .variant-deck,
  .variant-results {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}

/* 响应式优化 */
@media (max-width: 639px) {
  .logo-image {
    border-radius: 8px;
  }

  .core-navigation {
    margin-left: 8px;
    padding-left: 8px;
  }
}

.custom-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
}

.custom-select::-ms-expand {
  display: none;
}
</style>
