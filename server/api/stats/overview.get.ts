import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)

    // Department filter
    const deptFilter = buildDepartmentFilter(currentUser)
    const baseWhere = { ...deptFilter }

    // Get current date info
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Total data records
    const total = await prisma.dataRecord.count({ where: baseWhere })

    // This month's records
    const thisMonth = await prisma.dataRecord.count({
      where: {
        ...baseWhere,
        feedbackDate: { gte: startOfMonth }
      }
    })

    // Last month's records
    const lastMonth = await prisma.dataRecord.count({
      where: {
        ...baseWhere,
        feedbackDate: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    // By status
    const pending = await prisma.dataRecord.count({
      where: { ...baseWhere, closureStatus: 'pending' }
    })

    const processing = await prisma.dataRecord.count({
      where: { ...baseWhere, closureStatus: 'processing' }
    })

    const closed = await prisma.dataRecord.count({
      where: { ...baseWhere, closureStatus: 'closed' }
    })

    // Calculate month-over-month change
    const momChange = lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)
      : '0'

    // Template distribution - use raw SQL to count records grouped by templateId
    // templateIds is stored as a JSON string like "[1,2,3]"
    // We use a raw SQL approach: fetch limited records and parse in JS to avoid loading all records
    const TEMPLATE_STATS_LIMIT = 10000
    const limitedRecords = await prisma.dataRecord.findMany({
      where: baseWhere,
      select: { templateIds: true },
      orderBy: { id: 'desc' },
      take: TEMPLATE_STATS_LIMIT
    })

    const templateCountMap: Record<number, number> = {}
    for (const record of limitedRecords) {
      if (!record.templateIds) continue
      try {
        const ids: number[] = typeof record.templateIds === 'string'
          ? JSON.parse(record.templateIds)
          : record.templateIds
        for (const id of ids) {
          templateCountMap[id] = (templateCountMap[id] || 0) + 1
        }
      } catch {}
    }

    // Resolve template names
    const allTemplates = await prisma.formTemplate.findMany({
      select: { id: true, name: true, isDefault: true }
    })
    const templateMap = new Map(allTemplates.map(t => [t.id, t]))

    const byTemplate = Object.entries(templateCountMap)
      .map(([id, count]) => {
        const tpl = templateMap.get(Number(id))
        return {
          templateId: Number(id),
          templateName: tpl?.name || '未知模板',
          isDefault: tpl?.isDefault || false,
          count
        }
      })
      .sort((a, b) => b.count - a.count)

    return {
      success: true,
      data: {
        total,
        thisMonth,
        lastMonth,
        momChange: `${momChange}%`,
        byStatus: {
          pending,
          processing,
          closed
        },
        byTemplate
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取统计数据失败'
    })
  }
})
