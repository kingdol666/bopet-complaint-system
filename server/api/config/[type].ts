import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSuperAdminUser } from '~/server/utils/auth'

const configModels: Record<string, string> = {
  'production-lines': 'productionLine',
  customers: 'customer',
  'product-models': 'productModel',
  'problem-categories': 'problemCategory',
  'problem-subcategories': 'problemSubcategory',
  'customer-demands': 'customerDemand',
  'compensation-types': 'compensationType',
  'severity-levels': 'severityLevel',
  'responsible-departments': 'responsibleDepartment',
  'responsible-processes': 'responsibleProcess'
}

const baseSchema = z.object({
  code: z.string().max(50),
  name: z.string().max(200),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
})

const productModelSchema = baseSchema.extend({
  thickness: z.string().max(50).optional().nullable(),
  application: z.string().max(200).optional().nullable()
})

const problemSubcategorySchema = baseSchema.extend({
  categoryId: z.number().int()
})

const severityLevelSchema = baseSchema.extend({
  level: z.number().int().default(1),
  color: z.string().max(20).optional().nullable()
})

const responsibleProcessSchema = baseSchema.extend({
  departmentId: z.number().int()
})

const customerSchema = baseSchema.extend({
  shortName: z.string().max(100).optional().nullable()
})

function getSchema(type: string) {
  switch (type) {
    case 'product-models':
      return productModelSchema
    case 'problem-subcategories':
      return problemSubcategorySchema
    case 'severity-levels':
      return severityLevelSchema
    case 'responsible-processes':
      return responsibleProcessSchema
    case 'customers':
      return customerSchema
    default:
      return baseSchema
  }
}

export default defineEventHandler(async (event) => {
  await requireSuperAdminUser(event)

  const type = getRouterParam(event, 'type') || ''
  if (!configModels[type]) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid config type'
    })
  }

  const modelName = configModels[type]
  // @ts-ignore dynamic prisma model access
  const model = prisma[modelName]

  if (event.method === 'POST') {
    const body = await readBody(event)
    const data = getSchema(type).parse(body)
    const item = await model.create({ data })

    return {
      success: true,
      data: item,
      message: '创建成功'
    }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const { id, ...updateData } = body
    const data = getSchema(type).parse(updateData)

    const item = await model.update({
      where: { id },
      data
    })

    return {
      success: true,
      data: item,
      message: '更新成功'
    }
  }

  if (event.method === 'DELETE') {
    const query = getQuery(event)
    const id = Number.parseInt(query.id as string, 10)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: '无效的 ID'
      })
    }

    await model.update({
      where: { id },
      data: { enabled: false }
    })

    return {
      success: true,
      message: '删除成功'
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})
