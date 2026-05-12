# 项目说明文档

## 1. 项目概述

本项目是一个面向后端开发者的 AI 工程化实践仓库，目标是围绕真实后端研发任务，沉淀可复用的 AI Coding 工作流、Prompt 模板、评估案例、风险控制规则，以及一个后端研发助手 Agent 的最小可用原型。

项目当前处于基础框架阶段，核心不是交付单一业务系统，而是构建一套可持续迭代的研发资产：

- 用文档和案例明确 AI 适合参与哪些后端研发任务。
- 用 Prompt 模板降低需求拆解、代码阅读、Bug 排查、测试生成和 PR Review 的重复成本。
- 用评估样本和报告记录 AI 辅助研发的效率、质量和风险。
- 用 Go、C#、Rust 三种语言验证 Agent 基础能力在不同工程位置上的适配方式。

## 2. 项目定位

项目名称：AI Backend Practice

适用对象：

- 具备 3-5 年经验的后端开发者。
- 希望将 AI Coding 纳入日常研发流程的工程师。
- 希望建设内部研发助手、代码审查助手、日志分析助手或工具调用型 Agent 的团队。
- 希望从业务开发扩展到 AI 工程化、平台工具、研发效能方向的技术人员。

项目主线：

- AI Coding 工作流：聚焦个人和团队如何稳定使用 AI 完成需求拆解、代码阅读、测试补齐、Bug 排查、日志分析和 PR Review。
- Agent 基础能力：探索一个可调用工具、可记录 trace、可做权限分级、可人工确认的后端研发助手 Agent 架构。

## 3. 仓库结构

```text
.
├── README.md
├── docs/
│   ├── ai-backend-agent-coding-project.md
│   ├── ai-coding-sop.md
│   ├── agent-architecture.md
│   ├── mainline-execution-board.md
│   ├── risk-and-guardrails.md
│   └── project-overview.md
├── prompts/
│   ├── requirement-breakdown.md
│   ├── code-reading.md
│   ├── bug-investigation.md
│   ├── test-generation.md
│   └── pr-review.md
├── eval-cases/
│   ├── case-001-crud.md
│   ├── case-002-bugfix.md
│   ├── case-003-test-generation.md
│   ├── case-004-log-analysis.md
│   └── case-005-pr-review.md
├── reports/
│   ├── README.md
│   ├── baseline-report.md
│   └── ai-coding-practice-report.md
└── agent-service/
    ├── README.md
    ├── go-runtime/
    ├── csharp-api/
    └── rust-tools/
```

目录说明：

- `docs/`：项目总说明、AI Coding SOP、Agent 架构、风险控制和执行看板。
- `prompts/`：可复用的 AI Coding Prompt 模板。
- `eval-cases/`：后端研发任务评估样本，用于对比人工基线和 AI 辅助效果。
- `reports/`：阶段报告、基线报告、AI Coding 实践复盘。
- `agent-service/`：Agent 基础能力的多语言样例工程。

## 4. 核心能力设计

### 4.1 AI Coding 工作流

AI Coding 主线关注如何让 AI 参与研发过程，并且保证结果可验证、可复盘、可控制。

当前已沉淀的能力包括：

- 任务准入标准：区分优先使用 AI、谨慎使用 AI、不应直接交给 AI 的任务类型。
- 上下文收集清单：定义任务背景、技术栈、目标范围、约束、验收方式和代码上下文。
- 执行流程：任务规格化、代码阅读、方案确认、小步执行、测试验证、Review 复盘。
- 专项流程：Bug 排查、测试生成、PR Review。
- 验收清单：控制无关改动、新依赖、安全风险、测试缺口和敏感信息泄露。
- 实验记录规范：记录 AI 工具、Prompt 轮次、耗时、人工修改次数、测试结果和质量评分。

### 4.2 Agent 基础能力

Agent 主线关注构建一个后端研发助手的最小可用架构。

目标能力：

- 接收自然语言研发任务。
- 识别任务类型并拆解执行步骤。
- 检索项目文档、代码摘要、日志片段或评估案例。
- 路由到可用工具。
- 执行只读或低风险工具。
- 输出结构化结果。
- 记录执行 trace。
- 对高风险动作要求人工确认。

推荐架构：

```text
User Request
  -> API Layer
  -> Task Planner
  -> Context Retriever
  -> Tool Router
  -> Tool Executor
  -> Output Validator
  -> Trace Logger
  -> Human Approval
```

## 5. 多语言子项目说明

### 5.1 Go Runtime

目录：`agent-service/go-runtime`

定位：

- Agent CLI 原型。
- 工具注册与工具路由。
- 只读工具执行入口。
- trace 结构记录。

当前实现：

- `cmd/aicli/main.go`：本地 CLI 入口，启动后加载工具注册表并输出 trace 事件。
- `internal/tools/registry.go`：工具注册表，目前注册 `read_file`。
- `internal/tools/read_file.go`：只读文件读取工具，拒绝绝对路径、目录读取和越权访问。
- `internal/trace/trace.go`：执行 run 和事件记录结构。

验证命令：

```bash
cd agent-service/go-runtime
go test ./...
```

当前验证结果：通过。

### 5.2 C# API

目录：`agent-service/csharp-api`

定位：

