export const syntaxGuideContent = {
  'zh-CN': `# 语法指南

## 语法规则

### 变量语法
使用双大括号包围变量名：\`{{variableName}}\`

### 变量命名
使用英文驼峰命名法，如 \`originalPrompt\`

### 大小写敏感
\`{{prompt}}\` 和 \`{{Prompt}}\` 是不同的变量

## 变量语法

### 预定义变量

系统目前支持以下3个预定义变量：

#### \`{{originalPrompt}}\` - 原始提示词
- 包含用户最初输入的原始提示词内容
- 在优化和迭代场景中保持一致的语义

#### \`{{lastOptimizedPrompt}}\` - 上一次优化后的提示词  
- **仅迭代场景**使用
- 包含上一轮优化生成的提示词内容，用作当前迭代的基础

#### \`{{iterateInput}}\` - 迭代优化需求
- **仅迭代场景**使用
- 包含用户对优化后提示词的具体迭代要求和方向

**重要提醒：** 仅高级模板支持变量替换功能

## 模板类型说明

### 简单模板

**工作原理：** 不使用模板技术，直接将模板内容作为系统提示词，用户输入作为用户消息

**适用场景：** 
- 仅限优化场景
- 简单易用，易于编辑
- 快速创建基础模板

**处理方式：** 
1. 模板内容 → 系统消息(system)
2. 用户输入 → 用户消息(user)

**限制：** 
- 不支持变量替换
- 不支持迭代场景
- 不支持复杂的多轮对话结构
- 无法自定义消息角色

### 高级模板

**工作原理：** 使用消息数组格式和Mustache模板技术，支持变量替换和精确的消息控制

**适用场景：** 
- 优化和迭代场景
- 复杂对话结构
- 角色扮演对话
- 多轮对话模拟

**处理方式：** 
1. 按照消息数组结构发送
2. 使用 \`{{variable}}\` 进行变量替换
3. 支持自定义消息角色

**必需场景：** 迭代场景强制要求使用高级模板

### 消息角色说明

高级模板支持以下三种消息角色：

- **system**：系统消息，定义AI的角色、能力和行为规范
- **user**：用户消息，模拟用户的输入和请求
- **assistant**：助手消息，模拟AI的回复，用于多轮对话

## 模板格式转换

系统支持将简单模板转换为高级模板：

1. 在模板管理器中找到目标简单模板
2. 点击"升级"按钮
3. 系统自动将字符串内容转换为消息数组格式
4. 转换后即可使用变量替换功能
5. 可手动调整消息结构以适应具体需求

## 模板预览功能

在模板管理器中编辑高级模板时：

1. **实时预览**：系统会自动使用示例数据展示模板效果
2. **示例数据**：
   - \`originalPrompt\`: "Write a story"
   - \`lastOptimizedPrompt\`: "Create an engaging narrative"
   - \`iterateInput\`: "Make it more creative and add space exploration theme"
3. **预览显示**：展示变量替换后的实际消息内容
4. **角色标识**：不同角色用不同颜色标识

## 示例

### 简单模板示例（优化场景）

**注意：简单模板不支持变量替换，以下内容会被直接作为系统消息发送**

\`\`\`
你是一个专业的AI提示词优化专家。请帮我优化用户提供的prompt。

请按照以下要求进行优化：
1. 保持原有意图不变
2. 提高表达的清晰度
3. 增强指令的可执行性
4. 优化输出格式要求

请直接输出优化后的提示词，无需解释过程。
\`\`\`

### 高级模板示例（单轮优化）

使用变量: \`{{originalPrompt}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "你是一个专业的AI提示词优化专家，擅长将普通提示词转化为结构化、高效的提示词。"
  },
  {
    "role": "user", 
    "content": "请优化这个提示词：{{originalPrompt}}\\n\\n要求：保持原意的同时，提高清晰度和可执行性。"
  }
]
\`\`\`

### 高级模板示例（多轮对话）

使用变量: \`{{originalPrompt}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "你是一个专业的AI提示词优化专家，擅长将普通提示词转化为结构化、高效的提示词。"
  },
  {
    "role": "user", 
    "content": "我需要优化这个提示词：{{originalPrompt}}"
  },
  {
    "role": "assistant",
    "content": "我会帮您优化这个提示词。请告诉我您希望重点改进哪些方面？"
  },
  {
    "role": "user",
    "content": "请提供一个结构化的优化版本，包含角色定义、技能描述和工作流程。"
  }
]
\`\`\`

### 高级模板示例（迭代场景）

使用变量: \`{{originalPrompt}}\`, \`{{lastOptimizedPrompt}}\`, \`{{iterateInput}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "你是一个提示词迭代优化专家，擅长根据用户需求对优化后的提示词进行定向改进。"
  },
  {
    "role": "user",
    "content": "原始提示词：{{originalPrompt}}\\n\\n上一次优化版本：{{lastOptimizedPrompt}}\\n\\n迭代需求：{{iterateInput}}\\n\\n请基于迭代需求进一步改进优化版本，保持核心意图不变。"
  }
]
\`\`\`

## 常见错误与解决

### 1. 迭代场景使用简单模板
**错误信息**：迭代场景必须使用高级模板（消息数组格式）
**解决方案**：将简单模板转换为高级模板，或创建新的高级模板

### 2. 变量名拼写错误
**问题**：模板中变量未被替换，显示为原始 \`{{变量名}}\`
**解决方案**：检查变量名是否为预定义的三个变量之一

### 3. 消息内容为空
**错误信息**：消息内容不能为空
**解决方案**：确保每个消息的 content 字段都有内容

### 4. 高级模板格式错误
**问题**：模板无法保存或使用
**解决方案**：确保JSON格式正确，每个消息都有role和content字段

## 最佳实践

### 选择建议
- **新手用户**：推荐从简单模板开始
- **需要变量替换**：必须使用高级模板
- **迭代场景**：强制要求使用高级模板
- **复杂对话**：使用高级模板的多消息结构

### 编写技巧
- **系统消息**：清晰定义AI的角色、能力和行为规范
- **用户消息**：提供具体的任务内容和要求
- **助手消息**：用于引导对话方向或提供示例回复
- **变量使用**：合理使用变量避免硬编码

### 调试方法
- **预览功能**：编辑时查看实时预览效果
- **简单测试**：先用简单内容测试模板是否工作正常
- **逐步完善**：从基础版本开始，逐步添加复杂功能
- **格式转换**：利用升级功能将简单模板转为高级模板

### 性能优化
- **避免过长**：消息内容不宜过长，影响处理速度
- **结构清晰**：保持模板结构清晰易懂
- **避免嵌套**：不要过度复杂的嵌套结构
`,

  'en-US': `# Syntax Guide

## Syntax Rules

### Variable Syntax
Use double curly braces around variable names: \`{{variableName}}\`

### Variable Naming
Use English camelCase naming, e.g., \`originalPrompt\`

### Case Sensitive
\`{{prompt}}\` and \`{{Prompt}}\` are different variables

## Variable Syntax

### Predefined Variables

The system currently supports the following 3 predefined variables:

#### \`{{originalPrompt}}\` - Original Prompt
- Contains the original prompt content initially entered by the user
- Maintains consistent semantics across optimization and iteration scenarios

#### \`{{lastOptimizedPrompt}}\` - Last Optimized Prompt
- **Iteration scenario only**
- Contains the prompt content generated from the previous optimization round, used as the basis for current iteration

#### \`{{iterateInput}}\` - Iteration Optimization Requirement
- **Iteration scenario only**
- Contains user-specific iteration requirements and directions for the optimized prompt

**Important Reminder:** Only advanced templates support variable replacement functionality

## Template Type Description

### Simple Template

**Working Principle:** No template technology used, directly uses template content as system prompt, user input as user message

**Usage Scenarios:** 
- Optimization scenarios only
- Simple and easy to use, easy to edit
- Quick creation of basic templates

**Processing Method:** 
1. Template content → system message
2. User input → user message

**Limitations:** 
- No variable replacement support
- Does not support iteration scenarios
- Does not support complex multi-turn conversation structures
- Cannot customize message roles

### Advanced Template

**Working Principle:** Uses message array format and Mustache template technology, supports variable replacement and precise message control

**Usage Scenarios:** 
- Optimization and iteration scenarios
- Complex dialogue structures
- Role-playing conversations
- Multi-turn conversation simulation

**Processing Method:** 
1. Send according to message array structure
2. Use \`{{variable}}\` for variable replacement
3. Support custom message roles

**Required Scenarios:** Iteration scenarios mandatorily require advanced templates

### Message Role Description

Advanced templates support the following three message roles:

- **system**: System message, defines AI's role, capabilities, and behavioral norms
- **user**: User message, simulates user input and requests
- **assistant**: Assistant message, simulates AI responses, used for multi-turn conversations

## Template Format Conversion

The system supports converting simple templates to advanced templates:

1. Find the target simple template in the template manager
2. Click the "Upgrade" button
3. System automatically converts string content to message array format
4. After conversion, variable replacement functionality can be used
5. Manually adjust message structure to fit specific needs

## Template Preview Feature

When editing advanced templates in the template manager:

1. **Real-time Preview**: System automatically shows template effects using sample data
2. **Sample Data**:
   - \`originalPrompt\`: "Write a story"
   - \`lastOptimizedPrompt\`: "Create an engaging narrative"
   - \`iterateInput\`: "Make it more creative and add space exploration theme"
3. **Preview Display**: Shows actual message content after variable replacement
4. **Role Identification**: Different roles are identified with different colors

## Examples

### Simple Template Example (Optimization Scenario)

**Note: Simple templates do not support variable replacement, the following content will be sent directly as system message**

\`\`\`
You are a professional AI prompt optimization expert. Please help me optimize the prompt provided by the user.

Please optimize according to the following requirements:
1. Keep the original intent unchanged
2. Improve clarity of expression
3. Enhance instruction executability
4. Optimize output format requirements

Please output the optimized prompt directly without explaining the process.
\`\`\`

### Advanced Template Example (Single-turn Optimization)

Using variables: \`{{originalPrompt}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "You are a professional AI prompt optimization expert, skilled at transforming ordinary prompts into structured, efficient prompts."
  },
  {
    "role": "user", 
    "content": "Please optimize this prompt: {{originalPrompt}}\\n\\nRequirements: Maintain original meaning while improving clarity and executability."
  }
]
\`\`\`

### Advanced Template Example (Multi-turn Conversation)

Using variables: \`{{originalPrompt}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "You are a professional AI prompt optimization expert, skilled at transforming ordinary prompts into structured, efficient prompts."
  },
  {
    "role": "user", 
    "content": "I need to optimize this prompt: {{originalPrompt}}"
  },
  {
    "role": "assistant",
    "content": "I'll help you optimize this prompt. Please tell me which aspects you'd like to focus on improving?"
  },
  {
    "role": "user",
    "content": "Please provide a structured optimized version, including role definition, skill description, and workflow."
  }
]
\`\`\`

### Advanced Template Example (Iteration Scenario)

Using variables: \`{{originalPrompt}}\`, \`{{lastOptimizedPrompt}}\`, \`{{iterateInput}}\`

\`\`\`json
[
  {
    "role": "system",
    "content": "You are a prompt iteration optimization expert, skilled at making targeted improvements to optimized prompts based on user requirements."
  },
  {
    "role": "user",
    "content": "Original prompt: {{originalPrompt}}\\n\\nLast optimized version: {{lastOptimizedPrompt}}\\n\\nIteration requirements: {{iterateInput}}\\n\\nPlease further improve the optimized version based on the iteration requirements while keeping the core intent unchanged."
  }
]
\`\`\`

## Common Errors & Solutions

### 1. Using Simple Template in Iteration Scenarios
**Error Message**: Iteration scenarios must use advanced templates (message array format)
**Solution**: Convert simple template to advanced template, or create new advanced template

### 2. Variable Name Spelling Errors
**Problem**: Variables in template are not replaced, showing original \`{{variableName}}\`
**Solution**: Check if variable name is one of the three predefined variables

### 3. Empty Message Content
**Error Message**: Message content cannot be empty
**Solution**: Ensure each message's content field has content

### 4. Advanced Template Format Error
**Problem**: Template cannot be saved or used
**Solution**: Ensure JSON format is correct, each message has role and content fields

## Best Practices

### Selection Recommendations
- **New Users**: Recommend starting with simple templates
- **Need Variable Replacement**: Must use advanced templates
- **Iteration Scenarios**: Mandatorily require advanced templates
- **Complex Conversations**: Use multi-message structure of advanced templates

### Writing Techniques
- **System Messages**: Clearly define AI's role, capabilities, and behavioral norms
- **User Messages**: Provide specific task content and requirements
- **Assistant Messages**: Guide conversation direction or provide example responses
- **Variable Usage**: Use variables reasonably to avoid hard-coding

### Debugging Methods
- **Preview Feature**: View real-time preview effects while editing
- **Simple Testing**: Test template with simple content first to ensure it works
- **Gradual Improvement**: Start with basic version, gradually add complex features
- **Format Conversion**: Use upgrade feature to convert simple templates to advanced templates

### Performance Optimization
- **Avoid Excessive Length**: Message content should not be too long, affecting processing speed
- **Clear Structure**: Keep template structure clear and understandable
- **Avoid Nesting**: Don't over-complicate nested structures
`
} 