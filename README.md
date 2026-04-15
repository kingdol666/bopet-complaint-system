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
- **数据库**: 本地 SQLite / PostgreSQL
- **图表**: ECharts
- **日期处理**: dayjs
- **表单验证**: Zod

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm
- PostgreSQL 12+（如使用 PostgreSQL）

---

# 完整部署流程

## 一、本地开发环境（SQLite）

### 1. 安装依赖

```bash
cd bopet-complaint-system
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

默认配置（SQLite）：

```env
PRISMA_DB_PROVIDER="sqlite"
DATABASE_URL="file:./data/bopet.db"
JWT_SECRET="replace-with-a-random-secret"
NUXT_PUBLIC_API_BASE="/api"
PORT=3001
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 创建数据库并推送 schema
npm run db:push

# 填充种子数据（可选）
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3001

---

## 二、本地开发环境（PostgreSQL）

### 1. 安装并启动 PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. 创建数据库

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE kesu;

# 退出
\q
```

### 3. 配置环境变量

编辑 `.env` 文件：

```env
PRISMA_DB_PROVIDER="postgresql"
DATABASE_URL="file:./data/bopet.db"

# 本地 PostgreSQL
POSTGRES_PRISMA_URL="postgresql://postgres:postgres@localhost:5432/kesu?sslmode=prefer"
POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@localhost:5432/kesu?sslmode=prefer"

JWT_SECRET="replace-with-a-random-secret"
NUXT_PUBLIC_API_BASE="/api"
PORT=3001
```

> ⚠️ 如果你设置了不同的用户名、密码或数据库名，请相应修改。

### 4. 初始化数据库

```bash
# 重新生成 Prisma Client（切换为 PostgreSQL）
npm run db:generate

# 创建数据库表结构
npm run db:push

# 填充种子数据（可选）
npm run db:seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

---

## 三、生产环境部署

### 方式一：独立服务器部署

#### 1. 服务器环境准备

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. 创建 PostgreSQL 数据库

```bash
sudo -u postgres psql

# 创建用户
CREATE USER bopet WITH PASSWORD 'your_password';

# 创建数据库
CREATE DATABASE bopet_db OWNER bopet;

# 授权
GRANT ALL PRIVILEGES ON DATABASE bopet_db TO bopet;

\q
```

#### 3. 上传代码并安装

```bash
# 克隆代码
git clone https://github.com/kingdol666/bopet-complaint-system.git
cd bopet-complaint-system

# 安装依赖
npm install
```

#### 4. 配置生产环境变量

创建 `.env` 文件：

```env
PRISMA_DB_PROVIDER="postgresql"
DATABASE_URL="file:./data/bopet.db"

# 生产 PostgreSQL
POSTGRES_PRISMA_URL="postgresql://bopet:your_password@localhost:5432/bopet_db?sslmode=prefer"
POSTGRES_URL_NON_POOLING="postgresql://bopet:your_password@localhost:5432/bopet_db?sslmode=prefer"

JWT_SECRET="your-production-secret-key-here"
NUXT_PUBLIC_API_BASE="/api"
PORT=3001
NODE_ENV=production
```

#### 5. 构建和初始化

```bash
# 构建应用
npm run build

# 初始化数据库
npm run db:push
npm run db:seed

# 使用 PM2 启动
pm2 start npm --name "bopet" -- start

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

#### 6. 配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/bopet
```

添加配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/bopet /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. 配置域名 SSL（可选）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### 方式二：Vercel 部署

#### 1. 注册并准备

