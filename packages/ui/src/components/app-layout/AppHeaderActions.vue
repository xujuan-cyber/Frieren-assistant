<template>
    <!--
        App 头部操作按钮组件

        职责:
        - 核心功能按钮: 模板管理、历史记录、模型管理、收藏夹、数据管理
        - 辅助功能: 主题切换、GitHub 链接、语言切换、更新检查

        设计说明:
        - 从 App.vue 的 #actions slot 提取出来
        - 所有操作通过 emits 通知父组件处理
        - 收藏夹是页面型目的地，其余管理入口保持弹窗型交互
    -->
    <!-- 页面型管理入口：会接管主内容区 -->
    <div class="page-destination-group" data-testid="header-page-destinations">
        <ActionButtonUI
            :text="$t('nav.favorites')"
            @click="emit('open-favorites')"
            :type="favoritesActive ? 'primary' : 'default'"
            data-testid="header-favorites-page-action"
            size="medium"
            :ghost="false"
            :round="true"
            :title="$t('favorites.page.title')"
            :aria-label="$t('nav.favorites')"
            :aria-current="favoritesActive ? 'page' : undefined"
            :class="{ 'page-destination-active': favoritesActive }"
        >
            <template #icon><NIcon :size="18"><Star /></NIcon></template>
        </ActionButtonUI>
    </div>

    <!-- 弹窗型管理/配置入口 -->
    <div class="modal-action-group" data-testid="header-modal-actions">
        <ActionButtonUI
            :text="$t('nav.templates')"
            @click="emit('open-templates')"
            type="default"
            size="medium"
            :ghost="false"
            :round="true"
            :aria-label="$t('nav.templates')"
        >
            <template #icon><NIcon :size="18"><FileText /></NIcon></template>
        </ActionButtonUI>
        <ActionButtonUI
            :text="$t('nav.history')"
            @click="emit('open-history')"
            type="default"
            size="medium"
            :ghost="false"
            :round="true"
            :aria-label="$t('nav.history')"
        >
            <template #icon><NIcon :size="18"><History /></NIcon></template>
        </ActionButtonUI>
        <ActionButtonUI
            :text="$t('nav.modelManager')"
            @click="emit('open-model-manager')"
            type="default"
            size="medium"
            :ghost="false"
            :round="true"
            :aria-label="$t('nav.modelManager')"
        >
            <template #icon><NIcon :size="18"><Cpu /></NIcon></template>
        </ActionButtonUI>
        <NBadge :show="backupReminderDue" dot processing>
            <ActionButtonUI
                :text="$t('nav.dataManager')"
                @click="emit('open-data-manager')"
                :type="backupReminderDue ? 'warning' : 'default'"
                size="medium"
                :ghost="false"
                :round="true"
                :title="backupReminderDue ? $t('dataManager.backupReminder.tooltip') : $t('nav.dataManager')"
                :aria-label="$t('nav.dataManager')"
            >
                <template #icon><NIcon :size="18"><Database /></NIcon></template>
            </ActionButtonUI>
        </NBadge>
        <ActionButtonUI
            :text="$t('nav.variableManager')"
            @click="emit('open-variables')"
            type="default"
            size="medium"
            :ghost="false"
            :round="true"
            :aria-label="$t('nav.variableManager')"
        >
            <template #icon><NIcon :size="18"><Variable /></NIcon></template>
        </ActionButtonUI>
    </div>
    <!-- 辅助功能区 - 使用简化样式降低视觉权重 -->
    <ThemeToggleUI />
    <div class="aux-icon-group">
        <NPopover
            v-model:show="showAboutPopover"
            trigger="click"
            placement="bottom-end"
            :show-arrow="false"
        >
            <template #trigger>
                <NButton
                    quaternary
                    circle
                    size="small"
                    class="aux-icon-button"
                    :title="$t('nav.about')"
                >
                    <template #icon>
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 10v6" />
                            <path d="M12 7.25h.01" />
                        </svg>
                    </template>
                </NButton>
            </template>

            <div class="about-panel">
                <div class="about-panel-header">
                    <NText class="about-app-name">{{ $t('about.title') }}</NText>
                    <NTag round size="small" class="about-version-tag">{{ appVersion }}</NTag>
                </div>
            </div>
        </NPopover>
        <LanguageSwitchDropdown />
        <!-- 自动更新组件 - 仅在Electron环境中显示 -->
        <UpdaterIcon />
    </div>
</template>

<script setup lang="ts">
/**
 * App 头部操作按钮组件
 *
 * @description
 * 从 App.vue 提取出的头部操作按钮组件，用于 MainLayoutUI 的 #actions slot。
 * 包含核心功能按钮和辅助功能按钮两部分。
 *
 * @features
 * - 核心功能: 模板管理、历史记录、模型管理、收藏夹、数据管理
 * - 辅助功能: 主题切换、GitHub 链接、语言切换、更新检查
 * - 所有操作通过 emits 通知父组件
 *
 * @example
 * ```vue
 * <template #actions>
 *   <AppHeaderActions
 *     @open-templates="openTemplateManager"
 *     @open-history="historyManager.showHistory = true"
 *     @open-model-manager="modelManager.showConfig = true"
 *     @open-favorites="openFavoritesPage"
 *     @open-data-manager="showDataManager = true"
 *     :app-version="appVersion"
 *   />
 * </template>
 * ```
 */
import { ref } from 'vue'

import ActionButtonUI from '../ActionButton.vue'
import ThemeToggleUI from '../ThemeToggleUI.vue'
import LanguageSwitchDropdown from '../LanguageSwitchDropdown.vue'
import UpdaterIcon from '../UpdaterIcon.vue'
import { NBadge, NButton, NIcon, NPopover, NTag, NText } from 'naive-ui'
import { Cpu, Database, FileText, History, Star, Variable } from '@vicons/tabler'

interface Props {
    appVersion: string
    favoritesActive?: boolean
    backupReminderDue?: boolean
}

withDefaults(defineProps<Props>(), {
    favoritesActive: false,
    backupReminderDue: false,
})

// ========================
// Emits 定义
// ========================
const emit = defineEmits<{
    /** 打开模板管理器 */
    'open-templates': []
    /** 打开历史记录 */
    'open-history': []
    /** 打开模型管理器 */
    'open-model-manager': []
    /** 打开收藏夹 */
    'open-favorites': []
    /** 打开数据管理器 */
    'open-data-manager': []
    /** 打开变量管理器 */
    'open-variables': []
}>()

const showAboutPopover = ref(false)
</script>

<style scoped>
.aux-icon-button {
    width: 30px;
    height: 30px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.2s ease;
}

.aux-icon-button:hover {
    transform: translateY(-1px);
}

.aux-icon-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 6px;
}

.page-destination-group,
.modal-action-group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.page-destination-group {
    padding-right: 8px;
    border-right: 1px solid var(--n-border-color);
}

.page-destination-active {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 18%, transparent);
}

.about-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 180px;
    max-width: 260px;
}

.about-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.about-app-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.about-version-tag {
    flex-shrink: 0;
    max-width: 100%;
}
</style>
