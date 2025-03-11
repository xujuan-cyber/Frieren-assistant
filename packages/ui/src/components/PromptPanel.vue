<template>
  <div class="flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 flex-none">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold theme-text">优化后的提示词</h3>
        <div v-if="versions && versions.length > 0" class="flex items-center gap-1">
          <button
            v-for="version in versions.slice().reverse()"
            :key="version.id"
            @click="switchVersion(version)"
            class="px-2 py-1 text-xs rounded transition-colors"
            :class="[
              currentVersionId === version.id
                ? 'font-medium theme-prompt-version-selected'
                : 'theme-prompt-version-unselected'
            ]"
          >
            V{{ version.version }}
          </button>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button
          v-if="optimizedPrompt"
          @click="handleIterate"
          class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
          :disabled="isIterating"
        >
          <span>{{ isIterating ? '优化中...' : '继续优化' }}</span>
        </button>
        <button
          v-if="optimizedPrompt"
          @click="copyPrompt"
          class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
        >
          <span>复制</span>
        </button>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="flex-1 min-h-0 p-[2px] overflow-hidden">
      <div class="h-full relative">
        <textarea
          ref="promptTextarea"
          :value="optimizedPrompt"
          @input="handleInput"
          class="w-full h-full px-4 py-3 theme-input resize-none"
          placeholder="优化后的提示词将显示在这里..."
        ></textarea>
      </div>
    </div>

    <!-- 迭代优化弹窗 -->
    <Modal
      v-model="showIterateInput"
      @confirm="submitIterate"
    >
      <template #title>
        {{ templateTitleText }}
      </template>
      
      <div class="space-y-4">
        <div>
          <h4 class="theme-label mb-2">{{ templateSelectText }}</h4>
          <TemplateSelect
            :modelValue="selectedIterateTemplate"
            @update:modelValue="$emit('update:selectedIterateTemplate', $event)"
            :type="templateType"
            @manage="$emit('openTemplateManager', templateType)"
          />
        </div>
        
        <div>
          <h4 class="theme-label mb-2">请输入需要优化的方向：</h4>
          <textarea
            v-model="iterateInput"
            class="w-full theme-input resize-none"
            placeholder="例如：使提示词更简洁、增加特定功能描述等..."
            rows="3"
          ></textarea>
        </div>
      </div>
      
      <template #footer>
        <button
          @click="cancelIterate"
          class="theme-button-secondary"
        >
          取消
        </button>
        <button
          @click="submitIterate"
          class="theme-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!iterateInput.trim() || isIterating"
        >
          {{ isIterating ? '优化中...' : '确认优化' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch, nextTick } from 'vue'
import { useToast } from '../composables/useToast'
import TemplateSelect from './TemplateSelect.vue'
import Modal from './Modal.vue'

const toast = useToast()
const promptTextarea = ref(null)

const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  },
  isIterating: {
    type: Boolean,
    default: false
  },
  selectedIterateTemplate: {
    type: Object,
    default: null
  },
  versions: {
    type: Array,
    default: () => []
  },
  currentVersionId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'update:optimizedPrompt',
  'iterate',
  'openTemplateManager',
  'update:selectedIterateTemplate',
  'switchVersion'
])

const showIterateInput = ref(false)
const iterateInput = ref('')
const templateType = ref('iterate')

// 计算标题文本
const templateTitleText = computed(() => {
  return '迭代功能提示词'
})

// 计算模板选择标题
const templateSelectText = computed(() => {
  return '请选择迭代提示词：'
})

// 监听optimizedPrompt变化，自动滚动到底部
watch(() => props.optimizedPrompt, (newValue) => {
  if (newValue && promptTextarea.value) {
    nextTick(() => {
      const textarea = promptTextarea.value;
      textarea.scrollTop = textarea.scrollHeight;
    });
  }
}, { immediate: true });

// 处理输入变化
const handleInput = (event) => {
  const newValue = event.target.value
  emit('update:optimizedPrompt', newValue)
}

const copyPrompt = async () => {
  if (!props.optimizedPrompt) return
  
  try {
    await navigator.clipboard.writeText(props.optimizedPrompt)
    toast.success('复制成功')
  } catch (e) {
    console.error('复制失败:', e)
    toast.error('复制失败')
  }
}

const handleIterate = () => {
  if (!props.selectedIterateTemplate) {
    toast.error('请先选择迭代提示词')
    return
  }
  showIterateInput.value = true
}

const cancelIterate = () => {
  showIterateInput.value = false
  iterateInput.value = ''
}

const submitIterate = () => {
  if (!iterateInput.value.trim()) return
  if (!props.selectedIterateTemplate) {
    toast.error('请先选择迭代提示词')
    return
  }
  
  emit('iterate', {
    originalPrompt: props.optimizedPrompt,
    iterateInput: iterateInput.value.trim()
  })
  
  // 重置输入
  iterateInput.value = ''
  showIterateInput.value = false
}

// 添加版本切换函数
const switchVersion = (version) => {
  if (version.id === props.currentVersionId) return
  emit('switchVersion', version)
}
</script>

<style scoped>
textarea {
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

textarea::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>