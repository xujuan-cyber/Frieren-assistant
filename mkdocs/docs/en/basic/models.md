# Model Management

This page answers the most practical first-time question:

what do you need to configure first so Prompt Optimizer can actually run?

If you are still going through first-time setup, read this together with [Quick Start](../user/quick-start.md).

The entry point is the **Model Management** button in the top-right corner.

!!! note
    For your first run, do not configure too many providers at once. One working text model is more useful than a long unfinished provider list.

## First-time users: only do these 3 steps

1. Add **one text model**
2. Run one **optimize / test / evaluate** flow in a text workspace
3. Only then decide whether you need a second text model or an image model

Most first-time users do not need a large model list.

## Minimum working setup

| Your goal | Minimum setup |
| --- | --- |
| Start using text workspaces | 1 text model |
| Compare results | 2 text models |
| Use image workspaces | 1 text model + 1 image model |

## This is enough to understand at first

### Text model vs image model

- **Text models** handle left-side analysis, optimization, iteration, and text-side testing/evaluation
- **Image models** only handle actual image generation on the right side

### Left-side model vs right-side model

In text workspaces:

- **left-side model**: analyzes and improves prompts
- **right-side model**: executes prompts and produces evidence

They can be the same model, but they do not have to be.

## How to configure models for the first run

### Case A: you just want the app to work

Configure one text model.

That one model is enough to start:

- left-side analysis / optimization
- right-side testing
- right-side Result Evaluation
- right-side Compare Evaluation

### Case B: you want real result comparison

Configure two text models:

- one main model
- one comparison model

This makes it easier to tell whether the difference comes from the prompt or from the model.

### Case C: you want image workspaces

Configure at least:

- one text model
- one image model

Because:

- the left side still uses a text model to improve image prompts
- the right side uses an image model to generate the actual image

## Recommended setup order

### Step 1: add one text model

Choose the provider you know best and can connect with the least friction.

### Step 2: make sure connection testing succeeds

After you add the model, run **Test Connection**.

### Step 3: run one text workspace

The simplest starting points are:

- [User Prompt Workspace](user-optimization.md)
- [System Prompt Workspace](system-optimization.md)

If you can complete:

- left-side optimization
- right-side testing
- one evaluation

then your minimum setup is already good enough.

### Step 4: add more models only when needed

Add a second text model only if you want comparison. Add an image model only if you are entering image workspaces.

## Three common connection patterns

### 1. Public model platforms

Examples:

- OpenAI
- Gemini
- DeepSeek
- SiliconFlow

In most cases you only need:

1. choose the provider
2. paste the API key
3. select the model
4. run connection testing

### 2. Ollama

If you run Ollama locally, use the built-in `Ollama` provider.

Typical behavior:

- default endpoint: `http://localhost:11434/v1`
- API key often not required
- model list can refresh from your installed local models

### 3. Custom

If your service is OpenAI-compatible, use `Custom`.

Typical cases:

- LM Studio
- internal company gateway
- self-hosted OpenAI-compatible service
- any service that needs a custom base URL

Example:

```text
Provider: Custom
Base URL: https://your-api.example.com/v1
Model: your-model-name
API Key: fill based on your service
```

## If connection fails, then check deployment and environment

### Web / hosted version

The browser sends requests directly to your model service, so you may hit:

- CORS
- mixed content when HTTPS pages call local HTTP endpoints

### Desktop app

Usually better for:

- Ollama
- LM Studio
- local network services
- internal APIs
- custom gateways with browser restrictions

### Docker

Docker packages the web UI and MCP together, but the page still runs in the browser, so browser restrictions still matter.

Related pages:

- [Web Deployment](../deployment/web.md)
- [Desktop App](../deployment/desktop.md)
- [Docker Basics](../deployment/docker-basic.md)

## Supported text providers

The current codebase currently includes:

- OpenAI
- Gemini
- Anthropic
- DeepSeek
- SiliconFlow
- Zhipu AI
- DashScope
- OpenRouter
- ModelScope
- MiniMax
- Ollama
- Custom (OpenAI-compatible endpoints)

## What the model manager can do

In addition to add / edit / delete, the text-side manager supports:

- connection testing
- cloning configs
- refreshing model lists
- advanced parameters
- provider-specific API-key links for some providers

The image-side manager supports:

- add / edit / clone / delete
- enable / disable
- connection testing
- preview test image
- provider / model / capability tags

## How to tell whether setup is already good enough

You can stop tuning model setup for now if all three are true:

1. at least one text model passes connection testing
2. you can produce one real result in a text workspace
3. you can run one evaluation on that result

## Where configuration is stored

- web / hosted version: current browser storage
- desktop app: local application data
- extension: extension-local storage

If you need backup or migration, use [Data Management](data.md).

## Common questions

### Connection test passes, but real runs still fail

Common reasons:

- quota or billing limits
- wrong model name
- browser-side CORS / mixed-content blocking
- left-side model and right-side model are not what you thought they were

### Do I need many models on day one?

No. In most cases:

- one text model is enough for text workspaces
- add a second text model only for comparison
- add image models only for image workspaces

### I configured a model, but the app still won’t run

Check these first:

1. did connection testing actually succeed?
2. is this a text model when the page expects text?
3. are you in a browser trying to call a local HTTP endpoint?
4. does this workspace also need an image model or additional inputs?

## Related pages

- [Quick Start](../user/quick-start.md)
- [Model Testing Strategy](../user/model-testing-strategy.md)
- [Connection Issues](../help/connection-issues.md)
- [Desktop App](../deployment/desktop.md)
- [Docker Basics](../deployment/docker-basic.md)
