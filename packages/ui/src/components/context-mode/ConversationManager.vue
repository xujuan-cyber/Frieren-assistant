<template>
    <NCard class="conversation-manager" :size="size" :bordered="false">
        <!-- 标题和统计信息 -->
        <template #header>
            <NSpace justify="space-between" align="center">
                <div>
                    <NSpace align="center" :size="8">
                        <NText class="text-base font-semibold">
                            {{ title || t("conversation.management.title") }}
                        </NText>
                        <!-- 系统模式标注 -->
                        <NTag
                            v-if="contextMode === 'system'"
                            :size="tagSize"
                            type="info"
                            :bordered="false"
                        >
                            <template #icon>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </template>
                            {{ t("contextMode.system.label") }}
                        </NTag>
                    </NSpace>
                    <div
                        v-if="messages.length > 0"
                        class="flex items-center gap-2 mt-1"
                    >
                        <NTag :size="tagSize" type="info">
                            {{
                                t("conversation.messageCount", {
                                    count: messages.length,
                                })
                            }}
                        </NTag>

                        <!-- 变量统计 -->
                        <NTag
                            v-if="
                                showVariablePreview &&
                                allUsedVariables.length > 0
                            "
                            :size="tagSize"
                            type="success"
                        >
                            <template #icon>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                            </template>
                            {{
                                t("variables.count", {
                                    count: allUsedVariables.length,
                                })
                            }}
                        </NTag>

                        <!-- 缺失变量警告 -->
                        <NTag
                            v-if="allMissingVariables.length > 0"
                            :size="tagSize"
                            type="warning"
                        >
                            <template #icon>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </template>
                            {{
                                t("variables.missing", {
                                    count: allMissingVariables.length,
                                })
                            }}
                        </NTag>

                        <!-- 工具数量统计 -->
                        <NTag
                            v-if="toolCount && toolCount > 0"
                            :size="tagSize"
                            type="primary"
                        >
                            <template #icon>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </template>
                            {{ t("tools.count", { count: toolCount }) }}
                        </NTag>
                    </div>
                </div>

                <!-- 操作按钮组 -->
                <NSpace :size="buttonSize">
                    <!-- 折叠/展开按钮 -->
                    <NButton
                        v-if="collapsible"
                        @click="toggleCollapse"
                        :size="buttonSize"
                        quaternary
                        circle
                        :title="
                            isCollapsed
                                ? t('common.expand')
                                : t('common.collapse')
                        "
                    >
                        <template #icon>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                class="transition-transform duration-200"
                                :class="{ 'rotate-180': isCollapsed }"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </template>
                    </NButton>

                    <!-- 打开上下文编辑器按钮 -->
                    <NButton
                        v-if="messages.length > 0 && canEditMessages"
                        @click="handleOpenContextEditor"
                        :size="buttonSize"
                        type="primary"
                        :loading="loading"
                    >
                        <template #icon>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </template>
                        {{ t("conversation.management.openEditor") }}
                    </NButton>
                </NSpace>
            </NSpace>
        </template>

        <!-- 消息列表内容 -->
        <div v-if="!isCollapsed" :style="contentStyle">
            <!-- 空状态 -->
            <NEmpty
                v-if="messages.length === 0"
                :description="t('conversation.noMessages')"
                size="small"
            >
                <template #icon>
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                    >
                        <path
                            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                        />
                    </svg>
                </template>
                <template #extra>
                    <NButton
                        v-if="canEditMessages"
                        @click="handleAddMessage"
                        :size="buttonSize"
                        type="primary"
                        dashed
                    >
                        {{ t("conversation.addFirst") }}
                    </NButton>
                </template>
            </NEmpty>

            <!-- 消息列表 -->
            <NScrollbar v-else :style="scrollbarStyle">
                <NList>
                    <NListItem
                        v-for="(message, index) in messages"
                        :key="`message-${index}`"
                        style="padding: 0"
                    >
                        <NCard
                            :size="cardSize"
                            embedded
                            :bordered="false"
                            content-style="padding: 0;"
                        >
                            <div class="cm-row">
                                <!-- 角色标签（小号，单行布局） -->
                                <NSpace align="center" :size="4" class="left">
                                    <NDropdown
                                        trigger="click"
                                        :options="roleOptions"
                                        placement="bottom-start"
                                        @select="
                                            (key) =>
                                                handleRoleSelect(
                                                    index,
                                                    key as
                                                        | 'system'
                                                        | 'user'
                                                        | 'assistant',
                                                )
                                        "
                                    >
                                        <NTag
                                            :size="tagSize"
                                            :type="getRoleTagType(message.role)"
                                            class="clickable-tag"
                                        >
                                            {{
                                                t(
                                                    `conversation.roles.${message.role}`,
                                                )
                                            }}
                                        </NTag>
                                    </NDropdown>
                                </NSpace>

                                <!-- 内容输入，单行自增高 -->
                                <div class="content">
                                    <NInput
                                        v-if="canEditMessages"
                                        :value="message.content"
                                        @update:value="
                                            (value) =>
                                                handleMessageUpdate(index, {
                                                    ...message,
                                                    content: value,
                                                })
                                        "
                                        type="textarea"
                                        :placeholder="
                                            t(
                                                `conversation.placeholders.${message.role}`,
                                            )
                                        "
                                        :autosize="{ minRows: 1, maxRows: 1 }"
                                        :resizable="false"
                                        :size="inputSize"
                                        :style="{ width: '100%' }"
                                    />
                                    <NText v-else>{{ message.content }}</NText>
                                </div>

                                <!-- 操作按钮（上/下/删） -->
                                <NSpace
                                    v-if="canEditMessages"
                                    :size="4"
                                    class="actions"
                                >
                                    <NButton
                                        v-if="index > 0"
                                        @click="handleMoveMessage(index, -1)"
                                        :size="buttonSize"
                                        quaternary
                                        circle
                                        :title="t('common.moveUp')"
                                    >
                                        <template #icon>
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 15l7-7 7 7"
                                                />
                                            </svg>
                                        </template>
                                    </NButton>

                                    <NButton
                                        v-if="index < messages.length - 1"
                                        @click="handleMoveMessage(index, 1)"
                                        :size="buttonSize"
                                        quaternary
                                        circle
                                        :title="t('common.moveDown')"
                                    >
                                        <template #icon>
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </template>
                                    </NButton>

                                    <NButton
                                        @click="handleDeleteMessage(index)"
                                        :size="buttonSize"
                                        quaternary
                                        circle
                                        type="error"
                                        :title="t('common.delete')"
                                    >
                                        <template #icon>
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </template>
                                    </NButton>
                                </NSpace>
                            </div>
                        </NCard>
                    </NListItem>
                </NList>

                <!-- 添加消息按钮（去边框、去额外内边距） -->
                <div v-if="canEditMessages" class="mt-4 add-row">
                    <NSpace justify="center">
                        <NDropdown
                            :options="addMessageOptions"
                            @select="handleAddMessageWithRole"
                        >
                            <NButton
                                :size="buttonSize"
                                dashed
                                type="primary"
                                block
                            >
                                <template #icon>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </template>
                                {{ t("conversation.addMessage") }}
                            </NButton>
                        </NDropdown>
                    </NSpace>
                </div>
            </NScrollbar>
        </div>
    </NCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'

