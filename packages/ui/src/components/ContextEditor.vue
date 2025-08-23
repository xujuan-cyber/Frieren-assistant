<template>
  <div class="context-editor-fullscreen h-screen w-screen theme-manager-bg">
    <!-- 顶部工具栏 -->
    <div class="editor-header flex items-center justify-between p-4 border-b theme-manager-border theme-manager-card">
      <div class="flex items-center gap-4">
        <h3 class="text-xl font-semibold theme-manager-text">上下文编辑器</h3>
        <div class="flex items-center gap-2 text-sm theme-manager-text-secondary">
          <span>{{ messages.length }} 条消息</span>
          <div v-if="messages.length > 0" class="flex items-center gap-2">
            <span 
              class="flex items-center gap-1 cursor-help"
              :title="allUsedVariables.length > 0 ? `使用的变量: ${allUsedVariables.join(', ')}` : '暂无使用变量'"
            >
              <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              变量: {{ allUsedVariables.length }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- 导入导出按钮 -->
        <button
          @click="showImportDialog = true"
          class="px-3 py-1.5 text-sm theme-manager-button-secondary"
          title="导入数据"
        >
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          导入
        </button>
        
        <button
          @click="showExportDialog = true"
          class="px-3 py-1.5 text-sm theme-manager-button-secondary"
          :disabled="messages.length === 0"
          title="导出数据"
        >
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l3-3m0 0l-3-3m3 3H9" />
          </svg>
          导出
        </button>
        
        <button
          @click="addMessage"
          class="px-3 py-1.5 text-sm theme-manager-button-primary"
          title="添加消息"
        >
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加消息
        </button>

        <!-- 保存和关闭 -->
        <div class="border-l theme-manager-border ml-2 pl-2 flex gap-2">
          <button
            @click="handleSave"
            class="px-4 py-1.5 text-sm theme-manager-button-success"
          >
            保存
          </button>
          <button
            @click="handleClose"
            class="px-4 py-1.5 text-sm theme-manager-button-secondary"
          >
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div class="editor-content flex-1 overflow-hidden flex flex-col">
      <div class="flex-1 p-6 overflow-y-auto">
        <!-- 空状态 -->
        <div v-if="messages.length === 0" class="empty-state text-center py-16">
          <div class="max-w-md mx-auto">
            <svg class="w-16 h-16 mx-auto mb-4 theme-manager-text-secondary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            <h3 class="text-xl font-semibold theme-manager-text mb-2">开始编辑上下文</h3>
            <p class="theme-manager-text-secondary mb-4">添加消息来构建对话上下文，支持变量提取和模板化</p>
            <button
              @click="addMessage"
              class="px-6 py-2 theme-manager-button-primary"
            >
              添加第一条消息
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="w-full space-y-4">
          <div
            v-for="(message, index) in messages"
            :key="`message-${index}`"
            class="message-item theme-manager-card border theme-manager-border rounded-lg p-4"
          >
            <!-- 消息头部 -->
            <div class="message-header flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <span class="text-sm font-mono theme-manager-text-secondary">#{{ index + 1 }}</span>
                <select 
                  v-model="message.role"
                  class="theme-manager-input text-sm py-1 px-2"
                >
                  <option value="system">系统</option>
                  <option value="user">用户</option>
                  <option value="assistant">助手</option>
                </select>
                
                <!-- 变量信息显示 -->
                <div v-if="getMessageVariables(index).detected.length > 0" class="flex items-center gap-2 text-xs">
                  <span class="theme-manager-text-secondary">
                    变量: {{ getMessageVariables(index).detected.length }}
                  </span>
                  <span v-if="getMessageVariables(index).missing.length > 0" class="text-amber-600">
                    缺失: {{ getMessageVariables(index).missing.length }}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center gap-1">
                <!-- 预览切换按钮 -->
                <button
                  @click="togglePreview(index)"
                  class="p-1 text-xs theme-manager-button-secondary"
                  :class="{ 'theme-manager-button-primary': previewMode[index] }"
                  title="切换预览"
                >
                  👁️
                </button>
                <button
                  v-if="index > 0"
                  @click="moveMessage(index, -1)"
                  class="p-1 text-xs theme-manager-button-secondary"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  v-if="index < messages.length - 1"
                  @click="moveMessage(index, 1)"
                  class="p-1 text-xs theme-manager-button-secondary"
                  title="下移"
                >
                  ↓
                </button>
                <button
                  @click="deleteMessage(index)"
                  :disabled="messages.length <= 1"
                  class="p-1 text-xs theme-manager-button-danger"
                  :class="{ 'opacity-50 cursor-not-allowed': messages.length <= 1 }"
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- 消息内容编辑区 -->
            <div class="message-content relative">
              <!-- 编辑模式 -->
              <div v-if="!previewMode[index]">
                <textarea
                  v-model="message.content"
                  :placeholder="getPlaceholderText(message.role)"
                  class="w-full theme-manager-input text-sm resize-none"
                  :style="{ minHeight: '120px', height: 'auto' }"
                  @input="autoResize($event.target)"
                  @select="handleTextSelection($event, index)"
                  rows="5"
                ></textarea>
              </div>
              
              <!-- 预览模式 -->
              <div v-else class="preview-content">
                <div class="preview-box theme-manager-input" 
                     :style="{ minHeight: '120px' }"
                     v-html="getPreviewHtml(index)">
                </div>
              </div>
              
              <!-- 缺失变量提示 -->
              <div v-if="getMessageVariables(index).missing.length > 0" class="variable-missing-hint mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <span class="text-amber-700 font-medium">缺失变量:</span>
                <span 
                  v-for="variable in getMessageVariables(index).missing.slice(0, 3)" 
                  :key="variable"
                  class="inline-flex items-center gap-1 ml-2"
                >
                  <button
                    @click="createMissingVariable(variable)"
                    class="text-amber-600 underline hover:text-amber-800 transition-colors"
                    :title="`点击创建变量 ${variable}`"
                  >
                    {{ variable }}
                  </button>
                </span>
                <span v-if="getMessageVariables(index).missing.length > 3" class="text-amber-600">
                  ... +{{ getMessageVariables(index).missing.length - 3 }}
                </span>
              </div>
              
              <!-- 变量提取提示 -->
              <div v-if="selectedText && selectedMessageIndex === index" 
                   class="variable-extraction-panel absolute right-0 top-0 mt-2 mr-2 p-3 theme-manager-card border theme-manager-border rounded-lg shadow-lg z-10"
                   style="max-width: 300px;">
                <h4 class="text-sm font-semibold theme-manager-text mb-2">提取变量</h4>
                <p class="text-xs theme-manager-text-secondary mb-2">选中的文本: "{{ selectedText.substring(0, 50) }}{{ selectedText.length > 50 ? '...' : '' }}"</p>
                
                <!-- 变量名建议 -->
                <div class="mb-3">
                  <label class="block text-xs font-medium theme-manager-text mb-1">建议的变量名:</label>
                  <div class="flex flex-wrap gap-1 mb-2">
                    <button
                      v-for="suggestion in variableSuggestions"
                      :key="suggestion.name"
                      @click="selectedVariableName = suggestion.name"
                      class="px-2 py-1 text-xs rounded border"
                      :class="selectedVariableName === suggestion.name 
                        ? 'theme-manager-button-primary' 
                        : 'theme-manager-button-secondary'"
                    >
                      {{ suggestion.name }}
                    </button>
                  </div>
                  <input
                    v-model="selectedVariableName"
                    placeholder="或输入自定义变量名"
                    class="w-full theme-manager-input text-xs py-1 px-2"
                  >
                </div>
                
                <div class="flex gap-2">
                  <button
                    @click="extractSelectedVariable"
                    :disabled="!selectedVariableName.trim()"
                    class="flex-1 px-3 py-1 text-xs theme-manager-button-primary"
                    :class="{ 'opacity-50 cursor-not-allowed': !selectedVariableName.trim() }"
                  >
                    提取变量
                  </button>
                  <button
                    @click="cancelVariableExtraction"
                    class="px-3 py-1 text-xs theme-manager-button-secondary"
                  >
                    取消
                  </button>
                </div>
              </div>
              
              <!-- 缺失变量提示 -->
              <div v-if="getMessageVariables(index).missing.length > 0" class="variable-missing-hint mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <span class="text-amber-700 font-medium">缺失变量:</span>
                <span 
                  v-for="variable in getMessageVariables(index).missing.slice(0, 3)" 
                  :key="variable"
                  class="inline-flex items-center gap-1 ml-2"
                >
                  <button
                    @click="createMissingVariable(variable)"
                    class="text-amber-600 underline hover:text-amber-800 transition-colors"
                    :title="`点击创建变量 ${variable}`"
                  >
                    {{ variable }}
                  </button>
                </span>
                <span v-if="getMessageVariables(index).missing.length > 3" class="text-amber-600">
                  ... +{{ getMessageVariables(index).missing.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具管理面板 -->
    <div v-if="tools.length > 0 || showToolsPanel" class="tools-panel border-t theme-manager-border bg-gray-50 dark:bg-gray-800 p-4">
      <div class="tools-header flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <h4 class="text-base font-semibold theme-manager-text">工具定义</h4>
          <span class="text-xs theme-manager-text-secondary px-2 py-0.5 theme-manager-tag rounded">
            {{ tools.length }} 个工具
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="addNewTool"
            class="px-3 py-1.5 text-xs theme-manager-button-primary"
          >
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加工具
          </button>
          <button
            @click="toggleToolsPanel"
            class="px-2 py-1.5 text-xs theme-manager-button-secondary"
          >
            <svg 
              class="w-3 h-3 transition-transform duration-200"
              :class="{ 'rotate-180': !showToolsPanel }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div v-if="showToolsPanel" class="tools-content space-y-3">
        <!-- 工具列表 -->
        <div v-for="(tool, index) in tools" :key="`tool-${index}`" class="tool-item theme-manager-card border theme-manager-border rounded-lg p-3">
          <div class="tool-header flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="font-medium theme-manager-text">{{ tool.function.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="editTool(index)"
                class="p-1 text-xs theme-manager-button-secondary"
                title="编辑工具"
              >
                ✏️
              </button>
              <button
                @click="copyTool(index)"
                class="p-1 text-xs theme-manager-button-secondary"
                title="复制工具"
              >
                📋
              </button>
              <button
                @click="deleteTool(index)"
                class="p-1 text-xs theme-manager-button-danger"
                title="删除工具"
              >
                🗑️
              </button>
            </div>
          </div>
          <div class="tool-description text-xs theme-manager-text-secondary mb-2">
            {{ tool.function.description || '无描述' }}
          </div>
          <div class="flex items-center gap-4 text-xs theme-manager-text-secondary">
            <span>参数: {{ Object.keys(tool.function.parameters?.properties || {}).length }} 个</span>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="tools.length === 0" class="empty-tools text-center py-8">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p class="text-sm theme-manager-text-secondary mb-3">尚未定义工具</p>
          <p class="text-xs theme-manager-text-secondary">工具可以让AI调用外部功能，如搜索、计算、API调用等</p>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center" @click="showImportDialog = false">
      <div class="theme-manager-card border theme-manager-border rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" @click.stop>
        <h3 class="text-lg font-semibold mb-4 theme-manager-text">导入数据</h3>
        
        <!-- 格式选择 -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 theme-manager-text">导入格式：</label>
          <div class="flex gap-2 mb-2">
            <button
              v-for="format in importFormats"
              :key="format.id"
              @click="selectedImportFormat = format.id"
              class="px-3 py-1 text-sm rounded border"
              :class="selectedImportFormat === format.id 
                ? 'theme-manager-button-primary' 
                : 'theme-manager-button-secondary'"
            >
              {{ format.name }}
            </button>
          </div>
          <p class="text-xs theme-manager-text-secondary">
            {{ importFormats.find(f => f.id === selectedImportFormat)?.description }}
          </p>
        </div>

        <!-- 文件上传或文本输入 -->
        <div class="mb-4">
          <div class="flex gap-2 mb-2">
            <input
              type="file"
              ref="fileInput"
              accept=".json,.txt"
              @change="handleFileUpload"
              class="hidden"
            >
            <button
              @click="fileInput?.click()"
              class="px-3 py-1 text-sm theme-manager-button-secondary"
            >
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              选择文件
            </button>
            <span class="text-sm theme-manager-text-secondary">或在下方粘贴文本</span>
          </div>
        </div>

        <textarea
          v-model="importData"
          class="w-full h-40 theme-manager-input text-sm font-mono"
          :placeholder="getImportPlaceholder()"
        ></textarea>
        <div v-if="importError" class="text-sm text-red-500 mt-2">
          {{ importError }}
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showImportDialog = false" class="px-4 py-2 theme-manager-button-secondary">取消</button>
          <button 
            @click="handleImport" 
            :disabled="!importData.trim()"
            class="px-4 py-2 theme-manager-button-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !importData.trim() }"
          >
            导入
          </button>
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <div v-if="showExportDialog" class="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center" @click="showExportDialog = false">
      <div class="theme-manager-card border theme-manager-border rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" @click.stop>
        <h3 class="text-lg font-semibold mb-4 theme-manager-text">导出数据</h3>
        <textarea
          :value="exportData"
          readonly
          class="w-full h-40 theme-manager-input text-sm font-mono"
        ></textarea>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showExportDialog = false" class="px-4 py-2 theme-manager-button-secondary">关闭</button>
          <button @click="copyExportData" class="px-4 py-2 theme-manager-button-primary">复制</button>
        </div>
      </div>
    </div>

    <!-- 工具编辑对话框 -->
    <div v-if="showToolEditDialog" class="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center" @click="showToolEditDialog = false">
      <div class="theme-manager-card border theme-manager-border rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" @click.stop>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold theme-manager-text">
            {{ editingToolIndex >= 0 ? '编辑工具' : '新建工具' }}
          </h3>
          <button @click="showToolEditDialog = false" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 工具编辑表单 -->
        <div class="flex-1 overflow-y-auto space-y-4">
          <!-- 基础信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2 theme-manager-text">函数名称 *</label>
              <input
                v-model="editingTool.function.name"
                type="text"
                placeholder="例如: search_web"
                class="w-full theme-manager-input text-sm"
                :class="{ 'border-red-500': toolValidationErrors.name }"
              >
              <p v-if="toolValidationErrors.name" class="text-xs text-red-500 mt-1">
                {{ toolValidationErrors.name }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 theme-manager-text">函数描述</label>
              <input
                v-model="editingTool.function.description"
                type="text"
                placeholder="例如: 在网络上搜索信息"
                class="w-full theme-manager-input text-sm"
              >
            </div>
          </div>
          
          <!-- 参数定义 -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium theme-manager-text">参数定义 (JSON Schema)</label>
              <div class="flex items-center gap-2">
                <button
                  @click="addParameterExample"
                  class="px-2 py-1 text-xs theme-manager-button-secondary"
                  title="添加示例参数"
                >
                  + 示例
                </button>
                <button
                  @click="validateToolParameters"
                  class="px-2 py-1 text-xs theme-manager-button-secondary"
                  title="验证JSON格式"
                >
                  验证
                </button>
              </div>
            </div>
            
            <textarea
              v-model="toolParametersJson"
              class="w-full h-48 theme-manager-input text-sm font-mono"
              :class="{ 'border-red-500': toolValidationErrors.parameters }"
              placeholder="请输入JSON Schema格式的参数定义..."
              @input="updateToolParameters"
            ></textarea>
            <p v-if="toolValidationErrors.parameters" class="text-xs text-red-500 mt-1">
              {{ toolValidationErrors.parameters }}
            </p>
          </div>
          
          <!-- 预览区域 -->
          <div>
            <label class="block text-sm font-medium mb-2 theme-manager-text">工具预览</label>
            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded border theme-manager-border">
              <pre class="text-xs theme-manager-text-secondary whitespace-pre-wrap">{{ getToolPreview() }}</pre>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end gap-2 pt-4 border-t theme-manager-border">
          <button @click="showToolEditDialog = false" class="px-4 py-2 theme-manager-button-secondary">取消</button>
          <button 
            @click="saveEditingTool" 
            :disabled="!isToolValid"
            class="px-4 py-2 theme-manager-button-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !isToolValid }"
          >
            {{ editingToolIndex >= 0 ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useContextEditor } from '../composables/useContextEditor'
import type { StandardPromptData, StandardMessage, ToolDefinition } from '../types'

const { copyText } = useClipboard()
const contextEditor = useContextEditor()

interface Props {
  initialData?: StandardPromptData | null
  availableVars?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  availableVars: () => ({})
})

const emit = defineEmits<{
  close: [data?: StandardPromptData]
  save: [data: StandardPromptData]
  'create-variable': [name: string, defaultValue?: string]
}>()

// 状态
const messages = ref<StandardMessage[]>([])
const tools = ref<ToolDefinition[]>([])
const showImportDialog = ref(false)
const showExportDialog = ref(false)
const importData = ref('')
const importError = ref('')
const selectedImportFormat = ref('conversation')
const fileInput = ref<HTMLInputElement | null>(null)

// 工具编辑器状态
const showToolEditDialog = ref(false)
const editingToolIndex = ref(-1)
const editingTool = ref<ToolDefinition>({
  type: 'function',
  function: {
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
})
const toolParametersJson = ref('')
const toolValidationErrors = ref<Record<string, string>>({})

// 导入格式选项
const importFormats = [
  {
    id: 'conversation',
    name: '会话格式',
    description: '标准的会话消息格式，包含 role 和 content 字段'
  },
  {
    id: 'langfuse',
    name: 'LangFuse',
    description: 'LangFuse 追踪数据格式，自动提取消息和变量'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI API 请求格式，支持工具调用'
  },
  {
    id: 'smart',
    name: '智能识别',
    description: '自动检测格式并转换'
  }
]

// 变量提取相关状态
const selectedText = ref('')
const selectedMessageIndex = ref(-1)
const selectedVariableName = ref('')
const variableSuggestions = ref<Array<{ name: string; confidence: number }>>([])
const textSelection = ref<{ start: number; end: number } | null>(null)

// 变量检测和预览相关
const previewMode = ref<Record<number, boolean>>({})
const availableVariables = ref<Record<string, string>>({})

// 工具管理相关状态
const showToolsPanel = ref(true) // 默认展开，有工具时显示

// 变量扫描函数
const scanVariables = (content: string): string[] => {
  const matches = content.match(/\{\{\s*([^}]+)\s*\}\}/g)
  if (!matches) return []
  
  return matches.map(match => {
    const varName = match.replace(/\{\{\s*|\s*\}\}/g, '')
    return varName
  })
}


// 检测指定消息的变量
const getMessageVariables = (messageIndex: number) => {
  const message = messages.value[messageIndex]
  if (!message) return { detected: [], missing: [] }
  
  const detected = scanVariables(message.content)
  const missing = detected.filter(varName => 
    availableVariables.value[varName] === undefined
  )
  
  return { detected, missing }
}

// 替换变量内容用于预览
const replaceVariables = (content: string, variables?: Record<string, string>): string => {
  const vars = variables || availableVariables.value
  
  return content.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varName) => {
    const trimmedName = varName.trim()
    if (vars[trimmedName] !== undefined) {
      return vars[trimmedName]
    }
    return match // 保持原样如果变量不存在
  })
}



// 生成预览HTML（包含高亮）
const getPreviewHtml = (messageIndex: number): string => {
  const message = messages.value[messageIndex]
  if (!message) return ''
  
  const replaced = replaceVariables(message.content, availableVariables.value)
  
  return replaced
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim()
      if (availableVariables.value[trimmedName] !== undefined) {
        return `<span class="variable-replaced">${availableVariables.value[trimmedName]}</span>`
      } else {
        return `<span class="variable-missing">${match}</span>`
      }
    })
}

