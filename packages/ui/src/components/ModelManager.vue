<template>
  <NModal
    :show="show"
    preset="card"
    :style="{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh' }"
    :title="t('modelManager.title')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value) => !value && close()"
  >
    <template #header-extra>
      <NButton
        v-if="activeTab === 'text'"
        type="primary"
        @click="openAddForActiveTab"
        ghost
      >
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
        </template>
        {{ t('modelManager.addModel') }}
      </NButton>
      <NButton
        v-else-if="activeTab === 'image'"
        type="primary"
        @click="handleAddImageModel"
        ghost
      >
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
        </template>
        {{ t('modelManager.addImageModel') }}
      </NButton>
    </template>
    
    <NScrollbar style="max-height: 75vh;">
      <NTabs v-model:value="activeTab" type="line" size="small" style="margin-bottom: 12px;">
        <NTabPane name="text" :tab="t('modelManager.textModels')" />
        <NTabPane name="image" :tab="t('modelManager.imageModels')" />
      </NTabs>

      <template v-if="activeTab === 'text'">
      <NSpace vertical :size="12">
          <NCard
            v-for="model in models"
            :key="model.id"
            hoverable
            :style="{
              opacity: model.enabled ? 1 : 0.6
            }"
          >
            <template #header>
              <NSpace justify="space-between" align="center">
                <NSpace vertical :size="2">
                  <!-- 配置名称行 -->
                  <NSpace align="center">
                    <NText strong>{{ model.name }}</NText>
                    <NTag
                      v-if="!model.enabled"
                      type="warning"
                      size="small"
                    >
                      {{ t('modelManager.disabled') }}
                    </NTag>
                  </NSpace>

                  <!-- 标签行：Provider、Model、能力标签合并 -->
                  <NSpace :size="6">
                    <!-- Provider 标签 -->
                    <NTag size="small" type="info" :bordered="false">
                      {{ model.providerMeta?.name || model.providerMeta?.id }}
                    </NTag>

                    <!-- Model 标签 -->
                    <NTag size="small" type="primary" :bordered="false">
                      {{ model.modelMeta?.name || model.modelMeta?.id }}
                    </NTag>

                    <!-- 能力标签 -->
                    <NTag v-if="model.modelMeta?.capabilities?.supportsTools" size="small" type="success" :bordered="false">
                      {{ t('modelManager.capabilities.tools') }}
                    </NTag>
                    <NTag v-if="model.modelMeta?.capabilities?.supportsReasoning" size="small" type="warning" :bordered="false">
                      {{ t('modelManager.capabilities.reasoning') }}
                    </NTag>
                    <NTag v-if="model.modelMeta?.capabilities?.supportsStreaming" size="small" :bordered="false">
                      {{ t('modelManager.capabilities.streaming') }}
                    </NTag>
                  </NSpace>
                </NSpace>
              </NSpace>
            </template>
            
            <template #header-extra>
              <NSpace @click.stop>
                <NButton
                  @click="testConnection(model.id)"
                  size="small"
                  quaternary
                  :disabled="isTestingConnectionFor(model.id)"
                  :loading="isTestingConnectionFor(model.id)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </template>
                  <span class="hidden md:inline">{{ t('modelManager.testConnection') }}</span>
                </NButton>
                
                <NButton
                  @click="editModel(model.id)"
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </template>
                  <span class="hidden md:inline">{{ t('modelManager.editModel') }}</span>
                </NButton>
                
                <NButton
                  @click="model.enabled ? disableModel(model.id) : enableModel(model.id)"
                  size="small"
                  :type="model.enabled ? 'warning' : 'success'"
                  quaternary
                >
                  <template #icon>
                    <svg v-if="model.enabled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 6v.343"/><path d="M18.218 18.218A7 7 0 0 1 5 15V9a7 7 0 0 1 .782-3.218"/><path d="M19 13.343V9A7 7 0 0 0 8.56 2.902"/><path d="M22 22 2 2"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v4"/></svg>
                  </template>
                  <span class="hidden md:inline">{{ model.enabled ? t('common.disable') : t('common.enable') }}</span>
                </NButton>
                
                <NButton
                  v-if="!isDefaultModel(model.id)"
                  @click="handleDelete(model.id)"
                  size="small"
                  type="error"
                  quaternary
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </template>
                  <span class="hidden md:inline">{{ t('common.delete') }}</span>
                </NButton>
              </NSpace>
            </template>
          </NCard>
      </NSpace>
      </template>

      <template v-else>
        <!-- 图像模型列表 -->
        <ImageModelManager ref="imageListRef" @edit="handleEditImageModel" @add="handleAddImageModel" />
      </template>
    </NScrollbar>
  </NModal>


  <!-- 编辑模型弹窗 - 独立的顶级模态框 -->
  <NModal
    :show="isEditing"
    preset="card"
    :style="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
    :title="t('modelManager.editModel')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value) => !value && cancelEdit()"
  >
    <NScrollbar v-if="editingModel" style="max-height: 75vh;">
      <form @submit.prevent="saveEdit">
        <NForm label-placement="left" label-width="auto" size="small">
          <!-- 基本信息区域 -->
          <NFormItem :label="t('modelManager.displayName')">
            <NInput
              v-model:value="editingModel.name"
              :placeholder="t('modelManager.displayNamePlaceholder')"
              required
            />
          </NFormItem>

          <!-- 提供商配置区域 -->
          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">提供商配置</NH4>

          <!-- Provider 选择器 -->
          <NFormItem label="提供商">
            <NSelect
              v-model:value="editingModel.providerId"
              :options="providerOptions"
              placeholder="选择提供商"
              @update:value="handleProviderChange"
              required
            />
          </NFormItem>

          <!-- 动态连接配置字段 -->
          <NFormItem v-for="field in connectionFields" :key="field.name" :label="field.name === 'apiKey' ? t('modelManager.apiKey') : (field.name === 'baseURL' ? t('modelManager.apiUrl') : field.name)">
            <template v-if="field.name === 'baseURL'" #label>
              <NSpace align="center" :size="4">
                <span>{{ t('modelManager.apiUrl') }}</span>
                <NText depth="3" :title="t('modelManager.apiUrlHint')" style="cursor: help;">?</NText>
              </NSpace>
            </template>

            <template v-if="field.type === 'string'">
              <NInput
                v-model:value="editingModel.connectionConfig[field.name]"
                :type="field.name.toLowerCase().includes('key') ? 'password' : 'text'"
                :placeholder="field.placeholder"
                :required="field.required"
                :autocomplete="field.name.toLowerCase().includes('key') ? 'off' : 'on'"
              />
            </template>
            <template v-else-if="field.type === 'number'">
              <NInputNumber
                v-model:value="editingModel.connectionConfig[field.name]"
                :placeholder="field.placeholder"
                :required="field.required"
              />
            </template>
            <template v-else-if="field.type === 'boolean'">
              <NCheckbox
                v-model:checked="editingModel.connectionConfig[field.name]"
              >
                {{ field.name }}
              </NCheckbox>
            </template>
          </NFormItem>

          <!-- 模型配置区域 -->
          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">模型配置</NH4>

          <NFormItem :label="t('modelManager.defaultModel')">
            <InputWithSelect
              v-model="editingModel.modelId"
              :options="modelOptions"
              :is-loading="isLoadingModels"
              :loading-text="t('modelManager.loadingModels')"
              :no-options-text="t('modelManager.noModelsAvailable')"
              :hint-text="t('modelManager.clickToFetchModels')"
              required
              :placeholder="t('modelManager.defaultModelPlaceholder')"
              @fetch-options="handleFetchEditingModels"
            />
          </NFormItem>
        </NForm>

        <!-- 高级参数配置区域（NForm 外部） -->
        <NDivider style="margin: 12px 0 8px 0;" />
        <NSpace justify="space-between" align="center" style="margin-bottom: 12px;">
          <NSpace vertical :size="4">
            <NH4 style="margin: 0; font-size: 14px;">{{ t('modelManager.advancedParameters.title') }}</NH4>
            <NText depth="3" style="font-size: 12px;">
              {{ t('modelManager.advancedParameters.currentProvider') }}:
              <NText strong>{{ currentProviderType === 'custom' ? t('modelManager.advancedParameters.customProvider') : currentProviderType.toUpperCase() }}</NText>
              <span v-if="availableLLMParamDefinitions.length > 0"> ({{ availableLLMParamDefinitions.length }}{{ t('modelManager.advancedParameters.availableParams') }})</span>
              <NText v-else type="warning"> ({{ t('modelManager.advancedParameters.noAvailableParams') }})</NText>
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
                
                <!-- 自定义参数输入界面 -->
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
                    <NButton @click="handleCustomParamAdd" type="primary" size="small" :disabled="!customLLMParam.key || !customLLMParam.value">
                      {{ t('common.add') }}
                    </NButton>
                  </NSpace>
                </NSpace>
                </NCard>
                
              <NText v-if="Object.keys(currentParamOverrides || {}).length === 0" depth="3" style="font-size: 14px; margin-bottom: 12px;">
                {{ t('modelManager.advancedParameters.noParamsConfigured') }}
              </NText>

              <!-- 参数显示 -->
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
                          <NTag
                            v-if="!getParamMetadata(key)"
                            type="info"
                            size="small"
                          >
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
                      
                      <!-- Boolean 类型 -->
                      <NCheckbox
                        v-if="getParamMetadata(key)?.type === 'boolean'"
                      v-model:checked="currentParamOverrides[key]"
                      >
                      {{ currentParamOverrides[key] ? t('common.enabled') : t('common.disabled') }}
                      </NCheckbox>
                      
                      <!-- Number/Integer 类型 -->
                      <NSpace
                        v-else-if="getParamMetadata(key)?.type === 'number' || (getParamMetadata(key)?.type === 'integer' && getParamMetadata(key)?.name !== 'stopSequences')"
                        vertical :size="4"
                      >
                      <NInputNumber
                        v-model:value="currentParamOverrides[key]"
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
                      
                      <!-- String 类型 -->
                      <NSpace v-else vertical :size="4">
                      <NInput
                        v-model:value="currentParamOverrides[key]"
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
      
      <template #action>
        <NSpace justify="end">
          <NButton @click="cancelEdit">
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            type="primary"
            @click="saveEdit"
          >
            {{ t('common.save') }}
          </NButton>
        </NSpace>
      </template>
  </NModal>

  <!-- 添加模型弹窗 - 独立的顶级模态框 -->
  <NModal
    :show="showAddForm"
    preset="card"
    :style="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
    :title="t('modelManager.addModel')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value) => !value && (showAddForm = false)"
  >
    <NScrollbar style="max-height: 75vh;">
      <form @submit.prevent="addCustomModel">
        <NForm label-placement="left" label-width="auto" size="small">
          <!-- 基本信息区域 -->
          <NFormItem :label="t('modelManager.modelKey')">
            <NInput
              v-model:value="newModel.id"
              :placeholder="t('modelManager.modelKeyPlaceholder')"
              required
            />
          </NFormItem>

          <NFormItem :label="t('modelManager.displayName')">
            <NInput
              v-model:value="newModel.name"
              :placeholder="t('modelManager.displayNamePlaceholder')"
              required
            />
          </NFormItem>

          <!-- 提供商配置区域 -->
          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">提供商配置</NH4>

          <!-- Provider 选择器 -->
          <NFormItem label="提供商">
            <NSelect
              v-model:value="newModel.providerId"
              :options="providerOptions"
              placeholder="选择提供商"
              @update:value="handleProviderChange"
              required
            />
          </NFormItem>

          <!-- 动态连接配置字段 -->
          <NFormItem v-for="field in connectionFields" :key="field.name" :label="field.name === 'apiKey' ? t('modelManager.apiKey') : (field.name === 'baseURL' ? t('modelManager.apiUrl') : field.name)">
            <template v-if="field.name === 'baseURL'" #label>
              <NSpace align="center" :size="4">
                <span>{{ t('modelManager.apiUrl') }}</span>
                <NText depth="3" :title="t('modelManager.apiUrlHint')" style="cursor: help;">?</NText>
              </NSpace>
            </template>

            <template v-if="field.type === 'string'">
              <NInput
                v-model:value="newModel.connectionConfig[field.name]"
                :type="field.name.toLowerCase().includes('key') ? 'password' : 'text'"
                :placeholder="field.placeholder"
                :required="field.required"
                :autocomplete="field.name.toLowerCase().includes('key') ? 'off' : 'on'"
              />
            </template>
            <template v-else-if="field.type === 'number'">
              <NInputNumber
                v-model:value="newModel.connectionConfig[field.name]"
                :placeholder="field.placeholder"
                :required="field.required"
              />
            </template>
            <template v-else-if="field.type === 'boolean'">
              <NCheckbox
                v-model:checked="newModel.connectionConfig[field.name]"
              >
                {{ field.name }}
              </NCheckbox>
            </template>
          </NFormItem>

          <!-- 模型配置区域 -->
          <NDivider style="margin: 12px 0 8px 0;" />
          <NH4 style="margin: 0 0 12px 0; font-size: 14px;">模型配置</NH4>

          <NFormItem :label="t('modelManager.defaultModel')">
            <InputWithSelect
              v-model="newModel.modelId"
              :options="modelOptions"
              :is-loading="isLoadingModels"
              :loading-text="t('modelManager.loadingModels')"
              :no-options-text="t('modelManager.noModelsAvailable')"
              :hint-text="t('modelManager.clickToFetchModels')"
              required
              :placeholder="t('modelManager.defaultModelPlaceholder')"
              @fetch-options="handleFetchNewModels"
            />
          </NFormItem>
        </NForm>

        <!-- 高级参数配置区域（NForm 外部） -->
        <NDivider style="margin: 12px 0 8px 0;" />
        <NSpace justify="space-between" align="center" style="margin-bottom: 12px;">
          <NSpace vertical :size="4">
            <NH4 style="margin: 0; font-size: 14px;">{{ t('modelManager.advancedParameters.title') }}</NH4>
            <NText depth="3" style="font-size: 12px;">
              {{ t('modelManager.advancedParameters.currentProvider') }}:
              <NText strong>{{ currentProviderType === 'custom' ? t('modelManager.advancedParameters.customProvider') : currentProviderType.toUpperCase() }}</NText>
              <span v-if="availableLLMParamDefinitions.length > 0"> ({{ availableLLMParamDefinitions.length }}{{ t('modelManager.advancedParameters.availableParams') }})</span>
              <NText v-else type="warning"> ({{ t('modelManager.advancedParameters.noAvailableParams') }})</NText>
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
              
              <!-- 自定义参数输入界面 --FOR ADD MODEL-- -->
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
                  <NButton @click="handleCustomParamAdd" type="primary" size="small" :disabled="!customLLMParam.key || !customLLMParam.value">
                    {{ t('common.add') }}
                  </NButton>
                </NSpace>
              </NSpace>
              </NCard>
              
              <NText v-if="Object.keys(currentParamOverrides || {}).length === 0" depth="3" style="font-size: 14px; margin-bottom: 12px;">
                {{ t('modelManager.advancedParameters.noParamsConfigured') }}
              </NText>

              <!-- 参数显示 -->
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
                        <NTag
                          v-if="!getParamMetadata(key)"
                          type="info"
                          size="small"
                        >
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
                    
                    <!-- Boolean 类型 -->
                    <NCheckbox
                      v-if="getParamMetadata(key)?.type === 'boolean'"
                      v-model:checked="currentParamOverrides[key]"
                    >
                      {{ currentParamOverrides[key] ? t('common.enabled') : t('common.disabled') }}
                    </NCheckbox>
                    
                    <!-- Number/Integer 类型 -->
                    <NSpace
                      v-else-if="getParamMetadata(key)?.type === 'number' || (getParamMetadata(key)?.type === 'integer' && getParamMetadata(key)?.name !== 'stopSequences')"
                      vertical :size="4"
                    >
                      <NInputNumber
                        v-model:value="currentParamOverrides[key]"
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
                    
                    <!-- String 类型 -->
                    <NSpace v-else vertical :size="4">
                      <NInput
                        v-model:value="currentParamOverrides[key]"
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
      
      <template #action>
        <NSpace justify="end">
          <NButton @click="showAddForm = false">
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            type="primary"
            @click="addCustomModel"
          >
            {{ t('common.create') }}
          </NButton>
        </NSpace>
      </template>
  </NModal>

  <!-- 图像模型编辑弹窗 -->
  <ImageModelEditModal
    :show="showImageModelEdit"
    :config-id="editingImageModelId"
    @update:show="showImageModelEdit = $event"
    @saved="handleImageModelSaved"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, inject, provide } from 'vue'; // Added computed, inject and provide
