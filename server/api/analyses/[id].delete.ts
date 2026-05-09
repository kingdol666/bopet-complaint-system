import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')

    const existing = await prisma.savedAnalysis.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      throw createError({ statusCode: 404, message: '分析配置不存在' })
    }

    await prisma.savedAnalysis.delete({ where: { id } })

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除失败' })
  }
})
