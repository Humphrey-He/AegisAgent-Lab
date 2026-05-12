# Agent 基础架构

## 目标

构建一个后端研发助手 Agent 的最小可用架构，支持自然语言任务输入、上下文检索、工具调用、结构化输出、执行 trace 和人工确认。

## MVP 能力

- 接收研发任务
- 识别任务类型
- 检索项目上下文
- 路由到可用工具
- 执行只读或低风险工具
- 校验输出结构
- 记录执行轨迹
- 对高风险动作要求人工确认

## 架构图

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

## 模块说明

### API Layer

负责接收任务请求，返回任务结果或任务状态。C# API 服务优先承担该职责。

### Task Planner

负责将用户输入拆解为可执行步骤。初期可以先使用规则和 Prompt，后续再引入更复杂的 planner。

### Context Retriever

负责读取项目文档、代码摘要、日志片段或评估案例。默认只读。

### Tool Router

根据任务类型选择工具，例如 Git 查询、文件检索、日志解析、测试执行。

### Tool Executor

执行具体工具。Go runtime 适合承担工具调用网关职责，Rust 适合承担本地索引和安全解析职责。

### Output Validator

对 Agent 输出进行结构化校验，避免返回不可用、不可解析或缺少关键信息的结果。

### Trace Logger

记录每次任务的输入、步骤、工具调用、耗时、错误和最终结果。

### Human Approval

高风险动作必须进入人工确认流程。默认阶段不允许 Agent 自动执行写操作。

## 工具分级

### 低风险工具

- 读取文件
- 查询 Git diff
- 解析日志
- 查询测试结果
- 读取文档

### 中风险工具

- 运行测试命令
- 生成代码草稿
- 生成数据库变更建议

### 高风险工具

- 修改代码
- 执行数据库写操作
- 修改配置
- 发布部署
- 调用外部系统写接口

MVP 阶段默认只实现低风险工具。

## 语言分工

### Go

目录：`agent-service/go-runtime`

职责：

- CLI 入口
- 工具注册
- 工具路由
- trace 数据结构
- 本地命令封装

### C#

目录：`agent-service/csharp-api`

职责：

- HTTP API
- 任务管理
- 权限模型
- 执行记录
- 团队化接口

### Rust

目录：`agent-service/rust-tools`

职责：

- 代码索引
- 日志解析
- 沙箱执行原型
- 高可靠本地组件

## MVP 验收标准

- 能创建一个任务请求
- 能调用至少一个只读工具
- 能返回结构化结果
- 能记录 trace
- 能拒绝高风险动作
