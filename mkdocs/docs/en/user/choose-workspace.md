# Choose Workspace

If this is your first time opening Prompt Optimizer, do not start with every feature. Start by choosing the right workspace.

The simplest rule is:

**Look at what the right side needs as input.**

## First-time shortcut

| Your goal | Recommended workspace | What the left side edits | Main right-side input |
| --- | --- | --- | --- |
| Define a stable role, policy, or boundary | [System Prompt Workspace](../basic/system-optimization.md) | system prompt | one test message |
| Improve one direct task instruction | [User Prompt Workspace](../basic/user-optimization.md) | user prompt | usually no extra input |
| Turn one prompt into a reusable template | [Variable Workspace](../advanced/variables.md) | prompt template with `{{variables}}` | one set of variable values |
| Optimize one message inside a full conversation | [Context Workspace](../advanced/context.md) | one target `system/user` message inside the conversation | full conversation + shared variables + optional tools |
| Generate images from text only | [Text-to-Image Workspace](../image/text2image-workspace.md) | image prompt | image model |
| Continue editing from an input image | [Image-to-Image Workspace](../image/image2image-workspace.md) | image-to-image prompt | input image + image model |

## If you just want the fastest decision, these 4 lines are enough

1. If the right side needs test text, choose **System Prompt Workspace**
2. If the right side needs no extra input, choose **User Prompt Workspace**
3. If the right side needs variable values, choose **Variable Workspace**
4. If the right side needs a full conversation or images, choose **Context / Image workspaces**

## Check the right-side input one more time

- **Needs one test message**: usually **System Prompt Workspace**
- **Needs no extra input**: usually **User Prompt Workspace**
- **Needs variable values**: usually **Variable Workspace**
- **Needs a full conversation**: usually **Context Workspace**
- **Needs an image model to generate pictures**: usually **Text-to-Image Workspace**
- **Needs an input image first**: usually **Image-to-Image Workspace**

## If you are still unsure, judge by task type

If you are writing:

- “You are a support assistant”
- “Always answer in two parts”
- “Do not invent facts”

use **System Prompt Workspace**.

If you are writing:

- “Write an email”
- “Summarize this text”
- “Write a poem about autumn”

use **User Prompt Workspace**.

If your prompt looks like this:

```text
Write a poem about {{topic}} in {{style}}.
```

use **Variable Workspace**.

If your problem already includes:

- `system`
- `user`
- `assistant`
- tools / function calling

use **Context Workspace** instead of forcing everything into a single-prompt mode.

If your main goal is image generation:

- text only: use **Text-to-Image Workspace**
- input image included: use **Image-to-Image Workspace**

## The 3 most common points of confusion

- **System vs User workspace**: system is for long-lived role and rule design; user is for one concrete task instruction
- **User vs Variable workspace**: user is one fixed prompt; variable is a reusable template
- **Variable vs Context workspace**: variable is one prompt with parameters; context is one target message inside a full conversation

## Recommended fallback order

1. Start with [User Prompt Workspace](../basic/user-optimization.md) for one task prompt
2. Use [System Prompt Workspace](../basic/system-optimization.md) for role and boundary design
3. Move to [Variable Workspace](../advanced/variables.md) when you need reusable parameters
4. Move to [Context Workspace](../advanced/context.md) when you need full conversation context
5. Use image workspaces only when the final output is an image

## Next pages

- Want a full first run: [Quick Start](quick-start.md)
- Want the boundary between analysis and evaluation: [Testing & Evaluation](testing-evaluation.md)
- Want guidance on left-side vs right-side model use: [Model Testing Strategy](model-testing-strategy.md)
