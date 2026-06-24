import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PROJECT_ROOT = process.cwd()
const OUT_DIR = path.join(PROJECT_ROOT, '.understand-anything')
const OUT_FILE = path.join(OUT_DIR, 'knowledge-graph.json')

const INCLUDE_DIRS = [
  'pages',
  'server',
  'stores',
  'composables',
  'components',
  'layouts',
  'middleware',
  'plugins',
  'prisma',
  'scripts'
]

const INCLUDE_EXT = new Set(['.ts', '.js', '.mjs', '.cjs', '.vue', '.prisma', '.json', '.md'])

const MODULE_NODES = [
  { id: 'module:auth', name: 'Auth Module', layer: 'service', summary: 'Authentication, authorization and session state.' },
  { id: 'module:data', name: 'Data Module', layer: 'data', summary: 'Core data record CRUD, import/export and attachments.' },
  { id: 'module:templates', name: 'Template Module', layer: 'service', summary: 'Dynamic form templates and template field filtering.' },
  { id: 'module:analytics', name: 'Analytics Module', layer: 'api', summary: 'Statistics, saved analysis and dashboard aggregation.' },
  { id: 'module:config', name: 'Config Module', layer: 'service', summary: 'Master data and system configuration.' }
]

const MODULE_PATH_HINTS = [
  { moduleId: 'module:auth', hints: ['stores/auth', 'middleware/auth', 'server/api/auth', 'server/utils/auth', 'pages/login'] },
  { moduleId: 'module:data', hints: ['pages/datas', 'server/api/datas', 'server/api/images', 'server/api/upload', 'server/routes/oss'] },
  { moduleId: 'module:templates', hints: ['pages/templates', 'server/api/templates'] },
  { moduleId: 'module:analytics', hints: ['pages/stats', 'pages/index.vue', 'server/api/stats', 'server/api/analyses', 'server/api/dashboards'] },
  { moduleId: 'module:config', hints: ['pages/users', 'pages/departments', 'server/api/users', 'server/api/departments', 'server/api/config'] }
]

function toPosix(relPath) {
  return relPath.split(path.sep).join('/')
}

function hashText(text) {
  return crypto.createHash('sha1').update(text).digest('hex')
}

function detectLayer(filePath) {
  const p = toPosix(filePath)
  if (p.startsWith('server/api/')) return 'api'
  if (p.startsWith('prisma/')) return 'data'
  if (p.startsWith('pages/') || p.startsWith('components/') || p.startsWith('layouts/')) return 'ui'
  if (p.startsWith('server/utils/') || p.startsWith('scripts/') || p.startsWith('composables/')) return 'utility'
  if (p.startsWith('stores/') || p.startsWith('middleware/') || p.startsWith('plugins/')) return 'service'
  return 'unknown'
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.vue') return 'vue'
  if (ext === '.ts') return 'typescript'
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript'
  if (ext === '.prisma') return 'prisma'
  if (ext === '.json') return 'json'
  if (ext === '.md') return 'markdown'
  return 'text'
}

function makeSummary(relPath, content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const firstCode = lines.find(l => !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*') && !l.startsWith('<!--'))
  if (!firstCode) return `Project file: ${toPosix(relPath)}`
  return `File ${toPosix(relPath)} starts with: ${firstCode.slice(0, 180)}`
}

function extractImports(text) {
  const out = []
  const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const r of [importRegex, dynamicImportRegex, requireRegex]) {
    let m
    while ((m = r.exec(text)) !== null) out.push(m[1])
  }
  return out
}

