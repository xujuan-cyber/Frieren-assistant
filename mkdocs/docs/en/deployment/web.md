# Web Deployment

The Web version is a frontend page, not a model proxy layer.

Whether you use the official online site or deploy your own static site, model requests are sent directly from the browser to the model provider.

## How it relates to Docker and MCP

These options are easy to confuse:

| Method | What you get | Best for |
| --- | --- | --- |
| Web | A reachable frontend page | Online use, static hosting |
| Docker | Web page + `/mcp` service inside the container | Self-hosting and LAN deployments |
| Standalone MCP | MCP service only, without the Web page | MCP clients |

If you want Web and MCP together, start with [Docker Basics](docker-basic.md).

If you only care about MCP integration, see [MCP Server](../user/mcp-server.md).

## When the Web version is a good fit

Good fit:

- You mainly connect to public HTTPS model APIs
- You want to quickly publish a reachable frontend site
- You do not need to access local interfaces such as `http://localhost`

Not a good fit:

- You mainly connect to Ollama, LM Studio, or local gateways
- You need to access enterprise intranet APIs with strict CORS policies
- You expect frontend deployment to bypass browser restrictions

## Two simple ways to use it

### 1. Use the official online site

URL: <https://prompt.always200.com>

This is the easiest option, but browser restrictions still apply:

- Data is stored locally in the current browser by default
- Requests are sent directly to the model service you configure
- If the model service does not allow browser CORS access, the online site cannot bypass that restriction

### 2. Deploy your own static site

The repository root includes `vercel.json`, so it can be deployed to Vercel directly.

You can also deploy the build output to Cloudflare Pages or any other static hosting platform.

## Deploy to Vercel

Recommended flow:

1. Fork this repository
2. Import the repository into Vercel
3. Keep the repository root as the project root
4. Configure environment variables
5. Deploy

### Common environment variables

Text models:

```bash
VITE_OPENAI_API_KEY=...
VITE_GEMINI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...
VITE_DEEPSEEK_API_KEY=...
VITE_GROK_API_KEY=...
VITE_SILICONFLOW_API_KEY=...
VITE_ZHIPU_API_KEY=...
VITE_DASHSCOPE_API_KEY=...
VITE_OPENROUTER_API_KEY=...
VITE_MODELSCOPE_API_KEY=...
VITE_MINIMAX_API_KEY=...
```

Custom OpenAI-compatible API:

```bash
VITE_CUSTOM_API_KEY=...
VITE_CUSTOM_API_BASE_URL=https://your-api.example.com/v1
VITE_CUSTOM_API_MODEL=your-model-name
```

### Optional: site password protection

If you set this on Vercel:

```bash
ACCESS_PASSWORD=your_password
```

The site shows a password page first. This behavior is provided by the root `middleware.js` and `api/auth.js`.

## Deploy to Cloudflare Pages

The recommended flow is similar to the recommended Vercel flow: fork the project first, then import your fork into Cloudflare Pages. Later, when you sync upstream updates into your fork, Cloudflare Pages redeploys automatically.

1. Fork this repository
2. In the Cloudflare Dashboard, open **Workers & Pages**
3. Select **Create application** -> **Pages** -> **Connect to Git**
4. Choose your forked `prompt-optimizer` repository
5. Use the build settings below:

| Setting | Recommended value |
| --- | --- |
| Framework preset | `None` or empty |
| Root directory | `/` or empty |
| Build command | `pnpm -F @prompt-optimizer/core build && pnpm -F @prompt-optimizer/ui build && pnpm -F @prompt-optimizer/web build` |
| Build output directory | `packages/web/dist` |

Set these Cloudflare Pages environment variables:

```bash
NODE_VERSION=22
PNPM_VERSION=10.6.1
```

If you want to preconfigure model API keys, you can also add `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, and other `VITE_*` variables. You can also leave API keys out of the hosting platform and let users configure models in the application UI.

### Optional: Cloudflare Access and Web Analytics

Cloudflare Pages does not use Vercel's `ACCESS_PASSWORD`, `middleware.js`, or `/api/auth`. If you need restricted access, configure Cloudflare Access for your Pages domain in Cloudflare Zero Trust.

Cloudflare Web Analytics can be enabled from **Metrics** -> **Web Analytics** in the Pages project. Cloudflare injects the analytics snippet on later deployments, so no frontend dependency like `@vercel/analytics` is required.

!!! note
    The Web version currently uses hash routing. Cloudflare Web Analytics can track site visits and performance data, but it will not automatically treat `/#/xxx` hash route changes as separate page views.

## Deploy to other static hosting

Local build:

```bash
pnpm install
pnpm build
```

After the build completes, the Web frontend output is:

```text
packages/web/dist
```

Deploy this directory to Nginx, OSS, S3, Cloudflare Pages, or another static hosting platform.

!!! note
    If you are not using Vercel, static hosting does not automatically provide the `ACCESS_PASSWORD` password page or `/api/auth`. Those are part of the Vercel deployment path.

## Main limitation of the Web version

The problem is usually not whether the page can open. The problem is whether the browser can connect to your model service.

### CORS

If the model service does not return browser-compatible CORS headers, the Web version fails directly.

### Mixed Content

If your site is served over `https://...` but your model API is `http://localhost:...`, browsers usually block the request.

### Enterprise network policies

If a company network blocks unknown API domains, restricts self-signed certificates, or requires a proxy, the frontend site itself cannot solve that automatically.

## When to use another option

Choose another option for these needs:

- Connect to Ollama / LM Studio: use the [desktop app](desktop.md)
- Connect to LAN HTTP APIs: use the [desktop app](desktop.md)
- Provide Web and MCP together: use [Docker Basics](docker-basic.md)
- Provide MCP only: see [MCP Server](../user/mcp-server.md)

## Related pages

- [Desktop App](desktop.md)
- [Docker Basics](docker-basic.md)
- [MCP Server](../user/mcp-server.md)
