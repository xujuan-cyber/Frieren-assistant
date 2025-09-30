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
            :key="model.key"
            hoverable
            :style="{
              opacity: model.enabled ? 1 : 0.6
            }"
          >
            <template #header>
              <NSpace justify="space-between" align="center">
                <NSpace vertical :size="4">
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
                  <NText depth="3" style="font-size: 14px;">
                    {{ model.model }}
                  </NText>
                </NSpace>
              </NSpace>
            </template>
            
            <template #header-extra>
              <NSpace @click.stop>
                <NButton
                  @click="testConnection(model.key)"
                  size="small"
                  quaternary
                  :disabled="isTestingConnectionFor(model.key)"
                  :loading="isTestingConnectionFor(model.key)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </template>
                  <span class="hidden md:inline">{{ t('modelManager.testConnection') }}</span>
                </NButton>
                
                <NButton
                  @click="editModel(model.key)"
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
                  @click="model.enabled ? disableModel(model.key) : enableModel(model.key)"
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
                  v-if="!isDefaultModel(model.key)"
                  @click="handleDelete(model.key)"
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
      <NSpace vertical :size="16">
        <form @submit.prevent="saveEdit">
          <NSpace vertical :size="16">
            <NSpace vertical :size="8">
              <NText tag="label" strong>{{ t('modelManager.displayName') }}</NText>
              <NInput
                v-model:value="editingModel.name"
                :placeholder="t('modelManager.displayNamePlaceholder')"
                required
              />
            </NSpace>
              
              <NSpace vertical :size="8">
                <NText tag="label" strong>
                  {{ t('modelManager.apiUrl') }}
                  <NText depth="3" style="margin-left: 4px;" :title="t('modelManager.apiUrlHint')">?</NText>
                </NText>
                <NInput
                  v-model:value="editingModel.baseURL"
                  :placeholder="t('modelManager.apiUrlPlaceholder')"
                  required
                />
              </NSpace>
              
              <NSpace vertical :size="8">
                <NText tag="label" strong>{{ t('modelManager.apiKey') }}</NText>
                <NInput
                  v-model:value="editingModel.apiKey"
                  type="password"
                  autocomplete="off"
                  :placeholder="t('modelManager.apiKeyPlaceholder')"
                />
              </NSpace>
              
              <NSpace vertical :size="8">
                <NText tag="label" strong>{{ t('modelManager.defaultModel') }}</NText>
                <InputWithSelect
                  v-model="editingModel.defaultModel"
                  :options="modelOptions"
                  :is-loading="isLoadingModels"
                  :loading-text="t('modelManager.loadingModels')"
                  :no-options-text="t('modelManager.noModelsAvailable')"
                  :hint-text="t('modelManager.clickToFetchModels')"
                  required
                  :placeholder="t('modelManager.defaultModelPlaceholder')"
                  @fetch-options="handleFetchEditingModels"
                />
              </NSpace>
              
              <!-- Advanced Parameters Section -->
              <NDivider style="margin: 20px 0;" />
              <NSpace justify="space-between" align="center" style="margin-bottom: 16px;">
                <NSpace vertical :size="4">
                  <NH4 style="margin: 0;">{{ t('modelManager.advancedParameters.title') }}</NH4>
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
                
                <NText v-if="Object.keys(currentLLMParams || {}).length === 0" depth="3" style="font-size: 14px; margin-bottom: 12px;">
                  {{ t('modelManager.advancedParameters.noParamsConfigured') }}
                </NText>

                <!-- 参数显示 -->
                <NSpace vertical :size="12">
                  <NCard
                    v-for="(value, key) in currentLLMParams"
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
                        v-model:checked="currentLLMParams[key]"
                      >
                        {{ currentLLMParams[key] ? t('common.enabled') : t('common.disabled') }}
                      </NCheckbox>
                      
                      <!-- Number/Integer 类型 -->
                      <NSpace
                        v-else-if="getParamMetadata(key)?.type === 'number' || (getParamMetadata(key)?.type === 'integer' && getParamMetadata(key)?.name !== 'stopSequences')"
                        vertical :size="4"
                      >
                        <NInputNumber
                          v-model:value="currentLLMParams[key]"
                          :min="getParamMetadata(key)?.minValue"
                          :max="getParamMetadata(key)?.maxValue"
                          :step="getParamMetadata(key)?.step"
                          :placeholder="getParamMetadata(key)?.defaultValue !== undefined ? String(getParamMetadata(key)?.defaultValue) : ''"
                          :status="isParamInvalid(key, currentLLMParams[key]) ? 'error' : undefined"
                        />
                        
                        <NText
                          v-if="getParamMetadata(key)?.minValue !== undefined && getParamMetadata(key)?.maxValue !== undefined"
                          depth="3"
                          style="font-size: 12px;"
                        >
                          范围: {{ getParamMetadata(key)?.minValue }} - {{ getParamMetadata(key)?.maxValue }}{{ getParamMetadata(key)?.unit || '' }}
                        </NText>
                        
                        <NText
                          v-if="isParamInvalid(key, currentLLMParams[key])"
                          type="error"
                          style="font-size: 12px;"
                        >
                          {{ getParamValidationMessage(key, currentLLMParams[key]) }}
                        </NText>
                      </NSpace>
                      
                      <!-- String 类型 -->
                      <NSpace v-else vertical :size="4">
                        <NInput
                          v-model:value="currentLLMParams[key]"
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
            </NSpace>
          </form>
        </NSpace>
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
          <NSpace vertical :size="16">
            <NSpace vertical :size="8">
              <NText tag="label" strong>{{ t('modelManager.modelKey') }}</NText>
              <NInput
                v-model:value="newModel.key"
                :placeholder="t('modelManager.modelKeyPlaceholder')"
                required
              />
            </NSpace>
            
            <NSpace vertical :size="8">
              <NText tag="label" strong>{{ t('modelManager.displayName') }}</NText>
              <NInput
                v-model:value="newModel.name"
                :placeholder="t('modelManager.displayNamePlaceholder')"
                required
              />
            </NSpace>
            
            <NSpace vertical :size="8">
              <NText tag="label" strong>
                {{ t('modelManager.apiUrl') }}
                <NText depth="3" style="margin-left: 4px;" :title="t('modelManager.apiUrlHint')">?</NText>
              </NText>
              <NInput
                v-model:value="newModel.baseURL"
                :placeholder="t('modelManager.apiUrlPlaceholder')"
                required
              />
            </NSpace>
            
            <NSpace vertical :size="8">
              <NText tag="label" strong>{{ t('modelManager.apiKey') }}</NText>
              <NInput
                v-model:value="newModel.apiKey"
                type="password"
                autocomplete="off"
                :placeholder="t('modelManager.apiKeyPlaceholder')"
              />
            </NSpace>
            
            <NSpace vertical :size="8">
              <NText tag="label" strong>{{ t('modelManager.defaultModel') }}</NText>
              <InputWithSelect
                v-model="newModel.defaultModel"
                :options="modelOptions"
                :is-loading="isLoadingModels"
                :loading-text="t('modelManager.loadingModels')"
                :no-options-text="t('modelManager.noModelsAvailable')"
                :hint-text="t('modelManager.clickToFetchModels')"
                required
                :placeholder="t('modelManager.defaultModelPlaceholder')"
                @fetch-options="handleFetchNewModels"
              />
            </NSpace>
            <!-- Advanced Parameters Section FOR ADD MODEL -->
            <NDivider style="margin: 20px 0;" />
            <NSpace justify="space-between" align="center" style="margin-bottom: 16px;">
              <NSpace vertical :size="4">
                <NH4 style="margin: 0;">{{ t('modelManager.advancedParameters.title') }}</NH4>
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
              
              <NText v-if="Object.keys(currentLLMParams || {}).length === 0" depth="3" style="font-size: 14px; margin-bottom: 12px;">
                {{ t('modelManager.advancedParameters.noParamsConfigured') }}
              </NText>

              <!-- 参数显示 -->
              <NSpace vertical :size="12">
                <NCard
                  v-for="(value, key) in currentLLMParams"
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
                      v-model:checked="currentLLMParams[key]"
                    >
                      {{ currentLLMParams[key] ? t('common.enabled') : t('common.disabled') }}
                    </NCheckbox>
                    
                    <!-- Number/Integer 类型 -->
                    <NSpace
                      v-else-if="getParamMetadata(key)?.type === 'number' || (getParamMetadata(key)?.type === 'integer' && getParamMetadata(key)?.name !== 'stopSequences')"
                      vertical :size="4"
                    >
                      <NInputNumber
                        v-model:value="currentLLMParams[key]"
                        :min="getParamMetadata(key)?.minValue"
                        :max="getParamMetadata(key)?.maxValue"
                        :step="getParamMetadata(key)?.step"
                        :placeholder="getParamMetadata(key)?.defaultValue !== undefined ? String(getParamMetadata(key)?.defaultValue) : ''"
                        :status="isParamInvalid(key, currentLLMParams[key]) ? 'error' : undefined"
                      />
                      
                      <NText
                        v-if="getParamMetadata(key)?.minValue !== undefined && getParamMetadata(key)?.maxValue !== undefined"
                        depth="3"
                        style="font-size: 12px;"
                      >
                        范围: {{ getParamMetadata(key)?.minValue }} - {{ getParamMetadata(key)?.maxValue }}{{ getParamMetadata(key)?.unit || '' }}
                      </NText>
                      
                      <NText
                        v-if="isParamInvalid(key, currentLLMParams[key])"
                        type="error"
                        style="font-size: 12px;"
                      >
                        {{ getParamValidationMessage(key, currentLLMParams[key]) }}
                      </NText>
                    </NSpace>
                    
                    <!-- String 类型 -->
                    <NSpace v-else vertical :size="4">
                      <NInput
                        v-model:value="currentLLMParams[key]"
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
  NInput, NInputNumber, NCheckbox, NDivider, NSelect, NTabs, NTabPane
} from 'naive-ui';
import {
  advancedParameterDefinitions,
} from '@prompt-optimizer/core';
import { useToast } from '../composables/useToast';
import InputWithSelect from './InputWithSelect.vue'
import ImageModelManager from './ImageModelManager.vue'
import ImageModelEditModal from './ImageModelEditModal.vue'


