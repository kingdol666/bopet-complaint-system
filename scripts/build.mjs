/**
 * Build wrapper — sets heap memory limit then runs Nuxt build.
 * Used by both npm run build and deploy.sh to avoid OOM on low-memory machines.
 */
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const heapSize = process.env.NODE_HEAP_MB || '4096'
const args = ['--max-old-space-size=' + heapSize]

// Pass through any additional arguments (e.g. from nuxt CLI)
const childArgs = process.argv.slice(2)
if (childArgs.length > 0) {
  args.push(...childArgs)
}

console.log(`[build] Node heap: ${heapSize}MB`)
console.log(`[build] Running: node ${args.join(' ')}`)

// Run nuxt build
const nuxtBin = resolve(rootDir, 'node_modules', '.bin', 'nuxt')
const child = spawn('node', args, {
  stdio: 'inherit',
  cwd: rootDir,
  env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${heapSize}` },
  shell: false,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
