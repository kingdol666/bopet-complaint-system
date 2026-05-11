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
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined
    const limit = query.limit ? Number(query.limit) : 30

    if (groupByFields.length === 0) {
      throw createError({ statusCode: 400, message: '缺少groupBy参数' })
    }

    // Fetch template field definitions (for labels and FK detection)
    let templateFieldMap = new Map<string, any>()
    if (templateId) {
      const tplFields = await prisma.formTemplateField.findMany({
        where: { templateId, fieldKey: { in: groupByFields } }
      })
      for (const f of tplFields) templateFieldMap.set(f.fieldKey, f)
    }

    // ─── Single-field path (keep existing logic) ───
    if (groupByFields.length === 1) {
      const groupBy = groupByFields[0]
      const templateField = templateFieldMap.get(groupBy) || null

      const isColumnField = COLUMN_FIELDS.has(groupBy)
      const isFKField = templateField?.configType && FK_META[templateField.configType]

      // Build date filter
      const dateFilter: string[] = []
      const dateParams: any[] = []
      if (startDate) { dateFilter.push('feedbackDate >= ?'); dateParams.push(startDate) }
      if (endDate) { dateFilter.push('feedbackDate <= ?'); dateParams.push(endDate) }

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

    // Department filter (data isolation for non-superadmin)
    if (deptIds && deptIds.length > 0) {
      whereParts.push(`cr.responsibleDeptId IN (${deptIds.join(',')})`)
    } else if (deptIds && deptIds.length === 0) {
      whereParts.push('cr.responsibleDeptId = -1')
    }
    // Date filter
    if (startDate) {
      whereParts.push(`cr.feedbackDate >= '${startDate.toISOString().split('T')[0]}'`)
    }
    if (endDate) {
      whereParts.push(`cr.feedbackDate <= '${endDate.toISOString().split('T')[0]}'`)
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

    // Count total matching RECORDS (not groups)
    const countSQL = `
      SELECT COUNT(*) as total FROM data_records cr
      ${joinClause}
      WHERE ${whereClause}
    `
    const countResult = await prisma.$queryRawUnsafe(countSQL) as any[]
    const total = Number(countResult[0]?.total || 0)

    // Data query
    const dataSQL = `
      SELECT ${selectClause}, COUNT(*) as _count
      FROM data_records cr
      ${joinClause}
      WHERE ${whereClause}
      GROUP BY ${groupClause}
      ORDER BY _count DESC
      LIMIT ${limit * 2}
    `
    const rawRows = await prisma.$queryRawUnsafe(dataSQL) as any[]

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
