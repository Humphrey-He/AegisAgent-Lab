# 第五期开发规划：只读项目浏览与 UI 预览

## 1. 背景

当前 AegisAgent Lab 已经具备任务创建、AI 建议、只读工具执行、Trace 记录、执行报告生成等能力。但用户仍然会遇到一个关键问题：

```text
Agent 说它读了文件、扫描了目录、生成了报告，但用户看不到项目里的真实文件和界面。
```

这会导致两个体验缺口：

- 工具结果以 JSON 为主，非技术用户很难判断 Agent 读了什么。
- 前端管理台不能预览项目 UI，用户无法在一个工作台里完成“任务 -> 查看代码/文档 -> 查看界面 -> 复盘结果”的闭环。

因此第五期建议新增“只读项目浏览与 UI 预览”，让用户能够直接在管理台内查看项目文件、文档、代码片段和运行中的前端页面。

## 2. 产品定位

第五期不是做完整 IDE，也不是做自动改代码平台。

本期定位是：

```text
给 AI Agent 工作台补上只读可视化能力。
```

用户应该能回答三个问题：

1. Agent 读取或扫描的是哪些文件？
2. 文件内容、Markdown 文档、代码片段能否直接预览？
3. 当前前端页面或本地服务长什么样？

## 3. 目标用户

### 3.1 项目负责人

需要快速查看项目状态、文档质量、管理台界面和执行报告，不希望打开多个工具窗口。

### 3.2 开发者

需要在 Agent 给出建议后，快速查看相关文件内容、目录结构、代码片段和 UI 效果。

### 3.3 AI 工程化推进者

需要验证 Agent 的工具调用是否真实、有证据、可复盘，并把 Trace、文件预览、报告串起来。

## 4. 本期目标

第五期目标是把当前系统从“可执行任务”推进到“可查看上下文”。

核心交付：

- 新增后端只读 Workspace API。
- 新增前端“项目浏览”页面。
- 支持文件树、文件内容预览、Markdown 预览、代码预览。
- 支持从工具结果跳转到文件预览。
- 新增前端“UI 预览”页面。
- 支持输入本地/远程预览 URL，用 iframe 展示页面。
- 支持桌面、平板、手机尺寸切换。

## 5. 功能范围

### 5.1 项目浏览

页面名称建议：

```text
项目浏览 / Workspace
```

侧边栏新增入口：

```text
Workspace
```

功能：

- 展示项目目录树。
- 支持按扩展名过滤，例如 `md`、`cs`、`ts`、`tsx`、`go`、`rs`、`json`。
- 点击文件后读取内容。
- 文件内容只读展示。
- 支持 Markdown 渲染和源码展示。
- 支持复制文件相对路径。
- 支持复制文件内容。
- 对超大文件做大小限制和提示。
- 对二进制文件拒绝预览。

推荐默认展示：

```text
README.md
docs/
frontend-admin/src/
agent-service/csharp-api/
agent-service/go-runtime/
agent-service/rust-tools/
reports/
```

### 5.2 文件预览类型

#### Markdown

适用扩展：

```text
.md
```

展示：

- 标题
- 段落
- 列表
- 代码块
- 表格

MVP 可以先做轻量 Markdown 渲染；如果不引入渲染库，也可以先用安全的纯文本预览。

#### 代码

适用扩展：

```text
.cs
.ts
.tsx
.js
.go
.rs
.json
.css
.html
```

展示：

- 等宽字体
- 行号
- 文件路径
- 复制按钮

MVP 不强制语法高亮。后续可接入 `shiki` 或 `highlight.js`。

#### 普通文本

适用扩展：

```text
.txt
.log
.yaml
.yml
.toml
```

展示：

- 文本内容
- 最大大小限制
- 只读提示

### 5.3 UI 预览

页面名称建议：

```text
UI 预览 / Preview
```

功能：

- 输入预览地址，例如：

```text
http://localhost:5173
http://localhost:5174
http://127.0.0.1:5173
```

- iframe 内嵌展示。
- 一键刷新。
- 打开新窗口。
- 设备尺寸切换：

```text
Desktop: 1440px
Tablet: 768px
Mobile: 390px
```

- 显示当前 URL。
- 显示只读说明。

注意：

```text
UI 预览只负责展示页面，不自动点击、不自动登录、不自动执行写操作。
```

## 6. 后端 API 规划

### 6.1 列出文件

```http
GET /workspace/files?root=docs&ext=md
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| root | string | 否 | 相对项目根目录的扫描目录 |
| ext | string | 否 | 扩展名过滤，不带点 |
| maxDepth | number | 否 | 最大扫描深度，默认 4 |

返回示例：

```json
{
  "root": "docs",
  "files": [
    {
      "path": "docs/frontend-admin-product-plan.md",
      "name": "frontend-admin-product-plan.md",
      "extension": "md",
      "sizeBytes": 12400,
      "updatedAt": "2026-05-13T10:00:00Z"
    }
  ]
}
```

### 6.2 读取文件

```http
GET /workspace/file?path=README.md
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| path | string | 是 | 相对项目根目录的文件路径 |

返回示例：

```json
{
  "path": "README.md",
  "name": "README.md",
  "extension": "md",
  "sizeBytes": 3600,
  "content": "# AegisAgent Lab\n...",
  "isBinary": false
}
```