// 初始化数据
onMounted(() => {
  if (props.initialData && props.initialData.messages) {
    messages.value = [...props.initialData.messages]
  }
  if (props.initialData && props.initialData.tools) {
    tools.value = [...props.initialData.tools]
  }
  // 初始化可用变量
  availableVariables.value = { ...props.availableVars }
})

// 监听可用变量变化
watch(() => props.availableVars, (newVars) => {
  availableVariables.value = { ...newVars }
}, { deep: true })

// 计算属性
const allUsedVariables = computed(() => {
  const variables = new Set<string>()
  
  // 扫描消息中的变量
  messages.value.forEach(message => {
    const messageVars = scanVariables(message.content)
    messageVars.forEach(v => variables.add(v))
  })
  
  
  return Array.from(variables)
})

const exportData = computed(() => {
  const data: StandardPromptData = {
    messages: messages.value,
    tools: tools.value.length > 0 ? tools.value : undefined,
    metadata: {
      source: 'context_editor',
      variables: {},
      tools_count: tools.value.length,
      exported_at: new Date().toISOString()
    }
  }
  return JSON.stringify(data, null, 2)
})

// 方法
const getPlaceholderText = (role: string) => {
  switch (role) {
    case 'system':
      return '请输入系统消息（定义AI行为和上下文）...'
    case 'user':
      return '请输入用户消息（您的输入或问题）...'
    case 'assistant':
      return '请输入助手消息（AI的回复）...'
    default:
      return '请输入消息内容...'
  }
}

