# 文件结构说明

## 项目根目录
```
prompt-optimizer/
├── packages/             # 项目包
│   ├── core/            # 核心功能包
│   │   ├── src/         # 核心源代码
│   │   ├── tests/       # 核心包测试
│   │   └── package.json # 核心包配置
│   ├── web/             # Web版本
│   │   ├── src/         # Web源代码
│   │   ├── tests/       # Web测试
│   │   └── package.json # Web包配置
│   └── extension/       # Chrome插件（开发中）
├── docs/                # 项目文档
├── tools/               # 工具脚本
└── ...配置文件
```

## Core包目录 (packages/core/src/)
```
src/
├── services/           # 核心服务
│   ├── llm/           # LLM服务
│   │   ├── service.ts # LLM服务实现
│   │   ├── types.ts   # 类型定义
│   │   └── errors.ts  # 错误定义
│   ├── model/         # 模型管理
│   │   ├── manager.ts # 模型管理器
│   │   ├── types.ts   # 类型定义
│   │   └── defaults.ts# 默认配置
│   ├── prompt/        # 提示词服务
│   │   ├── service.ts # 提示词服务实现
│   │   ├── types.ts   # 类型定义
│   │   └── errors.ts  # 错误定义
│   ├── template/      # 模板服务
│   │   ├── manager.ts # 模板管理器
│   │   ├── types.ts   # 类型定义
│   │   └── defaults.ts# 默认配置
│   └── history/       # 历史记录服务
│       ├── manager.ts # 历史管理器
│       └── types.ts   # 类型定义
├── types/             # 公共类型定义
└── utils/             # 工具函数
```

## Web包目录 (packages/web/src/)
```
src/
├── components/        # Vue组件
│   ├── PromptPanel.vue    # 提示词面板
│   ├── ModelManager.vue   # 模型管理器
│   ├── TemplateManager.vue# 模板管理器
│   ├── InputPanel.vue     # 输入面板
│   └── OutputPanel.vue    # 输出面板
├── assets/           # 静态资源
│   ├── images/      # 图片资源
│   └── styles/      # 样式资源
├── App.vue          # 根组件
└── main.ts          # 入口文件
```

## 测试目录结构
```
packages/core/tests/   # 核心包测试
├── unit/             # 单元测试
│   └── services/     # 服务测试
│       ├── llm/      # LLM服务测试
│       ├── model/    # 模型管理测试
│       └── prompt/   # 提示词服务测试
└── integration/      # 集成测试
    └── services/     # 服务集成测试

packages/web/tests/   # Web包测试
├── unit/            # 单元测试
│   ├── components/  # 组件测试
│   └── services/    # 服务测试
└── integration/     # 集成测试
    └── services/    # 服务集成测试
```

## 配置文件
### 根目录配置
- `pnpm-workspace.yaml` - 工作区配置
- `.env.example` - 环境变量示例
- `package.json` - 项目配置

### Core包配置 (packages/core/)
- `package.json` - 核心包配置
- `tsconfig.json` - TypeScript配置
- `vitest.config.ts` - 测试配置

### Web包配置 (packages/web/)
- `package.json` - Web包配置
- `vite.config.ts` - Vite配置
- `tailwind.config.js` - TailwindCSS配置
- `.env.local` - 本地环境变量

## 依赖关系
```
@prompt-optimizer/core  # 核心包
├── @langchain/core ^0.3.33        # LangChain核心
├── @langchain/google-genai ^0.1.6 # Gemini支持
├── @langchain/openai ^0.3.17      # OpenAI支持
└── uuid ^11.0.5                   # UUID生成

@prompt-optimizer/web   # Web包
├── @prompt-optimizer/core  # 依赖核心包
├── vue ^3.4.15            # Vue框架
└── tailwindcss ^3.4.1     # 样式框架
```

## 工作区文件
- `scratchpad.md` - 开发笔记
- `experience.md` - 经验总结
- `cursor_tips.md` - AI辅助开发指南

## 文档目录 (docs/)
```
docs/
├── prd.md                # 产品需求文档
├── app-flow.md           # 应用流程
├── tech-stack.md         # 技术栈
├── frontend-guidelines.md # 前端指南
├── core-guidelines.md    # 核心包开发指南（新增）
└── file-structure.md     # 文件结构
```