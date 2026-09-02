/**
 * 一键启动脚本（开发 / 生产通用）
 *
 * 用法:
 *   node scripts/launch.mjs            # 开发模式（默认）
 *   node scripts/launch.mjs --prod     # 生产模式（无构建产物时自动 build）
 *   即 npm run dev  /  npm run start
 *
 * 启动前自动检查：
 *   1. 环境配置文件缺失时自动创建（.env / .env.production，默认 0.0.0.0 + 端口配置）
 *   2. 依据 PRISMA_DB_PROVIDER 生成 prisma/schema.prisma
 *   3. prisma db push 同步数据库结构（幂等，结构未变化时秒级完成）
 *   4. Prisma Client 缺失时自动生成
 *   5. 数据库为空时自动写入种子数据（seed 自带幂等检查，已有数据则跳过）
 *   6. 生产模式：.output 构建产物缺失时自动执行 npm run build
 *   7. 以 HOST:PORT（默认 0.0.0.0）启动服务，局域网/外网可直接访问
 */

import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// ─────────────── 参数解析 ───────────────
const cliArgs = process.argv.slice(2)
const isProd = cliArgs.some(a => a === '--prod' || a === '--production' || a === 'prod' || a === 'production')

// ─────────────── 输出工具 ───────────────
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function log(msg, color = 'cyan') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

function run(cmd, description) {
  log(`\n${colors.bold}▶ ${description}${colors.reset}`)
  log(`  $ ${cmd}`, 'dim')
  try {
    execSync(cmd, { stdio: 'inherit', cwd: rootDir, env: process.env })
    return true
  } catch (error) {
    log(`  ✗ 失败: ${error.message}`, 'red')
    return false
  }
}

// ─────────────── 环境配置 ───────────────

function defaultEnvContent(mode) {
  const port = mode === 'prod' ? '3001' : '3100'
  return `# Select database provider: sqlite | postgresql
PRISMA_DB_PROVIDER="sqlite"

# SQLite database — resolved to an absolute path by scripts/launch.mjs
DATABASE_URL="file:../data/data.db"

# Remote PostgreSQL / Neon (optional, used when PRISMA_DB_PROVIDER=postgresql)
POSTGRES_PRISMA_URL="postgresql://username:password@host/database?connect_timeout=15&sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://username:password@host/database?sslmode=require"

# JWT Secret — a random secret is generated and persisted here if left empty
JWT_SECRET=""

# Server bind: 0.0.0.0 listens on all interfaces (LAN / external access)
HOST="0.0.0.0"
PORT="${port}"

# App Environment
NUXT_PUBLIC_API_BASE="/api"
`
}

// 加载 env 文件到 process.env（不覆盖已存在的环境变量）
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const sepIndex = line.indexOf('=')
    if (sepIndex === -1) continue

    const key = line.slice(0, sepIndex).trim()
    let value = line.slice(sepIndex + 1).trim()
    if (!key || process.env[key] !== undefined) continue

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

// JWT 密钥为空时自动生成随机密钥并回写到配置文件（保证重启后 token 不失效）
function ensureJwtSecret(envPath) {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) return

  const secret = randomBytes(32).toString('hex')
  process.env.JWT_SECRET = secret

  try {
    let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
    const lineRegex = /^JWT_SECRET=.*$/m
    if (lineRegex.test(content)) {
      content = content.replace(lineRegex, `JWT_SECRET="${secret}"`)
    } else {
      content = content.replace(/\s*$/, '') + `\n# JWT Secret (auto-generated)\nJWT_SECRET="${secret}"\n`
    }
    writeFileSync(envPath, content, 'utf8')
    log(`  ✓ JWT_SECRET 为空，已生成随机密钥并写入 ${envPath}`, 'green')
  } catch {
    log('  ⚠ JWT_SECRET 为空且无法写入配置文件（本次运行使用临时密钥）', 'yellow')
  }
}

