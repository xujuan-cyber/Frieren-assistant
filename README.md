# Prompt Optimizer (提示词优化器)

一个纯前端的提示词优化工具，帮助你优化和改进 AI 提示词。使用 Vue 3 + Vite 构建，支持多个 LLM 模型。

## 功能特点

- 🚀 纯前端应用，无需后端服务
- 🤖 支持多个 LLM 模型（DeepSeek、Gemini）
- 💾 本地保存历史记录和设置
- 🔑 API 密钥安全加密存储
- 📱 响应式设计，支持移动端
- ✨ 优雅的动画和交互效果
- 🌈 深色/浅色主题切换
- 📋 一键复制优化结果
- 🔄 历史记录管理
- 📝 提示词模板管理

## 项目结构

```
prompt-optimizer-v3/
├── src/                    # 源代码目录
│   ├── api/               # API 接口封装
│   ├── assets/            # 静态资源
│   ├── components/        # Vue 组件
│   ├── services/          # 业务逻辑服务
│   │   ├── llm/          # LLM 服务封装
│   │   ├── prompt/       # 提示词处理服务
│   │   └── template/     # 模板管理服务
│   ├── App.vue            # 根组件
│   ├── main.js            # 入口文件
│   └── style.css          # 全局样式
├── public/                # 公共资源目录
├── tools/                 # 工具脚本
├── tests/                 # 测试文件
├── .env.example          # 环境变量示例
├── .env.local            # 本地环境变量（需自行创建）
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
└── tailwind.config.js    # TailwindCSS 配置
```

## 功能清单

### 核心功能
- [x] 提示词输入和优化
  - [x] 多模型支持（DeepSeek、Gemini）
  - [x] 实时字数统计
  - [x] 一键清空输入
  - [x] 优化结果预览
  - [x] 提示词模板管理
  
### 设置与配置
- [x] API 密钥管理
  - [x] 加密存储
  - [x] 快速验证
- [x] 界面主题切换
- [x] 语言切换
- [x] 模板配置

### 历史记录
- [x] 本地历史记录
  - [x] 按时间排序
  - [x] 搜索过滤
  - [x] 一键重用
  - [x] 删除记录

### 用户体验
- [x] 操作反馈
  - [x] 复制成功提示
  - [x] 保存成功提示
  - [x] 加载动画
- [x] 移动端适配
  - [x] 响应式布局
  - [x] 触摸手势支持

## 在线体验

访问：[在线地址](#) (TODO: 添加部署后的地址)

## 本地开发

### 环境要求

- Node.js >= 16
- npm >= 7

### 安装依赖
npm install


### 配置环境变量

1. 在项目根目录创建 `.env.local` 文件
2. 添加以下配置（也可以在应用内配置）：
VITE_GEMINI_API_KEY=你的Gemini API密钥
VITE_DEEPSEEK_API_KEY=你的DeepSeek API密钥


### 启动开发服务器
npm run dev
访问 `http://localhost:5173` 查看应用

### 构建生产版本
npm run build

构建后的文件将生成在 `dist` 目录下

### 发布到vercel
```bash
# 第一次使用需要安装vercel
npm install -g vercel
# 登录vercel
vercel login

# 发布项目
vercel --prod

```

## 使用说明

1. 首次使用需要配置 API 密钥：
   - 点击右上角的 ⚙️ 设置按钮
   - 输入相应的 API 密钥
   - 点击保存

2. 优化提示词：
   - 在输入框中输入需要优化的提示词
   - 选择想要使用的 AI 模型
   - 点击"开始优化"按钮

3. 查看历史记录：
   - 点击右上角的 📜 历史按钮
   - 可以查看之前的优化记录
   - 点击"重新使用"可以快速恢复历史提示词

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- TailwindCSS - 实用优先的 CSS 框架
- Vue Composition API - 组合式 API
- LocalStorage - 本地数据持久化
- CryptoJS - 数据加密
- Markdown-it - Markdown 渲染

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解更多详情

## 联系方式

如有问题或建议，欢迎提出 Issue 或 PR。