- 注册 [Vercel](https://vercel.com) 账号
- 推荐使用 [Neon](https://neon.tech) 免费 PostgreSQL 数据库
- 安装 Vercel CLI：`npm i -g vercel`

#### 2. 链接并配置

```bash
# 链接项目
npx vercel link

# 添加环境变量
npx vercel env add PRISMA_DB_PROVIDER
npx vercel env add POSTGRES_PRISMA_URL
npx vercel env add POSTGRES_URL_NON_POOLING
npx vercel env add JWT_SECRET
npx vercel env add NUXT_PUBLIC_API_BASE
```

环境变量值：

```
PRISMA_DB_PROVIDER=postgresql
POSTGRES_PRISMA_URL=postgresql://user:password@host/database?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=your-random-secret
NUXT_PUBLIC_API_BASE=/api
```

#### 3. 部署

```bash
# 开发环境预览
npx vercel

# 生产环境部署
npx vercel --prod
```

---

### 方式三：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate && npx prisma db push

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

#### 2. 构建和运行

```bash
# 构建镜像
docker build -t bopet-complaint-system .

# 运行容器
docker run -d -p 3001:3001 \
  -e PRISMA_DB_PROVIDER=sqlite \
  -e DATABASE_URL=file:/app/data/bopet.db \
  -v $(pwd)/data:/app/data \
  --name bopet \
  bopet-complaint-system
```

---

## 四、内网穿透配置

### 使用 natapp

1. 注册 [natapp.cn](https://natapp.cn) 获取 authtoken
2. 下载并配置 natapp
3. 启动穿透：

```bash
# 编辑启动脚本或直接运行
/opt/natapp/natapp -authtoken=你的token -http=127.0.0.1:3001
```

### 使用花生壳

1. 打开应用：`open "/Applications/花生壳.app"`
2. 登录账号
3. 添加隧道：
   - 映射类型：HTTP
   - 本地地址：127.0.0.1
   - 本地端口：3001
4. 启动后获取外网地址

### 使用 ngrok

1. 注册 [ngrok.com](https://ngrok.com) 获取 authtoken
2. 配置 token：
   ```bash
   ngrok config add-authtoken 你的token
   ```
3. 启动穿透：
   ```bash
   ngrok http 3001
   ```

---

## 五、常用命令

```bash
# 一键初始化（首次部署推荐）
npm run setup

# 开发
npm run dev

# 构建
npm run build

# 生产环境运行
npm start

# 生产预览
npm run preview

# 数据库管理
npm run db:generate   # 生成 Prisma Client
npm run db:push       # 推送 schema 到数据库
npm run db:seed       # 填充种子数据
npm run db:studio     # 打开 Prisma Studio
npm run db:reset      # 重置数据库（危险）

# 完整构建流程（构建时会自动执行）
npm run build
# 等价于: npm run prisma:prepare && prisma generate && nuxt build
```

---

## 六、环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `PRISMA_DB_PROVIDER` | 是 | 数据库类型，`sqlite` 或 `postgresql` |
| `DATABASE_URL` | SQLite时必填 | SQLite 数据库路径 |
| `POSTGRES_PRISMA_URL` | PostgreSQL时必填 | PostgreSQL 连接地址（带连接池） |
| `POSTGRES_URL_NON_POOLING` | PostgreSQL时必填 | PostgreSQL 直连地址 |
| `JWT_SECRET` | 是 | JWT 密钥，建议使用随机字符串 |
| `NUXT_PUBLIC_API_BASE` | 否 | API 基础路径，默认 `/api` |
| `PORT` | 否 | 服务端口，默认 `3000` |

---

## 七、默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |
| 操作员 | operator | operator123 |
| 质检员 | quality | quality123 |

---

## 八、项目结构

```
bopet-complaint-system/
├── app.vue                    # 根组件
├── nuxt.config.ts             # Nuxt 配置
├── package.json               # 依赖配置
├── tailwind.config.js         # TailwindCSS 配置
├── tsconfig.json              # TypeScript 配置
├── .env                       # 环境变量（需创建）
├── prisma/
│   ├── schema.prisma          # 数据库模型
│   ├── schema.template.prisma # 模型模板
│   └── seed.ts                # 种子数据脚本
├── server/
│   ├── api/                   # API 路由
│   │   ├── auth/              # 认证接口
│   │   ├── complaints/         # 客诉接口
│   │   ├── config/             # 配置接口
│   │   ├── mappings/           # 映射接口
│   │   └── stats/              # 统计接口
│   ├── middleware/             # 服务端中间件
│   └── utils/                  # 服务端工具
├── pages/                      # 页面路由
│   ├── index.vue              # 仪表盘
│   ├── login.vue              # 登录页
│   ├── complaints/            # 客诉页面
│   ├── config/                # 配置页面
│   ├── mappings/              # 映射页面
│   ├── stats/                 # 统计页面
│   ├── templates/             # 模板页面
│   └── users/                 # 用户页面
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

---

## 九、故障排查

### 数据库连接失败

```bash
# 检查数据库服务是否运行
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql        # Linux

# 重新生成 Prisma Client
npm run db:generate

# 重新推送 schema
npm run db:push
```

### 端口被占用

```bash
# macOS 查看占用端口的进程
lsof -i :3001

# Linux
sudo lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT
PORT=3002
```

### 构建失败

```bash
# 清理缓存
rm -rf .nuxt node_modules/.prisma .output
npm install
npm run build
```

---

## 十、API 接口

### 认证

- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 客诉管理

- `GET /api/complaints` - 获取客诉列表
- `POST /api/complaints` - 创建客诉
- `GET /api/complaints/:id` - 获取客诉详情
- `PUT /api/complaints/:id` - 更新客诉
- `DELETE /api/complaints/:id` - 删除客诉
- `GET /api/complaints/export` - 导出 CSV

### 配置管理

- `GET /api/config` - 获取所有配置数据
- `GET /api/config/items` - 获取指定类型配置项
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

---

## License

MIT
