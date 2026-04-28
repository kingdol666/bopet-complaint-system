# BOPET 客诉闭环管理系统

BOPET（双向拉伸聚酯薄膜）客诉闭环管理系统，用于高效处理客户投诉、问题追踪、质量改进和数据分析。

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

### 方式一：一键运行（推荐）

#### 首次运行

双击运行 `init.bat`，脚本将自动完成以下步骤：

1. 检查 Node.js 环境
2. 安装项目依赖
3. 创建 `.env` 配置文件
4. 初始化数据库并导入初始数据
5. 构建项目

```bash
# 或者在命令行中运行
.\init.bat
```

#### 日常启动

双击运行 `start.bat`，脚本将自动检查环境并启动开发服务器。

```bash
# 或者在命令行中运行
.\start.bat
```

### 方式二：手动运行

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

```bash
# 复制环境配置文件
copy .env.example .env
```

#### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 同步数据库结构
npm run db:push

# 导入初始数据
npm run db:seed
```

#### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动。

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |
| 普通用户 | user1 | user123 |

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run dev:init` | 初始化数据库并启动开发服务器 |
| `npm run dev:fresh` | 重置数据库并启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 同步数据库结构 |
| `npm run db:seed` | 导入初始数据 |
| `npm run db:studio` | 打开 Prisma Studio 数据库管理界面 |
| `npm run db:reset` | 重置数据库（删除所有数据） |

## 项目结构

```
bopet-complaint-system/
├── pages/              # 页面组件
│   ├── complaints/     # 客诉管理页面
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
└── start.bat           # 一键启动脚本
```

## 功能模块

### 客诉管理

- 客诉记录创建、编辑、删除
- 客诉列表查询、筛选、排序
- 客诉详情查看
- 数据导出（CSV）
- 打印功能

### 配置管理

- 产线管理
- 客户管理
- 产品型号管理
- 问题大类/小类管理
- 客户诉求管理
- 赔偿方式管理
- 严重等级管理
- 责任部门管理
- 责任工序管理

### 统计分析

- 数据概览（总数、待处理、处理中、已关闭）
- 趋势分析（按日/周/月）
- 多维度数据可视化：
  - 问题大类分布
  - 产线分布
  - 客户排名 TOP 10
  - 产品型号排名 TOP 10
  - 问题小类分布
  - 严重等级分布
  - 客户诉求分布
  - 赔偿方式分布
  - 责任部门分布
  - 责任工序分布

### 表单模板

- 自定义表单模板
- 部门专属模板
- 动态字段配置

## 数据库

默认使用 SQLite 数据库，数据文件位于 `prisma/data/bopet.db`。

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
