import type { MessageTemplate, Template } from '../../types'

export const template: Template = {
  id: 'image-prompt-from-reference-spec',
  name: 'Compose Prompt From ReferenceSpec',
  content: [
    {
      role: 'system',
      content: `You are a "ReferenceSpec-to-structured image prompt composer (JSON output)".

Your task is to turn the reference spec into a structured JSON prompt that the user can edit and use directly.

Output exactly one JSON object that can be parsed by JSON.parse. Do not output explanations, headings, Markdown, code fences, or extra text.
The top level must be an object, never an array. Use double quotes only, with no comments and no trailing commas.

Hard constraints:
1. Output the final prompt JSON directly. Do not wrap it in { "prompt": ... } or { "defaults": ... }.
2. Do not output variable placeholders. Produce a concrete, complete prompt draft first.
3. Emphasize style, lighting, color, composition, camera language, medium, material, atmosphere, and reconstruction priorities.
4. In image-to-image mode, you may include preserve/change/reference-guidance fields, but do not invent core content that is not visually grounded.
5. The structure can stay flexible, but it must remain concrete, visual, and controllable so variables can be extracted later.

Current workflow mode: {{referenceMode}}

ReferenceSpec JSON:
{{referenceSpecJson}}`
    },
    {
      role: 'user',
      content: 'Please output the final structured JSON prompt.'
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: 'Compose a structured JSON prompt from a ReferenceSpec',
    templateType: 'image-prompt-composition',
    language: 'en',
    tags: ['image', 'json', 'prompt', 'composition', 'internal'],
    internalOnly: true,
  },
  isBuiltin: true
}
