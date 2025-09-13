# Docker基础部署

本指南介绍如何使用Docker快速部署 Prompt Optimizer，包括单容器运行和基本环境配置。

## 🐳 Docker 单容器部署

### 快速开始

#### 最简运行

只需一条命令即可启动 Prompt Optimizer：

```bash
# 最简运行（默认配置）
docker run -d -p 8081:80 --restart unless-stopped --name prompt-optimizer linshen/prompt-optimizer

# 访问应用
open http://localhost:8081
```

#### 完整运行命令

带环境变量的完整运行配置：

```bash
docker run -d -p 8081:80 \
  -e VITE_OPENAI_API_KEY=your_openai_key \
  -e VITE_GEMINI_API_KEY=your_gemini_key \
  -e ACCESS_USERNAME=admin \
  -e ACCESS_PASSWORD=your_secure_password \
  --restart unless-stopped \
  --name prompt-optimizer \
  linshen/prompt-optimizer
```

### 镜像说明

#### 官方镜像

**Docker Hub**：`linshen/prompt-optimizer:latest`
- ✅ 稳定可靠，自动构建
- ✅ 支持多架构：amd64, arm64  
- ✅ 定期更新，跟随项目发布

**国内镜像**：`registry.cn-guangzhou.aliyuncs.com/prompt-optimizer/prompt-optimizer:latest`
- 🚀 国内用户访问更快
- 🔄 与Docker Hub镜像同步
- 💡 Docker Hub访问缓慢时推荐使用

#### 版本标签

```bash
# 使用最新版本
docker pull linshen/prompt-optimizer:latest

# 使用指定版本
docker pull linshen/prompt-optimizer:v1.2.0

# 使用开发版本（不推荐生产使用）
docker pull linshen/prompt-optimizer:dev
```

### 端口和网络配置

#### 端口映射选项

```bash
# 标准端口映射
-p 8081:80    # 将容器80端口映射到主机8081端口

# 自定义端口
-p 3000:80    # 映射到主机3000端口
-p 80:80      # 直接映射到主机80端口（需要管理员权限）
```

#### 网络模式

```bash
# 默认bridge网络
docker run -d -p 8081:80 linshen/prompt-optimizer

# 使用host网络（Linux）
docker run -d --network host linshen/prompt-optimizer

# 创建自定义网络
docker network create prompt-net
docker run -d --network prompt-net -p 8081:80 linshen/prompt-optimizer
```

## 🔧 环境变量配置

### API密钥配置

#### 主流AI服务商

```bash
# OpenAI
-e VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Google Gemini
-e VITE_GEMINI_API_KEY=your-gemini-api-key

# DeepSeek
-e VITE_DEEPSEEK_API_KEY=your-deepseek-key

# 智谱AI
-e VITE_ZHIPU_API_KEY=your-zhipu-key

# SiliconFlow
-e VITE_SILICONFLOW_API_KEY=your-siliconflow-key
```

#### 自定义模型配置

支持配置无限数量的自定义模型：

```bash
# Ollama本地模型
-e VITE_CUSTOM_API_KEY_ollama=dummy_key \
-e VITE_CUSTOM_API_BASE_URL_ollama=http://host.docker.internal:11434/v1 \
-e VITE_CUSTOM_API_MODEL_ollama=qwen2.5:7b \

# 其他OpenAI兼容API
-e VITE_CUSTOM_API_KEY_custom1=your-api-key \
-e VITE_CUSTOM_API_BASE_URL_custom1=https://api.example.com/v1 \
-e VITE_CUSTOM_API_MODEL_custom1=custom-model-name \
```

**配置规则**：
- 变量名格式：`VITE_CUSTOM_API_[TYPE]_[NAME]`
- `[TYPE]`：`KEY`、`BASE_URL`、`MODEL`
- `[NAME]`：自定义模型名称（只能包含字母、数字、下划线）

### 访问控制配置

#### 基础认证

```bash
# 启用密码保护
-e ACCESS_USERNAME=admin \
-e ACCESS_PASSWORD=your_secure_password \
```

配置后访问应用需要输入用户名和密码。

**安全建议**：
- 使用强密码（至少8位，包含字母、数字、特殊字符）
- 定期更换访问密码
- 不要在命令行历史中保留密码

#### 高级安全配置

