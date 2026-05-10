import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = getQuery(event)
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined
    const customerId = query.customerId ? Number(query.customerId) : undefined
    const deptFilter = buildDepartmentFilter(currentUser)

    const where: any = { specificDefect: { not: null }, ...deptFilter }
    if (startDate || endDate) {
      where.feedbackDate = {}
      if (startDate) where.feedbackDate.gte = startDate
      if (endDate) where.feedbackDate.lte = endDate
    }
    if (customerId) where.customerId = customerId

    const raw = await prisma.complaintRecord.groupBy({
      by: ['specificDefect'],
      where,
      _count: true
    })

    const total = raw.reduce((sum, item) => sum + item._count, 0)

    const top10 = raw
      .map(item => ({
        name: item.specificDefect!,
        count: item._count,
        percentage: total > 0 ? (item._count / total * 100).toFixed(1) + '%' : '0%'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { success: true, data: { top10, total } }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
