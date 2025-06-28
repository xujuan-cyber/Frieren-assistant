import { ILLMService, Message, StreamHandlers, LLMResponse, ModelOption } from './types';

/**
 * Electron环境下的LLM服务代理
 * 通过IPC调用主进程中的真实LLMService实例
 */
export class ElectronLLMProxy implements ILLMService {
  private electronAPI: NonNullable<Window['electronAPI']>;

  constructor() {
    // 验证Electron环境
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronLLMProxy can only be used in Electron renderer process');
    }
    this.electronAPI = window.electronAPI;
  }

  async testConnection(provider: string): Promise<void> {
    await this.electronAPI.llm.testConnection(provider);
  }

  async sendMessage(messages: Message[], provider: string): Promise<string> {
    return this.electronAPI.llm.sendMessage(messages, provider);
  }

  async sendMessageStructured(messages: Message[], provider: string): Promise<LLMResponse> {
    return this.electronAPI.llm.sendMessageStructured(messages, provider);
  }

  async sendMessageStream(
    messages: Message[],
    provider: string,
    callbacks: StreamHandlers
  ): Promise<void> {
    // 适配回调接口：StreamHandlers 使用 onToken，而 preload 期望的是 onContent
    const adaptedCallbacks = {
      onContent: callbacks.onToken,  // 映射 onToken -> onContent
      onThinking: callbacks.onReasoningToken || (() => {}),  // 映射推理流
      onFinish: () => callbacks.onComplete(),  // 映射完成回调
      onError: callbacks.onError
    };
    
    await this.electronAPI.llm.sendMessageStream(messages, provider, adaptedCallbacks);
  }

  async fetchModelList(
    provider: string,
    customConfig?: Partial<any>
  ): Promise<ModelOption[]> {
    const modelNames = await this.electronAPI.llm.fetchModelList(provider, customConfig);
    // Convert string array to ModelOption array
    return modelNames.map(name => ({ value: name, label: name }));
  }
} 