import { useI18n } from 'vue-i18n';
import {
  NModal, NScrollbar, NSpace, NCard, NText, NH4, NTag, NButton,
  NInput, NInputNumber, NCheckbox, NDivider, NSelect, NTabs, NTabPane,
  NForm, NFormItem
} from 'naive-ui';
import {
  advancedParameterDefinitions,
  type TextModelConfig,
  type TextModel,
  type ModelOption,
  type TextProvider,
} from '@prompt-optimizer/core';
import { useToast } from '../composables/useToast';
import InputWithSelect from './InputWithSelect.vue'
import ImageModelManager from './ImageModelManager.vue'
import ImageModelEditModal from './ImageModelEditModal.vue'


const { t } = useI18n()
const toast = useToast();
const emit = defineEmits(['modelsUpdated', 'close', 'select', 'update:show']);

type TextConnectionConfig = Record<string, any>

interface EditingTextModelForm {
  originalId: string;
  name: string;
  enabled: boolean;
  providerId: string;
  modelId: string;
  connectionConfig: TextConnectionConfig;
  displayMaskedKey: boolean;
  originalApiKey?: string;  // 保留用于遮罩处理
  paramOverrides: Record<string, unknown>;
}

interface NewTextModelForm {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  connectionConfig: TextConnectionConfig;
  defaultModel: string;
  paramOverrides: Record<string, unknown>;
}

