import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

// Direct string columns on DataRecord that can be grouped
const COLUMN_FIELDS = new Set([
  'category', 'closureStatus',
  'thickness', 'rollNo', 'specification', 'shiftTeam', 'machineNo',
  'feedbackContent', 'productUsage', 'improvementAction', 'batchNo', 'application'
])

// FK configType → { prismaModel, sqlTable, fkColumn, nameColumn }
const FK_META: Record<string, { prismaModel: string; sqlTable: string; fkColumn: string; nameColumn: string }> = {
  customers:              { prismaModel: 'customer',              sqlTable: 'customers',               fkColumn: 'customerId',        nameColumn: 'name' },
  productModels:          { prismaModel: 'productModel',          sqlTable: 'product_models',          fkColumn: 'productModelId',    nameColumn: 'name' },
  responsibleDepartments: { prismaModel: 'responsibleDepartment', sqlTable: 'responsible_departments', fkColumn: 'responsibleDeptId',  nameColumn: 'name' },
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const deptFilter = buildDepartmentFilter(user)
    const deptIds = user.role === 'superadmin' ? null : user.departmentIds
    const query = getQuery(event)

    const groupByRaw = (query.groupBy as string) || ''
    const groupByFields = groupByRaw.split(',').map(s => s.trim()).filter(Boolean)
    const templateId = query.templateId ? Number(query.templateId) : undefined
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? (() => { const d = new Date(query.endDate as string); d.setHours(23, 59, 59, 999); return d })() : undefined
    const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 200)
    const mode = (query.mode as string) || 'group'
    const timeFieldRaw = (query.timeField as string) || undefined
    // Normalize built-in time fields (strip __ prefix)
    const timeField = timeFieldRaw?.startsWith('__') ? timeFieldRaw.slice(2) : timeFieldRaw

    if (groupByFields.length === 0) {
      throw createError({ statusCode: 400, message: '缺少groupBy参数' })
    }

    // Fetch template field definitions (for labels, FK detection, and field types)
    let templateFieldMap = new Map<string, any>()
    if (templateId) {
      const lookupKeys = [...groupByFields]
      if (timeField && !lookupKeys.includes(timeField)) lookupKeys.push(timeField)
      const tplFields = await prisma.formTemplateField.findMany({
        where: { templateId, fieldKey: { in: lookupKeys } }
      })
      for (const f of tplFields) templateFieldMap.set(f.fieldKey, f)
    }

    // ─── Trend mode for numeric fields ───
    if (mode === 'trend' && groupByFields.length === 1) {
      const field = groupByFields[0]
      const templateField = templateFieldMap.get(field) || null
      const isColumnField = COLUMN_FIELDS.has(field)

      // Build date filter
      const whereParts: string[] = ['1=1']
      const sqlParams: any[] = []
      if (deptIds && deptIds.length > 0) {
        const placeholders = deptIds.map(() => '?').join(',')
        whereParts.push(`responsibleDeptId IN (${placeholders})`)
        sqlParams.push(...deptIds)
      } else if (deptIds && deptIds.length === 0) {
        whereParts.push('responsibleDeptId = -1')
      }
      if (startDate) {
        whereParts.push('feedbackDate >= ?')
        sqlParams.push(startDate.getTime())
      }
      if (endDate) {
        whereParts.push('feedbackDate <= ?')
        sqlParams.push(endDate.getTime())
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

      // Resolve time field
      const builtinTimeFields = new Set(['feedbackDate', 'createdAt'])
      let timeExpr = 'rowid'
      let timeLabel = '序号'
      let hasTimeField = false

      if (timeField) {
        if (builtinTimeFields.has(timeField)) {
          timeExpr = timeField === 'feedbackDate' ? 'feedbackDate' : 'createdAt'
          timeLabel = timeField === 'feedbackDate' ? '反馈日期' : '创建时间'
          hasTimeField = true
        } else {
          // Template date field stored in templateData JSON or column
          const safeTimeKey = timeField.replace(/[^\w一-鿿-]/g, '')
          if (COLUMN_FIELDS.has(timeField)) {
            timeExpr = `"${timeField}"`
          } else {
            timeExpr = `json_extract(templateData, '$.${safeTimeKey}')`
          }
          const tf = templateFieldMap.get(timeField)
          timeLabel = tf?.fieldLabel || timeField
          hasTimeField = true
        }
      }

      if (hasTimeField) {
        // Group by time field, AVG the numeric value
        // Built-in date fields are stored as integer timestamps (Unix ms)
        const timeSelect = builtinTimeFields.has(timeField!)
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

    // ─── Date group mode: group records by a date field (built-in or custom) ───
    if (mode === 'date_group' && groupByFields.length === 1) {
      const field = groupByFields[0]
      const templateField = templateFieldMap.get(field) || null
      const isBuiltinDate = ['feedbackDate', 'productionTime', 'createdAt'].includes(field)
      const isColumnDate = isBuiltinDate || COLUMN_FIELDS.has(field)

      // Build where clause
      const whereParts: string[] = ['1=1']
      const sqlParams: any[] = []
      if (deptIds && deptIds.length > 0) {
        const placeholders = deptIds.map(() => '?').join(',')
        whereParts.push(`responsibleDeptId IN (${placeholders})`)
        sqlParams.push(...deptIds)
      } else if (deptIds && deptIds.length === 0) {
        whereParts.push('responsibleDeptId = -1')
      }
      if (startDate) {
        whereParts.push('feedbackDate >= ?')
        sqlParams.push(startDate.getTime())
      }
      if (endDate) {
        whereParts.push('feedbackDate <= ?')
        sqlParams.push(endDate.getTime())
      }

      // Determine date expression and ensure it's not null
      // Built-in date fields are stored as integer timestamps (Unix ms) in SQLite
      let dateExpr: string
      let dateGroupExpr: string
      if (isBuiltinDate) {
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

      const isColumnField = COLUMN_FIELDS.has(groupBy)
      const isFKField = templateField?.configType && FK_META[templateField.configType]

      // Build date filter (dates stored as integer timestamps in SQLite)
      const dateFilter: string[] = []
      const dateParams: any[] = []
      if (startDate) { dateFilter.push('feedbackDate >= ?'); dateParams.push(startDate.getTime()) }
      if (endDate) { dateFilter.push('feedbackDate <= ?'); dateParams.push(endDate.getTime()) }

      // Production date fields that exist as DB columns
      const DB_DATE_FIELDS = new Set(['feedbackDate', 'productionTime', 'createdAt'])

      if (isColumnField) {
        const where: any = { ...deptFilter }
        if (startDate || endDate) {
          where.feedbackDate = {}
          if (startDate) where.feedbackDate.gte = startDate
          if (endDate) where.feedbackDate.lte = endDate
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
        const meta = FK_META[templateField.configType]
        const where: any = { ...deptFilter }
        if (startDate || endDate) {
          where.feedbackDate = {}
          if (startDate) where.feedbackDate.gte = startDate
          if (endDate) where.feedbackDate.lte = endDate
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
      if (dateFilter.length) { sql += ' AND ' + dateFilter.join(' AND '); params.push(...dateParams) }
      sql += ` GROUP BY value ORDER BY _count DESC LIMIT ?`
      params.push(limit * 2)

      const raw = await prisma.$queryRawUnsafe(sql, ...params) as any[]

      let countSql = `SELECT COUNT(*) as total FROM data_records WHERE templateData IS NOT NULL AND json_extract(templateData, '$.${safeFieldKey}') IS NOT NULL`
      const countParams: any[] = []
      if (dateFilter.length) { countSql += ' AND ' + dateFilter.join(' AND '); countParams.push(...dateParams) }
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
    // Date filter (dates stored as integer timestamps in SQLite)
    if (startDate) {
      whereParts.push('cr.feedbackDate >= ?')
      sqlParams.push(startDate.getTime())
    }
    if (endDate) {
      whereParts.push('cr.feedbackDate <= ?')
      sqlParams.push(endDate.getTime())
    }

    for (const field of groupByFields) {
      const tf = templateFieldMap.get(field)
      const label = tf?.fieldLabel || field
      fieldLabels.push(label)

      if (COLUMN_FIELDS.has(field)) {
        // Direct column
        selectParts.push(`COALESCE(CAST(cr."${field}" AS TEXT), '(空)') as v_${field}`)
        groupParts.push(`cr."${field}"`)
        whereParts.push(`cr."${field}" IS NOT NULL`)
      } else if (tf?.configType && FK_META[tf.configType]) {
        // FK field: JOIN reference table
        const meta = FK_META[tf.configType]
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
