import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()

    // Department filter
    const deptFilter = buildDepartmentFilter(currentUser)

    // Get monthly counts for the specified year using raw SQL (avoids loading all records into memory)
    const yearStart = `${year}-01-01`
    const yearEnd = `${year + 1}-01-01`

    // Build department filter SQL clause
    let deptSql = ''
    const sqlParams: any[] = [yearStart, yearEnd]
    if (deptFilter.departmentId) {
      deptSql = 'AND departmentId = ?'
      sqlParams.push(deptFilter.departmentId)
    } else if (deptFilter.departmentId && (deptFilter as any).departmentId?.in) {
      const ids = (deptFilter as any).departmentId.in as number[]
      if (ids.length > 0) {
        deptSql = `AND departmentId IN (${ids.map(() => '?').join(',')})`
        sqlParams.push(...ids)
      }
    }

    const rawResults = await prisma.$queryRawUnsafe<
      Array<{ month: string; closureStatus: string; count: bigint }>
    >(
      `SELECT strftime('%m', feedbackDate) as month, closureStatus, COUNT(*) as count
       FROM data_records
       WHERE feedbackDate >= ? AND feedbackDate < ? ${deptSql}
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