const addMessage = () => {
  messages.value.push({
    role: 'user',
    content: ''
  })
}

const deleteMessage = (index: number) => {
  if (messages.value.length > 1) {
    messages.value.splice(index, 1)
  }
}

const moveMessage = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < messages.value.length) {
    const temp = messages.value[index]
    messages.value[index] = messages.value[newIndex]
    messages.value[newIndex] = temp
  }
}

const autoResize = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = 'auto'
  textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px'
}

// 工具管理方法
const toggleToolsPanel = () => {
  showToolsPanel.value = !showToolsPanel.value
}

const addNewTool = () => {
  resetToolEditor()
  showToolEditDialog.value = true
}

const deleteTool = (index: number) => {
  if (confirm('确定要删除这个工具吗？')) {
    tools.value.splice(index, 1)
  }
}

const copyTool = (index: number) => {
  const originalTool = tools.value[index]
  const copiedTool: ToolDefinition = {
    type: 'function',
    function: {
      name: `${originalTool.function.name}_copy`,
      description: originalTool.function.description,
      parameters: JSON.parse(JSON.stringify(originalTool.function.parameters || {}))
    }
  }
  tools.value.splice(index + 1, 0, copiedTool)
}

const editTool = (index: number) => {
  editingToolIndex.value = index
  const tool = tools.value[index]
  editingTool.value = {
    type: 'function',
    function: {
      name: tool.function.name,
      description: tool.function.description || '',
      parameters: JSON.parse(JSON.stringify(tool.function.parameters || {
        type: 'object',
        properties: {},
        required: []
      }))
    }
  }
  toolParametersJson.value = JSON.stringify(editingTool.value.function.parameters, null, 2)
  toolValidationErrors.value = {}
  showToolEditDialog.value = true
}

