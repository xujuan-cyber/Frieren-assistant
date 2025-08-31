<template>
  <!-- 使用ToastUI包装整个布局以提供NMessageProvider -->
  <ToastUI>
    <NLayout style="position: fixed; inset: 0; width: 100vw; height: 100vh; 
    max-height: 100vh;
    overflow: hidden; display: flex;  min-height: 0;"
    content-style="height: 100%; max-height: 100%; overflow: hidden; min-height: 0;"
    >

      <NFlex vertical style="position: fixed; inset: 0; width: 100vw; max-height: 100vh; height: 100vh">
      <!-- 顶部导航栏 -->
      <NLayoutHeader class="theme-header nav-header-enhanced">
        <NFlex justify="space-between" align="center" class="w-full nav-content" :wrap="false" :size="[16, 12]">
          <!-- 左侧：Logo + 标题 -->
          <NFlex align="center" :size="8" :wrap="false">
            <NImage
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

          <!-- 右侧：操作按钮 -->
          <NFlex align="center" :size="8" :wrap="true" justify="end" class="nav-actions">
            <slot name="actions"></slot>
          </NFlex>
        </NFlex>
      </NLayoutHeader>

      <!-- 主要内容区域 - 严格控制在剩余空间内 -->
      <NLayoutContent has-sider
        style="flex: 1; min-height: 0; max-height: 90vh; height: 90vh;"
        content-style="height: 100%; max-height: 100%; overflow: hidden; min-height: 0;" 
      >
        <!-- content-style="height: 100%; max-height: 100%; overflow: hidden; min-height: 0;" -->
          <slot name="main"></slot>
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
import { NLayout, NLayoutHeader, NLayoutContent, NFlex, NImage, NText } from 'naive-ui'
import { ToastUI } from '../index'
import logoImage from '../assets/logo.jpg'

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
/* 增强导航栏样式 */
.nav-header-enhanced {
  min-height: 64px !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid var(--border-color, rgba(239, 239, 245, 0.6));
}

.nav-content {
  min-height: 40px;
}

.nav-actions {
  min-height: 40px;
}

/* Logo样式优化 */
.logo-image {
  border-radius: 6px;
  transition: transform 0.2s ease-in-out;
  flex-shrink: 0;
}

.logo-image:hover {
  transform: scale(1.05);
}

/* 标题文字对齐优化 */
.theme-title {
  line-height: 1.2 !important;
  margin: 0 !important;
  white-space: nowrap;
}

/* 响应式优化 */
@media (max-width: 639px) {
  .logo-image {
    border-radius: 4px;
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
