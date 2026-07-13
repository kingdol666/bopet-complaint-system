import { PrismaClient } from '@prisma/client'
import { createHmac } from 'node:crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = 'bopet-eda-platform-salt-2024'
  return createHmac('sha256', salt).update(password).digest('hex')
}

async function main() {
  console.log('开始种子数据初始化...')

  // ==================== 幂等检查：如果已有用户则跳过 ====================
  const existingUsers = await prisma.user.count()
  if (existingUsers > 0) {
    console.log(`检测到已有 ${existingUsers} 个用户，跳过种子数据初始化`)
    console.log('如需重置数据，请执行: npm run dev:fresh')
    return
  }

  console.log('数据库为空，开始初始化基础数据...')

  // ==================== 用户数据 ====================
  console.log('[1/8] 创建用户数据...')
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

  const operatorUser = await prisma.user.create({
    data: {
      username: 'operator',
      password: hashPassword('operator123'),
      name: '操作员-张三',
      role: 'normal',
      enabled: true
    }
  })

  const qualityUser = await prisma.user.create({
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
  console.log('[2/8] 创建部门数据...')
  const deptList = [
    { code: 'DEPT-01', name: '生产部', enabled: true, sortOrder: 1 },
    { code: 'DEPT-02', name: '质量部', enabled: true, sortOrder: 2 },
    { code: 'DEPT-03', name: '技术部', enabled: true, sortOrder: 3 },
    { code: 'DEPT-04', name: '仓储部', enabled: true, sortOrder: 4 },
    { code: 'DEPT-05', name: '物流部', enabled: true, sortOrder: 5 },
    { code: 'DEPT-06', name: '采购部', enabled: true, sortOrder: 6 },
    { code: 'DEPT-07', name: '销售部', enabled: true, sortOrder: 7 }
  ]
  await prisma.responsibleDepartment.createMany({ data: deptList })

  const departments = await prisma.responsibleDepartment.findMany()
  const deptMap: Record<string, number> = {}
  departments.forEach(d => { deptMap[d.code] = d.id })

  // 用户-部门关联
  await prisma.userDepartment.createMany({
    data: [
      { userId: adminUser.id, departmentId: deptMap['DEPT-01'] },
      { userId: adminUser.id, departmentId: deptMap['DEPT-02'] },
      { userId: operatorUser.id, departmentId: deptMap['DEPT-01'] },
      { userId: qualityUser.id, departmentId: deptMap['DEPT-02'] }
    ]
  })

  // ==================== 责任工序数据 ====================
  console.log('[3/8] 创建责任工序数据...')
  const processData = [
    // 生产部
    { code: 'PROC-01', name: '挤出工序', departmentId: deptMap['DEPT-01'], sortOrder: 1 },
    { code: 'PROC-02', name: '纵拉工序', departmentId: deptMap['DEPT-01'], sortOrder: 2 },
    { code: 'PROC-03', name: '横拉工序', departmentId: deptMap['DEPT-01'], sortOrder: 3 },
    { code: 'PROC-04', name: '涂布工序', departmentId: deptMap['DEPT-01'], sortOrder: 4 },
    { code: 'PROC-05', name: '收卷工序', departmentId: deptMap['DEPT-01'], sortOrder: 5 },
    { code: 'PROC-06', name: '分切工序', departmentId: deptMap['DEPT-01'], sortOrder: 6 },
    { code: 'PROC-07', name: '包装工序', departmentId: deptMap['DEPT-01'], sortOrder: 7 },
    // 质量部
    { code: 'PROC-08', name: '来料检验', departmentId: deptMap['DEPT-02'], sortOrder: 1 },
    { code: 'PROC-09', name: '过程检验', departmentId: deptMap['DEPT-02'], sortOrder: 2 },
    { code: 'PROC-10', name: '成品检验', departmentId: deptMap['DEPT-02'], sortOrder: 3 },
    { code: 'PROC-11', name: '出货检验', departmentId: deptMap['DEPT-02'], sortOrder: 4 },
    // 技术部
    { code: 'PROC-12', name: '配方研发', departmentId: deptMap['DEPT-03'], sortOrder: 1 },
    { code: 'PROC-13', name: '工艺优化', departmentId: deptMap['DEPT-03'], sortOrder: 2 },
    // 仓储部
    { code: 'PROC-14', name: '入库管理', departmentId: deptMap['DEPT-04'], sortOrder: 1 },
    { code: 'PROC-15', name: '出库管理', departmentId: deptMap['DEPT-04'], sortOrder: 2 },
    // 物流部
    { code: 'PROC-16', name: '运输管理', departmentId: deptMap['DEPT-05'], sortOrder: 1 },
    // 采购部
    { code: 'PROC-17', name: '供应商管理', departmentId: deptMap['DEPT-06'], sortOrder: 1 },
    { code: 'PROC-18', name: '原料采购', departmentId: deptMap['DEPT-06'], sortOrder: 2 },
    // 销售部
    { code: 'PROC-19', name: '客户对接', departmentId: deptMap['DEPT-07'], sortOrder: 1 },
    { code: 'PROC-20', name: '订单管理', departmentId: deptMap['DEPT-07'], sortOrder: 2 }
  ]
  await prisma.responsibleProcess.createMany({ data: processData })

  // ==================== 产线数据 ====================
  console.log('[4/8] 创建产线数据...')
  await prisma.productionLine.createMany({
    data: [
      { code: 'PL-01', name: '一号产线', enabled: true, sortOrder: 1 },
      { code: 'PL-02', name: '二号产线', enabled: true, sortOrder: 2 },
      { code: 'PL-03', name: '三号产线', enabled: true, sortOrder: 3 },
      { code: 'PL-04', name: '四号产线', enabled: true, sortOrder: 4 },
      { code: 'PL-05', name: '五号产线', enabled: true, sortOrder: 5 }
    ]
  })

  // ==================== 客户数据 ====================
  console.log('[5/8] 创建客户数据...')
  await prisma.customer.createMany({
    data: [
      { code: 'CUS-01', name: '深圳市明辉光电有限公司', shortName: '明辉光电', enabled: true, sortOrder: 1 },
      { code: 'CUS-02', name: '东莞华星薄膜科技有限公司', shortName: '华星薄膜', enabled: true, sortOrder: 2 },
      { code: 'CUS-03', name: '广州瑞达电子材料有限公司', shortName: '瑞达电子', enabled: true, sortOrder: 3 },
      { code: 'CUS-04', name: '苏州鑫源新材料股份有限公司', shortName: '鑫源新材', enabled: true, sortOrder: 4 },
      { code: 'CUS-05', name: '上海博科光学薄膜有限公司', shortName: '博科光学', enabled: true, sortOrder: 5 },
      { code: 'CUS-06', name: '杭州恒达包装材料有限公司', shortName: '恒达包装', enabled: true, sortOrder: 6 },
      { code: 'CUS-07', name: '成都天佑聚酯科技有限公司', shortName: '天佑聚酯', enabled: true, sortOrder: 7 },
      { code: 'CUS-08', name: '武汉新锐复合材料有限公司', shortName: '新锐复合', enabled: true, sortOrder: 8 }
    ]
  })

  // ==================== 产品型号数据 ====================
  console.log('[6/8] 创建产品型号数据...')
  await prisma.productModel.createMany({
    data: [
      { code: 'PM-01', name: 'BOPET-12μm-A', thickness: '12μm', application: '食品包装', enabled: true, sortOrder: 1 },
      { code: 'PM-02', name: 'BOPET-12μm-B', thickness: '12μm', application: '电子离型膜', enabled: true, sortOrder: 2 },
      { code: 'PM-03', name: 'BOPET-23μm-A', thickness: '23μm', application: '工业胶带基膜', enabled: true, sortOrder: 3 },
      { code: 'PM-04', name: 'BOPET-25μm-A', thickness: '25μm', application: '光学保护膜', enabled: true, sortOrder: 4 },
      { code: 'PM-05', name: 'BOPET-36μm-A', thickness: '36μm', application: '太阳能背板', enabled: true, sortOrder: 5 },
      { code: 'PM-06', name: 'BOPET-50μm-A', thickness: '50μm', application: '绝缘材料', enabled: true, sortOrder: 6 },
      { code: 'PM-07', name: 'BOPET-75μm-A', thickness: '75μm', application: '工业丝印', enabled: true, sortOrder: 7 },
      { code: 'PM-08', name: 'BOPET-100μm-A', thickness: '100μm', application: '模切基材', enabled: true, sortOrder: 8 }
    ]
  })

  // ==================== 字段选项配置数据 ====================
  console.log('[7/8] 创建字段选项配置数据...')
  await prisma.fieldOptionConfig.createMany({
    data: [
      {
        name: '数据分类选项',
        configKey: 'category_options',
        options: JSON.stringify(['成品外观', '膜面平整性', '涂布表观', '规格尺寸', '物理特性', '包装运输', '管理流程', '其他']),
        createdById: superadminUser.id,
        enabled: true
      },
      {
        name: '问题来源选项',
        configKey: 'source_options',
        options: JSON.stringify(['原材料', '配方', '挤出工序', '纵拉工序', '横拉工序', '涂布工序', '收卷工序', '分切工序', '包装运输', '环境管理', '人员管理', '设备异常', '其他']),
        createdById: superadminUser.id,
        enabled: true
      }
    ]
  })

  // ==================== 表单模板数据 ====================
  console.log('[8/8] 创建表单模板数据...')

  const template1 = await prisma.formTemplate.create({
    data: {
      name: '标准数据记录模板',
      description: '用于记录和处理一般数据记录的标准模板',
      createdById: superadminUser.id,
      enabled: true,
      isDefault: true,
      sortOrder: 1
    }
  })

  const excelTemplate = await prisma.formTemplate.create({
    data: {
      name: '数据台账-模板',
      description: '对应Excel导入的数据台账模板，包含16列完整字段',
      createdById: superadminUser.id,
      enabled: true,
      isDefault: false,
      sortOrder: 2
    }
  })

  // 模板字段
  await prisma.formTemplateField.createMany({
    data: [
      // 标准数据记录模板字段
      { templateId: template1.id, fieldKey: 'customerContact', fieldLabel: '客户联系人', fieldType: 'text', required: false, sortOrder: 1 },
      { templateId: template1.id, fieldKey: 'contactPhone', fieldLabel: '联系电话', fieldType: 'text', required: false, sortOrder: 2 },
      { templateId: template1.id, fieldKey: 'urgencyLevel', fieldLabel: '紧急程度', fieldType: 'select', required: true, sortOrder: 3, options: '["一般","紧急","特急"]' },
      { templateId: template1.id, fieldKey: 'preliminaryAnalysis', fieldLabel: '初步分析', fieldType: 'textarea', required: false, sortOrder: 4 },

      // 数据台账模板 16个字段
      { templateId: excelTemplate.id, fieldKey: 'feedbackDate', fieldLabel: '反馈日期', fieldType: 'date', required: true, sortOrder: 1 },
      { templateId: excelTemplate.id, fieldKey: 'customerId', fieldLabel: '客户', fieldType: 'text', required: false, sortOrder: 2 },
      { templateId: excelTemplate.id, fieldKey: 'responsibleDeptId', fieldLabel: '责任部门', fieldType: 'text', required: false, sortOrder: 3 },
      { templateId: excelTemplate.id, fieldKey: 'productModelId', fieldLabel: '产品型号', fieldType: 'text', required: false, sortOrder: 4 },
      { templateId: excelTemplate.id, fieldKey: 'rollNo', fieldLabel: '轴号', fieldType: 'text', required: false, sortOrder: 5 },
      { templateId: excelTemplate.id, fieldKey: 'specification', fieldLabel: '规格', fieldType: 'text', required: false, sortOrder: 6 },
      { templateId: excelTemplate.id, fieldKey: 'feedbackContent', fieldLabel: '反馈内容', fieldType: 'textarea', required: false, sortOrder: 7 },
      { templateId: excelTemplate.id, fieldKey: 'attachments', fieldLabel: '图片/视频', fieldType: 'upload', required: false, sortOrder: 8 },
      { templateId: excelTemplate.id, fieldKey: 'quantityInvolved', fieldLabel: '数量(轴)', fieldType: 'number', required: false, sortOrder: 9 },
      { templateId: excelTemplate.id, fieldKey: 'productionTime', fieldLabel: '生产日期', fieldType: 'date', required: false, sortOrder: 10 },
      { templateId: excelTemplate.id, fieldKey: 'category', fieldLabel: '数据分类', fieldType: 'select', required: false, sortOrder: 11, options: '["成品外观","膜面平整性","涂布表观","规格尺寸","物理特性","包装运输","管理流程","其他"]' },
      { templateId: excelTemplate.id, fieldKey: 'recordType', fieldLabel: '记录类型', fieldType: 'select', required: false, sortOrder: 12, options: '["技术类","管理类"]' },
      { templateId: excelTemplate.id, fieldKey: 'report8d', fieldLabel: '8D报告', fieldType: 'upload', required: false, sortOrder: 13 },
      { templateId: excelTemplate.id, fieldKey: 'productUsage', fieldLabel: '产品用途', fieldType: 'text', required: false, sortOrder: 14 },
      { templateId: excelTemplate.id, fieldKey: 'improvementAction', fieldLabel: '改善措施', fieldType: 'textarea', required: false, sortOrder: 15 },
      { templateId: excelTemplate.id, fieldKey: 'remark', fieldLabel: '备注', fieldType: 'textarea', required: false, sortOrder: 16 }
    ]
  })

  // ==================== 示例数据记录 ====================
  console.log('创建示例数据记录...')
  const productionLines = await prisma.productionLine.findMany()
  const customers = await prisma.customer.findMany()
  const productModels = await prisma.productModel.findMany()
  const processes = await prisma.responsibleProcess.findMany()

  const plMap: Record<string, number> = {}
  productionLines.forEach(p => { plMap[p.code] = p.id })
  const cusMap: Record<string, number> = {}
  customers.forEach(c => { cusMap[c.code] = c.id })
  const pmMap: Record<string, number> = {}
  productModels.forEach(p => { pmMap[p.code] = p.id })
  const procMap: Record<string, number> = {}
  processes.forEach(p => { procMap[p.code] = p.id })

  const sampleRecords = [
    {
      dataNo: 'DR-2025-0001',
      feedbackDate: new Date('2025-03-15'),
      productionTime: new Date('2025-03-10'),
      productModelId: pmMap['PM-01'],
      rollNo: 'RL-2025-0321',
      specification: '1200*8000*12μm',
      customerId: cusMap['CUS-01'],
      quantityInvolved: 3,
      application: '食品包装',
      productionLineId: plMap['PL-01'],
      shiftTeam: 'A班',
      machineNo: 'M-01',
      batchNo: 'BT-2025-0310',
      feedbackContent: '客户反馈产品表面有轻微划痕，要求排查原因。',
      category: '成品外观',
      closureStatus: 'closed',
      responsibleDeptId: deptMap['DEPT-01'],
      responsibleProcessId: procMap['PROC-06'],
      rootCauseAnalysis: '分切工序刀片磨损导致边缘毛刺划伤膜面。',
      correctiveAction: '更换分切刀片，增加刀片检查频率为每班次一次。',
      lessonsLearned: '定期更换易损件可有效避免类似问题。',
      reviewConclusion: '已确认整改措施有效，后续批次无复现。',
      productUsage: '食品级包装薄膜',
      improvementAction: '建立刀片寿命管理台账，预设更换周期。',
      createdById: operatorUser.id,
      updatedById: adminUser.id,
      remark: '首次反馈，已闭环处理',
      templateIds: JSON.stringify([excelTemplate.id]),
      templateData: JSON.stringify({
        feedbackDate: '2025-03-15',
        customerId: '深圳市明辉光电有限公司',
        responsibleDeptId: '生产部',
        productModelId: 'BOPET-12μm-A',
        rollNo: 'RL-2025-0321',
        specification: '1200*8000*12μm',
        feedbackContent: '客户反馈产品表面有轻微划痕，要求排查原因。',
        quantityInvolved: 3,
        productionTime: '2025-03-10',
        category: '成品外观',
        improvementAction: '建立刀片寿命管理台账，预设更换周期。',
        remark: '首次反馈，已闭环处理'
      })
    },
    {
      dataNo: 'DR-2025-0002',
      feedbackDate: new Date('2025-04-02'),
      productionTime: new Date('2025-03-28'),
      productModelId: pmMap['PM-03'],
      rollNo: 'RL-2025-0456',
      specification: '1500*12000*23μm',
      customerId: cusMap['CUS-02'],
      quantityInvolved: 1,
      application: '工业胶带基膜',
      productionLineId: plMap['PL-02'],
      shiftTeam: 'B班',
      machineNo: 'M-03',
      batchNo: 'BT-2025-0328',
      feedbackContent: '膜面出现周期性横向条纹，影响涂胶均匀性。',
      category: '膜面平整性',
      closureStatus: 'processing',
      responsibleDeptId: deptMap['DEPT-01'],
      responsibleProcessId: procMap['PROC-03'],
      rootCauseAnalysis: '横拉工序温度波动导致拉伸不均匀，形成周期性条纹。',
      correctiveAction: '校准横拉段温控系统，增加温度监测点位。',
      createdById: operatorUser.id,
      remark: '正在验证温控系统校准效果',
      templateIds: JSON.stringify([excelTemplate.id]),
      templateData: JSON.stringify({
        feedbackDate: '2025-04-02',
        customerId: '东莞华星薄膜科技有限公司',
        responsibleDeptId: '生产部',
        productModelId: 'BOPET-23μm-A',
        rollNo: 'RL-2025-0456',
        specification: '1500*12000*23μm',
        feedbackContent: '膜面出现周期性横向条纹，影响涂胶均匀性。',
        quantityInvolved: 1,
        productionTime: '2025-03-28',
        category: '膜面平整性',
        improvementAction: '校准横拉段温控系统，增加温度监测点位。',
        remark: '正在验证温控系统校准效果'
      })
    },
    {
      dataNo: 'DR-2025-0003',
      feedbackDate: new Date('2025-05-20'),
      productionTime: new Date('2025-05-15'),
      productModelId: pmMap['PM-05'],
      rollNo: 'RL-2025-0789',
      specification: '1000*6000*36μm',
      customerId: cusMap['CUS-04'],
      quantityInvolved: 5,
      application: '太阳能背板',
      productionLineId: plMap['PL-03'],
      shiftTeam: 'C班',
      machineNo: 'M-05',
      batchNo: 'BT-2025-0515',
      feedbackContent: '涂布层出现局部脱落，影响产品耐候性。',
      category: '涂布表观',
      closureStatus: 'pending',
      responsibleDeptId: deptMap['DEPT-01'],
      responsibleProcessId: procMap['PROC-04'],
      createdById: qualityUser.id,
      remark: '待技术部联合分析涂布配方',
      templateIds: JSON.stringify([excelTemplate.id]),
      templateData: JSON.stringify({
        feedbackDate: '2025-05-20',
        customerId: '苏州鑫源新材料股份有限公司',
        responsibleDeptId: '生产部',
        productModelId: 'BOPET-36μm-A',
        rollNo: 'RL-2025-0789',
        specification: '1000*6000*36μm',
        feedbackContent: '涂布层出现局部脱落，影响产品耐候性。',
        quantityInvolved: 5,
        productionTime: '2025-05-15',
        category: '涂布表观',
        improvementAction: '',
        remark: '待技术部联合分析涂布配方'
      })
    }
  ]

  for (const record of sampleRecords) {
    await prisma.dataRecord.create({ data: record })
  }

  // ==================== 完成 ====================
  console.log('')
  console.log('========================================')
  console.log('  种子数据初始化完成!')
  console.log('========================================')
  console.log('')
  console.log('数据库内容:')
  console.log(`  用户:          5 条`)
  console.log(`  部门:          7 条`)
  console.log(`  责任工序:      ${processData.length} 条`)
  console.log(`  产线:          5 条`)
  console.log(`  客户:          8 条`)
  console.log(`  产品型号:      8 条`)
  console.log(`  字段选项配置:  2 条`)
  console.log(`  表单模板:      2 条`)
  console.log(`  模板字段:      20 条`)
  console.log(`  示例数据记录:  ${sampleRecords.length} 条`)
  console.log('')
  console.log('默认账号:')
  console.log('  超级管理员:   admin / admin123')
  console.log('  部门管理员:   deptadmin / deptadmin123')
  console.log('  普通用户:     operator / operator123')
  console.log('  质检员:       quality / quality123')
  console.log('  离职员工:     inactive / inactive123 (已禁用)')
  console.log('----------------------------------------')
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
