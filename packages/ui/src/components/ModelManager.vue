<template>
  <div
    class="fixed inset-0 theme-mask z-[60] flex items-center justify-center overflow-y-auto"
    @click="$emit('close')"
  >
    <div
      class="relative theme-manager-container w-full max-w-3xl m-4"
      @click.stop
    >
      <div class="p-6 space-y-6">
        <!-- 标题和关闭按钮 -->
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold theme-manager-text">{{ t('modelManager.title') }}</h2>
          <button
            @click="$emit('close')"
            class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <!-- 已启用模型列表 -->
        <div class="space-y-3">
          <h3 class="text-lg font-semibold theme-manager-text">{{ t('modelManager.modelList') }}</h3>
          <div class="space-y-3">
            <div v-for="model in models" :key="model.key" 
                 :class="['p-4 rounded-xl border transition-colors',
                         model.enabled 
                           ? 'theme-manager-card' 
                           : 'theme-manager-card opacity-50 shadow-none hover:shadow-none']">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium" :class="model.enabled ? 'theme-manager-text' : 'theme-manager-text-disabled'">
                      {{ model.name }}
                    </h4>
                    <span v-if="!model.enabled" 
                          class="theme-manager-tag">
                      {{ t('modelManager.disabled') }}
                    </span>
                  </div>
                  <p class="text-sm" :class="model.enabled ? 'theme-manager-text-secondary' : 'theme-manager-text-disabled'">
                    {{ model.model }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <button @click="testConnection(model.key)"
                          :class="[
                            'theme-manager-button-test inline-flex items-center justify-center transition-all duration-300 ease-in-out',
                            isTestingConnectionFor(model.key) ? 'w-auto px-5' : ''
                          ]"
                          :disabled="isTestingConnectionFor(model.key)">
                    <span class="inline-block">{{ t('modelManager.testConnection') }}</span>
                    <span v-if="isTestingConnectionFor(model.key)"
                          class="overflow-hidden transition-all duration-300 ease-in-out ml-2 w-5 opacity-100">
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  </button>
                  <button @click="editModel(model.key)"
                          class="theme-manager-button-edit">
                    {{ t('modelManager.editModel') }}
                  </button>
                  <button @click="model.enabled ? disableModel(model.key) : enableModel(model.key)"
                          :class="[
                            model.enabled 
                              ? 'theme-manager-button-warning' 
                              : 'theme-manager-button-success'
                          ]">
                    {{ model.enabled ? t('common.disable') : t('common.enable') }}
                  </button>
                  <!-- 只对自定义模型显示删除按钮 -->
                  <button v-if="!isDefaultModel(model.key)" 
                          @click="handleDelete(model.key)"
                          class="theme-manager-button-danger">
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 使用 Teleport 将模态框传送到 body -->
        <Teleport to="body">
          <!-- 编辑模型弹窗 -->
          <div v-if="isEditing" 
               class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto"
               @click="cancelEdit">
            <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
            
            <div class="relative theme-manager-container w-full max-w-2xl m-4 z-10"
                 @click.stop>
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold theme-manager-text">{{ t('modelManager.editModel') }}</h3>
                  <button
                    @click="cancelEdit"
                    class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <form @submit.prevent="saveEdit" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.displayName') }}</label>
                    <input v-model="editingModel.name" type="text" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.displayNamePlaceholder')" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.apiUrl') }}</label>
                    <input v-model="editingModel.baseURL" type="url" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.apiUrlPlaceholder')" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.defaultModel') }}</label>
                    <InputWithSelect
                      v-model="editingModel.defaultModel"
                      :options="modelOptions"
                      :is-loading="isLoadingModels"
                      :loading-text="t('modelManager.loadingModels')"
                      :no-options-text="t('modelManager.noModelsAvailable')"
                      :hint-text="t('modelManager.clickToFetchModels')"
                      required
                      :placeholder="t('modelManager.defaultModelPlaceholder')"
                      @select="handleModelSelect"
                      @fetch-options="handleFetchEditingModels"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.apiKey') }}</label>
                    <input v-model="editingModel.apiKey" type="text"
                          class="theme-manager-input"
                          :placeholder="t('modelManager.apiKeyPlaceholder')" />
                  </div>
                  <div v-if="vercelProxyAvailable" class="flex items-center space-x-2">
                    <input 
                      :id="`vercel-proxy-${editingModel.key}`" 
                      v-model="editingModel.useVercelProxy" 
                      type="checkbox"
                      class="w-4 h-4 text-purple-600 bg-black/20 border-purple-600/50 rounded focus:ring-purple-500/50"
                    />
                    <label :for="`vercel-proxy-${editingModel.key}`" class="text-sm font-medium theme-manager-text">
                      {{ t('modelManager.useVercelProxy') }}
                    </label>
                  </div>
                  <div class="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      @click="cancelEdit"
                      class="theme-manager-button-secondary"
                    >
                      {{ t('common.cancel') }}
                    </button>
                    <button
                      type="submit"
                      class="theme-manager-button-primary"
                    >
                      {{ t('common.save') }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- 添加模型弹窗 -->
          <div v-if="showAddForm" class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto" @click="showAddForm = false">
            <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
            
            <div class="relative theme-manager-container w-full max-w-2xl m-4 z-10" @click.stop>
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold theme-manager-text">{{ t('modelManager.addModel') }}</h3>
                  <button @click="showAddForm = false" class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl">×</button>
                </div>
                
                <form @submit.prevent="addCustomModel" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.modelKey') }}</label>
                    <input v-model="newModel.key" type="text" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.modelKeyPlaceholder')" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.displayName') }}</label>
                    <input v-model="newModel.name" type="text" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.displayNamePlaceholder')" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.apiUrl') }}</label>
                    <input v-model="newModel.baseURL" type="url" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.apiUrlPlaceholder')" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.defaultModel') }}</label>
                    <InputWithSelect
                      v-model="newModel.defaultModel"
                      :options="modelOptions"
                      :is-loading="isLoadingModels"
                      :loading-text="t('modelManager.loadingModels')"
                      :no-options-text="t('modelManager.noModelsAvailable')"
                      :hint-text="t('modelManager.clickToFetchModels')"
                      required
                      :placeholder="t('modelManager.defaultModelPlaceholder')"
                      @select="handleModelSelect"
                      @fetch-options="handleFetchNewModels"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('modelManager.apiKey') }}</label>
                    <input v-model="newModel.apiKey" type="password" required
                          class="theme-manager-input"
                          :placeholder="t('modelManager.apiKeyPlaceholder')" />
                  </div>
                  <div v-if="vercelProxyAvailable" class="flex items-center space-x-2">
                    <input 
                      id="new-model-vercel-proxy" 
                      v-model="newModel.useVercelProxy" 
                      type="checkbox"
                      class="w-4 h-4 text-purple-600 bg-black/20 border-purple-600/50 rounded focus:ring-purple-500/50"
                    />
                    <label for="new-model-vercel-proxy" class="text-sm font-medium theme-manager-text">
                      {{ t('modelManager.useVercelProxyHint') }}
                    </label>
                  </div>
                  <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" @click="showAddForm = false" class="theme-manager-button-secondary">
                      {{ t('common.cancel') }}
                    </button>
                    <button type="submit" class="theme-manager-button-primary">
                      {{ t('common.create') }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- 添加模型按钮 -->
        <div class="mt-2 theme-manager-divider pt-2">
          <button @click="showAddForm = true" class="w-full theme-manager-button-secondary py-3 flex items-center justify-center space-x-2">
            <span>+</span>
            <span>{{ t('modelManager.addModel') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  modelManager,
  createLLMService,
  checkVercelApiAvailability,
  resetVercelStatusCache
} from '@prompt-optimizer/core';
import { useToast } from '../composables/useToast';
import InputWithSelect from './InputWithSelect.vue'

const { t } = useI18n()
const toast = useToast();
const emit = defineEmits(['modelsUpdated', 'close', 'select']);

// =============== 状态变量 ===============
// UI状态
const isEditing = ref(false);
const showAddForm = ref(false);
const modelOptions = ref([]);
const isLoadingModels = ref(false);
const testingConnections = ref({});
// 是否支持Vercel代理
const vercelProxyAvailable = ref(false);

// 数据状态
const models = ref([]);
const editingModel = ref(null);
const editingTempKey = ref(null);

// 表单状态
const newModel = ref({
  key: '',
  name: '',
  baseURL: '',
  defaultModel: '',
  apiKey: '',
  useVercelProxy: false
});

// =============== 初始化和辅助函数 ===============
// 检测Vercel代理是否可用
const checkVercelProxy = async () => {
  try {
    // 先重置缓存，确保每次都重新检测
    resetVercelStatusCache();
    // 使用core中的检测函数
    const available = await checkVercelApiAvailability();
    vercelProxyAvailable.value = available;
    console.log('Vercel代理检测结果:', vercelProxyAvailable.value);
  } catch (error) {
    console.log('Vercel代理不可用:', error);
    vercelProxyAvailable.value = false;
  }
};

// 加载所有模型
const loadModels = () => {
  try {
    // 强制刷新模型数据
    const allModels = modelManager.getAllModels();
    
    // 使用深拷贝确保响应式更新
    models.value = JSON.parse(JSON.stringify(allModels)).sort((a, b) => {
      // 启用的模型排在前面
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
      }
      // 默认模型排在前面
      if (isDefaultModel(a.key) !== isDefaultModel(b.key)) {
        return isDefaultModel(a.key) ? -1 : 1;
      }
      return 0;
    });
    
    console.log('处理后的模型列表:', models.value.map(m => ({
      key: m.key,
      name: m.name,
      enabled: m.enabled,
      hasApiKey: !!m.apiKey
    })));
    
    emit('modelsUpdated', models.value[0]?.key);
  } catch (error) {
    console.error('加载模型列表失败:', error);
    toast.error('加载模型列表失败');
  }
};

// 判断是否为默认模型
const isDefaultModel = (key) => {
  return ['openai', 'gemini', 'deepseek'].includes(key);
};

// =============== 模型管理函数 ===============
// 测试连接
const isTestingConnectionFor = (key) => !!testingConnections.value[key];
const testConnection = async (key) => {
  if (isTestingConnectionFor(key)) return;
  try {
    testingConnections.value[key] = true;
    const model = modelManager.getModel(key);
    if (!model) throw new Error(t('modelManager.noModelsAvailable'));

    const llm = createLLMService(modelManager);
    await llm.testConnection(key);
    toast.success(t('modelManager.testSuccess', { provider: model.name }));
  } catch (error) {
    console.error('连接测试失败:', error);
    const modelName = modelManager.getModel(key)?.name || key;
    toast.error(t('modelManager.testFailed', { 
      provider: modelName, 
      error: error.message || 'Unknown error' 
    }));
  } finally {
    delete testingConnections.value[key];
  }
};

// 处理删除
const handleDelete = async (key) => {
  if (confirm(t('modelManager.deleteConfirm'))) {
    try {
      modelManager.deleteModel(key)
      loadModels()
      toast.success(t('modelManager.deleteSuccess'))
    } catch (error) {
      console.error('删除模型失败:', error)
      toast.error(t('modelManager.deleteFailed', { error: error.message }))
    }
  }
};

// 启用模型
const enableModel = async (key) => {
  try {
    const model = modelManager.getModel(key)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    modelManager.enableModel(key)
    loadModels()
    emit('modelsUpdated', key)
    toast.success(t('modelManager.enableSuccess'))
  } catch (error) {
    console.error('启用模型失败:', error)
    toast.error(t('modelManager.enableFailed', { error: error.message }))
  }
}

// 禁用模型
const disableModel = async (key) => {
  try {
    const model = modelManager.getModel(key)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    modelManager.disableModel(key)
    loadModels()
    emit('modelsUpdated', key)
    toast.success(t('modelManager.disableSuccess'))
  } catch (error) {
    console.error('禁用模型失败:', error)
    toast.error(t('modelManager.disableFailed', { error: error.message }))
  }
}

// =============== 编辑相关函数 ===============
// 编辑模型
const editModel = (key) => {
  const model = modelManager.getModel(key);
  if (model) {
    // 为API密钥创建加密显示文本
    let maskedApiKey = '';
    if (model.apiKey) {
      // 显示密钥的前四位和后四位，中间用星号代替
      const keyLength = model.apiKey.length;
      if (keyLength <= 8) {
        maskedApiKey = '*'.repeat(keyLength);
      } else {
        const visiblePart = 4;
        const prefix = model.apiKey.substring(0, visiblePart);
        const suffix = model.apiKey.substring(keyLength - visiblePart);
        const maskedLength = keyLength - (visiblePart * 2);
        maskedApiKey = `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
      }
    }

    // 创建临时配置对象
    editingModel.value = {
      originalKey: key, // 保存原始key
      name: model.name,
      baseURL: model.baseURL,
      defaultModel: model.defaultModel,
      apiKey: maskedApiKey,
      displayMaskedKey: true,
      originalApiKey: model.apiKey,
      useVercelProxy: model.useVercelProxy,
      provider: model.provider,
      enabled: model.enabled,
      // 其他需要的字段...
    };
    
    // 初始化模型选项
    modelOptions.value = model.models && model.models.length > 0 
      ? model.models.map(m => ({ value: m, label: m }))
      : [{ value: model.defaultModel, label: model.defaultModel }];
    
    isEditing.value = true;
  }
};

// 获取编辑中模型的可用模型列表
const fetchAvailableModels = async (providerKey, apiUrl, apiKey) => {
  isLoadingModels.value = true;
  modelOptions.value = [];
  
  try {
    // Check if the provider has fetchModelList capability
    const llm = createLLMService(modelManager);
    
    // Only attempt to fetch if we have the necessary credentials
    if (apiUrl && apiKey) {
      const models = await llm.fetchModelList(providerKey, {
        baseURL: apiUrl,
        apiKey: apiKey
      });
      
      if (models && models.length > 0) {
        modelOptions.value = models.map(model => ({
          label: model.id,
          value: model.id
        }));
      } else {
        // If no models returned, add common ones as fallback
        addDefaultModelOptions(providerKey);
      }
    } else {
      // If missing credentials, add common ones as fallback
      addDefaultModelOptions(providerKey);
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // Add common models as fallback
    addDefaultModelOptions(providerKey);
  } finally {
    isLoadingModels.value = false;
  }
};
const addDefaultModelOptions = (providerKey) => {
  if (providerKey === 'openai') {
    modelOptions.value = [
      { label: 'gpt-4o', value: 'gpt-4o' },
      { label: 'gpt-4-turbo', value: 'gpt-4-turbo' },
      { label: 'gpt-4', value: 'gpt-4' },
      { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' }
    ];
  } else if (providerKey === 'anthropic') {
    modelOptions.value = [
      { label: 'claude-3-opus-20240229', value: 'claude-3-opus-20240229' },
      { label: 'claude-3-sonnet-20240229', value: 'claude-3-sonnet-20240229' },
      { label: 'claude-3-haiku-20240307', value: 'claude-3-haiku-20240307' },
      { label: 'claude-2.1', value: 'claude-2.1' }
    ];
  } else if (providerKey === 'gemini') {
    modelOptions.value = [
      { label: 'gemini-pro', value: 'gemini-pro' },
      { label: 'gemini-1.5-pro', value: 'gemini-1.5-pro' }
    ];
  } else if (providerKey === 'deepseek') {
    modelOptions.value = [
      { label: 'deepseek-chat', value: 'deepseek-chat' },
      { label: 'deepseek-coder', value: 'deepseek-coder' }
    ];
  } else {
    // For custom models, provide empty list
    modelOptions.value = [];
  }
};
const handleModelSelect = (option) => {
  // This can be expanded if additional logic is needed when model is selected
  console.log('Selected model:', option);
};
const handleFetchEditingModels = async () => {
  if (!editingModel.value) {
    return;
  }
  
  isLoadingModels.value = true;
  
  try {
    // 获取要使用的配置
    let apiKey = editingModel.value.apiKey;
    const baseURL = editingModel.value.baseURL;
    
    // 如果是掩码密钥，使用原始密钥
    if (editingModel.value.displayMaskedKey && editingModel.value.originalKey) {
      const originalModel = modelManager.getModel(editingModel.value.originalKey);
      if (originalModel && originalModel.apiKey) {
        apiKey = originalModel.apiKey;
      }
    }
    
    // 检查必要的参数
    if (!apiKey || !baseURL) {
      toast.error(t('modelManager.needApiKeyAndBaseUrl'));
      return;
    }
    
    // 使用 LLM 服务获取模型列表
    const llm = createLLMService(modelManager);
    
    // 构建自定义配置
    const customConfig = {
      baseURL: baseURL,
      apiKey: apiKey,
      provider: editingModel.value.provider || 'custom',
      useVercelProxy: editingModel.value.useVercelProxy
    };
    
    // 确定要使用的 provider key（使用原始key或临时key）
    const providerKey = editingModel.value.originalKey || editingModel.value.key;
    
    // 获取模型列表
    const models = await llm.fetchModelList(providerKey, customConfig);
    
    if (models.length > 0) {
      modelOptions.value = models;
      toast.success(t('modelManager.fetchModelsSuccess', {count: models.length}));
      
      // 如果当前选择的模型不在列表中，默认选择第一个
      if (!models.some(m => m.value === editingModel.value.defaultModel)) {
        editingModel.value.defaultModel = models[0].value;
      }
    } else {
      toast.warning(t('modelManager.noModelsAvailable'));
      addDefaultModelOptions(providerKey);
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
    toast.error(t('modelManager.fetchModelsFailed', {error: error.message}));
    
    // 使用提供商特定的默认选项
    if (editingModel.value.originalKey) {
      addDefaultModelOptions(editingModel.value.originalKey);
    } else {
      addDefaultModelOptions('custom');
    }
  } finally {
    isLoadingModels.value = false;
  }
};
const handleFetchNewModels = async () => {
  if (!newModel.value) {
    return;
  }
  
  const apiKey = newModel.value.apiKey;
  const baseURL = newModel.value.baseURL;
  const provider = newModel.value.key || 'custom';
  
  // 检查必要的参数
  if (!apiKey || !baseURL) {
    toast.error(t('modelManager.needApiKeyAndBaseUrl'));
    return;
  }
  
  isLoadingModels.value = true;
  
  try {
    // 使用 LLM 服务获取模型列表
    const llm = createLLMService(modelManager);
    
    // 构建自定义配置
    const customConfig = {
      baseURL: baseURL,
      apiKey: apiKey,
      provider: 'custom',  // 新模型默认为自定义提供商
      useVercelProxy: newModel.value.useVercelProxy
    };
    
    // 获取模型列表
    const models = await llm.fetchModelList(provider, customConfig);
    
    if (models.length > 0) {
      modelOptions.value = models;
      toast.success(t('modelManager.fetchModelsSuccess', {count: models.length}));
      
      // 默认选择第一个模型
      newModel.value.defaultModel = models[0].value;
    } else {
      toast.warning(t('modelManager.noModelsAvailable'));
      addDefaultModelOptions('custom');
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
    toast.error(t('modelManager.fetchModelsFailed', {error: error.message}));
    
    // 添加默认选项
    addDefaultModelOptions('custom');
  } finally {
    isLoadingModels.value = false;
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editingModel.value = null;
  modelOptions.value = [];
};

// 保存编辑
const saveEdit = async () => {
  try {
    if (!editingModel.value || !editingModel.value.originalKey) {
      throw new Error('编辑会话无效');
    }
    
    const originalKey = editingModel.value.originalKey;
    
    // 创建更新配置对象
    const config = {
      name: editingModel.value.name,
      baseURL: editingModel.value.baseURL,
      // 如果是掩码密钥，使用原始密钥；否则使用新输入的密钥
      apiKey: editingModel.value.displayMaskedKey 
        ? editingModel.value.originalApiKey 
        : editingModel.value.apiKey,
      defaultModel: editingModel.value.defaultModel,
      models: [editingModel.value.defaultModel], // 可以根据需要扩展
      useVercelProxy: editingModel.value.useVercelProxy,
      provider: editingModel.value.provider || 'custom',
      enabled: editingModel.value.enabled !== undefined 
        ? editingModel.value.enabled 
        : true
    };
    
    // 直接更新原始模型
    modelManager.updateModel(originalKey, config);
    
    // 重新加载模型列表
    loadModels();
    
    // 触发更新事件
    emit('modelsUpdated', originalKey);
    
    // 清理临时状态
    isEditing.value = false;
    editingModel.value = null;
    
    toast.success(t('modelManager.updateSuccess'));
  } catch (error) {
    console.error('更新模型失败:', error);
    toast.error(t('modelManager.updateFailed', { error: error.message }));
  }
};

// =============== 添加相关函数 ===============
// 添加自定义模型
const addCustomModel = async () => {
  try {
    const config = {
      name: newModel.value.name,
      baseURL: newModel.value.baseURL,
      models: [newModel.value.defaultModel],
      defaultModel: newModel.value.defaultModel,
      apiKey: newModel.value.apiKey,
      enabled: true,
      provider: 'custom',
      useVercelProxy: newModel.value.useVercelProxy
    }

    modelManager.addModel(newModel.value.key, config)
    loadModels()
    showAddForm.value = false
    // 修改这里，传递新添加的模型的 key
    emit('modelsUpdated', newModel.value.key)
    newModel.value = {
      key: '',
      name: '',
      baseURL: '',
      defaultModel: '',
      apiKey: '',
      useVercelProxy: false
    }
    toast.success('模型添加成功')
  } catch (error) {
    console.error('添加模型失败:', error)
    toast.error(`添加模型失败: ${error.message}`)
  }
};

// =============== 监听器 ===============
// 当编辑或创建表单打开/关闭时，重置状态
watch(() => editingModel.value?.apiKey, (newValue) => {
  if (editingModel.value && newValue) {
    // 如果新输入的密钥不包含星号，标记为非掩码
    editingModel.value.displayMaskedKey = newValue.includes('*');
  }
});

// =============== 生命周期钩子 ===============
// 初始化
onMounted(() => {
  loadModels();
  checkVercelProxy();
});
</script>

<style scoped>
/* 添加过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>