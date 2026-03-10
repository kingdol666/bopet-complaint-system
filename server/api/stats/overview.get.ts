import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  // Get current date info
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Total complaints
  const total = await prisma.complaintRecord.count()

  // This month's complaints
  const thisMonth = await prisma.complaintRecord.count({
    where: {
      feedbackDate: { gte: startOfMonth }
    }
  })

  // Last month's complaints
  const lastMonth = await prisma.complaintRecord.count({
    where: {
      feedbackDate: {
        gte: startOfLastMonth,
        lte: endOfLastMonth
      }
    }
  })

  // By status
  const pending = await prisma.complaintRecord.count({
    where: { closureStatus: 'pending' }
  })

  const processing = await prisma.complaintRecord.count({
    where: { closureStatus: 'processing' }
  })

  const closed = await prisma.complaintRecord.count({
    where: { closureStatus: 'closed' }
  })

  // Repeated issues
  const repeatedIssues = await prisma.complaintRecord.count({
    where: { repeatedIssue: true }
  })

  // Calculate month-over-month change
  const momChange = lastMonth > 0
    ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)
    : '0'

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
      repeatedIssues
    }
  }
})