// 组件属性
defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

// 关闭模态框
const close = () => {
  emit('update:show', false);
  emit('close');
};

// 活动标签（文本/图像）
const activeTab = ref('text')

// 支持外部通过事件切换页签
if (typeof window !== 'undefined') {
  const tabHandler = (e: Event) => {
    try {
      const tab = (e as CustomEvent).detail
      if (tab === 'text' || tab === 'image') activeTab.value = tab
    } catch {}
  }
  onMounted(() => window.addEventListener('model-manager:set-tab', tabHandler))
  onUnmounted(() => window.removeEventListener('model-manager:set-tab', tabHandler))
}


// 打开新增弹窗（根据活动标签）
const openAddForActiveTab = () => {
  if (activeTab.value === 'text') {
    // 重置表单并设置默认 Provider
    if (textProviders.value.length > 0) {
      const defaultProvider = textProviders.value[0]
      selectedProviderId.value = defaultProvider.id
      newModel.value.providerId = defaultProvider.id

      // 设置默认连接配置
      if (defaultProvider.defaultBaseURL) {
        newModel.value.connectionConfig = {
          baseURL: defaultProvider.defaultBaseURL
        }
      }

      // 加载默认 Provider 的模型
      if (textAdapterRegistry) {
        textModels.value = textAdapterRegistry.getStaticModels(defaultProvider.id)
        modelOptions.value = textModels.value.map(m => ({
          value: m.id,
          label: m.name || m.id
        }))
      }
    }

    showAddForm.value = true
  }
  else if (activeTab.value === 'image') handleAddImageModel()
}

