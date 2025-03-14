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
          <h2 class="text-xl font-semibold theme-manager-text">{{ t('templateManager.title') }}</h2>
          <div class="flex items-center space-x-4">
            <span v-if="selectedTemplate" class="text-sm theme-manager-text-secondary">
              {{ t('common.currentTemplate') }}: {{ selectedTemplate.name }}
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
              <span>{{ t(`templateManager.${type}Templates`) }}</span>
            </div>
          </button>
        </div>

        <!-- 提示词列表 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold flex items-center space-x-2">
              <span class="theme-manager-text">
                {{ t(`templateManager.${currentType}TemplateList`) }}
              </span>
              <span class="theme-manager-tag">
                {{ t('templateManager.templateCount', { count: filteredTemplates.length }) }}
              </span>
            </h3>
            <button
              @click="showAddForm = true"
              class="theme-manager-button-secondary"
            >
              {{ t('templateManager.addTemplate') }}
            </button>
          </div>
          
          <!-- 提示词列表按类型过滤 -->
          <div class="space-y-4 max-h-[60vh] overflow-y-auto p-2">
            <div 
              v-for="template in filteredTemplates"
              :key="template.id"
              class="theme-manager-card p-4 group relative transition-all duration-300 ease-in-out"
              :class="[
                (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                  ? template.metadata.templateType === 'optimize'
                    ? 'opacity-70 shadow-none hover:shadow-none scale-[0.99] transform'
                    : 'opacity-70 shadow-none hover:shadow-none scale-[0.99] transform'
                  : 'theme-manager-card'
              ]"
              @click="(currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) !== template.id && selectTemplate(template)"
            >
              <div class="flex items-start justify-between">
                <div>

                  <p class="text-sm theme-manager-text-secondary mt-1">
                    {{ template.metadata.description || t('common.noDescription') }}
                  </p>
                  <p class="text-xs theme-manager-text-disabled mt-2">
                    {{ t('common.lastModified') }}: {{ formatDate(template.metadata.lastModified) }}
                  </p>
                </div>
                <div class="flex items-center space-x-2" @click.stop>
                  <button
                    @click="selectTemplate(template)"
                    :class="[
                      'rounded-lg hidden text-sm',
                      (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id
                        ? 'theme-manager-button-primary'
                        : 'theme-manager-button-secondary'
                    ]"
                  >
                    {{ (currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id 
                      ? t('template.selected') 
                      : t('template.select') }}
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="editTemplate(template)"
                    class="text-sm theme-manager-button-secondary"
                  >
                    {{ t('common.edit') }}
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="viewTemplate(template)"
                    class="text-sm theme-manager-button-secondary"
                  >
                    {{ t('template.view') }}
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="copyTemplate(template)"
                    class="text-sm theme-manager-button-secondary"
                  >
                    {{ t('templateManager.copyTemplate') }}
                  </button>
                  <button
                    @click="exportTemplate(template.id)"
                    class="text-sm theme-manager-button-secondary inline-flex items-center justify-center gap-1"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                    {{ t('templateManager.exportTemplate') }}
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="confirmDelete(template.id)"
                    class="text-sm theme-manager-button-danger"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>
              <div 
                class="absolute top-0 left-0 w-2 h-full rounded-l-xl"
                :class="template.metadata.templateType === 'optimize' ? 'theme-manager-card-optimize' : 'theme-manager-card-iterate'"
              ></div>
              <div class="mt-2">
                <span 
                  class="theme-manager-tag ml-1 min-w-[48px]"
                >
                  {{ template.isBuiltin ? t('common.builtin') : t('common.custom') }}
                </span>
                <transition name="fade">
                    <span
                    v-if="(currentType === 'optimize' ? selectedOptimizeTemplate?.id : selectedIterateTemplate?.id) === template.id"
                    class="capitalize ml-2 theme-manager-tag transition-opacity duration-300 ease-in-out"
                  >{{ t('template.selected') }}</span>
                </transition>
              </div>
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
                    {{ viewingTemplate 
                      ? t('template.view')
                      : (editingTemplate ? t('template.edit') : t('template.add')) }}
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
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('template.name') }}</label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      :readonly="viewingTemplate"
                      class="theme-manager-input"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      :placeholder="t('template.namePlaceholder')"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('template.content') }}</label>
                    <textarea
                      v-model="form.content"
                      required
                      :readonly="viewingTemplate"
                      rows="8"
                      class="theme-manager-input resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      :placeholder="t('template.contentPlaceholder')"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium theme-manager-text mb-1.5">{{ t('common.description') }}</label>
                    <textarea
                      v-model="form.description"
                      :readonly="viewingTemplate"
                      rows="3"
                      class="theme-manager-input resize-none"
                      :class="{ 'opacity-75 cursor-not-allowed': viewingTemplate }"
                      :placeholder="t('template.descriptionPlaceholder')"
                    ></textarea>
                  </div>

                  <div class="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      @click="cancelEdit"
                      class="theme-manager-button-secondary"
                    >
                      {{ viewingTemplate ? t('common.close') : t('common.cancel') }}
                    </button>
                    <button
                      v-if="!viewingTemplate"
                      type="submit"
                      class="theme-manager-button-primary"
                    >
                      {{ editingTemplate ? t('template.save') : t('template.add') }}
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
            <h3 class="text-lg font-semibold theme-manager-text">{{ t('template.import.title') }}</h3>
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
              {{ t('common.selectFile') }}
            </button>
            <span class="text-sm theme-manager-text-secondary">{{ t('template.import.supportFormat') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { templateManager } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'

const { t } = useI18n()

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
  if (!timestamp) return t('template.unknownTime')
  return new Date(timestamp).toLocaleString()
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

    templateManager.saveTemplate(templateData)
    loadTemplates()
    
    const isCurrentSelected = (currentType.value === 'optimize' && props.selectedOptimizeTemplate?.id === templateData.id) ||
                            (currentType.value === 'iterate' && props.selectedIterateTemplate?.id === templateData.id)
    
    if (editingTemplate.value && isCurrentSelected) {
      const updatedTemplate = templateManager.getTemplate(templateData.id)
      if (updatedTemplate) {
        emit('select', updatedTemplate, currentType.value)
      }
    }
    
    toast.success(editingTemplate.value ? t('template.success.updated') : t('template.success.added'))
    cancelEdit()
  } catch (error) {
    console.error('保存提示词失败:', error)
    toast.error(t('template.error.saveFailed'))
  }
}

