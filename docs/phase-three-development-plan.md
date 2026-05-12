# 第三期开发排期与交付说明

## 1. 第三期目标

第三期目标是把第二期的“端到端 Agent MVP 可演示”推进到“可观测执行链路”。

本期仍不接入真实大模型、不做生产部署、不做自动代码修改，重点建设：

```text
任务执行记录
  -> trace 查询
  -> 统一工具接口
  -> Rust CLI/JSON 输出
  -> 多评估案例复盘
  -> 可持续验证
```

第三期完成后，项目应能回答：

- 一个任务执行过哪些步骤？
- 调用了哪些工具？
- 每次工具调用成功还是失败？
- 输出了哪些结构化结果？
- 风险和下一步动作是什么？
- 多个评估案例下效果是否稳定？

补充闭环目标：

- C# API 可以触发一次任务执行。
- 执行过程中调用 Go/Rust 本地工具。
- 工具调用开始、完成、失败结果自动写回任务 trace。

## 2. 周期安排

建议周期：4 周。

| 周期 | 主目标 | 交付内容 | 验收标准 |
| --- | --- | --- | --- |
| 第 1 周 | C# 执行记录与 trace 查询 | 执行记录模型、执行事件模型、任务 trace 查询接口 | `dotnet test AgentService.slnx` 通过 |
| 第 2 周 | Go Runtime 统一工具接口 | Tool 接口、工具注册执行、JSON 输出复用统一执行结果 | `go test ./...` 通过 |
| 第 3 周 | Rust Tools CLI/JSON 输出 | `code-indexer` 和 `log-parser` 提供最小 CLI 或示例命令 | `cargo test` 通过，CLI 可返回 JSON |
| 第 4 周 | 双案例持续评估 | 选择 2 个 eval case 做实验复盘，输出第三期验收报告 | 报告包含结果、风险、测试命令、下一期建议 |

## 3. C# API 交付范围

目录：`agent-service/csharp-api`

第三期定位：

C# API 从“任务管理入口”升级为“执行记录与 trace 查询入口”。本期仍使用内存存储，不引入数据库。

应完成能力：

- 新增执行记录模型。
- 新增执行事件模型。
- 每个任务可以追加执行事件。
- 支持按任务 ID 查询 trace。
- 支持记录工具调用事件。
- 支持记录执行摘要、风险和下一步动作。

建议接口：

```text
GET  /tasks/{id}/trace
POST /tasks/{id}/trace
POST /tasks/{id}/execute
```

建议事件字段：

```text
sequence
name
tool_name
status
message
attributes
occurred_at
```

第三期不做：

- 数据库持久化。
- 分布式 trace。
- 用户登录。
- 复杂权限系统。

## 4. Go Runtime 交付范围

目录：`agent-service/go-runtime`

第三期定位：

Go Runtime 从“CLI 分支调用工具”升级为“统一工具接口 + 统一执行结果”。

应完成能力：

- 定义统一 Tool 接口。
- `read_file` 实现 Tool 接口。
- Registry 支持按名称查找工具。
- CLI 通过 Registry 执行工具，而不是硬编码工具分支。
- JSON 输出继续兼容第二期结构。
- 工具错误和成功结果使用统一结构。

建议接口概念：

```text
Tool:
  Name
  Description
  RiskLevel
  Execute(args)
```

第三期不做：

- 任意 shell 执行。
- 写文件工具。
- Git 写操作。
- 自动代码修改。

## 5. Rust Tools 交付范围

目录：`agent-service/rust-tools`

第三期定位：

Rust Tools 从“库函数可测”升级为“可被外部链路调用的本地工具原型”。

应完成能力：

- `code-indexer` 提供最小 CLI 或示例命令，支持扫描目录并输出 JSON。
- `log-parser` 提供最小 CLI 或示例命令，支持读取日志文本并输出 JSON 摘要。
- JSON 输出字段保持简单稳定。
- 保持只读，不写文件、不执行外部命令。

建议命令形态：

```bash
cargo run -p code-indexer -- scan --root . --ext rs
cargo run -p log-parser -- summarize --file sample.log
```

如当前 crate 结构不适合直接 CLI，可新增小型 binary target。

## 6. 评估与报告

第三期至少选择 2 个 eval case：

- 推荐一：`eval-cases/case-004-log-analysis.md`
- 推荐二：`eval-cases/case-005-pr-review.md` 或 `eval-cases/case-003-test-generation.md`

每个案例记录：

```text
任务名称
输入材料
使用工具
执行 trace
结构化输出
验证命令
人工复核结论
风险与误报
下一步改进
```

输出报告：

```text
reports/phase-three-acceptance-report.md
```

## 7. 验收标准

第三期完成必须满足：

```text
Go 测试通过
C# 测试通过
Rust 测试通过
C# 能查询任务 trace
Go 工具执行走统一接口
Rust 至少一个工具具备 CLI/JSON 输出
至少两个 eval case 完成复盘记录
```

## 8. 第四期预告

第四期建议推进：

- 引入轻量持久化。
- 将 trace 从内存升级为可保存记录。
- 设计模型接入层。
- 设计 Prompt 版本管理。
- 增加更多只读工具。
- 形成内部试点使用指南。