// 工具编辑器方法
const updateToolParameters = () => {
  try {
    const parsed = JSON.parse(toolParametersJson.value)
    editingTool.value.function.parameters = parsed
    if (toolValidationErrors.value.parameters) {
      delete toolValidationErrors.value.parameters
    }
  } catch (error) {
    // JSON解析错误，但不立即显示错误，等验证时显示
  }
}

const validateToolParameters = () => {
  toolValidationErrors.value = {}
  
  // 验证函数名
  if (!editingTool.value.function.name.trim()) {
    toolValidationErrors.value.name = '函数名称不能为空'
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(editingTool.value.function.name)) {
    toolValidationErrors.value.name = '函数名称只能包含字母、数字和下划线，且不能以数字开头'
  }
  
  // 验证参数JSON
  if (toolParametersJson.value.trim()) {
    try {
      const parsed = JSON.parse(toolParametersJson.value)
      editingTool.value.function.parameters = parsed
    } catch (error) {
      toolValidationErrors.value.parameters = `JSON格式错误: ${error.message}`
    }
  }
  
  return Object.keys(toolValidationErrors.value).length === 0
}

const addParameterExample = () => {
  const example = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询词'
      },
      count: {
        type: 'number',
        description: '返回结果数量',
        default: 10
      }
    },
    required: ['query']
  }
  toolParametersJson.value = JSON.stringify(example, null, 2)
  updateToolParameters()
}

