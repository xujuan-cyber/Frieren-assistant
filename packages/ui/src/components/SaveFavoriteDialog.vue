<template>
  <n-modal
    :show="show"
    preset="card"
    title="保存到收藏夹"
    :style="{ width: 'min(90vw, 1200px)', height: 'min(85vh, 900px)' }"
    :mask-closable="false"
    @update:show="handleClose"
  >
    <n-scrollbar style="max-height: calc(85vh - 150px);">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- 基础信息面板 -->
        <n-card title="📋 基础信息" :bordered="false" :segmented="{ content: true }" size="small">
          <n-form label-placement="left" :label-width="80">
            <n-grid :cols="2" :x-gap="16">
              <!-- 左列 -->
              <n-grid-item>
                <n-form-item label="标题" required>
                  <n-input
                    v-model:value="formData.title"
                    placeholder="为这个提示词起个名字"
                    maxlength="100"
                    show-count
                  />
                </n-form-item>

                <n-form-item label="分类">
                  <n-select
                    v-model:value="formData.category"
                    :options="categoryOptions"
                    placeholder="选择分类(可选)"
                    clearable
                  />
                </n-form-item>

                <n-form-item label="功能模式" required>
                  <n-select
                    v-model:value="formData.functionMode"
                    :options="functionModeOptions"
                    :disabled="isFromOptimization"
                    @update:value="handleFunctionModeChange"
                  />
                </n-form-item>
              </n-grid-item>

              <!-- 右列 -->
              <n-grid-item>
                <n-form-item label="描述">
                  <n-input
                    v-model:value="formData.description"
                    type="textarea"
                    placeholder="描述这个提示词的用途和特点"
                    :rows="3"
                    maxlength="300"
                    show-count
                  />
                </n-form-item>

                <!-- 动态显示:优化模式或图像模式 -->
                <n-form-item
                  v-if="formData.functionMode === 'basic' || formData.functionMode === 'context'"
                  label="优化模式"
                >
                  <n-select
                    v-model:value="formData.optimizationMode"
                    :options="optimizationModeOptions"
                    placeholder="选择优化模式"
                    :disabled="isFromOptimization"
                  />
                </n-form-item>

                <n-form-item
                  v-if="formData.functionMode === 'image'"
                  label="图像模式"
                >
                  <n-select
                    v-model:value="formData.imageSubMode"
                    :options="imageSubModeOptions"
                    placeholder="选择图像模式"
                    :disabled="isFromOptimization"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <!-- 标签(跨越两列) -->
            <n-form-item label="标签">
              <n-dynamic-tags
                v-model:value="formData.tags"
                :max="10"
                placeholder="输入标签后按回车添加"
              />
            </n-form-item>
          </n-form>
        </n-card>

        <!-- 正文内容区域 -->
        <div>
          <n-divider style="margin: 0 0 12px 0;">
            <span style="font-weight: 600;">📝 正文内容</span>
            <span style="color: #ff4d4f; margin-left: 4px;">*</span>
          </n-divider>
          <OutputDisplayCore
            :content="formData.content"
            mode="editable"
            :enabled-actions="['copy', 'edit']"
            height="400px"
            placeholder="在这里输入提示词内容..."
            @update:content="formData.content = $event"
          />
        </div>
      </div>
    </n-scrollbar>

    <template #action>
      <n-space justify="end">
        <n-button @click="handleClose" :disabled="saving">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          保存
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, inject, type Ref } from 'vue';
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDynamicTags,
  NButton,
  NSpace,
  NScrollbar,
  NDivider,
  NGrid,
  NGridItem
} from 'naive-ui';
import { useToast } from '../composables/useToast';
import OutputDisplayCore from './OutputDisplayCore.vue';
import type { AppServices } from '../types/services';

interface Props {
  show: boolean
  content: string
  originalContent?: string
  currentFunctionMode: 'basic' | 'context' | 'image'
  currentOptimizationMode: 'system' | 'user'
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean]
  'saved': []
}>();

const services = inject<Ref<AppServices | null>>('services');
const message = useToast();

