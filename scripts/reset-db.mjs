/**
 * 重置数据库：删除 SQLite 数据库文件，下次启动时自动重建并写入种子数据
 *
 * 用法: npm run db:reset
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

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

loadEnvFile(resolve(rootDir, '.env'))

let dbFile = (process.env.DATABASE_URL || '').trim()
if (dbFile.startsWith('file:')) dbFile = dbFile.slice('file:'.length)
const qIndex = dbFile.indexOf('?')
if (qIndex !== -1) dbFile = dbFile.slice(0, qIndex)
if (!dbFile) dbFile = 'data/data.db'
const dbPath = isAbsolute(dbFile) ? dbFile : resolve(rootDir, 'prisma', dbFile)

for (const file of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (existsSync(file)) {
    rmSync(file)
    console.log(`已删除: ${file}`)
  }
}

console.log('\n数据库已重置，下次执行 npm run dev / npm run start 时将自动重建并初始化种子数据')
