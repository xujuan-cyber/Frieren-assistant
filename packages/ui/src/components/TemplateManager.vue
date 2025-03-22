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
            <h3 class="text-lg font-semibold flex items-center gap-2 min-w-0 overflow-hidden">
              <span class="theme-manager-text truncate">
                {{ t(`templateManager.${currentType}TemplateList`) }}
              </span>
              <span class="theme-manager-tag whitespace-nowrap flex-shrink-0 mr-2">
                {{ t('templateManager.templateCount', { count: filteredTemplates.length }) }}
              </span>
            </h3>
            <button
              @click="showAddForm = true"
              class="flex text-sm items-center gap-1 flex-shrink-0 theme-manager-button-secondary"
            >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
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
                    class="text-sm inline-flex items-center gap-1 theme-manager-button-secondary"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  <span class="hidden md:inline">{{ t('common.edit') }}</span>
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="viewTemplate(template)"
                    class="text-sm inline-flex items-center gap-1 theme-manager-button-secondary "
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span class="hidden md:inline">{{ t('template.view') }}</span>
                  </button>
                  <button
                    v-if="template.isBuiltin"
                    @click="copyTemplate(template)"
                    class="text-sm inline-flex items-center gap-1 theme-manager-button-secondary"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
                  </svg>
                  <span class="hidden md:inline">{{ t('templateManager.copyTemplate') }}</span>
                  </button>
                  <button
                    @click="exportTemplate(template.id)"
                    class="text-sm inline-flex items-center gap-1 theme-manager-button-secondary hidden"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span class="hidden md:inline">{{ t('templateManager.exportTemplate') }}</span>
                  </button>
                  <button
                    v-if="!template.isBuiltin"
                    @click="confirmDelete(template.id)"
                    class="text-sm inline-flex items-center gap-1 theme-manager-button-danger"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  <span class="hidden md:inline">{{ t('common.delete') }}</span>
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
               @click="viewingTemplate ? cancelEdit() : null">
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
        <div class="theme-manager-divider pt-2 hidden">
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
              class="text-sm inline-flex gap-1 theme-manager-button-secondary"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4 my-[2px]">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
            </svg>
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