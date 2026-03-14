/**
 * 评估服务实现
 *
 * 使用 LLM 对测试结果进行智能评估和打分
 */

import type { ILLMService, StreamHandlers } from '../llm/types';
import type { IModelManager } from '../model/types';
import type { ITemplateManager, Template } from '../template/types';
import { TemplateProcessor, type TemplateContext } from '../template/processor';
import {
  type IEvaluationService,
  type EvaluationRequest,
  type EvaluationResponse,
  type EvaluationStreamHandlers,
  type EvaluationScore,
  type EvaluationType,
  type EvaluationDimension,
  type EvaluationModeConfig,
  type PatchOperation,
  type PatchOperationType,
  type EvaluationContentBlock,
  type EvaluationSnapshot,
  type EvaluationTestCase,
} from './types';
import {
  EvaluationValidationError,
  EvaluationModelError,
  EvaluationTemplateError,
  EvaluationExecutionError,
  EvaluationParseError,
} from './errors';
import { jsonrepair } from 'jsonrepair';

/**
 * 评估服务实现类
 */
export class EvaluationService implements IEvaluationService {
  constructor(
    private llmService: ILLMService,
    private modelManager: IModelManager,
    private templateManager: ITemplateManager
  ) {}

  /**
   * 执行评估（非流式）
   */
  async evaluate(request: EvaluationRequest): Promise<EvaluationResponse> {
    this.validateRequest(request);
    await this.validateModel(request.evaluationModelKey);

    const template = await this.getEvaluationTemplate(request.type, request.mode);
    const context = this.buildTemplateContext(request);
    const messages = TemplateProcessor.processTemplate(template, context);

    const startTime = Date.now();
    try {
      const result = await this.llmService.sendMessage(messages, request.evaluationModelKey);
      const duration = Date.now() - startTime;

      return this.parseEvaluationResult(result, request.type, {
        model: request.evaluationModelKey,
        timestamp: Date.now(),
        duration,
      });
    } catch (error) {
      throw new EvaluationExecutionError(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 流式评估
   */
  async evaluateStream(
    request: EvaluationRequest,
    callbacks: EvaluationStreamHandlers
  ): Promise<void> {
    try {
      this.validateRequest(request);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    try {
      await this.validateModel(request.evaluationModelKey);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    let template: Template;
    try {
      template = await this.getEvaluationTemplate(request.type, request.mode);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    const context = this.buildTemplateContext(request);
    const messages = TemplateProcessor.processTemplate(template, context);

    let fullContent = '';
    const startTime = Date.now();

    const streamHandlers: StreamHandlers = {
      onToken: (token) => {
        fullContent += token;
        callbacks.onToken(token);
      },
      onComplete: () => {
        const duration = Date.now() - startTime;
        try {
          const response = this.parseEvaluationResult(fullContent, request.type, {
            model: request.evaluationModelKey,
            timestamp: Date.now(),
            duration,
          });
          callbacks.onComplete(response);
        } catch (error) {
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }
      },
      onError: (error) => {
        callbacks.onError(new EvaluationExecutionError(error.message, error));
      },
    };

    try {
      await this.llmService.sendMessageStream(messages, request.evaluationModelKey, streamHandlers);
    } catch (error) {
      callbacks.onError(
        new EvaluationExecutionError(
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * 验证评估请求
   */
  private validateRequest(request: EvaluationRequest): void {
    if (!request.evaluationModelKey?.trim()) {
      throw new EvaluationValidationError('Evaluation model key must not be empty.');
    }

    if (!request.mode) {
      throw new EvaluationValidationError('Evaluation mode configuration must not be empty.');
    }
    if (!request.mode.functionMode) {
      throw new EvaluationValidationError('Function mode must not be empty.');
    }
    if (!request.mode.subMode) {
      throw new EvaluationValidationError('Sub mode must not be empty.');
    }

    switch (request.type) {
      case 'result':
        if (!request.target?.workspacePrompt?.trim()) {
          throw new EvaluationValidationError('Workspace prompt must not be empty.');
        }
        this.validateTestCase(request.testCase, 'Result evaluation test case');
        this.validateSnapshot(request.snapshot, 'Result evaluation snapshot');
        if (request.snapshot.testCaseId !== request.testCase.id) {
          throw new EvaluationValidationError(
            'Result evaluation snapshot testCaseId must match testCase.id.'
          );
        }
        break;

      case 'compare':
        if (!request.target?.workspacePrompt?.trim()) {
          throw new EvaluationValidationError('Workspace prompt must not be empty.');
        }
        if (!Array.isArray(request.testCases) || request.testCases.length < 1) {
          throw new EvaluationValidationError('Compare evaluation requires at least one test case.');
        }
        if (!Array.isArray(request.snapshots) || request.snapshots.length < 2) {
          throw new EvaluationValidationError('Compare evaluation requires at least two snapshots.');
        }

        const testCaseIds = new Set<string>();
        request.testCases.forEach((testCase, index) => {
          this.validateTestCase(testCase, `Compare test case #${index + 1}`);
          if (testCaseIds.has(testCase.id)) {
            throw new EvaluationValidationError(
              `Compare test case #${index + 1} id must be unique.`
            );
          }
          testCaseIds.add(testCase.id);
        });

        request.snapshots.forEach((snapshot, index) => {
          this.validateSnapshot(snapshot, `Compare snapshot #${index + 1}`);
          if (!testCaseIds.has(snapshot.testCaseId)) {
            throw new EvaluationValidationError(
              `Compare snapshot #${index + 1} references unknown testCaseId "${snapshot.testCaseId}".`
            );
          }
        });
        break;

      case 'prompt-only':
        if (!request.target?.workspacePrompt?.trim()) {
          throw new EvaluationValidationError('Workspace prompt must not be empty.');
        }
        break;

      case 'prompt-iterate':
        if (!request.target?.workspacePrompt?.trim()) {
          throw new EvaluationValidationError('Workspace prompt must not be empty.');
        }
        if (!request.iterateRequirement?.trim()) {
          throw new EvaluationValidationError('Iteration requirement must not be empty.');
        }
        break;

      default:
        throw new EvaluationValidationError(`Unknown evaluation type: ${(request as any).type}`);
    }
  }

  /**
   * 验证评估模型
   */
  private async validateModel(modelKey: string): Promise<void> {
    const model = await this.modelManager.getModel(modelKey);
    if (!model) {
      throw new EvaluationModelError(modelKey);
    }
  }

  /**
   * 获取评估模板
   */
  private async getEvaluationTemplate(type: EvaluationType, mode: EvaluationModeConfig): Promise<Template> {
    const templateId = this.getTemplateId(type, mode);

    try {
      const template = await this.templateManager.getTemplate(templateId);
      if (!template?.content) {
        throw new EvaluationTemplateError(templateId);
      }
      return template;
    } catch (error) {
      if (error instanceof EvaluationTemplateError) {
        throw error;
      }
      throw new EvaluationTemplateError(templateId);
    }
  }

  /**
   * 根据评估类型和模式获取模板ID
   */
  private getTemplateId(type: EvaluationType, mode: EvaluationModeConfig): string {
    return `evaluation-${mode.functionMode}-${mode.subMode}-${type}`;
  }

  /**
   * 构建模板上下文
   */
  private buildTemplateContext(request: EvaluationRequest): TemplateContext {
    const baseContext: TemplateContext = {
      ...(request.variables || {}),
    };

    const focus = request.focus?.content?.trim() || '';
    baseContext.hasFocus = !!focus;
    baseContext.focusBrief = focus;
    // 兼容仍使用旧字段命名的模板
    baseContext.hasUserFeedback = !!focus;
    if (focus) {
      baseContext.userFeedback = focus;
    }

    switch (request.type) {
      case 'result':
        return this.buildResultTemplateContext(baseContext, request);

      case 'compare':
        return this.buildCompareTemplateContext(baseContext, request);

      case 'prompt-only':
        return {
          ...baseContext,
          ...this.buildTargetContext(request.target),
          optimizedPrompt: request.target.workspacePrompt,
        };

      case 'prompt-iterate':
        return {
          ...baseContext,
          ...this.buildTargetContext(request.target),
          optimizedPrompt: request.target.workspacePrompt,
          iterateRequirement: request.iterateRequirement,
        };

      default:
        return baseContext;
    }
  }

  private validateContentBlock(
    block: EvaluationContentBlock | undefined,
    label: string
  ): void {
    if (!block) {
      throw new EvaluationValidationError(`${label} must not be empty.`);
    }
    if (!block.label?.trim()) {
      throw new EvaluationValidationError(`${label} label must not be empty.`);
    }
    if (!block.content?.trim()) {
      throw new EvaluationValidationError(`${label} content must not be empty.`);
    }
  }

  private validateTestCase(testCase: EvaluationTestCase | undefined, label: string): void {
    if (!testCase?.id?.trim()) {
      throw new EvaluationValidationError(`${label} id must not be empty.`);
    }
    this.validateContentBlock(testCase.input, `${label} input`);
  }

  private validateSnapshot(snapshot: EvaluationSnapshot | undefined, label: string): void {
    if (!snapshot?.id?.trim()) {
      throw new EvaluationValidationError(`${label} id must not be empty.`);
    }
    if (!snapshot?.label?.trim()) {
      throw new EvaluationValidationError(`${label} label must not be empty.`);
    }
    if (!snapshot?.testCaseId?.trim()) {
      throw new EvaluationValidationError(`${label} testCaseId must not be empty.`);
    }
    if (!snapshot?.promptText?.trim()) {
      throw new EvaluationValidationError(`${label} promptText must not be empty.`);
    }
    if (!snapshot?.output?.trim()) {
      throw new EvaluationValidationError(`${label} output must not be empty.`);
    }
    if (!snapshot?.promptRef?.kind) {
      throw new EvaluationValidationError(`${label} promptRef.kind must not be empty.`);
    }
    if (snapshot.executionInput) {
      this.validateContentBlock(snapshot.executionInput, `${label} executionInput`);
    }
  }

  private normalizeContentBlock(block?: EvaluationContentBlock): Record<string, unknown> | undefined {
    const label = block?.label?.trim() || '';
    const content = block?.content?.trim() || '';
    if (!label || !content) {
      return undefined;
    }

    const summary = block?.summary?.trim() || '';
    return {
      kind: block?.kind || 'custom',
      label,
      content,
      summary,
      hasSummary: !!summary,
    };
  }

  private buildTargetContext(target: {
    workspacePrompt: string;
    referencePrompt?: string;
    designContext?: EvaluationContentBlock;
  }): TemplateContext {
    const workspacePrompt = target?.workspacePrompt?.trim() || '';
    const referencePrompt = target?.referencePrompt?.trim() || '';
    const designContext = this.normalizeContentBlock(target?.designContext);

    return {
      workspacePrompt,
      hasWorkspacePrompt: !!workspacePrompt,
      currentWorkspacePrompt: workspacePrompt,
      referencePrompt,
      hasReferencePrompt: !!referencePrompt,
      originalPrompt: referencePrompt,
      hasOriginalPrompt: !!referencePrompt,
      hasDesignContext: !!designContext,
      designContextKind: (designContext?.kind as string) || '',
      designContextLabel: (designContext?.label as string) || '',
      designContextContent: (designContext?.content as string) || '',
      designContextSummary: (designContext?.summary as string) || '',
      designContextJson: (designContext?.content as string) || '',
      // 兼容旧模板中的 proContext 占位
      proContext: (designContext?.content as string) || '',
    };
  }

  private normalizeTestCase(testCase: EvaluationTestCase): Record<string, unknown> {
    const input = this.normalizeContentBlock(testCase.input)!;
    const label = testCase.label?.trim() || '';
    const settingsSummary = testCase.settingsSummary?.trim() || '';

    return {
      id: testCase.id.trim(),
      label,
      hasLabel: !!label,
      inputKind: input.kind,
      inputLabel: input.label,
      inputContent: input.content,
      inputSummary: input.summary || '',
      hasInputSummary: !!input.hasSummary,
      settingsSummary,
      hasSettingsSummary: !!settingsSummary,
    };
  }

  private normalizeSnapshot(
    snapshot: EvaluationSnapshot,
    testCase: Record<string, unknown> | undefined,
    workspacePrompt: string
  ): Record<string, unknown> {
    const executionInput = this.normalizeContentBlock(snapshot.executionInput);
    const executionInputLabel = (executionInput?.label || '') as string;
    const executionInputContent = (executionInput?.content || '') as string;
    const executionInputSummary = (executionInput?.summary || '') as string;
    const modelKey = snapshot.modelKey?.trim() || '';
    const versionLabel = snapshot.versionLabel?.trim() || '';
    const reasoning = snapshot.reasoning?.trim() || '';
    const promptText = snapshot.promptText.trim();
    const workspacePromptTrimmed = workspacePrompt.trim();
    const promptMatchesWorkspace = !!workspacePromptTrimmed && promptText === workspacePromptTrimmed;
    const promptRefLabel =
      snapshot.promptRef.label?.trim() ||
      (
        snapshot.promptRef.kind === 'version' && typeof snapshot.promptRef.version === 'number'
          ? `v${snapshot.promptRef.version}`
          : snapshot.promptRef.kind
      );

    return {
      id: snapshot.id.trim(),
      label: snapshot.label.trim(),
      testCaseId: snapshot.testCaseId.trim(),
      testCaseLabel: (testCase?.['label'] || '') as string,
      promptText,
      promptMatchesWorkspace,
      hasDistinctPromptText: !promptMatchesWorkspace,
      promptRefKind: snapshot.promptRef.kind,
      promptRefLabel,
      modelKey,
      hasModelKey: !!modelKey,
      versionLabel,
      hasVersionLabel: !!versionLabel,
      reasoning,
      hasReasoning: !!reasoning,
      output: snapshot.output.trim(),
      executionInputLabel,
      executionInputContent,
      executionInputSummary,
      hasExecutionInputSummary: !!executionInputSummary,
      hasExecutionInput: !!executionInputContent,
      // 兼容旧模板字段，但不再回填公共测试输入，避免重复证据
      inputLabel: executionInputLabel,
      inputContent: executionInputContent,
      inputSummary: executionInputSummary,
      hasInputSummary: !!executionInputSummary,
      hasInput: !!executionInputContent,
    };
  }

  private buildResultTemplateContext(
    baseContext: TemplateContext,
    request: Extract<EvaluationRequest, { type: 'result' }>
  ): TemplateContext {
    const targetContext = this.buildTargetContext(request.target);
    const testCase = this.normalizeTestCase(request.testCase);
    const snapshot = this.normalizeSnapshot(
      request.snapshot,
      testCase,
      request.target.workspacePrompt
    );

    return {
      ...baseContext,
      ...targetContext,
      evaluationTestCase: testCase,
      testCaseLabel: testCase.label,
      hasTestCaseLabel: testCase.hasLabel,
      testCaseInputLabel: testCase.inputLabel,
      testCaseInputContent: testCase.inputContent,
      testCaseInputSummary: testCase.inputSummary,
      hasTestCaseInputSummary: testCase.hasInputSummary,
      evaluationSnapshot: snapshot,
      hasEditableWorkspaceTarget:
        snapshot.promptRefKind === 'workspace' && snapshot.promptMatchesWorkspace,
      prompt: snapshot.promptText,
      testContent: testCase.inputContent,
      testResult: snapshot.output,
      resultLabel: snapshot.label,
      hasResultLabel: !!snapshot.label,
    };
  }

  private buildCompareTemplateContext(
    baseContext: TemplateContext,
    request: Extract<EvaluationRequest, { type: 'compare' }>
  ): TemplateContext {
    const targetContext = this.buildTargetContext(request.target);
    const normalizedTestCases = request.testCases.map((testCase) => this.normalizeTestCase(testCase));
    const normalizeTestCaseEvidenceKey = (testCase: Record<string, unknown>): string =>
      JSON.stringify({
        inputKind: (testCase['inputKind'] || '') as string,
        inputLabel: (testCase['inputLabel'] || '') as string,
        inputSummary: (testCase['inputSummary'] || '') as string,
        inputContent: (testCase['inputContent'] || '') as string,
        settingsSummary: (testCase['settingsSummary'] || '') as string,
      });
    const dedupedRenderedTestCases = Array.from(
      normalizedTestCases.reduce((map, testCase) => {
        const evidenceKey = normalizeTestCaseEvidenceKey(testCase);
        if (!map.has(evidenceKey)) {
          map.set(evidenceKey, testCase);
        }
        return map;
      }, new Map<string, Record<string, unknown>>()).values()
    );
    const testCaseMap = new Map(normalizedTestCases.map((testCase) => [testCase.id as string, testCase]));
    const normalizedSnapshots = request.snapshots.map((snapshot) =>
      this.normalizeSnapshot(snapshot, testCaseMap.get(snapshot.testCaseId), request.target.workspacePrompt)
    );
    const samePromptAcrossSnapshots =
      request.compareHints?.hasSamePromptSnapshots ??
      (new Set(request.snapshots.map((snapshot) => snapshot.promptText.trim())).size === 1);
    const sameTestCaseAcrossSnapshots =
      request.compareHints?.hasSharedTestCases ??
      (new Set(request.snapshots.map((snapshot) => snapshot.testCaseId.trim())).size === 1);
    const sharedCompareInputs = sameTestCaseAcrossSnapshots || dedupedRenderedTestCases.length === 1;
    const crossModelComparison =
      request.compareHints?.hasCrossModelComparison ??
      (
        samePromptAcrossSnapshots &&
        sharedCompareInputs &&
        new Set(request.snapshots.map((snapshot) => (snapshot.modelKey || '').trim()).filter(Boolean)).size > 1
      );
    const hasEditableWorkspaceTarget = normalizedSnapshots.some(
      (snapshot) => snapshot.promptRefKind === 'workspace' && snapshot.promptMatchesWorkspace
    );

    return {
      ...baseContext,
      ...targetContext,
      compareTestCaseCount: dedupedRenderedTestCases.length,
      hasCompareTestCases: dedupedRenderedTestCases.length > 0,
      compareTestCases: dedupedRenderedTestCases,
      hasSharedCompareInputs: sharedCompareInputs,
      sharedTestCaseCount: dedupedRenderedTestCases.length,
      hasSharedTestCases: sharedCompareInputs && dedupedRenderedTestCases.length > 0,
      sharedTestCases: dedupedRenderedTestCases,
      compareSnapshotCount: normalizedSnapshots.length,
      compareSnapshots: normalizedSnapshots,
      hasCrossModelComparison: crossModelComparison,
      hasEditableWorkspaceTarget,
      compareHints: {
        hasSharedTestCases: sharedCompareInputs,
        hasSamePromptSnapshots: samePromptAcrossSnapshots,
        hasCrossModelComparison: crossModelComparison,
      },
      // 兼容旧 compare 模板字段
      compareVariantCount: normalizedSnapshots.length,
      compareVariants: normalizedSnapshots.map((snapshot) => ({
        id: snapshot.id,
        label: snapshot.label,
        prompt: snapshot.promptText,
        output: snapshot.output,
        reasoning: snapshot.reasoning,
        hasReasoning: snapshot.hasReasoning,
        modelKey: snapshot.modelKey,
        hasModelKey: snapshot.hasModelKey,
        versionLabel: snapshot.versionLabel,
        hasVersionLabel: snapshot.hasVersionLabel,
        promptMatchesWorkspace: snapshot.promptMatchesWorkspace,
        hasDistinctPromptText: snapshot.hasDistinctPromptText,
        hasInput: !!snapshot.inputContent,
        inputLabel: snapshot.inputLabel,
        inputContent: snapshot.inputContent,
        inputSummary: snapshot.inputSummary,
        hasInputSummary: snapshot.hasInputSummary,
      })),
    };
  }

  /**
   * 解析评估结果
   */
  private parseEvaluationResult(
    content: string,
    type: EvaluationType,
    metadata?: { model?: string; timestamp?: number; duration?: number }
  ): EvaluationResponse {
    const findEvaluationPayload = (value: unknown): unknown | null => {
      // 允许模型返回 "{ evaluation: {...} }" / "{ data: {...} }" 之类包装结构。
      // 为避免性能问题，这里做广度优先、有限步数的遍历。
      const visited = new Set<unknown>();
      const queue: unknown[] = [value];
      let steps = 0;

      while (queue.length > 0 && steps < 1000) {
        steps += 1;
        const current = queue.shift();
        if (!current || typeof current !== 'object') continue;

        if (visited.has(current)) continue;
        visited.add(current);

        if ((current as any).score !== undefined) {
          const score = (current as any).score;

          // 过滤掉类似维度项 "{ key, label, score }" 这种误命中。
          const isDimensionLike =
            typeof (current as any).key === 'string' &&
            typeof (current as any).label === 'string' &&
            (typeof score === 'number' || typeof score === 'string');

          const looksLikeEvaluation =
            (!isDimensionLike && (typeof score === 'number' || typeof score === 'string')) ||
            (score && typeof score === 'object' && ('overall' in score || 'dimensions' in score)) ||
            typeof (current as any).summary === 'string' ||
            Array.isArray((current as any).improvements) ||
            Array.isArray((current as any).patchPlan);

          if (looksLikeEvaluation) {
            return current;
          }
        }

        if (Array.isArray(current)) {
          for (const item of current) queue.push(item);
        } else {
          for (const v of Object.values(current as Record<string, unknown>)) {
            queue.push(v);
          }
        }
      }

      return null;
    };

    const jsonCandidates = this.extractJsonCandidates(content);
    for (const candidate of jsonCandidates) {
      try {
        const repairedJson = jsonrepair(candidate);
        const parsed = JSON.parse(repairedJson);
        const payload = findEvaluationPayload(parsed);
        if (!payload) continue;

        const normalized = this.normalizeEvaluationResponse(payload as any, type, metadata);
        return normalized;
      } catch (e) {
        console.warn(
          '[EvaluationService] Failed to parse evaluation JSON candidate:',
          e instanceof Error ? e.message : String(e)
        );
      }
    }

    // 降级解析
    const textResult = this.parseTextEvaluation(content, type, metadata);
    if (textResult) {
      console.warn('[EvaluationService] Using text fallback parsing');
      return textResult;
    }

    throw new EvaluationParseError(
      `Failed to parse evaluation result: no valid score JSON or recognizable overall score found. Raw content length: ${content.length} characters.`
    );
  }

  /**
   * 从模型输出中提取可能的 JSON 片段。
   *
   * 现实中模型可能：
   * - 输出 ```json ... ```
   * - 输出 ``` ... ```（无语言标注）
   * - 在解释文字中夹杂一段 JSON
   */
  private extractJsonCandidates(content: string): string[] {
    const candidates: string[] = [];

    // 1) 优先提取所有 fenced code block（不限语言），只挑看起来像 JSON 的块。
    const fencedRegex = /```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```/g;
    for (const match of content.matchAll(fencedRegex)) {
      const block = (match[1] ?? '').trim();
      if (!block) continue;
      const head = block.slice(0, 200);
      if (block.startsWith('{') || block.startsWith('[') || /["']score["']\s*:/.test(head)) {
        candidates.push(block);
      }
    }

    // 2) 尝试从正文中截取平衡的 JSON 子串（从 score 附近反向找起点）。
    const scoreIndex = content.search(/["']score["']\s*:/);
    if (scoreIndex >= 0) {
      const objCandidate = this.extractBalancedJsonSubstring(content, scoreIndex, '{', '}');
      if (objCandidate) candidates.push(objCandidate);

      const arrCandidate = this.extractBalancedJsonSubstring(content, scoreIndex, '[', ']');
      if (arrCandidate) candidates.push(arrCandidate);
    }

    // 3) 兜底：从第一个 '{' 或 '[' 开始尝试提取一个平衡块。
    const firstObj = content.indexOf('{');
    if (firstObj >= 0) {
      const objCandidate = this.extractBalancedFrom(content, firstObj, '{', '}');
      if (objCandidate) candidates.push(objCandidate);
    }
    const firstArr = content.indexOf('[');
    if (firstArr >= 0) {
      const arrCandidate = this.extractBalancedFrom(content, firstArr, '[', ']');
      if (arrCandidate) candidates.push(arrCandidate);
    }

    // 最后再把原始内容作为候选（部分情况下 jsonrepair 能救回来）。
    candidates.push(content);

    // 去重 + 过滤明显不可能的候选
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const c of candidates) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      if (trimmed.length > 200_000) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      uniq.push(trimmed);
    }
    return uniq;
  }

  private extractBalancedJsonSubstring(
    content: string,
    aroundIndex: number,
    openChar: '{' | '[',
    closeChar: '}' | ']'
  ): string | null {
    // 从 aroundIndex 向左找一个可能的起点，然后做括号匹配。
    const start = content.lastIndexOf(openChar, aroundIndex);
    if (start < 0) return null;
    return this.extractBalancedFrom(content, start, openChar, closeChar);
  }

  private extractBalancedFrom(
    content: string,
    start: number,
    openChar: '{' | '[',
    closeChar: '}' | ']'
  ): string | null {
    let depth = 0;
    let inString = false;
    let stringQuote: '"' | "'" | null = null;
    let escaped = false;

    for (let i = start; i < content.length; i += 1) {
      const ch = content[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === stringQuote) {
          inString = false;
          stringQuote = null;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringQuote = ch as '"' | "'";
        continue;
      }

      if (ch === openChar) {
        depth += 1;
        continue;
      }
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return content.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  /**
   * 标准化评估响应（统一结构）
   */
  private normalizeEvaluationResponse(
    data: any,
    type: EvaluationType,
    metadata?: { model?: string; timestamp?: number; duration?: number }
  ): EvaluationResponse {
    if (!data || typeof data !== 'object') {
      throw new EvaluationParseError('Evaluation result is not a valid object.');
    }

    if (data.score === undefined || data.score === null) {
      throw new EvaluationParseError('Evaluation result is missing the "score" field.');
    }

    // 提取分数（0-100，整数）
    const extractScore = (value: any, fieldName: string): number => {
      if (value === undefined || value === null) {
        throw new EvaluationParseError(`Evaluation result is missing score for "${fieldName}".`);
      }
      const num = typeof value === 'number' ? value : parseInt(String(value));
      if (isNaN(num)) {
        throw new EvaluationParseError(`Invalid numeric score for "${fieldName}": ${value}`);
      }
      return Math.max(0, Math.min(100, num));
    };

    const tryExtractScore = (value: any, fieldName: string): number | null => {
      try {
        return extractScore(value, fieldName);
      } catch {
        return null;
      }
    };

    const toDimension = (key: string, label: string, scoreValue: any): EvaluationDimension | null => {
      const score = tryExtractScore(scoreValue, `dimension.${key}`);
      if (score === null) return null;
      return { key, label: label || key, score };
    };

    const normalizeDimensionsFromArray = (dims: any[]): EvaluationDimension[] => {
      const out: EvaluationDimension[] = [];
      dims.forEach((dim: any, index: number) => {
        if (dim === null || dim === undefined) return;

        // 常见结构：{ key, label, score }
        if (typeof dim === 'object' && !Array.isArray(dim)) {
          const key = typeof dim.key === 'string' ? dim.key : typeof dim.name === 'string' ? dim.name : '';
          const label = typeof dim.label === 'string' ? dim.label : typeof dim.title === 'string' ? dim.title : key;
          const scoreValue = (dim as any).score ?? (dim as any).value;
          if (key) {
            const d = toDimension(key, label, scoreValue);
            if (d) out.push(d);
          }
          return;
        }

        // 兜底：如果维度是 "85" 这种，仍然保留一个占位维度。
        if (typeof dim === 'number' || typeof dim === 'string') {
          const d = toDimension(`dim${index + 1}`, `dim${index + 1}`, dim);
          if (d) out.push(d);
        }
      });
      return out;
    };

    const normalizeDimensionsFromObject = (dims: Record<string, any>): EvaluationDimension[] => {
      const out: EvaluationDimension[] = [];
      for (const [key, value] of Object.entries(dims)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const label = typeof (value as any).label === 'string' ? (value as any).label : key;
          const scoreValue = (value as any).score ?? (value as any).value;
          const d = toDimension(key, label, scoreValue);
          if (d) out.push(d);
        } else {
          const d = toDimension(key, key, value);
          if (d) out.push(d);
        }
      }
      return out;
    };

    const scoreRaw = data.score;
    let overall: number | null = null;
    let dimensions: EvaluationDimension[] = [];

    // score 可能直接是数字（少数模型会这样输出）
    if (typeof scoreRaw === 'number' || typeof scoreRaw === 'string') {
      overall = tryExtractScore(scoreRaw, 'overall');
    } else if (scoreRaw && typeof scoreRaw === 'object') {
      overall = tryExtractScore((scoreRaw as any).overall, 'overall');

      const dimensionsRaw = (scoreRaw as any).dimensions;
      if (Array.isArray(dimensionsRaw)) {
        dimensions = normalizeDimensionsFromArray(dimensionsRaw);
      } else if (dimensionsRaw && typeof dimensionsRaw === 'object') {
        dimensions = normalizeDimensionsFromObject(dimensionsRaw as Record<string, any>);
      } else {
        // 有些模型会把维度直接平铺到 score 对象里：{ overall, goalAchievement, ... }
        const knownKeys = ['goalAchievement', 'outputQuality', 'formatCompliance', 'relevance'];
        const flattened: Record<string, any> = {};
        for (const k of knownKeys) {
          if ((scoreRaw as any)[k] !== undefined) {
            flattened[k] = (scoreRaw as any)[k];
          }
        }
        if (Object.keys(flattened).length > 0) {
          dimensions = normalizeDimensionsFromObject(flattened);
        }
      }
    }

    // 如果 overall 缺失，但维度存在，则按平均分计算。
    if (overall === null && dimensions.length > 0) {
      const avg = Math.round(
        dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
      );
      overall = Math.max(0, Math.min(100, avg));
    }

    // 如果维度缺失，但 overall 存在，则返回一个最小维度数组。
    if (dimensions.length === 0 && overall !== null) {
      dimensions = [{ key: 'overall', label: '综合评分', score: overall }];
    }

    if (overall === null) {
      throw new EvaluationParseError('Evaluation result is missing a valid overall score.');
    }

    const score: EvaluationScore = {
      overall,
      dimensions,
    };

    // 解析 improvements（最多3条）
    const improvements = Array.isArray(data.improvements)
      ? data.improvements.map((x: any) => String(x)).filter(Boolean).slice(0, 3)
      : typeof data.improvements === 'string' && data.improvements.trim()
        ? [data.improvements.trim()].slice(0, 3)
        : [];

    // 解析 patchPlan（最多3条）
    const patchPlan = this.normalizePatchPlan(data.patchPlan || []).slice(0, 3);

    const summary = typeof data.summary === 'string' ? data.summary : '';

    return {
      type,
      score,
      improvements,
      summary,
      patchPlan,
      metadata,
    };
  }

  /**
   * 文本解析评估结果（降级方案）
   */
  private parseTextEvaluation(
    content: string,
    type: EvaluationType,
    metadata?: { model?: string; timestamp?: number; duration?: number }
  ): EvaluationResponse | null {
    const scorePatterns = [
      // JSON 残片里常见的 overall 字段
      /["']overall["']\s*[:=]\s*(\d{1,3})/i,

      // 中文常见写法
      /综合评分\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/,
      /总[分评]\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/,
      /评分\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/,

      // 英文常见写法
      /overall(?:\s+score)?\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/i,
      /score\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/i,

      // 纯数字 + /100
      /(\d{1,3})\s*\/\s*100/,
      /(\d{1,3})\s*[分点](?:\s*[（(]满分100[)）])?/,
    ];

    let overall: number | null = null;
    for (const pattern of scorePatterns) {
      const match = content.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 0 && num <= 100) {
          overall = num;
          break;
        }
      }
    }

    if (overall === null) {
      return null;
    }

    return {
      type,
      score: {
        overall,
        dimensions: [
          { key: 'overall', label: '综合评分', score: overall },
        ],
      },
      improvements: [],
      summary: '评估完成（解析降级）',
      patchPlan: [],
      metadata,
    };
  }

  /**
   * 标准化补丁计划数组（简化版）
   */
  private normalizePatchPlan(patchPlan: any[]): PatchOperation[] {
    if (!Array.isArray(patchPlan)) {
      return [];
    }

    const validOps: PatchOperationType[] = ['insert', 'replace', 'delete'];

    return patchPlan
      .map((op: any) => {
        if (!op || typeof op !== 'object') {
          return null;
        }

        let opType: PatchOperationType = 'replace';
        if (op.op && validOps.includes(op.op)) {
          opType = op.op;
        }

        // 反转义 HTML 实体（LLM 可能返回转义后的 XML 标签）
        const oldText = this.unescapeHtmlEntities(String(op.oldText || ''));
        if (!oldText) {
          return null;
        }

        const newText = this.unescapeHtmlEntities(
          op.newText !== undefined ? String(op.newText) : ''
        );

        const operation: PatchOperation = {
          op: opType,
          oldText,
          newText,
          instruction: String(op.instruction || ''),
        };

        if (typeof op.occurrence === 'number' && Number.isFinite(op.occurrence)) {
          const occ = Math.trunc(op.occurrence);
          if (occ > 0) {
            operation.occurrence = occ;
          }
        }

        return operation;
      })
      .filter((op): op is PatchOperation => op !== null);
  }

  /**
   * 反转义 HTML 实体
   * LLM 生成 JSON 时可能对 XML 标签进行 HTML 转义
   * 支持：命名实体、十进制实体(&#123;)、十六进制实体(&#x2F;)
   */
  private unescapeHtmlEntities(text: string): string {
    if (!text) return text;
    return text
      // 命名实体
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&sol;/g, '/')
      // 十六进制实体 &#xHH; 或 &#xHHHH;
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // 十进制实体 &#DDD;
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  }
}

/**
 * 创建评估服务的工厂函数
 */
export function createEvaluationService(
  llmService: ILLMService,
  modelManager: IModelManager,
  templateManager: ITemplateManager
): IEvaluationService {
  return new EvaluationService(llmService, modelManager, templateManager);
}
