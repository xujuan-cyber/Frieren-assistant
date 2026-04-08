const messages = {
  "contextMode": {
    "optimizationMode": {
      "message": "Multi-Message",
      "variable": "Variable"
    },
    "user": {
      "label": "Variable Mode",
      "tooltip": "Optimize single user prompt, focus on variables and tools"
    },
    "system": {
      "label": "Multi-Message Mode",
      "tooltip": "Optimize multiple system messages with full conversation management",
      "selectMessageHint": "Select a system/user message to view its V0/V1 results"
    },
    "actions": {
      "globalVariables": "Global Variables",
      "contextVariables": "Context Variables",
      "tools": "Tool Management",
      "toolManager": "Tool Management"
    },
    "preview": {
      "title": "Preview",
      "stats": "Variable Statistics",
      "totalVars": "Total Variables",
      "providedVars": "Provided",
      "missingVars": "Missing",
      "missingVarsWarning": "Missing Variables Detected",
      "missingVarsHint": "Some variables are not defined. Please set values in the Variable Manager or these placeholders will remain in the final output.",
      "renderedContent": "Rendered Content",
      "emptyContent": "No content to preview",
      "modeExplanation": "Mode Explanation",
      "userOptimizeHint": "User Optimization Mode: Variables will be replaced with actual values during optimization.",
      "systemOptimizeHint": "System Optimization Mode: Multiple messages will be sent as conversation context, variables replaced with actual values.",
      "testPhaseHint": "Test Phase: The conversation will be sent to the model for testing, variables replaced with actual values."
    }
  },
  "contextEditor": {
    "contextVariables": "Context Variables",
    "contextVariablesDesc": "Manage context-level variable overrides without affecting global variables",
    "noContextVariables": "No context variables",
    "addFirstContextVariable": "Add your first context variable",
    "addContextVariable": "Add Context Variable",
    "editContextVariable": "Edit Context Variable",
    "deleteContextVariable": "Delete Context Variable",
    "deleteContextVariableConfirm": "Are you sure you want to delete context variable \"{name}\"? It will revert to global value.",
    "contextVariableDeleted": "Context variable deleted: {name}",
    "variableSource": "Variable Source",
    "variableStatus": "Status",
    "contextOverride": "Context Override",
    "globalVariable": "Global Variable",
    "predefinedVariable": "Predefined Variable",
    "missingVariable": "Missing Variable",
    "variableFromContext": "From Context",
    "variableFromGlobal": "From Global",
    "variableFromPredefined": "Predefined",
    "predefinedVariableCannotOverride": "Predefined variables cannot be overridden",
    "addVariable": "Add Context Variable",
    "editVariable": "Edit Context Variable",
    "contextVariableHelp": "Context variables will override global variables with the same name, but cannot override predefined variables",
    "finalVariablesPreview": "Final Variables Preview",
    "contextVariableName": "Variable Name",
    "contextVariableValue": "Variable Value",
    "variableNameRequired": "Variable name is required",
    "variableNameInvalid": "Invalid variable name format",
    "variableNamePredefined": "Cannot use predefined variable name",
    "variableNameExists": "Variable name already exists",
    "variableValueRequired": "Variable value is required",
    "importContextVariables": "Import Context Variables",
    "exportContextVariables": "Export Context Variables",
    "contextVariableImported": "Imported {count} context variables",
    "contextVariableSkipped": "Skipped {count} predefined variable conflicts",
    "title": "Context Editor",
    "systemTemplates": "System Templates",
    "userTemplates": "User Templates",
    "noMessages": "No messages",
    "addFirstMessage": "Add your first message",
    "addMessage": "Add Message",
    "noTools": "No tools",
    "addFirstTool": "Add first tool",
    "addTool": "Add Tool",
    "noDescription": "No description",
    "parametersCount": "{count} parameters",
    "importTitle": "Import Context Data",
    "importFormat": "Import Format:",
    "selectFile": "Select File",
    "orPasteText": "Or paste text below",
    "import": "Import",
    "importSuccess": "Import successful",
    "importFailed": "Import failed",
    "importDataRequired": "Please enter data to import",
    "invalidConversationFormat": "Invalid conversation format: must contain messages array",
    "unsupportedImportFormat": "Unsupported import format",
    "invalidJsonFormat": "Invalid data format, please check JSON syntax",
    "exportTitle": "Export Context Data",
    "exportFormat": "Export Format:",
    "exportPreview": "Export Preview:",
    "copyToClipboard": "Copy to Clipboard",
    "saveToFile": "Save to File",
    "exportSuccess": "Export successful",
    "exportFailed": "Export failed",
    "copySuccess": "Copied to clipboard",
    "copyFailed": "Copy failed",
    "saveSuccess": "Context updated",
    "switchModeFailed": "Failed to switch context mode",
    "editTool": "Edit Tool",
    "deleteToolConfirm": "Are you sure you want to delete tool \"{name}\"?",
    "toolDeleted": "Tool deleted: {name}",
    "exampleTemplate": "Example Template",
    "exampleTemplateDesc": "Start from a weather example or from an empty template.",
    "basicInfo": "Basic Info",
    "toolNamePlaceholder": "Enter tool name, e.g., get_weather",
    "toolDescPlaceholder": "Enter tool description",
    "parameters": "Parameters",
    "parametersPlaceholder": "Enter JSON format parameter configuration",
    "invalidJson": "Invalid JSON",
    "useExample": "Use Example",
    "startEmpty": "Start Empty",
    "save": "Save",
    "toolsTooltip": "Tools: {tools}",
    "toolsCount": "{count} tools",
    "messagesTab": "Messages",
    "variablesTab": "Variables",
    "toolsTab": "Tools",
    "messageCount": "{count} messages",
    "messageItemLabel": "Message {index}: {role}",
    "variableCountLabel": "Variables: {count}",
    "toolCountLabel": "Tools: {count}",
    "variableDetected": "Variables: {count}",
    "missingVariableLabel": "Missing: {count}",
    "variableManagement": "Variable Management",
    "variableManagementHint": "Temporary variables are session-only; global variables persist across sessions",
    "temporaryVariables": "Temporary Variables",
    "temporaryVariableCount": "{count} temporary variables",
    "temporaryVariableHint": "Session-only",
    "globalVariables": "Global: {count}",
    "globalVariableHint": "Persist across sessions",
    "noVariables": "No variables",
    "addFirstVariable": "Add your first variable",
    "variableName": "Variable Name",
    "variableValue": "Variable Value",
    "variableType": "Variable Type",
    "variableNamePlaceholder": "Enter variable name (without brackets)",
    "predefinedVariableWarning": "Cannot modify predefined variables",
    "variableValuePlaceholder": "Enter variable value",
    "deleteVariableConfirm": "Are you sure you want to delete variable \"{name}\"?",
    "variableDeleted": "Variable deleted: {name}",
    "predefinedVariableError": "Cannot modify predefined variables",
    "variableSaved": "{action} {type} variable: {name}",
    "globalVariableEditHint": "Global variables can only be edited in the variable manager",
    "cannotDeleteGlobalVariable": "Cannot delete global variables",
    "globalVariableSaveNotSupported": "Global variable save requires variableManager (coming soon)",
    "variableNotFound": "Variable not found",
    "variableManagerNotReady": "Variable manager not initialized, please try again later",
    "variableSaveFailed": "Failed to save variable",
    "variableSourceLabels": {
      "global": "Global",
      "temporary": "Temporary",
      "predefined": "System"
    },
    "variableStatusLabels": {
      "active": "Active",
      "overridden": "Overridden"
    },
    "importFormats": {
      "smart": {
        "name": "Smart Detection",
        "description": "Auto-detect format and convert"
      },
      "openai": {
        "name": "OpenAI",
        "description": "OpenAI API request format"
      },
      "langfuse": {
        "name": "LangFuse",
        "description": "LangFuse tracking data format"
      },
      "conversation": {
        "name": "Internal Format",
        "description": "Prompt Optimizer internal JSON structure"
      }
    },
    "exportFormats": {
      "standard": {
        "name": "Internal Format",
        "description": "Prompt Optimizer internal standard format"
      },
      "openai": {
        "name": "OpenAI",
        "description": "OpenAI API compatible format"
      }
    },
    "importPlaceholders": {
      "openai": "OpenAI API request format (example below):",
      "langfuse": "LangFuse trace payload (example below):",
      "conversation": "Standard conversation JSON (example below):",
      "smart": "Paste any supported JSON format (OpenAI, LangFuse, or conversation array). The editor will auto-detect the format."
    },
    "consoleErrors": {
      "toolEditIndexOutOfRange": "Tool edit failed: index {index} out of range",
      "toolEditToolNotFound": "Tool edit failed: tool at index {index} not found",
      "toolSaveMissingFunction": "Tool save failed: missing function property",
      "toolDataStructureError": "Tool data structure error: missing function property"
    }
  },
  "dataManager": {
    "title": "Data Manager",
    "export": {
      "title": "Export Data",
      "description": "Export all history records, model configurations, custom templates and user settings (including theme, language, model selections, etc.)",
      "button": "Export Data",
      "success": "Data exported successfully",
      "failed": "Failed to export data"
    },
    "import": {
      "title": "Import Data",
      "description": "Import previously exported data file (will overwrite existing data and user settings)",
      "selectFile": "Click to select file or drag file here",
      "changeFile": "Change File",
      "button": "Import Data",
      "success": "Data imported successfully",
      "failed": "Failed to import data",
      "successWithRefresh": "Data imported successfully, page will refresh to apply all changes"
    },
    "contexts": {
      "title": "Context Collections Management",
      "description": "Import or export all context collections, including messages, variables and tool configurations.",
      "exportFile": "Export to File",
      "exportClipboard": "Export to Clipboard",
      "importFile": "Import from File",
      "importClipboard": "Import from Clipboard",
      "importMode": "Import Mode",
      "replaceMode": "Replace Mode",
      "appendMode": "Append Mode",
      "mergeMode": "Merge Mode",
      "replaceModeDesc": "Completely replace existing context collections",
      "appendModeDesc": "Append import content to existing collections (auto handle ID conflicts)",
      "mergeModeDesc": "Merge contexts with same ID, using import content as priority",
      "importSuccess": "Successfully imported {count} contexts",
      "exportSuccess": "Successfully exported {count} contexts to {target}",
      "predefinedVariablesSkipped": "Skipped {count} predefined variable overrides",
      "conflictingIdsRenamed": "{count} conflicting IDs renamed",
      "currentContextRestored": "Current context restored to: {contextId}",
      "noContextsToImport": "No valid contexts to import",
      "invalidContextBundle": "Invalid context bundle format",
      "importModeRequired": "Please select import mode"
    },
    "backupWorkspace": {
      "title": "Data Backup",
      "description": "Export or import the full app dataset for migration, backup or recovery.",
      "exportTitle": "Export Current App Data",
      "importTitle": "Import Backup File"
    },
    "storage": {
      "title": "Storage Usage",
      "total": "Total (Includes Estimate)",
      "totalNote": "Main app data is estimated; image and backup sizes are actual usage.",
      "appMainData": "App Main Data (Estimated)",
      "appMainDataNote": "Includes models, templates, history, contexts and settings",
      "imageCache": "Session/Result Image Cache",
      "favoriteImages": "Favorite Images",
      "imageCount": "{count} images",
      "backupData": "Backup Data",
      "path": "Data directory",
      "openDir": "Open directory",
      "refresh": "Refresh",
      "refreshFailed": "Failed to refresh storage usage"
    },
    "warning": "Importing data will overwrite existing history records, model configurations, custom templates and all user settings (including theme, language preferences, etc.). Please ensure you have backed up important data."
  }
} as const;

export default messages;
