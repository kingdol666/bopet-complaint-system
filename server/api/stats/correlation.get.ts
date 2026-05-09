import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)
    const query = getQuery(event)
    const defectSource = query.defectSource as string

    // Get all distinct defect sources
    const allSources = await prisma.complaintRecord.groupBy({
      by: ['defectSource'],
      where: { defectSource: { not: null } },
      _count: true
    })

    const sources = allSources
      .filter(s => s.defectSource)
      .map(s => ({ name: s.defectSource!, count: s._count }))
      .sort((a, b) => b.count - a.count)

    // If a specific defect source is queried, return its top defects
    let correlation: any[] = []
    if (defectSource) {
      const raw = await prisma.complaintRecord.groupBy({
        by: ['specificDefect'],
        where: { defectSource, specificDefect: { not: null } },
        _count: true
      })
      correlation = raw
        .filter(r => r.specificDefect)
        .map(r => ({ specificDefect: r.specificDefect!, count: r._count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    return { success: true, data: { sources, correlation, queriedSource: defectSource || null } }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
