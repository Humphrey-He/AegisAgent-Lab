# Cloud AI MVP 功能缺口清单

统计日期：2026-05-13

## 当前现状

AegisAgent Lab 已经具备：

- C# API 任务、审批、执行和 trace。
- Go / Rust 只读工具链。
- 前端管理台。
- Skill 本地目录保存。

但当前没有：

- 云模型客户端。
- API Key / Endpoint 配置读取。
- 模型调用 trace。
- 任务规划接口。
- 前端模型测试入口。

## 缺口表

| 编号 | 缺口 | 当前影响 | MVP 处理 |
| --- | --- | --- | --- |
| G1 | 无模型配置 | 不能配置云 AI endpoint 和 key | 新增环境变量读取 |
| G2 | 无模型客户端 | 后端不能调用云模型 | 新增 OpenAI-compatible client |
| G3 | 无密钥治理 | 若放前端会泄漏 API Key | Key 仅在后端环境变量中读取 |
| G4 | 无模型测试接口 | 无法确认配置是否可用 | 新增 `POST /models/test` |
| G5 | 无任务规划接口 | AI 输出无法进入任务闭环 | 新增 `POST /tasks/{id}/plan` |
| G6 | trace 无模型事件 | 调用过程不可审计 | 新增 `model.*` trace |
| G7 | 前端无模型入口 | 用户无法操作模型能力 | 新增 AI Panel |
| G8 | 无失败提示 | 配置错时难排查 | 返回结构化错误并写 trace |
| G9 | 无 token / cost 统计 | 无法评估成本 | MVP 仅保留响应字段，后续补 usage |
| G10 | 无多 provider 抽象 | 难扩展非 OpenAI 协议 | MVP 先按 OpenAI-compatible 抽象 |

## MVP 后仍存在的缺口

- API Key 仍依赖环境变量，不支持团队级密钥轮换。
- 不支持流式响应。
- 不支持 tool calling 自动编排。
- 不支持模型自动选择。
- 不支持成本仪表盘。
- 不支持 prompt / response 全量审计脱敏策略。
- 不支持用户级访问控制。

## 风险与约束

- API Key 不得返回给前端。
- trace 不得写入明文 API Key。
- 模型规划只是建议，不自动执行高风险动作。
- 中高风险任务仍必须遵守审批状态。
- 本期接口面向本地或内网试点，不是生产多租户服务。

## 推荐后续阶段

1. 增加 `GET /models/providers`，支持多个 provider profile。
2. 增加模型调用 usage 统计和成本估算。
3. 增加 prompt 模板选择。
4. 增加工具调用规划，但仍需审批。
5. 增加密钥加密存储或接入企业 Secret Manager。