### 6.3 获取工作区配置

```http
GET /workspace/config
```

返回示例：

```json
{
  "workspaceRoot": "C:\\Users\\Administrator\\Documents\\New project",
  "maxFileSizeBytes": 262144,
  "allowedExtensions": ["md", "cs", "ts", "tsx", "go", "rs", "json", "css", "html", "txt", "log", "toml", "yaml", "yml"]
}
```

## 7. 安全边界

第五期必须保持只读。

### 7.1 禁止能力

- 不允许写文件。
- 不允许删除文件。
- 不允许移动文件。
- 不允许执行任意命令。
- 不允许浏览项目根目录之外的文件。
- 不允许读取 `.env`、密钥文件、证书文件。
- 不允许预览二进制文件。
- 不允许通过 UI 预览自动点击页面。

### 7.2 路径安全

后端必须做路径校验：

- 所有路径都必须是相对路径。
- 禁止 `..` 越权访问。
- 解析后的绝对路径必须位于项目根目录内。
- 文件读取前检查扩展名白名单。
- 文件大小超过限制时返回提示，不返回内容。

建议默认限制：

```text
maxFileSizeBytes = 256 KB
maxDepth = 4
```

## 8. 前端页面规划

### 8.1 Workspace 页面

布局：

```text
左侧：目录/文件列表
右侧：文件预览
顶部：过滤器、刷新、复制路径
```

关键状态：

- 未选择文件
- 文件加载中
- 文件读取成功
- 文件过大
- 文件类型不支持
- 路径非法
- 后端不可用

### 8.2 Preview 页面

布局：

```text
顶部：URL 输入框、刷新、打开新窗口、设备尺寸切换
主体：iframe 预览区域
底部：只读说明和当前状态
```

设备模式：

| 模式 | 宽度 | 用途 |
| --- | --- | --- |
| Desktop | 1440px | 桌面管理台 |
| Tablet | 768px | 平板布局 |
| Mobile | 390px | 手机布局 |

## 9. 与现有功能的联动

### 9.1 与任务详情联动

任务详情页的工具结果中，如果出现文件路径：

```text
README.md
docs/xxx.md
frontend-admin/src/App.tsx
```

可以提供：

```text
打开文件预览
```

点击后跳转到 Workspace 页面并读取对应文件。

### 9.2 与执行报告联动

执行报告中可以追加：

```text
关联文件：
- README.md
- docs/frontend-admin-product-plan.md
```

后续可在报告中生成可点击的文件预览入口。

### 9.3 与 AI 规划联动

AI 规划如果输出：

```json
{
  "execution_request": {
    "readFilePath": "README.md",
    "scanRoot": "docs",
    "scanExtension": "md"
  }
}
```

前端可以同时：

- 自动填充只读执行参数。
- 在 Workspace 中高亮相关文件或目录。

## 10. MVP 交付清单

### 后端

- `GET /workspace/config`
- `GET /workspace/files`
- `GET /workspace/file`
- 路径越权测试
- 文件大小限制测试
- 扩展名过滤测试

### 前端

- 侧边栏新增 `Workspace`
- 侧边栏新增 `Preview`
- Workspace 文件列表
- 文件内容预览
- Markdown/代码/文本基础展示
- 复制路径
- 复制内容
- Preview URL 输入
- iframe 预览
- 设备尺寸切换
- 刷新预览

### 文档

- 更新 `docs/frontend-admin-product-plan.md`
- 新增或更新验收报告
- 更新 `reports/metrics-summary.md` 中的接口数和页面数

## 11. 验收标准

```text
1. 用户可以在管理台打开 README.md。
2. 用户可以浏览 docs/ 下的 Markdown 文档。
3. 用户可以浏览 frontend-admin/src/App.tsx 等代码文件。
4. 用户无法读取项目根目录之外的文件。
5. 用户无法读取超出大小限制的文件内容。
6. 用户可以输入 http://localhost:5173 并在 iframe 中预览前端页面。
7. 用户可以切换桌面、平板、手机预览宽度。
8. 所有新增 API 都有测试。
9. 前端 build 和 lint 通过。
10. 不新增任何写文件、删文件、执行任意命令的能力。
```

## 12. 建议排期

### Week 1：Workspace API

- 实现工作区根目录解析。
- 实现文件列表 API。
- 实现文件读取 API。
- 添加路径安全测试。

### Week 2：Workspace 前端

- 新增侧边栏入口。
- 文件列表和预览区域。
- Markdown/代码/文本基础展示。
- 复制路径和复制内容。

### Week 3：UI Preview

- 新增 Preview 页面。
- URL 输入和 iframe 展示。
- 设备尺寸切换。
- 刷新和新窗口打开。

### Week 4：联动与验收

- 任务详情工具结果跳转文件预览。
- 执行报告追加关联文件。
- 更新 metrics 和验收报告。
- 跑通完整演示链路。

## 13. 后续增强

第五期之后可以考虑：

- 代码语法高亮。
- 文件树目录折叠。
- 搜索文件名。
- 搜索文件内容。
- 从 Trace 事件直接跳转文件。
- Playwright 截图预览。
- UI 预览截图保存到报告。
- 只读终端输出查看。

但这些都不应进入第五期 MVP，避免范围膨胀。