// 确认删除
const confirmDelete = (templateId) => {
  if (confirm(t('template.deleteConfirm'))) {
    try {
      templateManager.deleteTemplate(templateId)
      const remainingTemplates = templateManager.listTemplatesByType(currentType.value)
      loadTemplates()
      
      if (currentType.value === 'optimize' && props.selectedOptimizeTemplate?.id === templateId) {
        emit('select', remainingTemplates[0] || null, 'optimize')
      } else if (currentType.value === 'iterate' && props.selectedIterateTemplate?.id === templateId) {
        emit('select', remainingTemplates[0] || null, 'iterate')
      }
      
      toast.success(t('template.success.deleted'))
    } catch (error) {
      console.error('删除提示词失败:', error)
      toast.error(t('template.error.deleteFailed'))
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
    toast.success(t('template.success.exported'))
  } catch (error) {
    console.error('导出提示词失败:', error)
    toast.error(t('template.error.exportFailed'))
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
        toast.success(t('template.success.imported'))
        event.target.value = ''
      } catch (error) {
        console.error('导入提示词失败:', error)
        toast.error(t('template.error.importFailed'))
      }
    }
    reader.readAsText(file)
  } catch (error) {
    console.error('读取文件失败:', error)
    toast.error(t('template.error.readFailed'))
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
/* 添加标签淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>