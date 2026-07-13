import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildVisibilitySQL } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()

    // Dates are stored as Unix millisecond integers in SQLite
    const yearStart = new Date(year, 0, 1).getTime()
    const yearEnd = new Date(year + 1, 0, 1).getTime()

    // Build visibility SQL clause (respects isPublic + createdById + department access)
    const vis = buildVisibilitySQL(currentUser)
    const visSql = vis.clause ? `AND ${vis.clause}` : ''
    const sqlParams: any[] = [yearStart, yearEnd, ...vis.params]

    const rawResults = await prisma.$queryRawUnsafe<
      Array<{ month: string; closureStatus: string; count: bigint }>
    >(
      `SELECT strftime('%m', feedbackDate/1000, 'unixepoch') as month, closureStatus, COUNT(*) as count
       FROM data_records
       WHERE feedbackDate >= ? AND feedbackDate < ? ${visSql}
       GROUP BY month, closureStatus
       ORDER BY month`,
      ...sqlParams
    )

    // Build monthly data from raw results
    const monthlyData: Array<{
      month: number
      total: number
      pending: number
      processing: number
      closed: number
    }> = []

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0')
      const monthRows = rawResults.filter(r => r.month === monthStr)
      let total = 0, pending = 0, processing = 0, closed = 0
      for (const row of monthRows) {
        const count = Number(row.count)
        total += count
        if (row.closureStatus === 'pending') pending = count
        else if (row.closureStatus === 'processing') processing = count
        else if (row.closureStatus === 'closed') closed = count
      }
      monthlyData.push({ month, total, pending, processing, closed })
    }

    return {
      success: true,
      data: {
        year,
        monthly: monthlyData
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取趋势数据失败'
    })
  }
})
