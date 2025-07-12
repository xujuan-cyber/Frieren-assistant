<template>
  <div class="updater-panel absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
    <div class="p-4">
      <!-- 标题 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('updater.title') }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 当前版本信息 -->
      <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('updater.currentVersion') }}
        </div>
        <div class="font-medium text-gray-900 dark:text-white">
          v{{ currentVersion }}
        </div>
      </div>

      <!-- 预览版设置 -->
      <div class="mb-4 flex items-center justify-between">
        <label class="text-sm text-gray-700 dark:text-gray-300">
          {{ t('updater.allowPrerelease') }}
        </label>
        <button
          @click="$emit('toggle-prerelease')"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :class="state.allowPrerelease ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="state.allowPrerelease ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <!-- 默认视图：无更新 -->
      <div v-if="!state.hasUpdate && !state.isCheckingUpdate" class="text-center py-4">
        <div class="text-gray-600 dark:text-gray-400 mb-4">
          {{ t('updater.noUpdatesAvailable') }}
        </div>
        <button
          @click="$emit('check-update')"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ t('updater.checkNow') }}
        </button>
      </div>

      <!-- 检查更新中 -->
      <div v-if="state.isCheckingUpdate" class="text-center py-4">
        <div class="flex items-center justify-center mb-2">
          <svg class="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div class="text-gray-600 dark:text-gray-400">
          {{ t('updater.checkingForUpdates') }}
        </div>
      </div>

      <!-- 更新可用视图 -->
      <div v-if="state.hasUpdate && !state.isDownloading && !state.isDownloaded" class="space-y-4">
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="text-sm text-blue-600 dark:text-blue-400 mb-1">
            {{ t('updater.newVersionAvailable') }}
          </div>
          <div class="font-medium text-blue-900 dark:text-blue-100">
            v{{ state.updateInfo?.version }}
          </div>
          <div v-if="state.updateInfo?.releaseDate" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {{ formatDate(state.updateInfo.releaseDate) }}
          </div>
        </div>

        <div class="flex flex-col space-y-2">
          <button
            @click="$emit('open-release-url')"
            class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {{ t('updater.viewDetails') }}
          </button>
          <button
            @click="$emit('start-download')"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {{ t('updater.downloadUpdate') }}
          </button>
          <button
            @click="$emit('ignore-update', state.updateInfo?.version)"
            class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {{ t('updater.ignoreVersion') }}
          </button>
        </div>
      </div>

      <!-- 下载中视图 -->
      <div v-if="state.isDownloading" class="space-y-4">
        <div class="text-center">
          <div class="text-gray-700 dark:text-gray-300 mb-2">
            {{ t('updater.downloading') }}
          </div>
          <div v-if="state.downloadProgress" class="space-y-2">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${state.downloadProgress.percent}%` }"
              />
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ Math.round(state.downloadProgress.percent) }}% 
              ({{ formatBytes(state.downloadProgress.transferred) }} / {{ formatBytes(state.downloadProgress.total) }})
            </div>
          </div>
        </div>
      </div>

      <!-- 下载完成视图 -->
      <div v-if="state.isDownloaded" class="text-center space-y-4">
        <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="text-green-600 dark:text-green-400 font-medium">
            {{ t('updater.downloadComplete') }}
          </div>
        </div>
        <button
          @click="$emit('install-update')"
          class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {{ t('updater.installAndRestart') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { isRunningInElectron } from '@prompt-optimizer/core'
import type { UpdaterState } from '../composables/useUpdater'

const { t } = useI18n()

interface Props {
  state: UpdaterState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'check-update': []
  'start-download': []
  'install-update': []
  'ignore-update': [version?: string]
  'toggle-prerelease': []
  'open-release-url': []
}>()

// 获取当前版本（从应用API）
const appVersion = ref('1.2.0') // 默认值，防止加载时闪烁

const currentVersion = computed(() => {
  return appVersion.value
})

// 在组件挂载时获取真实版本号
onMounted(async () => {
  if (isRunningInElectron() && window.electronAPI?.app) {
    try {
      const version = await window.electronAPI.app.getVersion()
      appVersion.value = version
      console.log('[UpdaterPanel] App version loaded:', version)
    } catch (error) {
      console.warn('[UpdaterPanel] Failed to get app version, using default:', error)
      // 保持默认值
    }
  }
})

// 格式化日期
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

// 格式化字节数
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.updater-panel {
  /* 确保面板在最上层 */
  z-index: 9999;
}
</style>
