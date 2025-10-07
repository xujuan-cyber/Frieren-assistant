import { ref, computed, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from './useToast'
import {
  advancedParameterDefinitions,
  type ModelOption,
  type TextModel,
  type TextModelConfig,
  type TextProvider
} from '@prompt-optimizer/core'

type TextConnectionValue = string | number | boolean | undefined
interface TextConnectionConfig {
  [key: string]: TextConnectionValue
}

interface TextModelForm {
  id: string
  originalId?: string
  name: string
  enabled: boolean
  providerId: string
  modelId: string
  connectionConfig: TextConnectionConfig
  paramOverrides: Record<string, unknown>
  displayMaskedKey: boolean
  originalApiKey?: string
  defaultModel?: string
}

const DEFAULT_TEXT_MODEL_IDS = ['openai', 'gemini', 'deepseek', 'zhipu', 'siliconflow', 'custom'] as const

export function useTextModelManager() {
  const { t } = useI18n()
  const toast = useToast()

  const services = inject<any>('services')
  if (!services) {
    throw new Error('Services not provided!')
  }

  const modelManager = services.value.modelManager
  const llmService = services.value.llmService
  const textAdapterRegistry = services.value.textAdapterRegistry

  const models = ref<TextModelConfig[]>([])
  const loadingModels = ref(false)
  const testingConnections = ref<Record<string, boolean>>({})

  const providers = ref<TextProvider[]>([])
  const providersLoaded = ref(false)
  const isLoadingProviders = ref(false)

  const form = ref<TextModelForm>({
    id: '',
    name: '',
    enabled: true,
    providerId: '',
    modelId: '',
    connectionConfig: {},
    paramOverrides: {},
    displayMaskedKey: false
  })

  const editingModelId = ref<string | null>(null)
  const formReady = ref(false)
  const isSaving = ref(false)
  const isTestingFormConnection = ref(false)
  const formConnectionStatus = ref<{
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
  } | null>(null)

  const modelOptions = ref<ModelOption[]>([])
  const isLoadingModelOptions = ref(false)
  const selectedNewLLMParamId = ref('')
  const customLLMParam = ref({ key: '', value: '' })

  const currentParamOverrides = computed(() => form.value.paramOverrides || {})
  const currentProviderType = computed(() => form.value.providerId || 'custom')

  const providerOptions = computed(() =>
    providers.value.map(provider => ({
      label: provider.name,
      value: provider.id,
      disabled: false
    }))
  )

  const selectedProvider = computed(() => {
    if (!form.value.providerId) return null
    return providers.value.find(p => p.id === form.value.providerId) || null
  })

  const connectionFields = computed(() => {
    if (!selectedProvider.value?.connectionSchema) return []

    const schema = selectedProvider.value.connectionSchema
    const fields: Array<{ name: string; required: boolean; type: string; placeholder?: string }> = []

    for (const fieldName of schema.required) {
      fields.push({
        name: fieldName,
        required: true,
        type: schema.fieldTypes[fieldName] || 'string',
        placeholder: fieldName === 'baseURL' ? selectedProvider.value.defaultBaseURL : ''
      })
    }

    for (const fieldName of schema.optional) {
      fields.push({
        name: fieldName,
        required: false,
        type: schema.fieldTypes[fieldName] || 'string',
        placeholder: fieldName === 'baseURL' ? selectedProvider.value.defaultBaseURL : ''
      })
    }

    return fields
  })

  const isConnectionConfigured = computed(() => {
    if (!selectedProvider.value?.connectionSchema) return true

    const schema = selectedProvider.value.connectionSchema
    const config = form.value.connectionConfig || {}

    return schema.required.every(field => !!config[field])
  })

  const availableLLMParamDefinitions = computed(() => {
    if (!advancedParameterDefinitions) return []
    const currentParams = currentParamOverrides.value || {}
    const provider = currentProviderType.value || 'custom'

    return advancedParameterDefinitions.filter(def =>
      def.appliesToProviders.includes(provider) &&
      !Object.prototype.hasOwnProperty.call(currentParams, def.name)
    )
  })

  const canTestFormConnection = computed(() => !!editingModelId.value && !isTestingFormConnection.value)
  const canRefreshModelOptions = computed(() => {
    return selectedProvider.value?.supportsDynamicModels && isConnectionConfigured.value && !isLoadingModelOptions.value
  })

  const modalTitle = computed(() => (editingModelId.value ? t('modelManager.editModel') : t('modelManager.addModel')))

  const isDefaultModel = (id: string) => {
    return DEFAULT_TEXT_MODEL_IDS.includes(id as typeof DEFAULT_TEXT_MODEL_IDS[number])
  }

  const resetFormState = () => {
    form.value = {
      id: '',
      name: '',
      enabled: true,
      providerId: '',
      modelId: '',
      connectionConfig: {},
      paramOverrides: {},
      displayMaskedKey: false
    }
    editingModelId.value = null
    formReady.value = false
    modelOptions.value = []
    selectedNewLLMParamId.value = ''
    customLLMParam.value = { key: '', value: '' }
    formConnectionStatus.value = null
  }

  const ensureProvidersLoaded = async () => {
    if (providersLoaded.value) return
    isLoadingProviders.value = true
    try {
      providers.value = textAdapterRegistry?.getAllProviders?.() || []
      providersLoaded.value = true
    } catch (error) {
      console.error('加载文本模型提供商失败:', error)
      toast.error(t('modelManager.loadFailed'))
      providers.value = []
    } finally {
      isLoadingProviders.value = false
    }
  }

  const loadStaticModelsForProvider = (providerId: string) => {
    if (!providerId || !textAdapterRegistry) {
      modelOptions.value = []
      return
    }
    try {
      const staticModels = textAdapterRegistry.getStaticModels(providerId)
      modelOptions.value = staticModels.map((model: TextModel) => ({
        value: model.id,
        label: model.name || model.id
      }))
    } catch (error) {
      console.error('加载 Provider 模型失败:', error)
      modelOptions.value = []
    }
  }

  const loadModels = async () => {
    loadingModels.value = true
    try {
      const all = await modelManager.getAllModels()
      models.value = all
        .map((model: TextModelConfig) => ({ ...model }))
        .sort((a: TextModelConfig, b: TextModelConfig) => {
          if (a.enabled !== b.enabled) {
            return a.enabled ? -1 : 1
          }
          const aDefault = isDefaultModel(a.id)
          const bDefault = isDefaultModel(b.id)
          if (aDefault !== bDefault) {
            return aDefault ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
    } catch (error) {
      console.error('加载模型失败:', error)
      toast.error(t('modelManager.loadFailed'))
    } finally {
      loadingModels.value = false
    }
  }

  const testConfigConnection = async (id: string) => {
    if (!id || testingConnections.value[id]) return
    testingConnections.value[id] = true
    try {
      const model = await modelManager.getModel(id)
      if (!model) {
        throw new Error(t('modelManager.noModelsAvailable'))
      }
      await llmService.testConnection(id)
      toast.success(t('modelManager.testSuccess', { provider: model.name }))
    } catch (error: any) {
      console.error('连接测试失败:', error)
      const model = await modelManager.getModel(id)
      const modelName = model?.name || id
      toast.error(t('modelManager.testFailed', {
        provider: modelName,
        error: error?.message || 'Unknown error'
      }))
    } finally {
      delete testingConnections.value[id]
    }
  }

  const enableModel = async (id: string) => {
    try {
      const model = await modelManager.getModel(id)
      if (!model) throw new Error(t('modelManager.noModelsAvailable'))
      await modelManager.enableModel(id)
      await loadModels()
      toast.success(t('modelManager.enableSuccess'))
    } catch (error: any) {
      console.error('启用模型失败:', error)
      toast.error(t('modelManager.enableFailed', { error: error.message }))
    }
  }

  const disableModel = async (id: string) => {
    try {
      const model = await modelManager.getModel(id)
      if (!model) throw new Error(t('modelManager.noModelsAvailable'))
      await modelManager.disableModel(id)
      await loadModels()
      toast.success(t('modelManager.disableSuccess'))
    } catch (error: any) {
      console.error('禁用模型失败:', error)
      toast.error(t('modelManager.disableFailed', { error: error.message }))
    }
  }

  const deleteModel = async (id: string) => {
    try {
      await modelManager.deleteModel(id)
      await loadModels()
      toast.success(t('modelManager.deleteSuccess'))
    } catch (error: any) {
      console.error('删除模型失败:', error)
      toast.error(t('modelManager.deleteFailed', { error: error.message }))
    }
  }

  const maskApiKey = (value: string) => {
    const keyLength = value.length
    if (keyLength <= 8) return '*'.repeat(keyLength)
    const visiblePart = 4
    const prefix = value.substring(0, visiblePart)
    const suffix = value.substring(keyLength - visiblePart)
    const maskedLength = keyLength - visiblePart * 2
    return `${prefix}${'*'.repeat(maskedLength)}${suffix}`
  }

  const setProvider = (providerId: string, autoSelectFirstModel = true) => {
    form.value.providerId = providerId
    formConnectionStatus.value = null

    if (!providerId) {
      form.value.connectionConfig = {}
      modelOptions.value = []
      return
    }

    loadStaticModelsForProvider(providerId)

    const providerMeta = providers.value.find(p => p.id === providerId)
    if (providerMeta?.defaultBaseURL) {
      form.value.connectionConfig = {
        ...form.value.connectionConfig,
        baseURL: providerMeta.defaultBaseURL
      }
    }

    if (autoSelectFirstModel && modelOptions.value.length > 0) {
      form.value.modelId = modelOptions.value[0].value
      form.value.defaultModel = modelOptions.value[0].value
    }
  }

  const prepareForCreate = async () => {
    resetFormState()
    await ensureProvidersLoaded()
    formReady.value = false

    if (providers.value.length > 0) {
      setProvider(providers.value[0].id, true)
    }

    formReady.value = true
  }

  const prepareForEdit = async (id: string) => {
    resetFormState()
    editingModelId.value = id
    await ensureProvidersLoaded()
    formReady.value = false

    try {
      const model = await modelManager.getModel(id)
      if (!model) {
        throw new Error(t('modelManager.noModelsAvailable'))
      }

      const connectionConfig: TextConnectionConfig = { ...(model.connectionConfig ?? {}) }
      const rawApiKey = connectionConfig.apiKey ?? ''
      if (rawApiKey) {
        connectionConfig.apiKey = maskApiKey(String(rawApiKey))
      }

      form.value = {
        id: model.id,
        originalId: model.id,
        name: model.name,
        enabled: model.enabled,
        providerId: model.providerMeta?.id ?? 'custom',
        modelId: model.modelMeta?.id ?? '',
        connectionConfig,
        paramOverrides: model.paramOverrides ? JSON.parse(JSON.stringify(model.paramOverrides)) : {},
        displayMaskedKey: !!rawApiKey,
        originalApiKey: String(rawApiKey) || undefined,
        defaultModel: String(model.modelMeta?.id ?? '')
      }

      setProvider(form.value.providerId, false)
      if (!modelOptions.value.some(option => option.value === form.value.modelId) && form.value.modelId) {
        modelOptions.value.push({ value: form.value.modelId, label: form.value.modelId })
      }

      // 编辑时不自动刷新模型列表，避免不必要的网络请求和延迟
      // 用户可以通过手动点击刷新按钮来获取最新模型列表
    } catch (error) {
      console.error('加载模型失败:', error)
      toast.error(t('modelManager.loadFailed'))
    } finally {
      formReady.value = true
    }
  }

  const refreshModelOptions = async (showSuccess = true) => {
    if (!form.value.providerId) return

    const baseURL = (form.value.connectionConfig.baseURL as string)?.trim()
    if (!baseURL) {
      toast.error(t('modelManager.needBaseUrl'))
      return
    }

    isLoadingModelOptions.value = true

    try {
      const providerTemplateId = form.value.providerId || currentProviderType.value || 'custom'
      const connectionConfig: TextConnectionConfig = {
        ...form.value.connectionConfig,
        baseURL,
        apiKey: form.value.displayMaskedKey && form.value.originalApiKey
          ? form.value.originalApiKey
          : form.value.connectionConfig.apiKey
      }

      const existingConfig = form.value.originalId ? await modelManager.getModel(form.value.originalId) : undefined

      let providerMeta = providers.value.find(p => p.id === providerTemplateId) || existingConfig?.providerMeta
      let modelMeta = existingConfig?.modelMeta

      if (textAdapterRegistry && providerTemplateId) {
        try {
          const adapter = textAdapterRegistry.getAdapter(providerTemplateId)
          if (!providerMeta) {
            providerMeta = adapter.getProvider()
          }
          const staticModels = adapter.getModels()
          if (form.value.modelId) {
            modelMeta = staticModels.find((m: TextModel) => m.id === form.value.modelId) || modelMeta
          }
          if (!modelMeta) {
            modelMeta = staticModels[0]
          }
          if (!modelMeta && form.value.modelId) {
            modelMeta = adapter.buildDefaultModel(form.value.modelId)
          }
        } catch (error) {
          console.warn(`[useTextModelManager] Failed to load metadata for provider ${providerTemplateId}`, error)
        }
      }

      const fetchedModels = await llmService.fetchModelList(providerTemplateId, {
        connectionConfig,
        providerMeta,
        modelMeta: modelMeta ? { ...modelMeta, id: form.value.modelId || modelMeta.id } : undefined
      } as Partial<TextModelConfig>)

      modelOptions.value = fetchedModels
      if (showSuccess) {
        toast.success(t('modelManager.fetchModelsSuccess', { count: fetchedModels.length }))
      }

      if (fetchedModels.length > 0 && !fetchedModels.some((m: any) => m.value === form.value.modelId)) {
        form.value.modelId = fetchedModels[0].value
      }
    } catch (error: any) {
      console.error('获取模型列表失败:', error)
      toast.error(error?.message || t('modelManager.loadFailed'))
      modelOptions.value = []
    } finally {
      isLoadingModelOptions.value = false
    }
  }

  const ensureProviderMeta = (providerId: string, existing?: TextProvider) => {
    if (existing) return existing
    const adapter = textAdapterRegistry.getAdapter(providerId)
    return adapter.getProvider()
  }

  const ensureModelMeta = (providerId: string, modelId: string, existing?: TextModel) => {
    const adapter = textAdapterRegistry.getAdapter(providerId)
    const staticModels = adapter.getModels()
    const foundModel = staticModels.find((m: TextModel) => m.id === modelId)
    if (foundModel) {
      return foundModel
    }
    return adapter.buildDefaultModel(modelId)
  }

  const updateExistingModel = async () => {
    if (!form.value.originalId) {
      throw new Error('编辑会话无效')
    }

    const existingConfig = await modelManager.getModel(form.value.originalId)
    if (!existingConfig) {
      throw new Error('模型不存在')
    }

    const connectionConfig: TextConnectionConfig = {
      ...form.value.connectionConfig,
      baseURL: (form.value.connectionConfig.baseURL as string)?.trim() || existingConfig.connectionConfig?.baseURL
    }

    if (form.value.displayMaskedKey) {
      if (form.value.originalApiKey) {
        connectionConfig.apiKey = form.value.originalApiKey
      } else {
        delete connectionConfig.apiKey
      }
    } else if (form.value.connectionConfig.apiKey) {
      connectionConfig.apiKey = form.value.connectionConfig.apiKey
    } else {
      delete connectionConfig.apiKey
    }

    const providerMeta = ensureProviderMeta(form.value.providerId, existingConfig.providerMeta)
    const modelMeta = ensureModelMeta(form.value.providerId, form.value.modelId, existingConfig.modelMeta)

    const updates: Partial<TextModelConfig> = {
      name: form.value.name,
      enabled: form.value.enabled,
      providerMeta,
      modelMeta,
      connectionConfig,
      paramOverrides: { ...(form.value.paramOverrides || {}) }
    }

    await modelManager.updateModel(form.value.originalId, updates)
    return form.value.originalId
  }

  const createNewModel = async () => {
    if (!form.value.id) {
      toast.error(t('modelManager.modelKeyRequired'))
      throw new Error('模型标识必填')
    }

    const providerMeta = ensureProviderMeta(form.value.providerId)
    const modelMeta = ensureModelMeta(form.value.providerId, form.value.defaultModel || form.value.modelId)

    const newConfig: TextModelConfig = {
      id: form.value.id,
      name: form.value.name,
      enabled: true,
      providerMeta,
      modelMeta,
      connectionConfig: { ...form.value.connectionConfig },
      paramOverrides: { ...(form.value.paramOverrides ?? {}) }
    }

    await modelManager.addModel(form.value.id, newConfig)
    return form.value.id
  }

  const saveForm = async () => {
    if (isSaving.value) return null
    isSaving.value = true
    try {
      const savedId = editingModelId.value ? await updateExistingModel() : await createNewModel()
      await loadModels()
      return savedId
    } finally {
      isSaving.value = false
    }
  }

  const testFormConnection = async () => {
    if (!editingModelId.value || isTestingFormConnection.value) return
    isTestingFormConnection.value = true
    formConnectionStatus.value = { type: 'info', message: t('modelManager.testing') }
    try {
      await llmService.testConnection(editingModelId.value)
      formConnectionStatus.value = { type: 'success', message: t('modelManager.testSuccess', { provider: form.value.name }) }
      toast.success(t('modelManager.testSuccess', { provider: form.value.name }))
    } catch (error: any) {
      console.error('连接测试失败:', error)
      formConnectionStatus.value = {
        type: 'error',
        message: t('modelManager.testFailed', { provider: form.value.name, error: error?.message || 'Unknown error' })
      }
      toast.error(t('modelManager.testFailed', { provider: form.value.name, error: error?.message || 'Unknown error' }))
    } finally {
      isTestingFormConnection.value = false
    }
  }

  const handleQuickAddParam = () => {
    if (selectedNewLLMParamId.value !== 'custom') {
      quickAddLLMParam()
    }
  }

  const quickAddLLMParam = () => {
    const paramsObject = currentParamOverrides.value
    if (!paramsObject) return
    if (selectedNewLLMParamId.value === 'custom') {
      if (customLLMParam.value.key && !Object.prototype.hasOwnProperty.call(paramsObject, customLLMParam.value.key)) {
        paramsObject[customLLMParam.value.key] = customLLMParam.value.value
      }
      customLLMParam.value = { key: '', value: '' }
    } else {
      const definition = advancedParameterDefinitions.find(def => def.id === selectedNewLLMParamId.value)
      if (definition && !Object.prototype.hasOwnProperty.call(paramsObject, definition.name)) {
        let val = definition.defaultValue
        if (definition.type === 'boolean') {
          val = val === undefined ? false : Boolean(val)
        } else if (definition.type === 'integer' && val !== undefined) {
          val = parseInt(String(val), 10)
        } else if (definition.type === 'number' && val !== undefined) {
          val = parseFloat(String(val))
        } else if (definition.name === 'stopSequences') {
          val = Array.isArray(val)
            ? val
            : typeof val === 'string' && val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
        }
        paramsObject[definition.name] = val
      }
    }
    selectedNewLLMParamId.value = ''
  }

  const handleCustomParamAdd = () => {
    if (customLLMParam.value.key && customLLMParam.value.value) {
      quickAddLLMParam()
    }
  }

  const cancelCustomParam = () => {
    selectedNewLLMParamId.value = ''
    customLLMParam.value = { key: '', value: '' }
  }

  const removeLLMParam = (paramKey: string) => {
    if (!form.value.paramOverrides) return
    const overrides = { ...(form.value.paramOverrides as Record<string, unknown>) }
    delete overrides[paramKey]
    form.value.paramOverrides = overrides
  }

  const getParamMetadata = (paramName: string) => {
    if (!advancedParameterDefinitions) return null
    const provider = currentProviderType.value || 'custom'
    const definition = advancedParameterDefinitions.find(
      def => def.name === paramName && def.appliesToProviders.includes(provider)
    )
    if (definition) {
      return {
        ...definition,
        label: definition.labelKey ? t(definition.labelKey) : definition.name,
        description: definition.descriptionKey ? t(definition.descriptionKey) : `(${paramName})`,
        unit: definition.unitKey ? t(definition.unitKey) : definition.unit || ''
      }
    }
    return null
  }

  const isParamInvalid = (paramName: string, value: unknown) => {
    const metadata = getParamMetadata(paramName)
    if (!metadata) {
      if (value === undefined || value === null || value === '') return false
      const dangerousNames = ['eval', 'exec', 'script', '__proto__', 'constructor']
      if (dangerousNames.some(dangerous => paramName.toLowerCase().includes(dangerous))) {
        return true
      }
      return false
    }
    if (value === undefined || value === null || value === '') return false
    if (metadata.type === 'number' || metadata.type === 'integer') {
      const numValue = Number(value)
      if (Number.isNaN(numValue)) return true
      if (metadata.minValue !== undefined && numValue < metadata.minValue) return true
      if (metadata.maxValue !== undefined && numValue > metadata.maxValue) return true
      if (metadata.type === 'integer' && !Number.isInteger(numValue)) return true
    }
    return false
  }

  const getParamValidationMessage = (paramName: string, value: unknown) => {
    const metadata = getParamMetadata(paramName)
    if (!metadata) {
      const dangerousNames = ['eval', 'exec', 'script', '__proto__', 'constructor']
      if (dangerousNames.some(dangerous => paramName.toLowerCase().includes(dangerous))) {
        return t('modelManager.advancedParameters.validation.dangerousParam')
      }
      return ''
    }
    if (metadata.type === 'number' || metadata.type === 'integer') {
      const numValue = Number(value)
      if (Number.isNaN(numValue)) {
        return t('modelManager.advancedParameters.validation.invalidNumber', {
          type: metadata.type === 'integer' ? t('common.integer') : t('common.number')
        })
      }
      if (metadata.minValue !== undefined && numValue < metadata.minValue) {
        return t('modelManager.advancedParameters.validation.belowMin', {
          min: metadata.minValue
        })
      }
      if (metadata.maxValue !== undefined && numValue > metadata.maxValue) {
        return t('modelManager.advancedParameters.validation.aboveMax', {
          max: metadata.maxValue
        })
      }
      if (metadata.type === 'integer' && !Number.isInteger(numValue)) {
        return t('modelManager.advancedParameters.validation.mustBeInteger')
      }
    }
    return ''
  }

  watch(() => form.value.connectionConfig.apiKey, (newValue) => {
    if (!editingModelId.value) return
    const val = newValue ?? ''
    const isMasked = typeof val === 'string' && val.includes('*')
    form.value.displayMaskedKey = isMasked
    if (!isMasked && typeof val === 'string') {
      form.value.originalApiKey = val
    }
  })

  watch(() => form.value.modelId, (val) => {
    form.value.defaultModel = val || ''
  })

  return {
    // list state
    models,
    loadingModels,
    loadModels,
    isDefaultModel,
    testingConnections,
    testConfigConnection,
    enableModel,
    disableModel,
    deleteModel,

    // providers
    providers,
    isLoadingProviders,
    loadProviders: ensureProvidersLoaded,
    selectProvider: setProvider,

    // form state & helpers
    form,
    formReady,
    isSaving,
    modalTitle,
    editingModelId,
    providerOptions,
    connectionFields,
    modelOptions,
    isLoadingModelOptions,
    availableLLMParamDefinitions,
    selectedNewLLMParamId,
    customLLMParam,
    currentParamOverrides,
    currentProviderType,
    selectedProvider,
    prepareForCreate,
    prepareForEdit,
    refreshModelOptions,
    saveForm,
    resetFormState,
    isTestingFormConnection,
    canTestFormConnection,
    testFormConnection,
    isConnectionConfigured,
    canRefreshModelOptions,
    handleQuickAddParam,
    handleCustomParamAdd,
    cancelCustomParam,
    removeLLMParam,
    getParamMetadata,
    isParamInvalid,
    getParamValidationMessage,
    formConnectionStatus
  }
}

export type TextModelManager = ReturnType<typeof useTextModelManager>
