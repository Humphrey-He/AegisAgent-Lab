# Cloud AI MVP 产品规划书

统计日期：2026-05-13

## 1. 产品目标

本期目标是在 AegisAgent Lab 中接入一个可真实调用云端 AI 的最小闭环：

```text
API Key + Endpoint 配置
→ C# API Model Gateway
→ 云端 OpenAI-compatible Chat Completions
→ 返回规划文本
→ 写入任务 trace
→ 前端可测试、可触发、可查看结果
```

本期不追求完整多模型平台，不做复杂 Agent 自主循环，不让模型自动修改代码。重点是验证：

- 后端可以安全读取 API Key。
- 前端不接触明文 API Key。
- C# API 可以调用云端模型。
- 模型输出可以沉淀到任务 trace。
- 管理台可以完成一次可演示的云 AI 调用。

## 2. 用户场景

### 2.1 开发者验证模型连通性

开发者配置环境变量后，在前端点击“测试模型”，确认 endpoint、model、key 是否可用。

### 2.2 对任务生成 AI 规划

用户创建任务后，在任务详情页点击“AI Plan”，后端调用云模型生成只读执行规划，并将结果写入 trace。

### 2.3 技术负责人审阅调用证据

负责人通过 trace 查看：

- 使用了哪个 provider / endpoint / model。
- 模型调用是否成功。
- 输出摘要是什么。
- 调用失败时失败原因是什么。

## 3. MVP 范围

### 必须做

- 后端模型配置读取：
  - `AI_PROVIDER`
  - `AI_ENDPOINT`
  - `AI_API_KEY`
  - `AI_MODEL`
- OpenAI-compatible `/chat/completions` 调用。
- 模型连通性测试接口。
- 任务规划接口。
- trace 记录模型调用事件。
- 前端 Settings / AI Panel 入口。
- 测试覆盖配置缺失、请求构造、任务 trace 写入。

### 暂不做

- 前端保存 API Key。
- 多租户密钥管理。
- 真实工具自动选择。
- 自动代码修改。
- 自动提交 Git。
- 数据库密钥加密。
- 流式输出。
- 多轮 Agent 自主执行循环。

## 4. 配置方式

使用环境变量：

```powershell
$env:AI_PROVIDER="OpenAI"
$env:AI_ENDPOINT="https://api.openai.com/v1"
$env:AI_API_KEY="sk-..."
$env:AI_MODEL="gpt-4.1-mini"
```

也兼容 OpenAI-compatible 服务：

```powershell
$env:AI_PROVIDER="OpenAICompatible"
$env:AI_ENDPOINT="https://your-provider.example.com/v1"
$env:AI_API_KEY="..."
$env:AI_MODEL="your-model"
```

## 5. 后端接口

```text
GET /models/config
POST /models/test
POST /tasks/{id}/plan
```

### `GET /models/config`

返回脱敏配置：

```json
{
  "provider": "OpenAI",
  "endpoint": "https://api.openai.com/v1",
  "model": "gpt-4.1-mini",
  "apiKeyConfigured": true
}
```

### `POST /models/test`

发送一个极小 prompt，验证云端模型可用。

### `POST /tasks/{id}/plan`

根据任务 input、risk、approval、trace 摘要生成规划文本，并写入 trace。

## 6. Trace 事件

新增事件：

```text
model.requested
model.completed
model.failed
task.ai_planned
```

trace attributes 只记录：

- provider
- model
- endpoint host
- latency_ms
- prompt_summary
- response_preview
- error

不记录 API Key。

## 7. 验收标准

- 未配置 API Key 时，`GET /models/config` 显示 `apiKeyConfigured=false`。
- 配置 API Key 后，`POST /models/test` 可真实返回模型响应。
- 对一个任务调用 `POST /tasks/{id}/plan` 后，trace 中出现 `model.*` 和 `task.ai_planned`。
- 前端可以查看配置状态、测试模型、触发任务规划。
- 所有既有测试通过。
