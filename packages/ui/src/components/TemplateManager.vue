<template>
  <NModal
    :show="show"
    preset="card"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    :title="t('templateManager.title')"
    size="large"
    :bordered="false"
    :segmented="true"
    @update:show="(value: boolean) => !value && close()"
  >
    <template #header-extra>
      <NSpace>
        <NButton
          quaternary
          circle
          @click="showSyntaxGuide = true"
          :title="t('templateManager.syntaxGuide')"
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          </template>
        </NButton>
        <BuiltinTemplateLanguageSwitch @language-changed="handleLanguageChanged" />
      </NSpace>
    </template>

    <!-- 类型切换：一行网格自动分两行，每行三列，按钮全宽（更易扩展） -->
    <NGrid :cols="3" :x-gap="8" :y-gap="8">
      <NGridItem>
        <NButton block :type="currentCategory==='system-optimize' ? 'primary' : 'default'" @click="currentCategory='system-optimize'">
          {{ `🎯 ${t('templateManager.optimizeTemplates')}` }}
        </NButton>
      </NGridItem>
      <NGridItem>
        <NButton block :type="currentCategory==='user-optimize' ? 'primary' : 'default'" @click="currentCategory='user-optimize'">
          {{ `👤 ${t('templateManager.userOptimizeTemplates')}` }}
        </NButton>
      </NGridItem>
      <NGridItem>
        <NButton block :type="currentCategory==='iterate' ? 'primary' : 'default'" @click="currentCategory='iterate'">
          {{ `🔄 ${t('templateManager.iterateTemplates')}` }}
        </NButton>
      </NGridItem>

      <NGridItem>
        <NButton block :type="currentCategory==='context-system-optimize' ? 'primary' : 'default'" @click="currentCategory='context-system-optimize'">
          {{ `🎯 ${t('templateManager.optimizeTemplatesContext')}` }}
        </NButton>
      </NGridItem>
      <NGridItem>
        <NButton block :type="currentCategory==='context-user-optimize' ? 'primary' : 'default'" @click="currentCategory='context-user-optimize'">
          {{ `👤 ${t('templateManager.userOptimizeTemplatesContext')}` }}
        </NButton>
      </NGridItem>
      <NGridItem>
        <NButton block :type="currentCategory==='context-iterate' ? 'primary' : 'default'" @click="currentCategory='context-iterate'">
          {{ `🔄 ${t('templateManager.iterateTemplatesContext')}` }}
        </NButton>
      </NGridItem>

      <!-- 图像 · 文生图 -->
      <NGridItem>
        <NButton block :type="currentCategory==='image-text2image-optimize' ? 'primary' : 'default'" @click="currentCategory='image-text2image-optimize'">
          {{ `🖼️ ${t('templateManager.imageText2ImageTemplates')}` }}
        </NButton>
      </NGridItem>
      <!-- 图像 · 图生图 -->
      <NGridItem>
        <NButton block :type="currentCategory==='image-image2image-optimize' ? 'primary' : 'default'" @click="currentCategory='image-image2image-optimize'">
          {{ `📷 ${t('templateManager.imageImage2ImageTemplates')}` }}
        </NButton>
      </NGridItem>
      <!-- 图像 · 迭代 -->
      <NGridItem>
        <NButton block :type="currentCategory==='image-iterate' ? 'primary' : 'default'" @click="currentCategory='image-iterate'">
          {{ `🌀 ${t('templateManager.imageIterateTemplates')}` }}
        </NButton>
      </NGridItem>
    </NGrid>

    <!-- 模板列表 -->
    <NSpace vertical :size="16" style="margin-top: 16px;">
      <NSpace justify="space-between" align="center">
        <NSpace align="center">
          <NH3 style="margin: 0;">{{ getCurrentCategoryLabel() }}</NH3>
          <NTag type="info" size="small">
            {{ t('templateManager.templateCount', { count: filteredTemplates.length }) }}
          </NTag>
        </NSpace>
        <NButton
          type="primary"
          @click="showAddForm = true"
          ghost
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M3 15h6"/>
              <path d="M6 12v6"/>
            </svg>
          </template>
          {{ t('templateManager.addTemplate') }}
        </NButton>
      </NSpace>
      
      <NScrollbar style="max-height: 60vh;">
        <NSpace vertical :size="12">
          <NCard
            v-for="template in filteredTemplates"
            :key="template.id"
            hoverable
            :style="{
              opacity: getSelectedTemplateId() === template.id ? 0.7 : 1,
              transform: getSelectedTemplateId() === template.id ? 'scale(0.99)' : 'scale(1)',
              cursor: getSelectedTemplateId() !== template.id ? 'pointer' : 'default'
            }"
            @click="getSelectedTemplateId() !== template.id && selectTemplate(template)"
          >
            <template #header>
              <NSpace justify="space-between" align="center">
                <NSpace vertical :size="4">
                  <NText strong>{{ template.name }}</NText>
                  <NText depth="3" style="font-size: 14px;">
                    {{ template.metadata.description || t('common.noDescription') }}
                  </NText>
                  <NText depth="3" style="font-size: 12px;">
                    {{ t('common.lastModified') }}: {{ formatDate(template.metadata.lastModified) }}
                  </NText>
                </NSpace>
              </NSpace>
            </template>
            
            <template #header-extra>
              <NSpace @click.stop>
                <!-- 查看按钮 -->
                <NButton
                  v-if="template.isBuiltin"
                  size="small"
                  quaternary
                  @click="viewTemplate(template)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </template>
                  {{ t('template.view') }}
                </NButton>
                
                <!-- 编辑按钮 -->
                <NButton
                  v-if="!template.isBuiltin"
                  size="small"
                  quaternary
                  @click="editTemplate(template)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </template>
                  {{ t('common.edit') }}
                </NButton>
                
                <!-- 复制按钮 -->
                <NButton
                  v-if="template.isBuiltin"
                  size="small"
                  quaternary
                  @click="copyTemplate(template)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
                    </svg>
                  </template>
                  {{ t('templateManager.copyTemplate') }}
                </NButton>
                
                <!-- 迁移按钮 -->
                <NButton
                  v-if="!template.isBuiltin && isStringTemplate(template)"
                  size="small"
                  quaternary
                  @click="showMigrationDialog(template)"
                  :title="t('templateManager.convertToAdvanced')"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </template>
                  {{ t('templateManager.migrate') }}
                </NButton>
                
                <!-- 删除按钮 -->
                <NButton
                  v-if="!template.isBuiltin"
                  size="small"
                  type="error"
                  quaternary
                  @click="confirmDelete(template.id)"
                >
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </template>
                  {{ t('common.delete') }}
                </NButton>
              </NSpace>
            </template>
            
            <!-- 模板标签 -->
            <NSpace>
              <NTag
                :type="template.isBuiltin ? 'primary' : 'default'"
                size="small"
              >
                {{ template.isBuiltin ? t('common.builtin') : t('common.custom') }}
              </NTag>
              <NTag
                :type="TemplateProcessor.isSimpleTemplate(template) ? 'info' : 'warning'"
                size="small"
              >
                {{ TemplateProcessor.isSimpleTemplate(template) 
                  ? `📝 ${t('templateManager.simpleTemplate')}` 
                  : `⚡ ${t('templateManager.advancedTemplate')}` 
                }}
              </NTag>
              <NTag
                v-if="getSelectedTemplateId() === template.id"
                type="success"
                size="small"
              >
                {{ t('template.selected') }}
              </NTag>
            </NSpace>
            
            <!-- 左侧颜色条 -->
            <div 
              class="absolute top-0 left-0 w-1 h-full rounded-l-lg"
              :class="template.metadata.templateType === 'optimize' ? 'bg-blue-500' : 'bg-purple-500'"
            ></div>
          </NCard>
        </NSpace>
      </NScrollbar>
    </NSpace>

    <!-- 查看/编辑模态框 -->
    <NModal
      :show="!!(showAddForm || editingTemplate || viewingTemplate)"
      preset="card"
      :style="{ width: '90vw', maxWidth: '1200px' }"
      :title="getEditModalTitle()"
      size="large"
      :bordered="false"
      :segmented="true"
      @update:show="(value: boolean) => !value && cancelEdit()"
    >
      <template #header-extra>
        <NSpace>
          <!-- 在查看或编辑时显示模板类型 -->
          <NTag
            v-if="viewingTemplate || editingTemplate"
            :type="(viewingTemplate || editingTemplate) && TemplateProcessor.isSimpleTemplate((viewingTemplate || editingTemplate)!) ? 'info' : 'warning'"
            size="small"
          >
            {{ (viewingTemplate || editingTemplate) && TemplateProcessor.isSimpleTemplate((viewingTemplate || editingTemplate)!) 
              ? '📝 ' + t('templateManager.simpleTemplate') 
              : '⚡ ' + t('templateManager.advancedTemplate') }}
          </NTag>
          <!-- Template Syntax Guide Toggle -->
          <NButton
            quaternary
            circle
            @click="showSyntaxGuide = true"
            :title="t('templateManager.syntaxGuide')"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
            </template>
          </NButton>
        </NSpace>
      </template>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">{{ t('template.name') }}</label>
          <NInput
            v-model:value="form.name"
            :placeholder="t('template.namePlaceholder')"
            :readonly="!!viewingTemplate"
          />
        </div>

        <!-- Template Format Selector -->
        <div v-if="!viewingTemplate">
          <label class="block text-sm font-medium mb-2">{{ t('templateManager.templateFormat') }}</label>
          <NSpace>
            <NButton
              :type="!form.isAdvanced ? 'primary' : 'default'"
              @click="form.isAdvanced = false"
              class="flex-1"
            >
              📝 {{ t('templateManager.simpleTemplate') }}
            </NButton>
            <NButton
              :type="form.isAdvanced ? 'primary' : 'default'"
              @click="form.isAdvanced = true"
              class="flex-1"
            >
              ⚡ {{ t('templateManager.advancedTemplate') }}
            </NButton>
          </NSpace>
        </div>
        
        <!-- Simple Template Editor -->
        <NSpace v-if="!form.isAdvanced" vertical :size="8">
          <NSpace justify="space-between" align="center">
            <NText>
              {{ t('template.content') }}
              <NText depth="3" style="font-size: 12px; margin-left: 8px;">
                {{ t('templateManager.simpleTemplateHint') }}
              </NText>
            </NText>
            <NButton
              v-if="!viewingTemplate"
              size="tiny"
              quaternary
              @click="openFullscreenEditor('simple')"
              :title="t('templateManager.fullscreenEdit')"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </template>
              {{ t('templateManager.fullscreen') }}
            </NButton>
          </NSpace>
          <NInput
            v-model:value="form.content"
            type="textarea"
            :placeholder="t('template.contentPlaceholder')"
            :autosize="{ minRows: 15, maxRows: 30 }"
            :readonly="!!viewingTemplate"
          />
        </NSpace>

        <!-- Advanced Template Editor -->
        <NSpace v-else vertical :size="12">
          <NSpace justify="space-between" align="center">
            <NText>
              {{ t('templateManager.messageTemplates') }}
              <NText depth="3" style="font-size: 12px; margin-left: 8px;">
                {{ t('templateManager.advancedTemplateHint') }}
              </NText>
            </NText>
            <NButton
              v-if="!viewingTemplate"
              @click="addMessage"
              size="small"
              secondary
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </template>
              {{ t('templateManager.addMessage') }}
            </NButton>
          </NSpace>

          <!-- Message List -->
          <NScrollbar style="max-height: 500px;">
            <NSpace vertical :size="12">
              <NCard
                v-for="(message, index) in form.messages"
                :key="index"
                size="small"
                embedded
              >
                <div class="flex items-start gap-3">
                  <!-- Role Selector -->
                  <NSelect
                    v-model:value="message.role"
                    :disabled="!!viewingTemplate"
                    style="width: 100px; flex-shrink: 0;"
                    :options="[
                      { label: t('templateManager.roleSystem'), value: 'system' },
                      { label: t('templateManager.roleUser'), value: 'user' },
                      { label: t('templateManager.roleAssistant'), value: 'assistant' }
                    ]"
                  />

                  <!-- Message Content -->
                  <NSpace vertical :size="4" style="flex: 1;">
                    <NInput
                      v-model:value="message.content"
                      type="textarea"
                      :placeholder="t('templateManager.messageContentPlaceholder')"
                      :autosize="{ minRows: 3, maxRows: 20 }"
                      :readonly="!!viewingTemplate"
                    />
                    <NButton
                      v-if="!viewingTemplate"
                      size="tiny"
                      quaternary
                      @click="openFullscreenEditor('advanced', index)"
                      :title="t('templateManager.fullscreenEdit')"
                      style="align-self: flex-end;"
                    >
                      <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                      </template>
                      {{ t('templateManager.fullscreen') }}
                    </NButton>
                  </NSpace>

                  <!-- Message Controls -->
                  <NSpace v-if="!viewingTemplate" vertical :size="4" style="flex-shrink: 0;">
                    <NButton
                      quaternary
                      size="tiny"
                      @click="moveMessage(index, -1)"
                      :disabled="index === 0"
                    >
                      <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </template>
                    </NButton>
                    <NButton
                      quaternary
                      size="tiny"
                      @click="moveMessage(index, 1)"
                      :disabled="index === form.messages.length - 1"
                    >
                      <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </template>
                    </NButton>
                    <NButton
                      quaternary
                      size="tiny"
                      type="error"
                      @click="removeMessage(index)"
                    >
                      <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </template>
                    </NButton>
                  </NSpace>
                </div>
              </NCard>
            </NSpace>
          </NScrollbar>
        </NSpace>
        
        <!-- Template Preview -->
        <div v-if="form.isAdvanced && form.messages.length > 0">
          <label class="block text-sm font-medium mb-2">{{ t('templateManager.preview') }}</label>
          <NCard size="small" embedded style="max-height: 264px; overflow-y: auto;">
            <NSpace vertical :size="8">
              <div
                v-for="(message, index) in processedPreview"
                :key="index"
                class="flex items-start space-x-2 text-sm"
              >
                <NTag
                  size="small"
                  :type="message.role === 'system' ? 'info' : message.role === 'user' ? 'success' : 'warning'"
                >
                  {{ message.role }}
                </NTag>
                <span class="opacity-70 font-mono text-xs flex-1">
                  {{ message.content }}
                </span>
              </div>
            </NSpace>
          </NCard>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">{{ t('common.description') }}</label>
          <NInput
            v-model:value="form.description"
            type="textarea"
            :placeholder="t('template.descriptionPlaceholder')"
            :rows="2"
            :readonly="!!viewingTemplate"
          />
        </div>
      </form>

      <template #action>
        <NSpace justify="end">
          <NButton @click="cancelEdit">
            {{ viewingTemplate ? t('common.close') : t('common.cancel') }}
          </NButton>
          <NButton
            v-if="!viewingTemplate"
            type="primary"
            @click="handleSubmit"
          >
            {{ editingTemplate ? t('template.save') : t('template.add') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Syntax Guide Modal -->
    <NModal
      :show="showSyntaxGuide"
      preset="card"
      :style="{ width: '90vw', maxWidth: '1200px' }"
      :title="t('templateManager.syntaxGuide')"
      size="large"
      :bordered="false"
      :segmented="true"
      @update:show="(value: boolean) => !value && (showSyntaxGuide = false)"
    >
      <!-- Markdown Content -->
      <div class="syntax-guide-content">
        <MarkdownRenderer :content="syntaxGuideMarkdown" />
      </div>

      <template #action>
        <NButton type="primary" @click="showSyntaxGuide = false">
          {{ t('common.close') }}
        </NButton>
      </template>
    </NModal>

    <!-- Migration Dialog Modal -->
    <NModal
      :show="migrationDialog.show"
      preset="card"
      :style="{ width: '90vw', maxWidth: '800px' }"
      :title="t('templateManager.convertToAdvanced')"
      size="large"
      :bordered="false"
      :segmented="true"
      @update:show="(value: boolean) => !value && (migrationDialog.show = false)"
    >
      <NSpace vertical :size="16">
        <NText>{{ t('templateManager.migrationDescription') }}</NText>

        <!-- Original Template -->
        <div>
          <NH4>{{ t('templateManager.originalTemplate') }}</NH4>
          <NCode :code="migrationDialog.original" language="text" style="max-height: 128px; overflow-y: auto;" />
        </div>

        <!-- Converted Template -->
        <div>
          <NH4>{{ t('templateManager.convertedTemplate') }}</NH4>
          <NCode :code="JSON.stringify(migrationDialog.converted, null, 2)" language="json" style="max-height: 128px; overflow-y: auto;" />
        </div>
      </NSpace>

      <template #action>
        <NSpace justify="end">
          <NButton @click="migrationDialog.show = false">
            {{ t('common.cancel') }}
          </NButton>
          <NButton type="primary" @click="applyMigration">
            {{ t('templateManager.applyMigration') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Fullscreen Editor Modal -->
    <NModal
      :show="fullscreenEditor.show"
      preset="card"
      :style="{ width: '95vw', height: '90vh', maxWidth: '1400px' }"
      :title="t('templateManager.fullscreenEdit')"
      size="large"
      :bordered="false"
      :segmented="true"
      @update:show="(value: boolean) => !value && closeFullscreenEditor()"
    >
      <NEl style="height: calc(90vh - 140px);">
        <NInput
          v-model:value="fullscreenEditor.content"
          type="textarea"
          :placeholder="fullscreenEditor.type === 'simple'
            ? t('template.contentPlaceholder')
            : t('templateManager.messageContentPlaceholder')"
          style="height: 100%;"
          :autosize="false"
        />
      </NEl>

      <template #action>
        <NSpace justify="space-between" style="width: 100%;">
          <NText depth="3" style="font-size: 12px;">
            {{ t('templateManager.characterCount', { count: fullscreenEditor.content.length }) }}
          </NText>
          <NSpace>
            <NButton @click="closeFullscreenEditor()">
              {{ t('common.cancel') }}
            </NButton>
            <NButton type="primary" @click="saveFullscreenEditor">
              {{ t('common.save') }}
            </NButton>
          </NSpace>
        </NSpace>
      </template>
    </NModal>
  </NModal>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal, NCard, NTabs, NTabPane, NButton, NTag, NInput, NInputGroup,
  NSelect, NSpace, NText, NH3, NH4, NDivider, NScrollbar,
  NButtonGroup, NIcon, NCode, NSwitch, NMessageProvider,
  NGrid, NGridItem, NEl
} from 'naive-ui'
import { TemplateProcessor, type Template, type MessageTemplate } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'
import MarkdownRenderer from './MarkdownRenderer.vue'
import BuiltinTemplateLanguageSwitch from './BuiltinTemplateLanguageSwitch.vue'
import { syntaxGuideContent } from '../docs/syntax-guide'
import type { ITemplateManager, TemplateLanguageService } from '@prompt-optimizer/core'
import { i18n } from '../plugins/i18n'

const { t } = useI18n()

interface Services {
  templateManager: ITemplateManager;
  templateLanguageService: TemplateLanguageService;
}

// 通过依赖注入获取服务
const services = inject<{ value: Services | null }>('services')
if (!services?.value) {
  throw new Error('TemplateManager Error: The required "services" were not provided by a parent component. Make sure this component is a child of a component that uses "provide(\'services\', ...)"')
}

const getTemplateManager = computed(() => services.value!.templateManager)
const getTemplateLanguageService = computed(() => services.value!.templateLanguageService)

const props = defineProps<{
  selectedSystemOptimizeTemplate?: Template,
  selectedUserOptimizeTemplate?: Template,
  selectedIterateTemplate?: Template,
  templateType:
    | 'optimize'
    | 'userOptimize'
    | 'iterate'
    | 'text2imageOptimize'
    | 'image2imageOptimize'
    | 'imageIterate'
    | 'contextSystemOptimize'
    | 'contextUserOptimize'
    | 'contextIterate',
  show: boolean
}>()

const emit = defineEmits(['close', 'select', 'update:show', 'languageChanged'])
const toast = useToast()

const templates = ref<Template[]>([])
const currentCategory = ref(getCategoryFromProps())
const currentType = computed(() => getCurrentTemplateType())
const showAddForm = ref(false)
const editingTemplate = ref<Template | null>(null)
const viewingTemplate = ref<Template | null>(null)
const showSyntaxGuide = ref(false)

const form = ref<{
  name: string
  content: string
  description: string
  isAdvanced: boolean
  messages: MessageTemplate[]
}>({
  name: '',
  content: '',
  description: '',
  isAdvanced: false,
  messages: []
})

const migrationDialog = ref<{
  show: boolean
  template: Template | null
  original: string
  converted: MessageTemplate[]
}>({
  show: false,
  template: null,
  original: '',
  converted: []
})

const fullscreenEditor = ref<{
  show: boolean
  type: 'simple' | 'advanced'
  messageIndex: number
  content: string
}>({
  show: false,
  type: 'simple',
  messageIndex: -1,
  content: ''
})

// 添加计算属性
const selectedTemplate = computed(() => {
  switch (props.templateType) {
    case 'optimize':
    case 'contextSystemOptimize':
      return props.selectedSystemOptimizeTemplate
    case 'userOptimize':
    case 'contextUserOptimize':
      return props.selectedUserOptimizeTemplate
    case 'iterate':
    case 'contextIterate':
      return props.selectedIterateTemplate
    default:
      return null
  }
})

// 根据props确定初始分类
function getCategoryFromProps() {
  switch (props.templateType) {
    case 'optimize':
      return 'system-optimize'
    case 'userOptimize':
      return 'user-optimize'
    case 'iterate':
      return 'iterate'
    case 'text2imageOptimize':
      return 'image-text2image-optimize'
    case 'image2imageOptimize':
      return 'image-image2image-optimize'
    case 'imageIterate':
      return 'image-iterate'
    case 'contextSystemOptimize':
      return 'context-system-optimize'
    case 'contextUserOptimize':
      return 'context-user-optimize'
    case 'contextIterate':
      return 'context-iterate'
    default:
      return 'system-optimize'
  }
}

// 获取当前模板类型 - 根据当前分类而不是props
function getCurrentTemplateType(): 'optimize' | 'userOptimize' | 'iterate' | 'text2imageOptimize' | 'image2imageOptimize' | 'imageIterate' | 'contextSystemOptimize' | 'contextUserOptimize' | 'contextIterate' {
  switch (currentCategory.value) {
    case 'system-optimize':
      return 'optimize'
    case 'user-optimize':
      return 'userOptimize'
    case 'iterate':
      return 'iterate'
    case 'image-text2image-optimize':
      return 'text2imageOptimize'
    case 'image-image2image-optimize':
      return 'image2imageOptimize'
    case 'image-iterate':
      return 'imageIterate'
    case 'context-system-optimize':
      return 'contextSystemOptimize'
    case 'context-user-optimize':
      return 'contextUserOptimize'
    case 'context-iterate':
      return 'contextIterate'
    default:
      return 'optimize'
  }
}

// 获取当前选中的模板ID
function getSelectedTemplateId() {
  return selectedTemplate.value?.id
}

// 获取当前分类标签
function getCurrentCategoryLabel() {
  switch (currentCategory.value) {
    case 'system-optimize':
      return t('templateManager.optimizeTemplateList')
    case 'user-optimize':
      return t('templateManager.userOptimizeTemplateList')
    case 'iterate':
      return t('templateManager.iterateTemplateList')
    case 'image-text2image-optimize':
      return t('templateManager.imageText2ImageTemplates')
    case 'image-image2image-optimize':
      return t('templateManager.imageImage2ImageTemplates')
    case 'image-iterate':
      return t('templateManager.imageIterateTemplates')
    case 'context-system-optimize':
      return t('templateManager.optimizeTemplateList') + ' (Pro)'
    case 'context-user-optimize':
      return t('templateManager.userOptimizeTemplateList') + ' (Pro)'
    case 'context-iterate':
      return t('templateManager.iterateTemplateList') + ' (Pro)'
    default:
      return ''
  }
}

// 检查是否为字符串模板
const isStringTemplate = (template: Template) => {
  return typeof template.content === 'string'
}

// 处理预览数据
const processedPreview = computed(() => {
  if (!form.value.isAdvanced || !form.value.messages.length) return []

  const sampleContext = {
    prompt: 'Write a creative story about space exploration',
    originalPrompt: 'Write a story',
    iterateInput: 'Make it more creative and add space exploration theme'
  }

  try {
    const tempTemplate: Template = {
      id: 'preview',
      name: 'Preview',
      content: JSON.parse(JSON.stringify(form.value.messages)),
      metadata: { version: '1.0', lastModified: Date.now(), templateType: currentType.value }
    }
    return TemplateProcessor.processTemplate(tempTemplate, sampleContext)
  } catch (error) {
    console.error('Preview processing error:', error)
    return form.value.messages.map(msg => ({
      role: msg.role,
      content: msg.content || '[Empty content]'
    }))
  }
})

// 加载提示词列表
const loadTemplates = async () => {
  try {
    // 统一使用异步方法
    const allTemplates = await getTemplateManager.value.listTemplates()
    templates.value = allTemplates
    console.log('加载到的提示词:', templates.value)
  } catch (error) {
    console.error('加载提示词失败:', error)
    toast.error('加载提示词失败')
  }
}

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return t('template.unknownTime')
  return new Date(timestamp).toLocaleString()
}

// 编辑提示词
const editTemplate = (template: Template) => {
  editingTemplate.value = template
  const isAdvanced = Array.isArray(template.content)

  form.value = {
    name: template.name,
    content: isAdvanced ? '' : template.content as string,
    description: template.metadata.description || '',
    isAdvanced,
    messages: isAdvanced ? [...template.content] as MessageTemplate[] : []
  }

  // 等待DOM更新后初始化textarea高度
  nextTick(() => {
    initializeAllTextareas()
  })
}

// 查看提示词
const viewTemplate = (template: Template) => {
  viewingTemplate.value = template
  const isAdvanced = Array.isArray(template.content)

  form.value = {
    name: template.name,
    content: isAdvanced ? '' : template.content as string,
    description: template.metadata.description || '',
    isAdvanced,
    messages: isAdvanced ? [...template.content] as MessageTemplate[] : []
  }

  // 等待DOM更新后初始化textarea高度
  nextTick(() => {
    initializeAllTextareas()
  })
}

// 取消编辑
const cancelEdit = () => {
  showAddForm.value = false
  editingTemplate.value = null
  viewingTemplate.value = null
  showSyntaxGuide.value = false
  form.value = {
    name: '',
    content: '',
    description: '',
    isAdvanced: false,
    messages: []
  }
}

// 生成唯一的模板ID
const generateUniqueTemplateId = (baseName = 'template') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  let candidateId = `${baseName}-${timestamp}-${random}`
  
  // 确保ID不与现有模板冲突
  const existingIds = templates.value.map(t => t.id)
  let counter = 1
  while (existingIds.includes(candidateId)) {
    candidateId = `${baseName}-${timestamp}-${random}-${counter}`
    counter++
  }
  
  return candidateId
}

// 添加消息
const addMessage = () => {
  form.value.messages.push({
    role: 'user',
    content: ''
  })
}

// 移除消息
const removeMessage = (index: number) => {
  form.value.messages.splice(index, 1)
}

// 移动消息
const moveMessage = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < form.value.messages.length) {
    const messages = [...form.value.messages]
    const temp = messages[index]
    messages[index] = messages[newIndex]
    messages[newIndex] = temp
    form.value.messages = messages
  }
}