const { t } = useI18n()
const toast = useToast();
const emit = defineEmits(['modelsUpdated', 'close', 'select', 'update:show']);

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
  if (activeTab.value === 'text') showAddForm.value = true
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
const modelOptions = ref([]);
const isLoadingModels = ref(false);
const testingConnections = ref({});
// For Advanced Parameters UI
const selectedNewLLMParamId = ref(''); // Stores ID of param selected from dropdown
const customLLMParam = ref({ key: '', value: '' });

// 数据状态
const models = ref([]);
const editingModel = ref(null);

// 表单状态
const newModel = ref({
  key: '',
  name: '',
  baseURL: '',
  defaultModel: '',
  apiKey: '',
  provider: 'custom',
  llmParams: {}
});
// 加载所有模型
const loadModels = async () => {
  try {
    // 强制刷新模型数据，使用异步调用
    const allModels = await modelManager.getAllModels();
    
    // 使用深拷贝确保响应式更新
    models.value = JSON.parse(JSON.stringify(allModels)).sort((a, b) => {
      // 启用的模型排在前面
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
      }
      // 默认模型排在前面
      if (isDefaultModel(a.key) !== isDefaultModel(b.key)) {
        return isDefaultModel(a.key) ? -1 : 1;
      }
      return 0;
    });
    
    console.log('处理后的模型列表:', models.value.map(m => ({
      key: m.key,
      name: m.name,
      enabled: m.enabled,
      hasApiKey: !!m.apiKey
    })));
    
    emit('modelsUpdated', models.value[0]?.key);
  } catch (error) {
    console.error('加载模型列表失败:', error);
    toast.error('加载模型列表失败');
  }
};

