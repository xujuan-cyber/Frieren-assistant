<template>
  <NModal
    :show="show"
    preset="card"
    :style="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
    :title="modalTitle.value"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="handleUpdateShow"
  >
    <NScrollbar v-if="formReady" style="max-height: 75vh;">
      <form @submit.prevent="handleSubmit">
        <NForm label-placement="left" label-width="auto" size="small">
          <NFormItem v-if="!isEditing" :label="t('modelManager.modelKey')">
            <NInput
              v-model:value="form.id"
              :placeholder="t('modelManager.modelKeyPlaceholder')"
              required
            />
          </NFormItem>

          <NFormItem :label="t('modelManager.displayName')">
            <NInput
              v-model:value="form.name"
              :placeholder="t('modelManager.displayNamePlaceholder')"
              required
            />
          </NFormItem>

          <NFormItem :label="t('modelManager.enabledStatus')">
            <NCheckbox v-model:checked="form.enabled"></NCheckbox>
          </NFormItem>

          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">提供商配置</NH4>

          <NFormItem label="提供商">
            <NSelect
              v-model:value="form.providerId"
              :options="providerOptions"
              :loading="isLoadingProviders"
              placeholder="选择提供商"
              @update:value="onProviderChange"
              required
            />
          </NFormItem>

          <NFormItem
            v-for="field in connectionFields"
            :key="field.name"
            :label="field.name === 'apiKey' ? t('modelManager.apiKey') : (field.name === 'baseURL' ? t('modelManager.apiUrl') : field.name)"
          >
            <template v-if="field.name === 'baseURL'" #label>
              <NSpace align="center" :size="4">
                <span>{{ t('modelManager.apiUrl') }}</span>
                <NText depth="3" :title="t('modelManager.apiUrlHint')" style="cursor: help;">?</NText>
              </NSpace>
            </template>

            <template v-if="field.type === 'string'">
              <NInput
                v-model:value="form.connectionConfig[field.name]"
                :type="field.name.toLowerCase().includes('key') ? 'password' : 'text'"
                :placeholder="field.placeholder"
                :required="field.required"
                :autocomplete="field.name.toLowerCase().includes('key') ? 'new-password' : 'on'"
              />
            </template>
            <template v-else-if="field.type === 'number'">
              <NInputNumber
                v-model:value="form.connectionConfig[field.name]"
                :placeholder="field.placeholder"
                :required="field.required"
              />
            </template>
            <template v-else-if="field.type === 'boolean'">
              <NCheckbox v-model:checked="form.connectionConfig[field.name]">
                {{ field.name }}
              </NCheckbox>
            </template>
          </NFormItem>

          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">模型配置</NH4>

          <NFormItem :label="t('modelManager.selectModel')">
            <NSpace align="center" style="width: 100%;">
              <NSelect
                v-model:value="form.modelId"
                :options="modelOptions"
                :loading="isLoadingModelOptions"
                :placeholder="t('modelManager.defaultModelPlaceholder')"
                style="flex: 1; min-width: 200px;"
                clearable
                filterable
                required
              />

              <NTooltip :disabled="!canRefreshModelOptions" :show-arrow="false">
                <template #trigger>
                  <NButton
                    @click="refreshModelOptions()"
                    :loading="isLoadingModelOptions"
                    :disabled="!canRefreshModelOptions"
                    circle
                    secondary
                    type="primary"
                    size="small"
                    style="flex-shrink: 0;"
                  >
                    <template #icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                      </svg>
                    </template>
                  </NButton>
                </template>
                {{ t('modelManager.clickToFetchModels') }}
              </NTooltip>
            </NSpace>
          </NFormItem>
        </NForm>

        <NDivider style="margin: 12px 0 8px 0;" />
        <NSpace justify="space-between" align="center" style="margin-bottom: 12px;">
          <NSpace vertical :size="4">
            <NH4 style="margin: 0; font-size: 14px;">{{ t('modelManager.advancedParameters.title') }}</NH4>
            <NText depth="3" style="font-size: 12px;">
              {{ t('modelManager.advancedParameters.currentProvider') }}:
              <NText strong>
                {{ currentProviderType === 'custom' ? t('modelManager.advancedParameters.customProvider') : currentProviderType.toUpperCase() }}
              </NText>
              <span v-if="availableLLMParamDefinitions.length > 0">
                ({{ availableLLMParamDefinitions.length }}{{ t('modelManager.advancedParameters.availableParams') }})
              </span>
              <NText v-else type="warning">
                ({{ t('modelManager.advancedParameters.noAvailableParams') }})
              </NText>
            </NText>
          </NSpace>

          <NSelect
            v-model:value="selectedNewLLMParamId"
            @update:value="handleQuickAddParam"
            style="width: 220px;"
            size="small"
            :options="[
              { label: t('modelManager.advancedParameters.select'), value: '', disabled: true },
              ...availableLLMParamDefinitions.map(paramDef => ({
                label: paramDef.labelKey ? t(paramDef.labelKey) : paramDef.name,
                value: paramDef.id
              })),
              { label: t('modelManager.advancedParameters.custom'), value: 'custom' }
            ]"
          />
        </NSpace>

        <NCard v-if="selectedNewLLMParamId === 'custom'" size="small" style="margin: 12px 0;">
          <template #header>
            <NSpace justify="space-between" align="center">
              <NText strong>{{ t('modelManager.advancedParameters.custom') }}</NText>
              <NButton @click="cancelCustomParam" size="tiny" quaternary circle>×</NButton>
            </NSpace>
          </template>
          <NSpace vertical :size="12">
            <NSpace vertical :size="8">
              <NText depth="3" style="font-size: 12px;">参数名称</NText>
              <NInput
                v-model:value="customLLMParam.key"
                :placeholder="t('modelManager.advancedParameters.customKeyPlaceholder')"
                size="small"
              />
            </NSpace>
            <NSpace vertical :size="8">
              <NText depth="3" style="font-size: 12px;">参数值</NText>
              <NInput
                v-model:value="customLLMParam.value"
                :placeholder="t('modelManager.advancedParameters.customValuePlaceholder')"
                size="small"
              />
            </NSpace>
            <NSpace justify="end">
              <NButton @click="cancelCustomParam" size="small">{{ t('common.cancel') }}</NButton>
              <NButton
                @click="handleCustomParamAdd"
                type="primary"
                size="small"
                :disabled="!customLLMParam.key || !customLLMParam.value"
              >
                {{ t('common.add') }}
              </NButton>
            </NSpace>
          </NSpace>
        </NCard>

        <NText
          v-if="Object.keys(currentParamOverrides || {}).length === 0"
          depth="3"
          style="font-size: 14px; margin-bottom: 12px;"
        >
          {{ t('modelManager.advancedParameters.noParamsConfigured') }}
        </NText>

        <NSpace vertical :size="12">
          <NCard
            v-for="(value, key) in currentParamOverrides"
            :key="key"
            size="small"
            embedded
          >
            <template #header>
              <NSpace justify="space-between" align="center">
                <NSpace align="center">
                  <NText strong>{{ getParamMetadata(key)?.label || key }}</NText>
                  <NTag v-if="!getParamMetadata(key)" type="info" size="small">
                    {{ t('modelManager.advancedParameters.customParam') }}
                  </NTag>
                </NSpace>
                <NButton
                  @click="removeLLMParam(key)"
                  size="tiny"
                  type="error"
                  quaternary
                  circle
                >
                  ×
                </NButton>
              </NSpace>
            </template>

            <NSpace vertical :size="8">
              <NText v-if="getParamMetadata(key)?.description" depth="3" style="font-size: 12px;">
                {{ getParamMetadata(key)?.description }}
              </NText>

              <NCheckbox
                v-if="getParamMetadata(key)?.type === 'boolean'"
                v-model:checked="currentParamOverrides[key]"
              >
                {{ currentParamOverrides[key] ? t('common.enabled') : t('common.disabled') }}
              </NCheckbox>

              <NSpace
                v-else-if="getParamMetadata(key)?.type === 'number' || (getParamMetadata(key)?.type === 'integer' && getParamMetadata(key)?.name !== 'stopSequences')"
                vertical
                :size="4"
              >
                <NInputNumber
                  v-model:value="currentParamOverrides[key] as number"
                  :min="getParamMetadata(key)?.minValue"
                  :max="getParamMetadata(key)?.maxValue"
                  :step="getParamMetadata(key)?.step"
                  :placeholder="getParamMetadata(key)?.defaultValue !== undefined ? String(getParamMetadata(key)?.defaultValue) : ''"
                  :status="isParamInvalid(key, currentParamOverrides[key]) ? 'error' : undefined"
                />
                <NText
                  v-if="getParamMetadata(key)?.minValue !== undefined && getParamMetadata(key)?.maxValue !== undefined"
                  depth="3"
                  style="font-size: 12px;"
                >
                  范围: {{ getParamMetadata(key)?.minValue }} - {{ getParamMetadata(key)?.maxValue }}{{ getParamMetadata(key)?.unit || '' }}
                </NText>
                <NText
                  v-if="isParamInvalid(key, currentParamOverrides[key])"
                  type="error"
                  style="font-size: 12px;"
                >
                  {{ getParamValidationMessage(key, currentParamOverrides[key]) }}
                </NText>
              </NSpace>

              <NSpace v-else vertical :size="4">
                <NInput
                  v-model:value="currentParamOverrides[key] as string"
                  :placeholder="getParamMetadata(key)?.name === 'stopSequences' ? t('modelManager.advancedParameters.stopSequencesPlaceholder') : (getParamMetadata(key)?.defaultValue !== undefined ? String(getParamMetadata(key)?.defaultValue) : '')"
                />
                <NText
                  v-if="getParamMetadata(key)?.name === 'stopSequences'"
                  depth="3"
                  style="font-size: 12px;"
                >
                  {{ t('modelManager.advancedParameters.stopSequencesPlaceholder') }}
                </NText>
              </NSpace>
            </NSpace>
          </NCard>
        </NSpace>
      </form>
    </NScrollbar>

    <div v-else style="height: 200px; display: flex; align-items: center; justify-content: center;">
      <NSpin />
    </div>

    <template #action>
      <NSpace justify="space-between" align="center" style="width: 100%;">
        <NSpace align="center">
          <NButton
            @click="testFormConnection"
            :loading="isTestingFormConnection"
            :disabled="!canTestFormConnection"
            secondary
            type="info"
            size="small"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </template>
            {{ t('modelManager.testConnection') }}
          </NButton>
          <NTag v-if="formConnectionStatus" :type="formConnectionStatus.type" size="small" :bordered="false">
            {{ formConnectionStatus.message }}
          </NTag>
        </NSpace>

        <NSpace>
          <NButton @click="handleCancel">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="isSaving" @click="handleSubmit">
            {{ isEditing ? t('common.save') : t('common.create') }}
          </NButton>
        </NSpace>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { computed, inject, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal,
  NScrollbar,
  NForm,
  NFormItem,
  NH4,
  NInput,
  NInputNumber,
  NSelect,
  NCheckbox,
  NSpace,
  NButton,
  NDivider,
  NText,
  NTag,
  NTooltip,
  NCard,
  NSpin
} from 'naive-ui'
import type { TextModelManager } from '../composables/useTextModelManager'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  configId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show', 'saved'])

