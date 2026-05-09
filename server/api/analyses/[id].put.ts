import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.object({}).passthrough().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const validated = updateSchema.parse(body)

    const existing = await prisma.savedAnalysis.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      throw createError({ statusCode: 404, message: '分析配置不存在' })
    }

    const data: any = {}
    if (validated.name) data.name = validated.name
    if (validated.config) data.config = JSON.stringify(validated.config)

    const analysis = await prisma.savedAnalysis.update({
      where: { id },
      data
    })

    return { success: true, data: analysis, message: '更新成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '更新失败' })
  }
})
