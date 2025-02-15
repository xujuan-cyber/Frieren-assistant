<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 to-purple-950 flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="flex-none sticky top-0 z-40 bg-purple-800/90 backdrop-blur-sm border-b border-purple-700/50 shadow-lg">
      <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <h1 class="text-lg sm:text-xl font-bold text-white">
          <slot name="title">Prompt Optimizer</slot>
        </h1>
        <div class="flex items-center gap-1 sm:gap-3">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 container mx-auto p-2 sm:p-4 overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
        <slot></slot>
      </div>
    </main>

    <!-- 弹窗插槽 -->
    <slot name="modals"></slot>

    <!-- 全局提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { Toast } from '../index'
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

/* 优化滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 隐藏水平滚动条 */
::-webkit-scrollbar-horizontal {
  display: none;
}
</style> 