// 初始化textarea高度 - 只在打开时调用一次
const initializeTextareaHeight = (textarea: HTMLTextAreaElement) => {
  if (!textarea || (textarea as any)._initialized) return
  
  try {
    const minHeight = 80
    const maxHeight = 280
    
    // 设置为auto以获取内容实际高度
    const originalHeight = textarea.style.height
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    
    let initialHeight
    if (scrollHeight <= minHeight) {
      initialHeight = minHeight
    } else if (scrollHeight >= maxHeight) {
      initialHeight = maxHeight
    } else {
      initialHeight = scrollHeight
    }
    
    textarea.style.height = initialHeight + 'px'
    ;(textarea as any)._initialized = true
  } catch (error) {
    console.warn('Textarea initialization error:', error)
  }
}

// 显示迁移对话框
const showMigrationDialog = (template: Template) => {
  if (!isStringTemplate(template) || typeof template.content !== 'string') return

  const converted: MessageTemplate[] = [
    {
      role: 'system',
      content: template.content
    },
    {
      role: 'user',
      content: '{{originalPrompt}}'
    }
  ]

  migrationDialog.value = {
    show: true,
    template,
    original: template.content,
    converted
  }
}

// 应用迁移
const applyMigration = async () => {
  try {
    const template = migrationDialog.value.template
    if (!template) return

    const updatedTemplate: Template = {
      ...template,
      content: migrationDialog.value.converted,
      metadata: {
        ...template.metadata,
        lastModified: Date.now()
      }
    }

    // ElectronProxy会自动处理序列化，这里不需要手动处理
    await getTemplateManager.value.saveTemplate(updatedTemplate)
    await loadTemplates()

    // 如果当前选中的模板被更新，重新选择
    const isCurrentSelected = getSelectedTemplateId() === template.id

    if (isCurrentSelected) {
      try {
        const updated = getTemplateManager.value.getTemplate(template.id)
        if (updated) {
          const templateType = currentCategory.value === 'iterate' ? 'iterate' : 'optimize'
          emit('select', updated, templateType)
        }
      } catch (error) {
        console.error('Failed to get updated template:', error)
      }
    }

    migrationDialog.value.show = false
    toast.success(t('templateManager.migrationSuccess'))
  } catch (error) {
    console.error('Migration failed:', error)
    toast.error(t('templateManager.migrationFailed'))
  }
}