// 解析 SQLite 数据库文件路径为绝对路径（相对路径以 prisma/ 目录为基准，与 Prisma 一致）
function resolveSqliteFile(rawUrl) {
  let p = (rawUrl || '').trim()
  if (p.startsWith('file:')) p = p.slice('file:'.length)

  const qIndex = p.indexOf('?')
  if (qIndex !== -1) p = p.slice(0, qIndex)

  if (!p) return resolve(rootDir, 'data', 'data.db')
  return isAbsolute(p) ? p : resolve(rootDir, 'prisma', p)
}

// ─────────────── 数据库检查 ───────────────

function readSchemaProvider(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    const m = content.match(/provider\s*=\s*["'](\w+)["']/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

// 定位 .prisma/client 目录（兼容 npm 与 pnpm 布局）
function prismaClientDir() {
  const candidates = []
  // pnpm 布局: node_modules/.pnpm/@prisma+client@x.y.z_*/node_modules/.prisma/client
  const pnpmDir = resolve(rootDir, 'node_modules', '.pnpm')
  try {
    if (existsSync(pnpmDir)) {
      for (const entry of readdirSync(pnpmDir)) {
        if (entry.startsWith('@prisma+client@')) {
          candidates.push(resolve(pnpmDir, entry, 'node_modules', '.prisma', 'client'))
        }
      }
    }
  } catch { /* fall through */ }
  // npm 布局
  candidates.push(resolve(rootDir, 'node_modules', '.prisma', 'client'))
  return candidates.find(dir => existsSync(dir)) || null
}

// 检查 Prisma Client 是否已生成且与当前 schema 的 provider 匹配（不匹配说明切换了数据库类型，需重新生成）
function prismaClientUpToDate() {
  const clientDir = prismaClientDir()
  if (!clientDir || !existsSync(resolve(clientDir, 'index.js'))) return false
  const schemaProvider = readSchemaProvider(resolve(rootDir, 'prisma', 'schema.prisma'))
  const clientProvider = readSchemaProvider(resolve(clientDir, 'schema.prisma'))
  if (!schemaProvider || !clientProvider) return true // 无法读取时信任现有 client
  return schemaProvider === clientProvider
}

// 返回用户数量；Prisma Client 不可用时返回 null（需先 generate）；其他错误按空库处理（返回 0）
async function countUsers() {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
      return await prisma.user.count()
    } finally {
      await prisma.$disconnect().catch(() => {})
    }
  } catch (error) {
    const msg = String(error?.message || error)
    if (msg.includes('did not initialize') || msg.includes('prisma generate')) {
      return null
    }
    log(`  ⚠ 数据库查询失败（按空库处理）: ${msg}`, 'yellow')
    return 0
  }
}

// ─────────────── 主流程 ───────────────

log('\n========================================', 'bold')
log(`  BOPET EDA 一键启动（${isProd ? '生产模式' : '开发模式'}）`, 'bold')
log('========================================\n', 'bold')

// 1. 环境配置文件
const envName = isProd ? '.env.production' : '.env'
const envPath = resolve(rootDir, envName)

if (!existsSync(envPath)) {
  writeFileSync(envPath, defaultEnvContent(isProd ? 'prod' : 'dev'), 'utf8')
  log(`✓ 未检测到 ${envName}，已自动创建默认配置`, 'green')
} else {
  log(`✓ 环境配置: ${envName}`, 'green')
}

loadEnvFile(envPath)
ensureJwtSecret(envPath)

// 2. 数据库路径
const provider = (process.env.PRISMA_DB_PROVIDER || 'sqlite').trim().toLowerCase()
const isSqlite = provider === 'sqlite'

if (isSqlite) {
  const dbFile = resolveSqliteFile(process.env.DATABASE_URL)
  mkdirSync(dirname(dbFile), { recursive: true })
  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, '/')}`
}

const host = (process.env.HOST || '').trim() || '0.0.0.0'
const port = String(process.env.PORT || '').trim() || (isProd ? '3001' : '3100')
process.env.HOST = host
process.env.PORT = port

if (isProd) {
  process.env.NODE_ENV = 'production'
  process.env.NITRO_HOST = (process.env.NITRO_HOST || '').trim() || host
  process.env.NITRO_PORT = (process.env.NITRO_PORT || '').trim() || port
} else {
  process.env.NODE_ENV = 'development'
}

if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096'
}

log(`✓ 数据库类型: ${isSqlite ? 'SQLite' : 'PostgreSQL'}`, 'green')
if (isSqlite) {
  log(`✓ 数据库文件: ${process.env.DATABASE_URL}`, 'green')
}
log(`✓ 服务绑定: ${host}:${port}`, 'green')

// 3. 数据库初始化检查（迁移 + seed）
if (!run('node scripts/prepare-prisma-schema.mjs', '步骤 1/4: 准备 Prisma Schema')) process.exit(1)
if (!run('npx prisma db push --skip-generate', '步骤 2/4: 同步数据库结构（建表/迁移）')) process.exit(1)

let userCount = await countUsers()
const needGenerate = userCount === null || !prismaClientUpToDate()

if (needGenerate) {
  const generated = run('npx prisma generate', '步骤 3/4: 生成 Prisma Client')
  if (!generated) {
    // Windows: 旧的运行中进程会锁定 query engine DLL 导致 rename EPERM。
    // 此时若 client 已存在且 provider 匹配，用现有 client 继续启动即可。
    if (prismaClientUpToDate() && userCount !== null) {
      log('  ⚠ generate 失败（可能被运行中的服务锁定引擎文件），使用现有 Prisma Client 继续启动', 'yellow')
    } else {
      log('  ✗ Prisma Client 不可用。请停止所有运行中的服务后重试', 'red')
      process.exit(1)
    }
  } else if (userCount === null) {
    userCount = await countUsers()
  }
}

if (userCount === 0) {
  if (!run('npx tsx prisma/seed.ts', '步骤 3/4: 初始化种子数据')) process.exit(1)
} else {
  log(`\n▶ 步骤 3/4: 数据库已有 ${userCount} 个用户，跳过种子数据`, 'green')
}

// 4. 生产模式构建检查
if (isProd) {
  const serverEntry = resolve(rootDir, '.output', 'server', 'index.mjs')
  const needBuild = cliArgs.some(a => a === '--build' || a === '--force-build') || !existsSync(serverEntry)

  if (needBuild) {
    if (!run('npm run build', '步骤 4/4: 构建生产版本')) process.exit(1)
  } else {
    log('\n▶ 步骤 4/4: 检测到构建产物已存在，跳过构建', 'green')
  }
}

// ─────────────── 启动服务 ───────────────

function printAccessUrls() {
  log(`  本机访问:   http://localhost:${port}`, 'bold')
  if (host === '0.0.0.0') {
    const seen = new Set()
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list || []) {
        if (net.family === 'IPv4' && !net.internal && !seen.has(net.address)) {
          seen.add(net.address)
          log(`  局域网访问: http://${net.address}:${port}`, 'bold')
        }
      }
    }
  }
  log('  停止服务:  Ctrl + C', 'dim')
}

log('\n========================================', 'bold')
log('  启动服务', 'bold')
log('========================================\n', 'bold')
printAccessUrls()
log('')

let child
if (isProd) {
  const serverEntry = resolve(rootDir, '.output', 'server', 'index.mjs')
  if (!existsSync(serverEntry)) {
    log(`✗ 未找到构建产物: ${serverEntry}`, 'red')
    log('  请先执行 npm run build', 'red')
    process.exit(1)
  }
  child = spawn(process.execPath, [serverEntry], {
    stdio: 'inherit',
    cwd: rootDir,
    env: process.env,
  })
} else {
  const nuxtBin = resolve(rootDir, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
  if (!existsSync(nuxtBin)) {
    log(`✗ 未找到 Nuxt: ${nuxtBin}`, 'red')
    log('  请先执行 npm install', 'red')
    process.exit(1)
  }
  child = spawn(process.execPath, [nuxtBin, 'dev', '--host', host, '--port', port], {
    stdio: 'inherit',
    cwd: rootDir,
    env: process.env,
  })
}

let exiting = false
function shutdown(code) {
  if (exiting) return
  exiting = true
  try { child.kill() } catch { /* already exited */ }
  process.exit(code ?? 0)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
child.on('exit', code => shutdown(code))
