import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)

    // Department filter: non-superadmin users can only see rollNos from their own departments' data
    const deptFilter = buildDepartmentFilter(currentUser)

    // Get distinct rollNos from existing records
    const rollNoRecords = await prisma.dataRecord.findMany({
      select: { rollNo: true },
      where: { rollNo: { not: null }, ...deptFilter },
      distinct: ['rollNo'],
      take: 200
    })

    return {
      success: true,
      data: {
        rollNos: rollNoRecords.map(r => r.rollNo).filter(Boolean)
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取数据失败' })
  }
})
