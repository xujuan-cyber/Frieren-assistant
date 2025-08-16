# 开发经验记录

记录开发过程中的重要经验和最佳实践。

## 🔧 技术经验

### 架构设计
- **Docker代理方案选择** - 采用“Node Proxy + Nginx 本地转发”方案，完全移除 Nginx 动态解析与 DNS 依赖，同时保留任意 baseURL 能力 - [2025-01-13]
- **复用现有架构** - 最大化利用现有Vercel代理逻辑（/api/proxy 与 /api/stream），在 Docker 中以 Node 进程实现 - [2025-01-13]
- **零依赖实现** - Node.js代理服务只使用内置模块（http, stream），避免外部依赖和安全风险 - [2025-01-14]

### 错误处理
- **统一错误格式** - Node Proxy 将上游错误转换为一致的 JSON 错误结构，便于前端处理 - [2025-01-13]
- **超时策略差异化** - 流式请求5分钟超时，普通请求2分钟超时，支持环境变量配置 - [2025-01-14]
- **错误码语义化** - 超时返回504 Gateway Timeout，其他错误返回500 Internal Server Error - [2025-01-14]
- **HEAD请求规范处理** - HEAD请求只返回响应头，不处理响应体，符合HTTP规范 - [2025-01-14]
- **基础错误分类** - 超时返回504，格式错误400，其他错误500 - [2025-01-14]
- **简洁日志记录** - 记录时间戳、方法、URL、状态码、耗时等基础信息 - [2025-01-14]

### 性能优化
- **SSE透传** - Nginx 关闭缓冲（proxy_buffering off）并添加 `X-Accel-Buffering: no`，Node Proxy 使用 Readable.fromWeb() 透传 - [2025-01-13]
- **环境检测缓存** - 复用Vercel的localStorage + 内存缓存模式，避免重复检测 - [2025-01-14]
- **简洁日志实现** - 记录时间戳、方法、URL、状态码、耗时等基础信息 - [2025-01-14]

### UI设计
- **条件显示原则** - 代理功能本来就是额外功能，不可用时不显示即可，无需额外提示说明 - [2025-01-14]
- **视觉区分** - Docker代理使用蓝色主题，Vercel代理使用紫色主题，便于用户区分 - [2025-01-14]
- **数据持久化** - useDockerProxy配置正确保存到模型配置中，与useVercelProxy保持一致 - [2025-01-14]

### 测试实践
- **多环境测试** - 需要在Vercel、Desktop、Docker三种环境下都测试代理功能 - [2025-01-13]

## 🛠️ 工具配置

### 开发工具
- **Node Proxy** - 复用 Vercel 代理逻辑（api/proxy.js、api/stream.js 思路）实现 /api/proxy 与 /api/stream - [2025-01-13]

