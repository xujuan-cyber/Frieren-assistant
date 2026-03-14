import { describe, it, expect } from 'vitest'

import { EvaluationService } from '../../../src/services/evaluation/service'
import type {
  CompareEvaluationRequest,
  ResultEvaluationRequest,
} from '../../../src/services/evaluation/types'

import type {
  ILLMService,
  LLMResponse,
  Message,
  ModelOption,
  StreamHandlers,
  ToolDefinition,
} from '../../../src/services/llm/types'
import type { IModelManager, TextModelConfig } from '../../../src/services/model/types'

import { TemplateManager } from '../../../src/services/template/manager'
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider'
import type {
  BuiltinTemplateLanguage,
  ITemplateLanguageService,
} from '../../../src/services/template/languageService'

class StubTemplateLanguageService implements ITemplateLanguageService {
  private lang: BuiltinTemplateLanguage

  constructor(lang: BuiltinTemplateLanguage) {
    this.lang = lang
  }

  async initialize() {}
  async getCurrentLanguage() {
    return this.lang
  }
  async setLanguage(language: BuiltinTemplateLanguage) {
    this.lang = language
  }
  async toggleLanguage() {
    this.lang = this.lang === 'zh-CN' ? 'en-US' : 'zh-CN'
    return this.lang
  }
  async isValidLanguage(language: string) {
    return language === 'zh-CN' || language === 'en-US'
  }
  async getSupportedLanguages() {
    return ['zh-CN', 'en-US'] as BuiltinTemplateLanguage[]
  }
  getLanguageDisplayName(language: BuiltinTemplateLanguage) {
    return language
  }
  isInitialized() {
    return true
  }
}

class StubModelManager implements IModelManager {
  constructor(private models: Record<string, TextModelConfig>) {}

  async ensureInitialized(): Promise<void> {}
  async isInitialized(): Promise<boolean> {
    return true
  }
  async getAllModels(): Promise<TextModelConfig[]> {
    return Object.values(this.models)
  }
  async getModel(key: string): Promise<TextModelConfig | undefined> {
    return this.models[key]
  }
  async addModel(key: string, config: TextModelConfig): Promise<void> {
    this.models[key] = config
  }
  async updateModel(key: string, config: Partial<TextModelConfig>): Promise<void> {
    const current = this.models[key]
    if (!current) return
    this.models[key] = { ...current, ...config }
  }
  async deleteModel(key: string): Promise<void> {
    delete this.models[key]
  }
  async enableModel(key: string): Promise<void> {
    const current = this.models[key]
    if (!current) return
    this.models[key] = { ...current, enabled: true }
  }
  async disableModel(key: string): Promise<void> {
    const current = this.models[key]
    if (!current) return
    this.models[key] = { ...current, enabled: false }
  }
  async getEnabledModels(): Promise<TextModelConfig[]> {
    return Object.values(this.models).filter((m) => m.enabled)
  }
  async exportData(): Promise<any> {
    return []
  }
  async importData(_data: any): Promise<void> {}
  async getDataType(): Promise<string> {
    return 'models'
  }
  async validateData(_data: any): Promise<boolean> {
    return true
  }
}

class CapturingEvaluationLLM implements ILLMService {
  public lastMessages: Message[] = []

  async sendMessage(messages: Message[], _provider: string): Promise<string> {
    this.lastMessages = messages
    return JSON.stringify({
      score: {
        overall: 80,
        dimensions: [
          { key: 'goalAchievement', label: '目标达成度', score: 80 },
          { key: 'outputQuality', label: '输出质量', score: 80 },
          { key: 'constraintCompliance', label: '约束符合度', score: 80 },
          { key: 'promptEffectiveness', label: '提示词引导有效性', score: 80 },
        ],
      },
      improvements: [],
      summary: 'ok',
    })
  }

  async sendMessageStructured(messages: Message[], provider: string): Promise<LLMResponse> {
    return { content: await this.sendMessage(messages, provider) }
  }

