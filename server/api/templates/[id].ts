import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import {
  requireSessionUser, requireWritePermission,
  isSuperAdmin, canAccessDepartment
} from '~/server/utils/auth'

const fieldSchema = z.object({
  id: z.number().int().optional(),
  fieldKey: z.string().min(1).max(100),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'textarea', 'number', 'select', 'date', 'switch', 'select-config', 'auto-complete', 'upload']),
  required: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  options: z.string().optional().nullable(),
  configType: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  placeholder: z.string().max(200).optional().nullable()
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  isPublic: z.boolean().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  fields: z.array(fieldSchema).optional()
})

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '0')
  if (!id) {
    throw createError({ statusCode: 400, message: '无效的模板ID' })
  }

  // GET
  if (event.method === 'GET') {
    const user = await requireSessionUser(event)

    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        department: true,
        createdBy: { select: { id: true, name: true } },
        fields: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!template || !template.enabled) {
      throw createError({ statusCode: 404, message: '模板不存在' })
    }

    // Allow access if: superadmin, same department, template is public, or template is global
    const hasAccess = !template.departmentId || template.isPublic || canAccessDepartment(user, template.departmentId)
    if (!hasAccess) {
      throw createError({ statusCode: 403, message: '无权访问该模板' })
    }

    return { success: true, data: template }
  }

  // PUT
  if (event.method === 'PUT') {
    const user = await requireWritePermission(event)
    const body = await readBody(event)
    const data = updateTemplateSchema.parse(body)

    const existing = await prisma.formTemplate.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: '模板不存在' })
    }

    // superadmin can modify any template
    // admin can only modify templates in their own departments
    if (!isSuperAdmin(user)) {
      if (existing.departmentId && !canAccessDepartment(user, existing.departmentId)) {
        throw createError({ statusCode: 403, message: '无权修改该模板' })
      }
      // If template is global (departmentId=null), only superadmin can modify
      if (!existing.departmentId) {
        throw createError({ statusCode: 403, message: '无权修改全局模板' })
      }
    }

    // Validate new departmentId access
    if (data.departmentId !== undefined && data.departmentId && !isSuperAdmin(user) && !canAccessDepartment(user, data.departmentId)) {
      throw createError({ statusCode: 403, message: '无权将模板分配到该部门' })
    }

    // Validate fields
    if (data.fields) {
      for (const field of data.fields) {
        if (field.fieldType === 'select-config' && !field.configType) {
          throw createError({ statusCode: 400, message: `字段"${field.fieldLabel}"类型为配置选择，必须指定配置源` })
        }
        if (field.fieldType === 'select' && !field.options) {
          throw createError({ statusCode: 400, message: `字段"${field.fieldLabel}"类型为下拉选择，必须提供选项` })
        }
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    // Handle fields update (in transaction)
    if (data.fields) {
      await prisma.$transaction(async (tx) => {
        const existingFields = await tx.formTemplateField.findMany({ where: { templateId: id } })
        const existingFieldIds = new Set(existingFields.map(f => f.id))
        const incomingFieldIds = new Set(data.fields!.filter(f => f.id).map(f => f.id!))

        const toDelete = [...existingFieldIds].filter(fid => !incomingFieldIds.has(fid))
        if (toDelete.length > 0) {
          await tx.formTemplateField.deleteMany({
            where: { id: { in: toDelete }, templateId: id }
          })
        }

        for (let i = 0; i < data.fields!.length; i++) {
          const f = data.fields![i]
          const fieldData = {
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            required: f.required,
            sortOrder: f.sortOrder ?? i,
            options: f.options,
            configType: f.configType,
            defaultValue: f.defaultValue,
            placeholder: f.placeholder
          }

          if (f.id && existingFieldIds.has(f.id)) {
            await tx.formTemplateField.update({ where: { id: f.id }, data: fieldData })
          } else {
            await tx.formTemplateField.create({ data: { ...fieldData, templateId: id } })
          }
        }
      })
    }

    const template = await prisma.formTemplate.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        createdBy: { select: { id: true, name: true } },
        fields: { orderBy: { sortOrder: 'asc' } }
      }
    })

    return { success: true, data: template }
  }

  // DELETE (soft delete)
  if (event.method === 'DELETE') {
    const user = await requireWritePermission(event)

    const existing = await prisma.formTemplate.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: '模板不存在' })
    }

    if (existing.isDefault) {
      throw createError({ statusCode: 400, message: '系统默认模板不可删除' })
    }

    // superadmin can delete any template
    // admin can only delete templates in their own departments
    if (!isSuperAdmin(user)) {
      if (existing.departmentId && !canAccessDepartment(user, existing.departmentId)) {
        throw createError({ statusCode: 403, message: '无权删除该模板' })
      }
      if (!existing.departmentId) {
        throw createError({ statusCode: 403, message: '无权删除全局模板' })
      }
    }

    await prisma.formTemplate.update({
      where: { id },
      data: { enabled: false }
    })

    return { success: true, data: existing, message: '模板已删除' }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
