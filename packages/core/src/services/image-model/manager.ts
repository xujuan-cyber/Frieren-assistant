import { IImageModelManager, ImageModelConfig } from '../image/types'
import { IStorageProvider } from '../storage/types'
import { StorageAdapter } from '../storage/adapter'
import { CORE_SERVICE_KEYS } from '../../constants/storage-keys'
import { ImportExportError } from '../../interfaces/import-export'
import { APIError } from '../llm/errors'
import { getDefaultImageModels } from './defaults'

/**
 * 图像模型管理器：与文本模型管理器解耦，使用独立存储键
 */
export class ImageModelManager implements IImageModelManager {
  private readonly storageKey = CORE_SERVICE_KEYS.IMAGE_MODELS
  private readonly storage: IStorageProvider
  private initPromise: Promise<void>

  constructor(storageProvider: IStorageProvider) {
    this.storage = new StorageAdapter(storageProvider)
    this.initPromise = this.init().catch(err => {
      console.error('[ImageModelManager] initialization failed:', err)
      throw err
    })
  }

  public async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  public async isInitialized(): Promise<boolean> {
    const stored = await this.storage.getItem(this.storageKey)
    return !!stored
  }

  private async init(): Promise<void> {
    const storedRaw = await this.storage.getItem(this.storageKey)
    const defaults = getDefaultImageModels()

    if (!storedRaw) {
      // 初次写入默认模型
      await this.storage.setItem(this.storageKey, JSON.stringify(defaults))
      return
    }

    // 合并已有配置与默认配置（保留用户关键自定义字段）
    let needSave = false
    let existing: Record<string, ImageModelConfig>
    try {
      const parsed = JSON.parse(storedRaw)
      existing = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      existing = {}
    }

    const merged: Record<string, ImageModelConfig> = { ...existing }
    for (const [key, defCfg] of Object.entries(defaults)) {
      if (!merged[key]) {
        merged[key] = defCfg
        needSave = true
      } else {
        const cur = merged[key]
        const updated: ImageModelConfig = {
          ...defCfg,
          name: cur.name !== undefined ? cur.name : defCfg.name,
          baseURL: cur.baseURL || defCfg.baseURL,
          defaultModel: cur.defaultModel !== undefined ? cur.defaultModel : defCfg.defaultModel,
          apiKey: cur.apiKey || defCfg.apiKey,
          enabled: cur.enabled !== undefined ? cur.enabled : defCfg.enabled,
          imgParams: cur.imgParams || defCfg.imgParams,
          capabilities: cur.capabilities || defCfg.capabilities,
          provider: cur.provider || defCfg.provider
        }
        if (JSON.stringify(cur) !== JSON.stringify(updated)) {
          merged[key] = updated
          needSave = true
        }
      }
    }

    if (needSave) {
      await this.storage.setItem(this.storageKey, JSON.stringify(merged))
    }
  }

  // === 基本CRUD ===

  async getAllModels(): Promise<Array<ImageModelConfig & { key: string }>> {
    await this.ensureInitialized()
    const raw = await this.storage.getItem(this.storageKey)
    const data: Record<string, ImageModelConfig> = raw ? JSON.parse(raw) : {}
    return Object.entries(data).map(([key, cfg]) => ({ ...cfg, key }))
  }

  async getModel(key: string): Promise<ImageModelConfig | undefined> {
    await this.ensureInitialized()
    const raw = await this.storage.getItem(this.storageKey)
    const data: Record<string, ImageModelConfig> = raw ? JSON.parse(raw) : {}
    return data[key]
  }

  async addModel(key: string, config: ImageModelConfig): Promise<void> {
    await this.ensureInitialized()
    this.validateConfig(config)
    await this.storage.updateData<Record<string, ImageModelConfig>>(
      this.storageKey,
      (current) => {
        const data = current || {}
        if (data[key]) {
          throw new APIError(`Image model ${key} already exists`)
        }
        return { ...data, [key]: { ...config, ...(config.imgParams && { imgParams: { ...config.imgParams } }) } }
      }
    )
  }

