/**
 * Production start script.
 * Resolves DATABASE_URL to an absolute path based on the startup directory,
 * then launches the Nitro server.
 *
 * Usage: node scripts/start.mjs
 *   or:  npm start
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// Resolve database path relative to project root
const dataDir = resolve(rootDir, 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}
const dbPath = resolve(dataDir, 'bopet.db')

// Resolve absolute DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`

// Bind to all interfaces on configured port (public access)
process.env.HOST = process.env.HOST || '0.0.0.0'
process.env.PORT = process.env.PORT || '3001'

console.log(`[start] DATABASE_URL = ${process.env.DATABASE_URL}`)
console.log(`[start] Listening on ${process.env.HOST}:${process.env.PORT}`)

// Launch the Nitro server
const serverEntry = resolve(rootDir, '.output', 'server', 'index.mjs')
const child = spawn('node', [serverEntry], {
  stdio: 'inherit',
  env: process.env,
  cwd: rootDir
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
