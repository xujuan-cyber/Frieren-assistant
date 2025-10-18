<template>
  <NCard
    class="favorite-card"
    hoverable
    :class="{ 'is-selected': isSelected }"
    :content-style="{ padding: '12px' }"
    :header-style="{ padding: '12px' }"
    :footer-style="{ padding: '12px' }"
    @click="$emit('select', favorite)"
  >
    <!-- 卡片头部 -->
    <template #header>
      <NSpace align="center" justify="space-between" :wrap="false" :size="8">
        <NEllipsis style="flex: 1; min-width: 0; font-weight: 600; font-size: 14px;">
          {{ favorite.title }}
        </NEllipsis>
        <NTag
          v-if="category"
          :color="{ color: category.color, textColor: 'white' }"
          size="small"
          style="flex-shrink: 0;"
        >
          {{ category.name }}
        </NTag>
      </NSpace>
    </template>

    <!-- 卡片内容 -->
    <NSpace vertical :size="6" class="card-body">
      <NEllipsis
        :line-clamp="3"
        :tooltip="{ width: 400, placement: 'top' }"
      >
        <NText style="font-size: 13px; line-height: 1.5;">{{ favorite.content }}</NText>
      </NEllipsis>

      <NEllipsis v-if="favorite.description" :line-clamp="1" :tooltip="false">
        <NText depth="3" style="font-size: 12px; line-height: 1.4;">
          {{ favorite.description }}
        </NText>
      </NEllipsis>

      <!-- 标签 -->
      <NSpace v-if="favorite.tags.length > 0" :size="4" :wrap="false" class="card-tags">
        <NTag
          v-for="tag in favorite.tags.slice(0, 3)"
          :key="tag"
          size="small"
          type="info"
        >
          {{ tag }}
        </NTag>
        <NTag
          v-if="favorite.tags.length > 3"
          size="small"
          type="default"
        >
          +{{ favorite.tags.length - 3 }}
        </NTag>
      </NSpace>
    </NSpace>

    <!-- 卡片底部 -->
    <template #footer>
      <NSpace justify="space-between" align="center" :wrap="false">
        <NSpace :size="8" align="center" :wrap="false">
          <NText depth="3" style="font-size: 12px; white-space: nowrap;">
            {{ formatDate(favorite.updatedAt) }}
          </NText>
          <NTooltip trigger="hover">
            <template #trigger>
              <NSpace :size="2" align="center" style="cursor: help;">
                <NIcon size="14" depth="3"><Eye /></NIcon>
                <NText depth="3" style="font-size: 12px;">
                  {{ favorite.useCount }}
                </NText>
              </NSpace>
            </template>
            使用次数
          </NTooltip>
        </NSpace>

        <!-- 操作按钮 -->
        <NSpace :size="4" class="card-actions">
          <NTooltip trigger="hover">
            <template #trigger>
              <NButton
                size="small"
                quaternary
                circle
                @click.stop="$emit('copy', favorite)"
              >
                <template #icon>
                  <NIcon><Copy /></NIcon>
                </template>
              </NButton>
            </template>
            复制内容
          </NTooltip>

          <NTooltip trigger="hover">
            <template #trigger>
              <NButton
                size="small"
                quaternary
                circle
                @click.stop="$emit('use', favorite)"
              >
                <template #icon>
                  <NIcon><PlayerPlay /></NIcon>
                </template>
              </NButton>
            </template>
            立即使用
          </NTooltip>

          <NTooltip trigger="hover">
            <template #trigger>
              <NButton
                size="small"
                quaternary
                circle
                @click.stop="$emit('edit', favorite)"
              >
                <template #icon>
                  <NIcon><Edit /></NIcon>
                </template>
              </NButton>
            </template>
            编辑
          </NTooltip>

          <NPopconfirm
            @positive-click="$emit('delete', favorite)"
            positive-text="删除"
            negative-text="取消"
          >
            <template #trigger>
              <NButton
                size="small"
                quaternary
                circle
                type="error"
                @click.stop
              >
                <template #icon>
                  <NIcon><Trash /></NIcon>
                </template>
              </NButton>
            </template>
            确定删除"{{ favorite.title }}"吗？
          </NPopconfirm>
        </NSpace>
      </NSpace>
    </template>

    <!-- 公开标识 -->
    <div v-if="favorite.isPublic" class="public-badge">
      <NIcon color="#f39c12" size="16"><Star /></NIcon>
    </div>
  </NCard>
</template>

<script setup lang="ts">
import {
  NCard,
  NEllipsis,
  NTag,
  NText,
  NIcon,
  NButton,
  NSpace,
  NTooltip,
  NPopconfirm
} from 'naive-ui';
import {
  Copy,
  PlayerPlay,
  Eye,
  Star,
  Edit,
  Trash
} from '@vicons/tabler';
import type { FavoritePrompt, FavoriteCategory } from '@prompt-optimizer/core';

interface Props {
  favorite: FavoritePrompt;
  category?: FavoriteCategory;
  isSelected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
});

const emit = defineEmits<{
  'select': [favorite: FavoritePrompt];
  'edit': [favorite: FavoritePrompt];
  'copy': [favorite: FavoritePrompt];
  'delete': [favorite: FavoritePrompt];
  'use': [favorite: FavoritePrompt];
}>();

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString();
  }
};
</script>

<style scoped>
.favorite-card {
  @apply relative cursor-pointer transition-all duration-200;
  @apply border border-gray-200 dark:border-gray-700;
  height: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出卡片 */
}

.favorite-card:hover {
  @apply shadow-lg;
  transform: translateY(-2px);
}

.favorite-card.is-selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.card-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  flex-wrap: nowrap;
  overflow: hidden;
}

/* 操作按钮默认隐藏 */
.card-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.favorite-card:hover .card-actions {
  opacity: 1;
}

/* 公开标识 */
.public-badge {
  @apply absolute;
  top: 12px;
  right: 12px;
  @apply bg-yellow-100 dark:bg-yellow-900/50 rounded-full;
  padding: 4px;
  backdrop-filter: blur(4px);
  z-index: 10;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .favorite-card {
    height: auto;
    min-height: 240px;
  }

  .card-actions {
    opacity: 1;
  }
}
</style>
