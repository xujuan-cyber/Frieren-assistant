import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import DataManager from '../../../src/components/DataManager.vue'

const isRunningInElectronMock = vi.fn(() => false)

vi.mock('@prompt-optimizer/core', () => ({
  isRunningInElectron: () => isRunningInElectronMock(),
}))

const naiveStubs = {
  NModal: {
    name: 'NModal',
    template: '<div v-if="show" class="n-modal" :style="style"><slot /></div>',
    props: ['show', 'title', 'preset', 'style', 'size', 'bordered', 'segmented'],
    emits: ['update:show'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'align', 'justify'],
  },
  NText: {
    name: 'NText',
    template: '<span><slot /></span>',
    props: ['tag', 'depth', 'strong', 'type'],
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
    props: ['disabled', 'loading', 'type', 'block', 'size'],
    emits: ['click'],
  },
  NUpload: {
    name: 'NUpload',
    template: '<div class="n-upload"><slot /></div>',
    props: ['fileList', 'accept', 'showFileList', 'customRequest', 'disabled'],
    emits: ['change'],
  },
  NUploadDragger: {
    name: 'NUploadDragger',
    template: '<div class="n-upload-dragger"><slot /></div>',
  },
  NIcon: {
    name: 'NIcon',
    template: '<i><slot /></i>',
    props: ['size', 'depth'],
  },
  NAlert: {
    name: 'NAlert',
    template: '<div class="n-alert"><slot /></div>',
    props: ['type', 'showIcon'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><slot /></section>',
    props: ['size', 'bordered'],
  },
  NStatistic: {
    name: 'NStatistic',
    template: '<div class="n-statistic"><div>{{ label }}</div><div>{{ value }}</div><slot /></div>',
    props: ['label', 'value'],
  },
  NGrid: {
    name: 'NGrid',
    template: '<div class="n-grid"><slot /></div>',
    props: ['cols', 'xGap', 'yGap'],
  },
  NGridItem: {
    name: 'NGridItem',
    template: '<div class="n-grid-item"><slot /></div>',
    props: ['span'],
  },
}

const createServices = () => ({
  dataManager: {
    exportAllData: vi.fn().mockResolvedValue('{}'),
    importAllData: vi.fn().mockResolvedValue(undefined),
  },
  modelManager: {
    exportData: vi.fn().mockResolvedValue([{ id: 'model-1' }]),
  },
  templateManager: {
    exportData: vi.fn().mockResolvedValue([{ id: 'template-1' }]),
  },
  historyManager: {
    exportData: vi.fn().mockResolvedValue([{ id: 'history-1' }]),
  },
  contextRepo: {
    exportData: vi.fn().mockResolvedValue({
      type: 'context-bundle',
      version: '1.0.0',
      currentId: 'ctx-1',
      contexts: [],
    }),
    exportAll: vi.fn().mockResolvedValue({
      type: 'context-bundle',
      version: '1.0.0',
      currentId: 'ctx-1',
      contexts: [],
    }),
    importAll: vi.fn().mockResolvedValue({
      imported: 0,
      skipped: 0,
      predefinedVariablesRemoved: 0,
    }),
  },
  preferenceService: {
    exportData: vi.fn().mockResolvedValue({ theme: 'light' }),
  },
  imageStorageService: {
    getStorageStats: vi.fn().mockResolvedValue({
      count: 2,
      totalBytes: 2048,
      oldestAt: 1,
      newestAt: 2,
    }),
  },
  favoriteImageStorageService: {
    getStorageStats: vi.fn().mockResolvedValue({
      count: 1,
      totalBytes: 1024,
      oldestAt: 3,
      newestAt: 4,
    }),
  },
})

const mountComponent = (services = createServices()) =>
  mount(DataManager, {
    props: {
      show: true,
    },
    global: {
      stubs: naiveStubs,
      provide: {
        services: ref(services as any),
      },
    },
  })

describe('DataManager storage breakdown', () => {
  beforeEach(() => {
    isRunningInElectronMock.mockReset()
    isRunningInElectronMock.mockReturnValue(false)
    delete (window as any).electronAPI
  })

  afterEach(() => {
    delete (window as any).electronAPI
  })

  it('shows storage usage on web and keeps cache/favorite items separate', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    const modal = wrapper.find('.n-modal')
    const text = wrapper.text()
    expect(modal.attributes('style')).toContain('width: 90vw;')
    expect(modal.attributes('style')).toContain('max-width: 1200px;')
    expect(modal.attributes('style')).toContain('max-height: 90vh;')
    expect(wrapper.findAll('.storage-stat-card')).toHaveLength(4)
    expect(text).toContain('Total (Includes Estimate)')
    expect(text).toContain('Data Backup')
    expect(text).toContain('App Main Data (Estimated)')
    expect(text).toContain('Session/Result Image Cache')
    expect(text).toContain('Favorite Images')
    expect(text).toContain('Includes models, templates, history, contexts and settings')
    expect(text).toContain('2 images')
    expect(text).toContain('1 images')
    expect(text).not.toContain('上下文集合')
    expect(text).not.toContain('导出上下文集合')
    expect(text).not.toContain('导入上下文集合')
    expect(text).not.toContain('Backup Data')
    expect(text).not.toContain('Data directory')
  })

  it('shows desktop backup and storage directory actions in electron', async () => {
    isRunningInElectronMock.mockReturnValue(true)
    ;(window as any).electronAPI = {
      data: {
        getStorageInfo: vi.fn().mockResolvedValue({
          userDataPath: 'C:/PromptOptimizer/data',
          mainFilePath: 'C:/PromptOptimizer/data.json',
          mainSizeBytes: 4096,
          backupFilePath: 'C:/PromptOptimizer/data.backup.json',
          backupSizeBytes: 512,
          totalBytes: 4608,
        }),
        openStorageDirectory: vi.fn().mockResolvedValue(true),
      },
    }

    const wrapper = mountComponent()

    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Backup Data')
    expect(text).toContain('Data directory')
    expect(text).toContain('C:/PromptOptimizer/data')
    expect(text).toContain('Open directory')
    expect(text).toContain('Refresh')
  })

  it('renders backup export and import as a compact action layout', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    const text = wrapper.text()
    expect(wrapper.findAll('.backup-action-panel')).toHaveLength(2)
    expect(wrapper.find('.backup-action-panel--export').exists()).toBe(true)
    expect(wrapper.find('.backup-action-panel--import').exists()).toBe(true)
    expect(wrapper.find('.import-panel-body').exists()).toBe(true)
    expect(text).toContain('Export Current App Data')
    expect(text).toContain('Import Backup File')
    expect(text).not.toContain('导出上下文集合')
    expect(text).not.toContain('导入上下文集合')
  })
})
