<template>
  <!-- 仅在Electron环境中显示 -->
  <div v-if="isElectronEnvironment" class="relative">
    <button
      @click="togglePanel"
      :title="t('updater.checkForUpdates')"
      class="theme-icon-button relative"
      :class="{ 'has-update': state.hasUpdate }"
    >
      <!-- 更新图标 -->
      <span class="text-lg">
        <svg
          v-if="state.isCheckingUpdate"
          class="w-5 h-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </span>

      <!-- 更新提示小红点 -->
      <div
        v-if="state.hasUpdate"
        class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"
      />
    </button>

    <!-- 更新面板 -->
    <UpdaterPanel
      v-if="showPanel"
      :state="state"
      @close="showPanel = false"
      @check-update="handleCheckUpdate"
      @start-download="handleStartDownload"
      @install-update="handleInstallUpdate"
      @ignore-update="handleIgnoreUpdate"
      @toggle-prerelease="handleTogglePrerelease"
      @open-release-url="handleOpenReleaseUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { useUpdater } from '../composables/useUpdater'
import UpdaterPanel from './UpdaterPanel.vue'

const { t } = useI18n()

// 环境检测
const isElectronEnvironment = isRunningInElectron()

// 更新器状态和方法
const {
  state,
  checkUpdate,
  startDownload,
  installUpdate,
  ignoreUpdate,
  togglePrerelease,
  openReleaseUrl
} = useUpdater()

// 面板显示状态
const showPanel = ref(false)

// 切换面板显示
const togglePanel = () => {
  showPanel.value = !showPanel.value
}

// 事件处理器
const handleCheckUpdate = async () => {
  await checkUpdate()
}

const handleStartDownload = async () => {
  await startDownload()
}

const handleInstallUpdate = async () => {
  await installUpdate()
}

const handleIgnoreUpdate = async (version?: string) => {
  await ignoreUpdate(version)
  showPanel.value = false // 忽略后关闭面板
}

const handleTogglePrerelease = async () => {
  await togglePrerelease()
}

const handleOpenReleaseUrl = async () => {
  await openReleaseUrl()
}

// 点击外部关闭面板
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.updater-panel') && !target.closest('.theme-icon-button')) {
    showPanel.value = false
  }
}

// 监听点击外部事件
if (isElectronEnvironment) {
  document.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.theme-icon-button {
  @apply p-2 rounded-lg transition-colors duration-200;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50;
}

.theme-icon-button.has-update {
  @apply text-blue-600 dark:text-blue-400;
}

.theme-icon-button:hover {
  @apply bg-gray-100 dark:bg-gray-700;
}
</style>
