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
          <h2 class="text-xl font-semibold theme-manager-text">功能提示词管理</h2>
          <div class="flex items-center space-x-4">
            <span v-if="selectedTemplate" class="text-sm theme-manager-text-secondary">
              当前提示词: {{ selectedTemplate.name }}
            </span>
            <button
              @click="$emit('close')"
              class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 新增类型切换标签 -->
        <div class="flex space-x-4 mb-6 p-1 theme-manager-card">
          <button 
            v-for="type in ['optimize', 'iterate']" 
            :key="type"
            @click="currentType = type"
            :class="[
              'flex-1 font-medium transition-all duration-200',
              currentType === type 
                ? 'theme-manager-button-primary' 
                : 'theme-manager-button-secondary'
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
              <span class="theme-manager-text">
                {{ currentType === 'optimize' ? '优化提示词列表' : '迭代提示词列表' }}
              </span>
              <span class="theme-manager-tag">
                {{ filteredTemplates.length }}个提示词
              </span>
            </h3>
            <button
              @click="showAddForm = true"
              class="theme-manager-button-secondary"
            >
              添加提示词
            </button>
          </div>
          
          <!-- 提示词列表按类型过滤 -->
          <div class="space-y-4 max-h-[60vh] overflow-y-auto p-2">
            <div 
              v-for="template in filteredTemplates"
              :key="template.id"
              class="theme-manager-card p-4 group relative transition-all duration-200"
              :class="[
                (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                  ? template.metadata.templateType === 'optimize'
                    ? 'opacity-70 shadow-none hover:shadow-none scale-[0.99] transform'
                    : 'opacity-70 shadow-none hover:shadow-none scale-[0.99] transform'
                  : 'theme-manager-card'
              ]"
              @click="selectTemplate(template)"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="theme-manager-text flex items-center gap-2">
                    {{ template.name }}
                    <span v-if="template.isBuiltin" 
                          class="theme-manager-tag">
                      内置
                    </span>
                  </h4>
                  <p class="text-sm theme-manager-text-secondary mt-1">
                    {{ template.metadata.description || '暂无描述' }}
                  </p>
                  <p class="text-xs theme-manager-text-disabled mt-2">
                    最后修改: {{ formatDate(template.metadata.lastModified) }}
                  </p>
                </div>
                <div class="flex items-center space-x-2" @click.stop>
                  <button
                    @click="selectTemplate(template)"
                    :class="[
                      'rounded-lg',
                      (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                        ? 'theme-manager-button-primary'
                        : 'theme-manager-button-secondary'
                    ]"
                  >
                    {{ (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id ? '已选择' : '选择' }}
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="editTemplate(template)"
                    class="theme-manager-button-secondary"
                  >
                    编辑
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="viewTemplate(template)"
                    class="theme-manager-button-secondary"
                  >
                    查看
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="copyTemplate(template)"
                    class="theme-manager-button-secondary"
                  >
                    复制
                  </button>
                  <button
                    @click="exportTemplate(template.id)"
                    class="theme-manager-button-secondary inline-flex items-center justify-center gap-1"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  导出
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="confirmDelete(template.id)"
                    class="theme-manager-button-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div 
                class="absolute top-0 left-0 w-2 h-full rounded-l-xl"
                :class="template.metadata.templateType === 'optimize' ? 'theme-manager-card-optimize' : 'theme-manager-card-iterate'"
              ></div>
              <span 
                class="capitalize"
                :class="template.metadata.templateType === 'optimize' 
                  ? 'theme-manager-tag-optimize'
                  : 'theme-manager-tag-iterate'"
              >
                {{ template.metadata.templateType === 'optimize' ? '优化' : '迭代' }}
              </span>
              <span
                class="capitalize ml-1"
                :class="(currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                  ? template.metadata.templateType === 'optimize'
                    ? 'theme-manager-tag-optimize'
                    : 'theme-manager-tag-iterate'
                  : 'theme-manager-tag'"
              >
                {{ (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id ? '已选择' : '选择' }}
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
            
            <div class="relative theme-manager-container w-full max-w-2xl m-4 z-10"
                 @click.stop>
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold theme-manager-text">
                    {{ viewingTemplate ? '查看提示词' : (editingTemplate ? '编辑提示词' : '添加提示词') }}
                  </h3>
                  <button
                    @click="cancelEdit"
                    class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">提示词名称</label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      :readonly="viewingTemplate"
                      class="theme-manager-input"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词名称"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">提示词内容</label>
                    <textarea
                      v-model="form.content"
                      required
                      :readonly="viewingTemplate"
                      rows="8"
                      class="theme-manager-input resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词内容"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">描述</label>
                    <textarea
                      v-model="form.description"
                      :readonly="viewingTemplate"
                      rows="3"
                      class="theme-manager-input resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      placeholder="输入提示词描述（可选）"
                    ></textarea>
                  </div>

                  <div class="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      @click="cancelEdit"
                      class="theme-manager-button-secondary"
                    >
                      {{ viewingTemplate ? '关闭' : '取消' }}
                    </button>
                    <button
                      v-if="!viewingTemplate"
                      type="submit"
                      class="theme-manager-button-primary"
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
        <div class="theme-manager-divider pt-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold theme-manager-text">导入提示词</h3>
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
              class="theme-manager-button-secondary"
            >
              选择文件
            </button>
            <span class="text-sm theme-manager-text-secondary">支持 .json 格式的提示词文件</span>
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

// 添加计算属性
const selectedTemplate = computed(() => {
  return currentType.value === 'optimize'
    ? props.selectedOptimizeTemplate
    : props.selectedIterateTemplate
})

// 加载提示词列表
const loadTemplates = () => {
  try {
    const allTemplates = templateManager.listTemplates()
    templates.value = allTemplates
    console.log('加载到的提示词:', templates.value)
  } catch (error) {
    console.error('加载提示词失败:', error)
    toast.error('加载提示词失败')
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
const handleSubmit = () => {
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
        templateType: currentType.value
      }
    }

    // 先保存模板
    templateManager.saveTemplate(templateData)
    
    // 重新加载列表
    loadTemplates()
    
    // 如果编辑的是当前选中的提示词，只更新其内容
    const isCurrentSelected = (currentType.value === 'optimize' && props.selectedOptimizeTemplate?.id === templateData.id) ||
                            (currentType.value === 'iterate' && props.selectedIterateTemplate?.id === templateData.id)
    
    if (editingTemplate.value && isCurrentSelected) {
      const updatedTemplate = templateManager.getTemplate(templateData.id)
      if (updatedTemplate) {
        // 通知父组件更新模板内容，但保持选中状态
        emit('select', updatedTemplate, currentType.value)
      }
    }
    
    toast.success(editingTemplate.value ? '提示词已更新' : '提示词已添加')
    cancelEdit()
  } catch (error) {
    console.error('保存提示词失败:', error)
    toast.error(`保存提示词失败: ${error.message}`)
  }
}

// 确认删除
const confirmDelete = (templateId) => {
  if (confirm('确定要删除这个提示词吗？此操作不可恢复。')) {
    try {
      templateManager.deleteTemplate(templateId)
      
      // 获取删除后的模板列表
      const remainingTemplates = templateManager.listTemplatesByType(currentType.value)
      loadTemplates()
      
      // 如果删除的是当前选中的提示词，自动切换到第一个可用的模板
      if (currentType.value === 'optimize' && props.selectedOptimizeTemplate?.id === templateId) {
        emit('select', remainingTemplates[0] || null, 'optimize')
      } else if (currentType.value === 'iterate' && props.selectedIterateTemplate?.id === templateId) {
        emit('select', remainingTemplates[0] || null, 'iterate')
      }
      
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
const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        templateManager.importTemplate(e.target.result)
        loadTemplates()
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