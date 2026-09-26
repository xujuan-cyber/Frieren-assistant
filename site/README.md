# Frieren assistant 官网

本目录是产品官网的独立静态站工程（Vite）。

它与产品应用、文档相互独立：

- 产品应用：仓库根项目（Web / 桌面 / 扩展）
- 文档：`mkdocs/`
- 官网：当前目录

## 目录职责

- 技术栈：独立 Vite 静态站
- 部署目标：独立 Vercel 项目
- Vercel Root Directory：`site/`
- 官网不复用根项目的业务代码、UI 组件和构建链路
- 官网保留自己的 `package.json`、`pnpm-lock.yaml`、`vercel.json`

## 本地运行

```bash
cd site
pnpm install
pnpm dev   # http://127.0.0.1:8011/
```

## 路由说明

- `/`：官网首页
- `/docs` 与 `/docs/:path*`：跳转到仓库 `mkdocs/` 文档

## 部署

- 独立 Vercel 项目，Root Directory：`site/`
- 绑定你自己的域名（在 Vercel Dashboard 配置）
