# 第一期开发排期与交付说明

## 1. 第一期目标

第一期目标不是做完整 Agent 平台，而是把当前仓库从“文档 + 原型”推进到“可运行、可验证、可试点”的内部 MVP。

第一期完成后，项目应具备以下能力：

- 三条技术线 Go、C#、Rust 均可构建或测试通过。
- Go Runtime 提供只读工具调用和 trace 记录。
- C# API 提供任务创建、风险分级和审批状态基础模型。
- Rust Tools 提供最小代码索引和日志解析能力。
- 文档明确 AI Coding、Agent MVP、风险控制、评估报告的第一期交付范围。
- 至少可以用一个评估案例跑通“任务输入 -> 工具辅助 -> 结果记录 -> 报告沉淀”的手工闭环。

## 2. 第一期时间范围

建议周期：4 周。

```text
第 1 周：工程可运行性修复
第 2 周：Agent MVP 基础能力补齐
第 3 周：AI Coding 评估案例贯通
第 4 周：试点验收、复盘和下一期规划
```

## 3. 第一期开发表

| 周期 | 主目标 | 开发内容 | 输出物 | 验收标准 |
| --- | --- | --- | --- | --- |
| 第 1 周 | 修复基础工程 | 补齐 C# 任务模型、Rust 基础函数、统一测试入口 | 可运行的 Go/C#/Rust 子项目 | `go test ./...`、`dotnet test`、`cargo test` 通过 |
| 第 2 周 | Agent MVP 基础能力 | C# 任务 API、Go 只读工具、Rust 解析工具形成最小协作边界 | Agent MVP 基础接口和工具能力 | 能创建任务、识别风险、调用只读工具、返回结构化结果 |
| 第 3 周 | 评估案例贯通 | 选择 1 个 eval case，用 Prompt 和工具辅助完成实验 | 实验记录、Prompt 使用记录、验证结果 | 报告中记录耗时、Prompt 轮次、测试结果和人工修正 |
| 第 4 周 | 内部试点准备 | 梳理使用说明、风险清单、下一期功能列表 | 第一期总结和第二期计划 | 能向团队解释如何使用、限制是什么、下一步做什么 |

## 4. 各子项目第一期交付范围

### 4.1 Go Runtime

目录：`agent-service/go-runtime`

第一期定位：

Go Runtime 是 Agent 的本地工具调用原型，第一期只做低风险只读能力，不做代码修改、数据库写入、发布部署等动作。

第一期应完成：

- CLI 启动入口。
- 工具注册表。
- `read_file` 只读工具。
- 路径越权防护。
- 拒绝目录读取。
- 工具风险等级标记。
- trace run 和 trace event 记录。
- 工具执行开始、完成、失败事件记录。

第一期不做：

- 自动修改代码。
- 执行任意 shell 命令。
- 自动提交 Git。
- 调用生产系统写接口。
- 复杂 Planner。

验收命令：

```bash
cd agent-service/go-runtime
go test ./...
go run ./cmd/aicli
go run ./cmd/aicli read_file README.md
```

验收结果要求：

- 测试通过。
- CLI 能列出工具数量和工具信息。
- 读取文件时能输出路径、字节数和内容。
- trace 中能看到工具注册、开始和完成事件。

### 4.2 C# API

目录：`agent-service/csharp-api`

第一期定位：

C# API 是团队化 Agent 服务入口，第一期重点是任务模型、风险分级和审批状态，而不是完整执行引擎。

第一期应完成：

- `/health` 健康检查接口。
- `/tasks` 任务创建接口。
- `AgentTask` 领域模型。
- `AgentTaskStatus` 状态枚举。
- `TaskRiskLevel` 风险等级枚举。
- `ApprovalStatus` 审批状态枚举。
- `TaskService.Create` 默认创建低风险任务。
- 中高风险任务默认进入待审批状态。
- 统一 solution 或等价测试入口。

第一期不做：

- 用户登录。
- 完整权限系统。
- 数据库存储。
- 多租户。
- 长任务调度。
- 前端页面。

验收命令：

```bash
cd agent-service/csharp-api
dotnet build
dotnet test
dotnet run --project Agent.Api/Agent.Api.csproj
```

验收结果要求：

- 构建通过。
- 测试通过。
- `/health` 返回 `ok`。
- 创建低风险任务时审批状态为 `NotRequired`。
- 创建中高风险任务时审批状态为 `Pending`。

### 4.3 Rust Tools