// 通过依赖注入获取服务
const services = inject('services');
if (!services) {
  throw new Error('Services not provided!');
}
const modelManager = services.value.modelManager;
const llmService = services.value.llmService;
const imageModelManager = services.value.imageModelManager;

// 使用统一注入的单实例注册表
const imageAdapterRegistry = services.value.imageAdapterRegistry;
const textAdapterRegistry = services.value.textAdapterRegistry;

// 为ImageModelManager组件提供必要的依赖
provide('imageModelManager', imageModelManager);
provide('imageRegistry', imageAdapterRegistry);
// 额外提供 imageService，供下游 composable 使用（无感知地走 IPC 或本地实现）
provide('imageService', services.value.imageService);

// =============== 状态变量 ===============
// UI状态
const isEditing = ref(false);
const showAddForm = ref(false);
const showImageModelEdit = ref(false);
const editingImageModelId = ref<string | undefined>(undefined);
const imageListRef = ref<any>(null)
const modelOptions = ref<ModelOption[]>([]);
const isLoadingModels = ref(false);
const testingConnections = ref<Record<string, boolean>>({});
// For Advanced Parameters UI
const selectedNewLLMParamId = ref(''); // Stores ID of param selected from dropdown
const customLLMParam = ref({ key: '', value: '' });

// 数据状态
const models = ref<TextModelConfig[]>([]);
const editingModel = ref<EditingTextModelForm | null>(null);
const textProviders = ref<TextProvider[]>([]);
const textModels = ref<any[]>([]);     // TextModel[]
const selectedProviderId = ref('');

// 表单状态
const newModel = ref<NewTextModelForm>({
  id: '',
  name: '',
  providerId: '',  // 将在 loadTextProviders 后设置
  modelId: '',
  connectionConfig: {},
  defaultModel: '',
  paramOverrides: {}
});
const DEFAULT_TEXT_MODEL_IDS = ['openai', 'gemini', 'deepseek', 'zhipu', 'siliconflow', 'custom'] as const

