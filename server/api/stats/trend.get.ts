import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = parseInt(query.year as string) || new Date().getFullYear()

  // Get monthly counts for the specified year
  const records = await prisma.complaintRecord.findMany({
    where: {
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
})
