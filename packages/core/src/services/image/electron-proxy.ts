import type { IImageModelManager, IImageService, ImageRequest, ImageResult, ImageModelConfig } from './types'

export class ElectronImageServiceProxy implements IImageService {
  private electronAPI: any

  constructor() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronImageServiceProxy can only be used in Electron renderer process')
    }
    this.electronAPI = window.electronAPI
  }

  async generate(request: ImageRequest): Promise<ImageResult> {
    const safeReq = JSON.parse(JSON.stringify(request))
    return await (this.electronAPI as any).image.generate(safeReq)
  }

  async validateRequest(request: ImageRequest): Promise<void> {
    const safeReq = JSON.parse(JSON.stringify(request))
    await (this.electronAPI as any).image.validateRequest(safeReq)
  }

  async testConnection(config: ImageModelConfig): Promise<ImageResult> {
    const safeCfg = JSON.parse(JSON.stringify(config))
    return await (this.electronAPI as any).image.testConnection(safeCfg)
  }

  async getDynamicModels(providerId: string, connectionConfig: Record<string, any>) {
    const safeConn = JSON.parse(JSON.stringify(connectionConfig || {}))
    return await (this.electronAPI as any).image.getDynamicModels(providerId, safeConn)
  }

}

export class ElectronImageModelManagerProxy implements IImageModelManager {
  private electronAPI: any

  constructor() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronImageModelManagerProxy can only be used in Electron renderer process')
    }
    this.electronAPI = window.electronAPI
  }

  async ensureInitialized(): Promise<void> {
    await (this.electronAPI as any).imageModel.ensureInitialized()
  }

  async isInitialized(): Promise<boolean> {
    return await (this.electronAPI as any).imageModel.isInitialized()
  }

  // 新的配置 CRUD 操作
  async addConfig(config: ImageModelConfig): Promise<void> {
    const safeCfg = JSON.parse(JSON.stringify(config))
    await (this.electronAPI as any).imageModel.addConfig(safeCfg)
  }

  async updateConfig(id: string, updates: Partial<ImageModelConfig>): Promise<void> {
    const safeUpdates = JSON.parse(JSON.stringify(updates))
    await (this.electronAPI as any).imageModel.updateConfig(id, safeUpdates)
  }

  async deleteConfig(id: string): Promise<void> {
    await (this.electronAPI as any).imageModel.deleteConfig(id)
  }

  async getConfig(id: string): Promise<ImageModelConfig | null> {
    return await (this.electronAPI as any).imageModel.getConfig(id)
  }

  async getAllConfigs(): Promise<ImageModelConfig[]> {
    return await (this.electronAPI as any).imageModel.getAllConfigs()
  }

  async getEnabledConfigs(): Promise<ImageModelConfig[]> {
    return await (this.electronAPI as any).imageModel.getEnabledConfigs()
  }


  // IImportExportable 接口
  async exportData(): Promise<any> {
    return await (this.electronAPI as any).imageModel.exportData()
  }

  async importData(data: any): Promise<void> {
    const safe = JSON.parse(JSON.stringify(data))
    await (this.electronAPI as any).imageModel.importData(safe)
  }

  async getDataType(): Promise<string> {
    return await (this.electronAPI as any).imageModel.getDataType()
  }

  async validateData(data: any): Promise<boolean> {
    const safe = JSON.parse(JSON.stringify(data))
    return await (this.electronAPI as any).imageModel.validateData(safe)
  }
}

