import type { IImageModelManager, ImageRequest, ImageResult } from './types'

export class ElectronImageServiceProxy {
  private electronAPI: any

  constructor() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronImageServiceProxy can only be used in Electron renderer process')
    }
    this.electronAPI = window.electronAPI
  }

  async generate(request: ImageRequest, modelKey: string): Promise<ImageResult> {
    const safeReq = JSON.parse(JSON.stringify(request))
    return await (this.electronAPI as any).image.generate(safeReq, modelKey)
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

  async ensureInitialized(): Promise<void> { await (this.electronAPI as any).imageModel.ensureInitialized() }
  async isInitialized(): Promise<boolean> { return await (this.electronAPI as any).imageModel.isInitialized() }
  async getAllModels(): Promise<any[]> { return await (this.electronAPI as any).imageModel.getAllModels() }
  async getModel(key: string): Promise<any> { return await (this.electronAPI as any).imageModel.getModel(key) }
  async addModel(key: string, config: any): Promise<void> { await (this.electronAPI as any).imageModel.addModel({ key, ...config }) }
  async updateModel(key: string, config: any): Promise<void> { await (this.electronAPI as any).imageModel.updateModel(key, config) }
  async deleteModel(key: string): Promise<void> { await (this.electronAPI as any).imageModel.deleteModel(key) }
  async enableModel(key: string): Promise<void> { await (this.electronAPI as any).imageModel.enableModel(key) }
  async disableModel(key: string): Promise<void> { await (this.electronAPI as any).imageModel.disableModel(key) }
  async getEnabledModels(): Promise<any[]> { return await (this.electronAPI as any).imageModel.getEnabledModels() }
  async exportData(): Promise<any> { return await (this.electronAPI as any).imageModel.exportData() }
  async importData(data: any): Promise<void> { await (this.electronAPI as any).imageModel.importData(data) }
  async getDataType(): Promise<string> { return await (this.electronAPI as any).imageModel.getDataType() }
  async validateData(data: any): Promise<boolean> { return await (this.electronAPI as any).imageModel.validateData(data) }
}

