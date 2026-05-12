# Frontend Admin Implementation

统计日期：2026-05-12

## 交付范围

本次根据 `docs/frontend-admin-product-plan.md` 完成前端管理台 MVP，代码位于 `frontend-admin/`。

已实现能力：

- Dashboard：展示阶段完成度、测试数、工具数、trace 能力、eval 样本和 Prompt 模板数。
- Tasks：创建任务、查看任务列表、进入任务详情。
- Approval：对中高风险任务执行 approve / reject。
- Execute：配置 `readFilePath`、`includeGitDiff`、`scanRoot`、`scanExtension`、`logFilePath` 并触发后端执行。
- Trace：展示任务 trace 时间线、状态统计、attributes 展开查看。
- Trace Export：调用 `GET /tasks/{id}/trace/export` 并展示 JSON。
- Tools：展示当前只读工具目录和能力边界。
- Docs：侧边栏新增文档中心，包含使用文档和实操手册。
- Skills：侧边栏新增 Skill 控制台，支持从线上 URL 拉取 Skill 文本、手动新建 Skill，并保存到浏览器 localStorage。
- i18n：支持中文 / English 双语言切换。
- Glossary：部分技术名词支持鼠标悬浮说明，例如 Agent、Trace、SkillHub、Risk Level、Runtime、Tool Chain、Eval、Prompt、API、CI。
- UI：整体升级为深色科幻控制台风格，包含星图背景、霓虹边框、发光状态和高对比操作区。

## 技术实现

- 前端：Vite + React + TypeScript。
- 图标：lucide-react。
- API 代理：Vite dev server 将 `/api` 代理到 `http://localhost:5055`。
- 后端契约：C# API 增加 `JsonStringEnumConverter`，确保枚举以字符串形式输出，匹配前端类型与产品文档。

## 本地启动

先启动后端：

```powershell
cd agent-service\csharp-api
dotnet run --project Agent.Api\Agent.Api.csproj --urls http://localhost:5055
```

再启动前端：

```powershell
cd frontend-admin
npm run dev
```

访问：

```text
http://127.0.0.1:5174
```

## 验证结果

已执行：

```powershell
cd frontend-admin
npm run build
npm run lint
```

结果：均通过。

CI 已新增 `Frontend Admin` job：

```text
npm ci
npm run lint
npm run build
```

## 当前边界

- 没有登录、租户、权限和审计用户体系。
- Dashboard 指标仍为前端静态数据，后续建议补 `GET /metrics`。
- Tools 目录仍为前端静态数据，后续建议补 `GET /tools`。
- 不提供自动代码修改、自动提交、部署或生产写接口。
