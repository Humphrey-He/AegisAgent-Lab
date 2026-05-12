# 第二期开发验收报告

## 1. 验收结论

第二期核心开发目标已完成。

本期在第一期基础上补齐了端到端 Agent MVP 演示所需的基础能力：

- C# API 具备内存任务管理、任务查询、审批和状态流转。
- Go Runtime 具备结构化 JSON 输出和 trace 输出。
- Rust Tools 具备目录扫描和日志关键字统计。
- 仓库具备 GitHub Actions CI 配置。

## 2. 完成内容

### 2.1 C# API

目录：`agent-service/csharp-api`

完成能力：

- `TaskService` 从单次创建升级为内存任务仓储。
- 支持 `Create`、`Get`、`List`。
- 支持 `Approve`、`Reject`。
- 支持状态流转：
  - `Created -> Planning`
  - `Planning -> Running`
  - `Running -> Completed`
  - 任意状态进入 `Failed`
- 中高风险任务未审批前不能进入执行态。
- 新增任务列表、详情、审批接口。

验证命令：

```bash
dotnet test AgentService.slnx
```

### 2.2 Go Runtime

目录：`agent-service/go-runtime`

完成能力：

- CLI 保留文本输出。
- 新增 `--json` 输出模式。
- JSON 输出包含 `summary`、`tool_calls`、`trace`、`risks`、`next_actions`。
- trace event 包含 `sequence`、`name`、`tool_name`、`attributes`、`occurred_at`。
- `read_file` 继续保持只读和路径边界校验。

验证命令：

```bash
go test ./...
go run ./cmd/aicli --json read_file go.mod
```

### 2.3 Rust Tools

目录：`agent-service/rust-tools`

完成能力：

- `code-indexer` 新增 `scan_files`。
- `scan_files` 支持递归扫描目录并按扩展名过滤。
- `log-parser` 新增 `count_keywords`。
- `count_keywords` 支持大小写不敏感统计。

验证命令：

```bash
cargo test
```

### 2.4 CI

新增文件：

```text
.github/workflows/ci.yml
```

CI 测试线：

- Go Runtime: `go test ./...`
- C# API: `dotnet test AgentService.slnx`
- Rust Tools: `cargo test`

## 3. 端到端手工链路

推荐使用 `eval-cases/case-004-log-analysis.md` 作为第二期贯通实验。

手工链路：

```text
1. 使用 C# API 创建日志分析任务。
2. 根据风险等级确认低风险任务不需要审批，中高风险任务进入 Pending。
3. 使用 Go Runtime 的 `read_file` 读取案例或日志材料。
4. 使用 Go Runtime `--json` 输出结构化结果和 trace。
5. 使用 Rust `log-parser` 的 `summarize_logs` 与 `count_keywords` 做只读分析。
6. 将结果、风险和下一步动作整理到报告。
```

示例结构化结果应包含：

```text
summary：日志分析任务已完成基础只读检查
tool_calls：read_file、summarize_logs、count_keywords
trace：工具注册、工具开始、工具完成
risks：未接入生产日志、未执行写操作
next_actions：人工复核异常上下文、补充真实样本
```

## 4. 总体验证

第二期验收必须执行：

```bash
cd agent-service/go-runtime
go test ./...

cd ../csharp-api
dotnet test AgentService.slnx

cd ../rust-tools
cargo test
```

## 5. 尚未完成能力

以下能力留到后续阶段：

- 真实模型接入。
- 数据库存储。
- 前端管理台。
- 自动 Planner。
- 真实 Agent 执行状态机。
- trace 持久化查询。
- 自动修改代码。
- 自动提交 PR。
- 生产部署。

## 6. 第三期建议

第三期建议聚焦“可观测执行链路”：

- 为 C# API 增加执行记录模型。
- 为 Go Runtime 增加统一工具接口。
- 为 Rust Tools 增加 CLI 或 JSON 输出。
- 增加 trace 查询接口。
- 选择两个 eval case 做持续评估。
