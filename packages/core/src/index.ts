// Core package entry point

// 导出模板相关
export { TemplateManager, createTemplateManager } from './services/template/manager'
export { TemplateProcessor } from './services/template/processor'
export { TemplateLanguageService, createTemplateLanguageService } from './services/template/languageService'
export type { BuiltinTemplateLanguage } from './services/template/languageService'
export * from './services/template/types'
export { StaticLoader } from './services/template/static-loader'
export * from './services/template/errors'
export { ElectronTemplateManagerProxy } from './services/template/electron-proxy'

// 导出历史记录相关
export { HistoryManager, createHistoryManager } from './services/history/manager'
export * from './services/history/types'
export * from './services/history/errors'
export { ElectronHistoryManagerProxy } from './services/history/electron-proxy'

// 导出LLM服务相关
export type { ILLMService, Message, StreamHandlers, LLMResponse, ModelInfo, ModelOption } from './services/llm/types'
export { LLMService, createLLMService } from './services/llm/service'
export { ElectronLLMProxy } from './services/llm/electron-proxy'
export * from './services/llm/errors'

// 导出模型管理相关
export { ModelManager, createModelManager } from './services/model/manager'
export * from './services/model/types'
export * from './services/model/defaults'
export * from './services/model/advancedParameterDefinitions'
export { ElectronModelManagerProxy } from './services/model/electron-proxy'
export { ElectronConfigManager, isElectronRenderer } from './services/model/electron-config'

// 导出存储相关
export * from './services/storage/types'
export { StorageFactory } from './services/storage/factory'
export { DexieStorageProvider } from './services/storage/dexieStorageProvider'
export { LocalStorageProvider } from './services/storage/localStorageProvider'
export { MemoryStorageProvider } from './services/storage/memoryStorageProvider'

// 导出提示词服务相关
export { PromptService } from './services/prompt/service'
export { createPromptService } from './services/prompt/factory'
export * from './services/prompt/types'
export { ElectronPromptServiceProxy } from './services/prompt/electron-proxy'
export * from './services/prompt/errors'

// 导出对比服务相关
export { CompareService, createCompareService } from './services/compare/service'
export type { ICompareService } from './services/compare/types'
export * from './services/compare/types'
export * from './services/compare/errors'

// 导出数据管理相关
export { DataManager, createDataManager } from './services/data/manager'
export type { IDataManager } from './services/data/manager'

// 导出环境检测工具
export { isRunningInElectron, checkVercelApiAvailability, resetVercelStatusCache, isBrowser, getProxyUrl } from './utils/environment'