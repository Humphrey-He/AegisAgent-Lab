# 第二期开发排期与交付说明

## 1. 第二期目标

第二期目标是把第一期的“基础工程可运行”推进到“端到端 Agent MVP 可演示”。

本期仍不接入真实大模型、不做生产部署、不做自动代码修改，重点打通以下链路：

```text
C# API 创建任务
  -> 风险与审批判断
  -> Go Runtime 执行只读工具
  -> 返回结构化结果
  -> 记录 trace
  -> Rust Tools 做只读解析
  -> 写入实验报告
```

## 2. 周期安排

建议周期：4 周。

| 周期 | 主目标 | 交付内容 | 验收标准 |
| --- | --- | --- | --- |
| 第 1 周 | C# API 任务管理闭环 | 内存任务仓储、查询接口、审批接口、状态流转 | `dotnet test AgentService.slnx` 通过 |
| 第 2 周 | Go Runtime 工具协议升级 | `--json` 输出、结构化 `summary/tool_calls/trace/risks/next_actions` | `go test ./...` 通过 |
| 第 3 周 | Rust Tools 能力增强 | 目录扫描、日志关键字统计 | `cargo test` 通过 |
| 第 4 周 | 端到端手工链路与 CI | GitHub Actions、验收报告、手工演示路径 | 三条技术线测试命令通过 |

## 3. C# API 交付范围

目录：`agent-service/csharp-api`

已完成能力：

- `TaskService` 使用进程内内存仓储保存任务。
- 支持创建、按 ID 查询、列表查询。
- 支持审批通过和审批拒绝。
- 支持任务状态流转。
- 低风险任务不需要审批。
- 中高风险任务创建后审批状态为 `Pending`。
- 中高风险任务未审批前不能进入执行态。

新增接口：

```text
GET  /tasks
GET  /tasks/{id}
POST /tasks/{id}/approve
POST /tasks/{id}/reject
```

已有接口：

```text
GET  /health
POST /tasks
```

状态流转规则：

```text
Created -> Planning
Planning -> Running
Running -> Completed
任意状态 -> Failed
```

## 4. Go Runtime 交付范围

目录：`agent-service/go-runtime`

已完成能力：

- 保留原文本输出。
- 新增 `--json` 输出模式。
- `read_file` 继续保持只读。
- 结构化输出包含：
  - `summary`
  - `tool_calls`
  - `trace`
  - `risks`
  - `next_actions`
- trace event 输出结构化字段：
  - `sequence`
  - `name`
  - `tool_name`
  - `attributes`
  - `occurred_at`

示例命令：

```bash
go run ./cmd/aicli --json
go run ./cmd/aicli --json read_file go.mod
```

## 5. Rust Tools 交付范围

目录：`agent-service/rust-tools`

已完成能力：

- `code-indexer` 新增 `scan_files(root, extensions)`。
- `scan_files` 递归扫描指定目录，按扩展名过滤，返回相对路径。
- `log-parser` 新增 `count_keywords(logs, keywords)`。
- `count_keywords` 按关键字统计出现次数，大小写不敏感。
- 所有新增能力保持只读，不写文件、不执行外部命令。

保留能力：

- `metadata()`
- `file_extension()`
- `summarize_logs()`

## 6. CI 交付范围

新增 GitHub Actions：

```text
.github/workflows/ci.yml
```

CI 包含三条测试线：

```bash
cd agent-service/go-runtime && go test ./...
cd agent-service/csharp-api && dotnet test AgentService.slnx
cd agent-service/rust-tools && cargo test
```

## 7. 验收标准

第二期完成必须满足：

```text
Go 测试通过
C# 测试通过
Rust 测试通过
CI 文件存在
验收报告存在
端到端手工链路可解释、可复现
```

## 8. 第三期建议

第三期建议继续推进：

- C# API 增加执行记录和 trace 查询。
- Go Runtime 抽象统一 Tool 接口。
- Go Runtime 支持更多低风险工具。
- Rust Tools 输出结构化 JSON 或提供 CLI。
- 引入轻量持久化。
- 设计模型接入层，但默认仍保持人工确认。
