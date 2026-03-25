# 导航优化 + Playground + 运行链路修通 设计文档

日期：2026-03-25

## 背景

Open Prompt Compare 项目后端已具备完整的 LLM 调用能力（LLMGateway、TaskRunner、JudgeEngine），但前端存在以下问题：
- 项目子页面没有返回项目列表的导航
- 运行相关功能缺少入口
- 没有快速调试 prompt 的 Playground
- 运行链路（NewRun → Progress → Compare）未验证是否可用

## 范围

四个模块，按优先级排列：

1. 面包屑导航
2. 运行入口补齐
3. Playground（嵌入提示词编辑页）
4. 检查并修通运行链路

## 1. 面包屑导航

### 改动文件
- `frontend/src/components/AppLayout.tsx`

### 设计
在 AppLayout 内容区顶部渲染 Ant Design `Breadcrumb`，根据 `useLocation` + `useParams` 解析路由。

层级映射：
| 路由 | 面包屑 |
|------|--------|
| `/projects` | 项目 |
| `/projects/:id` | 项目 / {项目名} |
| `/projects/:id/prompts/:pid` | 项目 / {项目名} / 提示词: {名称} |
| `/projects/:id/test-suites` | 项目 / {项目名} / 测试集管理 |
| `/projects/:id/new-run` | 项目 / {项目名} / 新建运行 |
| `/projects/:id/runs` | 项目 / {项目名} / 运行历史 |
| `/projects/:id/runs/:rid` | 项目 / {项目名} / 运行 #{rid} |
| `/projects/:id/runs/:rid/compare` | 项目 / {项目名} / 运行 #{rid} / 对比 |

项目名和 prompt 名通过 API 调用获取（可缓存）。每个层级可点击跳转。

## 2. 运行入口补齐

### 改动文件
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/RunProgressPage.tsx`
- `frontend/src/components/AppLayout.tsx`

### 设计

**ProjectOverviewPage：**
- 「运行记录」Tab 顶部加「新建运行」按钮 → `/projects/:id/new-run`
- 「运行记录」Tab 顶部加「查看全部」按钮 → `/projects/:id/runs`
- 运行记录表格增加「名称」列，行可点击 → `/projects/:id/runs/:rid`

**RunProgressPage：**
- 运行完成后显示「查看对比」按钮 → `/projects/:id/runs/:rid/compare`

**AppLayout 侧栏：**
当处于 `/projects/:id/...` 子路由时，「项目」菜单下方动态展示子导航：
- 概览 → `/projects/:id`
- 测试集管理 → `/projects/:id/test-suites`
- 新建运行 → `/projects/:id/new-run`
- 运行历史 → `/projects/:id/runs`

## 3. Playground

### 改动文件
- `frontend/src/pages/PromptEditorPage.tsx`（左右分栏 + 右侧面板）
- `backend/app/routers/playground.py`（新文件）
- `backend/app/main.py`（注册路由）
- `frontend/src/api/playground.ts`（新文件）

### 后端接口

`POST /api/playground/run`

请求体：
```json
{
  "template_content": "string",
  "variables": { "key": "value" },
  "model_config_id": 1
}
```

响应体：
```json
{
  "output": "string",
  "latency_ms": 1234,
  "tokens_used": 56
}
```

实现：使用 `TemplateEngine.render()` 渲染模板 + `LLMGateway.call()` 调用模型。同步返回，不创建 TestRun 记录。需要认证，需要用户对 model_config 有访问权限。

### 前端面板

PromptEditorPage 改为左右分栏布局：
- 左侧：现有编辑器 + 变量 schema + 版本列表
- 右侧：Playground 面板（可折叠）

面板内容（从上到下）：
1. 模型选择下拉（从 `/api/model-configs` 拉取）
2. 变量表单（根据 `variables_schema` 自动生成）
3. 运行按钮（loading 状态）
4. 结果展示区（输出文本 markdown 渲染、耗时、token 数、复制按钮）
5. 历史记录（最近 5 次折叠展示）

关键决策：
- 使用编辑器当前内容，不要求先保存
- 不写入数据库，纯临时调试
- 同步 HTTP 调用，不用 WebSocket

## 4. 检查并修通运行链路

### 验证范围
- `NewRunPage`：表单是否正确提交（注意 destroyOnHidden 问题）、API 调用参数
- `RunProgressPage`：WebSocket 连接（确认 vite proxy 配置）、进度展示、取消功能
- `RunComparePage`：数据加载、CompareMatrix / JudgePanel 渲染
- 后端 `runs.py`：create_run → TaskRunner.start_run → WebSocket broadcast

### 原则
- 只修前端入口/连接/展示问题
- 不改变 TaskRunner / JudgeEngine 后端逻辑
- 不改变数据模型

## 不做的事

- 不支持 Playground 多模型并行（后续迭代）
- 不支持 Playground 流式输出（后续迭代）
- 不改变现有数据模型
- 不重构后端运行逻辑