// 判断是否为默认模型
const isDefaultModel = (key) => {
  return ['openai', 'gemini', 'deepseek', 'zhipu'].includes(key);
};

// =============== 模型管理函数 ===============
// 测试连接
const isTestingConnectionFor = (key) => !!testingConnections.value[key];
const testConnection = async (key) => {
  if (isTestingConnectionFor(key)) return;
  try {
    testingConnections.value[key] = true;
    const model = await modelManager.getModel(key);
    if (!model) throw new Error(t('modelManager.noModelsAvailable'));

    // 不再需要手动创建LLMService，使用注入的实例
    await llmService.testConnection(key);
    toast.success(t('modelManager.testSuccess', { provider: model.name }));
  } catch (error) {
    console.error('连接测试失败:', error);
    const model = await modelManager.getModel(key);
    const modelName = model?.name || key;
    toast.error(t('modelManager.testFailed', {
      provider: modelName,
      error: error.message || 'Unknown error'
    }));
  } finally {
    delete testingConnections.value[key];
  }
};

// 处理删除
const handleDelete = async (key) => {
  if (confirm(t('modelManager.deleteConfirm'))) {
    try {
      await modelManager.deleteModel(key)
      await loadModels()
      toast.success(t('modelManager.deleteSuccess'))
    } catch (error) {
      console.error('删除模型失败:', error)
      toast.error(t('modelManager.deleteFailed', { error: error.message }))
    }
  }
};

