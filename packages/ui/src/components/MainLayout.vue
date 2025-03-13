<template>
  <div class="min-h-screen transition-colors duration-300">
    <!-- 顶部导航栏 -->
    <header class="theme-header">
      <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <h1 class="text-lg sm:text-xl font-bold theme-title flex items-center gap-2">
          <img src="../assets/logo.jpg" alt="Logo" class="h-8 w-8 rounded-lg" />
          <slot name="title">{{ t('common.appName') }}</slot>
        </h1>
        <div class="flex items-center gap-1 sm:gap-3">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 container mx-auto p-2 sm:p-4 lg:overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 sm:h-[calc(100vh-5.8rem)]">
        <slot></slot>
      </div>
    </main>

    <!-- 弹窗插槽 -->
    <slot name="modals"></slot>

    <!-- 全局提示 -->
    <ToastUI />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ToastUI } from '../index'

const { t } = useI18n()
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