### 调试技巧
- **代理调试** - Nginx access_log（/api/* 专用） + Node Proxy 日志 + 浏览器网络面板联合定位 - [2025-01-13]

## 📚 学习资源

### 有用文档
- **现有Vercel代理实现** - api/proxy.js和api/stream.js - 完整的代理逻辑参考 - [2025-01-13]
- **nginx代理文档** - nginx官方proxy_pass文档 - 动态代理配置 - [2025-01-13]

### 代码示例
- **环境检测逻辑** - packages/core/src/utils/environment.ts - checkVercelApiAvailability函数 - [2025-01-13]
- **代理URL生成** - packages/core/src/utils/environment.ts - getProxyUrl函数 - [2025-01-13]

## 🚫 避坑指南

### 常见错误
- **SSRF攻击风险** - 必须验证目标URL，防止访问内网地址（当前简化处理，基于受信环境假设） - [2025-01-13]
- **CORS配置不完整** - 需要处理OPTIONS预检请求和所有必要的CORS头 - [2025-01-13]
- **CORS头重复设置** - nginx和Node.js同时设置CORS头会导致重复，应统一由Node.js处理 - [2025-01-14]
- **CSP阻断WebSocket** - 默认CSP不包含connect-src，需要添加ws: wss:支持 - [2025-01-14]

### 设计陷阱
- **与MCP代理冲突** - 新的API代理路径不能与现有的/mcp代理冲突 - [2025-01-13]
- **环境检测逻辑** - 需要确保Docker环境检测不影响现有的Vercel检测（已通过复用缓存模式解决） - [2025-01-13]
- **超时时间设置** - LLM流式请求可能需要很长时间，60秒超时太短，需要差异化处理 - [2025-01-14]

## 🔄 流程改进

### 工作流优化
- **渐进式实现** - 先实现基础代理功能，再添加安全增强 - [2025-01-13]
- **复用优先** - 优先复用现有代码和配置，减少重复工作 - [2025-01-13]

### 文档管理
- **同步更新** - 代码实现和文档需要同步更新，确保一致性 - [2025-01-13]

## 🎯 项目特定经验

### Docker部署相关
- **Nginx本地转发** - /api/* → 127.0.0.1:3001（Node Proxy），避免在nginx层进行DNS解析 - [2025-01-13]
- **环境变量处理** - Docker环境的运行时配置通过window.runtime_config提供 - [2025-01-13]

### 前端集成相关
- **模型配置UI** - 复用现有的useVercelProxy选项UI设计，保持用户体验一致 - [2025-01-13]
- **环境检测机制** - 扩展现有的checkVercelApiAvailability函数支持Docker检测 - [2025-01-13]

## ✅ 已解决问题

### 技术问题
- **技术方案选择** - 选择nginx本地转发 + Node.js代理方案，避免nginx复杂配置 - [2025-01-13]
- **CORS头重复设置** - 统一由Node Proxy处理，nginx不设置CORS - [2025-01-14]
- **CSP阻断WebSocket** - 添加connect-src支持ws: wss: - [2025-01-14]
- **超时策略优化** - 流式5分钟，普通2分钟，支持环境变量配置 - [2025-01-14]

### 集成问题
- **LLM服务Docker代理集成** - 在OpenAI和Gemini服务中添加Docker代理支持 - [2025-01-14]
- **TypeScript类型定义** - 在ModelConfig接口中添加useDockerProxy属性 - [2025-01-14]
- **前端UI集成** - ModelManager.vue成功集成Docker代理选项 - [2025-01-14]

### 功能验证
- **端到端测试** - 基础代理、错误处理、流式响应测试通过 - [2025-01-14]
- **构建验证** - Core和UI包构建成功，TypeScript检查通过 - [2025-01-14]
- **Docker API代理功能** - 简化方案完成，可在本地/受信环境使用 - [2025-01-14]

---

## 📝 使用说明

1. **及时记录** - 遇到重要经验立即记录
2. **分类整理** - 按照上述分类组织内容
3. **定期回顾** - 每周回顾一次，提取可复用经验
4. **整合整理** - 任务完成时将相关经验合并到本文件


## 🧷 合并后的简版任务记录（来自原 scratchpad 与 todo）

- 阶段1 基础代理功能：Nginx 本地转发到 Node Proxy；新增 /api/docker-status；Node Proxy 支持普通/流式、超时与 HEAD 处理；统一 JSON 错误与简洁日志
- 阶段2 流式与前端集成：关闭缓冲并添加 X-Accel-Buffering；UI 增加“使用 Docker 代理”选项；i18n 文案；配置保存/加载与构建验证
- 阶段3 错误与体验优化：基础错误分类（400/504/500）；LLM 服务对接 Docker 代理（OpenAI/Gemini）；端到端基础验证

## 🚀 快速使用与验证

- 前端：在模型配置中勾选“使用 Docker 代理”（仅在 Docker 环境检测通过时显示）
- 代理路径：/api/proxy 与 /api/stream → Nginx 本地转发 → Node Proxy(127.0.0.1:3001)
- 验证建议：
  - 普通请求：浏览器或 curl 访问 /api/proxy?targetUrl=https://httpbin.org/get
  - 流式请求：访问 /api/stream 并观察打字机/逐段输出（需目标 API 支持流式）

## 🔭 可选后续（保持简化，可不做）

- 将“连接失败/解析失败”归类为 502（当前为 500）
- 如需请求追踪：生成简单的 requestId 并写入日志
- 如需 Nginx JSON 错误：为 /api/* 增加 error_page 502/504 → JSON
