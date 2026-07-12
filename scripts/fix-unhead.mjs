import { cp, readdir, mkdir, access, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { constants } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = process.cwd()

async function exists(p) {
  try { await access(p, constants.F_OK); return true } catch { return false }
}

// ─── 1. Fix unhead: copy dist to output ───
async function fixUnhead() {
  const src = join(root, 'node_modules', 'unhead', 'dist')
  if (!await exists(src)) {
    console.log('[fix-unhead] unhead/dist not found, skipping')
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

  console.log('[fix-unhead] unhead fixed')
}

// ─── 2. Fix dayjs ESM imports: add .js extension to plugin imports ───
async function fixDayjsEsm() {
  const serverDir = join(root, '.output', 'server')

  // Find all .mjs files in the server output that import dayjs plugins
  async function walkDir(dir, files = []) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walkDir(fullPath, files)
      } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
        files.push(fullPath)
      }
    }
    return files
  }

  try {
    const files = await walkDir(serverDir)
    let fixed = 0

    for (const file of files) {
      let content = await readFile(file, 'utf8')
      let modified = false

      // Fix: dayjs/plugin/customParseFormat -> dayjs/plugin/customParseFormat.js
      // Match patterns like: from 'dayjs/plugin/customParseFormat' or require('dayjs/plugin/xxx')
      const dayjsPluginRegex = /from\s+['"]dayjs\/plugin\/([^'"]+)['"]/g
      const newContent = content.replace(dayjsPluginRegex, (match, plugin) => {
        // Skip if already has .js extension
        if (plugin.endsWith('.js')) return match
        modified = true
        return match.replace(`'dayjs/plugin/${plugin}'`, `'dayjs/plugin/${plugin}.js'`).replace(`"dayjs/plugin/${plugin}"`, `"dayjs/plugin/${plugin}.js"`)
      })

      if (modified) {
        await writeFile(file, newContent, 'utf8')
        fixed++
      }
    }

    console.log(`[fix-dayjs] Fixed ESM imports in ${fixed} files`)
  } catch (e) {
    console.log(`[fix-dayjs] Error: ${e.message}`)
  }
}

async function main() {
  await fixUnhead()
  await fixDayjsEsm()
  console.log('[postbuild] All fixes applied')
}

main().catch(e => { console.error('[postbuild]', e.message); process.exit(1) })
