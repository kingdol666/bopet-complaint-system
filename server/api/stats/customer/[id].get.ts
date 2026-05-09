import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0', 10)
    const query = getQuery(event)
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined
    const complaintCategory = query.complaintCategory as string | undefined
    const defectSource = query.defectSource as string | undefined

    // Get customer
    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      throw createError({ statusCode: 404, message: '客户不存在' })
    }

    // Build where filter
    const where: any = { customerId: id }
    if (startDate || endDate) {
      where.feedbackDate = {}
      if (startDate) where.feedbackDate.gte = startDate
      if (endDate) where.feedbackDate.lte = endDate
    }
    if (complaintCategory) where.complaintCategory = complaintCategory
    if (defectSource) where.defectSource = defectSource

    const total = await prisma.complaintRecord.count({ where })

    // By complaint category
    const byCategoryRaw = await prisma.complaintRecord.groupBy({
      by: ['complaintCategory'],
      where: { ...where, complaintCategory: complaintCategory || { not: null } },
      _count: true
    })
    const byCategory = byCategoryRaw
      .filter(item => item.complaintCategory)
      .map(item => ({ name: item.complaintCategory, count: item._count }))
      .sort((a, b) => b.count - a.count)

    // By defect source
    const byDefectSourceRaw = await prisma.complaintRecord.groupBy({
      by: ['defectSource'],
      where: { ...where, defectSource: defectSource || { not: null } },
      _count: true
    })
    const byDefectSource = byDefectSourceRaw
      .filter(item => item.defectSource)
      .map(item => ({ name: item.defectSource, count: item._count }))
      .sort((a, b) => b.count - a.count)

    // Top 10 specific defects
    const topSpecificDefectsRaw = await prisma.complaintRecord.groupBy({
      by: ['specificDefect'],
      where: { ...where, specificDefect: { not: null } },
      _count: true
    })
    const topSpecificDefects = topSpecificDefectsRaw
      .filter(item => item.specificDefect)
      .map(item => ({ name: item.specificDefect, count: item._count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      success: true,
      data: { customer, total, byCategory, byDefectSource, topSpecificDefects }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