const isToolValid = computed(() => {
  return editingTool.value.function.name.trim() !== '' && 
         !/\S/.test(toolValidationErrors.value.name || '') &&
         !/\S/.test(toolValidationErrors.value.parameters || '')
})

const getToolPreview = () => {
  return JSON.stringify(editingTool.value, null, 2)
}

const saveEditingTool = () => {
  if (!validateToolParameters()) {
    return
  }
  
  if (editingToolIndex.value >= 0) {
    // 更新现有工具
    tools.value[editingToolIndex.value] = { ...editingTool.value }
  } else {
    // 添加新工具
    tools.value.push({ ...editingTool.value })
  }
  
  showToolEditDialog.value = false
  resetToolEditor()
}

const resetToolEditor = () => {
  editingToolIndex.value = -1
  // 🆕 提供内置天气获取工具作为默认示例
  editingTool.value = {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (e.g., "Beijing", "New York")'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
            default: 'celsius'
          }
        },
        required: ['location']
      }
    }
  }
  toolParametersJson.value = JSON.stringify(editingTool.value.function.parameters, null, 2)
  toolValidationErrors.value = {}
}

// 切换预览模式
const togglePreview = (messageIndex: number) => {
  previewMode.value[messageIndex] = !previewMode.value[messageIndex]
}

