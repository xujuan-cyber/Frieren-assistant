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
          <h2 class="text-xl font-semibold text-white/90">提示词模板管理</h2>
          <div class="flex items-center space-x-4">
            <span v-if="selectedTemplate" class="text-sm text-purple-300">
              当前模板: {{ selectedTemplate.name }}
            </span>
            <button
              @click="$emit('close')"
              class="text-white/60 hover:text-white/90 transition-colors text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 模板列表 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-white/90">模板列表</h3>
            <button
              @click="showAddForm = true"
              class="px-4 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              添加模板
            </button>
          </div>
          
          <div class="space-y-3 max-h-[60vh] overflow-y-auto">
            <div v-for="template in templates" :key="template.id" 
                 class="p-4 rounded-xl border border-purple-600/50 bg-black/20"
                 :class="{'border-purple-400': selectedTemplate?.id === template.id}">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-white/90 flex items-center gap-2">
                    {{ template.name }}
                    <span v-if="template.isBuiltin" 
                          class="px-1.5 py-0.5 text-xs rounded bg-purple-600/20 text-purple-300">
                      内置
                    </span>
                  </h4>
                  <p class="text-sm text-white/60 mt-1">
                    {{ template.metadata.description || '暂无描述' }}
                  </p>
                  <p class="text-xs text-white/40 mt-2">
                    最后修改: {{ formatDate(template.metadata.lastModified) }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    @click="selectTemplate(template)"
                    class="px-3 py-1.5 text-sm rounded-lg"
                    :class="[
                      selectedTemplate?.id === template.id
                        ? 'bg-purple-500/30 text-purple-200'
                        : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
                    ]"
                  >
                    {{ selectedTemplate?.id === template.id ? '已选择' : '选择' }}
                  </button>
                  <button
                    @click="editTemplate(template)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                    :disabled="template.isBuiltin"
                    v-if="!template.isBuiltin"
                  >
                    编辑
                  </button>
                  <button
                    @click="copyTemplate(template)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                    v-if="template.isBuiltin"
                  >
                    复制模板
                  </button>
                  <button
                    @click="exportTemplate(template.id)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                  >
                    导出
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="confirmDelete(template.id)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 添加/编辑模板表单 -->
        <div v-if="showAddForm || editingTemplate" class="border-t border-purple-700/50 pt-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-white/90">
              {{ editingTemplate ? '编辑模板' : '添加模板' }}
            </h3>
            <button
              @click="cancelEdit"
              class="text-white/60 hover:text-white/90 transition-colors"
            >
              取消
            </button>
          </div>
          
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">模板名称</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                placeholder="输入模板名称"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">模板内容</label>
              <textarea
                v-model="form.content"
                required
                rows="6"
                class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                placeholder="输入模板内容"
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-white/90 mb-1.5">描述</label>
              <textarea
                v-model="form.description"
                rows="2"
                class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                placeholder="输入模板描述（可选）"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                @click="cancelEdit"
                class="px-4 py-2 text-white/70 hover:text-white/90 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                {{ editingTemplate ? '保存修改' : '添加模板' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 导入模板 -->
        <div class="border-t border-purple-700/50 pt-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white/90">导入模板</h3>
          </div>
          <div class="flex items-center space-x-3">
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              class="hidden"
              @change="handleFileImport"
            />
            <button
              @click="$refs.fileInput.click()"
              class="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              选择文件
            </button>
            <span class="text-sm text-white/60">支持 .json 格式的模板文件</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { templateManager } from '../services/template/manager'
import { useToast } from '../composables/useToast'

const toast = useToast()
const emit = defineEmits(['close', 'select'])

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  }
})

const fileInput = ref(null)
const templates = ref([])
const showAddForm = ref(false)
const editingTemplate = ref(null)
const selectedTemplate = ref(props.modelValue)

const form = ref({
  name: '',
  content: '',
  description: ''
})

// 加载模板列表
const loadTemplates = async () => {
  try {
    // 确保模板管理器已初始化
    await templateManager.init();
    templates.value = await templateManager.listTemplates();
    console.log('加载到的模板:', templates.value);
  } catch (error) {
    console.error('加载模板失败:', error);
    toast.error('加载模板失败');
  }
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 编辑模板
const editTemplate = (template) => {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    content: template.content,
    description: template.metadata.description || ''
  }
}

// 取消编辑
const cancelEdit = () => {
  showAddForm.value = false
  editingTemplate.value = null
  form.value = {
    name: '',
    content: '',
    description: ''
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    const templateData = {
      id: editingTemplate.value?.id || `template-${Date.now()}`,
      name: form.value.name,
      content: form.value.content,
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
        description: form.value.description,
        author: 'User'
      }
    }

    await templateManager.saveTemplate(templateData)
    await loadTemplates()
    
    // 如果正在编辑的是当前选中的模板,则更新选中的模板
    if (selectedTemplate.value?.id === templateData.id) {
      const updatedTemplate = await templateManager.getTemplate(templateData.id)
      selectedTemplate.value = updatedTemplate
      emit('select', updatedTemplate)
    }
    
    toast.success(editingTemplate.value ? '模板已更新' : '模板已添加')
    cancelEdit()
  } catch (error) {
    console.error('保存模板失败:', error)
    toast.error(`保存模板失败: ${error.message}`)
  }
}

// 确认删除
const confirmDelete = async (templateId) => {
  if (confirm('确定要删除这个模板吗？此操作不可恢复。')) {
    try {
      await templateManager.deleteTemplate(templateId)
      await loadTemplates()
      toast.success('模板已删除')
    } catch (error) {
      console.error('删除模板失败:', error)
      toast.error(`删除模板失败: ${error.message}`)
    }
  }
}

// 导出模板
const exportTemplate = (templateId) => {
  try {
    const templateJson = templateManager.exportTemplate(templateId)
    const blob = new Blob([templateJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${templateId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('模板已导出')
  } catch (error) {
    console.error('导出模板失败:', error)
    toast.error(`导出模板失败: ${error.message}`)
  }
}

// 导入模板
const handleFileImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        await templateManager.importTemplate(e.target.result)
        await loadTemplates()
        toast.success('模板已导入')
        event.target.value = '' // 清空文件输入
      } catch (error) {
        console.error('导入模板失败:', error)
        toast.error(`导入模板失败: ${error.message}`)
      }
    }
    reader.readAsText(file)
  } catch (error) {
    console.error('读取文件失败:', error)
    toast.error('读取文件失败')
  }
}

// 复制内置模板
const copyTemplate = (template) => {
  showAddForm.value = true
  form.value = {
    name: `${template.name} - 副本`,
    content: template.content,
    description: template.metadata.description || ''
  }
}

// 选择模板
const selectTemplate = (template) => {
  selectedTemplate.value = template
  emit('select', template)
}

// 生命周期钩子
onMounted(() => {
  loadTemplates()
})
</script> 