```bash
# JWT密钥（可选，用于增强安全性）
-e JWT_SECRET=your-random-jwt-secret

# 会话超时设置（秒，默认3600秒/1小时）
-e SESSION_TIMEOUT=3600

# IP白名单（逗号分隔，支持CIDR格式）
-e ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```

### MCP服务器配置

Docker部署自动包含MCP（Model Context Protocol）服务器功能：

```bash
# MCP服务器配置
-e MCP_DEFAULT_MODEL_PROVIDER=openai \
-e MCP_LOG_LEVEL=info \

# MCP端点访问地址
# http://localhost:8081/mcp
```

**MCP功能**：
- 提供标准化的AI模型访问接口
- 支持多种模型提供商
- 内置日志记录和监控

## 📦 Docker Compose 基础配置

### 简单配置

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    # 或使用国内镜像
    # image: registry.cn-guangzhou.aliyuncs.com/prompt-optimizer/prompt-optimizer:latest
    
    container_name: prompt-optimizer
    restart: unless-stopped
    
    ports:
      - "8081:80"
    
    environment:
      # API密钥配置
      - VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
      - VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
      
      # 访问控制
      - ACCESS_USERNAME=${ACCESS_USERNAME:-admin}
      - ACCESS_PASSWORD=${ACCESS_PASSWORD}
      
      # MCP配置
      - MCP_DEFAULT_MODEL_PROVIDER=${MCP_PROVIDER:-openai}
      - MCP_LOG_LEVEL=${MCP_LOG_LEVEL:-info}
    
    # 健康检查
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 环境变量文件

创建 `.env` 文件（**重要：不要提交到版本控制**）：

```env
# API Keys
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-key

# Access Control
ACCESS_USERNAME=admin
ACCESS_PASSWORD=your_secure_password

# MCP Configuration
MCP_PROVIDER=openai
MCP_LOG_LEVEL=info

# Custom Models (example)
VITE_CUSTOM_API_KEY_ollama=dummy_key
VITE_CUSTOM_API_BASE_URL_ollama=http://host.docker.internal:11434/v1
VITE_CUSTOM_API_MODEL_ollama=qwen2.5:7b
```

### 基本操作命令

```bash
# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新镜像并重启
docker compose pull && docker compose up -d
```

## 🎯 部署验证

### 功能测试

#### 1. 基础访问测试

```bash
# 测试应用是否正常启动
curl -I http://localhost:8081

# 期望返回：HTTP/1.1 200 OK
```

#### 2. 健康检查测试

```bash
# 测试健康检查端点
curl http://localhost:8081/health

# 期望返回：{"status":"ok","timestamp":"..."}
```

#### 3. MCP服务测试

```bash
# 测试MCP端点
curl http://localhost:8081/mcp

# 期望返回MCP服务信息
```

### 常见部署问题

#### 端口被占用

```bash
# 检查端口占用
netstat -tulpn | grep :8081

# 解决方案：更换端口或停止占用进程
docker run -d -p 3000:80 linshen/prompt-optimizer
```

#### 镜像拉取失败

```bash
# 使用国内镜像源
docker pull registry.cn-guangzhou.aliyuncs.com/prompt-optimizer/prompt-optimizer:latest

# 或配置Docker镜像加速器
```

#### 容器无法启动

```bash
# 查看详细错误日志
docker logs prompt-optimizer

# 检查环境变量配置
docker exec prompt-optimizer env | grep VITE_
```

## 💡 部署建议

### 生产环境建议

1. **资源配置**
   - 最低要求：1GB RAM，1 CPU核心
   - 推荐配置：2GB RAM，2 CPU核心
   - 存储空间：至少500MB可用空间

2. **安全配置**
   - 始终启用访问密码保护
   - 使用HTTPS（参见高级配置）
   - 定期更新镜像版本

3. **监控配置**
   - 启用健康检查
   - 配置日志轮转
   - 监控资源使用情况

### 开发环境建议

1. **快速启动**
   ```bash
   docker run -d -p 8081:80 --name prompt-optimizer-dev linshen/prompt-optimizer
   ```

2. **开发模式**
   ```bash
   docker run -d -p 8081:80 \
     -e NODE_ENV=development \
     -e DEBUG=true \
     --name prompt-optimizer-dev \
     linshen/prompt-optimizer
   ```

---

**相关链接**：
- [高级配置](docker-advanced.md) - Docker Compose高级配置和安全设置
- [故障排除](docker-troubleshooting.md) - 常见问题解决和性能优化