function resolveImport(currentRelPath, specifier, pathSet) {
  if (!specifier || specifier.startsWith('node:') || /^[a-zA-Z@][^:]/.test(specifier)) return null

  let base
  if (specifier.startsWith('~/') || specifier.startsWith('@/')) {
    base = specifier.slice(2)
  } else {
    const currentDir = path.dirname(currentRelPath)
    base = toPosix(path.normalize(path.join(currentDir, specifier)))
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.vue`,
    `${base}.json`,
    `${base}/index.ts`,
    `${base}/index.js`,
    `${base}/index.mjs`,
    `${base}/index.vue`
  ].map(toPosix)

  for (const c of candidates) {
    if (pathSet.has(c)) return c
  }
  return null
}

async function walk(dirPath, fileList = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git') || entry.name === '.nuxt' || entry.name === '.output') continue
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      await walk(full, fileList)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (INCLUDE_EXT.has(ext)) fileList.push(full)
  }
  return fileList
}

function moduleForPath(relPath) {
  const normalized = toPosix(relPath)
  for (const cfg of MODULE_PATH_HINTS) {
    if (cfg.hints.some(h => normalized.startsWith(h))) return cfg.moduleId
  }
  return null
}

async function generateGraph() {
  const files = []
  for (const dir of INCLUDE_DIRS) {
    const full = path.join(PROJECT_ROOT, dir)
    try {
      const st = await fs.stat(full)
      if (st.isDirectory()) {
        const found = await walk(full)
        files.push(...found)
      }
    } catch {
      // ignore missing dirs
    }
  }

  const extraFiles = ['README.md', 'package.json', 'nuxt.config.ts', 'prisma/schema.prisma']
  for (const f of extraFiles) {
    const full = path.join(PROJECT_ROOT, f)
    try {
      const st = await fs.stat(full)
      if (st.isFile()) files.push(full)
    } catch {
      // ignore
    }
  }

  const uniqueFiles = Array.from(new Set(files.map(f => path.normalize(f))))
  const relPaths = uniqueFiles.map(f => toPosix(path.relative(PROJECT_ROOT, f)))
  const relPathSet = new Set(relPaths)

  const nodes = []
  const edges = []

  nodes.push(
    {
      id: 'project:root',
      type: 'module',
      name: path.basename(PROJECT_ROOT),
      filePath: '.',
      layer: 'unknown',
      summary: 'BOPET complaint/data management and analytics platform.'
    },
    ...MODULE_NODES.map(m => ({
      id: m.id,
      type: 'module',
      name: m.name,
      filePath: '.',
      layer: m.layer,
      summary: m.summary
    }))
  )

  for (const relPath of relPaths) {
    const abs = path.join(PROJECT_ROOT, relPath)
    const text = await fs.readFile(abs, 'utf8').catch(() => '')
    const nodeId = `file:${relPath}`
    const layer = detectLayer(relPath)
    const language = detectLanguage(relPath)
    const concepts = []
    if (text.includes('async ') || text.includes('await ')) concepts.push('async-await')
    if (text.includes('interface ')) concepts.push('interfaces')

    nodes.push({
      id: nodeId,
      type: 'file',
      name: path.basename(relPath),
      filePath: relPath,
      layer,
      summary: makeSummary(relPath, text),
      language,
      concepts,
      metadata: { hash: hashText(text) }
    })

    edges.push({
      id: `uses:project:${nodeId}`,
      source: 'project:root',
      target: nodeId,
      type: 'uses'
    })

    const moduleId = moduleForPath(relPath)
    if (moduleId) {
      edges.push({
        id: `contains:${moduleId}:${nodeId}`,
        source: moduleId,
        target: nodeId,
        type: 'uses'
      })
    }

    const imports = extractImports(text)
    for (const specifier of imports) {
      const targetRel = resolveImport(relPath, specifier, relPathSet)
      if (!targetRel) continue
      edges.push({
        id: `import:${nodeId}:file:${targetRel}`,
        source: nodeId,
        target: `file:${targetRel}`,
        type: 'imports',
        label: specifier
      })
    }
  }

  for (const m of MODULE_NODES) {
    edges.push({
      id: `project-module:${m.id}`,
      source: 'project:root',
      target: m.id,
      type: 'uses'
    })
  }

  const graph = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    nodes,
    edges,
    tours: [
      {
        id: 'tour:onboarding-core',
        name: 'Core Onboarding Tour',
        description: 'Suggested order for understanding this project quickly.',
        steps: [
          { nodeId: 'file:README.md' },
          { nodeId: 'file:package.json' },
          { nodeId: 'file:nuxt.config.ts' },
          { nodeId: 'file:prisma/schema.prisma' },
          { nodeId: 'file:stores/auth.ts' },
          { nodeId: 'file:server/utils/auth.ts' },
          { nodeId: 'file:pages/datas/index.vue' },
          { nodeId: 'file:pages/index.vue' }
        ]
      }
    ].map(t => ({
      ...t,
      steps: t.steps.filter(s => nodes.some(n => n.id === s.nodeId))
    }))
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(graph, null, 2), 'utf8')

  return {
    outFile: OUT_FILE,
    nodeCount: nodes.length,
    edgeCount: edges.length
  }
}

async function main() {
  const result = await generateGraph()
  console.log(`Knowledge graph written: ${result.outFile}`)
  console.log(`Nodes: ${result.nodeCount}, Edges: ${result.edgeCount}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