// 加载所有模型
const loadModels = async () => {
  try {
    const allModels = await modelManager.getAllModels()

    models.value = allModels
      .map(model => ({ ...model }))
      .sort((a, b) => {
        if (a.enabled !== b.enabled) {
          return a.enabled ? -1 : 1
        }
        const aDefault = isDefaultModel(a.id)
        const bDefault = isDefaultModel(b.id)
        if (aDefault !== bDefault) {
          return aDefault ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

    console.log('处理后的模型列表:', models.value.map(m => ({
      id: m.id,
      name: m.name,
      enabled: m.enabled,
      hasApiKey: !!m.connectionConfig?.apiKey,
      provider: m.providerMeta?.name
    })))

    emit('modelsUpdated', models.value[0]?.id)
  } catch (error) {
    console.error('加载模型失败:', error)
  }
}

// 加载所有文本模型 Providers
const loadTextProviders = () => {
  if (!textAdapterRegistry) {
    console.warn('textAdapterRegistry 未初始化')
    return
  }

  try {
    textProviders.value = textAdapterRegistry.getAllProviders()
    console.log('已加载文本模型 Providers:', textProviders.value.map(p => p.name))

    // 初始化 newModel 的默认 provider
    if (textProviders.value.length > 0 && !newModel.value.providerId) {
      const defaultProvider = textProviders.value[0]
      newModel.value.providerId = defaultProvider.id
      selectedProviderId.value = defaultProvider.id
    }
  } catch (error) {
    console.error('加载 Providers 失败:', error)
  }
}

// 判断是否为默认模型
const isDefaultModel = (id: string) => {
  return DEFAULT_TEXT_MODEL_IDS.includes(id as typeof DEFAULT_TEXT_MODEL_IDS[number])
}

// =============== 计算属性 ===============
// Provider 选项
const providerOptions = computed(() => {
  return textProviders.value.map(p => ({
    label: p.name,
    value: p.id,
    disabled: false
  }))
})

// 当前选中的 Provider
const selectedProvider = computed(() => {
  if (!selectedProviderId.value) return null
  return textProviders.value.find(p => p.id === selectedProviderId.value)
})

// 动态连接字段
const connectionFields = computed(() => {
  if (!selectedProvider.value?.connectionSchema) return []

  const schema = selectedProvider.value.connectionSchema
  const fields: any[] = []

  // 必需字段
  for (const fieldName of schema.required) {
    fields.push({
      name: fieldName,
      required: true,
      type: schema.fieldTypes[fieldName] || 'string',
      labelKey: `llm.connection.${fieldName}.label`,
      descriptionKey: `llm.connection.${fieldName}.description`,
      placeholder: fieldName === 'baseURL' ? selectedProvider.value.defaultBaseURL : ''
    })
  }

  // 可选字段
  for (const fieldName of schema.optional) {
    fields.push({
      name: fieldName,
      required: false,
      type: schema.fieldTypes[fieldName] || 'string',
      labelKey: `llm.connection.${fieldName}.label`,
      descriptionKey: `llm.connection.${fieldName}.description`,
      placeholder: fieldName === 'baseURL' ? selectedProvider.value.defaultBaseURL : ''
    })
  }

  return fields
})

// =============== 模型管理函数 ===============
// 测试连接
const isTestingConnectionFor = (id: string) => !!testingConnections.value[id];
const testConnection = async (id: string) => {
  if (isTestingConnectionFor(id)) return;
  try {
    testingConnections.value[id] = true;
    const model = await modelManager.getModel(id);
    if (!model) throw new Error(t('modelManager.noModelsAvailable'));

    // 不再需要手动创建LLMService，使用注入的实例
    await llmService.testConnection(id);
    toast.success(t('modelManager.testSuccess', { provider: model.name }));
  } catch (error) {
    console.error('连接测试失败:', error);
    const model = await modelManager.getModel(id);
    const modelName = model?.name || id;
    toast.error(t('modelManager.testFailed', {
      provider: modelName,
      error: error.message || 'Unknown error'
    }));
  } finally {
    delete testingConnections.value[id];
  }
};

// 处理删除
const handleDelete = async (id: string) => {
  if (confirm(t('modelManager.deleteConfirm'))) {
    try {
      await modelManager.deleteModel(id)
      await loadModels()
      toast.success(t('modelManager.deleteSuccess'))
    } catch (error) {
      console.error('删除模型失败:', error)
      toast.error(t('modelManager.deleteFailed', { error: error.message }))
    }
  }
};

// 启用模型
const enableModel = async (id: string) => {
  try {
    const model = await modelManager.getModel(id)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    await modelManager.enableModel(id)
    await loadModels()
    emit('modelsUpdated', id)
    toast.success(t('modelManager.enableSuccess'))
  } catch (error) {
    console.error('启用模型失败:', error)
    toast.error(t('modelManager.enableFailed', { error: error.message }))
  }
}

// 禁用模型
const disableModel = async (id: string) => {
  try {
    const model = await modelManager.getModel(id)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    await modelManager.disableModel(id)
    await loadModels()
    emit('modelsUpdated', id)
    toast.success(t('modelManager.disableSuccess'))
  } catch (error) {
    console.error('禁用模型失败:', error)
    toast.error(t('modelManager.disableFailed', { error: error.message }))
  }
}


// =============== 编辑相关函数 ===============
// 编辑模型
const editModel = async (id: string) => {
  const model = await modelManager.getModel(id)
  if (!model) {
    toast.error(t('modelManager.noModelsAvailable'))
    return
  }

  const connectionConfig: TextConnectionConfig = { ...(model.connectionConfig ?? {}) }

  // 处理 apiKey 遮罩
  const rawApiKey = connectionConfig.apiKey ?? ''
  let maskedApiKey = ''

  if (rawApiKey) {
    const keyLength = rawApiKey.length
    if (keyLength <= 8) {
      maskedApiKey = '*'.repeat(keyLength)
    } else {
      const visiblePart = 4
      const prefix = rawApiKey.substring(0, visiblePart)
      const suffix = rawApiKey.substring(keyLength - visiblePart)
      const maskedLength = keyLength - visiblePart * 2
      maskedApiKey = `${prefix}${'*'.repeat(maskedLength)}${suffix}`
    }
    // 用遮罩后的密钥替换原始密钥
    connectionConfig.apiKey = maskedApiKey
  }

  editingModel.value = {
    originalId: model.id,
    name: model.name,
    enabled: model.enabled,
    providerId: model.providerMeta?.id ?? 'custom',
    modelId: model.modelMeta?.id ?? '',
    connectionConfig,
    displayMaskedKey: !!rawApiKey,
    originalApiKey: rawApiKey || undefined,
    paramOverrides: model.paramOverrides ? JSON.parse(JSON.stringify(model.paramOverrides)) : {}
  }

  // 设置选中的 Provider ID
  selectedProviderId.value = editingModel.value.providerId

  // 初始化模型选项
  try {
    // 使用原始的完整配置（包含真实的 API key）
    const options = await llmService.fetchModelList(model.id, {
      providerMeta: model.providerMeta,
      modelMeta: model.modelMeta,
      connectionConfig: model.connectionConfig  // 使用原始的 model.connectionConfig，而不是遮罩后的
    })
    modelOptions.value = options
  } catch (error) {
    console.warn('Failed to fetch model list, fallback to current model:', error)
    modelOptions.value = [{ value: model.modelMeta.id, label: model.modelMeta.name || model.modelMeta.id }]
  }

  isEditing.value = true
}

// Provider 切换处理
const handleProviderChange = async (providerId: string) => {
  selectedProviderId.value = providerId

  // 加载该 Provider 的静态模型
  if (textAdapterRegistry) {
    try {
      textModels.value = textAdapterRegistry.getStaticModels(providerId)

      // 更新模型选项
      modelOptions.value = textModels.value.map(m => ({
        value: m.id,
        label: m.name || m.id
      }))

      // 获取 Provider 信息
      const provider = textProviders.value.find(p => p.id === providerId)

      // 更新编辑表单
      if (editingModel.value) {
        editingModel.value.providerId = providerId
        editingModel.value.modelId = ''

        // 更新连接配置的 baseURL，保留其他字段
        if (provider?.defaultBaseURL) {
          if (!editingModel.value.connectionConfig) {
            editingModel.value.connectionConfig = {}
          }
          editingModel.value.connectionConfig.baseURL = provider.defaultBaseURL
        }
      }

      // 更新新增表单
      if (showAddForm.value) {
        newModel.value.providerId = providerId
        newModel.value.modelId = ''

        // 更新连接配置的 baseURL，保留其他字段
        if (provider?.defaultBaseURL) {
          if (!newModel.value.connectionConfig) {
            newModel.value.connectionConfig = {}
          }
          newModel.value.connectionConfig.baseURL = provider.defaultBaseURL
        }
      }
    } catch (error) {
      console.error('加载 Provider 模型失败:', error)
    }
  }
}

// 公共错误处理函数
const handleModelFetchError = (error) => {
  console.error('获取模型列表失败:', error);

  // 获取错误信息
  const errorMessage = error && error.message ? error.message : '未知错误';

  // 根据标准化的错误类型进行国际化处理
  let userMessage = '';

  if (errorMessage.includes('CROSS_ORIGIN_CONNECTION_FAILED:')) {
    userMessage = t('modelManager.errors.crossOriginConnectionFailed');
  } else if (errorMessage.includes('CONNECTION_FAILED:')) {
    userMessage = t('modelManager.errors.connectionFailed');
  } else if (errorMessage.includes('MISSING_V1_SUFFIX:')) {
    userMessage = t('modelManager.errors.missingV1Suffix');
  } else if (errorMessage.includes('INVALID_RESPONSE_FORMAT:')) {
    userMessage = t('modelManager.errors.invalidResponseFormat');
  } else if (errorMessage.includes('EMPTY_MODEL_LIST:')) {
    userMessage = t('modelManager.errors.emptyModelList');
  } else if (errorMessage.includes('API_ERROR:')) {
    // 提取API_ERROR:后面的内容
    const apiErrorStart = errorMessage.indexOf('API_ERROR:') + 10;
    userMessage = t('modelManager.errors.apiError', { error: errorMessage.substring(apiErrorStart) });
  } else {
    userMessage = errorMessage; // 其他错误直接显示
  }

  toast.error(userMessage);

  // 清空模型选项，让用户知道获取失败
  modelOptions.value = [];
};

const handleFetchEditingModels = async () => {
  const form = editingModel.value
  if (!form) {
    return
  }

  isLoadingModels.value = true

  try {
    const baseURL = form.connectionConfig.baseURL?.trim()
    if (!baseURL) {
      toast.error(t('modelManager.needBaseUrl'))
      return
    }

    // 始终使用 originalApiKey（真实的 API key），如果不存在则使用当前输入的值
    const apiKeyToUse = form.originalApiKey || form.connectionConfig.apiKey || ''

    console.log('[ModelManager] Fetching models with:', {
      originalApiKey: form.originalApiKey ? `${form.originalApiKey.substring(0, 10)}...` : 'undefined',
      configApiKey: form.connectionConfig.apiKey ? `${form.connectionConfig.apiKey.substring(0, 10)}...` : 'undefined',
      apiKeyToUse: apiKeyToUse ? `${apiKeyToUse.substring(0, 10)}...` : 'undefined',
      providerId: form.providerId
    })

    // 创建临时配置对象用于 API 调用，不修改 form.connectionConfig（避免影响 UI 显示）
    const tempConnectionConfig = {
      ...form.connectionConfig,
      baseURL,
      apiKey: apiKeyToUse
    }

    const existingConfig = await modelManager.getModel(form.originalId)
    const providerTemplateId = form.providerId || existingConfig?.providerMeta?.id || form.originalId

    let providerMeta =
      textProviders.value.find(p => p.id === providerTemplateId)
      || existingConfig?.providerMeta

    let modelMeta = existingConfig?.modelMeta

    if (textAdapterRegistry && providerTemplateId) {
      try {
        const adapter = textAdapterRegistry.getAdapter(providerTemplateId)
        if (!providerMeta) {
          providerMeta = adapter.getProvider()
        }

        const staticModels = adapter.getModels()
        if (form.modelId) {
          modelMeta = staticModels.find(m => m.id === form.modelId) || modelMeta
        }
        if (!modelMeta) {
          modelMeta = staticModels[0]
        }
        if (!modelMeta && form.modelId) {
          modelMeta = adapter.buildDefaultModel(form.modelId)
        }
      } catch (error) {
        console.warn(`[ModelManager] Failed to load metadata for provider ${providerTemplateId}`, error)
      }
    }

    const models = await llmService.fetchModelList(providerTemplateId, {
      connectionConfig: tempConnectionConfig,
      providerMeta,
      modelMeta: modelMeta ? { ...modelMeta, id: form.modelId || modelMeta.id } : undefined
    } as Partial<TextModelConfig>)

    modelOptions.value = models
    toast.success(t('modelManager.fetchModelsSuccess', { count: models.length }))

    if (models.length > 0 && !models.some(m => m.value === form.modelId)) {
      form.modelId = models[0].value
    }
  } catch (error) {
    handleModelFetchError(error)
  } finally {
    isLoadingModels.value = false
  }
}
const handleFetchNewModels = async () => {
  const form = newModel.value
  const baseURL = form.connectionConfig.baseURL?.trim()

  if (!baseURL) {
    toast.error(t('modelManager.needBaseUrl'))
    return
  }

  isLoadingModels.value = true

  try {
    const providerTemplateId = form.providerId || currentProviderType.value || 'custom'

    form.connectionConfig = {
      ...form.connectionConfig,
      baseURL,
      apiKey: form.connectionConfig.apiKey
    }

    const baseModel = await modelManager.getModel(providerTemplateId)

    const models = await llmService.fetchModelList(providerTemplateId, {
      connectionConfig: form.connectionConfig,
      providerMeta: baseModel?.providerMeta,
      modelMeta: baseModel?.modelMeta
    } as Partial<TextModelConfig>)

    modelOptions.value = models
    toast.success(t('modelManager.fetchModelsSuccess', { count: models.length }))

    if (models.length > 0) {
      form.modelId = models[0].value
      form.defaultModel = models[0].value
    }
  } catch (error) {
    handleModelFetchError(error)
  } finally {
    isLoadingModels.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editingModel.value = null;
  modelOptions.value = [];
  // 确保清理所有相关状态
  isLoadingModels.value = false;
};

// 保存编辑
const saveEdit = async () => {
  try {
    const form = editingModel.value
    if (!form) {
      throw new Error('编辑会话无效')
    }

    const existingConfig = await modelManager.getModel(form.originalId)
    if (!existingConfig) {
      throw new Error('模型不存在')
    }

    // 构建连接配置
    const connectionConfig: TextConnectionConfig = {
      ...form.connectionConfig,
      baseURL: form.connectionConfig.baseURL?.trim() || existingConfig.connectionConfig?.baseURL
    }

    if (form.displayMaskedKey) {
      if (form.originalApiKey) {
        connectionConfig.apiKey = form.originalApiKey
      } else {
        delete connectionConfig.apiKey
      }
    } else if (form.connectionConfig.apiKey) {
      connectionConfig.apiKey = form.connectionConfig.apiKey
    } else {
      delete connectionConfig.apiKey
    }

    const paramOverrides = { ...(form.paramOverrides || {}) }

    // 根据当前选择的 providerId 获取最新的 Provider 元数据
    let providerMeta = existingConfig.providerMeta
    if (form.providerId !== existingConfig.providerMeta?.id && textAdapterRegistry) {
      try {
        const adapter = textAdapterRegistry.getAdapter(form.providerId)
        providerMeta = adapter.getProvider()
      } catch (error) {
        console.warn(`无法获取 Provider ${form.providerId}，使用现有配置`, error)
      }
    }

    // 根据当前选择的 modelId 构建 ModelMeta
    let modelMeta: TextModel = existingConfig.modelMeta

    // 如果 providerId 改变，需要从新 provider 获取模型元数据
    if (form.providerId !== existingConfig.providerMeta?.id && textAdapterRegistry) {
      try {
        const adapter = textAdapterRegistry.getAdapter(form.providerId)
        const staticModels = adapter.getModels()
        const foundModel = staticModels.find(m => m.id === form.modelId)

        if (foundModel) {
          modelMeta = foundModel
        } else {
          // 如果在静态列表中找不到，创建一个新的 ModelMeta
          modelMeta = {
            ...existingConfig.modelMeta,
            id: form.modelId,
            name: form.modelId,
            providerId: form.providerId
          }
        }
      } catch (error) {
        console.warn(`无法从 Provider ${form.providerId} 获取模型，使用默认配置`, error)
        modelMeta = {
          ...existingConfig.modelMeta,
          id: form.modelId,
          name: form.modelId,
          providerId: form.providerId
        }
      }
    } else if (form.modelId && form.modelId !== existingConfig.modelMeta.id && textAdapterRegistry) {
      // providerId 没变，但 modelId 改变了，需要从当前 provider 获取新模型的完整元数据
      try {
        const adapter = textAdapterRegistry.getAdapter(form.providerId)
        const staticModels = adapter.getModels()
        const foundModel = staticModels.find(m => m.id === form.modelId)

        if (foundModel) {
          // 使用找到的完整模型元数据（包含 capabilities、parameterDefinitions 等）
          modelMeta = foundModel
        } else {
          // 如果在静态列表中找不到，创建基础元数据
          modelMeta = { ...existingConfig.modelMeta, id: form.modelId, name: form.modelId }
        }
      } catch (error) {
        console.warn(`无法从 Provider ${form.providerId} 获取模型，使用默认配置`, error)
        modelMeta = { ...existingConfig.modelMeta, id: form.modelId, name: form.modelId }
      }
    }

    const updates: Partial<TextModelConfig> = {
      name: form.name,
      enabled: form.enabled,
      providerMeta,
      modelMeta,
      connectionConfig,
      paramOverrides
    }

    await modelManager.updateModel(form.originalId, updates)

    await loadModels()
    emit('modelsUpdated', form.originalId)

    isEditing.value = false
    editingModel.value = null

    toast.success(t('modelManager.updateSuccess'))
  } catch (error) {
    console.error('更新模型失败:', error)
    toast.error(t('modelManager.updateFailed', { error: error.message }))
  }
}

// =============== 添加相关函数 ===============
// 添加自定义模型
const addCustomModel = async () => {
  try {
    const form = newModel.value

    if (!form.id) {
      toast.error(t('modelManager.modelKeyRequired'))
      return
    }

    // 从 registry 获取当前选择的 provider 信息
    if (!textAdapterRegistry) {
      throw new Error('textAdapterRegistry 未初始化')
    }

    let providerMeta: TextProvider
    let modelMeta: TextModel

    try {
      const adapter = textAdapterRegistry.getAdapter(form.providerId)
      providerMeta = adapter.getProvider()

      // 尝试从静态模型列表中找到选择的模型
      const staticModels = adapter.getModels()
      const modelId = form.defaultModel || form.modelId
      const foundModel = staticModels.find(m => m.id === modelId)

      if (foundModel) {
        // 使用完整的模型元数据（包含 capabilities、parameterDefinitions 等）
        modelMeta = foundModel
      } else {
        // 如果找不到，创建基础的 modelMeta
        modelMeta = {
          id: modelId,
          name: modelId,
          description: `Custom model: ${modelId}`,
          providerId: form.providerId,
          capabilities: {
            supportsStreaming: true,
            supportsTools: false,
            supportsReasoning: false
          }
        }
      }
    } catch (error) {
      console.error(`无法从 Provider ${form.providerId} 获取信息:`, error)
      throw new Error(`无法找到 Provider ${form.providerId}`)
    }

    const connectionConfig: TextConnectionConfig = {
      ...form.connectionConfig
    }

    const paramOverrides = {
      ...(form.paramOverrides ?? {})
    }

    const newConfig: TextModelConfig = {
      id: form.id,
      name: form.name,
      enabled: true,
      providerMeta,
      modelMeta,
      connectionConfig,
      paramOverrides
    }

    await modelManager.addModel(form.id, newConfig)
    await loadModels()
    showAddForm.value = false
    emit('modelsUpdated', form.id)
    newModel.value = {
      id: '',
      name: '',
      providerId: textProviders.value[0]?.id || '',
      modelId: '',
      connectionConfig: {},
      defaultModel: '',
      paramOverrides: {}
    }
    toast.success(t('modelManager.createSuccess'))
  } catch (error) {
    console.error('添加模型失败:', error)
    toast.error(t('modelManager.createFailed', { error: error.message }))
  }
};

// =============== 监听器 ===============
// 当编辑或创建表单打开/关闭时，重置状态
watch(() => editingModel.value?.connectionConfig.apiKey, (newValue) => {
  if (!editingModel.value) return
  const val = newValue ?? ''
  const isMasked = !!val && val.includes('*')
  editingModel.value.displayMaskedKey = isMasked

  if (!isMasked) {
    editingModel.value.originalApiKey = val
  }
});

 // =============== Advanced Parameters Computed Properties ===============
 const currentParamOverrides = computed(() => {
   return isEditing.value ? (editingModel.value?.paramOverrides || {}) : newModel.value.paramOverrides;
 });
 
 const currentProviderType = computed(() => {
   if (isEditing.value) {
     return editingModel.value?.providerId || 'custom';
   }
   return newModel.value.providerId || 'custom';
 });
 
const getParamMetadata = (paramName) => {
  if (!advancedParameterDefinitions) return null;
  // Ensure currentProviderType.value is valid before using in .includes()
  const provider = currentProviderType.value || 'custom';
  const definition = advancedParameterDefinitions.find(def => def.name === paramName && def.appliesToProviders.includes(provider));
  
  if (definition) {
    return {
      ...definition,
      label: definition.labelKey ? t(definition.labelKey) : definition.name,
      description: definition.descriptionKey ? t(definition.descriptionKey) : `(${paramName})`, // Fallback description
      unit: definition.unitKey ? t(definition.unitKey) : (definition.unit || '')
    };
  }
  return null; // For custom params or if not found
};

const availableLLMParamDefinitions = computed(() => {
  if (!advancedParameterDefinitions) return [];
  const currentParams = currentParamOverrides.value || {};
  const provider = currentProviderType.value || 'custom';
  
  return advancedParameterDefinitions.filter(def => 
    def.appliesToProviders.includes(provider) &&
    !Object.keys(currentParams).includes(def.name)
  );
});

const removeLLMParam = (paramKey) => {
  if (currentParamOverrides.value) {
    delete currentParamOverrides.value[paramKey];
    // Vue 3 might need a bit more help for reactivity on nested objects if not using Vue.set or Vue.delete
    // However, direct deletion and assignment for the whole paramOverrides object during save should be fine.
    // For local reactivity within the form, this should work.
  }
};

const quickAddLLMParam = () => {
  const paramsObject = currentParamOverrides.value;
  if (!paramsObject) return; // Should not happen if initialized correctly

  if (selectedNewLLMParamId.value === 'custom') {
    if (customLLMParam.value.key && !paramsObject[customLLMParam.value.key]) {
      // For custom params, initially store value as string.
      // Type conversion can be attempted by user or upon processing if needed.
      paramsObject[customLLMParam.value.key] = customLLMParam.value.value; 
    }
    customLLMParam.value = { key: '', value: '' }; // Reset custom input
  } else {
    const definition = advancedParameterDefinitions.find(def => def.id === selectedNewLLMParamId.value);
    if (definition && !paramsObject[definition.name]) {
      let val = definition.defaultValue;
      // Basic type handling for default values
      if (definition.type === 'boolean') {
        val = (val === undefined) ? false : Boolean(val);
      } else if (definition.type === 'integer' && val !== undefined) {
        val = parseInt(String(val), 10);
      } else if (definition.type === 'number' && val !== undefined) {
        val = parseFloat(String(val));
      } else if (definition.name === 'stopSequences') { // Special handling for stopSequences
         val = Array.isArray(val) ? val : ( (typeof val === 'string' && val) ? val.split(',').map(s => s.trim()).filter(s => s) : [] );
      }
      // All other types, including string, or if val is undefined, will use val as is.
      paramsObject[definition.name] = val;
    }
  }
  selectedNewLLMParamId.value = ''; // Reset select
};

// 处理快速添加参数（选择后立即添加）
const handleQuickAddParam = () => {
  if (selectedNewLLMParamId.value !== 'custom') {
    quickAddLLMParam();
  }
  // 如果是custom，等待用户输入完成后再添加
};

// 处理自定义参数添加
const handleCustomParamAdd = () => {
  if (customLLMParam.value.key && customLLMParam.value.value) {
    quickAddLLMParam();
  }
};

// 取消自定义参数输入
const cancelCustomParam = () => {
  selectedNewLLMParamId.value = '';
  customLLMParam.value = { key: '', value: '' };
};

// 验证参数是否有效
const isParamInvalid = (paramName, value) => {
  const metadata = getParamMetadata(paramName);
  // 如果是自定义参数（没有metadata），只做基础验证
  if (!metadata) {
    // 对自定义参数进行基础验证：不能为空且不能包含危险字符
    if (value === undefined || value === null || value === '') return false;
    
    // 检查是否包含潜在危险的参数名
    const dangerousNames = ['eval', 'exec', 'script', '__proto__', 'constructor'];
    if (dangerousNames.some(dangerous => paramName.toLowerCase().includes(dangerous))) {
      return true;
    }
    
    return false;
  }
  
  if (value === undefined || value === null || value === '') return false;
  
  if (metadata.type === 'number' || metadata.type === 'integer') {
    const numValue = Number(value);
    if (isNaN(numValue)) return true;
    
    if (metadata.minValue !== undefined && numValue < metadata.minValue) return true;
    if (metadata.maxValue !== undefined && numValue > metadata.maxValue) return true;
    
    if (metadata.type === 'integer' && !Number.isInteger(numValue)) return true;
  }
  
  return false;
};

// 获取参数验证错误信息
const getParamValidationMessage = (paramName, value) => {
  const metadata = getParamMetadata(paramName);
  // 自定义参数的错误信息
  if (!metadata) {
    const dangerousNames = ['eval', 'exec', 'script', '__proto__', 'constructor'];
    if (dangerousNames.some(dangerous => paramName.toLowerCase().includes(dangerous))) {
      return t('modelManager.advancedParameters.validation.dangerousParam');
    }
    return '';
  }
  
  if (metadata.type === 'number' || metadata.type === 'integer') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return t('modelManager.advancedParameters.validation.invalidNumber', {
        type: metadata.type === 'integer' ? t('common.integer') : t('common.number')
      });
    }
    
    if (metadata.minValue !== undefined && numValue < metadata.minValue) {
      return t('modelManager.advancedParameters.validation.belowMin', {
        min: metadata.minValue
      });
    }
    if (metadata.maxValue !== undefined && numValue > metadata.maxValue) {
      return t('modelManager.advancedParameters.validation.aboveMax', {
        max: metadata.maxValue
      });
    }
    
    if (metadata.type === 'integer' && !Number.isInteger(numValue)) {
      return t('modelManager.advancedParameters.validation.mustBeInteger');
    }
  }
  
  return '';
};

watch(() => newModel.value.modelId, (val) => {
  newModel.value.defaultModel = val || ''
});


// =============== 图像模型管理函数 ===============
// 处理添加图像模型
const handleAddImageModel = () => {
  editingImageModelId.value = undefined;
  showImageModelEdit.value = true;
};

// 处理编辑图像模型
const handleEditImageModel = (configId: string) => {
  editingImageModelId.value = configId;
  showImageModelEdit.value = true;
};

// 处理图像模型保存完成
const handleImageModelSaved = () => {
  showImageModelEdit.value = false;
  editingImageModelId.value = undefined;
  // 刷新图像模型列表
  try { imageListRef.value?.refresh?.() } catch {}
};

// =============== 生命周期钩子 ===============
// 初始化
onMounted(() => {
  loadModels();
  loadTextProviders();  // 加载文本模型 Providers
  // 图像模型的加载由 ImageModelManager 组件处理
});
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

/* 文本截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