// 打开全屏编辑器
const openFullscreenEditor = (type: 'simple' | 'advanced', messageIndex = -1) => {
  fullscreenEditor.value = {
    show: true,
    type,
    messageIndex,
    content: type === 'simple' ? form.value.content : form.value.messages[messageIndex]?.content || ''
  }
}

// 关闭全屏编辑器
const closeFullscreenEditor = () => {
  fullscreenEditor.value = {
    show: false,
    type: 'simple',
    messageIndex: -1,
    content: ''
  }
}

// 保存全屏编辑器内容
const saveFullscreenEditor = () => {
  if (fullscreenEditor.value.type === 'simple') {
    form.value.content = fullscreenEditor.value.content
  } else if (fullscreenEditor.value.messageIndex >= 0) {
    form.value.messages[fullscreenEditor.value.messageIndex].content = fullscreenEditor.value.content
  }
  closeFullscreenEditor()
}

// 提交表单
const handleSubmit = async () => {
  try {
    // 验证表单
    if (form.value.isAdvanced) {
      if (!form.value.messages.length) {
        toast.error(t('templateManager.noMessagesError'))
        return
      }

      const hasEmptyContent = form.value.messages.some(msg => !msg.content.trim())
      if (hasEmptyContent) {
        toast.error(t('templateManager.emptyMessageError'))
        return
      }
    } else {
      if (!form.value.content.trim()) {
        toast.error(t('templateManager.emptyContentError'))
        return
      }
    }

    const metadata = {
      version: '1.0.0',
      lastModified: Date.now(),
      description: form.value.description,
      author: 'User',
      templateType: getCurrentTemplateType()
    }

    const templateData: Template = {
      id: editingTemplate.value?.id || generateUniqueTemplateId('user-template'),
      name: form.value.name,
      content: form.value.isAdvanced ? JSON.parse(JSON.stringify(form.value.messages)) : form.value.content,
      metadata
    }

    // IPC层会自动处理序列化，这里不需要手动处理
    await getTemplateManager.value.saveTemplate(templateData)
    await loadTemplates()

    const isCurrentSelected = getSelectedTemplateId() === templateData.id

    if (editingTemplate.value && isCurrentSelected) {
      try {
        // 统一使用异步方法
        const updatedTemplate = await getTemplateManager.value.getTemplate(templateData.id)
        if (updatedTemplate) {
          emit('select', updatedTemplate, getCurrentTemplateType());
        }
      } catch (error) {
        console.error('Failed to get updated template after save:', error)
      }
    }

    toast.success(editingTemplate.value ? t('template.success.updated') : t('template.success.added'))
    cancelEdit()
  } catch (error) {
    console.error('保存提示词失败:', error)
    toast.error(t('template.error.saveFailed'))
  }
}

