# BOPET 客诉闭环管理系统

一个面向 BOPET 薄膜行业的客诉管理系统，支持客诉记录、追踪、分析和闭环管理。

## 功能特性

- 📊 **仪表盘** - 统计概览、月度趋势、问题分类分布
- 📝 **客诉管理** - 完整的客诉录入、编辑、查询、删除功能
- 🔍 **高级搜索** - 支持多条件筛选、关键字搜索、分页排序
- 📈 **统计分析** - 按客户、产线、产品型号、问题分类统计
- 🗂️ **问题映射** - 客户语言到内部标准语言的映射字典
- ⚙️ **系统配置** - 产线、客户、产品型号等基础数据管理
- 📤 **数据导出** - CSV 格式导出

## 技术栈

- **前端框架**: Nuxt 3 + Vue 3 + TypeScript
- **UI 组件**: Naive UI
- **样式**: TailwindCSS
- **状态管理**: Pinia
- **ORM**: Prisma
- **数据库**: 本地 SQLite / 云端 PostgreSQL
- **图表**: ECharts
- **日期处理**: dayjs
- **表单验证**: Zod

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

## 快速开始

### 1. 安装依赖

```bash
cd bopet-complaint-system
npm install
```

### 2. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 创建数据库并推送 schema
npm run db:push

# 填充种子数据
npm run db:seed
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 启动方式

### 本地启动（SQLite）

本地开发默认使用 SQLite，只需要保留 `.env` 中的这两个配置：

```env
PRISMA_DB_PROVIDER="sqlite"
DATABASE_URL="file:./data/bopet.db"
```

首次启动建议按下面顺序执行：

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

说明：

- `npm run dev` 会先执行 `prisma:prepare`，自动生成适用于 SQLite 的 `prisma/schema.prisma`
- 本地数据库文件默认位于 `prisma/data/bopet.db`
- 如果只想重新生成 Prisma Client，可以单独执行 `npm run db:generate`

### 云端启动（Vercel + Neon PostgreSQL）

云端部署时不要使用 SQLite，改为在 Vercel 环境变量中配置 PostgreSQL：

```env
PRISMA_DB_PROVIDER="postgresql"
POSTGRES_PRISMA_URL="postgresql://username:password@host/database?connect_timeout=15&sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="replace-with-a-random-secret"
NUXT_PUBLIC_API_BASE="/api"
```

推荐部署步骤：

```bash
npm install
npx vercel link
npx vercel env add PRISMA_DB_PROVIDER
npx vercel env add POSTGRES_PRISMA_URL
npx vercel env add POSTGRES_URL_NON_POOLING
npx vercel env add JWT_SECRET
npx vercel deploy --prod
```

说明：

- Vercel 构建时会自动执行 `npm run prisma:prepare && prisma generate && nuxt build`
- 当 `PRISMA_DB_PROVIDER=postgresql` 时，构建脚本会自动切换到 PostgreSQL schema
- 如果使用 Neon，`POSTGRES_PRISMA_URL` 建议填带连接池的地址，`POSTGRES_URL_NON_POOLING` 填直连地址
- 如果还需要 Preview 环境，给 Preview 也配置同一组环境变量即可

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 操作员 | operator | operator123 |
| 质检员 | quality | quality123 |

## 项目结构

```
bopet-complaint-system/
├── app.vue                    # 根组件
├── nuxt.config.ts             # Nuxt 配置
├── package.json               # 依赖配置
├── tailwind.config.js         # TailwindCSS 配置
├── tsconfig.json              # TypeScript 配置
├── prisma/
│   ├── schema.prisma          # 数据库模型
│   └── seed.ts                # 种子数据脚本
├── server/
│   ├── api/                   # API 路由
│   │   ├── auth/              # 认证接口
│   │   ├── complaints/        # 客诉接口
│   │   ├── config/            # 配置接口
│   │   ├── mappings/          # 映射接口
│   │   └── stats/             # 统计接口
│   ├── middleware/            # 服务端中间件
│   └── utils/                 # 服务端工具
├── pages/                     # 页面路由
│   ├── index.vue              # 仪表盘
│   ├── login.vue              # 登录页
│   ├── complaints/            # 客诉页面
│   ├── config/                # 配置页面
│   ├── mappings/              # 映射页面
│   └── stats/                 # 统计页面
├── components/                # 组件
├── composables/               # 组合式函数
├── stores/                    # Pinia 状态管理
├── layouts/                   # 布局组件
├── middleware/                # 路由中间件
├── assets/
│   └── css/
│       └── tailwind.css       # 全局样式
└── plugins/                   # Nuxt 插件
```