  async updateModel(key: string, config: Partial<ImageModelConfig>): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ImageModelConfig>>(
      this.storageKey,
      (current) => {
        const data = current || {}
        if (!data[key]) {
          throw new APIError(`Image model ${key} does not exist`)
        }
        const updated: ImageModelConfig = {
          ...data[key],
          ...config,
          enabled: config.enabled !== undefined ? config.enabled : data[key].enabled,
          ...(config.imgParams && { imgParams: { ...config.imgParams } })
        }
        this.validateConfig(updated)
        return { ...data, [key]: updated }
      }
    )
  }

  async deleteModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ImageModelConfig>>(
      this.storageKey,
      (current) => {
        const data = current || {}
        if (!data[key]) {
          throw new APIError(`Image model ${key} does not exist`)
        }
        const { [key]: removed, ...rest } = data
        return rest
      }
    )
  }

  async enableModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ImageModelConfig>>(
      this.storageKey,
      (current) => {
        const data = current || {}
        if (!data[key]) throw new APIError(`Unknown image model: ${key}`)
        const cfg = { ...data[key], enabled: true }
        this.validateEnableConfig(cfg)
        return { ...data, [key]: cfg }
      }
    )
  }

  async disableModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ImageModelConfig>>(
      this.storageKey,
      (current) => {
        const data = current || {}
        if (!data[key]) throw new APIError(`Unknown image model: ${key}`)
        return { ...data, [key]: { ...data[key], enabled: false } }
      }
    )
  }

  async getEnabledModels(): Promise<Array<ImageModelConfig & { key: string }>> {
    const all = await this.getAllModels()
    return all.filter(m => m.enabled)
  }

  // === 导入导出 ===

  async exportData(): Promise<ImageModelConfig[]> {
    try {
      return await this.getAllModels()
    } catch (error) {
      throw new ImportExportError('Failed to export image model data', await this.getDataType(), error as Error)
    }
  }

  async importData(data: any): Promise<void> {
    if (!Array.isArray(data)) {
      throw new Error('Invalid image model data format: data must be an array')
    }
    const models = data as (ImageModelConfig & { key: string })[]
    const failed: { model: ImageModelConfig & { key: string }, error: Error }[] = []
    for (const m of models) {
      try {
        if (!this.validateSingleModel(m)) {
          failed.push({ model: m, error: new Error('Invalid image model configuration') })
          continue
        }
        const existing = await this.getModel(m.key)
        if (existing) {
          const merged: ImageModelConfig = {
            name: m.name,
            baseURL: m.baseURL ?? existing.baseURL,
            defaultModel: m.defaultModel ?? existing.defaultModel,
            provider: m.provider ?? existing.provider,
            enabled: m.enabled ?? existing.enabled,
            ...(m.apiKey !== undefined && { apiKey: m.apiKey }),
            ...(m.useVercelProxy !== undefined && { useVercelProxy: m.useVercelProxy }),
            ...(m.useDockerProxy !== undefined && { useDockerProxy: m.useDockerProxy }),
            ...(m.imgParams !== undefined && { imgParams: m.imgParams })
          }
          await this.updateModel(m.key, merged)
        } else {
          const newCfg: ImageModelConfig = {
            name: m.name,
            baseURL: m.baseURL,
            defaultModel: m.defaultModel,
            provider: m.provider || 'custom',
            enabled: m.enabled ?? false,
            ...(m.apiKey !== undefined && { apiKey: m.apiKey }),
            ...(m.useVercelProxy !== undefined && { useVercelProxy: m.useVercelProxy }),
            ...(m.useDockerProxy !== undefined && { useDockerProxy: m.useDockerProxy }),
            ...(m.imgParams !== undefined && { imgParams: m.imgParams })
          }
          await this.addModel(m.key, newCfg)
        }
      } catch (e) {
        failed.push({ model: m, error: e as Error })
      }
    }
    if (failed.length > 0) {
      console.warn(`[ImageModelManager] Failed to import ${failed.length} image models`)
    }
  }

  async getDataType(): Promise<string> { return 'image-models' }

  async validateData(data: any): Promise<boolean> {
    return Array.isArray(data) && data.every(item => this.validateSingleModel(item))
  }

  // === 校验 ===

  private validateConfig(cfg: ImageModelConfig): void {
    const errors: string[] = []
    if (!cfg.name) errors.push('Missing model name (name)')
    if (!cfg.defaultModel) errors.push('Missing default model (defaultModel)')
    if (!cfg.provider) errors.push('Missing provider (provider)')
    // imgParams 允许为任意对象
    if (cfg.imgParams !== undefined && (typeof cfg.imgParams !== 'object' || cfg.imgParams === null || Array.isArray(cfg.imgParams))) {
      errors.push('imgParams must be an object')
    }
    if (errors.length) {
      throw new APIError('Invalid image model configuration: ' + errors.join(', '))
    }
  }

  private validateEnableConfig(cfg: ImageModelConfig): void {
    this.validateConfig(cfg)
  }

  private validateSingleModel(item: any): boolean {
    return typeof item === 'object' && item !== null &&
      typeof item.key === 'string' &&
      typeof item.name === 'string' &&
      typeof item.defaultModel === 'string' &&
      typeof item.enabled === 'boolean' &&
      typeof item.provider === 'string'
  }
}

export function createImageModelManager(storageProvider: IStorageProvider): ImageModelManager {
  return new ImageModelManager(storageProvider)
}
