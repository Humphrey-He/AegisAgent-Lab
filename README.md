# AegisAgent Lab

面向 3-5 年后端开发者的 AI 工程化探索项目，聚焦两条主线：

- 主线一：AI Coding 工作流
- 主线二：Agent 基础能力

语言范围：

- Go：CLI、工具调用网关、Agent runtime
- C#：团队研发助手 API、任务与权限管理
- Rust：本地代码索引、安全工具组件、日志解析

## 目录

```text
docs/          项目文档、SOP、架构说明
prompts/       AI Coding 可复用 Prompt 模板
eval-cases/    后端任务评估样本
agent-service/ Agent 基础服务和多语言实践框架
reports/       阶段复盘与评估报告
```

## 当前阶段

当前仓库已完成前三期 MVP 演进：基础工程可运行、端到端 Agent MVP 可演示、可观测执行链路。

后续优先推进：

1. 用真实 eval case 采集人工耗时、AI 辅助耗时、Prompt 轮次和质量评分。
2. 将 trace 从内存记录升级为轻量持久化。
3. 增加 Git diff 只读工具，支撑 PR Review 真实复盘。
