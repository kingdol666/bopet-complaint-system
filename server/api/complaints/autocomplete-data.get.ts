import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)

    // Get distinct rollNos and specificDefects from existing records
    const rollNoRecords = await prisma.complaintRecord.findMany({
      select: { rollNo: true },
      where: { rollNo: { not: null } },
      distinct: ['rollNo'],
      take: 200
    })

    const defectRecords = await prisma.complaintRecord.findMany({
      select: { specificDefect: true },
      where: { specificDefect: { not: null } },
      distinct: ['specificDefect'],
      take: 200
    })

    return {
      success: true,
      data: {
        rollNos: rollNoRecords.map(r => r.rollNo).filter(Boolean),
        specificDefects: defectRecords.map(r => r.specificDefect).filter(Boolean)
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