## API 接口

### 认证

- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 客诉管理

- `GET /api/complaints` - 获取客诉列表（支持筛选、分页、排序）
- `POST /api/complaints` - 创建客诉
- `GET /api/complaints/:id` - 获取客诉详情
- `PUT /api/complaints/:id` - 更新客诉
- `DELETE /api/complaints/:id` - 删除客诉
- `GET /api/complaints/export` - 导出 CSV

### 配置管理

- `GET /api/config` - 获取所有配置数据
- `GET /api/config/items` - 获取指定类型的配置项
- `POST /api/config/:type` - 创建配置项
- `PUT /api/config/:type` - 更新配置项
- `DELETE /api/config/:type` - 删除配置项

### 问题映射

- `GET /api/mappings` - 获取映射列表
- `POST /api/mappings` - 创建映射
- `GET /api/mappings/:id` - 获取映射详情
- `PUT /api/mappings/:id` - 更新映射
- `DELETE /api/mappings/:id` - 删除映射
- `POST /api/mappings/suggest` - 获取映射建议

### 统计分析

- `GET /api/stats/overview` - 获取统计概览
- `GET /api/stats/by-category` - 按分类统计
- `GET /api/stats/trend` - 月度趋势

## 数据库模型

### 核心表

- `users` - 用户表
- `complaint_records` - 客诉记录表
- `complaint_problem_mappings` - 问题映射字典表

### 配置表

- `production_lines` - 产线
- `customers` - 客户
- `product_models` - 产品型号
- `problem_categories` - 问题大类
- `problem_subcategories` - 问题小类
- `customer_demands` - 客户诉求
- `compensation_types` - 质量赔偿方式
- `severity_levels` - 严重等级
- `responsible_departments` - 责任部门
- `responsible_processes` - 责任工序

### 审计表

- `operation_logs` - 操作日志

## 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 生产预览
npm run preview

# 数据库管理
npm run db:studio    # 打开 Prisma Studio

# 数据库重置（危险操作）
npm run db:reset
```

## 配置说明

### 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```env
# 数据库连接
PRISMA_DB_PROVIDER="sqlite"
DATABASE_URL="file:./data/bopet.db"

# 切换到 PostgreSQL / Neon 时使用
POSTGRES_PRISMA_URL="postgresql://username:password@host/database?connect_timeout=15&sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://username:password@host/database?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://username:password@host/database?sslmode=require"

# JWT 密钥（生产环境请修改）
JWT_SECRET="your-secret-key-here"

# API 基础路径
NUXT_PUBLIC_API_BASE="/api"
```

Vercel 生产环境至少需要配置这些变量：

- `PRISMA_DB_PROVIDER=postgresql`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `JWT_SECRET`
- `NUXT_PUBLIC_API_BASE=/api`

## 业务字段说明

### 客诉记录字段

| 字段 | 说明 |
|------|------|
| feedbackDate | 反馈日期 |
| productionTime | 生产时间 |
| customerId | 客户 |
| productModelId | 产品型号 |
| thickness | 厚度 |
| rollNo | 轴号 |
| quantityInvolved | 涉及数量 |
| productionLineId | 产线 |
| shiftTeam | 班组 |
| batchNo | 批次号 |
| customerComplaintText | 客户投诉描述 |
| internalComplaintName | 内部问题名称 |
| problemCategoryId | 问题大类 |
| problemSubcategoryId | 问题小类 |
| severityLevelId | 严重等级 |
| repeatedIssue | 是否重复发生 |
| customerDemandId | 客户诉求 |
| disposalResult | 处置结果 |
| compensationTypeId | 赔偿方式 |
| closureStatus | 闭环状态 |
| responsibleDeptId | 责任部门 |
| responsibleProcessId | 责任工序 |
| rootCauseAnalysis | 原因分析 |
| correctiveAction | 改善措施 |
| lessonsLearned | 启示 |
| reviewConclusion | 复盘结论 |
| standardizedAction | 是否形成标准化措施 |

### 闭环状态

- `pending` - 待分析
- `processing` - 处理中
- `closed` - 已结案

## 注意事项

1. 生产环境请修改 `.env` 中的 `JWT_SECRET`
2. 本地默认使用 SQLite，将 `PRISMA_DB_PROVIDER` 设为 `postgresql` 后可切换到远程 PostgreSQL
3. 管理员才能访问系统配置页面
4. 建议定期备份远程数据库

## License

MIT
