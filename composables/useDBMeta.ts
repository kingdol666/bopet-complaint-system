/**
 * 前端 DB 元数据 composable
 *
 * 从 /api/config/db-meta 获取 DataRecord 的 DB 列信息，
 * 替代前端页面中硬编码的 STANDARD_FIELD_KEYS / DB_COLUMNS / DATE_FIELDS / FK_COLUMNS
 */

interface DBMeta {
  dbColumns: string[]
  fkRelationMap: Record<string, string>
  dateColumns: string[]
  editableDateColumns: string[]
  intColumns: string[]
}

let cachedMeta: DBMeta | null = null
let loadingPromise: Promise<DBMeta> | null = null

async function fetchDBMeta(): Promise<DBMeta> {
  if (cachedMeta) return cachedMeta
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const resp = await $fetch<{ success: boolean; data: DBMeta }>('/api/config/db-meta')
    if (resp.success) {
      cachedMeta = resp.data
      return cachedMeta
    }
    throw new Error('Failed to fetch DB meta')
  })()

  return loadingPromise
}

export function useDBMeta() {
  const dbColumns = ref<Set<string>>(new Set())
  const fkRelationMap = ref<Record<string, string>>({})
  const editableDateColumns = ref<Set<string>>(new Set())
  const intColumns = ref<Set<string>>(new Set())
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    try {
      const meta = await fetchDBMeta()
      dbColumns.value = new Set(meta.dbColumns)
      fkRelationMap.value = meta.fkRelationMap
      editableDateColumns.value = new Set(meta.editableDateColumns)
      intColumns.value = new Set(meta.intColumns)
      loaded.value = true
    } catch (e) {
      console.error('Failed to load DB meta:', e)
    }
  }

  return {
    dbColumns,
    fkRelationMap,
    editableDateColumns,
    intColumns,
    loaded,
    ensureLoaded
  }
}
