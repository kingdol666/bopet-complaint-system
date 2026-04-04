import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()

    // Department filter
    const deptFilter = buildDepartmentFilter(currentUser)

    // Get monthly counts for the specified year
    const records = await prisma.complaintRecord.findMany({
      where: {
        ...deptFilter,
        feedbackDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      select: {
        feedbackDate: true,
        closureStatus: true
      }
    })

    // Group by month
    const monthlyData: Array<{
      month: number
      total: number
      pending: number
      processing: number
      closed: number
    }> = []

    for (let month = 1; month <= 12; month++) {
      const monthRecords = records.filter(r => {
        const d = new Date(r.feedbackDate)
        return d.getMonth() + 1 === month
      })

      monthlyData.push({
        month,
        total: monthRecords.length,
        pending: monthRecords.filter(r => r.closureStatus === 'pending').length,
        processing: monthRecords.filter(r => r.closureStatus === 'processing').length,
        closed: monthRecords.filter(r => r.closureStatus === 'closed').length
      })
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
      statusMessage: error.message || '获取趋势数据失败'
    })
  }
})
