## Cloudflare Pages 部署说明

Cloudflare Pages 适合部署 Prompt Optimizer 的 **Web 前端**。它提供静态站点托管和 Git 自动部署；站点访问控制、访问分析等能力由 Cloudflare 控制台配置。

### 推荐方式：Fork 后导入 Cloudflare Pages

这种方式和推荐的 Vercel 部署方式一样：部署绑定到你自己的 fork，后续同步上游更新后会自动重新部署。

1. **Fork 项目到自己的 GitHub**
   - 访问 [prompt-optimizer 项目](https://github.com/linshenkx/prompt-optimizer)
   - 点击右上角的 "Fork"
   - 完成后，你会在自己的 GitHub 账号下拥有一份仓库副本

2. **在 Cloudflare Pages 中导入仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 **Workers & Pages**
   - 选择 **Create application** -> **Pages** -> **Connect to Git**
   - 选择你 fork 后的 `prompt-optimizer` 仓库

3. **配置构建参数**

   建议保持仓库根目录作为项目根目录，不要把根目录改成 `packages/web`。

   | 配置项 | 推荐值 |
   | --- | --- |
   | Framework preset | `None` 或留空 |
   | Root directory | `/` 或留空 |
   | Build command | `pnpm -F @prompt-optimizer/core build && pnpm -F @prompt-optimizer/ui build && pnpm -F @prompt-optimizer/web build` |
   | Build output directory | `packages/web/dist` |

4. **配置环境变量**

   在 Cloudflare Pages 项目的 **Settings** -> **Environment variables** 中添加：

   ```bash
   NODE_VERSION=22
   PNPM_VERSION=10.6.1
   ```

   如果你希望预置模型 API Key，也可以添加常用的 `VITE_*` 环境变量：

   ```bash
   VITE_OPENAI_API_KEY=...
   VITE_GEMINI_API_KEY=...
   VITE_DEEPSEEK_API_KEY=...
   VITE_GROK_API_KEY=...
   VITE_SILICONFLOW_API_KEY=...
   VITE_ZHIPU_API_KEY=...
   ```

   也可以不在部署平台配置 API Key，让用户在应用界面的模型管理中自行填写。这样更适合公开站点。

5. **部署**
   - 保存配置并开始部署
   - 部署成功后，Cloudflare Pages 会提供一个 `*.pages.dev` 域名
   - 后续你的 fork 有新 commit 时，Cloudflare Pages 会自动重新构建并部署

6. **同步上游更新**
   - 在 GitHub 打开你 fork 的仓库
   - 当页面提示落后于 `linshenkx/prompt-optimizer` 时，点击 **Sync fork**
   - 同步产生新 commit 后，Cloudflare Pages 会自动重新部署

### 可选：访问控制

Cloudflare Pages 部署不使用 Vercel 的 `ACCESS_PASSWORD`、`middleware.js` 或 `api/auth.js`。如果你想限制访问，推荐使用 **Cloudflare Access**：

1. 进入 Cloudflare Zero Trust
2. 创建一个 Self-hosted application
3. 绑定你的 Pages 域名
4. 配置允许访问的邮箱、域名、身份提供商或其他策略

这样访问请求会先经过 Cloudflare Access，再进入静态站点，不需要修改前端代码。

### 可选：访问分析

Cloudflare Pages 可以在项目的 **Metrics** -> **Web Analytics** 中启用 Web Analytics。Cloudflare 会在后续部署中自动注入统计脚本，不需要安装类似 `@vercel/analytics` 的前端依赖。

需要注意：Prompt Optimizer 当前使用 hash 路由，因此 Cloudflare Web Analytics 可以统计站点访问和性能数据，但不会自动把 `/#/xxx` 这类 hash 内页面切换当作独立页面浏览。

### 和 Vercel 部署的区别

| 能力 | Vercel | Cloudflare Pages |
| --- | --- | --- |
| Web 前端部署 | 支持 | 支持 |
| Fork 后自动部署 | 支持 | 支持 |
| 自动同步上游更新 | 不支持，需要用户同步 fork | 不支持，需要用户同步 fork |
| 站点访问控制 | `ACCESS_PASSWORD` 密码页 | 推荐 Cloudflare Access |
| Vercel Analytics | 支持 | 不适用，推荐 Cloudflare Web Analytics |

### 常见问题

#### 修改环境变量后没有生效

Cloudflare Pages 的构建环境变量需要重新部署后才会进入前端构建产物。保存环境变量后，请在 **Deployments** 中重新部署一次。

#### 为什么没有一键部署按钮

Cloudflare 官方的 "Deploy to Cloudflare" 按钮主要面向 Workers 应用，不适合当前这种 Cloudflare Pages Git 集成部署。为了后续更新更可靠，推荐 Fork 后导入 Cloudflare Pages。

#### 连接模型 API 失败怎么办

Cloudflare Pages 部署的是纯前端页面，浏览器仍然会直接请求模型服务。如果模型服务不允许浏览器跨域访问，Web 版会失败。此时建议使用桌面版，或配置你自己的 API 中转服务。