// 启用模型
const enableModel = async (key) => {
  try {
    const model = await modelManager.getModel(key)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    await modelManager.enableModel(key)
    await loadModels()
    emit('modelsUpdated', key)
    toast.success(t('modelManager.enableSuccess'))
  } catch (error) {
    console.error('启用模型失败:', error)
    toast.error(t('modelManager.enableFailed', { error: error.message }))
  }
}

// 禁用模型
const disableModel = async (key) => {
  try {
    const model = await modelManager.getModel(key)
    if (!model) throw new Error(t('modelManager.noModelsAvailable'))

    await modelManager.disableModel(key)
    await loadModels()
    emit('modelsUpdated', key)
    toast.success(t('modelManager.disableSuccess'))
  } catch (error) {
    console.error('禁用模型失败:', error)
    toast.error(t('modelManager.disableFailed', { error: error.message }))
  }
}


// =============== 编辑相关函数 ===============
// 编辑模型
const editModel = async (key) => {
  const model = await modelManager.getModel(key);
  if (model) {
    // 为API密钥创建加密显示文本
    let maskedApiKey = '';
    if (model.apiKey) {
      // 显示密钥的前四位和后四位，中间用星号代替
      const keyLength = model.apiKey.length;
      if (keyLength <= 8) {
        maskedApiKey = '*'.repeat(keyLength);
      } else {
        const visiblePart = 4;
        const prefix = model.apiKey.substring(0, visiblePart);
        const suffix = model.apiKey.substring(keyLength - visiblePart);
        const maskedLength = keyLength - (visiblePart * 2);
        maskedApiKey = `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
      }
    }

    // 创建临时配置对象
    editingModel.value = {
      originalKey: key, // 保存原始key
      name: model.name,
      baseURL: model.baseURL,
      defaultModel: typeof model.defaultModel === 'string' ? model.defaultModel : (model.defaultModel?.value || model.defaultModel?.id || ''),
      apiKey: maskedApiKey,
      displayMaskedKey: true,
      originalApiKey: model.apiKey,
      provider: model.provider || 'custom', // Ensure provider is set
      enabled: model.enabled,
      llmParams: model.llmParams ? JSON.parse(JSON.stringify(model.llmParams)) : {} // Deep copy llmParams
    };
    
    // 初始化模型选项
    modelOptions.value = model.models && model.models.length > 0 
      ? model.models.map(m => ({ value: m, label: m }))
      : [{ value: model.defaultModel, label: model.defaultModel }];
    
    isEditing.value = true;
  }
};


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
  if (!editingModel.value) {
    return;
  }
  
  isLoadingModels.value = true;
  
  try {
    // 获取要使用的配置
    let apiKey = editingModel.value.apiKey;
    const baseURL = editingModel.value.baseURL;
    
    // 如果是掩码密钥，使用原始密钥
    if (editingModel.value.displayMaskedKey && editingModel.value.originalKey) {
      const originalModel = await modelManager.getModel(editingModel.value.originalKey);
      if (originalModel && originalModel.apiKey) {
        apiKey = originalModel.apiKey;
      }
    }
    
    // 检查必要的参数 - API key允许为空
    if (!baseURL) {
      toast.error(t('modelManager.needBaseUrl'));
      return;
    }
    
    // 使用注入的 LLM 服务获取模型列表
    // const llm = createLLMService(modelManager);
    
    // 构建自定义配置
    const customConfig = {
      baseURL: baseURL,
      apiKey: apiKey,
      provider: editingModel.value.provider || 'custom'
    };
    
    // 确定要使用的 provider key（使用原始key或临时key）
    const providerKey = editingModel.value.originalKey || editingModel.value.key;
    
    // 获取模型列表
    const models = await llmService.fetchModelList(providerKey, customConfig);
    
    // 现在后端会在没有模型时直接抛出错误，所以这里只处理成功的情况
    modelOptions.value = models;
    toast.success(t('modelManager.fetchModelsSuccess', {count: models.length}));

    // 如果当前选择的模型不在列表中，默认选择第一个
    if (models.length > 0 && !models.some(m => m.value === editingModel.value.defaultModel)) {
      editingModel.value.defaultModel = models[0].value;
    }
  } catch (error) {
    // 使用公共错误处理函数
    handleModelFetchError(error);
  } finally {
    isLoadingModels.value = false;
  }
};
const handleFetchNewModels = async () => {
  if (!newModel.value) {
    return;
  }
  
  const apiKey = newModel.value.apiKey;
  const baseURL = newModel.value.baseURL;
  const provider = newModel.value.key || 'custom';
  
  // 检查必要的参数 - API key允许为空
  if (!baseURL) {
    toast.error(t('modelManager.needBaseUrl'));
    return;
  }
  
  isLoadingModels.value = true;
  
  try {
    // 使用注入的 LLM 服务获取模型列表
    // const llm = createLLMService(modelManager);
    
    // 构建自定义配置
    const customConfig = {
      baseURL: baseURL,
      apiKey: apiKey,
      provider: currentProviderType.value || 'custom'
    };
    
    // 获取模型列表
    const models = await llmService.fetchModelList(provider, customConfig);
    
    // 现在后端会在没有模型时直接抛出错误，所以这里只处理成功的情况
    modelOptions.value = models;
    toast.success(t('modelManager.fetchModelsSuccess', {count: models.length}));

    // 默认选择第一个模型
    if (models.length > 0) {
      newModel.value.defaultModel = models[0].value;
    }
  } catch (error) {
    // 使用公共错误处理函数
    handleModelFetchError(error);
  } finally {
    isLoadingModels.value = false;
  }
};

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
    if (!editingModel.value || !editingModel.value.originalKey) {
      throw new Error('编辑会话无效');
    }
    
    const originalKey = editingModel.value.originalKey;
    
    // 创建更新配置对象，ElectronProxy会自动处理序列化
    const config = {
      name: editingModel.value.name,
      baseURL: editingModel.value.baseURL,
      // 如果是掩码密钥，使用原始密钥；否则使用新输入的密钥
      apiKey: editingModel.value.displayMaskedKey
        ? editingModel.value.originalApiKey
        : editingModel.value.apiKey,
      defaultModel: editingModel.value.defaultModel,
      // 确保models数组包含defaultModel，避免验证错误
      models: modelOptions.value.length > 0
        ? modelOptions.value.map(opt => opt.value)
        : [editingModel.value.defaultModel],
      provider: editingModel.value.provider || 'custom',
      enabled: editingModel.value.enabled !== undefined
        ? editingModel.value.enabled
        : true,
      llmParams: editingModel.value.llmParams || {}
    };
    
    // 直接更新原始模型
    await modelManager.updateModel(originalKey, config);
    
    // 重新加载模型列表
    await loadModels();
    
    // 触发更新事件
    emit('modelsUpdated', originalKey);
    
    // 清理临时状态
    isEditing.value = false;
    editingModel.value = null;
    
    toast.success(t('modelManager.updateSuccess'));
  } catch (error) {
    console.error('更新模型失败:', error);
    toast.error(t('modelManager.updateFailed', { error: error.message }));
  }
};

// =============== 添加相关函数 ===============
// 添加自定义模型
const addCustomModel = async () => {
  try {
    // ElectronProxy会自动处理序列化
    const config = {
      name: newModel.value.name,
      baseURL: newModel.value.baseURL,
      // 确保models数组包含defaultModel，避免验证错误
      models: modelOptions.value.length > 0
        ? modelOptions.value.map(opt => opt.value)
        : [newModel.value.defaultModel],
      defaultModel: newModel.value.defaultModel,
      apiKey: newModel.value.apiKey,
      enabled: true,
      provider: currentProviderType.value || 'custom',
      llmParams: newModel.value.llmParams || {}
    }

    await modelManager.addModel(newModel.value.key, config)
    await loadModels()
    showAddForm.value = false
    // 修改这里，传递新添加的模型的 key
    emit('modelsUpdated', newModel.value.key)
    newModel.value = {
      key: '',
      name: '',
      baseURL: '',
      defaultModel: '',
      apiKey: '',
      provider: 'custom',
      llmParams: {}
    }
    toast.success('模型添加成功')
  } catch (error) {
    console.error('添加模型失败:', error)
    toast.error(`添加模型失败: ${error.message}`)
  }
};

// =============== 监听器 ===============
// 当编辑或创建表单打开/关闭时，重置状态
watch(() => editingModel.value?.apiKey, (newValue) => {
  if (editingModel.value && newValue) {
    // 如果新输入的密钥不包含星号，标记为非掩码
    editingModel.value.displayMaskedKey = newValue.includes('*');
  }
});

 // =============== Advanced Parameters Computed Properties ===============
 const currentLLMParams = computed(() => {
   return isEditing.value ? (editingModel.value?.llmParams || {}) : newModel.value.llmParams;
 });
 
 const currentProviderType = computed(() => {
   if (isEditing.value) {
     return editingModel.value?.provider || 'custom';
   }
   // For new models, derive from key if it matches a known provider, else default to 'custom'
   // This helps in suggesting relevant advanced parameters early.
   const knownProviders = ['openai', 'gemini', 'deepseek', 'zhipu', 'siliconflow'];
   if (newModel.value.key && knownProviders.includes(newModel.value.key.toLowerCase())) {
     return newModel.value.key.toLowerCase();
   }
   return newModel.value.provider || 'custom';
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
  const currentParams = currentLLMParams.value || {};
  const provider = currentProviderType.value || 'custom';
  
  return advancedParameterDefinitions.filter(def => 
    def.appliesToProviders.includes(provider) &&
    !Object.keys(currentParams).includes(def.name)
  );
});

const removeLLMParam = (paramKey) => {
  if (currentLLMParams.value) {
    delete currentLLMParams.value[paramKey];
    // Vue 3 might need a bit more help for reactivity on nested objects if not using Vue.set or Vue.delete
    // However, direct deletion and assignment for the whole llmParams object during save should be fine.
    // For local reactivity within the form, this should work.
  }
};

const quickAddLLMParam = () => {
  const paramsObject = currentLLMParams.value;
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

watch(() => newModel.value.key, (newKey) => {
  // If the key changes and implies a different provider type for a new model, 
  // it might be good to reset llmParams or re-evaluate defaults.
  // For simplicity now, we can reset if the key change might imply a different context.
  // This is a basic reset; more sophisticated logic could merge common params if desired.
  const knownProviders = ['openai', 'gemini', 'deepseek', 'zhipu', 'siliconflow'];
  let newProvider = 'custom';
  if (newKey && knownProviders.includes(newKey.toLowerCase())) {
    newProvider = newKey.toLowerCase();
  }
  
  if (newModel.value.provider !== newProvider) {
     // If provider type effectively changes, reset llmParams.
     // This helps if user types "openai", then changes mind to "gemini".
     // The UI will then show relevant default params for "gemini".
    newModel.value.llmParams = {};
    newModel.value.provider = newProvider; // Update the provider field too
  } else if (newModel.value.provider === 'custom' && newProvider === 'custom' && newModel.value.key !== '') {
    // If still custom but key has changed, it's a new custom model, reset llmParams
    newModel.value.llmParams = {};
  }
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
