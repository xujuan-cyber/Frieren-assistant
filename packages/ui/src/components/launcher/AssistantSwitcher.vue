<!--
    头部「助手级」切换器

    形态取舍：使用下拉按钮而非分段控件（NRadioGroup）。
    原因：头部已有约 1142px 的最小内容宽度基线（见 MainLayout.vue 的响应式注释），
    再加一个中文标签分段控件会把基线推高约 160px，显著加重窄屏压力；
    下拉按钮只占一个按钮位，窄屏隐藏文字后仅约 36px。
-->
<template>
  <NDropdown
    trigger="click"
    :options="options"
    :value="activeKey"
    placement="bottom-start"
    @select="handleSelect"
  >
    <NButton
      quaternary
      size="small"
      class="assistant-switcher"
      :title="t('assistant.switcher.label')"
      :aria-label="t('assistant.switcher.label')"
      data-testid="assistant-switcher"
    >
      <template #icon>
        <NIcon :size="16">
          <component :is="activeIcon" />
        </NIcon>
      </template>
      <span class="assistant-switcher__label">{{ activeLabel }}</span>
      <NIcon :size="14" class="assistant-switcher__caret">
        <ChevronDown />
      </NIcon>
    </NButton>
  </NDropdown>
</template>

<script setup lang="ts">
import { computed, h, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { NButton, NDropdown, NIcon } from 'naive-ui'
import { ChevronDown, Language, Wand } from '@vicons/tabler'

import { useGlobalSettings } from '../../stores/settings/useGlobalSettings'
import {
  DEFAULT_WORKSPACE_PATH,
  TRANSLATE_PATH,
  getInitialRouteFromGlobalSettings,
} from '../../router/workspaceRoutes'

type AssistantKey = 'prompt' | 'translate'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const globalSettings = useGlobalSettings()

/**
 * 当前助手由路由推导，不额外持久化状态。
 * 这样深链接（如直接访问 #/translate）与切换器显示始终一致。
 */
const activeKey = computed<AssistantKey>(() =>
  route.path.startsWith(TRANSLATE_PATH) ? 'translate' : 'prompt',
)

const activeIcon = computed<Component>(() =>
  activeKey.value === 'translate' ? Language : Wand,
)

const activeLabel = computed(() =>
  activeKey.value === 'translate'
    ? t('assistant.switcher.translate')
    : t('assistant.switcher.prompt'),
)

const renderIcon = (icon: Component) => () =>
  h(NIcon, { size: 16 }, { default: () => h(icon) })

const options = computed(() => [
  {
    label: t('assistant.switcher.prompt'),
    key: 'prompt',
    icon: renderIcon(Wand),
  },
  {
    label: t('assistant.switcher.translate'),
    key: 'translate',
    icon: renderIcon(Language),
  },
])

const handleSelect = (key: string) => {
  if (key === activeKey.value) return

  if (key === 'translate') {
    void router.push(TRANSLATE_PATH)
    return
  }

  // 回到提示词助手：沿用「上次使用的工作区」，与选择页的进入逻辑保持一致
  const target = getInitialRouteFromGlobalSettings(globalSettings) || DEFAULT_WORKSPACE_PATH
  void router.push(target)
}
</script>

<style scoped>
.assistant-switcher__label {
  margin-right: 2px;
}

.assistant-switcher__caret {
  opacity: 0.6;
  flex-shrink: 0;
}

/* 窄屏下隐藏文字，只留图标 + 箭头，避免与功能模式选择器争抢头部宽度 */
@media (max-width: 1139px) {
  .assistant-switcher__label {
    display: none;
  }
}
</style>
