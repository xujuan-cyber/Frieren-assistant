## Cloudflare Pages Deployment Guide

Cloudflare Pages is suitable for deploying the Prompt Optimizer **Web frontend**. It provides static hosting and Git-triggered deployments; access control and analytics are configured from the Cloudflare dashboard.

### Recommended method: Fork and import into Cloudflare Pages

This follows the same maintenance model as the recommended Vercel deployment: the deployment is connected to your own fork, and Cloudflare Pages redeploys after you sync upstream changes into that fork.

1. **Fork the project to your GitHub account**
   - Visit the [prompt-optimizer repository](https://github.com/linshenkx/prompt-optimizer)
   - Click "Fork" in the top right corner
   - After forking, you will have a copy of the repository under your own GitHub account

2. **Import the repository into Cloudflare Pages**
   - Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Open **Workers & Pages**
   - Select **Create application** -> **Pages** -> **Connect to Git**
   - Choose your forked `prompt-optimizer` repository

3. **Configure build settings**

   Keep the repository root as the project root. Do not change the root directory to `packages/web`.

   | Setting | Recommended value |
   | --- | --- |
   | Framework preset | `None` or empty |
   | Root directory | `/` or empty |
   | Build command | `pnpm -F @prompt-optimizer/core build && pnpm -F @prompt-optimizer/ui build && pnpm -F @prompt-optimizer/web build` |
   | Build output directory | `packages/web/dist` |

4. **Configure environment variables**

   In the Cloudflare Pages project, go to **Settings** -> **Environment variables** and add:

   ```bash
   NODE_VERSION=22
   PNPM_VERSION=10.6.1
   ```

   If you want to preconfigure model API keys, you can also add common `VITE_*` variables:

   ```bash
   VITE_OPENAI_API_KEY=...
   VITE_GEMINI_API_KEY=...
   VITE_DEEPSEEK_API_KEY=...
   VITE_GROK_API_KEY=...
   VITE_SILICONFLOW_API_KEY=...
   VITE_ZHIPU_API_KEY=...
   ```

   You can also leave API keys out of the hosting platform and let users configure models in the application UI. This is usually better for public deployments.

5. **Deploy**
   - Save the settings and start the deployment
   - After deployment succeeds, Cloudflare Pages provides a `*.pages.dev` domain
   - Later, whenever your fork receives new commits, Cloudflare Pages rebuilds and redeploys automatically

6. **Sync upstream updates**
   - Open your forked repository on GitHub
   - When GitHub shows that it is behind `linshenkx/prompt-optimizer`, click **Sync fork**
   - Once the sync creates new commits in your fork, Cloudflare Pages redeploys automatically

### Optional: access control

Cloudflare Pages deployment does not use Vercel's `ACCESS_PASSWORD`, `middleware.js`, or `api/auth.js`. If you want restricted access, use **Cloudflare Access**:

1. Open Cloudflare Zero Trust
2. Create a Self-hosted application
3. Bind it to your Pages domain
4. Configure allowed emails, domains, identity providers, or other access policies

Requests will pass through Cloudflare Access before reaching the static site, without frontend code changes.

### Optional: analytics

Cloudflare Pages can enable Web Analytics from **Metrics** -> **Web Analytics** in the Pages project. Cloudflare injects the analytics snippet on later deployments, so you do not need a frontend dependency like `@vercel/analytics`.

Note that Prompt Optimizer currently uses hash routing. Cloudflare Web Analytics can track overall site visits and performance, but it will not automatically treat `/#/xxx` hash route changes as separate page views.

### Differences from Vercel deployment

| Capability | Vercel | Cloudflare Pages |
| --- | --- | --- |
| Web frontend deployment | Supported | Supported |
| Auto deploy after fork commits | Supported | Supported |
| Automatic upstream sync | Not supported; users sync their fork | Not supported; users sync their fork |
| Site access control | `ACCESS_PASSWORD` password page | Use Cloudflare Access |
| Vercel Analytics | Supported | Not applicable; use Cloudflare Web Analytics |

### FAQ

#### Environment variable changes did not take effect

Cloudflare Pages build environment variables are included in the frontend build output only after a new deployment. After saving variables, redeploy from **Deployments**.

#### Why is there no one-click deploy button?

Cloudflare's official "Deploy to Cloudflare" button is mainly for Workers applications, not this Cloudflare Pages Git integration flow. For reliable future updates, fork the repository and import the fork into Cloudflare Pages.

#### What if model API connections fail?

Cloudflare Pages deploys a pure frontend page. The browser still calls model services directly. If a model provider does not allow browser CORS requests, the Web version will fail. Use the desktop app or configure your own API relay service in that case.
