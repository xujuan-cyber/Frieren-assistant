<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center overflow-y-auto"
    @click="$emit('close')"
  >
    <div
      class="relative bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-xl border border-purple-700/50 w-full max-w-3xl m-4"
      @click.stop
    >
      <div class="p-6 space-y-6">
        <!-- 标题和关闭按钮 -->
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white/90">功能提示词管理</h2>
          <div class="flex items-center space-x-4">
            <span v-if="selectedTemplate" class="text-sm text-purple-300">
              当前提示词: {{ selectedTemplate.name }}
            </span>
            <button
              @click="$emit('close')"
              class="text-white/60 hover:text-white/90 transition-colors text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 新增类型切换标签 -->
        <div class="flex space-x-4 mb-6 p-1 bg-gray-800/30 rounded-lg">
          <button 
            v-for="type in ['optimize', 'iterate']" 
            :key="type"
            @click="currentType = type"
            class="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200"
            :class="[
              currentType === type 
                ? type === 'optimize'
                  ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-900/20' 
                  : 'bg-teal-600/30 text-teal-300 shadow-lg shadow-teal-900/20'
                : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <div class="flex items-center justify-center space-x-2">
              <span class="text-lg">{{ type === 'optimize' ? '🎯' : '🔄' }}</span>
              <span>{{ type === 'optimize' ? '优化提示词' : '迭代提示词' }}</span>
            </div>
          </button>
        </div>

        <!-- 提示词列表 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold flex items-center space-x-2">
              <span class="text-white/90">
                {{ currentType === 'optimize' ? '优化提示词列表' : '迭代提示词列表' }}
              </span>
              <span 
                class="px-2 py-1 text-xs rounded-full"
                :class="currentType === 'optimize' 
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'bg-teal-600/20 text-teal-300'"
              >
                {{ filteredTemplates.length }}个提示词
              </span>
            </h3>
            <button
              @click="showAddForm = true"
              class="px-4 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              添加提示词
            </button>
          </div>
          
          <!-- 提示词列表按类型过滤 -->
          <div class="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <div 
              v-for="template in filteredTemplates"
              :key="template.id"
              class="group relative p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5"
              :class="[
                (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                  ? template.metadata.templateType === 'optimize'
                    ? 'border-purple-500/50 bg-purple-900/10 shadow-lg shadow-purple-900/10'
                    : 'border-teal-500/50 bg-teal-900/10 shadow-lg shadow-teal-900/10'
                  : 'border-gray-700/50 hover:border-gray-600/60 bg-gray-800/20 hover:bg-gray-800/30'
              ]"
            >
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
                      (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                        ? 'bg-purple-500/30 text-purple-200'
                        : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
                    ]"
                  >
                    {{ (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id ? '已选择' : '选择' }}
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
                    @click="viewTemplate(template)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                    v-if="template.isBuiltin"
                  >
                    查看
                  </button>
                  <button
                    @click="copyTemplate(template)"
                    class="px-3 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                    v-if="template.isBuiltin"
                  >
                    复制提示词
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
              <div 
                class="absolute top-0 left-0 w-2 h-full rounded-l-xl"
                :class="template.metadata.templateType === 'optimize' ? 'bg-purple-500/50' : 'bg-teal-500/50'"
              ></div>
              <span 
                class="px-2 py-1 text-xs rounded-full capitalize"
                :class="template.metadata.templateType === 'optimize' 
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'bg-teal-600/20 text-teal-300'"
              >
                {{ template.metadata.templateType === 'optimize' ? '优化' : '迭代' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 使用 Teleport 将模态框传送到 body -->
        <Teleport to="body">
          <!-- 查看/编辑模态框 -->
          <div v-if="showAddForm || editingTemplate || viewingTemplate" 
               class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto"
               @click="cancelEdit">
            <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
            
            <div class="relative bg-gray-900/95 rounded-xl shadow-2xl border border-purple-700/50 w-full max-w-2xl m-4 z-10"
                 @click.stop>
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold text-white/90">
                    {{ viewingTemplate ? '查看提示词' : (editingTemplate ? '编辑提示词' : '添加提示词') }}
                  </h3>
                  <button
                    @click="cancelEdit"
                    class="text-white/60 hover:text-white/90 transition-colors text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-white/90 mb-1.5">提示词名称</label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      :readonly="viewingTemplate"
                      class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词名称"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-white/90 mb-1.5">提示词内容</label>
                    <textarea
                      v-model="form.content"
                      required
                      :readonly="viewingTemplate"
                      rows="8"
                      class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词内容"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-white/90 mb-1.5">描述</label>
                    <textarea
                      v-model="form.description"
                      :readonly="viewingTemplate"
                      rows="3"
                      class="w-full px-4 py-2 rounded-xl bg-black/20 border border-purple-600/50 text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词描述（可选）"
                    ></textarea>
                  </div>

                  <div class="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      @click="cancelEdit"
                      class="px-4 py-2 rounded-lg border border-gray-600/50 text-white/70 hover:text-white/90 hover:border-gray-500/60 transition-all"
                    >
                      {{ viewingTemplate ? '关闭' : '取消' }}
                    </button>
                    <button
                      v-if="!viewingTemplate"
                      type="submit"
                      class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                      {{ editingTemplate ? '保存修改' : '添加提示词' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- 导入提示词 -->
        <div class="border-t border-purple-700/50 pt-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white/90">导入提示词</h3>
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
            <span class="text-sm text-white/60">支持 .json 格式的提示词文件</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { templateManager } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'

const props = defineProps({
  selectedOptimizeTemplate: Object,
  selectedIterateTemplate: Object,
  templateType: {
    type: String,
    required: true,
    validator: (value) => ['optimize', 'iterate'].includes(value)
  }
})

const emit = defineEmits(['close', 'select'])
const toast = useToast()

const templates = ref([])
const currentType = ref(props.templateType)
const showAddForm = ref(false)
const editingTemplate = ref(null)
const viewingTemplate = ref(null)

const form = ref({
  name: '',
  content: '',
  description: ''
})

// 加载提示词列表
const loadTemplates = async () => {
  try {
    // 确保提示词管理器已初始化
    await templateManager.init();
    templates.value = await templateManager.listTemplates();
    console.log('加载到的提示词:', templates.value);
  } catch (error) {
    console.error('加载提示词失败:', error);
    toast.error('加载提示词失败');
  }
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 编辑提示词
const editTemplate = (template) => {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    content: template.content,
    description: template.metadata.description || ''
  }
}

// 查看提示词
const viewTemplate = (template) => {
  viewingTemplate.value = template
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
  viewingTemplate.value = null
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
        author: 'User',
        templateType: props.templateType
      }
    }

    await templateManager.saveTemplate(templateData)
    await loadTemplates()
    
    // 如果正在编辑的是当前选中的提示词,则更新选中的提示词
    if (props.selectedOptimizeTemplate?.id === templateData.id) {
      const updatedTemplate = await templateManager.getTemplate(templateData.id)
      props.selectedOptimizeTemplate = updatedTemplate
      emit('select', updatedTemplate, currentType.value)
    } else if (props.selectedIterateTemplate?.id === templateData.id) {
      const updatedTemplate = await templateManager.getTemplate(templateData.id)
      props.selectedIterateTemplate = updatedTemplate
      emit('select', updatedTemplate, currentType.value)
    }
    
    toast.success(editingTemplate.value ? '提示词已更新' : '提示词已添加')
    cancelEdit()
  } catch (error) {
    console.error('保存提示词失败:', error)
    toast.error(`保存提示词失败: ${error.message}`)
  }
}

// 确认删除
const confirmDelete = async (templateId) => {
  if (confirm('确定要删除这个提示词吗？此操作不可恢复。')) {
    try {
      await templateManager.deleteTemplate(templateId)
      await loadTemplates()
      toast.success('提示词已删除')
    } catch (error) {
      console.error('删除提示词失败:', error)
      toast.error(`删除提示词失败: ${error.message}`)
    }
  }
}

// 导出提示词
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
    toast.success('提示词已导出')
  } catch (error) {
    console.error('导出提示词失败:', error)
    toast.error(`导出提示词失败: ${error.message}`)
  }
}

