# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Optimizer is a powerful AI prompt optimization tool that helps write better AI prompts and improve AI output quality. It's built as a monorepo with multiple packages supporting Web, Desktop, Chrome Extension, and Docker deployment.

## Development Commands

### Essential Commands

你应该使用 pmpm dev:fresh 清理缓存并重启服务以获得服务的访问地址，并确保最新最可靠的界面体验

```bash
# Development
pnpm dev:fresh         # Clean install and restart development 
pnpm dev:desktop       # Build core/ui, run web and desktop
pnpm dev:desktop:fresh # Clean install and restart desktop development

# Building
pnpm build            # Build all packages (core → ui → web/ext/desktop in parallel)
pnpm build:core       # Build core package only
pnpm build:ui         # Build UI components package only
pnpm build:web        # Build web application only
pnpm build:desktop    # Build desktop application with packaging

# Testing
pnpm test            # Run all tests across packages
pnpm -F @prompt-optimizer/core test    # Run core package tests
pnpm -F @prompt-optimizer/ui test      # Run UI package tests

# Maintenance  
pnpm clean           # Clean dist and vite cache
pnpm version:sync    # Sync versions across all packages
```

### Package-Specific Commands

Use `pnpm -F <package-name>` to run commands in specific packages:
- `@prompt-optimizer/core` - Core functionality
- `@prompt-optimizer/ui` - UI components  
- `@prompt-optimizer/web` - Web application
- `@prompt-optimizer/extension` - Chrome extension
- `@prompt-optimizer/desktop` - Desktop application
- `@prompt-optimizer/mcp-server` - MCP server

## Architecture Overview

### Monorepo Structure

The project follows a strict dependency hierarchy:
```
packages/core (foundation)
    ↓
packages/ui (components, depends on core)
    ↓
packages/web|extension|desktop (applications, depend on ui + core)
```

### Build Order

Due to internal dependencies, builds must follow this sequence:
1. `core` - Core services, types, and business logic
2. `ui` - Vue components and composables  
3. `web/extension/desktop` - Final applications (can build in parallel)

### Key Packages

- **`packages/core`**: Contains all business logic, LLM services, model management, template processing, storage services
- **`packages/ui`**: Vue 3 + TypeScript components, composables, internationalization, theme system
- **`packages/web`**: Vite-based web application entry point
- **`packages/desktop`**: Electron desktop application with IPC proxying
- **`packages/extension`**: Chrome extension with popup interface

## Technical Stack

- **Frontend**: Vue 3 + TypeScript + Composition API
- **Build**: Vite + pnpm workspaces
- **Styling**: TailwindCSS + PostCSS
- **Testing**: Vitest + Playwright (for MCP testing)
- **Desktop**: Electron with auto-updater
- **Internationalization**: Vue-i18n
- **State Management**: Reactive composables (no Pinia/Vuex)

## Core Service Architecture

### Services Layer (`packages/core/src/services/`)

All services follow a consistent pattern with types, errors, and proxy layers:

- **`llm/`** - LLM API integration (OpenAI, Gemini, DeepSeek, etc.)
- **`model/`** - Model configuration management with advanced parameters
- **`prompt/`** - Prompt optimization and custom conversation testing
- **`template/`** - Template management with CSP-safe processing
- **`history/`** - Optimization history tracking
- **`storage/`** - Multi-adapter storage (localStorage, IndexedDB, file system)
- **`preference/`** - User preferences with cross-platform sync

### Electron Architecture

Desktop app uses **proxy pattern** for service communication:
- Main process hosts all core services
- Renderer process uses `*-electron-proxy.ts` files
- IPC serialization handles complex object passing
- All business logic remains in shared core services

## Development Guidelines

### Working with Services

1. **Core services** should be platform-agnostic
2. **Electron proxies** handle IPC communication only
3. **UI composables** provide reactive interfaces to services
4. Always update both service and proxy when modifying interfaces

### Component Development

1. Use Vue 3 Composition API exclusively
2. Follow the theme system using `theme-manager-*` CSS classes
3. Implement proper TypeScript types
4. Use composables for business logic, components for presentation only

### Testing Strategy

- **Unit tests**: Individual service methods and utilities
- **Integration tests**: Cross-service workflows and API integrations  
- **Real API tests**: Limited tests against actual LLM providers
- **Component tests**: Vue component behavior and rendering

## Environment Configuration

### Local Development

Create `.env.local` in project root:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
# ... other API keys
```

### Multi-Custom Model Support

The system supports unlimited custom model configurations:
```env
VITE_CUSTOM_API_KEY_modelname=api_key
VITE_CUSTOM_API_BASE_URL_modelname=https://api.example.com/v1
VITE_CUSTOM_API_MODEL_modelname=model-name
```

## Advanced Features

### Variable Management System

The project includes an advanced variable management system (`packages/ui/src/components/AdvancedTestPanel.vue`):
- Custom variable CRUD operations
- Multi-turn conversation management  
- Variable replacement with preview
- Missing variable detection and auto-creation
- Import/export functionality

### Template Processing

Uses CSP-safe template processing (`packages/core/src/services/template/csp-safe-processor.ts`):
- Prevents XSS attacks
- Supports variable replacement with `{{variableName}}` syntax
- Handles both predefined and custom variables

### Storage Architecture

Multi-adapter storage system supports:
- **Browser**: localStorage for web/extension
- **Desktop**: File system storage via Electron
- **Fallback**: Memory storage for testing
- **IndexedDB**: For large data in browsers

## Branch and Release Management

### Branch Structure
- `main/master` - Production branch (triggers Vercel deployment)
- `develop` - Development branch (no Vercel deployment)
- `feature/*` - Feature branches from develop

### Version Management
```bash
# Update version (don't create tags yet)
pnpm version:prepare patch|minor|major

# Create and push tags (triggers desktop builds)
pnpm run version:tag
pnpm run version:publish
```

## Important Notes

### Node.js & Package Manager
- **Required**: Node.js >= 18, pnpm >= 8
- **Forbidden**: Do not use npm or yarn (enforced in package.json)
- Use `pnpm install` and pnpm workspace commands only

### Docker Deployment
- Multi-stage build optimizes image size
- Supports environment variable injection for API keys
- Built-in MCP server at `/mcp` endpoint
- Includes access password protection

### Desktop Application
- Auto-updater system with version checking
- IPC-based architecture with service proxying
- Cross-platform builds (Windows/macOS/Linux)
- Supports both installer and portable versions

## Documentation Structure

- `docs/developer/` - Technical documentation and guides
- `docs/user/` - User-facing documentation and deployment guides  
- `docs/archives/` - Historical development records and lessons learned
- `docs/workspace/` - Current project work tracking and reports
- `docs/testing/` - Testing scenarios and automation guides
- ui应尽量使用naive ui组件
- 记住，我们要尽量使用naive ui实现