# 项目量化指标总结

统计日期：2026-05-12

## 统计口径

本文件基于当前仓库文件、前四期验收报告和本次本地测试结果统计。统计范围覆盖 `docs/`、`prompts/`、`eval-cases/`、`.github/workflows/ci.yml` 与 `agent-service/` 实现；本文件仅沉淀指标，不改动业务代码。

| 指标 | 口径 |
| --- | --- |
| 自动化测试数量 | Go 按 `func Test*` 统计；C# 按 xUnit 执行结果统计，`[Theory]` 的多组 `InlineData` 按实际测试用例数计入；Rust 按 `cargo test` 实际通过用例统计。 |
| C# API 接口数量 | 按 `Agent.Api/Program.cs` 中 Minimal API `app.Map*` 路由统计；同时区分业务接口和健康检查接口。 |
| 工具数量 | 按当前可被 CLI/API 链路实际调用的只读工具统计；仅有 metadata、尚无 CLI 或执行链路的工具单独标注为候选工具。 |
| 阶段完成度 | 按 `reports/phase-one-acceptance-report.md`、`phase-two-acceptance-report.md`、`phase-three-acceptance-report.md`、`phase-four-acceptance-report.md` 的验收结论统计阶段完成情况。 |
| trace 相关能力数量 | 按源码和验收报告中可定位的 trace 数据结构、记录、查询、追加、输出和执行回写能力项统计。 |
| eval case 完成/模板数量 | `eval-cases/` 下文件数作为模板数量；真实实验完成数只统计有真实样本、耗时、评分、人工复核结论的案例。第三期复盘的两个案例单独计为复盘模板，不计为真实完成。 |
| Prompt 模板数量 | `prompts/` 下 Markdown 模板文件数。 |
| CI 测试线数量 | `.github/workflows/ci.yml` 中执行 `go test`、`dotnet test`、`cargo test` 的测试 job 数量。 |

## 当前数值

| 指标 | 当前数值 | 说明 |
| --- | ---: | --- |
| 自动化测试数量 | 31 | Go 9、C# 18、Rust 4；本次已执行三条测试线且全部通过。 |
| C# API 接口数量 | 9 | 8 个业务接口 + 1 个 `/health` 健康检查接口。 |
| 可调用工具数量 | 4 | `read_file`、`git_diff`、`code-indexer scan`、`log-parser summarize`。 |
| 候选工具数量 | 1 | `sandbox-runner` 目前仅有 metadata，未纳入可调用工具链。 |
| 前四期阶段完成度 | 4/4，100% | 四份验收报告均标记核心开发目标已完成。 |
| trace 相关能力数量 | 11 | 见下方 trace 能力清单。 |
| eval case 真实完成数量 | 0 | 尚未看到真实样本、真实耗时、质量评分和人工复核闭环。 |
| eval case 复盘模板数量 | 2 | 第三期对 `case-004-log-analysis` 和 `case-005-pr-review` 形成推荐复盘模板。 |
| eval case 模板数量 | 5 | `case-001` 到 `case-005`。 |
| Prompt 模板数量 | 5 | 需求拆解、代码阅读、Bug 排查、测试生成、PR Review。 |
| CI 测试线数量 | 3 | Go Runtime、C# API、Rust Tools。 |
| 人工基线耗时 | 未采集 | `baseline-report.md` 仍是模板。 |
| AI 辅助耗时 | 未采集 | `ai-coding-practice-report.md` 仍是模板。 |
| 质量评分 | 未采集 | eval case 中有评分口径，但没有真实评分样本。 |
| 效率收益 | 未采集 | 未采集人工基线和 AI 辅助耗时，不能计算收益。 |

## trace 能力清单

| 序号 | 能力 | 当前状态 |
| ---: | --- | --- |
| 1 | Go Runtime 定义 trace Run/Event 数据结构 | 已完成 |
| 2 | Go Runtime 记录工具执行事件 | 已完成 |
| 3 | Go Runtime JSON 输出包含 trace 字段 | 已完成 |
| 4 | C# Domain 定义 `AgentTraceEvent` | 已完成 |
| 5 | C# `TaskService` 维护任务级内存 trace | 已完成 |
| 6 | C# 新任务自动记录 `task.created` | 已完成 |
| 7 | C# API 支持 `GET /tasks/{id}/trace` 查询 trace | 已完成 |
| 8 | C# API 支持 `POST /tasks/{id}/trace` 追加 trace | 已完成 |
| 9 | C# 执行链路写入 `execution.*` 与 `tool.*` trace | 已完成 |
| 10 | C# trace 支持 JSON 文件轻量持久化 | 已完成 |
| 11 | C# API 支持 `GET /tasks/{id}/trace/export` 导出 trace | 已完成 |

## 阶段状态

| 阶段 | 验收主题 | 状态 | 主要产出 |
| --- | --- | --- | --- |
| 第一期 | 基础工程可运行 | 已完成 | Go 只读工具与 trace、C# 任务基础模型、Rust 基础解析函数。 |
| 第二期 | 端到端 Agent MVP 基础 | 已完成 | C# 查询/审批/状态流转、Go JSON 输出、Rust 扫描与关键字统计、CI。 |
| 第三期 | 可观测执行链路 | 已完成 | C# trace 查询/追加/执行入口、Go 统一工具接口、Rust CLI/JSON 输出、两个 eval 复盘模板。 |
| 第四期 | 可持续内部试点 | 已完成 | JSON 文件持久化、trace 导出接口、指标同步。 |

## 缺口

- 真实 eval 实验尚未完成：当前有 5 个案例模板和 2 个复盘模板，但缺少真实日志、真实 PR diff、真实耗时、人工复核结论和最终评分。
- AI 效率收益不可计算：人工基线耗时、AI 辅助耗时、Prompt 轮次、返工次数和质量评分均未形成样本。
- trace 轻量持久化和导出已完成，但尚未升级为数据库、审计查询或跨进程关联。
- 工具链仍以只读为主：当前可调用工具覆盖读文件、Git diff、代码扫描、日志摘要；更完整的上下文检索尚未实现。
- API 真实集成链路仍需验证：C# 能触发 Go/Rust 命令，但第三期报告也注明真实进程执行链路仍需在更完整集成环境中持续验证。

## 下一步

1. 用 `case-004-log-analysis` 和 `case-005-pr-review` 各完成 1 次真实样本实验，补齐人工耗时、AI 辅助耗时、Prompt 轮次、人工修正次数和最终评分。
2. 基于已完成的 trace JSON 持久化继续补充真实样本和导出复盘流程。
3. 用新增的 Git diff 只读工具支撑 PR Review eval case 的真实复盘。
4. 把 `reports/baseline-report.md` 和 `reports/ai-coding-practice-report.md` 从模板推进为至少 2 条样本记录。
5. 在 CI 中保持三条测试线，并在后续新增工具时补充对应测试。
