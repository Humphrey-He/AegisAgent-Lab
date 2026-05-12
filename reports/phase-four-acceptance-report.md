# 第四期开发验收报告

## 1. 验收结论

第四期核心开发目标已完成。

本期将 C# API 的任务和 trace 从纯内存能力推进到轻量 JSON 文件持久化，并新增 trace 导出接口。

## 2. 完成内容

### 2.1 轻量持久化

完成能力：

- 新增 `ITaskStore`。
- 新增 `JsonFileTaskStore`。
- 新增 `InMemoryTaskStore`，用于测试和默认兼容。
- `TaskService` 支持从 store 加载任务和 trace。
- `TaskService` 在创建、更新和追加 trace 时自动保存。

### 2.2 trace 导出

新增接口：

```text
GET /tasks/{id}/trace/export
```

导出内容：

- 任务 ID
- 输入内容
- 任务状态
- 风险等级
- 审批状态
- trace 事件列表

### 2.3 指标变化

- 自动化测试数量增加。
- trace 持久化从 `0` 变为 `1`。
- trace 导出格式从 `0` 变为 `1`。

## 3. 验收命令

```bash
cd agent-service/csharp-api
dotnet test AgentService.slnx

cd ../go-runtime
go test ./...

cd ../rust-tools
cargo test
```

## 4. 尚未完成

- 真实 eval 样本采集仍未完成。
- 仍未引入数据库。
- 仍未接入真实模型。
- 仍未实现用户认证和权限系统。

## 5. 下一步

第五期应优先采集真实样本：

- `case-004-log-analysis`
- `case-005-pr-review`

并补齐：

- 人工基线耗时。
- AI 辅助耗时。
- Prompt 轮次。
- 人工修正次数。
- 质量评分。
