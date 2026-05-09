import { PrismaClient } from '@prisma/client'
import { createHmac } from 'node:crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = 'bopet-complaint-system-salt-2024'
  return createHmac('sha256', salt).update(password).digest('hex')
}

async function main() {
  console.log('开始种子数据初始化...')

  // ==================== 清理现有数据 ====================
  console.log('清理现有数据...')
  await prisma.savedAnalysis.deleteMany()
  await prisma.operationLog.deleteMany()
  await prisma.complaintAttachment.deleteMany()
  await prisma.importLog.deleteMany()
  await prisma.complaintRecord.deleteMany()
  await prisma.complaintProblemMapping.deleteMany()
  await prisma.fieldOptionConfig.deleteMany()
  await prisma.formTemplateField.deleteMany()
  await prisma.formTemplate.deleteMany()
  await prisma.responsibleProcess.deleteMany()
  await prisma.userDepartment.deleteMany()
  await prisma.responsibleDepartment.deleteMany()
  await prisma.severityLevel.deleteMany()
  await prisma.compensationType.deleteMany()
  await prisma.customerDemand.deleteMany()
  await prisma.problemSubcategory.deleteMany()
  await prisma.problemCategory.deleteMany()
  await prisma.productModel.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.productionLine.deleteMany()
  await prisma.user.deleteMany()

  // ==================== 用户数据 ====================
  console.log('创建用户数据...')
  const superadminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashPassword('admin123'),
      name: '超级管理员',
      role: 'superadmin',
      enabled: true
    }
  })

  const adminUser = await prisma.user.create({
    data: {
      username: 'deptadmin',
      password: hashPassword('deptadmin123'),
      name: '部门管理员-王五',
      role: 'admin',
      enabled: true
    }
  })

  await prisma.user.create({
    data: {
      username: 'operator',
      password: hashPassword('operator123'),
      name: '操作员-张三',
      role: 'normal',
      enabled: true
    }
  })

  await prisma.user.create({
    data: {
      username: 'quality',
      password: hashPassword('quality123'),
      name: '质检员-李四',
      role: 'normal',
      enabled: true
    }
  })

  await prisma.user.create({
    data: {
      username: 'inactive',
      password: hashPassword('inactive123'),
      name: '离职员工-周九',
      role: 'normal',
      enabled: false
    }
  })

  // ==================== 部门数据 ====================
  console.log('创建部门数据...')
  const deptList = [
    { code: 'RD-01', name: '生产部', enabled: true, sortOrder: 1 },
    { code: 'RD-02', name: '质量部', enabled: true, sortOrder: 2 },
    { code: 'RD-03', name: '技术部', enabled: true, sortOrder: 3 },
    { code: 'RD-04', name: '仓储部', enabled: true, sortOrder: 4 },
    { code: 'RD-05', name: '物流部', enabled: true, sortOrder: 5 },
    { code: 'RD-06', name: '采购部', enabled: true, sortOrder: 6 },
    { code: 'RD-07', name: '销售部', enabled: true, sortOrder: 7 }
  ]
  await prisma.responsibleDepartment.createMany({ data: deptList })

  const departments = await prisma.responsibleDepartment.findMany()
  const deptMap: Record<string, number> = {}
  departments.forEach(d => { deptMap[d.code] = d.id })

  // 用户-部门关联
  await prisma.userDepartment.createMany({
    data: [
      { userId: adminUser.id, departmentId: deptMap['RD-01'] },
      { userId: adminUser.id, departmentId: deptMap['RD-02'] }
    ]
  })

  // ==================== 表单模板数据 ====================
  console.log('创建表单模板数据...')
  const template1 = await prisma.formTemplate.create({
    data: {
      name: '标准客诉处理单',
      description: '用于记录和处理一般客诉问题的标准模板',
      createdById: superadminUser.id,
      enabled: true,
      isDefault: true,
      sortOrder: 1
    }
  })

  const excelTemplate = await prisma.formTemplate.create({
    data: {
      name: '客诉台账-对外版',
      description: '对应客诉台账-对外版1(1).xlsx的表单模板，包含18列完整字段',
      createdById: superadminUser.id,
      enabled: true,
      isDefault: false,
      sortOrder: 0
    }
  })

  // 模板字段
  await prisma.formTemplateField.createMany({
    data: [
      // 标准客诉处理单字段
      { templateId: template1.id, fieldKey: 'customerContact', fieldLabel: '客户联系人', fieldType: 'text', required: false, sortOrder: 1 },
      { templateId: template1.id, fieldKey: 'contactPhone', fieldLabel: '联系电话', fieldType: 'text', required: false, sortOrder: 2 },
      { templateId: template1.id, fieldKey: 'urgencyLevel', fieldLabel: '紧急程度', fieldType: 'select', required: true, sortOrder: 3, options: '["一般","紧急","特急"]' },
      { templateId: template1.id, fieldKey: 'preliminaryAnalysis', fieldLabel: '初步分析', fieldType: 'textarea', required: false, sortOrder: 4 },

      // 客诉台账-对外版 18个字段
      { templateId: excelTemplate.id, fieldKey: 'feedbackDate', fieldLabel: '投诉日期', fieldType: 'date', required: true, sortOrder: 1 },
      { templateId: excelTemplate.id, fieldKey: 'customerId', fieldLabel: '客户', fieldType: 'text', required: false, sortOrder: 2 },
      { templateId: excelTemplate.id, fieldKey: 'responsibleDeptId', fieldLabel: '责任部门', fieldType: 'text', required: false, sortOrder: 3 },
      { templateId: excelTemplate.id, fieldKey: 'productModelId', fieldLabel: '型号', fieldType: 'text', required: false, sortOrder: 4 },
      { templateId: excelTemplate.id, fieldKey: 'rollNo', fieldLabel: '轴号', fieldType: 'text', required: false, sortOrder: 5 },
      { templateId: excelTemplate.id, fieldKey: 'specification', fieldLabel: '规格', fieldType: 'text', required: false, sortOrder: 6 },
      { templateId: excelTemplate.id, fieldKey: 'feedbackContent', fieldLabel: '反馈内容', fieldType: 'textarea', required: false, sortOrder: 7 },
      { templateId: excelTemplate.id, fieldKey: 'defectSource', fieldLabel: '弊病源', fieldType: 'select', required: false, sortOrder: 8, options: '["原材料","配方","挤出工序","纵拉工序","横拉工序","涂布工序","收卷工序","分切工序","包装运输","环境管理","人员管理","设备异常","其他"]' },
      { templateId: excelTemplate.id, fieldKey: 'attachments', fieldLabel: '图片/视频', fieldType: 'upload', required: false, sortOrder: 9 },
      { templateId: excelTemplate.id, fieldKey: 'quantityInvolved', fieldLabel: '数量(轴)', fieldType: 'number', required: false, sortOrder: 10 },
      { templateId: excelTemplate.id, fieldKey: 'productionTime', fieldLabel: '反馈轴生产日期', fieldType: 'date', required: false, sortOrder: 11 },
      { templateId: excelTemplate.id, fieldKey: 'specificDefect', fieldLabel: '具体不良点', fieldType: 'text', required: false, sortOrder: 12 },
      { templateId: excelTemplate.id, fieldKey: 'complaintCategory', fieldLabel: '客诉分类', fieldType: 'select', required: false, sortOrder: 13, options: '["成品外观","膜面平整性","涂布表观","点弊病","轴身平整性","划伤","管理不良","包装运输","物理特性","匹配性不良","客户匹配性不良"]' },
      { templateId: excelTemplate.id, fieldKey: 'technicalType', fieldLabel: '技术/管理分类', fieldType: 'select', required: false, sortOrder: 14, options: '["技术类","管理类"]' },
      { templateId: excelTemplate.id, fieldKey: 'report8d', fieldLabel: '8D报告', fieldType: 'upload', required: false, sortOrder: 15 },
      { templateId: excelTemplate.id, fieldKey: 'productUsage', fieldLabel: '产品用途', fieldType: 'text', required: false, sortOrder: 16 },
      { templateId: excelTemplate.id, fieldKey: 'improvementAction', fieldLabel: '改善措施', fieldType: 'textarea', required: false, sortOrder: 17 },
      { templateId: excelTemplate.id, fieldKey: 'remark', fieldLabel: '备注', fieldType: 'textarea', required: false, sortOrder: 18 }
    ]
  })

  console.log('种子数据初始化完成!')
  console.log('默认账号:')
  console.log('  超级管理员: admin / admin123')
  console.log('  部门管理员: deptadmin / deptadmin123')
  console.log('  普通用户:   operator / operator123')
  console.log('  普通用户:   quality / quality123')
  console.log('  离职员工:   inactive / inactive123')
  console.log('----------------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
