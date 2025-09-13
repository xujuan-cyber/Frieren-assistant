# 用户提示词优化：示例与最佳实践

本页汇总“用户提示词优化”的常见任务范式，并指向更具体的场景案例。

## 常见范式
- 总结/改写/翻译：说明目标读者、风格、长度与格式
- 生成型写作：给出题材、受众、结构、示例与限制
- 结构化输出：明确字段、类型、约束与示例（必要时 JSON）

模板片段：
```text
任务：请基于以下素材生成{{doc_type}}，面向{{audience}}。
要求：语气{{tone}}，长度约{{length}}，输出为(标题/摘要/要点列表)。
素材：
{{content}}
```

## 典型场景
- [创意写作](creative-writing.md)
- [商务沟通](business-communication.md)
- [教学培训](educational-training.md)

## 提示
- 明确目标、受众与格式能大幅提升稳定性
- 结合“迭代优化/对比测试”选择最优版本

## 相关内容
- 基础模式：用户提示词优化: ../basic/user-optimization.md
- 基础模式：系统提示词优化: ../basic/system-optimization.md
