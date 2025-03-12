<!-- 语言切换组件 -->
<template>
  <button
    @click="toggleLanguage"
    class="theme-icon-button ml-auto"
    :aria-label="locale === 'zh-CN' ? '切换到英文' : '切换到中文'"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const i18n = useI18n()
const locale = i18n.locale

/**
 * 切换语言并保存用户偏好
 */
const toggleLanguage = () => {
  const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  locale.value = newLocale
  localStorage.setItem('preferred-language', newLocale)
}
</script> 