const { t } = useI18n()
const manager = inject<TextModelManager>('textModelManager')
if (!manager) {
  throw new Error('Text model manager not provided')
}

const modalTitle = manager.modalTitle
const form = manager.form
const formReady = manager.formReady
const providerOptions = manager.providerOptions
const isLoadingProviders = manager.isLoadingProviders
const connectionFields = manager.connectionFields
const modelOptions = manager.modelOptions
const isLoadingModelOptions = manager.isLoadingModelOptions
const availableLLMParamDefinitions = manager.availableLLMParamDefinitions
const canRefreshModelOptions = manager.canRefreshModelOptions
const refreshModelOptions = manager.refreshModelOptions
const selectedNewLLMParamId = manager.selectedNewLLMParamId
const handleQuickAddParam = manager.handleQuickAddParam
const customLLMParam = manager.customLLMParam
const cancelCustomParam = manager.cancelCustomParam
const handleCustomParamAdd = manager.handleCustomParamAdd
const currentParamOverrides = manager.currentParamOverrides
const currentProviderType = manager.currentProviderType
const getParamMetadata = manager.getParamMetadata
const removeLLMParam = manager.removeLLMParam
const isParamInvalid = manager.isParamInvalid
const getParamValidationMessage = manager.getParamValidationMessage
const formConnectionStatus = manager.formConnectionStatus
const testFormConnection = manager.testFormConnection
const isTestingFormConnection = manager.isTestingFormConnection
const canTestFormConnection = manager.canTestFormConnection
const isSaving = manager.isSaving

const isEditing = computed(() => !!manager.editingModelId.value)

const handleUpdateShow = async (value: boolean) => {
  emit('update:show', value)

  // 只有在明确关闭时才重置表单状态
  if (!value) {
    // 等待父组件处理状态变化后再重置表单
    await nextTick()
    manager.resetFormState()
  }
}

const handleSubmit = async () => {
  const id = await manager.saveForm()
  emit('saved', id || undefined)
  handleUpdateShow(false)
}

const handleCancel = () => {
  handleUpdateShow(false)
}

const onProviderChange = (providerId: string) => {
  manager.selectProvider(providerId, !isEditing.value)
}
</script>
