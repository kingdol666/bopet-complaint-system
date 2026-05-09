import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

// These are the direct string/bool columns on ComplaintRecord that can be grouped
const COLUMN_FIELDS = new Set([
  'complaintCategory', 'defectSource', 'specificDefect', 'closureStatus',
  'thickness', 'rollNo', 'specification', 'shiftTeam', 'machineNo',
  'feedbackContent', 'productUsage', 'improvementAction', 'batchNo', 'application'
])

// FK columns that need ID→name resolution
const FK_CONFIG_MAP: Record<string, { table: string }> = {
  customers: { table: 'customer' },
  productModels: { table: 'productModel' },
  responsibleDepartments: { table: 'responsibleDepartment' }
}

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)
    const query = getQuery(event)

    const groupBy = query.groupBy as string
    const templateId = query.templateId ? Number(query.templateId) : undefined
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined
    const limit = query.limit ? Number(query.limit) : 30

    if (!groupBy) {
      throw createError({ statusCode: 400, message: '缺少groupBy参数' })
    }

    // Validate field exists in template (only when templateId is provided)
    let templateField: any = null
    if (templateId) {
      templateField = await prisma.formTemplateField.findFirst({
        where: { templateId, fieldKey: groupBy }
      })
      if (!templateField) {
        throw createError({ statusCode: 400, message: '该字段不存在于所选模板中' })
      }
    }

    // Determine if this is a direct column or templateData field
    const isColumnField = COLUMN_FIELDS.has(groupBy)
    const isFKField = templateField?.configType && FK_CONFIG_MAP[templateField.configType]

    // Build date filter for both paths
    const dateFilter: string[] = []
    const dateParams: any[] = []
    if (startDate) {
      dateFilter.push('feedbackDate >= ?')
      dateParams.push(startDate)
    }
    if (endDate) {
      dateFilter.push('feedbackDate <= ?')
      dateParams.push(endDate)
    }

    if (isColumnField) {
      // ===== Direct column groupBy =====
      const where: any = {}
      if (startDate || endDate) {
        where.feedbackDate = {}
        if (startDate) where.feedbackDate.gte = startDate
        if (endDate) where.feedbackDate.lte = endDate
      }
      where[groupBy] = { not: null }

      const total = await prisma.complaintRecord.count({ where })
      const raw = await prisma.complaintRecord.groupBy({
        by: [groupBy as any],
        where,
        _count: true
      })

      let results: any[] = raw
        .map(r => {
          const val = (r as any)[groupBy]
          return {
            name: val !== null && val !== undefined ? String(val) : '(空)',
            value: val,
            count: r._count,
            percentage: total > 0 ? (r._count / total * 100).toFixed(1) : '0'
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

      return {
        success: true,
        data: { groupBy, total, results, fieldLabel: templateField?.fieldLabel || groupBy }
      }
    }

    if (isFKField) {
      // ===== FK column groupBy with name resolution =====
      const fkFieldKey = groupBy // e.g., "customerId"
      const ref = FK_CONFIG_MAP[templateField.configType]

      const where: any = {}
      if (startDate || endDate) {
        where.feedbackDate = {}
        if (startDate) where.feedbackDate.gte = startDate
        if (endDate) where.feedbackDate.lte = endDate
      }
      where[fkFieldKey] = { not: null }

      const total = await prisma.complaintRecord.count({ where })
      const raw = await prisma.complaintRecord.groupBy({
        by: [fkFieldKey as any],
        where,
        _count: true
      })

      // Load names from reference table
      const entities = await (prisma as any)[ref.table].findMany({
        select: { id: true, name: true }
      })
      const nameMap = new Map<number, string>()
      for (const e of entities) nameMap.set(e.id, e.name)

      let results: any[] = raw
        .map(r => {
          const val = (r as any)[fkFieldKey]
          return {
            name: nameMap.get(Number(val)) || String(val || '(空)'),
            value: val,
            count: r._count,
            percentage: total > 0 ? (r._count / total * 100).toFixed(1) : '0'
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

      return {
        success: true,
        data: { groupBy, total, results, fieldLabel: templateField.fieldLabel }
      }
    }

    // ===== templateData JSON field analysis =====
    // Allow alphanumeric, underscores, hyphens, and CJK characters in JSON keys
    const safeFieldKey = groupBy.replace(/[^\w一-鿿-]/g, '')
    if (!safeFieldKey) {
      throw createError({ statusCode: 400, message: '字段名无效' })
    }

    let sql = `SELECT json_extract(templateData, '$.${safeFieldKey}') as value, COUNT(*) as _count FROM complaint_records WHERE templateData IS NOT NULL AND json_extract(templateData, '$.${safeFieldKey}') IS NOT NULL`
    const params: any[] = []

    if (dateFilter.length) {
      sql += ' AND ' + dateFilter.join(' AND ')
      params.push(...dateParams)
    }

    sql += ` GROUP BY json_extract(templateData, '$.${safeFieldKey}') ORDER BY _count DESC LIMIT ?`
    params.push(limit * 2)

    const raw = await prisma.$queryRawUnsafe(sql, ...params) as any[]

    let countSql = `SELECT COUNT(*) as total FROM complaint_records WHERE templateData IS NOT NULL AND json_extract(templateData, '$.${safeFieldKey}') IS NOT NULL`
    const countParams: any[] = []
    if (dateFilter.length) {
      countSql += ' AND ' + dateFilter.join(' AND ')
      countParams.push(...dateParams)
    }
    const countResult = await prisma.$queryRawUnsafe(countSql, ...countParams) as any[]
    const total = Number(countResult[0]?.total || 0)

    let results: any[] = raw.map(r => ({
      name: r.value !== null && r.value !== undefined ? String(r.value) : '(空)',
      value: r.value,
      count: Number(r._count),
      percentage: total > 0 ? (Number(r._count) / total * 100).toFixed(1) : '0'
    }))

    results = results.slice(0, limit)

    return {
      success: true,
      data: { groupBy, total, results, fieldLabel: templateField?.fieldLabel || groupBy }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '分析失败' })
  }
})
