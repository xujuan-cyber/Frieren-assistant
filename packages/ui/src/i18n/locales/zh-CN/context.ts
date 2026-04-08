const messages = {
  "contextMode": {
    "optimizationMode": {
      "message": "多消息",
      "variable": "变量"
    },
    "user": {
      "label": "变量模式",
      "tooltip": "优化单条用户提示词，专注于变量和工具配置"
    },
    "system": {
      "label": "多消息模式",
      "tooltip": "优化多条系统消息，支持完整的对话管理",
      "selectMessageHint": "请选择一条 system/user 消息以查看 V0/V1 优化结果"
    },
    "actions": {
      "globalVariables": "全局变量",
      "contextVariables": "上下文变量",
      "tools": "工具管理",
      "toolManager": "工具管理"
    },
    "preview": {
      "title": "预览",
      "stats": "变量统计",
      "totalVars": "变量总数",
      "providedVars": "已提供",
      "missingVars": "缺失",
      "missingVarsWarning": "检测到缺失变量",
      "missingVarsHint": "部分变量未定义，请在变量管理器中设置值，否则这些占位符将保留在最终输出中。",
      "renderedContent": "渲染内容",
      "emptyContent": "暂无内容可预览",
      "modeExplanation": "模式说明",
      "userOptimizeHint": "用户优化模式：变量将在优化时替换为实际值。",
      "systemOptimizeHint": "系统优化模式：多条消息将作为对话上下文发送，变量替换为实际值。",
      "testPhaseHint": "测试阶段：会话将发送到模型进行测试，变量替换为实际值。"
    }
  },
  "contextEditor": {
    "contextVariables": "上下文变量",
    "contextVariablesDesc": "管理当前上下文的变量覆盖，不影响全局变量",
    "noContextVariables": "暂无上下文变量",
    "addFirstContextVariable": "添加您的第一个上下文变量",
    "addContextVariable": "添加上下文变量",
    "editContextVariable": "编辑上下文变量",
    "deleteContextVariable": "删除上下文变量",
    "deleteContextVariableConfirm": "确定要删除上下文变量\"{name}\"吗？删除后将回退到全局值。",
    "contextVariableDeleted": "已删除上下文变量：{name}",
    "variableSource": "变量来源",
    "variableStatus": "状态",
    "contextOverride": "上下文覆盖",
    "globalVariable": "全局变量",
    "predefinedVariable": "预定义变量",
    "missingVariable": "缺失变量",
    "variableFromContext": "来自上下文",
    "variableFromGlobal": "来自全局",
    "variableFromPredefined": "预定义",
    "predefinedVariableCannotOverride": "预定义变量不可覆盖",
    "addVariable": "添加上下文变量",
    "editVariable": "编辑上下文变量",
    "contextVariableHelp": "上下文变量会覆盖全局同名变量，但不能覆盖预定义变量",
    "finalVariablesPreview": "最终变量预览",
    "contextVariableName": "变量名",
    "contextVariableValue": "变量值",
    "variableNameRequired": "变量名是必需的",
    "variableNameInvalid": "变量名格式无效",
    "variableNamePredefined": "不能使用预定义变量名",
    "variableNameExists": "变量名已存在",
    "variableValueRequired": "变量值是必需的",
    "importContextVariables": "导入上下文变量",
    "exportContextVariables": "导出上下文变量",
    "contextVariableImported": "已导入 {count} 个上下文变量",
    "contextVariableSkipped": "跳过 {count} 个预定义变量冲突",
    "editTool": "编辑工具",
    "deleteToolConfirm": "确定要删除工具“{name}”吗？",
    "toolDeleted": "已删除工具：{name}",
    "exampleTemplate": "示例模板",
    "exampleTemplateDesc": "可从天气示例开始，或从空白模板开始。",
    "basicInfo": "基本信息",
    "toolNamePlaceholder": "请输入工具名称，例如 get_weather",
    "toolDescPlaceholder": "请输入工具描述",
    "parameters": "参数配置",
    "parametersPlaceholder": "请输入JSON格式的参数配置",
    "invalidJson": "无效的 JSON",
    "useExample": "使用示例",
    "startEmpty": "从空白开始",
    "save": "保存",
    "toolsTooltip": "工具：{tools}",
    "toolsCount": "{count} 个工具",
    "title": "上下文编辑器",
    "systemTemplates": "系统模板",
    "userTemplates": "用户模板",
    "messagesTab": "消息编辑",
    "variablesTab": "变量管理",
    "toolsTab": "工具管理",
    "messageCount": "{count} 条消息",
    "messageItemLabel": "消息 {index}: {role}",
    "variableCountLabel": "变量: {count}",
    "toolCountLabel": "工具: {count}",
    "variableDetected": "变量: {count}",
    "missingVariableLabel": "缺失: {count}",
    "noMessages": "暂无消息",
    "addFirstMessage": "添加您的第一条消息",
    "addMessage": "添加消息",
    "noTools": "暂无工具",
    "addFirstTool": "添加第一个工具",
    "addTool": "添加工具",
    "noDescription": "暂无描述",
    "parametersCount": "{count} 个参数",
    "importTitle": "导入上下文数据",
    "importFormat": "导入格式：",
    "selectFile": "选择文件",
    "orPasteText": "或在下方粘贴文本",
    "import": "导入",
    "importSuccess": "导入成功",
    "importFailed": "导入失败",
    "importDataRequired": "请输入要导入的数据",
    "invalidConversationFormat": "无效的会话格式：必须包含messages数组",
    "unsupportedImportFormat": "不支持的导入格式",
    "invalidJsonFormat": "数据格式错误，请检查JSON格式",
    "exportTitle": "导出上下文数据",
    "exportFormat": "导出格式：",
    "exportPreview": "导出预览：",
    "copyToClipboard": "复制到剪贴板",
    "saveToFile": "保存到文件",
    "exportSuccess": "导出成功",
    "exportFailed": "导出失败",
    "copySuccess": "已复制到剪贴板",
    "copyFailed": "复制失败",
    "saveSuccess": "上下文已更新",
    "switchModeFailed": "切换上下文模式失败",
    "variableManagement": "变量管理",
    "variableManagementHint": "临时变量仅在当前会话有效；全局变量跨会话持久保存",
    "temporaryVariables": "临时变量",
    "temporaryVariableCount": "{count} 个临时变量",
    "temporaryVariableHint": "仅当前会话有效",
    "globalVariables": "全局: {count}",
    "globalVariableHint": "跨会话持久保存",
    "noVariables": "暂无变量",
    "addFirstVariable": "添加第一个变量",
    "variableName": "变量名",
    "variableValue": "变量值",
    "variableType": "变量类型",
    "variableNamePlaceholder": "请输入变量名（不含大括号）",
    "predefinedVariableWarning": "不能修改预定义变量",
    "variableValuePlaceholder": "请输入变量值",
    "deleteVariableConfirm": "确定要删除变量\"{name}\"吗？",
    "variableDeleted": "已删除变量：{name}",
    "predefinedVariableError": "不能修改预定义变量",
    "variableSaved": "已{action}{type}变量：{name}",
    "globalVariableEditHint": "全局变量请到变量管理器中编辑",
    "cannotDeleteGlobalVariable": "无法删除全局变量",
    "globalVariableSaveNotSupported": "全局变量保存功能需要 variableManager（即将支持）",
    "variableNotFound": "变量不存在",
    "variableManagerNotReady": "变量管理器未初始化，请稍后再试",
    "variableSaveFailed": "变量保存失败",
    "variableSourceLabels": {
      "global": "全局",
      "temporary": "临时",
      "predefined": "系统"
    },
    "variableStatusLabels": {
      "active": "活跃",
      "overridden": "被覆盖"
    },
    "importFormats": {
      "smart": {
        "name": "智能识别",
        "description": "自动检测格式并转换"
      },
      "openai": {
        "name": "OpenAI",
        "description": "OpenAI API 请求格式"
      },
      "langfuse": {
        "name": "LangFuse",
        "description": "LangFuse 追踪数据格式"
      },
      "conversation": {
        "name": "内部格式",
        "description": "Prompt Optimizer 内部标准 JSON 结构"
      }
    },
    "exportFormats": {
      "standard": {
        "name": "内部格式",
        "description": "Prompt Optimizer 内部标准数据格式"
      },
      "openai": {
        "name": "OpenAI",
        "description": "OpenAI API 兼容格式"
      }
    },
    "importPlaceholders": {
      "openai": "OpenAI API 请求格式（示例见下方）：",
      "langfuse": "LangFuse 追踪数据格式（示例见下方）：",
      "conversation": "标准会话 JSON 格式（示例见下方）：",
      "smart": "粘贴任意受支持的 JSON（OpenAI、LangFuse 或会话数组），系统会自动识别格式。"
    },
    "consoleErrors": {
      "toolEditIndexOutOfRange": "工具编辑失败：索引 {index} 超出范围",
      "toolEditToolNotFound": "工具编辑失败：索引 {index} 处的工具不存在",
      "toolSaveMissingFunction": "工具保存失败：缺少 function 属性",
      "toolDataStructureError": "工具数据结构错误：缺少 function 属性"
    }
  },
  "dataManager": {
    "title": "数据管理",
    "export": {
      "title": "导出数据",
      "description": "导出所有历史记录、模型配置、自定义提示词和用户设置（包括主题、语言、模型选择等）",
      "button": "导出数据",
      "success": "数据导出成功",
      "failed": "数据导出失败"
    },
    "import": {
      "title": "导入数据",
      "description": "导入之前导出的数据文件（将覆盖现有数据和用户设置）",
      "selectFile": "点击选择文件或拖拽文件到此处",
      "changeFile": "更换文件",
      "button": "导入数据",
      "success": "数据导入成功",
      "failed": "数据导入失败",
      "successWithRefresh": "数据导入成功，页面将刷新以应用所有更改"
    },
    "contexts": {
      "title": "上下文集合管理",
      "description": "导入或导出所有上下文集合，包括消息、变量和工具配置。",
      "exportFile": "导出到文件",
      "exportClipboard": "导出到剪贴板",
      "importFile": "从文件导入",
      "importClipboard": "从剪贴板导入",
      "importMode": "导入模式",
      "replaceMode": "替换模式",
      "appendMode": "追加模式",
      "mergeMode": "合并模式",
      "replaceModeDesc": "完全替换现有上下文集合",
      "appendModeDesc": "将导入内容追加到现有集合（自动处理ID冲突）",
      "mergeModeDesc": "合并同ID的上下文，以导入内容为准",
      "importSuccess": "成功导入 {count} 个上下文",
      "exportSuccess": "成功导出 {count} 个上下文到 {target}",
      "predefinedVariablesSkipped": "跳过了 {count} 个预定义变量覆盖",
      "conflictingIdsRenamed": "{count} 个冲突ID已重命名",
      "currentContextRestored": "当前上下文已恢复为：{contextId}",
      "noContextsToImport": "没有有效的上下文可导入",
      "invalidContextBundle": "无效的上下文集合格式",
      "importModeRequired": "请选择导入模式"
    },
    "backupWorkspace": {
      "title": "数据备份",
      "description": "导出或导入整个应用数据，用于迁移、备份或恢复当前应用状态。",
      "exportTitle": "导出当前应用数据",
      "importTitle": "导入备份文件"
    },
    "storage": {
      "title": "存储占用",
      "total": "总计（含估算）",
      "totalNote": "主数据为估算值，图片与备份为实际占用。",
      "appMainData": "应用主数据（估算）",
      "appMainDataNote": "包含：模型、模板、历史、上下文、设置",
      "imageCache": "会话/结果图片缓存",
      "favoriteImages": "收藏图片",
      "imageCount": "共 {count} 张图片",
      "backupData": "备份数据",
      "path": "数据目录路径",
      "openDir": "打开目录",
      "refresh": "刷新",
      "refreshFailed": "刷新存储占用失败"
    },
    "warning": "导入数据将覆盖现有的历史记录、模型配置、自定义提示词和所有用户设置（包括主题、语言偏好等），请确保已备份重要数据。"
  }
} as const;

export default messages;