// 创建缺失变量
const createMissingVariable = (variableName: string) => {
  // 生成默认值
  let defaultValue = ''
  if (variableName.toLowerCase().includes('name')) {
    defaultValue = 'Example Name'
  } else if (variableName.toLowerCase().includes('question')) {
    defaultValue = 'Your question here'
  } else if (variableName.toLowerCase().includes('description')) {
    defaultValue = 'Description here'
  } else {
    defaultValue = `Value for ${variableName}`
  }
  
  emit('create-variable', variableName, defaultValue)
}

// 文本选择处理
const handleTextSelection = (event: Event, messageIndex: number) => {
  const textarea = event.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (start !== end) {
    selectedText.value = textarea.value.substring(start, end)
    selectedMessageIndex.value = messageIndex
    textSelection.value = { start, end }
    selectedVariableName.value = ''
    
    // 生成变量名建议
    variableSuggestions.value = contextEditor.suggestVariableNames(selectedText.value)
    if (variableSuggestions.value.length > 0) {
      selectedVariableName.value = variableSuggestions.value[0].name
    }
  }
}

const extractSelectedVariable = () => {
  if (!selectedText.value || !selectedVariableName.value.trim() || !textSelection.value) {
    return
  }
  
  const message = messages.value[selectedMessageIndex.value]
  const { start, end } = textSelection.value
  
  // 替换选中文本为变量占位符
  const before = message.content.substring(0, start)
  const after = message.content.substring(end)
  message.content = before + `{{${selectedVariableName.value}}}` + after
  
  // 发出创建变量事件，这样变量会被注入到变量管理系统中
  emit('create-variable', selectedVariableName.value, selectedText.value)
  
  cancelVariableExtraction()
}