  async sendMessageStream(_messages: Message[], _provider: string, callbacks: StreamHandlers): Promise<void> {
    callbacks.onError(new Error('CapturingEvaluationLLM.sendMessageStream is not used in this test'))
  }

  async sendMessageStreamWithTools(
    _messages: Message[],
    _provider: string,
    _tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    callbacks.onError(new Error('CapturingEvaluationLLM.sendMessageStreamWithTools is not used in this test'))
  }

  async testConnection(_provider: string): Promise<void> {
    throw new Error('CapturingEvaluationLLM.testConnection is not used in this test')
  }

  async fetchModelList(_provider: string, _customConfig?: any): Promise<ModelOption[]> {
    return []
  }
}

const createService = () => {
  const modelKey = 'test-model'
  const templateManager = new TemplateManager(
    new MemoryStorageProvider(),
    new StubTemplateLanguageService('zh-CN')
  )
  const modelManager = new StubModelManager({
    [modelKey]: {
      id: modelKey,
      name: 'Test Model',
      enabled: true,
      providerMeta: {
        id: 'test',
        name: 'Test',
        requiresApiKey: false,
        defaultBaseURL: 'https://example.com',
        supportsDynamicModels: false,
      },
      modelMeta: {
        id: modelKey,
        name: 'Test Model',
        providerId: 'test',
        capabilities: { supportsTools: false },
        parameterDefinitions: [],
      },
      connectionConfig: {},
      paramOverrides: {},
    },
  })
  const llm = new CapturingEvaluationLLM()
  return {
    llm,
    modelKey,
    service: new EvaluationService(llm, modelManager, templateManager),
  }
}

