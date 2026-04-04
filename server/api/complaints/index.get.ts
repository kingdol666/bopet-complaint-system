import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { booleanQueryParam } from '~/server/utils/query'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

// Query schema for filtering and pagination
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('feedbackDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Filters
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().int().optional(),
  productModelId: z.coerce.number().int().optional(),
  productionLineId: z.coerce.number().int().optional(),
  problemCategoryId: z.coerce.number().int().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.coerce.number().int().optional(),
  severityLevelId: z.coerce.number().int().optional(),
  repeatedIssue: booleanQueryParam,
  templateId: z.coerce.number().int().optional()
})

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
        { complaintNo: { contains: keyword } },
        { feedbackContent: { contains: keyword } },
        { customerComplaintText: { contains: keyword } },
        { internalComplaintName: { contains: keyword } },
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
    if (params.problemCategoryId) where.problemCategoryId = params.problemCategoryId
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId
    if (params.severityLevelId) where.severityLevelId = params.severityLevelId
    if (params.repeatedIssue !== undefined) where.repeatedIssue = params.repeatedIssue

    // Template filter: search templateIds JSON string for the given templateId
    if (params.templateId) {
      // SQLite: use LIKE to match the templateId in the JSON array
      where.templateIds = { contains: String(params.templateId) }
    }

    // Get total count
    const total = await prisma.complaintRecord.count({ where })

    // Get paginated data
    const records = await prisma.complaintRecord.findMany({
      where,
      include: {
        customer: true,
        productModel: true,
        productionLine: true,
        problemCategory: true,
        problemSubcategory: true,
        severityLevel: true,
        customerDemand: true,
        compensationType: true,
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
        statusMessage: error.errors[0].message
      })
    }
    throw error
  }
})
