export default {
  common: {
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    search: '搜索',
    settings: '设置',
    language: '语言',
    templates: '功能提示词',
    history: '历史记录',
    close: '关闭',
    test: '测试',
    enable: '启用',
    disable: '禁用',
    enabled: '已启用',
    disabled: '已禁用',
    add: '添加',
    title: '标题',
    description: '描述',
    lastModified: '最后修改',
    noDescription: '暂无描述',
    builtin: '内置',
    custom: '自定义',
    currentTemplate: '当前提示词',
    use: '使用',
    expand: '展开',
    collapse: '收起',
    clear: '清空',
    createdAt: '创建于',
    version: 'V{version}',
    optimize: '优化',
    iterate: '迭代',
    copySuccess: '复制成功',
    copyFailed: '复制失败',
    appName: '提示词优化器',
    selectFile: '选择文件',
  },
  nav: {
    home: '首页',
    dashboard: '仪表盘',
    promptOptimizer: '提示词优化器',
    modelManager: '模型管理',
    history: '历史记录',
    templates: '功能提示词',
  },
  promptOptimizer: {
    title: '提示词优化器',
    inputPlaceholder: '请输入需要优化的prompt...',
    optimize: '开始优化 →',
    history: '历史记录',
    save: '保存提示词',
    share: '分享',
    export: '导出',
    originalPrompt: '原始提示词',
    optimizeModel: '优化模型',
    templateLabel: '优化提示词',
  },
  settings: {
    title: '设置',
    language: '语言设置',
    theme: '主题设置',
    apiSettings: 'API设置',
    about: '关于',
  },
  modelManager: {
    title: '模型管理',
    modelList: '模型列表',
    testConnection: '测试连接',
    editModel: '编辑',
    deleteModel: '删除',
    displayName: '显示名称',
    modelKey: '模型标识',
    apiUrl: 'API地址',
    defaultModel: '默认模型',
    clickToFetchModels: '点击箭头获取模型列表',
    apiKey: 'API密钥',
    useVercelProxy: '使用Vercel代理',
    useVercelProxyHint: '使用Vercel代理可以帮助解决某些地区的连接问题',
    addModel: '添加',

    // 占位符
    modelKeyPlaceholder: '请输入模型标识',
    displayNamePlaceholder: '请输入显示名称',
    apiUrlPlaceholder: '请输入API地址',
    defaultModelPlaceholder: '输入或选择模型名称',
    apiKeyPlaceholder: '请输入API密钥',

    // 确认信息
    deleteConfirm: '确定要删除此模型吗？此操作不可恢复。',

    // 操作结果
    testSuccess: '{provider}连接测试成功',
    testFailed: '{provider}连接测试失败：{error}',
    updateSuccess: '更新成功',
    updateFailed: '更新失败：{error}',
    addSuccess: '添加成功',
    addFailed: '添加失败：{error}',
    enableSuccess: '启用成功',
    enableFailed: '启用失败：{error}',
    disableSuccess: '禁用成功',
    disableFailed: '禁用失败：{error}',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败：{error}',
    fetchModelsSuccess: '成功获取 {count} 个模型',
    loadingModels: '正在加载模型选项...',
    noModelsAvailable: '没有可用模型',
    selectModel: '选择一个模型',
    fetchModelsFailed: '获取模型列表失败：{error}',
    needApiKeyAndBaseUrl: '请先填写API地址和密钥',

    // 状态文本
    disabled: '已禁用',

    // 无障碍标签
    testConnectionAriaLabel: '测试连接到{name}',
    editModelAriaLabel: '编辑模型{name}',
    enableModelAriaLabel: '启用模型{name}',
    disableModelAriaLabel: '禁用模型{name}',
    deleteModelAriaLabel: '删除模型{name}',
    displayNameAriaLabel: '模型显示名称',
    apiUrlAriaLabel: '模型API地址',
    defaultModelAriaLabel: '默认模型名称',
    apiKeyAriaLabel: 'API密钥',
    useVercelProxyAriaLabel: '是否使用Vercel代理',
    cancelEditAriaLabel: '取消编辑模型',
    saveEditAriaLabel: '保存模型修改',
    cancelAddAriaLabel: '取消添加模型',
    confirmAddAriaLabel: '确认添加模型'
  },
  templateManager: {
    title: '功能提示词管理',
    optimizeTemplates: '优化提示词',
    iterateTemplates: '迭代提示词',
    optimizeTemplateList: '优化提示词列表',
    iterateTemplateList: '迭代提示词列表',
    addTemplate: '添加',
    editTemplate: '编辑',
    deleteTemplate: '删除',
    templateCount: '{count}个提示词',

    // 按钮文本
    importTemplate: '导入',
    exportTemplate: '导出',
    copyTemplate: '复制',
    useTemplate: '使用此提示词',
    viewTemplate: '查看',

    // 表单字段
    name: '提示词名称',
    content: '提示词内容',
    description: '描述',
    type: '类型',

    // 占位符
    namePlaceholder: '请输入提示词名称',
    contentPlaceholder: '请输入提示词内容',
    descriptionPlaceholder: '请输入提示词描述（可选）',
    searchPlaceholder: '搜索提示词...',

    // 确认信息
    deleteConfirm: '确定要删除此提示词吗？此操作不可恢复。',

    // 操作结果
    updateSuccess: '提示词更新成功',
    updateFailed: '提示词更新失败',
    addSuccess: '提示词添加成功',
    addFailed: '提示词添加失败',
    deleteSuccess: '提示词删除成功',
    deleteFailed: '提示词删除失败',
    copySuccess: '提示词复制成功',
    copyFailed: '提示词复制失败',
    importSuccess: '提示词导入成功',
    importFailed: '提示词导入失败',
    exportSuccess: '提示词导出成功',
    exportFailed: '提示词导出失败',

    // 无障碍标签
    editTemplateAriaLabel: '编辑提示词{name}',
    deleteTemplateAriaLabel: '删除提示词{name}',
    nameAriaLabel: '提示词名称输入框',
    contentAriaLabel: '提示词内容输入框',
    descriptionAriaLabel: '提示词描述输入框',
    typeAriaLabel: '提示词类型选择',
    searchAriaLabel: '搜索提示词',
    cancelEditAriaLabel: '取消编辑提示词',
    saveEditAriaLabel: '保存提示词修改',
    cancelAddAriaLabel: '取消添加提示词',
    confirmAddAriaLabel: '确认添加提示词',
    importTemplateAriaLabel: '导入提示词',
    exportTemplateAriaLabel: '导出提示词',
    copyTemplateAriaLabel: '复制提示词{name}',
    useTemplateAriaLabel: '使用提示词{name}',
    viewTemplateAriaLabel: '查看提示词{name}'
  },
  history: {
    title: '历史记录',
    iterationNote: '迭代说明',
    optimizedPrompt: '优化后',
    confirmClear: '确定要清空所有历史记录吗？此操作不可恢复。',
    confirmDeleteChain: '确定要删除此条历史记录吗？此操作不可恢复。',
    cleared: '历史记录已清空',
    chainDeleted: '历史记录已删除',
    useThisVersion: '使用此版本',
    noHistory: '暂无历史记录'
  },
  theme: {
    title: '主题设置',
    light: '日间模式',
    dark: '夜间模式',
    blue: '蓝色模式',
    green: '绿色模式',
    purple: '暗紫模式'
  },
  test: {
    content: '测试内容',
    placeholder: '请输入要测试的内容...',
    model: '模型',
    startTest: '开始测试 →',
    startCompare: '开始对比 →',
    testing: '测试中...',
    toggleCompare: {
      enable: '开启对比',
      disable: '关闭对比'
    },
    originalResult: '原始提示词结果',
    optimizedResult: '优化后提示词结果',
    testResult: '测试结果',
    error: {
      failed: '测试失败',
      noModel: '请先选择测试模型'
    },
    enableMarkdown: '启用Markdown渲染',
    disableMarkdown: '关闭Markdown渲染',
    thinking: '思考过程'
  },
  template: {
    noDescription: '暂无描述',
    configure: '配置提示词',
    selected: '已选择',
    select: '选择',
    type: {
      optimize: '优化',
      iterate: '迭代'
    },
    view: '查看',
    edit: '编辑',
    add: '添加',
    name: '提示词名称',
    namePlaceholder: '输入提示词名称',
    content: '提示词内容',
    contentPlaceholder: '输入提示词内容',
    description: '描述',
    descriptionPlaceholder: '输入提示词描述（可选）',
    close: '关闭',
    cancel: '取消',
    save: '保存修改',
    import: {
      title: '导入提示词',
      supportFormat: '支持 .json 格式的提示词文件'
    },
    unknownTime: '未知',
    deleteConfirm: '确定要删除这个提示词吗？此操作不可恢复。',
    success: {
      updated: '提示词已更新',
      added: '提示词已添加',
      deleted: '提示词已删除',
      exported: '提示词已导出',
      imported: '提示词已导入'
    },
    error: {
      loadFailed: '加载提示词失败',
      saveFailed: '保存提示词失败',
      deleteFailed: '删除提示词失败',
      exportFailed: '导出提示词失败',
      importFailed: '导入提示词失败',
      readFailed: '读取文件失败'
    }
  },
  prompt: {
    optimized: '优化后的提示词',
    optimizing: '优化中...',
    continueOptimize: '继续优化',
    copy: '复制',
    optimizedPlaceholder: '优化后的提示词将显示在这里...',
    iterateDirection: '请输入需要优化的方向：',
    iteratePlaceholder: '例如：使提示词更简洁、增加特定功能描述等...',
    confirmOptimize: '确认优化',
    iterateTitle: '迭代功能提示词',
    selectIterateTemplate: '请选择迭代提示词：',
    error: {
      noTemplate: '请先选择迭代提示词'
    }
  },
  output: {
    title: '测试结果',
    copy: '复制',
    placeholder: '测试结果将显示在这里...',
    processing: '处理中...',
    success: {
      copied: '复制成功'
    },
    error: {
      copyFailed: '复制失败'
    }
  },
  model: {
    select: {
      placeholder: '请选择模型',
      configure: '配置模型',
      noModels: '请配置模型',
      noAvailableModels: '暂无可用模型'
    },
    manager: {
      displayName: '例如: 自定义模型',
      apiUrl: 'API 地址',
      defaultModel: '默认模型名称',
      modelNamePlaceholder: '例如: gpt-3.5-turbo'
    }
  },
  toast: {
    error: {
      serviceInit: '服务未初始化，请稍后重试',
      optimizeFailed: '优化失败',
      iterateFailed: '迭代优化失败',
      testFailed: '测试失败',
      testError: '测试过程中发生错误',
      loadTemplatesFailed: '加载提示词失败',
      initFailed: '初始化失败：{error}',
      loadModelsFailed: '加载模型列表失败',
      initModelSelectFailed: '初始化模型选择失败',
      initTemplateSelectFailed: '初始化模板选择失败',
      loadHistoryFailed: '加载历史记录失败',
      clearHistoryFailed: '清空历史记录失败',
      historyChainDeleteFailed: '删除历史记录失败',
      selectTemplateFailed: '选择提示词失败：{error}',
      noOptimizeTemplate: '请先选择优化提示词',
      noIterateTemplate: '请先选择迭代提示词',
      incompleteTestInfo: '请填写完整的测试信息',
      noDefaultTemplate: '无法加载默认提示词',
      optimizeProcessFailed: '优化过程出错',
      testProcessError: '测试过程中发生错误',
      initTemplateFailed: '初始化模板选择失败'
    },
    success: {
      optimizeSuccess: '优化成功',
      iterateSuccess: '迭代优化成功',
      modelSelected: '已选择模型: {name}',
      templateSelected: '已选择{type}提示词: {name}',
      historyClear: '历史记录已清空',
      historyChainDeleted: '历史记录已删除'
    },
    warn: {
      loadOptimizeTemplateFailed: '加载已保存的优化提示词失败',
      loadIterateTemplateFailed: '加载已保存的迭代提示词失败'
    },
    info: {
      modelUpdated: '模型已更新',
      templateSelected: '选择模板'
    }
  },
  log: {
    info: {
      initBaseServicesStart: '开始初始化基础服务...',
      templateList: '模板列表',
      createPromptService: '创建提示词服务...',
      initComplete: '初始化完成',
      templateSelected: '已选择模板'
    },
    error: {
      initBaseServicesFailed: '初始化基础服务失败'
    }
  }
}; 