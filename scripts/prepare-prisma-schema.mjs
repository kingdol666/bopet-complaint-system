import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const templatePath = join(rootDir, 'prisma', 'schema.template.prisma')
const targetPath = join(rootDir, 'prisma', 'schema.prisma')

loadEnvFile(join(rootDir, '.env'))
loadEnvFile(join(rootDir, '.env.local'))

const rawProvider = (process.env.PRISMA_DB_PROVIDER || 'sqlite').trim().toLowerCase()
const config = resolveProviderConfig(rawProvider)
const template = readFileSync(templatePath, 'utf8')

const schema = template
  .replace(/__PRISMA_DB_LABEL__/g, config.label)
  .replace(/__PRISMA_PROVIDER__/g, config.provider)
  .replace(/__PRISMA_URL_ENV__/g, config.urlEnv)
  .replace(/__PRISMA_DIRECT_URL_LINE__/g, config.directUrlLine)

writeFileSync(targetPath, schema, 'utf8')

console.log(`[prisma] Prepared schema.prisma for ${config.label}`)

function resolveProviderConfig(provider) {
  if (provider === 'sqlite') {
    return {
      label: 'SQLite',
      provider: 'sqlite',
      urlEnv: 'DATABASE_URL',
      directUrlLine: ''
    }
  }

  if (provider === 'postgres' || provider === 'postgresql') {
    return {
      label: 'PostgreSQL',
      provider: 'postgresql',
      urlEnv: 'POSTGRES_PRISMA_URL',
      directUrlLine: '  directUrl = env("POSTGRES_URL_NON_POOLING")\n'
    }
  }

  throw new Error(`Unsupported PRISMA_DB_PROVIDER: ${provider}`)
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (!key || process.env[key] !== undefined) {
      continue
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}
