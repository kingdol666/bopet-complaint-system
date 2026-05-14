import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

// All known DB columns on DataRecord
const DB_COLUMNS = new Set([
  'dataNo', 'feedbackDate', 'productionTime', 'customerId', 'productModelId', 'shaftCount',
  'thickness', 'rollNo', 'specification', 'quantityInvolved', 'application',
  'productionLineId', 'shiftTeam', 'machineNo', 'batchNo',
  'feedbackContent', 'category',
  'closureStatus',
  'responsibleDeptId', 'responsibleProcessId',
  'rootCauseAnalysis', 'correctiveAction', 'lessonsLearned', 'reviewConclusion',
  'productUsage', 'improvementAction', 'remark'
])

// Query schema for filtering and pagination
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('feedbackDate').refine(v => ['feedbackDate','createdAt','updatedAt','closureStatus','category','dataNo'].includes(v), { message: '无效的排序字段' }),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Filters
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().int().optional(),
  productModelId: z.coerce.number().int().optional(),
  productionLineId: z.coerce.number().int().optional(),
  category: z.string().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.coerce.number().int().optional(),
  templateId: z.coerce.number().int().optional(),
  // Dynamic filters: JSON string of [{field, operator, value}]
  filters: z.string().optional()
})

function applyDynamicFilter(where: any, fieldName: string, operator: string, val: any) {
  if (val === undefined || val === null || val === '') return

  const isDBColumn = DB_COLUMNS.has(fieldName)

  if (isDBColumn) {
    // Apply filter directly to DB column
    switch (operator) {
      case 'eq':
        if (['shaftCount', 'quantityInvolved', 'productModelId', 'customerId', 'productionLineId',
             'responsibleDeptId', 'responsibleProcessId'].includes(fieldName)) {
          where[fieldName] = Number(val)
        } else if (fieldName === 'closureStatus') {
          where[fieldName] = val
        } else if (fieldName === 'feedbackDate' || fieldName === 'productionTime') {
          where[fieldName] = {
            gte: new Date(val),
            lte: new Date(new Date(val).setHours(23, 59, 59, 999))
          }
        } else {
          where[fieldName] = { equals: val }
        }
        break
      case 'contains':
        where[fieldName] = { contains: String(val) }
        break
      case 'gt':
        where[fieldName] = { gt: Number(val) }
        break
      case 'lt':
        where[fieldName] = { lt: Number(val) }
        break
      case 'gte':
        where[fieldName] = { gte: Number(val) }
        break
      case 'lte':
        where[fieldName] = { lte: Number(val) }
        break
      case 'date_eq':
        where[fieldName] = {
          gte: new Date(val),
          lte: new Date(new Date(val).setHours(23, 59, 59, 999))
        }
        break
      case 'date_gte':
        where[fieldName] = { gte: new Date(val) }
        break
      case 'date_lte':
        where[fieldName] = { lte: new Date(val) }
        break
      default:
        where[fieldName] = { contains: String(val) }
    }
  } else {
    // Custom field stored in templateData JSON - add to where clause for templateData
    // We'll filter these in memory after fetching
    if (!where._customFilters) where._customFilters = []
    where._customFilters.push({ fieldName, operator, val: String(val) })
  }
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    const { page, pageSize, sortBy, sortOrder } = params

    // Build where clause
    const where: any = {}

    // Department filter: non-superadmin users can only see their own departments' data
    const deptFilter = buildDepartmentFilter(currentUser)
    Object.assign(where, deptFilter)

    // Keyword search
    if (params.keyword) {
      const keyword = params.keyword
      where.OR = [
        { dataNo: { contains: keyword } },
        { feedbackContent: { contains: keyword } },
        { category: { contains: keyword } },
        { rootCauseAnalysis: { contains: keyword } },
        { correctiveAction: { contains: keyword } },
        { rollNo: { contains: keyword } },
        { batchNo: { contains: keyword } }
      ]
    }

    // Date range
    if (params.startDate || params.endDate) {
      where.feedbackDate = {}
      if (params.startDate) {
        where.feedbackDate.gte = new Date(params.startDate)
      }
      if (params.endDate) {
        where.feedbackDate.lte = new Date(params.endDate)
      }
    }

    // Other filters
    if (params.customerId) where.customerId = params.customerId
    if (params.productModelId) where.productModelId = params.productModelId
    if (params.productionLineId) where.productionLineId = params.productionLineId
    if (params.category) where.category = params.category
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId

    // Template filter: search templateIds JSON string for the given templateId
    if (params.templateId) {
      where.templateIds = { contains: `"${params.templateId}"` }
    }

    // Dynamic filters: parse JSON string
    if (params.filters) {
      try {
        const dynamicFilters: Array<{ field: string; operator: string; value: any }> = JSON.parse(params.filters)
        for (const df of dynamicFilters) {
          if (!df.field) continue
          applyDynamicFilter(where, df.field, df.operator, df.value)
        }
      } catch (e) {
        // Ignore parse errors for dynamic filters
      }
    }

    // Extract custom filters before querying
    const customFilters = where._customFilters || []
    delete where._customFilters

    // If there are custom filters, we need to filter in memory
    // First get all records matching DB filters, then filter custom fields
    let records: any[] = []
    let total = 0

    if (customFilters.length > 0) {
      // Get records matching DB filters with a hard limit to avoid memory issues
      const CUSTOM_FILTER_MEMORY_LIMIT = 5000
      const allRecords = await prisma.dataRecord.findMany({
        where,
        include: {
          customer: true,
          productModel: true,
          productionLine: true,
          responsibleDept: true,
          responsibleProcess: true,
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        take: CUSTOM_FILTER_MEMORY_LIMIT
      })

      // Filter in memory for custom fields
      const filtered = allRecords.filter(record => {
        let templateData: Record<string, any> = {}
        if (record.templateData) {
          try {
            templateData = JSON.parse(record.templateData)
          } catch {
            return false
          }
        }

        for (const cf of customFilters) {
          const fieldVal = templateData[cf.fieldName]
          if (fieldVal === undefined || fieldVal === null) return false

          const strFieldVal = String(fieldVal).toLowerCase()
          const strCfVal = String(cf.val).toLowerCase()

          switch (cf.operator) {
            case 'eq':
              if (strFieldVal !== strCfVal) return false
              break
            case 'contains':
              if (!strFieldVal.includes(strCfVal)) return false
              break
            case 'gt':
              if (Number(fieldVal) <= Number(cf.val)) return false
              break
            case 'lt':
              if (Number(fieldVal) >= Number(cf.val)) return false
              break
            case 'gte':
              if (Number(fieldVal) < Number(cf.val)) return false
              break
            case 'lte':
              if (Number(fieldVal) > Number(cf.val)) return false
              break
            case 'date_eq':
            case 'date_gte':
            case 'date_lte':
              const fieldDate = new Date(fieldVal)
              const filterDate = new Date(cf.val)
              if (cf.operator === 'date_eq' && fieldDate.toISOString().slice(0, 10) !== filterDate.toISOString().slice(0, 10)) return false
              if (cf.operator === 'date_gte' && fieldDate < filterDate) return false
              if (cf.operator === 'date_lte' && fieldDate > filterDate) return false
              break
            default:
              if (!strFieldVal.includes(strCfVal)) return false
          }
        }
        return true
      })

      total = filtered.length
      // Apply pagination
      const start = (page - 1) * pageSize
      records = filtered.slice(start, start + pageSize)
    } else {
      // No custom filters, use normal pagination
      total = await prisma.dataRecord.count({ where })

      records = await prisma.dataRecord.findMany({
        where,
        include: {
          customer: true,
          productModel: true,
          productionLine: true,
          responsibleDept: true,
          responsibleProcess: true,
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    }

    return {
      success: true,
      data: {
        records,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.errors[0].message
      })
    }
    throw error
  }
})
