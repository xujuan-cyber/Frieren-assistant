import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTemplateManager } from '../../src/composables/useTemplateManager'
import type { Template } from '@prompt-optimizer/core'

const sampleTemplate = (id: string, type: Template['metadata']['templateType']): Template => ({
  id,
  name: id,
  content: 'x',
  isBuiltin: false,
  metadata: { version: '1.0.0', lastModified: Date.now(), templateType: type }
})

const makeServices = () => {
  const setCalls: Array<{ key: string; value: string }>=[]
  const getCalls: string[]=[]
  const store = new Map<string, any>()
  const preferenceService = {
    async get<T>(key: string, def: T): Promise<T> { getCalls.push(key); return (store.has(key) ? store.get(key) : def) as T },
    async set<T>(key: string, value: T) { setCalls.push({ key, value: String(value) }); store.set(key, value) },
    async delete() {}, async keys(){return []}, async clear(){}, async getAll(){return {}}
  }
  const templateManager = {
    async getTemplate(id: string) { return sampleTemplate(id, 'optimize') },
    async listTemplatesByType(type: any) { return [sampleTemplate('t1', type)] },
    async listTemplates() { return [] }
  }
  return { services: ref({ preferenceService, templateManager } as any), setCalls, getCalls }
}

describe('useTemplateManager with function mode', () => {
  it('saves optimize selection to basic or pro keys', async () => {
    const { services, setCalls } = makeServices()
    const selectedOptimizeTemplate = ref<Template|null>(null)
    const selectedUserOptimizeTemplate = ref<Template|null>(null)
    const selectedIterateTemplate = ref<Template|null>(null)

    const tm = useTemplateManager(services as any, { selectedOptimizeTemplate, selectedUserOptimizeTemplate, selectedIterateTemplate })

    // basic mode: type='optimize'
    tm.handleTemplateSelect(sampleTemplate('basic-sys', 'optimize'), 'optimize', false)
    expect(setCalls.some(c => c.key.includes('app:selected-optimize-template'))).toBe(true)

    // pro mode: type='contextSystemOptimize'
    tm.handleTemplateSelect(sampleTemplate('pro-sys', 'contextSystemOptimize'), 'contextSystemOptimize', false)
    expect(setCalls.some(c => c.key.includes('app:selected-context-system-optimize-template'))).toBe(true)
  })
})

