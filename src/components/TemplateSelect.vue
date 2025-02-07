<template>
  <div class="relative">
    <button
      @click.stop="isOpen = !isOpen"
      class="w-full px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 
             border border-purple-600/30 hover:border-purple-600/50
             transition-all duration-200 group"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-white/60">当前模板:</span>
          <span v-if="modelValue" class="text-purple-300 group-hover:text-purple-200">
            {{ modelValue.name }}
          </span>
          <span v-else class="text-red-300">
            未选择模板
          </span>
        </div>
        <span class="text-purple-300 group-hover:text-purple-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
    </button>

    <div v-if="isOpen" 
         class="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-purple-600/30 shadow-xl"
         @click.stop
         v-click-outside="() => isOpen = false"
    >
      <div class="p-2 max-h-64 overflow-y-auto">
        <div v-for="template in templates" 
             :key="template.id"
             @click="selectTemplate(template)"
             class="px-3 py-2 rounded-lg cursor-pointer transition-colors group"
             :class="[
               modelValue?.id === template.id
                 ? 'bg-purple-600/30 text-purple-200'
                 : 'hover:bg-gray-700/50 text-gray-300'
             ]"
        >
          <div class="flex items-center justify-between">
            <span>{{ template.name }}</span>
            <span v-if="template.isBuiltin" 
                  class="text-xs px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">
              内置
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-1 truncate">
            {{ template.metadata.description || '暂无描述' }}
          </p>
        </div>
      </div>
      <div class="p-2 border-t border-purple-600/20">
        <button
          @click="$emit('manage')"
          class="w-full px-3 py-2 text-sm rounded-lg bg-purple-600/20 text-purple-300 
                 hover:bg-purple-600/30 transition-colors flex items-center justify-center space-x-1"
        >
          <span>📝</span>
          <span>管理模板</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { templateManager } from '../services/template/manager'
import { clickOutside } from '../directives/clickOutside'

const props = defineProps({
  modelValue: Object,
  type: {
    type: String,
    required: true,
    validator: (value) => ['optimize', 'iterate'].includes(value)
  }
})

const vClickOutside = clickOutside
const emit = defineEmits(['update:modelValue', 'manage'])

const isOpen = ref(false)

const templates = computed(() => 
  templateManager.listTemplatesByType(props.type)
)

const selectTemplate = (template) => {
  emit('update:modelValue', template)
  isOpen.value = false
}
</script> 