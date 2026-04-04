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

    // Total complaints
    const total = await prisma.complaintRecord.count({ where: baseWhere })

    // This month's complaints
    const thisMonth = await prisma.complaintRecord.count({
      where: {
        ...baseWhere,
        feedbackDate: { gte: startOfMonth }
      }
    })

    // Last month's complaints
    const lastMonth = await prisma.complaintRecord.count({
      where: {
        ...baseWhere,
        feedbackDate: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    // By status
    const pending = await prisma.complaintRecord.count({
      where: { ...baseWhere, closureStatus: 'pending' }
    })

    const processing = await prisma.complaintRecord.count({
      where: { ...baseWhere, closureStatus: 'processing' }
    })

    const closed = await prisma.complaintRecord.count({
      where: { ...baseWhere, closureStatus: 'closed' }
    })

    // Repeated issues
    const repeatedIssues = await prisma.complaintRecord.count({
      where: { ...baseWhere, repeatedIssue: true }
    })

    // Calculate month-over-month change
    const momChange = lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)
      : '0'

    // Template distribution - parse templateIds from all records
    const allRecords = await prisma.complaintRecord.findMany({
      where: baseWhere,
      select: { templateIds: true }
    })

    const templateCountMap: Record<number, number> = {}
    for (const record of allRecords) {
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
        repeatedIssues,
        byTemplate
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || '获取统计数据失败'
    })
  }
})
