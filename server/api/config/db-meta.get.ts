import { DB_COLUMNS, FK_META, DB_DATE_COLUMNS, EDITABLE_DATE_COLUMNS, DB_INT_COLUMNS } from '~/server/utils/db-columns'

/**
 * 向前端暴露 DataRecord 的 DB 列元数据
 * 前端不再需要硬编码 DB_COLUMNS / FK_COLUMNS / DATE_FIELDS
 */
export default defineEventHandler(async () => {
  // 构建 FK 列 → 关联路径名 的简化映射（前端只需要 relationPath）
  const fkRelationMap: Record<string, string> = {}
  for (const [col, meta] of Object.entries(FK_META)) {
    fkRelationMap[col] = meta.relationPath
  }

  return {
    success: true,
    data: {
      dbColumns: [...DB_COLUMNS],
      fkRelationMap,
      dateColumns: [...DB_DATE_COLUMNS],
      editableDateColumns: [...EDITABLE_DATE_COLUMNS],
      intColumns: [...DB_INT_COLUMNS]
    }
  }
})
