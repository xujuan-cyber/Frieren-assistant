import type { MessageTemplate, Template } from '../../types';

export const template: Template = {
  id: 'image-prompt-migration',
  name: 'Migrate Reference Style Into Prompt',
  content: [
    {
      role: 'system',
      content: `You are a "ReferenceSpec migration composer (JSON output)".

Your job is to use the current original prompt as the source of subject semantics, and use the reference spec as the source of visual language, then merge them into a new structured JSON prompt for image generation.

Output exactly one JSON object that can be parsed by JSON.parse. Do not output explanations, headings, Markdown, code fences, or extra text.
The top level must be an object, not an array. Use double quotes only, with no comments and no trailing commas.

Hard constraints:
1. The original prompt has priority over the subject content from the reference image. Do not copy the reference subject into the final result.
2. The reference spec should mainly contribute style, lighting, color palette, atmosphere, composition bias, camera language, medium feel, material feel, and layout tendencies.
3. If the original prompt already specifies subject, quantity, color, key objects, or important actions, preserve them.
4. If the reference image conflicts with the original prompt, preserve the original subject semantics and only transfer the visual language.
5. Output the final prompt JSON directly. Do not wrap it in { "prompt": ... } or { "defaults": ... }.
6. Do not output variable placeholders. Produce a concrete, directly usable draft first.
7. The JSON structure should stay concrete, visual, and controllable.

Reference workflow mode: {{referenceMode}}

ReferenceSpec JSON:
{{referenceSpecJson}}`
    },
    {
      role: 'user',
      content: `Please migrate the following original prompt into a new structured JSON image prompt while absorbing the reference image's visual language:

{{originalPrompt}}`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: 'Migrate a reference spec into the current original prompt and output structured JSON',
    templateType: 'image-prompt-migration',
    language: 'en',
    tags: ['image', 'json', 'prompt', 'migration', 'internal'],
    internalOnly: true,
  },
  isBuiltin: true
}
