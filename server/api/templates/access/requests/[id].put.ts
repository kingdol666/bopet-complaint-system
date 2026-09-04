import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectedReason: z.string().max(500).optional(),
  expiresAt: z.string().optional() // ISO date string, optional
})

/**
 * 审批模板查看申请（批准/拒绝）
 * 权限：模板所属部门的管理员或 superadmin
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw createError({ statusCode: 403, message: '仅管理员可审批请求' })
    }

    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, message: '无效的请求ID' })

    const body = await readBody(event)
    const data = approveSchema.parse(body)

    const request = await prisma.templateAccessRequest.findUnique({
      where: { id },
      include: { template: { select: { id: true, name: true, departmentId: true } } }
    })
    if (!request) throw createError({ statusCode: 404, message: '请求不存在' })
    if (request.status !== 'pending') throw createError({ statusCode: 400, message: '该请求已被处理' })

    // 权限检查：只有模板所属部门的管理员或 superadmin 可以审批
    if (user.role !== 'superadmin') {
      const tplDeptId = request.template.departmentId
      if (!tplDeptId || !user.departmentIds.includes(tplDeptId)) {
        throw createError({ statusCode: 403, message: '您无权审批此请求（仅模板所属部门管理员可审批）' })
      }
    }

    if (data.action === 'approve') {
      await prisma.$transaction(async (tx) => {
        // 更新请求状态
        await tx.templateAccessRequest.update({
          where: { id },
          data: {
            status: 'approved',
            approverId: user.id,
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        })

        // 创建模板授权记录（upsert 以防已存在过期记录）
        const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
        await tx.templateAccess.upsert({
          where: { userId_templateId: { userId: request.requesterId, templateId: request.templateId } },
          update: {
            grantedById: user.id,
            requestId: id,
            expiresAt,
            createdAt: new Date()
          },
          create: {
            userId: request.requesterId,
            templateId: request.templateId,
            grantedById: user.id,
            requestId: id,
            expiresAt
          }
        })
      })

      return { success: true, message: '已批准模板查看权限' }
    } else {
      // 拒绝
      await prisma.templateAccessRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          approverId: user.id,
          rejectedReason: data.rejectedReason || null,
          updatedAt: new Date()
        }
      })

      return { success: true, message: '已拒绝模板查看请求' }
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})
