# 第五期验收报告：只读项目浏览与 UI 预览

## 交付概览

第五期完成了“只读项目浏览与 UI 预览”MVP，把 AegisAgent Lab 从任务执行台推进为可以查看项目上下文的 Agent 工作台。

本期新增：

- Workspace 只读文件浏览 API。
- Workspace 前端页面。
- 文件列表、文件内容预览、Markdown/代码/文本展示。
- UI Preview 页面。
- iframe 页面预览、刷新、新窗口打开、桌面/平板/手机宽度切换。
- 第五期规划文档。

## 后端接口

```text
GET /workspace/config
GET /workspace/files?root=&ext=&maxDepth=
GET /workspace/file?path=
```

安全边界：

- 只允许相对 workspace root 的路径。
- 拒绝绝对路径和 `..` 越权路径。
- 解析后仍校验必须位于 workspace root 内。
- 默认最大读取大小为 `262144` bytes。
- 跳过 `.git`、`bin`、`obj`、`node_modules`。
- 拒绝 `.env`、密钥、证书/凭证命名倾向的敏感文件。
- 只读，不写文件，不执行命令。

## 前端页面

### Workspace

功能：

- 按目录和扩展名查询文件。
- 显示 workspace root 和读取限制。
- 点击文件读取内容。
- 支持复制文件路径。
- 支持复制文件内容。
- Markdown 文件基础渲染。
- 代码和普通文本按行号预览。

### Preview

功能：

- 输入预览 URL。
- iframe 内嵌预览。
- 刷新预览。
- 新窗口打开。
- Desktop / Tablet / Mobile 宽度切换。
- 明确只读说明：不自动点击、不自动登录、不执行写操作。

## 测试结果

```text
npm run build
通过

npm run lint
通过

dotnet test AgentService.slnx
通过：31
失败：0
跳过：0

go test ./...
通过

cargo test
通过
```

## 已知限制

- Markdown 渲染为轻量 MVP，尚未支持完整 GFM 表格和复杂语法。
- 代码预览暂未接入语法高亮。
- UI Preview 依赖目标页面允许被 iframe 加载。
- 尚未实现从 Trace 事件一键跳转 Workspace 文件。
- 尚未保存 UI 预览截图到执行报告。

## 下一步建议

1. 在任务详情的工具结果中识别文件路径并跳转 Workspace。
2. 为代码预览接入语法高亮。
3. 为 UI Preview 增加截图保存能力。
4. 将执行报告中的关联文件变为可点击入口。
5. 更新 metrics，把 Workspace API、页面数、测试数沉淀到看板。

