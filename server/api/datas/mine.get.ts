import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'
import { DATA_INCLUDE_FULL } from '~/server/utils/db-columns'

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  templateId: z.coerce.number().int().optional(),
  visibility: z.enum(['all', 'public', 'private']).default('all'),
  sortBy: z.string().default('createdAt').refine(v => ['feedbackDate', 'createdAt', 'updatedAt', 'dataNo'].includes(v), { message: '无效的排序字段' }),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * 我创建的数据：仅返回当前登录用户自己创建的记录（无论公开/私密）。
 * 支持关键字、日期范围、处理状态、模板、可见性过滤与分页。
 */
export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    // 核心条件：仅自己创建的数据（无论公开/私密）
    const where: any = { createdById: currentUser.id }

    // 关键字搜索
    if (params.keyword) {
      const keyword = params.keyword
      where.OR = [
        { dataNo: { contains: keyword } },
        { feedbackContent: { contains: keyword } },
        { category: { contains: keyword } },
        { rollNo: { contains: keyword } },
        { batchNo: { contains: keyword } }
      ]
    }

    // 日期范围
    if (params.startDate || params.endDate) {
      where.feedbackDate = {}
      if (params.startDate) where.feedbackDate.gte = new Date(params.startDate)
      if (params.endDate) {
        const endOfDay = new Date(params.endDate)
        endOfDay.setHours(23, 59, 59, 999)
        where.feedbackDate.lte = endOfDay
      }
    }

    if (params.closureStatus) where.closureStatus = params.closureStatus

    // 可见性过滤
    if (params.visibility === 'public') where.isPublic = true
    if (params.visibility === 'private') where.isPublic = false

    // 模板过滤（templateIds JSON 匹配）
    if (params.templateId) {
      const tid = String(params.templateId)
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { templateIds: { contains: `[${tid}]` } },
          { templateIds: { contains: `[${tid},` } },
          { templateIds: { contains: `,${tid}]` } },
          { templateIds: { contains: `,${tid},` } }
        ]
      })
    }

    const total = await prisma.dataRecord.count({ where })
    const records = await prisma.dataRecord.findMany({
      where,
      include: DATA_INCLUDE_FULL,
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    })

    return {
      success: true,
      data: {
        records,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize)
        }
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw error
  }
})