目录：`agent-service/rust-tools`

第一期定位：

Rust Tools 是高可靠本地工具组件原型，第一期补齐最小代码索引和日志解析能力。

第一期应完成：

- `common` crate 定义工具元数据和风险等级。
- `code-indexer` 提供工具元数据。
- `code-indexer` 提供 `file_extension` 基础函数。
- `log-parser` 提供工具元数据。
- `log-parser` 提供 `summarize_logs` 基础函数。
- `sandbox-runner` 标记为中风险工具，仅保留元数据，不做真实执行沙箱。

第一期不做：

- 全量 AST 解析。
- 大型索引数据库。
- 真实命令沙箱执行。
- 复杂日志规则引擎。
- 文件系统写操作。

验收命令：

```bash
cd agent-service/rust-tools
cargo test
```

验收结果要求：

- workspace 测试通过。
- `file_extension("src/Program.CS")` 返回 `Some("cs")`。
- `file_extension("README")` 返回 `None`。
- `summarize_logs` 能统计总行数、错误行数和警告行数。

### 4.4 Prompt 与评估案例

目录：

- `prompts/`
- `eval-cases/`

第一期定位：

Prompt 和评估案例是 AI Coding 主线的核心资产。第一期不追求数量继续膨胀，而是确保已有模板可执行、可复盘。

第一期应完成：

- `requirement-breakdown.md` 可用于需求拆解。
- `code-reading.md` 可用于代码阅读。
- `bug-investigation.md` 可用于 Bug 排查。
- `test-generation.md` 可用于测试生成。
- `pr-review.md` 可用于 PR Review。
- 至少 5 个 eval case 保持可执行。
- 每个 eval case 有目标、输入、约束和验收标准。

验收方式：

- 选择 1 个 eval case。
- 使用对应 Prompt 完成一次 AI Coding 实验。
- 将实验过程记录到报告。

### 4.5 Reports

目录：`reports/`

第一期定位：

Reports 用于证明 AI 是否真正提升效率和质量，而不是只凭主观感受判断。

第一期应完成：

- 人工基线记录。
- AI 辅助实践记录。
- 至少 1 次真实实验记录。
- 记录 Prompt 轮次、人工修改次数、验证命令和结果。
- 记录风险、误报和不适用场景。

第一期报告最少字段：

```text
任务名称：
任务类型：
使用 Prompt：
输入材料：
AI 辅助耗时：
人工修改次数：
验证命令：
验证结果：
Review 问题：
风险与教训：
下一步改进：
```

## 5. 第一期功能清单

### 必须完成

- Go `read_file` 只读工具可用。
- Go trace 基础结构可用。
- C# 任务创建可用。
- C# 风险等级和审批状态可用。
- Rust 代码扩展名识别可用。
- Rust 日志摘要统计可用。
- 三条技术线测试通过。
- 第一期开发排期文档完成。

### 应该完成

- C# solution 文件。
- C# `/tasks` 接口基本请求体验验证。
- Go CLI 读取项目 README 示例验证。
- Rust 工具 metadata 测试保持通过。
- 选择一个 eval case 做实验记录。

### 暂不完成

- 模型接入层。
- 自动 Planner。
- 数据库。
- 前端管理台。
- 生产环境部署。
- 自动代码修改。
- 自动 PR 创建。

## 6. 第一期验收标准

第一期完成必须满足：

```text
1. 工程验收
   - Go 测试通过
   - C# 构建和测试通过
   - Rust 测试通过

2. 功能验收
   - 能创建 Agent 任务
   - 能按风险等级设置审批状态
   - 能调用只读文件工具
   - 能记录工具调用 trace
   - 能解析文件扩展名
   - 能统计日志摘要

3. 文档验收
   - 项目说明文档存在
   - 公司级评价文档存在
   - 第一期开发排期文档存在
   - 风险边界明确

4. 试点验收
   - 至少一个 eval case 被用于实验
   - 报告中记录验证命令和结果
```

## 7. 第二期预告

第二期可以在第一期基础上继续推进：

- C# API 增加任务查询和状态流转。
- Go Runtime 增加统一 Tool 接口和 JSON 输出。
- Rust Tools 增加目录扫描和日志关键字提取。
- 引入持久化存储。
- 引入审批接口。
- 形成一个端到端 Agent 执行流程。
- 建立 CI。

第二期开始前必须确认第一期三条技术线全部通过测试，否则不建议继续扩大功能。