import { useI18n } from "vue-i18n";
import {
    NCard,
    NSpace,
    NText,
    NTag,
    NButton,
    NEmpty,
    NScrollbar,
    NList,
    NListItem,
    NInput,
    NDropdown,
} from "naive-ui";
import { usePerformanceMonitor } from "../../composables/performance/usePerformanceMonitor";
import { useDebounceThrottle } from '../../composables/performance/useDebounceThrottle';
import type {
    ConversationManagerProps,
    ConversationManagerEvents,
} from "../../types/components";
import type { ConversationMessage } from "@prompt-optimizer/core";

const { t } = useI18n();

// 性能监控
const { recordUpdate } = usePerformanceMonitor("ConversationManager");

// 防抖节流
const { debounce, batchExecute } = useDebounceThrottle();

// Props 和 Events
const props = withDefaults(defineProps<ConversationManagerProps>(), {
    disabled: false,
    readonly: false,
    size: "medium",
    showVariablePreview: true,
    maxHeight: 400,
    collapsible: true,
    title: undefined,
    toolCount: 0,
    optimizationMode: "system",
    contextMode: "system",
    scanVariables: () => [],
    replaceVariables: (content: string) => content,
    isPredefinedVariable: () => false,
});

const emit = defineEmits<ConversationManagerEvents>();

