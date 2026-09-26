<!--
    助手选择页（启动落地页）

    渲染位置说明：本组件不在 MainLayout 之内渲染，而是由 PromptOptimizerApp
    在「裸布局分支」直接渲染 —— 因为 MainLayout 的头部导航无条件渲染、无开关，
    套在里面无法得到干净的全屏启动页。

    为什么每次启动都出现：这是产品决策。为保证「选择页 → 某助手 → 再切回来」
    的路径畅通，头部另设了常驻的助手切换器（AssistantSwitcher），二者职责不重叠。
-->
<template>
  <div class="launcher" data-testid="assistant-launcher" :style="themeStyle">
    <div class="launcher__inner">
      <header class="launcher__header">
        <img class="launcher__logo" :src="logoImage" alt="" />
        <h1 class="launcher__title">{{ t('assistant.launcher.title') }}</h1>
        <p class="launcher__subtitle">{{ t('assistant.launcher.subtitle') }}</p>
      </header>

      <div class="launcher__cards">
        <button
          v-for="card in cards"
          :key="card.key"
          type="button"
          class="launcher-card"
          :data-testid="`launcher-card-${card.key}`"
          @click="card.enter()"
        >
          <span class="launcher-card__icon">
            <NIcon :size="26">
              <component :is="card.icon" />
            </NIcon>
          </span>
          <span class="launcher-card__title">{{ card.title }}</span>
          <span class="launcher-card__desc">{{ card.description }}</span>
          <span class="launcher-card__action">
            {{ card.action }}
            <NIcon :size="14"><ArrowRight /></NIcon>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { NIcon, useThemeVars } from 'naive-ui'
import { ArrowRight, Language, Wand } from '@vicons/tabler'

import logoImage from '../../assets/logo.png'
import { useGlobalSettings } from '../../stores/settings/useGlobalSettings'
import {
  DEFAULT_WORKSPACE_PATH,
  TRANSLATE_PATH,
  getInitialRouteFromGlobalSettings,
} from '../../router/workspaceRoutes'

const { t } = useI18n()
const router = useRouter()
const globalSettings = useGlobalSettings()

/**
 * 本组件渲染在 MainLayout 之外，而 naive-ui 的主题变量（--n-*）作用域仅限其组件自身，
 * 自定义元素上取不到 —— 实测在根元素上 getPropertyValue('--n-border-color') 返回空串，
 * 使 `border: 1px solid var(--ui-border-color)` 整条声明被丢弃（表现为卡片无边框、背景透明）。
 * 这里用官方的 useThemeVars 把所需令牌映射为局部 CSS 变量，保证浅色 / 深色主题配色均正确。
 */
const themeVars = useThemeVars()
const themeStyle = computed(() => ({
  '--ui-color': themeVars.value.bodyColor,
  '--ui-card-color': themeVars.value.cardColor,
  '--ui-border-color': themeVars.value.borderColor,
  '--ui-text-color': themeVars.value.textColor1,
  '--ui-text-color-3': themeVars.value.textColor3,
  '--ui-primary-color': themeVars.value.primaryColor,
}))

/**
 * 进入提示词助手：沿用「上次使用的工作区」。
 * 直接复用启动路由原有的决策函数，保证与改造前的行为一致 ——
 * 首装无记录时落到 /basic/system，用过的用户回到上次的模式与子模式。
 */
const enterPromptAssistant = () => {
  const target = getInitialRouteFromGlobalSettings(globalSettings) || DEFAULT_WORKSPACE_PATH
  void router.push(target)
}

const enterTranslateAssistant = () => {
  void router.push(TRANSLATE_PATH)
}

const cards = computed(() => [
  {
    key: 'prompt',
    icon: Wand,
    title: t('assistant.launcher.promptTitle'),
    description: t('assistant.launcher.promptDescription'),
    action: t('assistant.launcher.promptAction'),
    enter: enterPromptAssistant,
  },
  {
    key: 'translate',
    icon: Language,
    title: t('assistant.launcher.translateTitle'),
    description: t('assistant.launcher.translateDescription'),
    action: t('assistant.launcher.translateAction'),
    enter: enterTranslateAssistant,
  },
])
</script>

<style scoped>
.launcher {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px clamp(16px, 4vw, 48px);
  background: var(--ui-color);
}

.launcher__inner {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.launcher__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.launcher__logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
}

.launcher__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ui-text-color);
}

.launcher__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-color-3);
}

.launcher__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

/* 用原生 button 而非 NButton：整卡可点、键盘可聚焦，且避免与按钮组件的内边距体系冲突 */
.launcher-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 24px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--ui-border-color);
  border-radius: 14px;
  background: var(--ui-card-color);
  color: inherit;
  font: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.launcher-card:hover {
  border-color: var(--ui-primary-color);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ui-primary-color) 12%, transparent);
  transform: translateY(-2px);
}

.launcher-card:focus-visible {
  outline: none;
  border-color: var(--ui-primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-primary-color) 24%, transparent);
}

.launcher-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: var(--ui-primary-color);
  background: color-mix(in srgb, var(--ui-primary-color) 12%, transparent);
}

.launcher-card__title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}

.launcher-card__desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text-color-3);
}

.launcher-card__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-primary-color);
}

/* 窄容器（浏览器扩展 popup 约 400×600、窄窗口）下改为单列堆叠，保证两个入口一屏可见 */
@media (max-width: 767px) {
  .launcher {
    min-height: 100dvh;
    padding: 20px 16px;
  }

  .launcher__inner {
    gap: 20px;
  }

  .launcher__logo {
    width: 44px;
    height: 44px;
  }

  .launcher__title {
    font-size: 20px;
  }

  .launcher__cards {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .launcher-card {
    padding: 16px 18px;
    gap: 6px;
  }

  .launcher-card__icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }
}
</style>
