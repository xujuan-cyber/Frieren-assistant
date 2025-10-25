<template>
    <NFlex
        justify="space-between"
        :style="{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            'max-height': '100%',
            gap: '16px',
        }"
    >
        <!-- 左侧：优化区域 -->
        <NFlex
            vertical
            :style="{
                flex: 1,
                overflow: 'auto',
                height: '100%',
            }"
        >
            <!-- 提示词输入面板 -->
            <NCard
                :style="{
                    flexShrink: 0,
                    minHeight: '200px',
                }"
            >
                <InputPanelUI
                    :modelValue="prompt"
                    @update:modelValue="emit('update:prompt', $event)"
                    :label="t('promptOptimizer.userPromptInput')"
                    :placeholder="t('promptOptimizer.userPromptPlaceholder')"
                    :model-label="t('promptOptimizer.optimizeModel')"
                    :template-label="t('promptOptimizer.templateLabel')"
                    :button-text="t('promptOptimizer.optimize')"
                    :loading-text="t('common.loading')"
                    :loading="isOptimizing"
                    :disabled="isOptimizing"
                    :show-preview="true"
                    @submit="emit('optimize')"
                    @configModel="emit('config-model')"
                    @open-preview="emit('open-input-preview')"
                >
                    <template #model-select>
                        <slot name="optimize-model-select"></slot>
                    </template>
                    <template #template-select>
                        <slot name="template-select"></slot>
                    </template>
                </InputPanelUI>
            </NCard>

            <!-- 用户模式没有会话管理器 -->

            <!-- 优化结果面板 -->
            <NCard
                :style="{
                    flex: 1,
                    minHeight: '200px',
                    overflow: 'hidden',
                }"
                content-style="height: 100%; max-height: 100%; overflow: hidden;"
            >
                <PromptPanelUI
                    :optimized-prompt="optimizedPrompt"
                    @update:optimizedPrompt="
                        emit('update:optimizedPrompt', $event)
                    "
                    :reasoning="optimizedReasoning"
                    :original-prompt="prompt"
                    :is-optimizing="isOptimizing"
                    :is-iterating="isIterating"
                    :selectedIterateTemplate="selectedIterateTemplate"
                    @update:selectedIterateTemplate="
                        emit('update:selectedIterateTemplate', $event)
                    "
                    :versions="versions"
                    :current-version-id="currentVersionId"
                    :optimization-mode="optimizationMode"
                    :services="services"
                    :advanced-mode-enabled="true"
                    :show-preview="true"
                    @iterate="emit('iterate', $event)"
                    @openTemplateManager="emit('open-template-manager', $event)"
                    @switchVersion="emit('switch-version', $event)"
                    @save-favorite="emit('save-favorite', $event)"
                    @open-preview="emit('open-prompt-preview')"
                />
            </NCard>
        </NFlex>

        <!-- 右侧：测试区域 -->
        <NFlex
            vertical
            :style="{
                flex: 1,
                overflow: 'auto',
                height: '100%',
                gap: '12px',
            }"
        >
            <!-- 测试区域操作栏 -->
            <NCard size="small" :style="{ flexShrink: 0 }">
                <NFlex justify="space-between" align="center">
                    <!-- 左侧：区域标识 -->
                    <NFlex align="center" :size="8">
                        <NText strong>{{ $t("test.areaTitle") }}</NText>
                        <NTag type="info" size="small">
                            <template #icon><span>👤</span></template>
                            {{ $t("contextMode.user.label") }}
                        </NTag>
                    </NFlex>

                    <!-- 右侧：快捷操作按钮 -->
                    <NFlex :size="8">
                        <NButton
                            size="small"
                            quaternary
                            @click="emit('open-global-variables')"
                            :title="$t('contextMode.actions.globalVariables')"
                        >
                            <template #icon><span>📊</span></template>
                            <span v-if="!isMobile">{{
                                $t("contextMode.actions.globalVariables")
                            }}</span>
                        </NButton>
                        <NButton
                            size="small"
                            quaternary
                            @click="emit('open-context-variables')"
                            :title="$t('contextMode.actions.contextVariables')"
                        >
                            <template #icon><span>📝</span></template>
                            <span v-if="!isMobile">{{
                                $t("contextMode.actions.contextVariables")
                            }}</span>
                        </NButton>
                        <NButton
                            size="small"
                            quaternary
                            @click="emit('open-tool-manager')"
                            :title="$t('contextMode.actions.toolManager')"
                        >
                            <template #icon><span>🔧</span></template>
                            <span v-if="!isMobile">{{
                                $t("contextMode.actions.toolManager")
                            }}</span>
                        </NButton>
                    </NFlex>
                </NFlex>
            </NCard>

            <!-- 测试区域主内容 -->
            <NCard
                :style="{ flex: 1, overflow: 'auto' }"
                content-style="height: 100%; max-height: 100%; overflow: hidden;"
            >
                <TestAreaPanel
                    :optimization-mode="optimizationMode"
                    context-mode="user"
                    :optimized-prompt="optimizedPrompt"
                    :is-test-running="isTestRunning"
                    :global-variables="globalVariables"
                    :context-variables="contextVariables"
                    :predefined-variables="predefinedVariables"
                    :testContent="testContent"
                    @update:testContent="emit('update:testContent', $event)"
                    :isCompareMode="isCompareMode"
                    @update:isCompareMode="emit('update:isCompareMode', $event)"
                    :enable-compare-mode="true"
                    :enable-fullscreen="true"
                    :input-mode="inputMode"
                    :control-bar-layout="controlBarLayout"
                    :button-size="buttonSize"
                    :conversation-max-height="conversationMaxHeight"
                    :show-original-result="true"
                    :result-vertical-layout="resultVerticalLayout"
                    @test="emit('test')"
                    @compare-toggle="emit('compare-toggle')"
                    @open-variable-manager="emit('open-variable-manager')"
                    @open-preview="emit('open-test-preview')"
                    @variable-change="
                        emit('variable-change', $event[0], $event[1])
                    "
                >
                    <!-- 模型选择插槽 -->
                    <template #model-select>
                        <slot name="test-model-select"></slot>
                    </template>

                    <!-- 结果显示插槽 -->
                    <template #original-result>
                        <slot name="original-result"></slot>
                    </template>

                    <template #optimized-result>
                        <slot name="optimized-result"></slot>
                    </template>

                    <template #single-result>
                        <slot name="single-result"></slot>
                    </template>
                </TestAreaPanel>
            </NCard>
        </NFlex>
    </NFlex>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NCard, NFlex, NButton, NText, NTag } from "naive-ui";
