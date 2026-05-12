# 前端管理台产品规划文档

## 1. 产品定位

前端管理台是 AegisAgent Lab 的内部试点操作界面，用于把当前后端 Agent MVP 的任务、工具、trace、指标和评估案例集中呈现出来。

当前项目已经具备：

- C# API：任务创建、查询、审批、执行、trace 查询、trace 导出。
- Go Runtime：`read_file`、`git_diff` 只读工具。
- Rust Tools：`code-indexer scan`、`log-parser summarize`。
- Reports：阶段验收报告、指标总结、Markdown 看板。

因此，前端管理台第一阶段不做复杂平台能力，优先解决三个问题：

- 让用户不用命令行也能创建、审批、执行 Agent 任务。
- 让执行 trace 可视化，方便复盘每一步工具调用。
- 让项目指标和评估成熟度可读、可追踪。

## 2. 目标用户

### 2.1 后端开发者

使用管理台提交研发任务、触发只读工具、查看执行结果和 trace。

典型场景：

- 读取项目文件。
- 查看 Git diff 摘要。
- 扫描代码文件。
- 分析日志样本。

### 2.2 技术负责人

查看阶段进度、测试健康度、工具链状态、eval 数据成熟度和风险边界。

典型场景：

- 判断项目是否可以进入团队试点。
- 查看工具调用是否符合只读边界。
- 检查 AI 效率收益是否已有真实样本。

### 2.3 AI 工程化推进者

维护 Prompt、评估案例、实验记录和指标看板。

典型场景：

- 选择 eval case 进行实验。
- 记录人工耗时、AI 辅助耗时、Prompt 轮次和质量评分。
- 根据 trace 复盘工具链效果。

## 3. MVP 范围

### 3.1 必须做

- 仪表盘首页。
- 任务列表。
- 创建任务。
- 任务详情。
- 任务审批。
- 任务执行。
- trace 时间线。
- trace JSON 导出查看。
- 工具链状态展示。
- 指标看板展示。

### 3.2 暂不做

- 登录注册。
- 多租户。
- 权限角色系统。
- 在线编辑 Prompt。
- 在线编辑 eval case。
- 自动调用真实大模型。
- 自动代码修改。
- 生产部署能力。

## 4. 页面规划

### 4.1 Dashboard 首页

目标：一眼看清项目当前状态。

展示模块：

- 阶段完成度：第一期到第四期。
- 测试健康度：Go、C#、Rust。
- 可调用工具数量。
- trace 能力状态。
- eval 数据成熟度。
- Prompt 模板数量。
- 关键风险提醒。

数据来源：

- 初期可读取静态指标文件或在前端内置当前指标。
- 后续建议新增后端接口 `GET /metrics`。

当前指标：

```text
阶段完成度：4/4
自动化测试：31
可调用工具：4
trace 能力：11
eval 真实完成：0
Prompt 模板：5
```

### 4.2 Tasks 任务列表页

目标：集中查看所有任务。

字段：

- ID。
- 输入摘要。
- RequestedBy。
- Status。
- RiskLevel。
- ApprovalStatus。
- CreatedAt。
- 操作按钮。

操作：

- 查看详情。
- 审批。
- 拒绝。
- 执行。
- 查看 trace。

后端接口：

```text
GET /tasks
POST /tasks/{id}/approve
POST /tasks/{id}/reject
POST /tasks/{id}/execute
```

### 4.3 Create Task 创建任务页

目标：提交一个 Agent 研发任务。

表单字段：

- Input：任务描述。
- RequestedBy：提交人。
- RiskLevel：Low、Medium、High。

校验：

- Input 必填。
- RequestedBy 必填。
- RiskLevel 默认 Low。

提交接口：

```text
POST /tasks
```

### 4.4 Task Detail 任务详情页

目标：查看单个任务的完整状态和操作入口。

展示：

- 任务基础信息。
- 风险等级。
- 审批状态。
- 当前状态。
- 创建时间。
- 执行参数区。
- trace 时间线。

操作：

- Approve。
- Reject。
- Execute。
- Export Trace。

后端接口：

```text
GET /tasks/{id}
GET /tasks/{id}/trace
GET /tasks/{id}/trace/export
POST /tasks/{id}/approve
POST /tasks/{id}/reject
POST /tasks/{id}/execute
```

### 4.5 Execute Task 执行面板

目标：配置一次只读工具执行。

字段：

- ReadFilePath：传给 Go `read_file`。
- IncludeGitDiff：是否执行 Go `git_diff --stat`。
- ScanRoot：传给 Rust `code-indexer scan`。
- ScanExtension：文件扩展名，默认 `rs`。
- LogFilePath：传给 Rust `log-parser summarize`。

执行接口：

```text
POST /tasks/{id}/execute
```

请求体示例：

```json
{
  "readFilePath": "go.mod",
  "includeGitDiff": true,
  "scanRoot": "crates",
  "scanExtension": "rs",
  "logFilePath": "C:\\Temp\\agent-sample.log"
}
```

执行结果展示：

- Task 状态。
- ToolResults。
- trace 新增事件。
- stdout / stderr 摘要。

### 4.6 Trace Timeline trace 时间线

目标：把原始 trace 变成可读执行过程。

事件类型：

- `task.created`
- `execution.started`
- `task.planning`
- `task.running`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `execution.blocked`
- `execution.completed`
- `execution.failed`

展示字段：

