import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

// Get all config data for dropdowns
export default defineEventHandler(async (event) => {
  await requireSessionUser(event)
  try {
    const [
      productionLines,
      customers,
      productModels,
      responsibleDepartments,
      responsibleProcesses
    ] = await Promise.all([
      prisma.productionLine.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.customer.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.productModel.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.responsibleDepartment.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.responsibleProcess.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' },
        include: { department: true }
      })
    ])

    return {
      success: true,
      data: {
        productionLines,
        customers,
        productModels,
        responsibleDepartments,
        responsibleProcesses
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取配置数据失败'
    })
  }
})
