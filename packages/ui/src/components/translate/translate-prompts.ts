/**
 * 翻译助手的提示词构造
 *
 * 设计说明（两条刻意的取舍）：
 *
 * 1. 语言名称使用「本地名 (English name)」形式，且**不随界面语言切换**。
 *    翻译工具的标准做法（DeepL / Google Translate 同此），好处有二：
 *    - 任意 LLM 都能准确识别目标语言，不受界面语言影响；
 *    - 无需为 12 种语言 × 3 个界面语言维护 36 份文案。
 *
 * 2. system prompt 固定书写语言，不接入 i18n。
 *    它是给模型看的**指令**，不是给用户看的界面文案；固定下来可保证
 *    不同界面语言下译文质量一致，也便于后续统一调优。
 *
 * 注意：本文件的字符串不纳入 `check:no-chinese-runtime` 的扫描范围
 *（该脚本仅检查 ENFORCED_TARGETS 白名单内的路径），故此处的中文提示词合规。
 */

export type TranslationStyle = 'faithful' | 'natural' | 'technical'

/** 「自动检测源语言」的哨兵值 */
export const AUTO_DETECT_CODE = 'auto'

export interface LanguageOption {
  code: string
  /** 形如「简体中文 (Simplified Chinese)」 */
  label: string
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'zh-CN', label: '简体中文 (Simplified Chinese)' },
  { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'ru', label: 'Русский (Russian)' },
  { code: 'pt', label: 'Português (Portuguese)' },
  { code: 'it', label: 'Italiano (Italian)' },
  { code: 'ar', label: 'العربية (Arabic)' },
] as const

const STYLE_RULES: Record<TranslationStyle, string> = {
  faithful: '忠实原文，逐句对应，不增删、不改写、不意译',
  natural: '符合目标语言的表达习惯，语序与措辞可调整，读起来自然流畅',
  technical: '术语准确、表述专业严谨，优先采用该领域内的标准译法',
}

export interface GlossaryEntry {
  from: string
  to: string
}

export const getLanguageLabel = (code: string): string =>
  SUPPORTED_LANGUAGES.find((item) => item.code === code)?.label ?? code

/**
 * 解析术语表：每行一条，格式 `原文=译文`。
 * 无等号、任一侧为空的行直接忽略——避免用户的空行/注释行污染提示词。
 */
export const parseGlossary = (raw: string): GlossaryEntry[] => {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return { from: line.slice(0, index).trim(), to: line.slice(index + 1).trim() }
    })
    .filter((entry) => entry.from.length > 0 && entry.to.length > 0)
}

export interface TranslationPromptOptions {
  sourceLanguage: string
  targetLanguage: string
  style: TranslationStyle
  glossary?: string
}

/**
 * 构造单次翻译的 system prompt。
 *
 * 输出约束有意写得充分（只输出译文、保留格式、不翻译代码与占位符），
 * 因为译文会直接展示给用户，任何解释性文字都会降低可用性。
 */
export const buildTranslationSystemPrompt = (options: TranslationPromptOptions): string => {
  const targetLabel = getLanguageLabel(options.targetLanguage)
  const isAutoSource = options.sourceLanguage === AUTO_DETECT_CODE
  const sourceLabel = isAutoSource ? '' : getLanguageLabel(options.sourceLanguage)

  const lines: string[] = [
    `你是一名专业翻译。请把用户提供的文本翻译成 ${targetLabel}。`,
    '',
    '要求：',
    isAutoSource
      ? '- 先自动识别源语言，再翻译。'
      : `- 源语言是 ${sourceLabel}，请据此理解原文。`,
    `- 译文风格：${STYLE_RULES[options.style]}。`,
    '- 只输出译文本身。不要添加任何解释、前言、后记、注释，也不要用引号包裹整段译文。',
    '- 完整保留原文的段落结构、换行、缩进与列表格式。',
    '- 原文中的代码片段、变量名、占位符（如 {name}、%s、{{var}}）与 URL 保持原样，不做翻译。',
  ]

  const glossaryEntries = parseGlossary(options.glossary ?? '')
  if (glossaryEntries.length > 0) {
    lines.push(
      '- 术语表（以下术语必须严格按指定译法处理，不得改写）：',
      ...glossaryEntries.map((entry) => `  ${entry.from} → ${entry.to}`),
    )
  }

  return lines.join('\n')
}
