# 文件结构说明

## 项目根目录
```
prompt-optimizer/
├── .vscode/              # VS Code配置
├── docs/                 # 项目文档
│   ├── prd.md           # 产品需求文档
│   ├── app-flow.md      # 应用流程
│   ├── tech-stack.md    # 技术栈
│   └── ...
├── public/              # 静态资源
├── src/                 # 源代码
├── tests/               # 测试文件
├── tools/               # 工具脚本
└── ...配置文件
```

## 源代码目录 (src/)
```
src/
├── api/                 # API接口封装
│   └── llm.js          # LLM API调用
├── assets/             # 静态资源
│   ├── images/         # 图片资源
│   └── styles/         # 样式资源
├── components/         # Vue组件
│   ├── PromptPanel.vue # 提示词面板
│   ├── InputPanel.vue  # 输入面板
│   └── OutputPanel.vue # 输出面板
├── config/             # 配置文件
│   └── models.js       # 模型配置
├── services/           # 业务逻辑
│   └── llm.js         # LLM服务
├── utils/              # 工具函数
│   ├── crypto.js      # 加密工具
│   └── storage.js     # 存储工具
├── App.vue            # 根组件
├── main.js            # 入口文件
└── style.css          # 全局样式
```

## 测试目录 (tests/)
```
tests/
├── unit/              # 单元测试
│   └── services/      # 服务测试
├── integration/       # 集成测试
│   └── services/      # 服务集成测试
│       └── llm/       # LLM服务测试
└── e2e/              # 端到端测试
```

## 文档目录 (docs/)
```
docs/
├── prd.md            # 产品需求文档
├── app-flow.md       # 应用流程
├── tech-stack.md     # 技术栈
├── frontend-guidelines.md  # 前端指南
└── file-structure.md # 文件结构
```

## 工具目录 (tools/)
```
tools/
├── scripts/          # 构建脚本
└── templates/        # 模板文件
```

## 配置文件
- `.env.example` - 环境变量示例
- `.env.local` - 本地环境变量
- `package.json` - 项目配置
- `vite.config.js` - Vite配置
- `tailwind.config.js` - TailwindCSS配置
- `vitest.config.js` - Vitest测试配置
- `.eslintrc.js` - ESLint配置
- `.prettierrc` - Prettier配置
- `.gitignore` - Git忽略配置
- `.cursorrules` - Cursor IDE配置

## 工作区文件
- `scratchpad.md` - 开发笔记
- `experience.md` - 经验总结
- `cursor_tips.md` - AI辅助开发指南
``` 