// 状态管理 - 使用 shallowRef 优化大数据渲染
const loading = ref(false);
const isCollapsed = ref(false);

// 批处理状态更新优化
const batchStateUpdate = batchExecute((updates: Array<() => void>) => {
    updates.forEach((update) => update());
    recordUpdate();
}, 16); // 使用16ms批处理，匹配60fps

// 计算属性
const buttonSize = computed(() => {
    const sizeMap = {
        small: "tiny",
        medium: "small",
        large: "medium",
    } as const;
    return sizeMap[props.size] || "small";
});

const tagSize = computed(() => {
    const sizeMap = {
        small: "small",
        medium: "small",
        large: "medium",
    } as const;
    return sizeMap[props.size] || "small";
});

const cardSize = computed(() => {
    const sizeMap = {
        small: "small",
        medium: "small",
        large: "medium",
    } as const;
    return sizeMap[props.size] || "small";
});

const inputSize = computed(() => {
    const sizeMap = {
        small: "small",
        medium: "medium",
        large: "large",
    } as const;
    return sizeMap[props.size] || "medium";
});

const contentStyle = computed(() => {
    const style: Record<string, string | number> = {};
    if (props.maxHeight && !isCollapsed.value) {
        style.maxHeight = `${props.maxHeight}px`;
    }
    return style;
});

const scrollbarStyle = computed(() => {
    if (props.maxHeight && !isCollapsed.value) {
        return { maxHeight: `${props.maxHeight - 100}px` };
    }
    return {};
});

// 模式化行为：用户模式隐藏消息增删改按钮，系统模式保留完整能力
const canEditMessages = computed(() => {
    // readonly优先级最高
    if (props.readonly) return false;
    // 用户模式不允许编辑消息
    if (props.contextMode === "user") return false;
    // 系统模式允许编辑
    return true;
});

// 变量相关计算属性（统一使用注入函数）
const allUsedVariables = computed(() => {
    if (!props.showVariablePreview) return [];
    const vars = new Set<string>();
    props.messages.forEach((message) => {
        const content = message?.content || "";
        const detected = props.scanVariables(content) || [];
        detected.forEach((name) => vars.add(name));
    });
    return Array.from(vars);
});

const allMissingVariables = computed(() => {
    const available = props.availableVariables || {};
    return allUsedVariables.value.filter(
        (name) => available[name] === undefined,
    );
});

// 角色切换下拉
const roleOptions = computed(() => [
    { label: t("conversation.roles.system"), key: "system" },
    { label: t("conversation.roles.user"), key: "user" },
    { label: t("conversation.roles.assistant"), key: "assistant" },
    { label: t("conversation.roles.tool"), key: "tool" },
]);

