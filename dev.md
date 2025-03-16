# 开发指南 (Development Guide)

## 目录

- [本地开发环境配置](#本地开发环境配置)
- [Docker开发和部署](#docker开发和部署)
- [环境变量配置](#环境变量配置)
- [开发工作流程](#开发工作流程)
- [项目构建和部署](#项目构建和部署)
- [常见问题解决](#常见问题解决)

## 本地开发环境配置

### 基础环境要求
- Node.js >= 18
- pnpm >= 8
- Git >= 2.0
- VSCode (推荐)

### 开发环境设置
```bash
# 1. 克隆项目
git clone https://github.com/linshenkx/prompt-optimizer.git
cd prompt-optimizer

# 2. 安装依赖
pnpm install

# 3. 启动开发服务
pnpm dev               # 主开发命令：构建core/ui并运行web应用
pnpm dev:web          # 仅运行web应用
pnpm dev:fresh        # 完整重置并重新启动开发环境
```

## Docker开发和部署

### 环境要求
- Docker >= 20.10.0

### Docker构建和运行

#### 基础构建
```bash
# 获取package.json中的版本号
$VERSION=$(node -p "require('./package.json').version")

# 构建镜像（使用动态版本号）
docker build -t linshen/prompt-optimizer:$VERSION .

# 添加latest标签
docker tag linshen/prompt-optimizer:$VERSION linshen/prompt-optimizer:latest

# 运行容器
docker run -d -p 80:80 --restart unless-stopped --name prompt-optimizer linshen/prompt-optimizer:$VERSION


# 推送
docker push linshen/prompt-optimizer:$VERSION
docker push linshen/prompt-optimizer:latest

```

docker本地构建测试
```shell
docker build -t linshen/prompt-optimizer:test .
docker rm -f prompt-optimizer
docker run -d -p 80:80 --restart unless-stopped --name prompt-optimizer -e VITE_GEMINI_API_KEY=111 linshen/prompt-optimizer:test

```


### 多阶段构建说明

Dockerfile使用了多阶段构建优化镜像大小：

1. `base`: 基础Node.js环境，安装pnpm
2. `builder`: 构建阶段，安装依赖并构建项目
3. `production`: 最终镜像，只包含构建产物和nginx

## 环境变量配置

### 本地开发环境变量
在项目根目录创建 `.env.local` 文件：

```env
# OpenAI API配置
VITE_OPENAI_API_KEY=your_openai_api_key

# Gemini API配置
VITE_GEMINI_API_KEY=your_gemini_api_key

# DeepSeek API配置
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key

# 自定义API配置
VITE_CUSTOM_API_KEY=your_custom_api_key
VITE_CUSTOM_API_BASE_URL=your_custom_api_base_url
VITE_CUSTOM_API_MODEL=your_custom_model_name
```

### Docker环境变量
通过 `-e` 参数设置容器环境变量：

```bash
docker run -d -p 80:80 \
  -e VITE_OPENAI_API_KEY=your_key \
  -e VITE_CUSTOM_API_BASE_URL=your_api_url \
  prompt-optimizer
```

## 开发工作流程

### 代码提交规范
```bash
# 提交格式
<type>(<scope>): <subject>

# 示例
feat(ui): 添加新的提示词编辑器组件
fix(core): 修复API调用超时问题
```

### 测试流程
```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm test:core
pnpm test:ui
pnpm test:web
```

## 项目构建和部署

### 本地构建
```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm build:core
pnpm build:ui
pnpm build:web
pnpm build:ext
```

### 常用Docker命令

```bash
# 查看容器日志
docker logs -f prompt-optimizer

# 进入容器
docker exec -it prompt-optimizer sh

# 容器管理
docker stop prompt-optimizer
docker start prompt-optimizer
docker restart prompt-optimizer

# 清理资源
docker rm prompt-optimizer
docker rmi prompt-optimizer
```

## 常见问题解决

### 依赖安装问题
```bash
# 清理依赖缓存
pnpm clean

# 重新安装依赖
pnpm install --force
```

### 开发环境问题
```bash
# 完全重置开发环境
pnpm dev:fresh

# 清理构建缓存
pnpm clean
rm -rf node_modules
pnpm install
```

### 构建失败处理
1. 检查Node.js版本是否符合要求
2. 清理构建缓存：`pnpm clean`
3. 重新安装依赖：`pnpm install`
4. 查看详细构建日志：`pnpm build --debug`

### 容器运行问题
1. 检查端口占用：`netstat -ano | findstr :80`
2. 检查容器日志：`docker logs prompt-optimizer`
3. 检查容器状态：`docker ps -a`
