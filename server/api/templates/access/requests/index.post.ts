import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const createSchema = z.object({
  templateId: z.number().int().positive(),
  reason: z.string().max(500).optional()
})

/**
 * 发起模板查看申请
 * 用户可申请查看任何模板（含非公开部门模板）下的数据，
 * 由模板所属部门的管理员审批。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody(event)
    const data = createSchema.parse(body)

    // 验证模板存在且启用
    const template = await prisma.formTemplate.findFirst({
      where: { id: data.templateId, enabled: true },
      include: { department: { select: { id: true, name: true } } }
    })
    if (!template) {
      throw createError({ statusCode: 404, message: '模板不存在或已停用' })
    }

    // 全局模板（departmentId=null）无需申请，所有人可见
    if (template.departmentId === null) {
      throw createError({ statusCode: 400, message: '该模板为全局模板，所有用户已可查看，无需申请' })
    }

    // 本部门模板无需申请（本部门成员已有权限）
    if (user.departmentIds.includes(template.departmentId)) {
      throw createError({ statusCode: 400, message: '该模板属于您所在部门，您已有查看权限，无需申请' })
    }

    // 已拥有未过期的模板授权
    const existingAccess = await prisma.templateAccess.findUnique({
      where: { userId_templateId: { userId: user.id, templateId: data.templateId } }
    })
    if (existingAccess && (existingAccess.expiresAt === null || existingAccess.expiresAt > new Date())) {
      throw createError({ statusCode: 400, message: '您已拥有该模板的查看权限' })
    }

    // 已有 pending 申请（同一模板同一状态只允许一条）
    const existingRequest = await prisma.templateAccessRequest.findFirst({
      where: { requesterId: user.id, templateId: data.templateId, status: 'pending' }
    })
    if (existingRequest) {
      throw createError({ statusCode: 400, message: '您已有一个待审批的申请，请等待审批结果' })
    }

    const request = await prisma.templateAccessRequest.create({
      data: {
        requesterId: user.id,
        templateId: data.templateId,
        reason: data.reason || null,
        status: 'pending'
      },
      include: {
        template: {
          select: { id: true, name: true, department: { select: { id: true, name: true } } }
        },
        requester: { select: { id: true, name: true, username: true } }
      }
    })

    return { success: true, data: request, message: '申请已提交，等待模板所属部门管理员审批' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})