- Sequence。
- Event name。
- Tool name。
- Status。
- Message。
- OccurredAt。
- Attributes。

交互：

- 按状态筛选。
- 展开 attributes。
- 复制单条事件 JSON。
- 查看完整 trace export。

## 5. 推荐信息架构

```text
Dashboard
Tasks
  - Task List
  - Create Task
  - Task Detail
Tools
  - Tool Catalog
  - Tool Capability
Reports
  - Metrics Summary
  - Metrics Dashboard
  - Phase Reports
Eval
  - Eval Cases
  - Experiment Records
Settings
  - API Base URL
```

MVP 可以只实现：

```text
Dashboard
Tasks
Task Detail
Trace Timeline
```

## 6. 后端接口适配情况

| 功能 | 当前接口 | 是否满足 MVP |
| --- | --- | --- |
| 健康检查 | `GET /health` | 满足 |
| 任务列表 | `GET /tasks` | 满足 |
| 任务详情 | `GET /tasks/{id}` | 满足 |
| 创建任务 | `POST /tasks` | 满足 |
| 审批任务 | `POST /tasks/{id}/approve` | 满足 |
| 拒绝任务 | `POST /tasks/{id}/reject` | 满足 |
| 查询 trace | `GET /tasks/{id}/trace` | 满足 |
| 导出 trace | `GET /tasks/{id}/trace/export` | 满足 |
| 执行任务 | `POST /tasks/{id}/execute` | 满足 |
| 指标接口 | 暂无 | MVP 可先静态，后续补 `GET /metrics` |
| 工具目录接口 | 暂无 | MVP 可先静态，后续补 `GET /tools` |
| eval case 接口 | 暂无 | MVP 可先链接文档，后续补接口 |

## 7. 前端技术建议

推荐方案：

```text
Vite + React + TypeScript
```

原因：

- 启动快。
- 适合内部工具。
- TypeScript 方便约束 API 类型。
- 后续可轻量接入图表库。

UI 风格：

- 内部研发效能工具，不做营销页。
- 信息密度适中。
- 使用表格、状态标签、时间线和详情面板。
- 避免过度装饰。

推荐组件：

- 表格：任务列表、工具列表。
- 统计卡片：阶段、测试、工具、eval。
- 时间线：trace。
- 表单：创建任务、执行任务。
- JSON viewer：trace export 和 tool result。

## 8. 数据模型草案

### 8.1 AgentTask

```ts
type AgentTask = {
  id: string;
  input: string;
  requestedBy: string;
  status: "Created" | "Planning" | "Running" | "WaitingForApproval" | "Completed" | "Failed";
  createdAt: string;
  riskLevel: "Low" | "Medium" | "High";
  approvalStatus: "NotRequired" | "Pending" | "Approved" | "Rejected";
};
```

### 8.2 AgentTraceEvent

```ts
type AgentTraceEvent = {
  sequence: number;
  name: string;
  toolName: string;
  status: string;
  message: string;
  attributes: Record<string, string>;
  occurredAt: string;
};
```

### 8.3 ExecuteTaskRequest

```ts
type ExecuteTaskRequest = {
  readFilePath?: string;
  includeGitDiff: boolean;
  scanRoot?: string;
  scanExtension?: string;
  logFilePath?: string;
};
```

## 9. MVP 验收标准

前端管理台 MVP 完成后应满足：

- 能看到 Dashboard 指标。
- 能创建 Low / Medium / High 任务。
- 能查看任务列表。
- 能进入任务详情。
- 能审批或拒绝中高风险任务。
- 能配置并触发执行。
- 能看到 trace 时间线。
- 能查看 trace export JSON。
- 能清楚区分成功、失败、阻塞事件。
- 不提供任何自动代码修改或生产写操作入口。

## 10. 迭代路线

### 第 1 阶段：管理台 MVP

- Dashboard。
- 任务列表。
- 创建任务。
- 任务详情。
- 执行面板。
- trace 时间线。

### 第 2 阶段：评估数据录入

- eval case 列表。
- 实验记录表单。
- 人工耗时、AI 辅助耗时、Prompt 轮次、评分录入。
- 效率收益自动计算。

### 第 3 阶段：工具目录与指标接口

- 后端新增 `GET /tools`。
- 后端新增 `GET /metrics`。
- 前端展示工具能力、风险等级、调用次数。
- 前端展示趋势图。

### 第 4 阶段：团队试点

- 用户标识。
- 审批记录。
- trace 持久化查询优化。
- 导出报告。
- 内部使用指南。

## 11. 风险与约束

- 当前无登录系统，管理台只适合本地或内网试点。
- 当前 trace 是 JSON 文件轻量持久化，不适合高并发多人使用。
- 当前工具执行依赖本机 Go、Cargo、Git 环境。
- 当前 eval 数据尚未真实采集，Dashboard 不应展示虚假的效率收益。
- 中高风险任务必须保留审批动作，不允许前端绕过。

## 12. 下一步实施建议

优先实施前端 MVP：

```text
1. 新建 frontend-admin 项目。
2. 配置 API Base URL。
3. 实现 Dashboard 静态指标。
4. 实现 Tasks 列表和创建。
5. 实现 Task Detail。
6. 实现审批、执行和 trace 时间线。
7. 补一份 frontend-admin 使用说明。
```

同时建议后端补两个接口：

```text
GET /metrics
GET /tools
```

这样前端不需要硬编码指标和工具目录。
