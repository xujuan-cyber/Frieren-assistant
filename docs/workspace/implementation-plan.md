# Docker API代理功能实施计划

## 📋 实施概览

### 项目信息
- **项目名称**：Docker API代理功能实现（简化版）
- **预计工期**：2-3个工作日（约15小时）
- **优先级**：高
- **复杂度**：低-中等（简化后）

### 实施原则
1. **最小化风险**：在现有配置基础上扩展，不破坏现有功能
2. **渐进式开发**：分阶段实施，每个阶段都可独立验证
3. **简化优先**：默认不启用复杂安全防护（本地/受信环境假设）
4. **测试驱动**：每个功能都要经过充分测试

## 🗓️ 详细实施计划

### 阶段1：基础代理功能实现（第1天）

#### 1.1 nginx配置扩展 [1.5小时] ✅ 简化
**目标**：在现有nginx配置中添加基础代理功能（本地转发到 Node Proxy）

**具体任务**：
- [ ] 备份现有 `docker/nginx.conf` 文件
- [ ] 添加 `/api/proxy` 与 `/api/stream` location块（上游为 http://127.0.0.1:3001）
- [ ] 添加 `/api/docker-status` location块（含版本信息）
- [ ] 配置最简 CORS 头（本地/受信环境：Allow-Origin:*、Methods、Headers）


**输出文件**：
- `docker/nginx.conf`（更新）

**验证标准**：
- `nginx -t` 通过，容器正常启动
- `/api/docker-status` 可访问
- `/api/proxy` 与 `/api/stream` 经过 127.0.0.1:3001 转发可用（HTTP/HTTPS 目标均可）
- 不依赖 DNS/resolver，域名解析由系统/容器负责

#### 1.2 Node Proxy进程 + 环境检测 [2小时]
**目标**：创建Node.js代理服务并添加前端检测逻辑

**具体任务**：
- [ ] 创建简单的Node.js代理服务（监听3001端口）
- [ ] 在supervisord.conf中添加node-proxy进程
- [ ] 在前端添加简化的`checkDockerApiAvailability`函数
- [ ] 基础功能测试

**验证标准**：
- Node.js代理服务正常运行
- 前端能检测到Docker环境
- 基础代理请求能成功

### 阶段2：流式代理和UI集成（第2天）

#### 2.1 流式代理实现 [1.5小时]
**目标**：添加流式API代理支持（Nginx → Node Proxy）

**具体任务**：
- [ ] 确认 `/api/stream` 已转发到 http://127.0.0.1:3001
- [ ] 在 Nginx 关闭 `proxy_buffering`、`proxy_request_buffering` 并添加 `X-Accel-Buffering: no`
- [ ] Node Proxy 实现对 SSE 的透传
- [ ] 测试 OpenAI/DeepSeek 等流式响应

**输出文件**：
- `docker/nginx.conf`（更新）
- Node Proxy 服务代码

**验证标准**：
- 流式API请求能正常代理
- 首字节延迟可接受，流式输出连续
- 不会出现缓冲延迟

#### 2.2 前端UI集成 [2小时]
**目标**：在模型配置中添加Docker代理选项（保持与Vercel一致）

**具体任务**：
- [ ] 分析现有模型配置UI组件
- [ ] 添加 `useDockerProxy` 配置选项
- [ ] 更新模型配置界面
- [ ] 实现代理选项的保存和加载
- [ ] 添加用户提示：Docker 代理由 Node Proxy 实现，支持任意 baseURL

**输出文件**：
- 相关UI组件文件（具体路径待确定）
- 类型定义文件

**验证标准**：
- Docker代理选项在UI中正确显示
- 选项状态能正确保存和恢复
- UI与现有Vercel代理选项保持一致

### 阶段3：错误处理与体验优化（第3天）

#### 3.1 错误处理与日志 [1.5小时]
**目标**：统一错误 JSON 返回、完善日志，便于排查

**具体任务**：
- [ ] Node Proxy：将上游错误转换为 `{ error: string }`
- [ ] Node Proxy：添加简洁请求日志（方法、URL、状态码、耗时）
- [ ] （可选）Nginx：为 `/api/*` 开启独立 access_log

**输出文件**：
- Node Proxy 错误与日志处理代码
- （可选）`docker/nginx.conf`（更新）

**验证标准**：
- 常见错误能返回清晰、统一的 JSON
- 日志信息可用于快速定位问题

#### 3.2 错误处理优化 [1小时]
**目标**：完善错误处理和用户提示

**具体任务**：
- [ ] 优化nginx错误响应格式（可选，当前未实施）
- [ ] 添加前端错误处理逻辑
- [ ] 实现用户友好的错误提示
- [ ] 添加调试信息（开发环境）

**输出文件**：
- `docker/nginx.conf`（更新）
- 前端错误处理相关文件

