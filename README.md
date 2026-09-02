# BOPET 企业数据管理与分析平台

BOPET（双向拉伸聚酯薄膜）企业数据管理与分析平台，用于高效处理业务数据记录、问题追踪、质量改进和数据分析。

## 技术栈

- **前端框架**: [Nuxt 3](https://nuxt.com/) + Vue 3
- **UI 组件**: [Naive UI](https://www.naiveui.com/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **数据库**: SQLite (默认) / PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **图表**: [ECharts](https://echarts.apache.org/)
- **状态管理**: Pinia

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 一键启动（推荐）

只需两步：

```bash
# 1. 安装依赖
npm install

# 2. 启动（二选一）
npm run dev      # 开发模式（热更新，默认端口 3100）
npm run start    # 生产模式（无构建产物时自动 build，默认端口 3001）
```

启动脚本会自动完成以下检查，缺什么补什么：

1. `.env` / `.env.production` 缺失时自动创建（生产环境额外默认 `HOST=0.0.0.0`、`PORT=3001`）
2. 依据 `PRISMA_DB_PROVIDER` 生成 `prisma/schema.prisma`
3. `prisma db push` 同步数据库结构（幂等，未变化时秒级完成）
4. Prisma Client 缺失时自动生成
5. 数据库为空时自动写入种子数据（已有数据则跳过）
6. 生产模式：`.output` 构建产物缺失时自动执行 `npm run build`
7. 按 `HOST:PORT` 配置启动服务，默认监听 `0.0.0.0`，**局域网/外网可直接访问**

### 端口与网络配置

在 `.env`（开发）或 `.env.production`（生产）中修改：

```bash
HOST=0.0.0.0    # 监听所有网络接口，局域网/外网可访问；改为 127.0.0.1 则仅本机可访问
PORT=3100       # 端口号（生产环境默认 3001）
```

### Windows 双击启动

- `dev.bat` — 一键开发模式（依赖缺失时自动 npm install）
- `start.bat` — 一键生产模式（依赖缺失时自动 npm install，产物缺失时自动 build）

### 其他常用命令

```bash
npm run init        # 手动完整初始化数据库（等价于启动时的自动检查）
npm run db:reset    # 删除 SQLite 数据库，下次启动自动重建 + 重新 seed
npm run dev:fresh   # 重置数据库并一键启动开发模式
npm run db:studio   # 打开 Prisma Studio 数据库管理界面
```

## 默认账号

| 角色       | 用户名    | 密码         |
| ---------- | --------- | ------------ |
| 超级管理员 | admin     | admin123     |
| 部门管理员 | deptadmin | deptadmin123 |
| 普通用户   | operator  | operator123  |
| 质检员     | quality   | quality123   |

## 可用脚本

| 命令                  | 说明                              |
| --------------------- | --------------------------------- |
| `npm run dev`         | 启动开发服务器                    |
| `npm run dev:init`    | 初始化数据库并启动开发服务器      |
| `npm run dev:fresh`   | 重置数据库并启动开发服务器        |
| `npm run build`       | 构建生产版本                      |
| `npm run start`       | 启动生产服务器                    |
| `npm run db:generate` | 生成 Prisma Client                |
| `npm run db:push`     | 同步数据库结构                    |
| `npm run db:seed`     | 导入初始数据                      |
| `npm run db:studio`   | 打开 Prisma Studio 数据库管理界面 |
| `npm run db:reset`    | 重置数据库（删除所有数据）        |

## 项目结构

```
bopet-eda-platform/
├── pages/              # 页面组件
│   ├── datas/          # 数据管理页面
│   ├── config/         # 配置管理页面
│   ├── stats/          # 统计分析页面
│   └── ...
├── server/             # 后端 API
│   ├── api/            # API 路由
│   └── utils/          # 工具函数
├── prisma/             # 数据库相关
│   ├── schema.prisma   # 数据库模型定义
│   └── seed.ts         # 初始数据脚本
├── components/         # 公共组件
├── layouts/            # 布局组件
├── stores/             # Pinia 状态管理
├── init.bat            # 一键初始化脚本
├── start.bat           # 一键启动脚本（生产模式）
└── dev.bat             # 一键启动脚本（开发模式）
```

## 功能模块

### 数据管理

- 数据记录创建、编辑、删除
- 数据列表查询、筛选、排序
- 数据详情查看
- 数据导出（CSV）
- 打印功能

### 配置管理

- 产线管理
- 客户管理
- 产品型号管理
- 责任部门管理
- 责任工序管理

### 统计分析

- 数据概览（总数、本月新增、待处理、已关闭）
- 趋势分析（按月统计）
- 多维度数据可视化：
  - 产线分布
  - 客户分布
  - 产品型号分布
  - 责任部门分布
  - 责任工序分布

### 表单模板

- 自定义表单模板
- 部门专属模板
- 动态字段配置

## 数据库

默认使用 SQLite 数据库，数据文件位于 `data/data.db`。

如需切换到 PostgreSQL，请修改 `.env` 文件中的 `DATABASE_URL`。

## 部署

### 本地部署

```bash
npm run build
npm run start
```

### Vercel 部署

```bash
npm run deploy:vercel
```

## 开发指南

### API 测试

项目包含 API 测试脚本：

```bash
# 测试所有 API 端点
node test-api.js

# 测试统计 API 数据
node test-stats.js
```

## 许可证

MIT