// 确认删除
const confirmDelete = async (templateId: string) => {
  if (confirm(t('template.deleteConfirm'))) {
    try {
      await getTemplateManager.value.deleteTemplate(templateId)
      await loadTemplates()

      // 获取当前分类的剩余模板
      const remainingTemplates = filteredTemplates.value

      if (getSelectedTemplateId() === templateId) {
        emit('select', remainingTemplates[0] || null, getCurrentTemplateType())
      }
      
      toast.success(t('template.success.deleted'))
    } catch (error) {
      console.error('删除提示词失败:', error)
      toast.error(t('template.error.deleteFailed'))
    }
  }
}

// 导出提示词
const exportTemplate = async (templateId: string) => {
  try {
    const templateJson = await getTemplateManager.value.exportTemplate(templateId);
    const blob = new Blob([templateJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${templateId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('template.success.exported'));
  } catch (error) {
    console.error('导出提示词失败:', error);
    toast.error(t('template.error.exportFailed'));
  }
}

// 导入提示词
const fileInput = ref<HTMLInputElement | null>(null)
const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        if (e.target?.result && typeof e.target.result === 'string') {
          await getTemplateManager.value.importTemplate(e.target.result)
        } else {
          // 让失败不再静默，明确地抛出错误
          throw new Error('Failed to read file content as string.')
        }
        await loadTemplates()
        toast.success(t('template.success.imported'))
        if (target) {
          target.value = ''
        }
      } catch (error) {
        console.error('导入提示词失败:', error)
        toast.error(t('template.error.importFailed'))
      }
    }
    reader.readAsText(file)
  } catch (error) {
    console.error('读取文件失败:', error)
    toast.error(t('template.error.readFailed'))
  }
}

