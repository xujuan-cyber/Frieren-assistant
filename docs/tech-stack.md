# 技术栈文档

## 1. 项目架构
- Monorepo
  - pnpm workspace
  - 多包管理
  - 包间依赖
  - 统一版本控制

## 2. 核心包 (@prompt-optimizer/core)
- TypeScript 5.3.x
  - 类型系统
  - 接口定义
  - 模块化
- LangChain
  - @langchain/core ^0.3.33
  - @langchain/google-genai ^0.1.6
  - @langchain/openai ^0.3.17
  - @langchain/deepseek ^0.1.2
  - 模型管理
  - 提示词处理
  - 流式响应
- 工具库
  - uuid ^11.0.5
  - zod ^3.22.4
  - rxjs ^7.8.1
  - 错误处理
  - 类型定义

## 3. Web包 (@prompt-optimizer/web)
- Vue 3.4.x
  - Composition API
  - Script Setup
  - 响应式系统
  - 组件生态
- Vite 5.1.x
  - 快速开发服务器
  - 优化的构建
  - 插件系统
  - HMR支持

## 4. UI框架和样式
- TailwindCSS 3.4.x
  - 实用优先
  - 响应式设计
  - 深色模式支持
  - 动画系统
- Vue Transitions
  - 页面过渡动画
  - 组件切换效果
  - 列表动画
- DaisyUI 4.7.x
  - 组件库
  - 主题支持
  - 响应式组件

## 5. 状态管理
- Vue Reactivity
  - ref/reactive
  - computed
  - watch
  - watchEffect
- LocalStorage
  - 配置持久化
  - 历史记录存储
  - 模板管理
  - 加密存储
- Pinia 2.1.x
  - 状态管理
  - 持久化
  - 插件支持

## 6. 安全性
- WebCrypto API
  - API密钥加密
  - 安全存储
  - 密钥轮换
- XSS防护
  - 输入验证
  - 内容过滤
  - 安全编码
- CORS配置
  - API访问控制
  - 安全头部
  - CSP策略

## 7. 开发工具
- TypeScript 5.3.x
  - 类型检查
  - 代码提示
  - 接口定义
- ESLint 8.56.x
  - 代码规范
  - 自动修复
  - TypeScript支持
- Prettier 3.2.x
  - 代码格式化
  - 统一风格
  - 编辑器集成

## 8. 测试框架
- Vitest 1.2.x
  - 单元测试
  - 集成测试
  - 快照测试
  - 覆盖率报告
  - 模拟功能(Mock/Spy)
  - 异步测试支持
- Vue Test Utils 2.4.x
  - 组件测试
  - 行为模拟
  - 事件测试
  - 组合式函数测试
  - Props/Emit测试
  - 生命周期钩子测试
- Playwright 1.41.x
  - E2E测试
  - 跨浏览器测试
  - 视觉回归测试
  - 性能测试
  - 网络请求模拟
  - 并发测试支持

## 9. 构建和部署
- pnpm 8.15.x
  - 包管理
  - 依赖处理
  - 工作区管理
  - 快速安装
- GitHub Actions
  - CI/CD流程
  - 自动测试
  - 自动部署
  - 版本发布
- Vercel
  - 静态托管
  - 自动部署
  - CDN分发
  - 环境变量管理

## 10. 开发环境
- Node.js >= 16.20.0
- pnpm >= 8.15.0
- VS Code
  - Volar 1.8.x
  - ESLint
  - Prettier
  - Cursor
  - GitLens
  - Tailwind CSS IntelliSense

## 11. 浏览器支持
- Chrome >= 90
- Firefox >= 90
- Safari >= 14
- Edge >= 90
- 移动端浏览器
  - iOS Safari >= 14
  - Android Chrome >= 90

## 12. API集成
- LangChain集成
  - Gemini API
  - DeepSeek API
  - OpenAI API（计划中）
- 自定义API支持
  - 配置化集成
  - 错误处理
  - 重试机制
  - 流式响应
- WebSocket支持
  - 实时通信
  - 心跳检测
  - 自动重连

## 13. 错误处理系统
- 统一错误类型
  - APIError
  - ValidationError
  - ConfigError
  - StorageError
- 错误恢复机制
  - 自动重试
  - 降级处理
  - 错误边界
- 错误监控
  - 错误日志
  - 性能监控
  - 用户反馈
- 调试工具
  - Vue Devtools
  - Chrome DevTools
  - 网络分析 