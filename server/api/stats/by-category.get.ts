import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
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

  // By problem category
  const byCategory = await prisma.complaintRecord.groupBy({
    by: ['problemCategoryId'],
    where: {
      ...dateFilter,
      problemCategoryId: { not: null }
    },
    _count: true
  })

  // Get category names
  const categories = await prisma.problemCategory.findMany()
  const categoryMap = new Map(categories.map(c => [c.id, c.name]))

  const categoryStats = byCategory
    .filter(item => item.problemCategoryId !== null)
    .map(item => ({
      categoryId: item.problemCategoryId,
      categoryName: categoryMap.get(item.problemCategoryId!) || '未知',
      count: item._count
    }))
    .sort((a, b) => b.count - a.count)

  // By customer
  const byCustomer = await prisma.complaintRecord.groupBy({
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
  const byProductionLine = await prisma.complaintRecord.groupBy({
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
  const byProductModel = await prisma.complaintRecord.groupBy({
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

  return {
    success: true,
    data: {
      byCategory: categoryStats,
      byCustomer: customerStats,
      byProductionLine: productionLineStats,
      byProductModel: productModelStats
    }
  }
})
