# 应用流程文档

## 1. 核心服务初始化
1. Core包初始化
   ```typescript
   // 初始化核心服务
   import { 
     modelManager, 
     templateManager, 
     historyManager 
   } from '@prompt-optimizer/core'
   
   // 加载配置
   await modelManager.loadConfig()
   await templateManager.loadTemplates()
   await historyManager.loadHistory()
   ```

2. 服务实例创建
   ```typescript
   import { 
     createLLMService,
     createPromptService
   } from '@prompt-optimizer/core'
   
   const llmService = createLLMService()
   const promptService = createPromptService()
   ```

## 2. Web应用初始化
1. 应用配置加载
   - 环境变量加载
   - 主题设置初始化
   - Vue应用配置

2. 服务状态同步
   - 模型状态初始化
   - 模板数据加载
   - 历史记录同步

## 3. 提示词优化流程
1. 用户输入阶段
   ```typescript
   // 输入验证
   const validateInput = async (prompt: string) => {
     try {
       await promptService.validateInput(prompt)
     } catch (err) {
       handleValidationError(err)
     }
   }
   ```

2. 优化处理
   ```typescript
   // 使用LangChain处理
   const optimizePrompt = async (prompt: string) => {
     try {
       const stream = await llmService.optimizeWithStream(prompt)
       handleStreamResponse(stream)
     } catch (err) {
       handleOptimizationError(err)
     }
   }
   ```

3. 结果处理
   ```typescript
   // 处理流式响应
   const handleStreamResponse = (stream: LLMResponse) => {
     stream.on('data', chunk => updateUI(chunk))
     stream.on('end', () => saveToHistory())
     stream.on('error', err => handleStreamError(err))
   }
   ```

## 4. 模型管理流程
1. 模型配置
   ```typescript
   // 配置模型
   const configureModel = async (config: ModelConfig) => {
     try {
       await modelManager.updateModel(config)
       await modelManager.testConnection(config.provider)
     } catch (err) {
       handleConfigError(err)
     }
   }
   ```

2. API密钥管理
   ```typescript
   // 更新API密钥
   const updateApiKey = async (provider: string, key: string) => {
     try {
       await modelManager.setApiKey(provider, key)
       await modelManager.validateApiKey(provider)
     } catch (err) {
       handleApiKeyError(err)
     }
   }
   ```

## 5. 模板管理流程
1. 模板操作
   ```typescript
   // 模板管理
   const manageTemplate = async (template: TemplateConfig) => {
     try {
       await templateManager.saveTemplate(template)
       await templateManager.validateTemplate(template)
     } catch (err) {
       handleTemplateError(err)
     }
   }
   ```

2. 模板应用
   ```typescript
   // 应用模板
   const applyTemplate = async (templateId: string) => {
     try {
       const template = await templateManager.getTemplate(templateId)
       await promptService.applyTemplate(template)
     } catch (err) {
       handleTemplateApplyError(err)
     }
   }
   ```

## 6. 历史记录管理
1. 记录保存
   ```typescript
   // 保存历史记录
   const saveHistory = async (record: PromptRecord) => {
     try {
       await historyManager.addRecord(record)
       await historyManager.sync()
     } catch (err) {
       handleHistoryError(err)
     }
   }
   ```

2. 记录操作
   ```typescript
   // 历史记录操作
   const manageHistory = async () => {
     try {
       const records = await historyManager.getRecords()
       const filtered = await historyManager.filterRecords(query)
       await historyManager.deleteRecord(recordId)
     } catch (err) {
       handleHistoryOperationError(err)
     }
   }
   ```

## 7. 错误处理流程
1. API错误处理
   ```typescript
   // API错误处理
   const handleApiError = async (err: APIError) => {
     if (err.isRetryable) {
       await retryOperation()
     } else {
       notifyUser(err.message)
       logError(err)
     }
   }
   ```

2. 验证错误处理
   ```typescript
   // 验证错误处理
   const handleValidationError = (err: ValidationError) => {
     showValidationMessage(err.message)
     highlightInvalidField(err.field)
     logValidationError(err)
   }
   ```

## 8. 数据同步流程
1. 本地存储
   ```typescript
   // 数据同步
   const syncData = async () => {
     try {
       await modelManager.sync()
       await templateManager.sync()
       await historyManager.sync()
     } catch (err) {
       handleSyncError(err)
     }
   }
   ```

2. 状态管理
   ```typescript
   // 状态更新
   const updateState = async () => {
     try {
       await refreshModels()
       await refreshTemplates()
       await refreshHistory()
       notifyStateChange()
     } catch (err) {
       handleStateUpdateError(err)
     }
   }
   ``` 