# Open Prompt Compare

Prompt 工程工作台：支持 Prompt 版本管理，跨模型、跨版本、跨测试集对比 LLM 输出，内置自动评测与人工评分。

## 功能特性

- **项目管理** — 按项目组织 Prompt、测试集和运行记录
- **Prompt 版本控制** — 模板编辑、版本保存、版本间 Diff 对比
- **变量模式** — 定义 `{{variable}}` 模板变量，支持类型和必填校验
- **Playground** — 在 Prompt 编辑页直接选择模型运行，实时调试模板效果
- **测试集管理** — 创建测试集与测试用例，定义输入变量和期望输出
- **批量运行** — 选择多个 Prompt 版本 × 多个模型 × 测试集，一键发起对比实验
- **实时进度** — 通过 WebSocket 实时推送运行进度和输出结果
- **对比矩阵** — 按用例 × 版本 × 模型展示输出矩阵，一目了然
- **自动评测** — 内置 Judge 模板，由 LLM 自动打分（0-10 分）
- **人工评分** — 在对比矩阵中直接编辑人工分数
- **模型配置** — 支持 OpenAI 兼容接口和自定义 HTTP 接口，API Key 加密存储
- **用户权限** — 用户注册/登录、项目和模型访问控制、管理员角色
- **面包屑导航** — 清晰的页面层级导航，一键返回上级

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 + Monaco Editor |
| 状态管理 | Zustand |
| 后端 | FastAPI + SQLAlchemy (async) + Pydantic v2 |
| 数据库 | SQLite (aiosqlite)，开箱即用 |
| 实时通信 | WebSocket |
| 包管理 | uv (后端) + npm (前端) |

## 快速开始

### 前置要求

- Python ≥ 3.13
- Node.js ≥ 18
- [uv](https://docs.astral.sh/uv/) (Python 包管理器)

### 安装

```bash
git clone https://github.com/ZhaoQi0202/open-prompt-compare.git
cd open-prompt-compare

# 安装前端依赖
npm install
npm --prefix frontend install

# 安装后端依赖
cd backend
uv sync
cd ..
```

### 配置

在 `backend/` 目录下创建 `.env` 文件：

```env
ENCRYPTION_KEY=your-secret-key-here
```

可选配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENCRYPTION_KEY` | API Key 加密密钥（必填） | - |
| `JWT_SECRET` | JWT 签名密钥 | 由 ENCRYPTION_KEY 派生 |
| `DATABASE_URL` | 数据库连接字符串 | `sqlite+aiosqlite:///./data/db.sqlite` |
| `AUTH_DISABLED` | 禁用认证（开发用） | `false` |

### 启动

```bash
npm run dev
```

同时启动前端 (http://127.0.0.1:5173) 和后端 (http://127.0.0.1:8000)。

首次启动自动创建管理员账号：`admin` / `admin`。

## 项目结构

```
open-prompt-compare/
├── frontend/                # React 前端
│   └── src/
│       ├── api/             # API 客户端
│       ├── components/      # 通用组件（AppLayout、CompareMatrix 等）
│       ├── pages/           # 页面组件
│       └── stores/          # Zustand 状态管理
├── backend/                 # FastAPI 后端
│   └── app/
│       ├── routers/         # API 路由
│       ├── schemas/         # Pydantic 数据模型
│       ├── services/        # 业务逻辑（LLM 网关、模板引擎、评测引擎）
│       └── db/              # 数据库模型
└── package.json             # 根项目脚本（concurrently 启动前后端）
```

## 许可证

MIT
