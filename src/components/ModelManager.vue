<template>
  <div class="p-4">
    <!-- 已启用模型列表 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-white/90 mb-3">已启用的模型</h3>
      <div class="space-y-3">
        <div v-for="model in enabledModels" :key="model.key" 
             class="p-4 rounded-xl bg-black/20 border border-purple-600/50">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium text-white/90">{{ model.name }}</h4>
              <p class="text-sm text-white/60">{{ model.model }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <button @click="editModel(model.key)"
                      class="px-4 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors">
                编辑
              </button>
              <button @click="disableModel(model.key)"
                      class="px-4 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                禁用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑模型 -->
    <div v-if="isEditing" class="mb-6">
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
          <input v-model="editingModel.baseUrl" type="url" required
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
    <div v-else class="mb-6">
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
          <input v-model="newModel.baseUrl" type="url" required
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { llmService } from '../services/llm';

const enabledModels = ref([]);
const isEditing = ref(false);
const editingModel = ref(null);
const newModel = ref({
  key: '',
  name: '',
  baseUrl: '',
  defaultModel: '',
  apiKey: ''
});

// 加载已启用的模型
const loadEnabledModels = () => {
  enabledModels.value = llmService.getEnabledModels();
};

// 编辑模型
const editModel = (key) => {
  const model = llmService.getModel(key);
  if (model) {
    editingModel.value = {
      key,
      name: model.name,
      baseUrl: model.baseUrl,
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
    const config = {
      name: editingModel.value.name,
      baseUrl: editingModel.value.baseUrl,
      models: [editingModel.value.defaultModel],
      defaultModel: editingModel.value.defaultModel
    };

    llmService.updateModelConfig(editingModel.value.key, config);
    
    // 如果提供了新的 API 密钥，则更新
    if (editingModel.value.apiKey) {
      llmService.setApiKey(editingModel.value.key, editingModel.value.apiKey);
    }

    loadEnabledModels();
    isEditing.value = false;
    editingModel.value = null;
  } catch (error) {
    console.error('更新模型失败:', error);
    // TODO: 显示错误提示
  }
};

// 禁用模型
const disableModel = (key) => {
  llmService.setApiKey(key, '');
  loadEnabledModels();
};

// 添加自定义模型
const addCustomModel = () => {
  try {
    const config = {
      name: newModel.value.name,
      baseUrl: newModel.value.baseUrl,
      models: [newModel.value.defaultModel],
      defaultModel: newModel.value.defaultModel,
      apiKey: newModel.value.apiKey
    };

    llmService.addCustomModel(newModel.value.key, config);
    loadEnabledModels();

    // 重置表单
    newModel.value = {
      key: '',
      name: '',
      baseUrl: '',
      defaultModel: '',
      apiKey: ''
    };
  } catch (error) {
    console.error('添加自定义模型失败:', error);
    // TODO: 显示错误提示
  }
};

onMounted(() => {
  loadEnabledModels();
});
</script>