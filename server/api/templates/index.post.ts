import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, isSuperAdmin, canAccessDepartment } from '~/server/utils/auth'

const fieldSchema = z.object({
  fieldKey: z.string().min(1).max(100),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'textarea', 'number', 'select', 'date', 'switch', 'select-config']),
  required: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  options: z.string().optional().nullable(),
  configType: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  placeholder: z.string().max(200).optional().nullable()
})

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  fields: z.array(fieldSchema).min(1, '至少需要一个字段')
})

export default defineEventHandler(async (event) => {
  const user = await requireWritePermission(event)
  const body = await readBody(event)
  const data = createTemplateSchema.parse(body)

  // Validate department access
  if (data.departmentId && !isSuperAdmin(user) && !canAccessDepartment(user, data.departmentId)) {
    throw createError({ statusCode: 403, statusMessage: '无权操作该部门模板' })
  }

  // Validate select-config fields have configType
  for (const field of data.fields) {
    if (field.fieldType === 'select-config' && !field.configType) {
      throw createError({ statusCode: 400, statusMessage: `字段"${field.fieldLabel}"类型为配置选择，必须指定配置源` })
    }
    if (field.fieldType === 'select' && !field.options) {
      throw createError({ statusCode: 400, statusMessage: `字段"${field.fieldLabel}"类型为下拉选择，必须提供选项` })
    }
  }

  const template = await prisma.formTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      departmentId: data.departmentId,
      enabled: data.enabled,
      sortOrder: data.sortOrder,
      createdById: user.id,
      fields: {
        create: data.fields.map((f, index) => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          required: f.required,
          sortOrder: f.sortOrder ?? index,
          options: f.options,
          configType: f.configType,
          defaultValue: f.defaultValue,
          placeholder: f.placeholder
        }))
      }
    },
    include: {
      department: true,
      createdBy: { select: { id: true, name: true } },
      fields: { orderBy: { sortOrder: 'asc' } }
    }
  })

  return { success: true, data: template }
})