// 复制内置提示词
const copyTemplate = (template: Template) => {
  showAddForm.value = true
  const isAdvanced = Array.isArray(template.content)

  form.value = {
    name: `${template.name} - 副本`,
    content: isAdvanced ? '' : template.content as string,
    description: template.metadata.description || '',
    isAdvanced,
    messages: isAdvanced ? [...template.content] as MessageTemplate[] : []
  }
}

// 选择提示词
const selectTemplate = (template: Template) => {
  emit('select', template, getCurrentTemplateType());
}

// 按分类过滤提示词
const filteredTemplates = computed(() => {
  return templates.value.filter(t => {
    const templateType = t.metadata.templateType

    switch (currentCategory.value) {
      case 'system-optimize':
        // 系统提示词优化模板：optimize类型
        return templateType === 'optimize'

      case 'user-optimize':
        // 用户提示词优化模板：userOptimize类型
        return templateType === 'userOptimize'

      case 'iterate':
        // 迭代优化模板：iterate类型
        return templateType === 'iterate'

      // 图像类模板
      case 'image-text2image-optimize':
        return templateType === 'text2imageOptimize'
      case 'image-image2image-optimize':
        return templateType === 'image2imageOptimize'
      case 'image-iterate':
        return templateType === 'imageIterate'

      case 'context-system-optimize':
        // 上下文-系统优化模板
        return templateType === 'contextSystemOptimize'

      case 'context-user-optimize':
        // 上下文-用户优化模板
        return templateType === 'contextUserOptimize'

      case 'context-iterate':
        // 上下文-迭代优化模板
        return templateType === 'contextIterate'

      default:
        return false
    }
  })
})