const cancelVariableExtraction = () => {
  selectedText.value = ''
  selectedMessageIndex.value = -1
  selectedVariableName.value = ''
  variableSuggestions.value = []
  textSelection.value = null
}

const handleImport = () => {
  try {
    let data: any
    
    // 根据选择的格式处理数据
    switch (selectedImportFormat.value) {
      case 'smart':
        // 使用智能导入
        const result = contextEditor.smartImport(JSON.parse(importData.value))
        if (result.success && result.data) {
          // 转换为会话格式
          const importedMessages = result.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (result.data.tools) {
            tools.value = [...result.data.tools]
          }
        } else {
          throw new Error(result.error || '智能导入失败')
        }
        break
        
      case 'langfuse':
        // LangFuse 格式导入
        const langfuseResult = contextEditor.convertFromLangFuse(JSON.parse(importData.value))
        if (langfuseResult.success && langfuseResult.data) {
          const importedMessages = langfuseResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (langfuseResult.data.tools) {
            tools.value = [...langfuseResult.data.tools]
          }
        } else {
          throw new Error(langfuseResult.error || 'LangFuse 导入失败')
        }
        break
        
      case 'openai':
        // OpenAI 格式导入
        const openaiResult = contextEditor.convertFromOpenAI(JSON.parse(importData.value))
        if (openaiResult.success && openaiResult.data) {
          const importedMessages = openaiResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (openaiResult.data.tools) {
            tools.value = [...openaiResult.data.tools]
          }
        } else {
          throw new Error(openaiResult.error || 'OpenAI 导入失败')
        }
        break
        
      case 'conversation':
      default:
        // 标准会话格式
        data = JSON.parse(importData.value)
        
        if (!Array.isArray(data.messages)) {
          throw new Error('Invalid format: messages must be an array')
        }
        
        // 验证消息格式
        for (const message of data.messages) {
          if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
            throw new Error(`Invalid message role: ${message.role}`)
          }
          if (typeof message.content !== 'string') {
            throw new Error('Invalid message content: must be string')
          }
        }
        
        messages.value = data.messages
        // 导入工具数据（如果存在）
        if (data.tools) {
          tools.value = [...data.tools]
        }
        break
    }
    
    importData.value = ''
    importError.value = ''
    showImportDialog.value = false
    
    console.log('[ContextEditor] Messages imported successfully')
  } catch (error) {
    importError.value = error.message || '导入失败'
    console.error('[ContextEditor] Failed to import messages:', error)
  }
}

