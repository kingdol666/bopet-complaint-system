import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

// Query schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
  problemCategoryId: z.coerce.number().int().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getQuery(event)
    const params = querySchema.parse(query)
    const { page, pageSize, keyword, enabled, problemCategoryId } = params

    // Build where clause
    const where: any = {}

    if (keyword) {
      where.OR = [
        { customerExpression: { contains: keyword } },
        { keywordPattern: { contains: keyword } },
        { internalComplaintName: { contains: keyword } }
      ]
    }

    if (enabled !== undefined) {
      where.enabled = enabled
    }

    if (problemCategoryId) {
      where.problemCategoryId = problemCategoryId
    }

    // Get total count
    const total = await prisma.complaintProblemMapping.count({ where })

    // Get paginated data
    const records = await prisma.complaintProblemMapping.findMany({
      where,
      include: {
        problemCategory: true,
        problemSubcategory: true
      },
      orderBy: { createdAt: 'desc' },
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
