import { computed, type Ref } from "vue";
import type { ContextMode } from "@prompt-optimizer/core";

/**
 * 提示词预览 Composable
 *
 * 用于实时计算提示词渲染结果并检测缺失变量
 *
 * @param content - 提示词内容（响应式）
 * @param variables - 变量对象（响应式）
 * @param contextMode - 上下文模式（响应式，已保留但在渲染层面无差异）
 */
export function usePromptPreview(
  content: Ref<string>,
  variables: Ref<Record<string, string>>,
  contextMode: Ref<ContextMode>,
) {
  /**
   * 解析模板中的变量
   */
  const parsedVariables = computed(() => {
    if (!content.value) {
      return {
        builtinVars: new Set<string>(),
        customVars: new Set<string>(),
        allVars: new Set<string>(),
      };
    }

    // 使用简单的正则提取变量（与 ContextPromptRenderer 一致）
    const regex = /\{\{([^{}]+)\}\}/g;
    const allVars = new Set<string>();
    const builtinVars = new Set<string>();
    const customVars = new Set<string>();

    // 预定义变量列表（从 core 包导入）
    const PREDEFINED_VARIABLES = [
      "originalPrompt",
      "lastOptimizedPrompt",
      "iterateInput",
      "currentPrompt",
      "userQuestion",
      "conversationContext",
      "toolsContext",
    ];
    const predefinedSet = new Set(PREDEFINED_VARIABLES);

    let match;
    while ((match = regex.exec(content.value)) !== null) {
      const varName = match[1].trim();

      // 跳过 Mustache 特殊标签
      if (
        varName.startsWith("#") ||
        varName.startsWith("/") ||
        varName.startsWith("^") ||
        varName.startsWith("!") ||
        varName.startsWith(">") ||
        varName.startsWith("&")
      ) {
        continue;
      }

      allVars.add(varName);

      if (predefinedSet.has(varName)) {
        builtinVars.add(varName);
      } else {
        customVars.add(varName);
      }
    }

    return { builtinVars, customVars, allVars };
  });

  /**
   * 缺失的变量
   */
  const missingVariables = computed(() => {
    const missing: string[] = [];
    const vars = variables.value || {};

    for (const varName of parsedVariables.value.allVars) {
      if (
        !(varName in vars) ||
        vars[varName] === undefined ||
        vars[varName] === ""
      ) {
        missing.push(varName);
      }
    }

    return missing;
  });

  /**
   * 渲染后的预览内容
   *
   * 简化版本：统一使用简单替换逻辑
   * 注意：这里使用简单的正则替换而不是 Mustache，因为：
   * 1. UI 预览不需要 Mustache 的条件渲染等高级特性
   * 2. 简单替换性能更好，适合实时预览
   * 3. 与后端 Mustache 行为一致（都会保留值中的占位符）
   */
  const previewContent = computed(() => {
    if (!content.value) {
      return "";
    }

    try {
      const vars = variables.value || {};

      // 统一的变量替换逻辑
      // 替换所有提供的变量，未提供的保留占位符
      const result = content.value.replace(
        /\{\{([^{}]+)\}\}/g,
        (match, varName) => {
          const trimmedName = varName.trim();

          // 跳过 Mustache 特殊标签
          if (
            trimmedName.startsWith("#") ||
            trimmedName.startsWith("/") ||
            trimmedName.startsWith("^") ||
            trimmedName.startsWith("!") ||
            trimmedName.startsWith(">") ||
            trimmedName.startsWith("&")
          ) {
            return match;
          }

          // 如果变量存在且非空，替换；否则保留占位符
          if (vars[trimmedName] !== undefined && vars[trimmedName] !== "") {
            return vars[trimmedName];
          }
          return match;
        },
      );

      return result;
    } catch (error) {
      console.error("[usePromptPreview] Preview rendering failed:", error);
      return content.value;
    }
  });

  /**
   * 是否有缺失变量
   */
  const hasMissingVariables = computed(() => missingVariables.value.length > 0);

  /**
   * 变量统计信息
   */
  const variableStats = computed(() => ({
    total: parsedVariables.value.allVars.size,
    builtin: parsedVariables.value.builtinVars.size,
    custom: parsedVariables.value.customVars.size,
    missing: missingVariables.value.length,
    provided:
      parsedVariables.value.allVars.size - missingVariables.value.length,
  }));

  return {
    /** 解析的变量信息 */
    parsedVariables,
    /** 缺失的变量列表 */
    missingVariables,
    /** 渲染后的预览内容 */
    previewContent,
    /** 是否有缺失变量 */
    hasMissingVariables,
    /** 变量统计信息 */
    variableStats,
  };
}