const copyExportData = async () => {
  try {
    await copyText(exportData.value)
    showExportDialog.value = false
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const handleSave = () => {
  const data: StandardPromptData = {
    messages: messages.value,
    tools: tools.value.length > 0 ? tools.value : undefined,
    metadata: {
      source: 'context_editor',
      variables: {},
      tools_count: tools.value.length,
      saved_at: new Date().toISOString()
    }
  }
  emit('save', data)
}

const handleClose = () => {
  emit('close')
}

// 文件上传处理
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    importData.value = e.target?.result as string
  }
  reader.readAsText(file)
}

// 获取导入占位符
const getImportPlaceholder = () => {
  switch (selectedImportFormat.value) {
    case 'langfuse':
      return 'LangFuse 追踪数据，例如：\n{\n  "input": {\n    "messages": [...]\n  },\n  "output": {...}\n}'
    case 'openai':
      return 'OpenAI API 请求格式，例如：\n{\n  "messages": [...],\n  "model": "gpt-4",\n  "tools": [...]\n}'
    case 'smart':
      return '粘贴任意支持格式的 JSON 数据，系统将自动识别'
    default:
      return '标准会话格式，例如：\n{\n  "messages": [\n    {"role": "system", "content": "..."},\n    {"role": "user", "content": "..."}\n  ]\n}'
  }
}

// 监听文本区域自动调整高度
watch(messages, () => {
  nextTick(() => {
    const textareas = document.querySelectorAll('textarea')
    textareas.forEach(textarea => {
      autoResize(textarea as HTMLTextAreaElement)
    })
  })
}, { deep: true })
</script>

<style scoped>
.context-editor-fullscreen {
  display: flex;
  flex-direction: column;
}

.editor-content {
  flex: 1;
  min-height: 0;
}

.message-item {
  position: relative;
}

.variable-extraction-panel {
  width: 320px;
  min-width: 280px;
}

/* 角色下拉框样式 */
.message-header select {
  min-width: 80px;
  width: auto;
}

/* 文本区域自动调整高度 */
.message-content textarea {
  resize: vertical;
  overflow: hidden;
}

/* 深色模式适配 */
.dark .variable-extraction-panel {
  background-color: #1f2937;
  border-color: #374151;
}

/* 滚动条样式 */
.editor-content::-webkit-scrollbar {
  width: 8px;
}

.editor-content::-webkit-scrollbar-track {
  background: transparent;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.dark .editor-content::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .editor-content::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 预览框样式 */
.preview-box {
  background-color: #f9fafb;
  border-radius: 4px;
  min-height: 120px;
  padding: 8px;
  overflow-y: auto;
  word-wrap: break-word;
}

.dark .preview-box {
  background-color: #374151;
  color: #f9fafb;
}

/* 变量高亮 */
:deep(.variable-replaced) {
  background-color: rgba(22, 101, 52, 0.2);
  color: #166534;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

:deep(.variable-missing) {
  background-color: rgba(220, 38, 38, 0.2);
  color: #dc2626;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

.dark :deep(.variable-replaced) {
  background-color: rgba(22, 101, 52, 0.3);
  color: #86efac;
}

.dark :deep(.variable-missing) {
  background-color: rgba(220, 38, 38, 0.3);
  color: #fca5a5;
}

/* 缺失变量提示样式 */
.variable-missing-hint {
  background-color: #fef3c7;
  border-color: #f59e0b;
}

.dark .variable-missing-hint {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
}
</style>