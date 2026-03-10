import { prisma } from '~/server/utils/prisma'

// Get all config data for dropdowns
export default defineEventHandler(async (event) => {
  const [
    productionLines,
    customers,
    productModels,
    problemCategories,
    problemSubcategories,
    customerDemands,
    compensationTypes,
    severityLevels,
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
    prisma.problemCategory.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.problemSubcategory.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      include: { category: true }
    }),
    prisma.customerDemand.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.compensationType.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.severityLevel.findMany({
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
      problemCategories,
      problemSubcategories,
      customerDemands,
      compensationTypes,
      severityLevels,
      responsibleDepartments,
      responsibleProcesses
    }
  }
})
