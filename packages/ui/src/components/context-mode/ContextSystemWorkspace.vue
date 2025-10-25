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
                    :label="t('promptOptimizer.originalPrompt')"
                    :placeholder="
                        t('promptOptimizer.originalPromptPlaceholder')
                    "
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

            <!-- 会话管理器 (系统模式专属) -->
            <NCard
                :style="{ flexShrink: 0, overflow: 'auto' }"
                content-style="padding: 0;"
            >
                <ConversationManager
                    :messages="optimizationContext"
                    @update:messages="
                        emit('update:optimizationContext', $event)
                    "
                    :available-variables="availableVariables"
                    :scan-variables="scanVariables"
                    :optimization-mode="optimizationMode"
                    context-mode="system"
                    :tool-count="toolCount"
                    @open-variable-manager="emit('open-variable-manager')"
                    @open-context-editor="emit('open-context-editor')"
                    :collapsible="true"
                    :max-height="300"
                />
            </NCard>

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
                            <template #icon><span>⚙️</span></template>
                            {{ $t("contextMode.system.label") }}
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
                    </NFlex>
                </NFlex>
            </NCard>

            <!-- 测试区域主内容 -->
            <NCard
                :style="{ flex: 1, overflow: 'auto' }"
                content-style="height: 100%; max-height: 100%; overflow: hidden;"
            >
                <TestAreaPanel
                    ref="testAreaPanelRef"
                    :optimization-mode="optimizationMode"
                    context-mode="system"
                    :optimized-prompt="optimizedPrompt"
                    :is-test-running="isTestRunning"
                    :global-variables="globalVariables"
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
                    @test="handleTestWithVariables"
                    @compare-toggle="emit('compare-toggle')"
                    @open-variable-manager="emit('open-variable-manager')"
                    @open-preview="emit('open-test-preview')"
                    @variable-change="
                        (name: string, value: string) => emit('variable-change', name, value)
                    "
                    @save-to-global="
                        (name: string, value: string) => emit('save-to-global', name, value)
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
import { ref } from 'vue'

import { useI18n } from "vue-i18n";
import { NCard, NFlex, NButton, NText, NTag } from "naive-ui";
import { useBreakpoints } from "@vueuse/core";
import InputPanelUI from "../InputPanel.vue";
import PromptPanelUI from "../PromptPanel.vue";
import TestAreaPanel from "../TestAreaPanel.vue";
import ConversationManager from "./ConversationManager.vue";
import type { OptimizationMode, ConversationMessage } from "../../types";
import type {
    IServices,
    PromptRecord,
    Template,
} from "@prompt-optimizer/core";
import type { TestAreaPanelInstance } from "../types/test-area";
import type { IteratePayload, SaveFavoritePayload } from "../../types/workspace";

// 响应式断点
const breakpoints = useBreakpoints({
    mobile: 640,
    tablet: 1024,
});
const isMobile = breakpoints.smaller("mobile");

// Props 定义 (移除 contextMode，因为固定为 system)
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
    versions: PromptRecord[];
    currentVersionId: string | null;
    selectedIterateTemplate: Template | null;

    // 上下文数据 (系统模式专属)
    optimizationContext: ConversationMessage[];
    toolCount: number;

    // 测试数据
    testContent: string;
    isCompareMode: boolean;

    // 变量数据
    globalVariables: Record<string, string>;
    predefinedVariables: Record<string, string>;
    availableVariables: Record<string, string>;
    scanVariables: (content: string) => string[];

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

// Emits 定义
const emit = defineEmits<{
    // 数据更新
    "update:prompt": [value: string];
    "update:optimizedPrompt": [value: string];
    "update:selectedIterateTemplate": [value: Template | null];
    "update:optimizationContext": [value: ConversationMessage[]];
    "update:testContent": [value: string];
    "update:isCompareMode": [value: boolean];

    // 操作事件
    optimize: [];
    iterate: [payload: IteratePayload];
    test: [testVariables: Record<string, string>]; // 🆕 传递测试变量
    "compare-toggle": [];
    "switch-version": [version: PromptRecord];
    "save-favorite": [data: SaveFavoritePayload];

    // 打开面板/管理器
    "open-global-variables": [];
    "open-variable-manager": [];
    "open-context-editor": [tab?: string];
    "open-template-manager": [type?: string];
    "config-model": [];

    // 预览相关
    "open-input-preview": [];
    "open-prompt-preview": [];
    "open-test-preview": [];

    // 变量管理
    "variable-change": [name: string, value: string];
    "save-to-global": [name: string, value: string];
}>();

const { t } = useI18n();

// 🆕 TestAreaPanel 引用
const testAreaPanelRef = ref<TestAreaPanelInstance | null>(null);

// 🆕 处理测试事件并获取测试变量
const handleTestWithVariables = async () => {
    // 从 ref 获取测试变量
    const testVariables = testAreaPanelRef.value?.getVariableValues?.() || {};

    // 触发测试事件，传递测试变量给 App.vue
    emit('test', testVariables);
};

// 暴露 TestAreaPanel 引用给父组件（用于工具调用等高级功能）
defineExpose({
    testAreaPanelRef
});
</script>