// 获取当前语言的语法指南内容
const syntaxGuideMarkdown = computed(() => {
  const lang = i18n.global.locale.value as keyof typeof syntaxGuideContent
  return syntaxGuideContent[lang] || syntaxGuideContent['zh-CN']
})

  // 处理内置模板语言变化
  const handleLanguageChanged = async (newLanguage: string) => {
    // 重新加载模板列表以反映新的语言
    await loadTemplates()

    // 如果当前选中的模板是内置模板，需要重新选择以获取新语言版本
    const currentSelected = selectedTemplate.value

    if (currentSelected && currentSelected.isBuiltin) {
      try {
        // 获取新语言版本的同一模板
        const updatedTemplate = await getTemplateManager.value.getTemplate(currentSelected.id)
        if (updatedTemplate) {
          emit('select', updatedTemplate, getCurrentTemplateType());
        }
      } catch (error) {
        console.error('Failed to update selected template after language change:', error)
        // 如果获取失败，选择第一个可用的模板
        try {
          const availableTemplates = filteredTemplates.value
          if (availableTemplates.length > 0) {
            emit('select', availableTemplates[0], getCurrentTemplateType());
          }
        } catch (listError) {
          console.error('Failed to list templates after language change:', listError)
        }
      }
    }

    // 发出语言变化事件，通知父组件
    emit('languageChanged', newLanguage)
  }

