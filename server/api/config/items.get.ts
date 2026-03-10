import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth'

// Config type mapping to Prisma models
const configModels: Record<string, string> = {
  'production-lines': 'productionLine',
  'customers': 'customer',
  'product-models': 'productModel',
  'problem-categories': 'problemCategory',
  'problem-subcategories': 'problemSubcategory',
  'customer-demands': 'customerDemand',
  'compensation-types': 'compensationType',
  'severity-levels': 'severityLevel',
  'responsible-departments': 'responsibleDepartment',
  'responsible-processes': 'responsibleProcess'
}

// Query schema
const querySchema = z.object({
  type: z.string().refine(val => Object.keys(configModels).includes(val), {
    message: 'Invalid config type'
  })
})

// Get all items of a config type
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { type } = querySchema.parse(query)

  const modelName = configModels[type]

  // @ts-ignore - dynamic model access
  const model = prisma[modelName]

  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid config type'
    })
  }

  // Handle different models with appropriate includes
  let include: any = undefined
  if (type === 'problem-subcategories') {
    include = { category: true }
  } else if (type === 'responsible-processes') {
    include = { department: true }
  }

  const items = await model.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: 'asc' },
    include
  })

  return {
    success: true,
    data: items
  }
})
