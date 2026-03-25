<template>
    <!--
        App 头部操作按钮组件

        职责:
        - 核心功能按钮: 模板管理、历史记录、模型管理、收藏夹、数据管理
        - 辅助功能: 主题切换、GitHub 链接、语言切换、更新检查

        设计说明:
        - 从 App.vue 的 #actions slot 提取出来
        - 所有操作通过 emits 通知父组件处理
        - 保持与原实现完全一致的 UI 和行为
    -->
    <!-- 核心功能区 -->
    <ActionButtonUI
        icon="📝"
        :text="$t('nav.templates')"
        @click="emit('open-templates')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <ActionButtonUI
        icon="📜"
        :text="$t('nav.history')"
        @click="emit('open-history')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <ActionButtonUI
        icon="⚙️"
        :text="$t('nav.modelManager')"
        @click="emit('open-model-manager')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <ActionButtonUI
        icon="⭐"
        :text="$t('nav.favorites')"
        @click="emit('open-favorites')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <ActionButtonUI
        icon="💾"
        :text="$t('nav.dataManager')"
        @click="emit('open-data-manager')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <ActionButtonUI
        icon="🔣"
        :text="$t('nav.variableManager')"
        @click="emit('open-variables')"
        type="default"
        size="medium"
        :ghost="false"
        :round="true"
    />
    <!-- 辅助功能区 - 使用简化样式降低视觉权重 -->
    <ThemeToggleUI />
    <div class="aux-icon-group">
        <NButton
            quaternary
            circle
            size="small"
            class="aux-icon-button"
            :title="$t('updater.viewOnGitHub')"
            @click="emit('open-github')"
        >
            <template #icon>
                <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path
                        d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
                    />
                </svg>
            </template>
        </NButton>
        <NPopover
            v-model:show="showAboutPopover"
            trigger="click"
            placement="bottom-end"
            raw
            :show-arrow="false"
            content-class="about-popover-content"
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

            <div class="about-flyout">
                <span class="about-chip about-chip-version">{{ appVersion }}</span>

                <button type="button" class="about-chip about-chip-link" @click="handleOpenWebsite">
                    <span class="about-chip-text">
                        <span class="about-chip-label">{{ $t('about.website') }}</span>
                        <span class="about-chip-value">{{ $t('about.websiteLabel') }}</span>
                    </span>
                    <svg
                        class="about-chip-icon"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M6 4h6v6" />
                        <path d="M12 4 4.75 11.25" />
                    </svg>
                </button>

                <button type="button" class="about-chip about-chip-link" @click="handleOpenDocs">
                    <span class="about-chip-text">
                        <span class="about-chip-label">{{ $t('about.documentation') }}</span>
                        <span class="about-chip-value">{{ $t('about.documentationLabel') }}</span>
                    </span>
                    <svg
                        class="about-chip-icon"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M6 4h6v6" />
                        <path d="M12 4 4.75 11.25" />
                    </svg>
                </button>
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
 *     @open-favorites="showFavoriteManager = true"
 *     @open-data-manager="showDataManager = true"
 *     :app-version="appVersion"
 *     @open-website="openOfficialWebsite"
 *     @open-docs="openDocumentationSite"
 *     @open-github="openGithubRepo"
 *   />
 * </template>
 * ```
 */
import { ref } from 'vue'

import ActionButtonUI from '../ActionButton.vue'
import ThemeToggleUI from '../ThemeToggleUI.vue'
import LanguageSwitchDropdown from '../LanguageSwitchDropdown.vue'
import UpdaterIcon from '../UpdaterIcon.vue'
import { NButton, NPopover } from 'naive-ui'

interface Props {
    appVersion: string
}

defineProps<Props>()

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
    /** 打开官网 */
    'open-website': []
    /** 打开文档站 */
    'open-docs': []
    /** 打开 GitHub 仓库 */
    'open-github': []
}>()

const showAboutPopover = ref(false)

const handleOpenWebsite = () => {
    showAboutPopover.value = false
    emit('open-website')
}

const handleOpenDocs = () => {
    showAboutPopover.value = false
    emit('open-docs')
}
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

:deep(.about-popover-content) {
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
}

.about-flyout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 7px;
    padding-top: 8px;
}

.about-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    box-sizing: border-box;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-color, rgba(239, 239, 245, 0.82)) 86%, transparent);
    background: color-mix(in srgb, var(--card-color, #fff) 94%, transparent);
    color: inherit;
    backdrop-filter: blur(14px);
    box-shadow:
        0 10px 24px rgba(15, 23, 42, 0.08),
        0 2px 8px rgba(15, 23, 42, 0.05);
}

.about-chip-version {
    align-self: flex-end;
    padding: 4px 9px;
    font-size: 11px;
    line-height: 1;
    color: var(--text-color-3);
    border-color: color-mix(in srgb, var(--border-color, rgba(239, 239, 245, 0.8)) 68%, transparent);
    background: color-mix(in srgb, var(--hover-color, rgba(0, 0, 0, 0.03)) 70%, transparent);
    box-shadow:
        0 8px 18px rgba(15, 23, 42, 0.06),
        0 1px 4px rgba(15, 23, 42, 0.03);
}

.about-chip-link {
    max-width: 100%;
    min-width: 0;
    padding: 8px 12px 8px 13px;
    text-align: left;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease,
        transform 0.2s ease,
        box-shadow 0.2s ease;
}

.about-chip-link:hover {
    background: color-mix(in srgb, var(--hover-color, rgba(0, 0, 0, 0.04)) 78%, transparent);
    border-color: color-mix(in srgb, var(--primary-color, #18a058) 22%, var(--border-color, rgba(239, 239, 245, 0.8)));
    transform: translateY(-1px);
    box-shadow:
        0 12px 28px rgba(15, 23, 42, 0.1),
        0 3px 10px rgba(15, 23, 42, 0.06);
}

.about-chip-link:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--primary-color, #18a058) 28%, var(--border-color, rgba(239, 239, 245, 0.8)));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #18a058) 14%, transparent);
}

.about-chip-text {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
}

.about-chip-label {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-color-3);
}

.about-chip-value {
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-color-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.about-chip-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    color: var(--text-color-3);
    transition:
        color 0.2s ease,
        transform 0.2s ease;
}

.about-chip-link:hover .about-chip-icon {
    color: var(--text-color-2);
    transform: translate(1px, -1px);
}
</style>
