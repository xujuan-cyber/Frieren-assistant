<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto"
    @click="$emit('close')"
  >
    <div
      class="relative bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-xl border border-purple-700/50 w-full max-w-3xl m-4"
      @click.stop
    >
      <div class="p-6 space-y-6">
        <!-- 标题和关闭按钮 -->
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white/90">模型设置</h2>
          <button
            @click="$emit('close')"
            class="text-white/60 hover:text-white/90 transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <!-- 已启用模型列表 -->
        <div class="space-y-3">
          <h3 class="text-lg font-semibold text-white/90">模型列表</h3>
          <div class="space-y-3">
            <div v-for="model in models" :key="model.key" 
                 :class="['p-4 rounded-xl border transition-colors',
                         model.enabled 
                           ? 'bg-black/20 border-purple-600/50' 
                           : 'bg-black/10 border-gray-600/50']">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium" :class="model.enabled ? 'text-white/90' : 'text-white/60'">
                      {{ model.name }}
                    </h4>
                    <span v-if="!model.enabled" 
                          class="px-1.5 py-0.5 text-xs rounded bg-gray-600/20 text-gray-400">
                      已禁用
                    </span>
                  </div>
                  <p class="text-sm" :class="model.enabled ? 'text-white/60' : 'text-white/40'">
                    {{ model.model }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <button @click="editModel(model.key)"
                          class="px-4 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors">
                    编辑
                  </button>
                  <button @click="model.enabled ? disableModel(model.key) : enableModel(model.key)"
                          :class="['px-4 py-1.5 text-sm rounded-lg transition-colors',
                                  model.enabled 
                                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                    : 'bg-green-500/20 text-green-300 hover:bg-green-500/30']">
                    {{ model.enabled ? '禁用' : '启用' }}
                  </button>
                  <!-- 只对自定义模型显示删除按钮 -->
                  <button v-if="!isDefaultModel(model.key)" 
                          @click="handleDelete(model.key)"
                          class="px-4 py-1.5 text-sm rounded-lg bg-red-700/20 text-red-400 hover:bg-red-700/30 transition-colors">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 编辑模型 -->
        <div v-if="isEditing">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-semibold text-white/90">编辑模型</h3>
            <button @click="cancelEdit" 
                    class="text-sm text-white/60 hover:text-white/90 transition-colors">
              取消
            </button>
          </div>
          <form @submit.prevent="saveEdit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">显示名称</label>
              <input v-model="editingModel.name" type="text" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="例如: 自定义模型"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">API 地址</label>
              <input v-model="editingModel.baseURL" type="url" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="https://api.example.com/v1/chat/completions"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">默认模型名称</label>
              <input v-model="editingModel.defaultModel" type="text" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="例如: gpt-3.5-turbo"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">API 密钥</label>
              <input v-model="editingModel.apiKey" type="password"
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="输入新的 API 密钥（留空则保持不变）"/>
            </div>
            <button type="submit"
                    class="w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors">
              保存修改
            </button>
          </form>
        </div>

        <!-- 添加自定义模型 -->
        <div v-else>
          <h3 class="text-lg font-semibold text-white/90 mb-3">添加自定义模型</h3>
          <form @submit.prevent="addCustomModel" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">模型标识</label>
              <input v-model="newModel.key" type="text" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="例如: custom-model"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">显示名称</label>
              <input v-model="newModel.name" type="text" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="例如: 自定义模型"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">API 地址</label>
              <input v-model="newModel.baseURL" type="url" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="https://api.example.com/v1/chat/completions"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">默认模型名称</label>
              <input v-model="newModel.defaultModel" type="text" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="例如: gpt-3.5-turbo"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">API 密钥</label>
              <input v-model="newModel.apiKey" type="password" required
                     class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                     placeholder="输入 API 密钥"/>
            </div>
            <button type="submit"
                    class="w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors">
              添加模型
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits } from 'vue';
import { modelManager } from '../services/model/manager';
import { useToast } from '../composables/useToast';

const toast = useToast();
const emit = defineEmits(['modelsUpdated', 'close']);

const models = ref([]);
const isEditing = ref(false);
const editingModel = ref(null);
const newModel = ref({
  key: '',
  name: '',
  baseURL: '',
  defaultModel: '',
  apiKey: ''
});

// 加载所有模型
const loadModels = () => {
  models.value = modelManager.getAllModels();
  emit('modelsUpdated', models.value);
};

// 判断是否为默认模型
const isDefaultModel = (key) => {
  return ['openai', 'gemini', 'deepseek'].includes(key);
};

// 处理删除
const handleDelete = async (key) => {
  if (confirm(`确定要删除模型 ${key} 吗？此操作不可恢复。`)) {
    try {
      modelManager.deleteModel(key);
      loadModels();
      toast.success('模型已删除');
    } catch (error) {
      console.error('删除模型失败:', error);
      toast.error(`删除模型失败: ${error.message}`);
    }
  }
};

// 编辑模型
const editModel = (key) => {
  const model = modelManager.getModel(key);
  if (model) {
    editingModel.value = {
      key,
      name: model.name,
      baseURL: model.baseURL,
      defaultModel: model.defaultModel,
      apiKey: ''  // 不显示原有的 API 密钥
    };
    isEditing.value = true;
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editingModel.value = null;
};

// 保存编辑
const saveEdit = () => {
  try {
    // 获取原始配置
    const originalConfig = modelManager.getModel(editingModel.value.key);
    if (!originalConfig) {
      throw new Error('找不到原始配置');
    }

    // 构建更新配置,保留原有的 apiKey
    const config = {
      name: editingModel.value.name,
      baseURL: editingModel.value.baseURL,
      models: [editingModel.value.defaultModel],
      defaultModel: editingModel.value.defaultModel,
      apiKey: editingModel.value.apiKey.trim() || originalConfig.apiKey // 如果没有新的 apiKey,保留原有的
    };

    // 更新配置
    modelManager.updateModel(editingModel.value.key, config);

    loadModels();
    isEditing.value = false;
    editingModel.value = null;
    toast.success('模型配置已更新');
  } catch (error) {
    console.error('更新模型失败:', error);
    toast.error(`更新模型失败: ${error.message}`);
  }
};

// 启用模型
const enableModel = async (key) => {
  try {
    modelManager.enableModel(key);
    loadModels();
    toast.success('模型已启用');
  } catch (error) {
    console.error('启用模型失败:', error);
    toast.error(`启用模型失败: ${error.message}`);
  }
};

// 禁用模型
const disableModel = async (key) => {
  try {
    modelManager.disableModel(key);
    loadModels();
    toast.success('模型已禁用');
  } catch (error) {
    console.error('禁用模型失败:', error);
    toast.error(`禁用模型失败: ${error.message}`);
  }
};

// 添加自定义模型
const addCustomModel = () => {
  try {
    const config = {
      name: newModel.value.name,
      baseURL: newModel.value.baseURL,
      models: [newModel.value.defaultModel],
      defaultModel: newModel.value.defaultModel,
      apiKey: newModel.value.apiKey
    };

    modelManager.addModel(newModel.value.key, config);
    loadModels();
    
    // 重置表单
    newModel.value = {
      key: '',
      name: '',
      baseURL: '',
      defaultModel: '',
      apiKey: ''
    };
    
    toast.success('模型已添加');
  } catch (error) {
    console.error('添加模型失败:', error);
    toast.error(`添加模型失败: ${error.message}`);
  }
};

onMounted(() => {
  loadModels();
});
</script>