/**
 * 上下文管理 Composable
 * 负责管理优化上下文、上下文变量、上下文编辑器等相关功能
 */

import { ref, computed, watch, type Ref } from "vue";
import { useToast } from "@prompt-optimizer/ui";
import { quickTemplateManager } from "@prompt-optimizer/ui";
import type {
  ConversationMessage,
  OptimizationMode,
} from "@prompt-optimizer/core";
import type { AppServices } from "@prompt-optimizer/ui";

export interface ContextManagementOptions {
  services: Ref<AppServices | null>;
  selectedOptimizationMode: Ref<OptimizationMode>;
  advancedModeEnabled: Ref<boolean>;
  showContextEditor: Ref<boolean>;
  contextEditorDefaultTab: Ref<"messages" | "variables" | "tools">;
  contextEditorState: Ref<{
    messages: ConversationMessage[];
    variables: Record<string, string>;
    tools: any[];
    showVariablePreview: boolean;
    showToolManager: boolean;
    mode: "edit" | "preview";
  }>;
  variableManager: any;
  optimizer: any;
}

export function useContextManagement(options: ContextManagementOptions) {
  const {
    services,
    selectedOptimizationMode,
    advancedModeEnabled,
    showContextEditor,
    contextEditorDefaultTab,
    contextEditorState,
    variableManager,
    optimizer,
  } = options;

  // ==================== 状态定义 ====================

  // 上下文模式
  const contextMode =
    ref<import("@prompt-optimizer/core").ContextMode>("system");

  // 优化阶段上下文状态
  const optimizationContext = ref<ConversationMessage[]>([]);
  const optimizationContextTools = ref<any[]>([]);

  // 标记是否已从持久化仓库加载过上下文
  const isContextLoaded = ref(false);

  // 上下文持久化状态
  const currentContextId = ref<string | null>(null);
  const contextRepo = computed(() => services.value?.contextRepo);

  // 当前上下文的会话级变量
  const currentContextVariables = computed(() => {
    return contextEditorState.value.variables || {};
  });

  // 内置预定义变量
  const predefinedVariables = computed(() => {
    // optimizer 可能在初始化时为 null,需要安全访问
    if (!optimizer || typeof optimizer !== "object") {
      return {
        originalPrompt: "",
        lastOptimizedPrompt: "",
      };
    }
    return {
      originalPrompt: optimizer.prompt || "",
      lastOptimizedPrompt: optimizer.optimizedPrompt || "",
    };
  });

  // ==================== 监听 contextMode 变化 ====================

  // 监听 services 中的 contextMode 变化并同步到本地 ref
  watch(
    () => services.value?.contextMode.value,
    (newMode) => {
      if (newMode !== undefined) {
        contextMode.value = newMode;
        console.log("[useContextManagement] contextMode changed:", newMode);
      }
    },
    { immediate: true },
  );

  // ==================== 持久化相关 ====================

  // 初始化上下文持久化
  const initializeContextPersistence = async () => {
    if (!contextRepo.value) return;

    try {
      // 获取当前上下文ID
      currentContextId.value = await contextRepo.value.getCurrentId();

      if (currentContextId.value) {
        // 加载当前上下文
        const context = await contextRepo.value.get(currentContextId.value);
        if (context) {
          optimizationContext.value = [...context.messages];
          optimizationContextTools.value = [...(context.tools || [])];

          // 同步上下文变量到 contextEditorState
          contextEditorState.value = {
            ...contextEditorState.value,
            messages: [...context.messages],
            variables: context.variables || {},
            tools: [...(context.tools || [])],
          };
          console.log(
            "[useContextManagement] Initialized context variables from persistence:",
            Object.keys(context.variables || {}),
          );
        }
      }
    } catch (error) {
      console.warn(
        "[useContextManagement] Failed to initialize context persistence:",
        error,
      );
    } finally {
      isContextLoaded.value = true;
    }
  };

  // 持久化上下文更新（轻度节流）
  let persistContextUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  const persistContextUpdate = async (patch: {
    messages?: ConversationMessage[];
    variables?: Record<string, string>;
    tools?: any[];
  }) => {
    if (!contextRepo.value || !currentContextId.value) return;

    // 清除之前的定时器
    if (persistContextUpdateTimer) {
      clearTimeout(persistContextUpdateTimer);
    }

    // 设置新的节流定时器（300ms延迟）
    persistContextUpdateTimer = setTimeout(async () => {
      try {
        await contextRepo.value!.update(currentContextId.value!, patch);
        console.log("[useContextManagement] Context persisted to storage");
      } catch (error) {
        console.warn(
          "[useContextManagement] Failed to persist context update:",
          error,
        );
      }
    }, 300);
  };

  // 监听主界面上下文管理器的消息变更，自动持久化
  watch(
    optimizationContext,
    async (newMessages) => {
      // 避免与全屏编辑器重复持久化
      if (showContextEditor.value) return;
      await persistContextUpdate({ messages: newMessages });
    },
    { deep: true },
  );

  // ==================== 上下文编辑器相关 ====================

  // 打开上下文编辑器
  const handleOpenContextEditor = async (
    messagesOrTab?: ConversationMessage[] | "messages" | "variables" | "tools",
    _variables?: Record<string, string>,
  ) => {
    // 参数类型判断
    let messages: ConversationMessage[] | undefined;
    let defaultTab: "messages" | "variables" | "tools" = "messages";

    if (typeof messagesOrTab === "string") {
      defaultTab = messagesOrTab;
      messages = undefined;
    } else {
      messages = messagesOrTab;
    }

    // 设置默认标签页
    contextEditorDefaultTab.value = defaultTab;

    // 确保全局变量已加载并刷新
    try {
      await variableManager?.refresh?.();
    } catch (e) {
      console.warn(
        "[useContextManagement] Variable manager refresh failed:",
        e,
      );
    }

    // 若首次加载且高级模式开启且当前无会话消息，灌入默认模板
    if (
      advancedModeEnabled.value &&
      !isContextLoaded.value &&
      (!optimizationContext.value || optimizationContext.value.length === 0)
    ) {
      try {
        const defaultTemplate = quickTemplateManager.getTemplate(
          selectedOptimizationMode.value,
          "default",
        );
        if (defaultTemplate?.messages?.length) {
          optimizationContext.value = [...defaultTemplate.messages];
          console.log(
            `[useContextManagement] Auto-filled default template for ${selectedOptimizationMode.value}`,
          );
        }
      } catch (e) {
        console.warn(
          "[useContextManagement] Failed to auto-fill default template:",
          e,
        );
      }
    }

    // 从 contextRepo 读取真正的上下文变量
    let contextVariables: Record<string, string> = {};
    if (contextRepo.value && currentContextId.value) {
      try {
        const context = await contextRepo.value.get(currentContextId.value);
        contextVariables = context?.variables || {};
        console.log(
          "[useContextManagement] Loaded context variables from contextRepo:",
          Object.keys(contextVariables),
        );
      } catch (error) {
        console.warn(
          "[useContextManagement] Failed to load context variables:",
          error,
        );
      }
    }

    // 设置初始状态
    contextEditorState.value = {
      messages: messages || [...optimizationContext.value],
      variables: contextVariables,
      tools: [...optimizationContextTools.value],
      showVariablePreview: true,
      showToolManager: contextMode.value === "user",
      mode: "edit",
    };
    showContextEditor.value = true;
  };

  // 处理上下文编辑器保存
  const handleContextEditorSave = async (context: {
    messages: ConversationMessage[];
    variables: Record<string, string>;
    tools: any[];
  }) => {
    // 更新优化上下文
    optimizationContext.value = [...context.messages];
    optimizationContextTools.value = [...context.tools];

    // 持久化到contextRepo
    await persistContextUpdate({
      messages: context.messages,
      variables: context.variables,
      tools: context.tools,
    });

    // 关闭编辑器
    showContextEditor.value = false;

    // 显示成功提示
    useToast().success("上下文已更新");
  };

  // 处理上下文编辑器实时状态更新
  const handleContextEditorStateUpdate = async (state: {
    messages: ConversationMessage[];
    variables: Record<string, string>;
    tools: any[];
  }) => {
    // 实时同步状态到contextEditorState
    contextEditorState.value = { ...contextEditorState.value, ...state };

    // 实时更新优化上下文
    optimizationContext.value = [...state.messages];
    optimizationContextTools.value = [...(state.tools || [])];

    // 实时持久化
    await persistContextUpdate({
      messages: state.messages,
      variables: state.variables,
      tools: state.tools,
    });

    console.log("[useContextManagement] Context editor state synchronized");
  };

  // ==================== 上下文模式切换 ====================

  const handleContextModeChange = async (
    mode: import("@prompt-optimizer/core").ContextMode,
  ) => {
    if (!services.value) {
      console.warn("[useContextManagement] Services not ready");
      return;
    }

    try {
      // 更新本地 contextMode (会通过 watch 同步到 App.vue)
      if (contextMode.value !== mode) {
        contextMode.value = mode;
        console.log("[useContextManagement] Context mode changed to:", mode);
      }

      // 更新 services 中的 contextMode (需要判断类型，因为可能已经是字符串)
      if (services.value?.contextMode) {
        // 如果 contextMode 是 Ref，则更新其 value
        if (
          typeof services.value.contextMode === "object" &&
          "value" in services.value.contextMode
        ) {
          if (services.value.contextMode.value !== mode) {
            services.value.contextMode.value = mode;
          }
        }
      }
    } catch (error) {
      console.error(
        "[useContextManagement] Failed to change context mode:",
        error,
      );
      useToast().error("切换上下文模式失败");
    }
  };

  // ==================== 会话变量管理 ====================

  // 更新会话级变量
  const updateContextVariable = async (name: string, value: string) => {
    const updatedVariables = {
      ...contextEditorState.value.variables,
    };

    if (value && value.trim()) {
      updatedVariables[name] = value;
    } else {
      delete updatedVariables[name];
    }

    contextEditorState.value = {
      ...contextEditorState.value,
      variables: updatedVariables,
    };

    // 持久化
    await persistContextUpdate({ variables: updatedVariables });
  };

  // ==================== 返回 ====================

  return {
    // 状态
    contextMode,
    optimizationContext,
    optimizationContextTools,
    isContextLoaded,
    currentContextId,
    contextRepo,
    currentContextVariables,
    predefinedVariables,

    // 方法
    initializeContextPersistence,
    persistContextUpdate,
    handleOpenContextEditor,
    handleContextEditorSave,
    handleContextEditorStateUpdate,
    handleContextModeChange,
    updateContextVariable,
  };
}
