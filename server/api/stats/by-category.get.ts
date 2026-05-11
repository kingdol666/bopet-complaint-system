import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = getQuery(event)
    const startDate = query.startDate ? new Date(query.startDate as string) : undefined
    const endDate = query.endDate ? new Date(query.endDate as string) : undefined

    // Department filter
    const deptFilter = buildDepartmentFilter(currentUser)

    // Build date filter
    const dateFilter: any = { ...deptFilter }
    if (startDate || endDate) {
      dateFilter.feedbackDate = {}
      if (startDate) dateFilter.feedbackDate.gte = startDate
      if (endDate) dateFilter.feedbackDate.lte = endDate
    }

    // By customer
    const byCustomer = await prisma.dataRecord.groupBy({
      by: ['customerId'],
      where: {
        ...dateFilter,
        customerId: { not: null }
      },
      _count: true
    })

    // Get customer names
    const customers = await prisma.customer.findMany()
    const customerMap = new Map(customers.map(c => [c.id, c.name]))

    const customerStats = byCustomer
      .filter(item => item.customerId !== null)
      .map(item => ({
        customerId: item.customerId,
        customerName: customerMap.get(item.customerId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // By production line
    const byProductionLine = await prisma.dataRecord.groupBy({
      by: ['productionLineId'],
      where: {
        ...dateFilter,
        productionLineId: { not: null }
      },
      _count: true
    })

    const productionLines = await prisma.productionLine.findMany()
    const productionLineMap = new Map(productionLines.map(p => [p.id, p.name]))

    const productionLineStats = byProductionLine
      .filter(item => item.productionLineId !== null)
      .map(item => ({
        productionLineId: item.productionLineId,
        productionLineName: productionLineMap.get(item.productionLineId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    // By product model
    const byProductModel = await prisma.dataRecord.groupBy({
      by: ['productModelId'],
      where: {
        ...dateFilter,
        productModelId: { not: null }
      },
      _count: true
    })

    const productModels = await prisma.productModel.findMany()
    const productModelMap = new Map(productModels.map(p => [p.id, p.name]))

    const productModelStats = byProductModel
      .filter(item => item.productModelId !== null)
      .map(item => ({
        productModelId: item.productModelId,
        productModelName: productModelMap.get(item.productModelId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // By responsible department
    const byDepartment = await prisma.dataRecord.groupBy({
      by: ['responsibleDeptId'],
      where: {
        ...dateFilter,
        responsibleDeptId: { not: null }
      },
      _count: true
    })

    const departments = await prisma.responsibleDepartment.findMany()
    const departmentMap = new Map(departments.map(d => [d.id, d.name]))

    const departmentStats = byDepartment
      .filter(item => item.responsibleDeptId !== null)
      .map(item => ({
        departmentId: item.responsibleDeptId,
        departmentName: departmentMap.get(item.responsibleDeptId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    // By responsible process
    const byProcess = await prisma.dataRecord.groupBy({
      by: ['responsibleProcessId'],
      where: {
        ...dateFilter,
        responsibleProcessId: { not: null }
      },
      _count: true
    })

    const processes = await prisma.responsibleProcess.findMany()
    const processMap = new Map(processes.map(p => [p.id, p.name]))

    const processStats = byProcess
      .filter(item => item.responsibleProcessId !== null)
      .map(item => ({
        processId: item.responsibleProcessId,
        processName: processMap.get(item.responsibleProcessId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    return {
      success: true,
      data: {
        byCustomer: customerStats,
        byProductionLine: productionLineStats,
        byProductModel: productModelStats,
        byDepartment: departmentStats,
        byProcess: processStats
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取分类统计数据失败'
    })
  }
})
