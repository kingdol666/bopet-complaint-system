import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  config: z.object({}).passthrough()
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody(event)
    const validated = createSchema.parse(body)

    const analysis = await prisma.savedAnalysis.create({
      data: {
        userId: user.id,
        name: validated.name,
        config: JSON.stringify(validated.config)
      }
    })

    return { success: true, data: analysis, message: '保存成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '保存失败' })
  }
})
