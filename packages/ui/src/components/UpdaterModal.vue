<template>
  <Modal 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #title>
      {{ t('updater.title') }}
    </template>

    <!-- 版本信息 -->
    <div class="mb-4 space-y-3">
      <!-- 当前版本 -->
      <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('updater.currentVersion') }}
        </div>
        <div v-if="state.currentVersion" class="font-medium text-gray-900 dark:text-white">
          v{{ state.currentVersion }}
        </div>
        <div v-else class="font-medium text-red-600 dark:text-red-400">
          {{ t('updater.versionLoadFailed') }}
        </div>
      </div>

      <!-- 正式版信息 -->
      <div v-if="state.stableVersion" class="relative p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
        <!-- 更新标识 -->
        <div v-if="state.hasStableUpdate" class="absolute -top-2 -right-2 px-2 py-1 text-xs rounded-full bg-red-500 text-white">
          {{ t('updater.hasUpdate') }}
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-green-600 dark:text-green-400">
                {{ t('updater.latestStableVersion') }}
              </span>
              <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {{ t('updater.stable') }}
              </span>
            </div>
            <div class="font-medium text-green-900 dark:text-green-100">
              v{{ state.stableVersion }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="state.stableReleaseUrl"
              @click="openStableReleaseUrl"
              class="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
            >
              {{ t('updater.details') }}
            </button>
            <button
              v-if="state.hasStableUpdate"
              @click="handleIgnoreStableUpdate"
              class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {{ t('updater.ignore') }}
            </button>
            <button
              @click="handleDownloadStable"
              :disabled="state.isDownloadingStable || state.isDownloading || state.isCheckingUpdate"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                (state.isDownloadingStable || state.isDownloading || state.isCheckingUpdate)
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              ]"
            >
              <span v-if="state.isDownloadingStable" class="flex items-center gap-1">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {{ t('updater.downloadingShort') }}
              </span>
              <span v-else>{{ t('updater.download') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 预览版信息 -->
      <div v-if="state.prereleaseVersion" class="relative p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-3">
        <!-- 更新标识 -->
        <div v-if="state.hasPrereleaseUpdate" class="absolute -top-2 -right-2 px-2 py-1 text-xs rounded-full bg-red-500 text-white">
          {{ t('updater.hasUpdate') }}
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-orange-600 dark:text-orange-400">
                {{ t('updater.latestPrereleaseVersion') }}
              </span>
              <span class="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                {{ t('updater.prerelease') }}
              </span>
            </div>
            <div class="font-medium text-orange-900 dark:text-orange-100">
              v{{ state.prereleaseVersion }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="state.prereleaseReleaseUrl"
              @click="openPrereleaseReleaseUrl"
              class="px-3 py-1 text-sm bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 rounded-md hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors"
            >
              {{ t('updater.details') }}
            </button>
            <button
              v-if="state.hasPrereleaseUpdate"
              @click="handleIgnorePrereleaseUpdate"
              class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {{ t('updater.ignore') }}
            </button>
            <button
              @click="handleDownloadPrerelease"
              :disabled="state.isDownloadingPrerelease || state.isDownloading || state.isCheckingUpdate"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                (state.isDownloadingPrerelease || state.isDownloading || state.isCheckingUpdate)
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              ]"
            >
              <span v-if="state.isDownloadingPrerelease" class="flex items-center gap-1">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {{ t('updater.downloadingShort') }}
              </span>
              <span v-else>{{ t('updater.download') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>



    <!-- 开发环境提示 -->
    <div v-if="state.lastCheckResult === 'dev-disabled'" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
      <div class="text-blue-600 dark:text-blue-400 font-medium">
        {{ t('updater.devEnvironment') }}
      </div>
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

      <!-- 更新可用时的按钮移到页脚处理 -->
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
      <!-- 下载完成时的按钮移到页脚处理 -->
    </div>

    <template #footer>
      <!-- 固定页脚：只有关闭和检查更新两个按钮 -->
      <div class="flex justify-between w-full">
        <button
          @click="$emit('update:modelValue', false)"
          class="theme-button-secondary"
        >
          {{ t('common.close') }}
        </button>
        <button
          @click="handleCheckUpdate"
          :disabled="state.isCheckingUpdate"
          class="theme-button-primary"
        >
          {{ state.isCheckingUpdate ? t('updater.checking') : t('updater.checkNow') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { useUpdater } from '../composables/useUpdater'
import Modal from './Modal.vue'

const { t } = useI18n()

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// 使用 useUpdater 管理所有更新逻辑
const {
  state,
  checkUpdate,
  startDownload,
  installUpdate,
  ignoreUpdate,
  togglePrerelease,
  openReleaseUrl,
  downloadStableVersion,
  downloadPrereleaseVersion
} = useUpdater()

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
  emit('update:modelValue', false) // 忽略后关闭模态框
}



const handleOpenReleaseUrl = async () => {
  await openReleaseUrl()
}

const openStableReleaseUrl = async () => {
  if (!state.stableReleaseUrl || !isRunningInElectron() || !window.electronAPI?.shell) return

  try {
    const result = await window.electronAPI.shell.openExternal(state.stableReleaseUrl)
    // 检查结果格式，有些版本可能直接返回boolean或其他格式
    if (result && typeof result === 'object' && result.success === false) {
      console.error('[UpdaterModal] Open stable release URL failed:', result.error)
    }
    // 如果成功打开或者返回格式不同，不记录错误
  } catch (error) {
    console.error('[UpdaterModal] Open stable release URL error:', error)
  }
}

const openPrereleaseReleaseUrl = async () => {
  if (!state.prereleaseReleaseUrl || !isRunningInElectron() || !window.electronAPI?.shell) return

  try {
    const result = await window.electronAPI.shell.openExternal(state.prereleaseReleaseUrl)
    // 检查结果格式，有些版本可能直接返回boolean或其他格式
    if (result && typeof result === 'object' && result.success === false) {
      console.error('[UpdaterModal] Open prerelease release URL failed:', result.error)
    }
    // 如果成功打开或者返回格式不同，不记录错误
  } catch (error) {
    console.error('[UpdaterModal] Open prerelease release URL error:', error)
  }
}

const handleDownloadStable = async () => {
  await downloadStableVersion()
}

const handleDownloadPrerelease = async () => {
  await downloadPrereleaseVersion()
}

const handleIgnoreStableUpdate = async () => {
  if (state.stableVersion) {
    await ignoreUpdate(state.stableVersion, 'stable')
  }
}

const handleIgnorePrereleaseUpdate = async () => {
  if (state.prereleaseVersion) {
    await ignoreUpdate(state.prereleaseVersion, 'prerelease')
  }
}

// 打开远程发布页面
const openRemoteReleaseUrl = async () => {
  if (!state.remoteReleaseUrl || !isRunningInElectron() || !window.electronAPI?.shell) return

  try {
    const result = await window.electronAPI.shell.openExternal(state.remoteReleaseUrl)

    if (!result.success) {
      console.error('[UpdaterModal] Open remote release URL failed:', result.error)
    }
  } catch (error) {
    console.error('[UpdaterModal] Open remote release URL error:', error)
  }
}



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
