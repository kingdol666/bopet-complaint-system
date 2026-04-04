const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check if default template already exists
  const existing = await prisma.formTemplate.findFirst({ where: { isDefault: true } })
  if (existing) {
    console.log('Default template already exists:', existing.name, 'id:', existing.id)
    // Fix closureStatus field options if using old format (Chinese-only values)
    const closureField = await prisma.formTemplateField.findFirst({
      where: { templateId: existing.id, fieldKey: 'closureStatus' }
    })
    if (closureField && (!closureField.options || !closureField.options.includes('pending'))) {
      await prisma.formTemplateField.update({
        where: { id: closureField.id },
        data: {
          options: '[{"label":"待分析","value":"pending"},{"label":"处理中","value":"processing"},{"label":"已结案","value":"closed"}]',
          defaultValue: 'pending'
        }
      })
      console.log('Updated closureStatus field to use correct value format')
    }
    await prisma.$disconnect()
    return
  }

  // Find admin user for createdById
  const admin = await prisma.user.findFirst({ where: { role: 'superadmin' } })
  const adminId = admin?.id || 1

  // Create default template with all standard complaint fields
  const template = await prisma.formTemplate.create({
    data: {
      name: '默认客诉表单',
      description: '系统默认客诉表单，包含所有标准字段',
      departmentId: null,
      createdById: adminId,
      enabled: true,
      isDefault: true,
      sortOrder: 0,
      fields: {
        create: [
          { fieldKey: 'feedbackDate', fieldLabel: '反馈日期', fieldType: 'date', required: true, sortOrder: 0 },
          { fieldKey: 'productionTime', fieldLabel: '生产时间', fieldType: 'date', required: false, sortOrder: 1 },
          { fieldKey: 'customerId', fieldLabel: '客户', fieldType: 'select-config', required: false, sortOrder: 2, configType: 'customers' },
          { fieldKey: 'productModelId', fieldLabel: '产品型号', fieldType: 'select-config', required: false, sortOrder: 3, configType: 'productModels' },
          { fieldKey: 'thickness', fieldLabel: '厚度', fieldType: 'text', required: false, sortOrder: 4, placeholder: '如：12μm' },
          { fieldKey: 'rollNo', fieldLabel: '轴号', fieldType: 'text', required: false, sortOrder: 5 },
          { fieldKey: 'quantityInvolved', fieldLabel: '涉及数量', fieldType: 'number', required: false, sortOrder: 6 },
          { fieldKey: 'application', fieldLabel: '用途', fieldType: 'text', required: false, sortOrder: 7 },
          { fieldKey: 'productionLineId', fieldLabel: '产线', fieldType: 'select-config', required: false, sortOrder: 8, configType: 'productionLines' },
          { fieldKey: 'shiftTeam', fieldLabel: '班组', fieldType: 'text', required: false, sortOrder: 9 },
          { fieldKey: 'machineNo', fieldLabel: '机台', fieldType: 'text', required: false, sortOrder: 10 },
          { fieldKey: 'batchNo', fieldLabel: '批次号', fieldType: 'text', required: false, sortOrder: 11 },
          { fieldKey: 'feedbackContent', fieldLabel: '反馈内容', fieldType: 'textarea', required: false, sortOrder: 12 },
          { fieldKey: 'customerComplaintText', fieldLabel: '客户投诉描述', fieldType: 'textarea', required: false, sortOrder: 13 },
          { fieldKey: 'internalComplaintName', fieldLabel: '内部问题名称', fieldType: 'text', required: false, sortOrder: 14 },
          { fieldKey: 'problemCategoryId', fieldLabel: '问题大类', fieldType: 'select-config', required: false, sortOrder: 15, configType: 'problemCategories' },
          { fieldKey: 'problemSubcategoryId', fieldLabel: '问题小类', fieldType: 'select-config', required: false, sortOrder: 16, configType: 'problemSubcategories' },
          { fieldKey: 'severityLevelId', fieldLabel: '严重等级', fieldType: 'select-config', required: false, sortOrder: 17, configType: 'severityLevels' },
          { fieldKey: 'repeatedIssue', fieldLabel: '是否重复', fieldType: 'switch', required: false, sortOrder: 18 },
          { fieldKey: 'customerDemandId', fieldLabel: '客户诉求', fieldType: 'select-config', required: false, sortOrder: 19, configType: 'customerDemands' },
          { fieldKey: 'compensationTypeId', fieldLabel: '赔偿方式', fieldType: 'select-config', required: false, sortOrder: 20, configType: 'compensationTypes' },
          { fieldKey: 'closureStatus', fieldLabel: '闭环状态', fieldType: 'select', required: false, sortOrder: 21, options: '[{"label":"待分析","value":"pending"},{"label":"处理中","value":"processing"},{"label":"已结案","value":"closed"}]', defaultValue: 'pending' },
          { fieldKey: 'responsibleDeptId', fieldLabel: '责任部门', fieldType: 'select-config', required: false, sortOrder: 22, configType: 'responsibleDepartments' },
          { fieldKey: 'responsibleProcessId', fieldLabel: '责任工序', fieldType: 'select-config', required: false, sortOrder: 23, configType: 'responsibleProcesses' },
          { fieldKey: 'disposalResult', fieldLabel: '处置结果', fieldType: 'textarea', required: false, sortOrder: 24 },
          { fieldKey: 'rootCauseAnalysis', fieldLabel: '问题分析', fieldType: 'textarea', required: false, sortOrder: 25 },
          { fieldKey: 'correctiveAction', fieldLabel: '改善措施', fieldType: 'textarea', required: false, sortOrder: 26 },
          { fieldKey: 'lessonsLearned', fieldLabel: '启示', fieldType: 'textarea', required: false, sortOrder: 27 },
          { fieldKey: 'reviewConclusion', fieldLabel: '复盘结论', fieldType: 'textarea', required: false, sortOrder: 28 },
          { fieldKey: 'standardizedAction', fieldLabel: '标准化措施', fieldType: 'switch', required: false, sortOrder: 29 },
          { fieldKey: 'remark', fieldLabel: '备注', fieldType: 'textarea', required: false, sortOrder: 30 }
        ]
      }
    }
  })

  console.log('Created default template: id=' + template.id)

  // Migrate existing complaints: convert old templateId to templateIds JSON array
  try {
    const complaintsWithOldTemplate = await prisma.complaintRecord.findMany({
      where: { templateId: { not: null } }
    })

    let migrated = 0
    for (const complaint of complaintsWithOldTemplate) {
      if (complaint.templateId) {
        await prisma.complaintRecord.update({
          where: { id: complaint.id },
          data: {
            templateIds: JSON.stringify([complaint.templateId])
          }
        })
        migrated++
      }
    }
    console.log('Migrated ' + migrated + ' existing complaints to new templateIds format')
  } catch (e) {
    console.log('Migration skipped (templateId column may not exist): ' + e.message)
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
