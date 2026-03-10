import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth'

const createSchema = z.object({
  customerExpression: z.string().max(500),
  keywordPattern: z.string().max(500).optional().nullable(),
  internalComplaintName: z.string().max(200),
  problemCategoryId: z.number().int().optional().nullable(),
  problemSubcategoryId: z.number().int().optional().nullable(),
  enabled: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const data = createSchema.parse(body)

    const record = await prisma.complaintProblemMapping.create({
      data,
      include: {
        problemCategory: true,
        problemSubcategory: true
      }
    })

    return {
      success: true,
      data: record,
      message: '问题映射创建成功'
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