// 添加消息的下拉菜单选项
const addMessageOptions = computed(() => [
    {
        label: t("conversation.roles.system"),
        key: "system",
        icon: () =>
            h(
                "svg",
                {
                    width: 14,
                    height: 14,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                },
                [
                    h("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "2",
                        d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
                    }),
                    h("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "2",
                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                    }),
                ],
            ),
    },
    {
        label: t("conversation.roles.user"),
        key: "user",
        icon: () =>
            h(
                "svg",
                {
                    width: 14,
                    height: 14,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                },
                [
                    h("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "2",
                        d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                    }),
                ],
            ),
    },
    {
        label: t("conversation.roles.assistant"),
        key: "assistant",
        icon: () =>
            h(
                "svg",
                {
                    width: 14,
                    height: 14,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                },
                [
                    h("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "2",
                        d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                    }),
                ],
            ),
    },
    {
        label: t("conversation.roles.tool"),
        key: "tool",
        icon: () =>
            h(
                "svg",
                {
                    width: 14,
                    height: 14,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                },
                [
                    h("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "2",
                        d: "M15.232 5.232a3 3 0 11-4.242 4.242L4.5 16H3v-1.5l6.232-6.232a3 3 0 114.242-4.242l3.536 3.536a1 1 0 010 1.414l-2.121 2.121a1 1 0 01-1.414 0l-1.414-1.414",
                    }),
                ],
            ),
    },
]);

// 工具函数
const getRoleTagType = (role: ConversationMessage["role"]) => {
    const typeMap = {
        system: "info",
        user: "success",
        assistant: "primary",
        tool: "warning",
    } as const;
    return typeMap[role] || "default";
};

// 动态autosize配置（轻量化版本）

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};

// 消息处理方法 - 优化防抖时间平衡响应性和性能
const handleMessageUpdate = debounce(
    (index: number, message: ConversationMessage) => {
        const newMessages = [...props.messages];
        newMessages[index] = message;
        emit("update:messages", newMessages);
        emit("messageChange", index, message, "update");
        recordUpdate();
    },
    150,
); // 降低到150ms，平衡用户体验和性能

const handleMoveMessage = (fromIndex: number, direction: number) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= props.messages.length) return;

    const newMessages = [...props.messages];
    const temp = newMessages[fromIndex];
    newMessages[fromIndex] = newMessages[toIndex];
    newMessages[toIndex] = temp;

    emit("update:messages", newMessages);
    emit("messageReorder", fromIndex, toIndex);
};

const handleDeleteMessage = (index: number) => {
    const newMessages = props.messages.filter((_, i) => i !== index);
    emit("update:messages", newMessages);
    emit("messageChange", index, props.messages[index], "delete");
};

const handleAddMessage = () => {
    handleAddMessageWithRole("user");
};

const handleAddMessageWithRole = (role: ConversationMessage["role"]) => {
    const newMessage: ConversationMessage = {
        role,
        content: "",
    };

    const newMessages = [...props.messages, newMessage];
    emit("update:messages", newMessages);
    emit("messageChange", newMessages.length - 1, newMessage, "add");
};

const handleOpenContextEditor = () => {
    emit("openContextEditor", [...props.messages], props.availableVariables);
};

// 角色切换
const handleRoleSelect = (index: number, role: ConversationMessage["role"]) => {
    const current = props.messages[index];
    if (!current || current.role === role) return;
    const updated: ConversationMessage = { ...current, role };
    const newMessages = [...props.messages];
    newMessages[index] = updated;
    emit("update:messages", newMessages);
    emit("messageChange", index, updated, "update");
};

// 生命周期 - 使用批处理优化
watch(
    () => props.messages,
    () => {
        batchStateUpdate(() => {
            emit("ready");
        });
    },
    { deep: true, immediate: true },
);
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
.conversation-manager {
    /* All styling handled by Naive UI components */
}

.cm-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    white-space: nowrap;
}

.cm-row .actions {
    flex-shrink: 0;
    opacity: 0.6;
    transition: opacity 0.15s ease;
}

.cm-row:hover .actions {
    opacity: 1;
}

.clickable-tag {
    cursor: pointer;
}

.cm-row .left {
    flex: 0 0 auto;
}

.cm-row .content {
    flex: 1 1 auto;
    min-width: 0;
}
</style>