const saving = ref(false);
const categories = ref<Array<{ id: string; name: string }>>([]);

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  content: '',
  category: '',
  tags: [] as string[],
  functionMode: 'basic' as 'basic' | 'context' | 'image',
  optimizationMode: 'system' as 'system' | 'user' | undefined,
  imageSubMode: undefined as 'text2image' | 'image2image' | undefined
});

// 是否从优化器保存(功能模式字段只读)
const isFromOptimization = computed(() => !!props.originalContent);

// 选项配置
const functionModeOptions = [
  { label: '基础', value: 'basic' },
  { label: '上下文', value: 'context' },
  { label: '图像', value: 'image' }
];

const optimizationModeOptions = [
  { label: '系统提示词', value: 'system' },
  { label: '用户提示词', value: 'user' }
];

const imageSubModeOptions = [
  { label: '文生图', value: 'text2image' },
  { label: '图生图', value: 'image2image' }
];

const categoryOptions = computed(() => {
  return categories.value.map(cat => ({
    label: cat.name,
    value: cat.id
  }));
});

// 功能模式切换处理
const handleFunctionModeChange = (mode: 'basic' | 'context' | 'image') => {
  formData.functionMode = mode;

  if (mode === 'basic' || mode === 'context') {
    // 切换到 basic/context,设置默认优化模式,清空图像子模式
    formData.optimizationMode = formData.optimizationMode || 'system';
    formData.imageSubMode = undefined;
  } else if (mode === 'image') {
    // 切换到 image,设置默认图像子模式,清空优化模式
    formData.imageSubMode = formData.imageSubMode || 'text2image';
    formData.optimizationMode = undefined;
  }
};

// 关闭对话框
const handleClose = () => {
  emit('update:show', false);
};

// 保存收藏
const handleSave = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) {
    message.warning('收藏功能暂不可用,请稍后再试');
    return;
  }

  // 验证必填字段
  if (!formData.title.trim()) {
    message.warning('标题不能为空');
    return;
  }

  if (!formData.content.trim()) {
    message.warning('内容不能为空');
    return;
  }

  saving.value = true;
  try {
    // 构建收藏数据
    const favoriteData: any = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      category: formData.category,
      tags: formData.tags,
      functionMode: formData.functionMode,
      optimizationMode: formData.optimizationMode,
      imageSubMode: formData.imageSubMode
    };

    // 如果是从优化器保存,添加元数据
    if (props.originalContent) {
      favoriteData.metadata = {
        originalContent: props.originalContent
      };
    }

    await servicesValue.favoriteManager.addFavorite(favoriteData);

    message.success('保存到收藏夹成功');
    emit('saved');
    emit('update:show', false);
  } catch (error: any) {
    message.error(`保存失败: ${error?.message || '未知错误'}`);
  } finally {
    saving.value = false;
  }
};

// 加载分类列表
const loadCategories = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) return;

  try {
    const data = await servicesValue.favoriteManager.getCategories();
    categories.value = data.map(cat => ({
      id: cat.id,
      name: cat.name
    }));
  } catch (error) {
    console.warn('加载分类失败:', error);
  }
};

// 监听对话框显示,初始化表单
watch(() => props.show, (newShow) => {
  if (newShow) {
    // 智能预填充
    // 1. 标题 = 原始提示词前30字符(去除换行符)
    const titleSource = props.originalContent || props.content;
    formData.title = titleSource
      .replace(/\r?\n/g, ' ')  // 替换换行为空格
      .substring(0, 30)
      .trim();

    // 2. 内容 = 优化后的提示词
    formData.content = props.content;

    // 3. 根据当前功能模式和优化模式自动设置
    if (props.currentFunctionMode === 'image') {
      formData.functionMode = 'image';
      formData.imageSubMode = 'text2image';  // 默认文生图
      formData.optimizationMode = undefined;
    } else if (props.currentFunctionMode === 'context') {
      formData.functionMode = 'context';
      formData.optimizationMode = props.currentOptimizationMode;
      formData.imageSubMode = undefined;
    } else {
      formData.functionMode = 'basic';
      formData.optimizationMode = props.currentOptimizationMode;
      formData.imageSubMode = undefined;
    }

    // 重置其他字段
    formData.description = '';
    formData.category = '';
    formData.tags = [];

    // 加载分类列表
    loadCategories();
  }
}, { immediate: true });
</script>