// 导入提示词
const handleFileImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        await templateManager.importTemplate(e.target.result)
        await loadTemplates()
        toast.success('提示词已导入')
        event.target.value = '' // 清空文件输入
      } catch (error) {
        console.error('导入提示词失败:', error)
        toast.error(`导入提示词失败: ${error.message}`)
      }
    }
    reader.readAsText(file)
  } catch (error) {
    console.error('读取文件失败:', error)
    toast.error('读取文件失败')
  }
}

// 复制内置提示词
const copyTemplate = (template) => {
  showAddForm.value = true
  form.value = {
    name: `${template.name} - 副本`,
    content: template.content,
    description: template.metadata.description || ''
  }
}

// 选择提示词
const selectTemplate = (template) => {
  if (currentType.value === 'optimize') {
    props.selectedOptimizeTemplate = template
  } else if (currentType.value === 'iterate') {
    props.selectedIterateTemplate = template
  }
  emit('select', template, currentType.value)
}

// 按类型过滤提示词
const filteredTemplates = computed(() => 
  templates.value.filter(t => t.metadata.templateType === currentType.value)
)

// 生命周期钩子
onMounted(() => {
  loadTemplates()
})
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

/* 保持原有的滚动条样式 */
.scroll-container {
  max-height: 60vh;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
}

.scroll-container::-webkit-scrollbar {
  width: 6px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(139, 92, 246, 0.5);
}
</style> 