describe('Result/compare evaluation evidence behavior', () => {
  it('result evaluation does not inject workspace prompt as separate evidence', async () => {
    const { llm, modelKey, service } = createService()

    const request: ResultEvaluationRequest = {
      type: 'result',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'user' },
      target: {
        workspacePrompt: '请写一首关于秋日思念的七言律诗，要求格律工整、婉约含蓄。',
        referencePrompt: '写一首诗',
      },
      testCase: {
        id: 'tc-1',
        label: '测试内容',
        input: {
          kind: 'text',
          label: '测试内容',
          content: '无额外测试输入，输出直接基于当前提示词生成。',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-1',
        promptRef: { kind: 'original', label: '原始' },
        promptText: '写一首诗',
        output: '《秋思》……',
        modelKey: 'siliconflow',
        versionLabel: '原始',
      },
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).not.toContain('## 当前工作区用户提示词')
    expect(promptText).not.toContain('## 参考提示词')
    expect(promptText).toContain('评估执行快照中该执行提示词本身的表现')
    expect(promptText).toContain('## 执行快照 A')
    expect(promptText).toContain('### 执行提示词')
    expect(promptText).toContain('写一首诗')
    expect(promptText).not.toContain('patchPlan')
  })

  it('result prompt explicitly prioritizes violated instructions and output-boundary slips', async () => {
    const { llm, modelKey, service } = createService()

    const request: ResultEvaluationRequest = {
      type: 'result',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'user' },
      target: {
        workspacePrompt: '请写一首关于秋日思念的七言律诗。3. 不要解释。',
      },
      testCase: {
        id: 'tc-result-priority-1',
        label: '测试内容',
        input: {
          kind: 'text',
          label: '测试内容',
          content: '无额外测试输入，输出直接基于当前提示词生成。',
        },
      },
      snapshot: {
        id: 'snap-result-priority-a',
        label: 'A',
        testCaseId: 'tc-result-priority-1',
        promptRef: { kind: 'workspace', label: '工作区' },
        promptText: '请写一首关于秋日思念的七言律诗，不要解释。',
        output: '《秋思》\n\n霜叶摇灯夜色长。\n\n说明：这首诗表达了思念。',
        modelKey: 'dashscope',
        versionLabel: '工作区',
      },
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('如果快照里已经出现某条明确指令被违反')
    expect(promptText).toContain('输出边界滑移')
    expect(promptText).toContain('追加了解释、尾注、说明或元评论')
    expect(promptText).toContain('不要让内容质量掩盖明显的执行滑移')
    expect(promptText).toContain('constraintCompliance 必须被实质拉低')
    expect(promptText).toContain('先识别当前最高优先级的“被违反指令”或“输出边界滑移”')
    expect(promptText).toContain('第一条 improvement 必须先处理它')
  })

  it('compare evaluation only uses shared inputs and snapshots as evidence', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'user' },
      target: {
        workspacePrompt: '请写一首关于秋日思念的七言律诗，要求格律工整、婉约含蓄。',
        referencePrompt: '写一首诗',
      },
      testCases: [
        {
          id: 'tc-1',
          label: '测试内容',
          input: {
            kind: 'text',
            label: '测试内容',
            content: '无额外测试输入，输出直接基于当前提示词生成。',
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '写一首诗',
          output: '输出 A',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 2, label: 'v2' },
          promptText: '写一首秋思诗，注意格律。',
          output: '输出 B',
          modelKey: 'deepseek',
          versionLabel: 'v2',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).not.toContain('## 当前工作区用户提示词')
    expect(promptText).not.toContain('## 参考提示词')
    expect(promptText).toContain('## 公共测试用例（1）')
    expect(promptText).toContain('## 执行快照（2）')
    expect(promptText).toContain('### 快照 A')
    expect(promptText).toContain('### 快照 B')
    expect(promptText).toContain('写一首诗')
    expect(promptText).toContain('写一首秋思诗，注意格律。')
    expect(promptText).not.toContain('patchPlan')
  })

  it('variable result evaluation keeps variables in test input and avoids rendered prompt duplication', async () => {
    const { llm, modelKey, service } = createService()

    const request: ResultEvaluationRequest = {
      type: 'result',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'pro', subMode: 'variable' },
      target: {
        workspacePrompt: '你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。',
      },
      testCase: {
        id: 'tc-var-1',
        label: '变量输入',
        input: {
          kind: 'variables',
          label: '变量输入',
          content: '风格=中文古典\n主题=程序员加班',
        },
      },
      snapshot: {
        id: 'snap-var-a',
        label: 'A',
        testCaseId: 'tc-var-1',
        promptRef: { kind: 'workspace', label: '工作区' },
        promptText: '你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。',
        output: '《夜半敲键》……',
        modelKey: 'dashscope',
        versionLabel: '工作区',
      },
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('## 测试用例输入（变量输入')
    expect(promptText).toContain('风格&#x3D;中文古典')
    expect(promptText).toContain('主题&#x3D;程序员加班')
    expect(promptText).toContain('### 执行提示词')
    expect(promptText).toContain('你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。')
    expect(promptText).not.toContain('### 额外执行输入')
    expect(promptText).not.toContain('中文古典的诗人')
  })

  it('conversation compare evaluation keeps shared context once and uses a marker for the selected message', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'pro', subMode: 'multi' },
      target: {
        workspacePrompt: '作为 system 消息，要求 assistant 先澄清用户目标，再给出建议，且不要抢答。',
      },
      testCases: [
        {
          id: 'tc-conv-1',
          label: 'Conversation Snapshot',
          input: {
            kind: 'conversation',
            label: 'Conversation Snapshot',
            summary: '目标消息已用“【当前执行提示词见下方快照】”标记，实际内容见下方执行提示词。',
            content: [
              'system: 【当前执行提示词见下方快照】',
              'user: 我想做一个给团队用的笔记系统。',
            ].join('\n'),
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-conv-a',
          label: 'A',
          testCaseId: 'tc-conv-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '作为 system 消息，给出建议',
          output: '建议你直接选 Notion。',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-conv-b',
          label: 'B',
          testCaseId: 'tc-conv-1',
          promptRef: { kind: 'workspace', label: '工作区' },
          promptText: '作为 system 消息，要求 assistant 先澄清用户目标，再给出建议，且不要抢答。',
          output: '你更关注多人实时协作、权限控制，还是知识沉淀与搜索？',
          modelKey: 'dashscope',
          versionLabel: '工作区',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('## 公共测试用例（1）')
    expect(promptText).toContain('system: 【当前执行提示词见下方快照】')
    expect(promptText).toContain('user: 我想做一个给团队用的笔记系统。')
    expect(promptText).toContain('#### 执行提示词')
    expect(promptText).toContain('作为 system 消息，给出建议')
    expect(promptText).toContain('作为 system 消息，要求 assistant 先澄清用户目标，再给出建议，且不要抢答。')
    expect(promptText).not.toContain('#### 额外执行输入')
  })

  it('basic-system result evaluation keeps user test input separate from executed system prompt', async () => {
    const { llm, modelKey, service } = createService()

    const request: ResultEvaluationRequest = {
      type: 'result',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'system' },
      target: {
        workspacePrompt: '你是一个客服助手。请先判断问题类型，再给出建议回复。',
        referencePrompt: '你是一个助手。',
      },
      testCase: {
        id: 'tc-sys-1',
        label: '测试内容',
        input: {
          kind: 'text',
          label: '测试内容',
          content: '用户说：订单超过一周还没发货，我很着急。',
        },
      },
      snapshot: {
        id: 'snap-sys-a',
        label: 'A',
        testCaseId: 'tc-sys-1',
        promptRef: { kind: 'workspace', label: '工作区' },
        promptText: '你是一个客服助手。请先判断问题类型，再给出建议回复。',
        output: '问题类型：物流延迟。建议回复：非常抱歉让您久等，我们会立即帮您核查。',
        modelKey: 'dashscope',
        versionLabel: '工作区',
      },
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).not.toContain('## 当前工作区系统提示词')
    expect(promptText).not.toContain('## 参考提示词')
    expect(promptText).toContain('## 测试用例输入（测试内容')
    expect(promptText).toContain('用户说：订单超过一周还没发货，我很着急。')
    expect(promptText).toContain('### 执行提示词')
    expect(promptText).toContain('你是一个客服助手。请先判断问题类型，再给出建议回复。')
    expect(promptText).not.toContain('### 额外执行输入')
  })

  it('basic-system compare evaluation uses shared test content once without re-injecting workspace prompt', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'system' },
      target: {
        workspacePrompt: '你是一个客服助手。请先判断问题类型，再给出建议回复。',
      },
      testCases: [
        {
          id: 'tc-sys-compare-1',
          label: '测试内容',
          input: {
            kind: 'text',
            label: '测试内容',
            content: '用户说：订单超过一周还没发货，我很着急。',
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-sys-compare-a',
          label: 'A',
          testCaseId: 'tc-sys-compare-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '你是一个助手。',
          output: '很抱歉。',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-sys-compare-b',
          label: 'B',
          testCaseId: 'tc-sys-compare-1',
          promptRef: { kind: 'workspace', label: '工作区' },
          promptText: '你是一个客服助手。请先判断问题类型，再给出建议回复。',
          output: '问题类型：物流延迟。建议回复：非常抱歉让您久等，我们会立即帮您核查。',
          modelKey: 'dashscope',
          versionLabel: '工作区',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).not.toContain('## 当前工作区系统提示词')
    expect(promptText).not.toContain('## 参考提示词')
    expect(promptText).toContain('## 公共测试用例（1）')
    expect(promptText).toContain('用户说：订单超过一周还没发货，我很着急。')
    expect(promptText).toContain('### 快照 A')
    expect(promptText).toContain('### 快照 B')
    expect(promptText).toContain('你是一个助手。')
    expect(promptText).toContain('你是一个客服助手。请先判断问题类型，再给出建议回复。')
    expect(promptText).not.toContain('#### 额外执行输入')
  })

  it('compare evaluation renders generic test cases title when snapshots use different inputs', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'user' },
      target: {
        workspacePrompt: '请写一首关于秋日思念的七言律诗，要求格律工整、婉约含蓄。',
      },
      testCases: [
        {
          id: 'tc-compare-multi-1',
          label: '测试内容-默认',
          input: {
            kind: 'text',
            label: '测试内容',
            content: '无额外测试输入，输出直接基于当前提示词生成。',
          },
        },
        {
          id: 'tc-compare-multi-2',
          label: '测试内容-意象约束',
          input: {
            kind: 'text',
            label: '测试内容',
            summary: '额外限制了意象范围',
            content: '请尽量使用霜叶、孤灯、归雁三个意象。',
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-compare-multi-a',
          label: 'A',
          testCaseId: 'tc-compare-multi-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '写一首诗',
          output: '输出 A',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-compare-multi-b',
          label: 'B',
          testCaseId: 'tc-compare-multi-2',
          promptRef: { kind: 'workspace', label: '工作区' },
          promptText: '请写一首关于秋日思念的七言律诗，要求格律工整、婉约含蓄。',
          output: '输出 B',
          modelKey: 'dashscope',
          versionLabel: '工作区',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('## 测试用例（2）')
    expect(promptText).not.toContain('## 公共测试用例（2）')
    expect(promptText).toContain('### 测试用例 测试内容-默认')
    expect(promptText).toContain('### 测试用例 测试内容-意象约束')
    expect(promptText).toContain('无额外测试输入，输出直接基于当前提示词生成。')
    expect(promptText).toContain('请尽量使用霜叶、孤灯、归雁三个意象。')
  })

  it('compare evaluation dedupes identical test-case evidence even when test case ids differ', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'pro', subMode: 'multi' },
      target: {
        workspacePrompt: '作为 system 消息，要求 assistant 先澄清用户目标，再给出建议，且不要抢答。',
      },
      testCases: [
        {
          id: 'tc-conv-dup-1',
          label: 'Conversation Snapshot A',
          input: {
            kind: 'conversation',
            label: 'Conversation Snapshot',
            summary: '目标消息已用“【当前执行提示词见下方快照】”标记，实际内容见下方执行提示词。',
            content: [
              'system: 【当前执行提示词见下方快照】',
              'user: 我想做一个给团队用的笔记系统。',
            ].join('\n'),
          },
        },
        {
          id: 'tc-conv-dup-2',
          label: 'Conversation Snapshot B',
          input: {
            kind: 'conversation',
            label: 'Conversation Snapshot',
            summary: '目标消息已用“【当前执行提示词见下方快照】”标记，实际内容见下方执行提示词。',
            content: [
              'system: 【当前执行提示词见下方快照】',
              'user: 我想做一个给团队用的笔记系统。',
            ].join('\n'),
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-conv-dup-a',
          label: 'A',
          testCaseId: 'tc-conv-dup-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '作为 system 消息，给出建议',
          output: '建议你直接选 Notion。',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-conv-dup-b',
          label: 'B',
          testCaseId: 'tc-conv-dup-2',
          promptRef: { kind: 'workspace', label: '工作区' },
          promptText: '作为 system 消息，要求 assistant 先澄清用户目标，再给出建议，且不要抢答。',
          output: '你更关注多人实时协作、权限控制，还是知识沉淀与搜索？',
          modelKey: 'dashscope',
          versionLabel: '工作区',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('## 公共测试用例（1）')
    expect(promptText.match(/### 测试用例 /g)?.length ?? 0).toBe(1)
    expect(promptText.match(/system: 【当前执行提示词见下方快照】/g)?.length ?? 0).toBe(1)
    expect(promptText.match(/user: 我想做一个给团队用的笔记系统。/g)?.length ?? 0).toBe(1)
  })

  it('non-cross-model compare prompt requires improvements to stay anchored to observed snapshot differences', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'basic', subMode: 'system' },
      target: {
        workspacePrompt:
          '你是一个客服助手。请先判断问题类型，再评估风险等级，并用安抚性的语气给出建议回复。输出格式固定为：问题类型、风险等级、建议回复。',
      },
      testCases: [
        {
          id: 'tc-sys-compare-anchor-1',
          label: '测试内容',
          input: {
            kind: 'text',
            label: '测试内容',
            content: '用户说：订单超过一周还没发货，我很着急。',
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-sys-compare-anchor-a',
          label: 'A',
          testCaseId: 'tc-sys-compare-anchor-1',
          promptRef: { kind: 'original', label: '原始' },
          promptText: '你是一个助手。',
          output: '请耐心等待。',
          modelKey: 'siliconflow',
          versionLabel: '原始',
        },
        {
          id: 'snap-sys-compare-anchor-b',
          label: 'B',
          testCaseId: 'tc-sys-compare-anchor-1',
          promptRef: { kind: 'workspace', label: '工作区' },
          promptText:
            '你是一个客服助手。请先判断问题类型，再评估风险等级，并用安抚性的语气给出建议回复。输出格式固定为：问题类型、风险等级、建议回复。',
          output:
            '问题类型：物流延迟\n风险等级：中\n建议回复：非常抱歉让您久等了，我们理解您现在很着急，会立刻帮您核查物流进度并优先跟进。',
          modelKey: 'dashscope',
          versionLabel: '工作区',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('先解释哪些已观察到的提示词或输出差异真正造成了快照差距')
    expect(promptText).toContain('improvements 必须从快照之间已观察到的差异中提炼')
    expect(promptText).toContain('summary 必须直接点名这类已观察到的差异')
    expect(promptText).toContain('第一条 improvement 必须优先补它')
    expect(promptText).toContain('先识别最能解释快照差距的那条“已观察到的提示词差异”')
    expect(promptText).toContain('summary 不能只说哪一列更好')
  })

  it('cross-model compare prompt explicitly requires mapping improvements to the observed misunderstanding', async () => {
    const { llm, modelKey, service } = createService()

    const request: CompareEvaluationRequest = {
      type: 'compare',
      evaluationModelKey: modelKey,
      mode: { functionMode: 'pro', subMode: 'variable' },
      target: {
        workspacePrompt: '你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。',
      },
      testCases: [
        {
          id: 'tc-cross-model-1',
          label: '变量输入',
          input: {
            kind: 'variables',
            label: '变量输入',
            content: '风格=中文古典\n主题=程序员加班',
          },
        },
      ],
      snapshots: [
        {
          id: 'snap-cross-model-a',
          label: 'A',
          testCaseId: 'tc-cross-model-1',
          promptRef: { kind: 'version', version: 1, label: 'v1' },
          promptText: '你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。',
          output: '《夜半敲键歌》\n\n残灯照案五更寒。',
          modelKey: 'dashscope',
          versionLabel: 'v1',
        },
        {
          id: 'snap-cross-model-b',
          label: 'B',
          testCaseId: 'tc-cross-model-1',
          promptRef: { kind: 'version', version: 1, label: 'v1' },
          promptText: '你是一位{{风格}}的诗人。请写一首关于“{{主题}}”的诗，不要解释。',
          output: '《夜半敲键歌》\n\n夜深人静写代码。\n\n说明：表达了加班。',
          modelKey: 'siliconflow',
          versionLabel: 'v1',
        },
      ],
    }

    await service.evaluate(request)

    const promptText = llm.lastMessages.map((message) => message.content).join('\n\n')
    expect(promptText).toContain('优先解释“同提示词跨模型差异”暴露了该提示词本身的什么问题')
    expect(promptText).toContain('不要回退成与当前差异无关的泛化写作增强建议')
    expect(promptText).toContain('improvements 必须先针对该误解点')
    expect(promptText).toContain('再把每条改进建议映射到该误解点')
    expect(promptText).toContain('如果快照里已经出现某条明确指令或边界被违反')
    expect(promptText).toContain('先识别快照里最高优先级的“被违反指令”或“被误解边界”')
    expect(promptText).toContain('summary 必须直接点名它')
    expect(promptText).toContain('第一条 improvement 必须先处理它')
  })
})
