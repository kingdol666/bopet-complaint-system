import { cp, readdir, mkdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import { constants } from 'node:fs'

const root = process.cwd()
const src = join(root, 'node_modules', 'unhead', 'dist')

async function exists(p) {
  try { await access(p, constants.F_OK); return true } catch { return false }
}

async function main() {
  // 如果 unhead 不存在（Nuxt 新版已内置或不再需要），直接跳过
  if (!await exists(src)) {
    console.log('[fix-unhead] unhead/dist 不存在，跳过（无需修复）')
    return
  }

  const outDir = join(root, '.output', 'server', 'node_modules')
  const t1 = join(outDir, 'unhead', 'dist')
  await mkdir(t1, { recursive: true })
  await cp(src, t1, { recursive: true, force: true })

  const nitroDir = join(outDir, '.nitro')
  if (await exists(nitroDir)) {
    const entries = await readdir(nitroDir)
    for (const e of entries) {
      if (e.startsWith('unhead@')) {
        const t2 = join(nitroDir, e, 'dist')
        await mkdir(t2, { recursive: true })
        await cp(src, t2, { recursive: true, force: true })
      }
    }
  }

  console.log('[fix-unhead] 修复完成')
}

main().catch(e => { console.error('[fix-unhead]', e.message); process.exit(1) })
