<template>
  <NLayout style="position: fixed; inset: 0; width: 100vw; height: 100vh; 
  max-height: 100vh;
  overflow: hidden; display: flex;  min-height: 0;"
  content-style="height: 100%; max-height: 100%; overflow: hidden; min-height: 0;"
  >


    <NFlex vertical style="position: fixed; inset: 0; width: 100vw; max-height: 100vh; height: 100vh">
    <!-- 顶部导航栏 -->
    <NLayoutHeader class="theme-header" style="max-height: 10vh;">
      <NSpace justify="space-between" align="center" class="w-full px-2 sm:px-4 py-2 sm:py-3">
        <!-- 左侧：Logo + 标题 -->
        <NSpace align="center" :size="8">
          <NImage
            :src="logoSrc"
            alt="Logo"
            width="32"
            height="32"
            object-fit="cover"
            class="rounded-lg"
            :show-toolbar="false"
          />
          <NH1 class="text-lg sm:text-xl font-bold theme-title m-0">
            <slot name="title">{{ t('common.appName') }}</slot>
          </NH1>
        </NSpace>

        <!-- 右侧：操作按钮 -->
        <NSpace align="center" :size="4" class="flex items-center">
          <slot name="actions"></slot>
        </NSpace>
      </NSpace>
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

    <!-- 全局提示 -->
    <ToastUI />
  </NLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NLayout, NLayoutHeader, NLayoutContent, NSpace, NImage, NH1 } from 'naive-ui'
import { ToastUI } from '../index'
import logoImage from '../assets/logo.jpg'

const { t } = useI18n()

// Logo图片路径
const logoSrc = logoImage
</script>

<style>
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