- 团队化 HTTP API 原型。
- Agent 任务管理。
- 风险等级与审批状态模型。
- 后续可扩展执行记录、权限边界和团队接口。

当前实现：

- `Agent.Api/Program.cs`：提供 `/health` 和 `/tasks` 两个最小 API。
- `Agent.Application/TaskService.cs`：创建 Agent 任务。
- `Agent.Domain/AgentTask.cs`：定义任务、任务状态、风险等级和审批状态。
- `Agent.Tests/Program.cs`：以可执行程序方式验证任务默认风险和高风险审批逻辑。

当前状态：

- 领域模型已经包含 `RiskLevel` 和 `ApprovalStatus` 字段。
- 测试代码已经表达了低风险默认不需要审批、高风险需要审批的目标行为。
- `TaskService` 当前实现尚未与领域模型和测试期望对齐，构造 `AgentTask` 时缺少风险等级和审批状态参数，也缺少测试中使用的高风险创建重载。

建议验证命令：

```bash
cd agent-service/csharp-api
dotnet build Agent.Api/Agent.Api.csproj
dotnet test Agent.Tests/Agent.Tests.csproj
```

当前验证结果：

- 在 `csharp-api` 根目录直接执行 `dotnet test` 会失败，因为该目录尚未提供 `.sln` 或根项目文件。
- 执行 `dotnet build Agent.Api/Agent.Api.csproj` 会失败，原因是 `TaskService.Create` 与 `AgentTask` 构造函数参数不匹配。

### 5.3 Rust Tools

目录：`agent-service/rust-tools`

定位：

- 本地代码索引工具。
- 日志解析工具。
- 沙箱执行原型。
- 共享工具元数据和风险等级定义。

当前实现：

- `crates/common`：定义 `RiskLevel` 和 `ToolMetadata`。
- `crates/code-indexer`：提供代码索引工具元数据，风险等级为低风险。
- `crates/log-parser`：提供日志解析工具元数据，风险等级为低风险。
- `crates/sandbox-runner`：提供沙箱运行工具元数据，风险等级为中风险。

验证命令：

```bash
cd agent-service/rust-tools
cargo test
```

当前验证结果：未通过。测试中已经预期存在以下函数，但当前实现尚未补齐：

- `code-indexer`：`file_extension`
- `log-parser`：`summarize_logs`

## 6. 风险与 Guardrails

项目明确采用“默认只读、写操作需授权”的安全边界。

必须拦截的动作：

- 删除数据。
- 修改生产配置。
- 执行数据库写操作。
- 发布部署。
- 创建或删除云资源。
- 向外部系统提交写请求。
- 输出密钥、Token、连接串。

Agent 输出建议包含：

- `summary`：结果摘要。
- `steps`：执行步骤。
- `tool_calls`：工具调用记录。
- `risks`：风险说明。
- `next_actions`：建议动作。

当任务涉及中高风险动作时，Agent 应只返回建议和待确认计划，不能自动执行。

## 7. 当前项目状态

整体判断：

- 文档体系已经具备较完整的项目方向、SOP、架构、风险控制和执行节奏。
- Prompt 模板和评估案例已经建立初版资产目录。
- Go Runtime 已具备最小可运行的只读工具和 trace 原型。
- C# API 已建立分层结构和领域模型，但实现与测试目标存在未闭合点。
- Rust Tools 已建立 workspace 和 crate 分层，但代码索引与日志解析函数仍处于测试先行、实现待补齐状态。

已验证情况：

```text
Go:    go test ./...                 通过
C#:    dotnet build Agent.Api/...    未通过，TaskService 与 AgentTask 构造参数不匹配
Rust:  cargo test                    未通过，缺少 file_extension 和 summarize_logs 实现
```

## 8. 建议下一步

优先级一：补齐可运行闭环

- 修复 C# `TaskService`，让任务创建时正确设置 `RiskLevel` 和 `ApprovalStatus`。
- 为 `csharp-api` 增加 solution 文件，统一 `dotnet build` 和 `dotnet test` 入口。
- 实现 Rust `file_extension` 和 `summarize_logs`，让 `cargo test` 通过。

优先级二：完善 Agent MVP

- 为 Go Runtime 扩展工具接口抽象，让工具具备统一输入、输出、风险等级和错误格式。
- 将 trace 输出从控制台文本升级为结构化 JSON。
- 在 C# API 中增加查询任务、任务状态流转和审批接口。
- 在 Rust Tools 中补齐日志摘要、代码文件扫描和基础索引能力。

优先级三：贯通评估流程

- 从 `eval-cases/` 选择一个真实任务。
- 使用 `prompts/` 中的模板执行 AI Coding 流程。
- 用 Go 只读工具读取上下文并记录 trace。
- 将实验耗时、Prompt 轮次、人工修改次数和测试结果写入 `reports/`。

## 9. 项目价值

本项目的价值不在于一次性完成一个复杂 Agent，而在于用工程化方式回答三个问题：

- 哪些后端研发任务适合 AI 参与？
- 如何让 AI 输出进入可测试、可审查、可复盘的工程流程？
- 如何把个人 AI Coding 经验沉淀成团队可复用的 Agent 工具链和研发资产？

当文档、Prompt、评估案例、工具原型和报告形成闭环后，项目可以继续演进为团队内部的研发效能平台或后端研发助手 Agent。
