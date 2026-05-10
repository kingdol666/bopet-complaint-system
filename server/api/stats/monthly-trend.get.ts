import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined
    const customerId = query.customerId ? Number(query.customerId) : undefined
    const deptFilter = buildDepartmentFilter(user)

    const where: any = { ...deptFilter }
    if (startDate || endDate) {
      where.feedbackDate = {}
      if (startDate) where.feedbackDate.gte = startDate
      if (endDate) where.feedbackDate.lte = endDate
    }
    if (customerId) where.customerId = customerId

    const records = await prisma.complaintRecord.findMany({
      where,
      select: { feedbackDate: true, productionTime: true },
      orderBy: { feedbackDate: 'asc' }
    })

    // Group by month for feedback date
    const feedbackByMonth: Record<string, number> = {}
    const productionByMonth: Record<string, number> = {}

    for (const r of records) {
      if (r.feedbackDate) {
        const m = new Date(r.feedbackDate).toISOString().slice(0, 7) // YYYY-MM
        feedbackByMonth[m] = (feedbackByMonth[m] || 0) + 1
      }
      if (r.productionTime) {
        const m = new Date(r.productionTime).toISOString().slice(0, 7)
        productionByMonth[m] = (productionByMonth[m] || 0) + 1
      }
    }

    // Get all months in range
    const allMonths = [...new Set([...Object.keys(feedbackByMonth), ...Object.keys(productionByMonth)])].sort()

    const monthly = allMonths.map(month => ({
      month,
      feedbackCount: feedbackByMonth[month] || 0,
      productionCount: productionByMonth[month] || 0
    }))

    return { success: true, data: { monthly } }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
