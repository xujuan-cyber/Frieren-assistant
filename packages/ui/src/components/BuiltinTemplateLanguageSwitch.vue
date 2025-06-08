<template>
  <div class="flex items-center">
    <button
      @click="handleLanguageToggle"
      :disabled="isChanging"
      :title="t('template.switchBuiltinLanguage')"
      class="theme-language-button"
    >
      <span class="flex items-center gap-1">
        <svg
          class="w-3 h-3 theme-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span class="font-medium">{{ getCurrentLanguageShort }}</span>
        <div v-if="isChanging" class="w-3 h-3 animate-spin">
          <svg class="w-full h-full" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'
import { templateManager, templateLanguageService } from '@prompt-optimizer/core'
import type { BuiltinTemplateLanguage } from '@prompt-optimizer/core'

const { t } = useI18n()
const toast = useToast()

// Reactive state
const currentLanguage = ref<BuiltinTemplateLanguage>('zh-CN')
const supportedLanguages = ref<BuiltinTemplateLanguage[]>([])
const isChanging = ref(false)

// Computed properties
const getCurrentLanguageShort = computed(() => {
  try {
    return templateLanguageService.getLanguageDisplayName(currentLanguage.value)
  } catch (error) {
    console.error('Error getting current language short:', error)
    return '中文' // fallback to Chinese
  }
})



// Event emitters
const emit = defineEmits<{
  languageChanged: [language: BuiltinTemplateLanguage]
}>()

/**
 * Initialize component
 */
onMounted(async () => {
  try {
    // Ensure template language service is initialized
    if (!templateLanguageService.isInitialized()) {
      await templateLanguageService.initialize()
    }

    // Get current language and supported languages
    currentLanguage.value = templateLanguageService.getCurrentLanguage()
    supportedLanguages.value = templateLanguageService.getSupportedLanguages()
  } catch (error) {
    console.error('Failed to initialize builtin template language switch:', error)
    // Set fallback values
    currentLanguage.value = 'zh-CN'
    supportedLanguages.value = ['zh-CN', 'en-US']

    // Only show toast error if toast is available
    try {
      toast.error(t('template.languageInitError'))
    } catch (toastError) {
      console.error('Failed to show toast error:', toastError)
    }
  }
})

/**
 * Handle language toggle
 */
const handleLanguageToggle = async () => {
  if (isChanging.value) return

  const oldLanguage = currentLanguage.value
  const newLanguage = oldLanguage === 'zh-CN' ? 'en-US' : 'zh-CN'

  try {
    isChanging.value = true

    // Change the built-in template language
    await templateManager.changeBuiltinTemplateLanguage(newLanguage)

    // Update local state
    currentLanguage.value = newLanguage

    // Emit event to notify parent components
    emit('languageChanged', newLanguage)

    // Show success message
    try {
      const languageName = templateLanguageService.getLanguageDisplayName(newLanguage)
      toast.success(t('template.languageChanged', { language: languageName }))
    } catch (toastError) {
      console.error('Failed to show success toast:', toastError)
    }

  } catch (error) {
    console.error('Failed to toggle builtin template language:', error)

    // Revert to old language on error
    currentLanguage.value = oldLanguage

    // Show error message
    try {
      toast.error(t('template.languageChangeError'))
    } catch (toastError) {
      console.error('Failed to show error toast:', toastError)
    }
  } finally {
    isChanging.value = false
  }
}

/**
 * Refresh current language (useful for external updates)
 */
const refresh = () => {
  currentLanguage.value = templateLanguageService.getCurrentLanguage()
}

// Expose methods for parent components
defineExpose({
  refresh
})
</script>

<style scoped>
.theme-language-button {
  @apply inline-flex items-center px-2 py-1 text-xs rounded-md border transition-all duration-200;
  @apply bg-white border-gray-300 text-gray-700 hover:bg-gray-50;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  @apply disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white;
}

.theme-icon {
  @apply text-gray-500;
}

/* Theme variants */
:root.dark .theme-language-button {
  @apply bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700;
  @apply focus:ring-blue-400 focus:border-blue-400;
  @apply disabled:hover:bg-slate-800;
}

:root.dark .theme-icon {
  @apply text-slate-400;
}

:root.theme-blue .theme-language-button {
  @apply bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100;
  @apply focus:ring-sky-500 focus:border-sky-500;
  @apply disabled:hover:bg-sky-50;
}

:root.theme-blue .theme-icon {
  @apply text-sky-600;
}

:root.theme-green .theme-language-button {
  @apply bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100;
  @apply focus:ring-teal-500 focus:border-teal-500;
  @apply disabled:hover:bg-teal-50;
}

:root.theme-green .theme-icon {
  @apply text-teal-600;
}

:root.theme-purple .theme-language-button {
  @apply bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100;
  @apply focus:ring-purple-500 focus:border-purple-500;
  @apply disabled:hover:bg-purple-50;
}

:root.theme-purple .theme-icon {
  @apply text-purple-600;
}
</style>