// 监听 props.templateType 变化，更新当前分类
watch(() => props.templateType, (newTemplateType) => {
  currentCategory.value = getCategoryFromProps()
}, { immediate: true })

// 生命周期钩子
onMounted(async () => {
  console.log('[TemplateManager.vue] Component is mounted.');
  console.log('[TemplateManager.vue] Injected services:', services);
  if (services?.value) {
    console.log('[TemplateManager.vue] TemplateManager instance from services:', getTemplateManager.value);
  } else {
    console.error('[TemplateManager.vue] Services not available on mount.');
  }
  await loadTemplates();
})

// 监听表单消息数量变化，只在新增消息时初始化新textarea
watch(() => form.value.messages.length, () => {
  // 只在消息数量变化时初始化新的textarea
  initializeAllTextareas()
})

// 监听模态框状态变化，确保打开时初始化textarea高度
watch([() => showAddForm.value, () => editingTemplate.value, () => viewingTemplate.value], (newValues) => {
  // 只在打开模态框时初始化
  if (newValues.some(val => val)) {
    initializeAllTextareas()
  }
})

// 统一初始化所有textarea高度 - 只在打开时调用一次
const initializeAllTextareas = () => {
  // 延迟执行，确保DOM已更新
  nextTick(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea.message-content-textarea')
    
    textareas.forEach(textarea => {
      // 确保textarea可见且未初始化过
      if (textarea.offsetHeight > 0 || textarea.offsetWidth > 0) {
        initializeTextareaHeight(textarea)
      }
    })
  })
}

// 获取编辑模态框标题
const getEditModalTitle = () => {
  if (viewingTemplate.value) {
    return t('template.view')
  } else if (editingTemplate.value) {
    return t('template.edit')
  } else {
    return t('template.add')
  }
}

// 关闭模板管理器
const close = () => {
  emit('update:show', false)
  emit('close')
}
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

/* 保持原有的滚动条样式 */
.scroll-container {
  max-height: 60vh;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
}

.scroll-container::-webkit-scrollbar {
  width: 6px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(139, 92, 246, 0.5);
}
/* 添加标签淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
