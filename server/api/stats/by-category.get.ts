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

    // By problem subcategory
    const bySubcategory = await prisma.complaintRecord.groupBy({
      by: ['problemSubcategoryId'],
      where: {
        ...dateFilter,
        problemSubcategoryId: { not: null }
      },
      _count: true
    })

    const subcategories = await prisma.problemSubcategory.findMany()
    const subcategoryMap = new Map(subcategories.map(s => [s.id, s.name]))

    const subcategoryStats = bySubcategory
      .filter(item => item.problemSubcategoryId !== null)
      .map(item => ({
        subcategoryId: item.problemSubcategoryId,
        subcategoryName: subcategoryMap.get(item.problemSubcategoryId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    // By customer demand
    const byCustomerDemand = await prisma.complaintRecord.groupBy({
      by: ['customerDemandId'],
      where: {
        ...dateFilter,
        customerDemandId: { not: null }
      },
      _count: true
    })

    const customerDemands = await prisma.customerDemand.findMany()
    const customerDemandMap = new Map(customerDemands.map(d => [d.id, d.name]))

    const customerDemandStats = byCustomerDemand
      .filter(item => item.customerDemandId !== null)
      .map(item => ({
        customerDemandId: item.customerDemandId,
        customerDemandName: customerDemandMap.get(item.customerDemandId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    // By compensation type
    const byCompensationType = await prisma.complaintRecord.groupBy({
      by: ['compensationTypeId'],
      where: {
        ...dateFilter,
        compensationTypeId: { not: null }
      },
      _count: true
    })

    const compensationTypes = await prisma.compensationType.findMany()
    const compensationTypeMap = new Map(compensationTypes.map(c => [c.id, c.name]))

    const compensationTypeStats = byCompensationType
      .filter(item => item.compensationTypeId !== null)
      .map(item => ({
        compensationTypeId: item.compensationTypeId,
        compensationTypeName: compensationTypeMap.get(item.compensationTypeId!) || '未知',
        count: item._count
      }))
      .sort((a, b) => b.count - a.count)

    // By severity level
    const bySeverityLevel = await prisma.complaintRecord.groupBy({
      by: ['severityLevelId'],
      where: {
        ...dateFilter,
        severityLevelId: { not: null }
      },
      _count: true
    })

    const severityLevels = await prisma.severityLevel.findMany({
      orderBy: { level: 'asc' }
    })
    const severityLevelMap = new Map(severityLevels.map(s => [s.id, { name: s.name, level: s.level, color: s.color }]))

    const severityLevelStats = bySeverityLevel
      .filter(item => item.severityLevelId !== null)
      .map(item => {
        const info = severityLevelMap.get(item.severityLevelId!) || { name: '未知', level: 0, color: null }
        return {
          severityLevelId: item.severityLevelId,
          severityLevelName: info.name,
          level: info.level,
          color: info.color,
          count: item._count
        }
      })
      .sort((a, b) => a.level - b.level)

    // By responsible department
    const byDepartment = await prisma.complaintRecord.groupBy({
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
    const byProcess = await prisma.complaintRecord.groupBy({
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
        byCategory: categoryStats,
        byCustomer: customerStats,
        byProductionLine: productionLineStats,
        byProductModel: productModelStats,
        bySubcategory: subcategoryStats,
        byCustomerDemand: customerDemandStats,
        byCompensationType: compensationTypeStats,
        bySeverityLevel: severityLevelStats,
        byDepartment: departmentStats,
        byProcess: processStats
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || '获取分类统计数据失败'
    })
  }
})
