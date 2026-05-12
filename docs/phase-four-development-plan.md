# 第四期开发排期与交付说明

## 1. 第四期目标

第四期目标是把“可观测执行链路”推进到“可持续内部试点”。

本期优先解决两个问题：

- 任务和 trace 不再只存在于内存中。
- trace 可以通过 API 导出，便于复盘、审计和指标沉淀。

## 2. 周期安排

| 周期 | 主目标 | 交付内容 | 验收标准 |
| --- | --- | --- | --- |
| 第 1 周 | 轻量持久化 | JSON 文件任务存储、重启恢复任务和 trace | `dotnet test AgentService.slnx` 通过 |
| 第 2 周 | trace 导出 | `GET /tasks/{id}/trace/export` | API 能返回任务和 trace 快照 |
| 第 3 周 | 指标同步 | 更新 metrics summary/dashboard | 工具数、测试数、持久化、导出状态准确 |
| 第 4 周 | 真实 eval 准备 | 明确日志分析和 PR Review 的采集字段 | 后续可记录真实耗时和评分 |

## 3. 已完成能力

- 新增 `ITaskStore` 存储接口。
- 新增 `JsonFileTaskStore`。
- `TaskService` 启动时从存储加载任务和 trace。
- `TaskService` 在创建任务、更新任务、追加 trace 时自动保存。
- API 默认使用 JSON 文件保存任务数据。
- 新增 trace 导出接口：

```text
GET /tasks/{id}/trace/export
```

## 4. 不做范围

- 不引入数据库。
- 不做用户登录。
- 不做生产部署。
- 不开放写操作工具。
- 不自动调用真实模型。

## 5. 验收标准

```text
C# 测试通过
Go 测试通过
Rust 测试通过
任务和 trace 可通过 JSON 文件恢复
trace 可通过 API 导出
metrics 文件反映持久化和导出状态
```

## 6. 第五期建议

- 用真实日志样本完成 `case-004-log-analysis`。
- 用真实 PR diff 完成 `case-005-pr-review`。
- 记录人工基线耗时、AI 辅助耗时、Prompt 轮次、人工修正次数和质量评分。
- 开始计算效率收益和质量收益。
