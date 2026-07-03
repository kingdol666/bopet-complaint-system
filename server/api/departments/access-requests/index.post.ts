import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canViewDepartment } from '~/server/utils/auth'

const createSchema = z.object({
  departmentId: z.number().int().positive(),
  reason: z.string().max(500).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const body = await readBody(event)
    const data = createSchema.parse(body)

    // 不能请求访问自己已有的部门
    if (user.departmentIds.includes(data.departmentId)) {
      throw createError({ statusCode: 400, message: '您已是该部门成员，无需申请' })
    }

    // 不能重复申请已授权的部门
    const existingAccess = await prisma.crossDepartmentAccess.findUnique({
      where: { userId_departmentId: { userId: user.id, departmentId: data.departmentId } }
    })
    if (existingAccess && (existingAccess.expiresAt === null || existingAccess.expiresAt > new Date())) {
      throw createError({ statusCode: 400, message: '您已拥有该部门的查看权限' })
    }

    // 检查是否已有 pending 请求
    const existingRequest = await prisma.crossDepartmentAccessRequest.findFirst({
      where: { requesterId: user.id, departmentId: data.departmentId, status: 'pending' }
    })
    if (existingRequest) {
      throw createError({ statusCode: 400, message: '您已有一个待审批的申请，请等待审批结果' })
    }

    // 验证目标部门存在且启用
    const dept = await prisma.responsibleDepartment.findFirst({
      where: { id: data.departmentId, enabled: true }
    })
    if (!dept) {
      throw createError({ statusCode: 404, message: '目标部门不存在或已停用' })
    }

    const request = await prisma.crossDepartmentAccessRequest.create({
      data: {
        requesterId: user.id,
        departmentId: data.departmentId,
        reason: data.reason || null,
        status: 'pending'
      },
      include: {
        department: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, username: true } }
      }
    })

    return { success: true, data: request, message: '申请已提交，等待该部门管理员审批' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})
