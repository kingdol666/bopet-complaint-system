import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const updateSchema = z.object({
  customerExpression: z.string().max(500).optional(),
  keywordPattern: z.string().max(500).nullable().optional(),
  internalComplaintName: z.string().max(200).optional(),
  problemCategoryId: z.number().int().nullable().optional(),
  problemSubcategoryId: z.number().int().nullable().optional(),
  enabled: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的ID'
    })
  }

  // Handle GET
  if (event.method === 'GET') {
    const record = await prisma.complaintProblemMapping.findUnique({
      where: { id },
      include: {
        problemCategory: true,
        problemSubcategory: true
      }
    })

    if (!record) {
      throw createError({
        statusCode: 404,
        statusMessage: '记录不存在'
      })
    }

    return {
      success: true,
      data: record
    }
  }

  // Handle PUT
  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const data = updateSchema.parse(body)

      const record = await prisma.complaintProblemMapping.update({
        where: { id },
        data,
        include: {
          problemCategory: true,
          problemSubcategory: true
        }
      })

      return {
        success: true,
        data: record,
        message: '更新成功'
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
  }

  // Handle DELETE
  if (event.method === 'DELETE') {
    await prisma.complaintProblemMapping.delete({
      where: { id }
    })

    return {
      success: true,
      message: '删除成功'
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})