**验证标准**：
- 各种错误情况都有合适的提示
- 错误信息对用户友好
- 开发环境有足够的调试信息

### 阶段4：全面测试和文档（第4天）

#### 4.1 功能测试 [2.5小时]
**目标**：全面测试所有代理功能

**具体任务**：
- [ ] 测试各种LLM API的代理（OpenAI、Gemini、DeepSeek等）
- [ ] 测试不同类型的请求（GET、POST、OPTIONS）
- [ ] 测试流式和非流式响应
- [ ] 测试错误情况处理
- [ ] 验证错误 JSON、日志与流式体验
- [ ] 性能测试和压力测试

**输出文件**：
- 测试报告文档

**验证标准**：
- 所有主要LLM API都能正常代理
- 各种请求类型都能正确处理
- 代理与流式体验满足预期
- 性能满足预期要求

### 附录A：Supervisor 新增进程配置示例

```ini
[program:node-proxy]
command=node dist/server.js --port=3001
directory=/app/node-proxy
autostart=true
autorestart=false
startretries=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
priority=150
environment=NODE_ENV=production
```

### 附录B：Dockerfile 变更建议（片段）

```dockerfile
# 将 node-proxy 源码加入镜像
COPY node-proxy /app/node-proxy

# 若使用 TS：在此构建产物
# WORKDIR /app/node-proxy
# RUN pnpm i --frozen-lockfile && pnpm build

# 最终由 supervisor 启动 node-proxy
```

> 说明：根据你的 monorepo/镜像结构调整 COPY 路径和构建步骤。若直接用 JS，无需构建。

- 所有主要LLM API都能正常代理
- 各种请求类型都能正确处理
- 代理与流式体验满足预期
- 性能满足预期要求

#### 4.2 文档更新 [2小时]
**目标**：更新相关文档

**具体任务**：
- [ ] 更新Docker部署文档
- [ ] 添加代理功能使用说明
- [ ] 更新配置示例
- [ ] 添加故障排除指南
- [ ] 更新API文档

**输出文件**：
- `docs/deployment/docker-mcp-integration.md`（更新）
- `docs/user/deployment/`相关文档（更新）
- 新的代理功能使用指南

**验证标准**：
- 文档内容准确完整
- 用户能根据文档正确配置和使用
- 包含必要的示例和注意事项

## 🔧 技术实施细节

### 文件修改清单

#### 核心配置文件
1. **docker/nginx.conf**
   - 添加 `/api/proxy` location块
   - 添加 `/api/stream` location块
   - 添加 `/api/docker-status` location块
   - 配置本地转发与流式必需参数

2. **packages/core/src/utils/environment.ts**
   - 添加 `checkDockerApiAvailability` 函数
   - 扩展 `getProxyUrl` 函数
   - 添加Docker环境检测逻辑

#### UI相关文件
3. **模型配置组件**（具体路径待确定）
   - 添加Docker代理选项
   - 更新配置保存逻辑

4. **类型定义文件**
   - 扩展ModelConfig接口
   - 添加相关类型定义

#### 文档文件
5. **docs/deployment/docker-mcp-integration.md**
   - 添加代理功能说明
   - 更新配置示例

### 依赖关系
- nginx配置 → Docker环境检测 → UI集成 → 安全增强 → 测试验证

### 风险控制措施
1. **配置备份**：修改前备份所有配置文件
2. **分阶段验证**：每个阶段完成后立即验证
3. **回滚方案**：准备快速回滚到上一个稳定版本的方案
4. **测试环境**：在测试环境中充分验证后再部署到生产环境

## 📊 进度跟踪

### 里程碑检查点
- [ ] **M1**：基础代理功能可用（第1天结束）
- [ ] **M2**：流式代理和UI集成完成（第2天结束）
- [ ] **M3**：错误处理与体验优化完成（第3天结束）
- [ ] **M4**：全面测试通过，文档更新完成（第4天结束）

### 质量标准
- 所有新增功能都有对应的测试
- 代码符合项目的编码规范
- 文档内容准确且易于理解
- 错误处理与日志可用

### 交付物清单
- [ ] 更新的Docker配置文件
- [ ] 扩展的前端环境检测逻辑
- [ ] 新增的UI代理选项
- [ ] Node Proxy 运行与 Nginx 转发配置
- [ ] 全面的测试报告
- [ ] 更新的用户文档

---

## 📝 备注

### 注意事项
1. 在修改nginx配置时，要确保语法正确，避免容器启动失败
2. 前端代码修改要保持与现有架构的兼容性
3. 安全配置要在功能实现的同时就考虑，不要留到最后
4. 测试要覆盖各种边界情况和异常情况

### 后续优化方向
1. 代理性能监控和优化
2. 更细粒度的安全控制
3. 代理缓存策略优化
4. 支持更多的代理功能（如请求重试、负载均衡等）
