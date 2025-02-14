# 核心包开发指南

## 1. 架构设计

### 1.1 包结构
```typescript
@prompt-optimizer/core/
├── src/
│   ├── services/       # 核心服务实现
│   │   ├── llm/       # LLM服务
│   │   ├── model/     # 模型管理
│   │   ├── prompt/    # 提示词服务
│   │   ├── template/  # 模板服务
│   │   └── history/   # 历史记录服务
│   ├── types/         # 类型定义
│   └── utils/         # 工具函数
└── tests/             # 测试文件
```

### 1.2 设计原则
1. 单一职责
   - 每个服务专注于单一功能
   - 避免服务间的紧耦合
   - 明确的接口定义

2. 依赖注入
   - 服务通过工厂函数创建
   - 配置通过参数注入
   - 便于测试和mock

3. 错误处理
   - 统一的错误类型
   - 清晰的错误信息
   - 可追踪的错误栈

## 2. 服务实现规范

### 2.1 服务基类
```typescript
abstract class BaseService {
  protected config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  protected abstract validateConfig(config: ServiceConfig): void;
  
  protected handleError(error: unknown): never {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}
```

### 2.2 服务实现模板
```typescript
class ConcreteService extends BaseService {
  // 1. 私有属性
  private state: ServiceState;

  // 2. 构造函数
  constructor(config: ServiceConfig) {
    super(config);
    this.state = this.initializeState();
  }

  // 3. 公共方法
  public async operation(): Promise<Result> {
    try {
      await this.validateInput();
      const result = await this.processOperation();
      await this.handleSuccess(result);
      return result;
    } catch (err) {
      this.handleError(err);
    }
  }

  // 4. 受保护方法
  protected validateConfig(config: ServiceConfig): void {
    if (!config.required) {
      throw new ConfigError('Missing required config');
    }
  }

  // 5. 私有方法
  private async processOperation(): Promise<Result> {
    // 实现具体操作
  }
}
```

## 3. LangChain集成

### 3.1 模型配置
```typescript
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

class LLMService extends BaseService {
  private initializeModel(provider: string) {
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: this.config.model,
          temperature: 0.7,
          streaming: true
        });
      case 'gemini':
        return new ChatGoogleGenerativeAI({
          modelName: 'gemini-pro',
          maxOutputTokens: 2048
        });
      default:
        throw new ConfigError(`Unsupported provider: ${provider}`);
    }
  }
}
```

### 3.2 流式处理
```typescript
class PromptService extends BaseService {
  public async optimizeWithStream(prompt: string) {
    const model = this.initializeModel();
    const stream = await model.stream(prompt);
    
    return new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });
  }
}
```

## 4. 错误处理规范

### 4.1 错误类型定义
```typescript
// 基础错误类
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// API错误
export class APIError extends BaseError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
  }
}

// 配置错误
export class ConfigError extends BaseError {
  constructor(
    message: string,
    public readonly key?: string
  ) {
    super(message);
  }
}

// 验证错误
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
  }
}
```

### 4.2 错误处理流程
```typescript
class ErrorHandler {
  // 处理API错误
  public static handleAPIError(err: APIError) {
    if (err.isRetryable) {
      return this.retryOperation();
    }
    this.logError(err);
    throw err;
  }

  // 处理配置错误
  public static handleConfigError(err: ConfigError) {
    this.logError(err);
    if (err.key) {
      this.notifyConfigIssue(err.key);
    }
    throw err;
  }

  // 处理验证错误
  public static handleValidationError(err: ValidationError) {
    this.logError(err);
    this.highlightField(err.field);
    throw err;
  }
}
```

## 5. 测试规范

### 5.1 单元测试
```typescript
import { describe, it, expect } from 'vitest'

describe('LLMService', () => {
  it('should initialize with valid config', () => {
    const config = {
      provider: 'openai',
      model: 'gpt-4'
    };
    const service = new LLMService(config);
    expect(service).toBeInstanceOf(LLMService);
  });

  it('should throw on invalid config', () => {
    const config = {
      provider: 'invalid'
    };
    expect(() => new LLMService(config)).toThrow(ConfigError);
  });
});
```

### 5.2 集成测试
```typescript
describe('PromptService Integration', () => {
  it('should optimize prompt with LLM', async () => {
    const promptService = new PromptService(config);
    const result = await promptService.optimize('test prompt');
    expect(result).toHaveProperty('content');
  });

  it('should handle API errors', async () => {
    const service = new PromptService(invalidConfig);
    await expect(service.optimize('test'))
      .rejects
      .toThrow(APIError);
  });
});
```

## 6. 性能优化

### 6.1 缓存策略
```typescript
class CacheManager {
  private cache: Map<string, CacheEntry>;
  
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    return entry.value as T;
  }
  
  public set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
}
```

### 6.2 资源管理
```typescript
class ResourceManager {
  private connections: Map<string, Connection>;
  
  public async getConnection(key: string): Promise<Connection> {
    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }
    const conn = await this.createConnection(key);
    this.connections.set(key, conn);
    return conn;
  }
  
  public async cleanup(): Promise<void> {
    for (const conn of this.connections.values()) {
      await conn.close();
    }
    this.connections.clear();
  }
}
```

## 7. 版本控制

### 7.1 版本规范
- 遵循Semantic Versioning
- 主版本：不兼容的API修改
- 次版本：向后兼容的功能性新增
- 修订号：向后兼容的问题修正

### 7.2 更新日志
- 记录所有版本更改
- 标注破坏性更改
- 提供迁移指南

## 8. 文档规范

### 8.1 代码注释
```typescript
/**
 * 提示词服务类
 * 负责处理提示词的优化和验证
 * 
 * @example
 * ```typescript
 * const service = new PromptService(config);
 * const result = await service.optimize('prompt');
 * ```
 */
class PromptService extends BaseService {
  /**
   * 优化提示词
   * @param prompt - 原始提示词
   * @returns 优化后的提示词
   * @throws {ValidationError} 当提示词验证失败时
   * @throws {APIError} 当API调用失败时
   */
  public async optimize(prompt: string): Promise<string> {
    // 实现
  }
}
```

### 8.2 API文档
- 使用TypeDoc生成
- 包含所有公共API
- 提供使用示例
- 说明错误处理 