import { useBreakpoints } from "@vueuse/core";
import InputPanelUI from "../InputPanel.vue";
import PromptPanelUI from "../PromptPanel.vue";
import TestAreaPanel from "../TestAreaPanel.vue";
import type { OptimizationMode } from "../../types";
import type { IServices } from "@prompt-optimizer/core";

// 响应式断点
const breakpoints = useBreakpoints({
    mobile: 640,
    tablet: 1024,
});
const isMobile = breakpoints.smaller("mobile");

// Props 定义 (移除 contextMode 和 会话管理器相关的 props)
interface Props {
    // 核心状态
    prompt: string;
    optimizedPrompt: string;
    optimizedReasoning?: string;
    optimizationMode: OptimizationMode;

    // 优化状态
    isOptimizing: boolean;
    isIterating: boolean;
    isTestRunning?: boolean;

    // 版本管理
    versions: any[];
    currentVersionId: string | null;
    selectedIterateTemplate: any;

    // 测试数据
    testContent: string;
    isCompareMode: boolean;

    // 变量数据
    globalVariables: Record<string, string>;
    contextVariables: Record<string, string>;
    predefinedVariables: Record<string, string>;

    // 服务
    services: IServices | null;

    // 响应式布局配置
    inputMode?: "compact" | "normal";
    controlBarLayout?: "default" | "compact" | "minimal";
    buttonSize?: "small" | "medium" | "large";
    conversationMaxHeight?: number;
    resultVerticalLayout?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    optimizedReasoning: "",
    isTestRunning: false,
    inputMode: "normal",
    controlBarLayout: "default",
    buttonSize: "medium",
    conversationMaxHeight: 300,
    resultVerticalLayout: false,
});

// Emits 定义 (移除会话管理器相关的 emits)
const emit = defineEmits<{
    // 数据更新
    "update:prompt": [value: string];
    "update:optimizedPrompt": [value: string];
    "update:selectedIterateTemplate": [value: any];
    "update:testContent": [value: string];
    "update:isCompareMode": [value: boolean];

    // 操作事件
    optimize: [];
    iterate: [payload: any];
    test: [];
    "compare-toggle": [];
    "switch-version": [versionId: any];
    "save-favorite": [data: any];

    // 打开面板/管理器
    "open-global-variables": [];
    "open-context-variables": [];
    "open-tool-manager": [];
    "open-variable-manager": [];
    "open-template-manager": [type?: string];
    "config-model": [];

    // 预览相关
    "open-input-preview": [];
    "open-prompt-preview": [];
    "open-test-preview": [];

    // 变量管理
    "variable-change": [name: string, value: string];
}>();

const { t } = useI18n();
</script>
