import { watch, computed, reactive, nextTick, type Ref } from 'vue'

import {
  MODEL_SELECTION_KEYS,
  type TextModelConfig,
} from "@prompt-optimizer/core";
import { useToast } from "./useToast";
import { useI18n } from "vue-i18n";
import { usePreferences } from "./usePreferenceManager";
import type { AppServices } from "../types/services";
import type { ModelSelectRefsHooks } from "./useModelSelectRefs";

export interface ModelManagerHooks {
  showConfig: boolean;
  selectedOptimizeModel: string;
  selectedTestModel: string;
  isModelSelectionReady: boolean; // 🆕 模型选择是否已初始化完成
  handleModelManagerClose: () => void;
  handleModelsUpdated: (modelKey: string) => void;
  handleModelSelect: (model: TextModelConfig) => void;
  initModelSelection: () => void;
  loadModels: () => void;
}

/**
 * 模型管理器Hook
 * @param services 服务实例引用
 * @param modelSelectRefs 模型选择器引用管理器
 * @returns ModelManagerHooks
 */
export function useModelManager(
  services: Ref<AppServices | null>,
  modelSelectRefs: ModelSelectRefsHooks,
): ModelManagerHooks {
  const toast = useToast();
  const { t } = useI18n();
  const { getPreference, setPreference } = usePreferences(services);

  // 模型管理器引用
  const modelManager = computed(() => services.value?.modelManager);

  // 初始化标志：用于避免初始化阶段的 watch 触发保存
  let isInitializing = true;

  // 创建一个 reactive 状态对象
  const state = reactive<ModelManagerHooks>({
    showConfig: false,
    selectedOptimizeModel: "", // 将在 initModelSelection 中立即设置
    selectedTestModel: "", // 将在 initModelSelection 中立即设置
    isModelSelectionReady: false, // 初始化未完成
    handleModelManagerClose: () => {
      // Close interface first
      state.showConfig = false;

      // Perform updates asynchronously without blocking
      nextTick(async () => {
        try {
          // Update data
          await state.loadModels();
          // Refresh model selection components using the new refs manager
          await modelSelectRefs.refreshAll();
        } catch (error) {
          console.error("Failed to refresh models after close:", error);
        }
      });
    },
    handleModelsUpdated: (modelKey: string) => {
      // Handle other logic after model update if needed
      console.log(t("toast.info.modelUpdated"), modelKey);
    },
    handleModelSelect: async (model: TextModelConfig) => {
      if (model) {
        state.selectedOptimizeModel = model.id;
        state.selectedTestModel = model.id;

        await saveModelSelection(model.id, "optimize");
        await saveModelSelection(model.id, "test");

        toast.success(t("toast.success.modelSelected", { name: model.name }));
      }
    },
    initModelSelection: async () => {
      try {
        const allModels = await modelManager.value!.getAllModels();
        const enabledModels = allModels.filter((m) => m.enabled);
        const defaultModel = enabledModels[0]?.id;

        if (enabledModels.length > 0) {
          const savedOptimizeModel = await getPreference(
            MODEL_SELECTION_KEYS.OPTIMIZE_MODEL,
            defaultModel,
          );

          state.selectedOptimizeModel = enabledModels.some(
            (m) => m.id === savedOptimizeModel,
          )
            ? savedOptimizeModel
            : defaultModel;

          const savedTestModel = await getPreference(
            MODEL_SELECTION_KEYS.TEST_MODEL,
            defaultModel,
          );

          state.selectedTestModel = enabledModels.some(
            (m) => m.id === savedTestModel,
          )
            ? savedTestModel
            : defaultModel;

          await saveModelSelection(state.selectedOptimizeModel, "optimize");
          await saveModelSelection(state.selectedTestModel, "test");
        }

        // 初始化完成，允许 watch 触发保存
        isInitializing = false;
        state.isModelSelectionReady = true;
      } catch (error) {
        console.error(t("toast.error.initModelSelectFailed"), error);
        toast.error(t("toast.error.initModelSelectFailed"));
        isInitializing = false; // 即使出错也要重置标志
        state.isModelSelectionReady = true; // 即使出错也标记为完成，避免永久阻塞
      }
    },
    loadModels: async () => {
      try {
        // Get latest enabled models list
        const allModels = await modelManager.value!.getAllModels();
        const enabledModels = allModels.filter((m) => m.enabled);
        const defaultModel = enabledModels[0]?.id;

        // Verify if current selected models are still available
        if (
          !enabledModels.find((m) => m.id === state.selectedOptimizeModel)
        ) {
          state.selectedOptimizeModel = defaultModel || "";
        }
        if (!enabledModels.find((m) => m.id === state.selectedTestModel)) {
          state.selectedTestModel = defaultModel || "";
        }
      } catch (error) {
        console.error(t("toast.error.loadModelsFailed"), error);
        toast.error(t("toast.error.loadModelsFailed"));
      }
    },
  });

  // Save model selection
  const saveModelSelection = async (
    model: string,
    type: "optimize" | "test",
  ) => {
    if (model) {
      try {
        await setPreference(
          type === "optimize"
            ? MODEL_SELECTION_KEYS.OPTIMIZE_MODEL
            : MODEL_SELECTION_KEYS.TEST_MODEL,
          model,
        );
      } catch (error) {
        console.error(`保存模型选择失败 (${type}):`, error);
        throw error;
      }
    }
  };

  // Watch model selection changes
  watch(
    () => state.selectedOptimizeModel,
    async (newVal) => {
      if (newVal && !isInitializing) {
        await saveModelSelection(newVal, "optimize");
      }
    },
  );

  watch(
    () => state.selectedTestModel,
    async (newVal) => {
      if (newVal && !isInitializing) {
        await saveModelSelection(newVal, "test");
      }
    },
  );

  // 监听服务实例变化，初始化模型选择
  watch(
    services,
    async () => {
      if (services.value?.modelManager) {
        await state.initModelSelection();
      }
    },
    { immediate: true },
  );

  return state;
}
