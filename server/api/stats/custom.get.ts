import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'
import { GROUPABLE_STRING_COLUMNS, DB_DATE_COLUMNS, FK_META, CONFIG_TYPE_FK_MAP, isFKColumn, getFKMeta, getFKMetaByConfigType, DB_COLUMNS } from '~/server/utils/db-columns'

// 使用共享的 DB_DATE_COLUMNS 替代局部 DB_TIMESTAMP_COLUMNS
const DB_TIMESTAMP_COLUMNS = DB_DATE_COLUMNS
interface ParsedFilter {
  field: string
  operator: 'eq' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'date_range'
  value?: any
  valueEnd?: any
  values?: any[]
}

// ─── 字段过滤辅助（完全基于模板字段类型驱动，无内置字段） ───

function buildFilterSQL(
  filters: ParsedFilter[],
  templateFieldMap: Map<string, any>,
  tableRef: string
): { parts: string[]; params: any[] } {
  const parts: string[] = []
  const params: any[] = []
  for (const f of filters) {
    if (!f.field || !f.operator) continue
    // 完全从模板字段定义获取类型信息
    const tplField = templateFieldMap.get(f.field)
    if (!tplField) continue // 模板中未定义此字段，跳过

    const fieldType = tplField.fieldType
    const configType = tplField.configType
    const isDateField = fieldType === 'date'
    const isFKField = configType && CONFIG_TYPE_FK_MAP[configType]
    const isColumnField = GROUPABLE_STRING_COLUMNS.has(f.field) || DB_TIMESTAMP_COLUMNS.has(f.field)
    const fkMeta = isFKField ? CONFIG_TYPE_FK_MAP[configType] : null

    // 构建 SQL 表达式：DB 列 vs JSON templateData
    let fieldExpr: string
    if (isColumnField) {
      fieldExpr = `${tableRef}."${f.field}"`
    } else {
      const safeKey = f.field.replace(/[^\w一-鿿-]/g, '')
      if (!safeKey) continue
      fieldExpr = `json_extract(${tableRef}.templateData, '$.${safeKey}')`
    }

    if (f.operator === 'date_range' && isDateField) {
      // 日期范围过滤
      const isTimestamp = DB_TIMESTAMP_COLUMNS.has(f.field)
      if (f.value) {
        if (isTimestamp) { parts.push(`${fieldExpr} >= ?`); params.push(new Date(f.value).getTime()) }
        else { parts.push(`date(${fieldExpr}) >= date(?)`); params.push(f.value) }
      }
      if (f.valueEnd) {
        if (isTimestamp) { parts.push(`${fieldExpr} <= ?`); params.push(new Date(f.valueEnd).getTime()) }
        else { parts.push(`date(${fieldExpr}) <= date(?)`); params.push(f.valueEnd) }
      }
    } else if (f.operator === 'in' && f.values?.length) {
      // 多选过滤
      const ph = f.values.map(() => '?').join(',')
      if (fkMeta && isColumnField) {
        parts.push(`${tableRef}."${fkMeta.fkColumn}" IN (SELECT id FROM ${fkMeta.sqlTable} WHERE name IN (${ph}))`)
        params.push(...f.values.map((v: any) => String(v)))
      } else {
        parts.push(`CAST(${fieldExpr} AS TEXT) IN (${ph})`)
        params.push(...f.values.map((v: any) => String(v)))
      }
    } else if (f.operator === 'eq') {
      if (fkMeta && isColumnField) {
        parts.push(`${tableRef}."${fkMeta.fkColumn}" = (SELECT id FROM ${fkMeta.sqlTable} WHERE name = ? LIMIT 1)`)
        params.push(String(f.value))
      } else {
        parts.push(`CAST(${fieldExpr} AS TEXT) = ?`)
        params.push(String(f.value))
      }
    } else if (f.operator === 'contains') {
      if (fkMeta && isColumnField) {
        parts.push(`${tableRef}."${fkMeta.fkColumn}" IN (SELECT id FROM ${fkMeta.sqlTable} WHERE name LIKE ?)`)
        params.push(`%${String(f.value)}%`)
      } else {
        parts.push(`CAST(${fieldExpr} AS TEXT) LIKE ?`)
        params.push(`%${String(f.value)}%`)
      }
    } else if (['gt', 'lt', 'gte', 'lte'].includes(f.operator)) {
      const opMap: Record<string, string> = { gt: '>', lt: '<', gte: '>=', lte: '<=' }
      const op = opMap[f.operator]
      if (op) { parts.push(`CAST(${fieldExpr} AS REAL) ${op} ?`); params.push(Number(f.value)) }
    }
  }
  return { parts, params }
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const deptFilter = buildDepartmentFilter(user)
    const deptIds = user.role === 'superadmin' ? null : [...new Set([...user.departmentIds, ...user.grantedDepartmentIds])]
    const query = getQuery(event)

    const groupByRaw = (query.groupBy as string) || ''
    const groupByFields = groupByRaw.split(',').map(s => s.trim()).filter(Boolean)
    const templateId = query.templateId ? Number(query.templateId) : undefined
    const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 200)
    const mode = (query.mode as string) || 'group'
    const timeFieldRaw = (query.timeField as string) || undefined
    // Normalize built-in time fields (strip __ prefix)
    const timeField = timeFieldRaw?.startsWith('__') ? timeFieldRaw.slice(2) : timeFieldRaw

    if (groupByFields.length === 0) {
      throw createError({ statusCode: 400, message: '缺少groupBy参数' })
    }

    // Parse field filters
    const filtersRaw = (query.filters as string) || ''
    let fieldFilters: ParsedFilter[] = []
    if (filtersRaw) {
      try { fieldFilters = JSON.parse(filtersRaw) } catch {}
    }

    // Fetch template field definitions (for labels, FK detection, and field types)
    let templateFieldMap = new Map<string, any>()
    if (templateId) {
      const lookupKeys = [...groupByFields]
      if (timeField && !lookupKeys.includes(timeField)) lookupKeys.push(timeField)
      for (const ff of fieldFilters) {
        if (ff.field && !lookupKeys.includes(ff.field)) lookupKeys.push(ff.field)
      }
      const tplFields = await prisma.formTemplateField.findMany({
        where: { templateId, fieldKey: { in: lookupKeys } }
      })
      for (const f of tplFields) templateFieldMap.set(f.fieldKey, f)
    }

    // ─── Trend mode for numeric fields ───
    if (mode === 'trend' && groupByFields.length === 1) {
      const field = groupByFields[0]
      const templateField = templateFieldMap.get(field) || null
      const isColumnField = GROUPABLE_STRING_COLUMNS.has(field)

      // Build where clause (完全基于模板字段，无内置字段假设)
      const whereParts: string[] = ['1=1']
      const sqlParams: any[] = []
      if (deptIds && deptIds.length > 0) {
        const placeholders = deptIds.map(() => '?').join(',')
        whereParts.push(`responsibleDeptId IN (${placeholders})`)
        sqlParams.push(...deptIds)
      } else if (deptIds && deptIds.length === 0) {
        whereParts.push('responsibleDeptId = -1')
      }
      // Apply field filters (date ranges are handled through the filter system)
      if (fieldFilters.length > 0) {
        const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
        whereParts.push(...fr.parts)
        sqlParams.push(...fr.params)
      }

      // Numeric value extraction
      let valueExpr: string
      if (isColumnField) {
        valueExpr = `CAST("${field}" AS REAL)`
        whereParts.push(`"${field}" IS NOT NULL`)
      } else {
        const safeKey = field.replace(/[^\w一-鿿-]/g, '')
        valueExpr = `CAST(json_extract(templateData, '$.${safeKey}') AS REAL)`
        whereParts.push(`json_extract(templateData, '$.${safeKey}') IS NOT NULL`)
      }

      const whereClause = whereParts.join(' AND ')

      // Resolve time field — purely based on template field definitions
      let timeExpr = 'rowid'
      let timeLabel = '序号'
      let hasTimeField = false

      if (timeField) {
        const tf = templateFieldMap.get(timeField)
        if (tf && tf.fieldType === 'date') {
          // Template date field — check if it's a DB timestamp column or JSON field
          const isTimestamp = DB_TIMESTAMP_COLUMNS.has(timeField)
          if (isTimestamp || GROUPABLE_STRING_COLUMNS.has(timeField)) {
            timeExpr = `"${timeField}"`
          } else {
            const safeTimeKey = timeField.replace(/[^\w一-鿿-]/g, '')
            timeExpr = `json_extract(templateData, '$.${safeTimeKey}')`
          }
          timeLabel = tf.fieldLabel || timeField
          hasTimeField = true
        }
      }

      if (hasTimeField) {
        // Group by time field, AVG the numeric value
        // DB timestamp columns are stored as integer (Unix ms), JSON date fields as string
        const isTimestamp = DB_TIMESTAMP_COLUMNS.has(timeField!)
        const timeSelect = isTimestamp
          ? `strftime('%Y-%m-%d', ${timeExpr}/1000, 'unixepoch') as time_val`
          : `CAST(${timeExpr} AS TEXT) as time_val`

        const statsSQL = `SELECT COUNT(*) as cnt, AVG(${valueExpr}) as avg_val, MIN(${valueExpr}) as min_val, MAX(${valueExpr}) as max_val FROM data_records WHERE ${whereClause}`
        const statsResult = await prisma.$queryRawUnsafe(statsSQL, ...sqlParams) as any[]
        const stats = statsResult[0]

        const dataSQL = `SELECT ${timeSelect}, AVG(${valueExpr}) as num_val FROM data_records WHERE ${whereClause} GROUP BY time_val ORDER BY time_val ASC LIMIT ?`
        const rows = await prisma.$queryRawUnsafe(dataSQL, ...sqlParams, limit) as any[]

        const total = Number(stats?.cnt || 0)
        const results = rows.map((r: any) => ({
          name: r.time_val || String(r.time_val),
          value: Number(Number(r.num_val).toFixed(2))
        }))

        return {
          success: true,
          data: {
            groupBy: field, fields: [field],
            fieldLabels: [templateField?.fieldLabel || field],
            total, mode: 'trend',
            timeField: timeField || null, timeLabel,
            stats: {
              avg: Number(Number(stats?.avg_val || 0).toFixed(2)),
              min: Number(Number(stats?.min_val || 0).toFixed(2)),
              max: Number(Number(stats?.max_val || 0).toFixed(2)),
              count: total
            },
            results
          }
        }
      } else {
        // No time field — return all records in row order
        const statsSQL = `SELECT COUNT(*) as cnt, AVG(${valueExpr}) as avg_val, MIN(${valueExpr}) as min_val, MAX(${valueExpr}) as max_val FROM data_records WHERE ${whereClause}`
        const statsResult = await prisma.$queryRawUnsafe(statsSQL, ...sqlParams) as any[]
        const stats = statsResult[0]

        const dataSQL = `SELECT rowid as seq, ${valueExpr} as num_val FROM data_records WHERE ${whereClause} ORDER BY rowid ASC LIMIT ?`
        const rows = await prisma.$queryRawUnsafe(dataSQL, ...sqlParams, limit) as any[]

        const total = Number(stats?.cnt || 0)
        const results = rows.map((r: any, i: number) => ({
          name: String(i + 1),
          value: Number(Number(r.num_val).toFixed(2))
        }))

        return {
          success: true,
          data: {
            groupBy: field, fields: [field],
            fieldLabels: [templateField?.fieldLabel || field],
            total, mode: 'trend',
            timeField: null, timeLabel: '序号',
            stats: {
              avg: Number(Number(stats?.avg_val || 0).toFixed(2)),
              min: Number(Number(stats?.min_val || 0).toFixed(2)),
              max: Number(Number(stats?.max_val || 0).toFixed(2)),
              count: total
            },
            results
          }
        }
      }
    }

    // ─── Date group mode: group records by a date field (from template) ───
    if (mode === 'date_group' && groupByFields.length === 1) {
      const field = groupByFields[0]
      const templateField = templateFieldMap.get(field) || null
      const isTimestamp = DB_TIMESTAMP_COLUMNS.has(field)
      const isColumnDate = isTimestamp || GROUPABLE_STRING_COLUMNS.has(field)

      // Build where clause (完全基于模板字段，无内置字段假设)
      const whereParts: string[] = ['1=1']
      const sqlParams: any[] = []
      if (deptIds && deptIds.length > 0) {
        const placeholders = deptIds.map(() => '?').join(',')
        whereParts.push(`responsibleDeptId IN (${placeholders})`)
        sqlParams.push(...deptIds)
      } else if (deptIds && deptIds.length === 0) {
        whereParts.push('responsibleDeptId = -1')
      }
      // Apply field filters (date ranges handled through filter system)
      if (fieldFilters.length > 0) {
        const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
        whereParts.push(...fr.parts)
        sqlParams.push(...fr.params)
      }

      // Determine date expression and ensure it's not null
      // DB timestamp columns store integer (Unix ms), JSON date fields store string
      let dateExpr: string
      let dateGroupExpr: string
      if (isTimestamp) {
        dateExpr = field
        dateGroupExpr = `strftime('%Y-%m-%d', ${field}/1000, 'unixepoch')`
      } else if (isColumnDate) {
        dateExpr = `"${field}"`
        dateGroupExpr = `strftime('%Y-%m-%d', "${field}"/1000, 'unixepoch')`
      } else {
        // Custom date field stored in templateData JSON (string format)
        const safeKey = field.replace(/[^\w一-鿿-]/g, '')
        dateExpr = `json_extract(templateData, '$.${safeKey}')`
        dateGroupExpr = `strftime('%Y-%m-%d', json_extract(templateData, '$.${safeKey}'))`
      }
      whereParts.push(`${dateExpr} IS NOT NULL`)

      const whereClause = whereParts.join(' AND ')

      // Group by date string (YYYY-MM-DD format)
      const dataSQL = `SELECT ${dateGroupExpr} as date_val, COUNT(*) as cnt FROM data_records WHERE ${whereClause} GROUP BY date_val ORDER BY date_val ASC LIMIT ?`
      const rows = await prisma.$queryRawUnsafe(dataSQL, ...sqlParams, limit) as any[]

      const total = rows.reduce((sum, r) => sum + Number(r.cnt), 0)
      const results = rows.map((r: any) => ({
        name: r.date_val || '(空)',
        value: r.date_val,
        count: Number(r.cnt),
        percentage: total > 0 ? (Number(r.cnt) / total * 100).toFixed(1) : '0'
      }))

      return {
        success: true,
        data: {
          groupBy: field, fields: [field],
          fieldLabels: [templateField?.fieldLabel || field],
          total, mode: 'date_group',
          results
        }
      }
    }

    // ─── Single-field path (keep existing logic) ───
    if (groupByFields.length === 1) {
      const groupBy = groupByFields[0]
      const templateField = templateFieldMap.get(groupBy) || null

      const isColumnField = GROUPABLE_STRING_COLUMNS.has(groupBy)
      const isFKField = templateField?.configType && CONFIG_TYPE_FK_MAP[templateField.configType]

      if (isColumnField) {
        const where: any = { ...deptFilter }
        // Apply field filters via subquery (date ranges handled through filter system)
        if (fieldFilters.length > 0) {
          const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
          if (fr.parts.length > 0) {
            const idSQL = `SELECT id FROM data_records WHERE ${fr.parts.join(' AND ')}`
            const idRows = await prisma.$queryRawUnsafe(idSQL, ...fr.params) as any[]
            where.id = { in: idRows.map((r: any) => r.id) }
          }
        }
        where[groupBy] = { not: null }

        const total = await prisma.dataRecord.count({ where })
        const raw = await prisma.dataRecord.groupBy({
          by: [groupBy as any],
          where,
          _count: true
        })

        const results = raw
          .map(r => {
            const val = (r as any)[groupBy]
            return { name: val != null ? String(val) : '(空)', value: val, count: r._count, percentage: total > 0 ? (r._count / total * 100).toFixed(1) : '0' }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return {
          success: true,
          data: { groupBy, fields: [groupBy], fieldLabels: [templateField?.fieldLabel || groupBy], total, results }
        }
      }

      if (isFKField) {
        const meta = CONFIG_TYPE_FK_MAP[templateField.configType]
        const where: any = { ...deptFilter }
        // Apply field filters via subquery (date ranges handled through filter system)
        if (fieldFilters.length > 0) {
          const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
          if (fr.parts.length > 0) {
            const idSQL = `SELECT id FROM data_records WHERE ${fr.parts.join(' AND ')}`
            const idRows = await prisma.$queryRawUnsafe(idSQL, ...fr.params) as any[]
            where.id = { in: idRows.map((r: any) => r.id) }
          }
        }
        where[groupBy] = { not: null }

        const total = await prisma.dataRecord.count({ where })
        const raw = await prisma.dataRecord.groupBy({
          by: [groupBy as any],
          where,
          _count: true
        })

        const entities = await (prisma as any)[meta.prismaModel].findMany({ select: { id: true, name: true } })
        const nameMap = new Map<number, string>()
        for (const e of entities) nameMap.set(e.id, e.name)

        const results = raw
          .map(r => {
            const val = (r as any)[groupBy]
            return { name: nameMap.get(Number(val)) || String(val || '(空)'), value: val, count: r._count, percentage: total > 0 ? (r._count / total * 100).toFixed(1) : '0' }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return {
          success: true,
          data: { groupBy, fields: [groupBy], fieldLabels: [templateField.fieldLabel], total, results }
        }
      }

      // JSON field (single)
      const safeFieldKey = groupBy.replace(/[^\w一-鿿-]/g, '')
      if (!safeFieldKey) throw createError({ statusCode: 400, message: '字段名无效' })

      let sql = `SELECT json_extract(templateData, '$.${safeFieldKey}') as value, COUNT(*) as _count FROM data_records WHERE templateData IS NOT NULL AND json_extract(templateData, '$.${safeFieldKey}') IS NOT NULL`
      const params: any[] = []
      // Apply field filters (date ranges handled through filter system)
      if (fieldFilters.length > 0) {
        const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
        if (fr.parts.length > 0) { sql += ' AND ' + fr.parts.join(' AND '); params.push(...fr.params) }
      }
      sql += ` GROUP BY value ORDER BY _count DESC LIMIT ?`
      params.push(limit * 2)

      const raw = await prisma.$queryRawUnsafe(sql, ...params) as any[]

      let countSql = `SELECT COUNT(*) as total FROM data_records WHERE templateData IS NOT NULL AND json_extract(templateData, '$.${safeFieldKey}') IS NOT NULL`
      const countParams: any[] = []
      // Apply field filters to count query
      if (fieldFilters.length > 0) {
        const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'data_records')
        if (fr.parts.length > 0) { countSql += ' AND ' + fr.parts.join(' AND '); countParams.push(...fr.params) }
      }
      const countResult = await prisma.$queryRawUnsafe(countSql, ...countParams) as any[]
      const total = Number(countResult[0]?.total || 0)

      const results = raw.map(r => ({
        name: r.value != null ? String(r.value) : '(空)',
        value: r.value,
        count: Number(r._count),
        percentage: total > 0 ? (Number(r._count) / total * 100).toFixed(1) : '0'
      })).slice(0, limit)

      return {
        success: true,
        data: { groupBy, fields: [groupBy], fieldLabels: [templateField?.fieldLabel || groupBy], total, results }
      }
    }

    // ─── Multi-field path (raw SQL) ───
    const fieldLabels: string[] = []
    const selectParts: string[] = []
    const groupParts: string[] = []
    const joinClauses: string[] = []
    const whereParts: string[] = ['1=1']

    // Parameterized SQL values
    const sqlParams: any[] = []

    // Department filter (data isolation for non-superadmin)
    if (deptIds && deptIds.length > 0) {
      const placeholders = deptIds.map(() => '?').join(',')
      whereParts.push(`cr.responsibleDeptId IN (${placeholders})`)
      sqlParams.push(...deptIds)
    } else if (deptIds && deptIds.length === 0) {
      whereParts.push('cr.responsibleDeptId = -1')
    }
    // Date filter removed — date ranges are handled entirely through the filter system
    // based on template field definitions
    // Apply field filters
    if (fieldFilters.length > 0) {
      const fr = buildFilterSQL(fieldFilters, templateFieldMap, 'cr')
      whereParts.push(...fr.parts)
      sqlParams.push(...fr.params)
    }

    for (const field of groupByFields) {
      const tf = templateFieldMap.get(field)
      const label = tf?.fieldLabel || field
      fieldLabels.push(label)

      if (GROUPABLE_STRING_COLUMNS.has(field)) {
        // Direct column
        selectParts.push(`COALESCE(CAST(cr."${field}" AS TEXT), '(空)') as v_${field}`)
        groupParts.push(`cr."${field}"`)
        whereParts.push(`cr."${field}" IS NOT NULL`)
      } else if (tf?.configType && CONFIG_TYPE_FK_MAP[tf.configType]) {
        // FK field: JOIN reference table
        const meta = CONFIG_TYPE_FK_MAP[tf.configType]
        const alias = `j_${field}`
        joinClauses.push(`LEFT JOIN ${meta.sqlTable} ${alias} ON cr.${meta.fkColumn} = ${alias}.id`)
        selectParts.push(`COALESCE(${alias}.${meta.nameColumn}, '(空)') as v_${field}`)
        groupParts.push(`${alias}.${meta.nameColumn}`)
      } else {
        // JSON templateData field
        const safeKey = field.replace(/[^\w一-鿿-]/g, '')
        selectParts.push(`COALESCE(CAST(json_extract(cr.templateData, '$.${safeKey}') AS TEXT), '(空)') as v_${field}`)
        groupParts.push(`json_extract(cr.templateData, '$.${safeKey}')`)
        whereParts.push(`json_extract(cr.templateData, '$.${safeKey}') IS NOT NULL`)
      }
    }

    const selectClause = selectParts.join(', ')
    const groupClause = groupParts.join(', ')
    const joinClause = joinClauses.join('\n  ')
    const whereClause = whereParts.join(' AND ')

    const countSQL = `SELECT COUNT(*) as total FROM data_records cr ${joinClause} WHERE ${whereClause}`
    const countResult = await prisma.$queryRawUnsafe(countSQL, ...sqlParams) as any[]
    const total = Number(countResult[0]?.total || 0)

    const dataSQL = `SELECT ${selectClause}, COUNT(*) as _count FROM data_records cr ${joinClause} WHERE ${whereClause} GROUP BY ${groupClause} ORDER BY _count DESC LIMIT ?`
    const rawRows = await prisma.$queryRawUnsafe(dataSQL, ...sqlParams, limit * 2) as any[]

    const results = rawRows.map((r: any) => {
      const vals: string[] = []
      for (const field of groupByFields) {
        const v = r[`v_${field}`]
        vals.push(v != null ? String(v) : '(空)')
      }
      return {
        name: vals.join(' | '),
        values: vals,
        count: Number(r._count),
        percentage: total > 0 ? (Number(r._count) / total * 100).toFixed(1) : '0'
      }
    }).slice(0, limit)

    return {
      success: true,
      data: {
        groupBy: groupByRaw,
        fields: groupByFields,
        fieldLabels,
        total,
        results
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '分析失败' })
  }
})
