export default {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    settings: 'Settings',
    language: 'Language',
    templates: 'Templates',
    history: 'History',
    close: 'Close',
    test: 'Test',
    enable: 'Enable',
    disable: 'Disable',
    enabled: 'Enabled',
    disabled: 'Disabled',
    add: 'Add',
    title: 'Title',
    description: 'Description',
    lastModified: 'Last Modified',
    noDescription: 'No description',
    builtin: 'Built-in',
    custom: 'Custom',
    currentTemplate: 'Current Template',
    use: 'Use',
    expand: 'Expand',
    collapse: 'Collapse',
    clear: 'Clear',
    createdAt: 'Created at',
    version: 'V{version}',
    optimize: 'Optimize',
    iterate: 'Iterate',
    copySuccess: 'Copy Success',
    copyFailed: 'Copy Failed',
    appName: 'Prompt Optimizer',
    selectFile: 'Select File',
  },
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    promptOptimizer: 'Prompt Optimizer',
    modelManager: 'Model Manager',
    history: 'History',
    templates: 'Templates',
  },
  promptOptimizer: {
    title: 'Prompt Optimizer',
    inputPlaceholder: 'Enter your prompt to optimize...',
    optimize: 'Optimize →',
    history: 'History',
    save: 'Save Prompt',
    share: 'Share',
    export: 'Export',
    originalPrompt: 'Original Prompt',
    optimizeModel: 'Optimization Model',
    templateLabel: 'Optimization Template',
  },
  settings: {
    title: 'Settings',
    language: 'Language Settings',
    theme: 'Theme Settings',
    apiSettings: 'API Settings',
    about: 'About',
  },
  modelManager: {
    title: 'Model Manager',
    modelList: 'Model List',
    testConnection: 'Test Connection',
    editModel: 'Edit',
    deleteModel: 'Delete',
    displayName: 'Display Name',
    modelKey: 'Model Key',
    apiUrl: 'API URL',
    defaultModel: 'Default Model',
    clickToFetchModels: 'Click arrow to fetch model list',
    apiKey: 'API Key',
    useVercelProxy: 'Use Vercel Proxy',
    useVercelProxyHint: 'Using Vercel proxy can help resolve connection issues in certain regions',
    addModel: 'Add',

    // Placeholders
    modelKeyPlaceholder: 'Enter model key',
    displayNamePlaceholder: 'Enter display name',
    apiUrlPlaceholder: 'Enter API URL',
    defaultModelPlaceholder: 'Type or select a model name',
    apiKeyPlaceholder: 'Enter API key',

    // Confirmation
    deleteConfirm: 'Are you sure you want to delete this model? This action cannot be undone.',

    // Operation Results
    testSuccess: 'Connection successful for {provider}!',
    testFailed: 'Connection failed for {provider}: {error}',
    updateSuccess: 'Update successful',
    updateFailed: 'Update failed: {error}',
    addSuccess: 'Model added successfully',
    addFailed: 'Failed to add model: {error}',
    enableSuccess: 'Model enabled',
    enableFailed: 'Failed to enable model: {error}',
    disableSuccess: 'Model disabled',
    disableFailed: 'Failed to disable model: {error}',
    deleteSuccess: 'Model deleted',
    deleteFailed: 'Failed to delete model: {error}',
    fetchModelsSuccess: 'Successfully retrieved 1 model | Successfully retrieved {count} models',
    loadingModels: 'Loading model options...',
    noModelsAvailable: 'No models available',
    selectModel: 'Select a model',
    fetchModelsFailed: 'Failed to fetch models: {error}',
    needApiKeyAndBaseUrl: 'Please fill API key and base URL first',

    // Status Text
    disabled: 'Disabled',

    // Accessibility Labels
    testConnectionAriaLabel: 'Test connection to {name}',
    editModelAriaLabel: 'Edit model {name}',
    enableModelAriaLabel: 'Enable model {name}',
    disableModelAriaLabel: 'Disable model {name}',
    deleteModelAriaLabel: 'Delete model {name}',
    displayNameAriaLabel: 'Model display name',
    apiUrlAriaLabel: 'Model API URL',
    defaultModelAriaLabel: 'Default model name',
    apiKeyAriaLabel: 'API key',
    useVercelProxyAriaLabel: 'Use Vercel proxy',
    cancelEditAriaLabel: 'Cancel editing model',
    saveEditAriaLabel: 'Save model changes',
    cancelAddAriaLabel: 'Cancel adding model',
    confirmAddAriaLabel: 'Confirm add model'
  },
  templateManager: {
    title: 'Template Manager',
    optimizeTemplates: 'Optimization Templates',
    iterateTemplates: 'Iteration Templates',
    optimizeTemplateList: 'Optimization Template List',
    iterateTemplateList: 'Iteration Template List',
    addTemplate: 'Add',
    editTemplate: 'Edit',
    deleteTemplate: 'Delete',
    templateCount: '{count} template | {count} templates',

    // Button Text
    importTemplate: 'Import',
    exportTemplate: 'Export',
    copyTemplate: 'Copy',
    useTemplate: 'Use',
    viewTemplate: 'View',

    // Form Fields
    name: 'Template Name',
    content: 'Template Content',
    description: 'Description',
    type: 'Type',

    // Placeholders
    namePlaceholder: 'Enter template name',
    contentPlaceholder: 'Enter template content',
    descriptionPlaceholder: 'Enter template description (optional)',
    searchPlaceholder: 'Search templates...',

    // Confirmation
    deleteConfirm: 'Are you sure you want to delete this template? This action cannot be undone.',

    // Operation Results
    updateSuccess: 'Template updated successfully',
    updateFailed: 'Failed to update template',
    addSuccess: 'Template added successfully',
    addFailed: 'Failed to add template',
    deleteSuccess: 'Template deleted successfully',
    deleteFailed: 'Failed to delete template',
    copySuccess: 'Template copied successfully',
    copyFailed: 'Failed to copy template',
    importSuccess: 'Template imported successfully',
    importFailed: 'Failed to import template',
    exportSuccess: 'Template exported successfully',
    exportFailed: 'Failed to export template',

    // Accessibility Labels
    editTemplateAriaLabel: 'Edit template {name}',
    deleteTemplateAriaLabel: 'Delete template {name}',
    nameAriaLabel: 'Template name input',
    contentAriaLabel: 'Template content input',
    descriptionAriaLabel: 'Template description input',
    typeAriaLabel: 'Template type selection',
    searchAriaLabel: 'Search templates',
    cancelEditAriaLabel: 'Cancel editing template',
    saveEditAriaLabel: 'Save template changes',
    cancelAddAriaLabel: 'Cancel adding template',
    confirmAddAriaLabel: 'Confirm add template',
    importTemplateAriaLabel: 'Import template',
    exportTemplateAriaLabel: 'Export template',
    copyTemplateAriaLabel: 'Copy template {name}',
    useTemplateAriaLabel: 'Use template {name}',
    viewTemplateAriaLabel: 'View template {name}'
  },
  history: {
    title: 'History',
    iterationNote: 'Iteration Note',
    optimizedPrompt: 'Optimized Prompt',
    confirmClear: 'Are you sure you want to clear all history records? This action cannot be undone.',
    confirmDeleteChain: 'Are you sure you want to delete this history record? This action cannot be undone.',
    cleared: 'History cleared',
    chainDeleted: 'History record deleted',
    useThisVersion: 'Use This Version',
    noHistory: 'No history records'
  },
  theme: {
    title: 'Theme Settings',
    light: 'Light Mode',
    dark: 'Dark Mode',
    blue: 'Blue Mode',
    green: 'Green Mode',
    purple: 'Purple Mode'
  },
  test: {
    content: 'Test Content',
    placeholder: 'Enter content to test...',
    model: 'Model',
    startTest: 'Start Test →',
    startCompare: 'Start Compare Test →',
    testing: 'Testing...',
    toggleCompare: {
      enable: 'Enable Compare',
      disable: 'Disable Compare'
    },
    originalResult: 'Original Prompt Result',
    optimizedResult: 'Optimized Prompt Result',
    testResult: 'Test Result',
    error: {
      failed: 'Test Failed',
      noModel: 'Please select a test model first'
    },
    enableMarkdown: 'Enable Markdown rendering',
    disableMarkdown: 'Disable Markdown rendering',
    thinking: 'Thinking Process'
  },
  template: {
    noDescription: 'No Description',
    configure: 'Configure Template',
    selected: 'Selected',
    select: 'Select',
    type: {
      optimize: 'Optimize',
      iterate: 'Iterate'
    },
    view: 'View',
    edit: 'Edit',
    add: 'Add',
    name: 'Template Name',
    namePlaceholder: 'Enter template name',
    content: 'Template Content',
    contentPlaceholder: 'Enter template content',
    description: 'Description',
    descriptionPlaceholder: 'Enter template description (optional)',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save Changes',
    import: {
      title: 'Import Template',
      supportFormat: 'Supports .json format template files'
    },
    unknownTime: 'Unknown',
    deleteConfirm: 'Are you sure you want to delete this template? This action cannot be undone.',
    success: {
      updated: 'Template updated',
      added: 'Template added',
      deleted: 'Template deleted',
      exported: 'Template exported',
      imported: 'Template imported'
    },
    error: {
      loadFailed: 'Failed to load template',
      saveFailed: 'Failed to save template',
      deleteFailed: 'Failed to delete template',
      exportFailed: 'Failed to export template',
      importFailed: 'Failed to import template',
      readFailed: 'Failed to read file'
    }
  },
  prompt: {
    optimized: 'Optimized Prompt',
    optimizing: 'Optimizing...',
    continueOptimize: 'Continue Optimize',
    copy: 'Copy',
    optimizedPlaceholder: 'Optimized prompt will be shown here...',
    iterateDirection: 'Please enter optimization direction:',
    iteratePlaceholder: 'e.g., Make the prompt more concise, add specific functionality description, etc...',
    confirmOptimize: 'Confirm Optimize',
    iterateTitle: 'Iteration Template',
    selectIterateTemplate: 'Please select iteration template:',
    error: {
      noTemplate: 'Please select an iteration template first'
    }
  },
  output: {
    title: 'Test Result',
    copy: 'Copy',
    placeholder: 'Test result will be shown here...',
    processing: 'Processing...',
    success: {
      copied: 'Copied successfully'
    },
    error: {
      copyFailed: 'Copy failed'
    }
  },
  model: {
    select: {
      placeholder: 'Please select a model',
      configure: 'Configure Model',
      noModels: 'No model',
      noAvailableModels: 'No available models'
    },
    manager: {
      displayName: 'e.g., Custom Model',
      apiUrl: 'API URL',
      defaultModel: 'Default Model Name',
      modelNamePlaceholder: 'e.g., gpt-3.5-turbo'
    }
  },
  toast: {
    error: {
      serviceInit: 'Service not initialized, please try again later',
      optimizeFailed: 'Optimization failed',
      iterateFailed: 'Iteration optimization failed',
      testFailed: 'Test failed',
      testError: 'Error occurred during test',
      loadTemplatesFailed: 'Failed to load templates',
      initFailed: 'Initialization failed: {error}',
      loadModelsFailed: 'Failed to load model list',
      initModelSelectFailed: 'Failed to initialize model selection',
      initTemplateSelectFailed: 'Failed to initialize template selection',
      loadHistoryFailed: 'Failed to load history',
      clearHistoryFailed: 'Failed to clear history',
      historyChainDeleteFailed: 'Failed to delete history record',
      selectTemplateFailed: 'Failed to select template: {error}',
      noOptimizeTemplate: 'Please select an optimization template first',
      noIterateTemplate: 'Please select an iteration template first',
      incompleteTestInfo: 'Please fill in complete test information',
      noDefaultTemplate: 'Failed to load default template',
      optimizeProcessFailed: 'Error in optimization process',
      testProcessError: 'Error occurred during test process',
      initTemplateFailed: 'Failed to initialize template selection'
    },
    success: {
      optimizeSuccess: 'Optimization successful',
      iterateSuccess: 'Iteration optimization successful',
      modelSelected: 'Model selected: {name}',
      templateSelected: '{type} template selected: {name}',
      historyClear: 'History cleared',
      historyChainDeleted: 'History record deleted'
    },
    warn: {
      loadOptimizeTemplateFailed: 'Failed to load saved optimization template',
      loadIterateTemplateFailed: 'Failed to load saved iteration template'
    },
    info: {
      modelUpdated: 'Model updated',
      templateSelected: 'Template selected'
    }
  },
  log: {
    info: {
      initBaseServicesStart: 'Starting to initialize base services...',
      templateList: 'Template list',
      createPromptService: 'Creating prompt service...',
      initComplete: 'Initialization complete',
      templateSelected: 'Template selected'
    },
    error: {
      initBaseServicesFailed: 'Failed to initialize base services'
    }
  }
}; 