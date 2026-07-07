/**
 * 种子扩展脚本 —— 创建包含所有复杂字段类型的表单模板和数据记录
 *
 * 字段类型覆盖：
 *   text, textarea, number, select, select-config, auto-complete, date, switch, upload
 *
 * 运行方式: node --experimental-specifier-resolution=node scripts/seed-demo-templates.cjs
 * 或:       npx tsx scripts/seed-demo-templates.cjs
 * 或:       node scripts/seed-demo-templates.cjs
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('开始创建复杂表单模板模拟数据...\n')

  // ─── 幂等检查 ───
  const existing = await prisma.formTemplate.findFirst({
    where: { name: '复杂表单全字段测试模板' }
  })
  if (existing) {
    console.log('复杂表单测试模板已存在，跳过创建。')
    console.log('如需重新创建，请先手动删除该模板。')
    return
  }

  // ─── 获取基础数据 ───
  const superadmin = await prisma.user.findFirst({ where: { role: 'superadmin' } })
  if (!superadmin) {
    console.error('未找到超级管理员用户，请先运行 prisma db seed')
    process.exit(1)
  }

  const departments = await prisma.responsibleDepartment.findMany()
  const deptMap = {}
  departments.forEach(d => { deptMap[d.name] = d.id })

  // ─── 模板 1：复杂表单全字段测试模板 ───
  console.log('[1/4] 创建复杂表单全字段测试模板...')
  const complexTemplate = await prisma.formTemplate.create({
    data: {
      name: '复杂表单全字段测试模板',
      description: '包含所有字段类型（text/textarea/number/select/select-config/auto-complete/date/switch/upload）的测试模板，用于验证系统完整功能',
      createdById: superadmin.id,
      enabled: true,
      isDefault: false,
      isPublic: true,
      sortOrder: 10
    }
  })

  // 定义全部字段（按 sortOrder 排序）
  const complexFields = [
    // ─── 基础信息区 ───
    { templateId: complexTemplate.id, fieldKey: 'feedbackDate', fieldLabel: '反馈日期', fieldType: 'date', required: true, sortOrder: 1, placeholder: '选择反馈日期' },
    { templateId: complexTemplate.id, fieldKey: 'customerId', fieldLabel: '客户名称', fieldType: 'select-config', required: true, sortOrder: 2, configType: 'customers', placeholder: '选择客户' },
    { templateId: complexTemplate.id, fieldKey: 'productModelId', fieldLabel: '产品型号', fieldType: 'select-config', required: false, sortOrder: 3, configType: 'productModels', placeholder: '选择产品型号' },
    { templateId: complexTemplate.id, fieldKey: 'productionLineId', fieldLabel: '生产产线', fieldType: 'select-config', required: false, sortOrder: 4, configType: 'productionLines', placeholder: '选择产线' },
    { templateId: complexTemplate.id, fieldKey: 'responsibleDeptId', fieldLabel: '责任部门', fieldType: 'select-config', required: true, sortOrder: 5, configType: 'responsibleDepartments', placeholder: '选择责任部门' },
    { templateId: complexTemplate.id, fieldKey: 'responsibleProcessId', fieldLabel: '责任工序', fieldType: 'select-config', required: false, sortOrder: 6, configType: 'responsibleProcesses', placeholder: '选择责任工序' },

    // ─── 产品信息区 ───
    { templateId: complexTemplate.id, fieldKey: 'rollNo', fieldLabel: '轴号', fieldType: 'auto-complete', required: false, sortOrder: 7, configType: 'rollNos', placeholder: '输入或选择轴号' },
    { templateId: complexTemplate.id, fieldKey: 'specification', fieldLabel: '规格', fieldType: 'text', required: false, sortOrder: 8, placeholder: '如：125*970*3000' },
    { templateId: complexTemplate.id, fieldKey: 'thickness', fieldLabel: '厚度', fieldType: 'text', required: false, sortOrder: 9, placeholder: '如：12μm' },
    { templateId: complexTemplate.id, fieldKey: 'shaftCount', fieldLabel: '轴数', fieldType: 'number', required: false, sortOrder: 10, defaultValue: '1', placeholder: '涉及轴数' },
    { templateId: complexTemplate.id, fieldKey: 'quantityInvolved', fieldLabel: '涉及数量', fieldType: 'number', required: false, sortOrder: 11, placeholder: '涉及数量' },
    { templateId: complexTemplate.id, fieldKey: 'batchNo', fieldLabel: '批次号', fieldType: 'text', required: false, sortOrder: 12, placeholder: '如：BT-2026-001' },
    { templateId: complexTemplate.id, fieldKey: 'machineNo', fieldLabel: '机台编号', fieldType: 'text', required: false, sortOrder: 13, placeholder: '如：M-01' },
    { templateId: complexTemplate.id, fieldKey: 'shiftTeam', fieldLabel: '班组', fieldType: 'select', required: false, sortOrder: 14, options: '["A班","B班","C班","白班","夜班"]' },
    { templateId: complexTemplate.id, fieldKey: 'productionTime', fieldLabel: '生产日期', fieldType: 'date', required: false, sortOrder: 15, placeholder: '选择生产日期' },

    // ─── 问题详情区 ───
    { templateId: complexTemplate.id, fieldKey: 'category', fieldLabel: '数据分类', fieldType: 'select', required: true, sortOrder: 16, options: '["成品外观","膜面平整性","涂布表观","规格尺寸","物理特性","包装运输","管理流程","其他"]' },
    { templateId: complexTemplate.id, fieldKey: 'feedbackContent', fieldLabel: '反馈内容', fieldType: 'textarea', required: true, sortOrder: 17, placeholder: '详细描述数据问题...' },
    { templateId: complexTemplate.id, fieldKey: 'urgencyLevel', fieldLabel: '紧急程度', fieldType: 'select', required: true, sortOrder: 18, options: '["一般","紧急","特急"]', defaultValue: '一般' },
    { templateId: complexTemplate.id, fieldKey: 'closureStatus', fieldLabel: '闭环状态', fieldType: 'select', required: false, sortOrder: 19, options: '["pending","processing","closed"]', defaultValue: 'pending' },
    { templateId: complexTemplate.id, fieldKey: 'isRecurring', fieldLabel: '是否重复发生', fieldType: 'switch', required: false, sortOrder: 20, defaultValue: 'false' },
    { templateId: complexTemplate.id, fieldKey: 'defectLocation', fieldLabel: '缺陷位置', fieldType: 'select', required: false, sortOrder: 21, options: '["膜面正面","膜面背面","边缘","端面","管芯","整体"]' },

    // ─── 分析与改善区 ───
    { templateId: complexTemplate.id, fieldKey: 'rootCauseAnalysis', fieldLabel: '原因分析', fieldType: 'textarea', required: false, sortOrder: 22, placeholder: '分析问题根本原因...' },
    { templateId: complexTemplate.id, fieldKey: 'correctiveAction', fieldLabel: '纠正措施', fieldType: 'textarea', required: false, sortOrder: 23, placeholder: '描述纠正措施...' },
    { templateId: complexTemplate.id, fieldKey: 'improvementAction', fieldLabel: '改善措施', fieldType: 'textarea', required: false, sortOrder: 24, placeholder: '描述改善措施...' },
    { templateId: complexTemplate.id, fieldKey: 'lessonsLearned', fieldLabel: '经验总结', fieldType: 'textarea', required: false, sortOrder: 25, placeholder: '经验教训总结...' },
    { templateId: complexTemplate.id, fieldKey: 'reviewConclusion', fieldLabel: '复盘结论', fieldType: 'textarea', required: false, sortOrder: 26, placeholder: '复盘结论...' },

    // ─── 附加信息区 ───
    { templateId: complexTemplate.id, fieldKey: 'application', fieldLabel: '产品用途', fieldType: 'text', required: false, sortOrder: 27, placeholder: '如：食品包装' },
    { templateId: complexTemplate.id, fieldKey: 'productUsage', fieldLabel: '使用场景', fieldType: 'text', required: false, sortOrder: 28, placeholder: '产品使用场景描述' },
    { templateId: complexTemplate.id, fieldKey: 'customerContact', fieldLabel: '客户联系人', fieldType: 'text', required: false, sortOrder: 29, placeholder: '客户联系人姓名' },
    { templateId: complexTemplate.id, fieldKey: 'contactPhone', fieldLabel: '联系电话', fieldType: 'text', required: false, sortOrder: 30, placeholder: '联系电话' },
    { templateId: complexTemplate.id, fieldKey: 'remark', fieldLabel: '备注', fieldType: 'textarea', required: false, sortOrder: 31, placeholder: '其他备注信息...' },

    // ─── 文件上传区 ───
    { templateId: complexTemplate.id, fieldKey: 'attachments', fieldLabel: '现场照片/视频', fieldType: 'upload', required: false, sortOrder: 32 },
    { templateId: complexTemplate.id, fieldKey: 'report8d', fieldLabel: '8D报告附件', fieldType: 'upload', required: false, sortOrder: 33 },
  ]

  await prisma.formTemplateField.createMany({ data: complexFields })
  console.log(`  → 创建了 ${complexFields.length} 个字段\n`)

  // ─── 模板 2：简易快速记录模板 ───
  console.log('[2/4] 创建简易快速记录模板...')
  const quickTemplate = await prisma.formTemplate.create({
    data: {
      name: '简易快速记录模板',
      description: '仅包含核心字段的快速记录模板，适用于初步登记后补全详情的场景',
      createdById: superadmin.id,
      enabled: true,
      isDefault: false,
      isPublic: true,
      sortOrder: 11
    }
  })

  const quickFields = [
    { templateId: quickTemplate.id, fieldKey: 'feedbackDate', fieldLabel: '反馈日期', fieldType: 'date', required: true, sortOrder: 1 },
    { templateId: quickTemplate.id, fieldKey: 'customerId', fieldLabel: '客户', fieldType: 'select-config', required: true, sortOrder: 2, configType: 'customers' },
    { templateId: quickTemplate.id, fieldKey: 'category', fieldLabel: '数据分类', fieldType: 'select', required: true, sortOrder: 3, options: '["成品外观","膜面平整性","涂布表观","规格尺寸","物理特性","包装运输","管理流程","其他"]' },
    { templateId: quickTemplate.id, fieldKey: 'feedbackContent', fieldLabel: '问题描述', fieldType: 'textarea', required: true, sortOrder: 4 },
    { templateId: quickTemplate.id, fieldKey: 'responsibleDeptId', fieldLabel: '责任部门', fieldType: 'select-config', required: true, sortOrder: 5, configType: 'responsibleDepartments' },
    { templateId: quickTemplate.id, fieldKey: 'urgencyLevel', fieldLabel: '紧急程度', fieldType: 'select', required: false, sortOrder: 6, options: '["一般","紧急","特急"]', defaultValue: '一般' },
    { templateId: quickTemplate.id, fieldKey: 'closureStatus', fieldLabel: '状态', fieldType: 'select', required: false, sortOrder: 7, options: '["pending","processing","closed"]', defaultValue: 'pending' },
  ]

  await prisma.formTemplateField.createMany({ data: quickFields })
  console.log(`  → 创建了 ${quickFields.length} 个字段\n`)

  // ─── 获取关联数据用于创建数据记录 ───
  const customers = await prisma.customer.findMany()
  const productModels = await prisma.productModel.findMany()
  const productionLines = await prisma.productionLine.findMany()
  const processes = await prisma.responsibleProcess.findMany()

  const cusMap = {}
  customers.forEach(c => { cusMap[c.code] = c.id })
  const pmMap = {}
  productModels.forEach(p => { pmMap[p.code] = p.id })
  const plMap = {}
  productionLines.forEach(p => { plMap[p.code] = p.id })
  const procMap = {}
  processes.forEach(p => { procMap[p.code] = p.id })

  // ─── 创建数据记录 ───
  console.log('[3/4] 创建复杂表单数据记录...')

  const now = new Date()
  const year = now.getFullYear()

  // 生成编号
  const prefix = `DR-${year}-`
  const existingNos = await prisma.dataRecord.findMany({
    where: { dataNo: { startsWith: prefix } },
    select: { dataNo: true }
  })
  let nextSeq = existingNos.reduce((max, r) => {
    const s = parseInt(r.dataNo.slice(prefix.length), 10)
    return isNaN(s) ? max : Math.max(max, s)
  }, 0) + 1

  function genDataNo() {
    return `${prefix}${String(nextSeq++).padStart(4, '0')}`
  }

  // 记录 1：完整填写的已闭环记录（成品外观 - 划痕问题）
  const record1 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-01-15'),
    productionTime: new Date('2026-01-10'),
    productModelId: pmMap['PM-01'],
    shaftCount: 3,
    thickness: '12μm',
    rollNo: 'RL-2026-0101-A',
    specification: '1200*8000*12μm',
    customerId: cusMap['CUS-01'],
    quantityInvolved: 3,
    application: '食品包装',
    productionLineId: plMap['PL-01'],
    shiftTeam: 'A班',
    machineNo: 'M-01',
    batchNo: 'BT-2026-0110',
    feedbackContent: '客户反馈产品表面有轻微划痕，位于膜卷外层200-500米处，划痕呈纵向分布，宽度约2-3mm，深度未伤及基材。影响客户后续涂布加工使用。',
    category: '成品外观',
    closureStatus: 'closed',
    responsibleDeptId: deptMap['生产部'],
    responsibleProcessId: procMap['PROC-06'],
    rootCauseAnalysis: '经现场排查，分切工序刀片使用超过规定寿命（已使用15天，规定10天更换），刀刃磨损产生毛刺，在高速分切过程中划伤膜面。同时发现操作员未按规程进行每班次刀片检查。',
    correctiveAction: '1. 立即更换磨损刀片（批号BT-2026-0110全部重新分切）\n2. 将刀片更换频率从10天缩短至7天\n3. 增加每班次开始前的刀片目视检查',
    lessonsLearned: '定期更换易损件是保证产品质量的关键措施。应建立完善的设备维护台账，对关键耗材设置预警机制。',
    reviewConclusion: '整改措施已于1月18日验证完成，后续3个批次（BT-2026-0118至BT-2026-0125）均无复现，问题已彻底解决。',
    productUsage: '食品级包装薄膜',
    improvementAction: '建立全产线刀片寿命管理系统，预设更换周期并自动预警。同时在设备点检表中增加刀片状态检查项。',
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '首次反馈，已闭环处理。客户对响应速度表示满意。',
    templateIds: JSON.stringify([complexTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '紧急',
      isRecurring: false,
      defectLocation: '膜面正面',
      customerContact: '张经理',
      contactPhone: '138-0013-8000'
    })
  }

  // 记录 2：处理中的记录（膜面平整性 - 横向条纹）
  const record2 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-02-20'),
    productionTime: new Date('2026-02-15'),
    productModelId: pmMap['PM-03'],
    shaftCount: 1,
    thickness: '23μm',
    rollNo: 'RL-2026-0201-B\nRL-2026-0202-B',
    specification: '1500*12000*23μm',
    customerId: cusMap['CUS-02'],
    quantityInvolved: 2,
    application: '工业胶带基膜',
    productionLineId: plMap['PL-02'],
    shiftTeam: 'B班',
    machineNo: 'M-03',
    batchNo: 'BT-2026-0215',
    feedbackContent: '膜面出现周期性横向条纹，间距约50cm，条纹处厚度偏差约±0.5μm。客户在涂胶工序发现涂胶不均匀，涂布量波动超过±10%。条纹在透光检查时清晰可见。',
    category: '膜面平整性',
    closureStatus: 'processing',
    responsibleDeptId: deptMap['生产部'],
    responsibleProcessId: procMap['PROC-03'],
    rootCauseAnalysis: '初步分析为横拉工序温度波动导致拉伸不均匀。横拉区段3号温控仪存在±3°C的周期性波动，与条纹间距吻合。可能原因：1) 温控仪PID参数需校准；2) 加热器老化导致功率不稳定。',
    correctiveAction: '1. 已校准横拉段温控系统PID参数\n2. 增加温度监测点位至每2米一个\n3. 正在评估3号温控仪是否需要更换',
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '正在验证温控系统校准效果，预计2月28日完成验证报告',
    templateIds: JSON.stringify([complexTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '特急',
      isRecurring: true,
      defectLocation: '整体',
      customerContact: '李工',
      contactPhone: '139-0013-9000'
    })
  }

  // 记录 3：待处理记录（涂布表观 - 涂层脱落）
  const record3 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-03-10'),
    productionTime: new Date('2026-03-05'),
    productModelId: pmMap['PM-05'],
    shaftCount: 5,
    thickness: '36μm',
    rollNo: 'RL-2026-0301\nRL-2026-0302\nRL-2026-0303\nRL-2026-0304\nRL-2026-0305',
    specification: '1000*6000*36μm',
    customerId: cusMap['CUS-04'],
    quantityInvolved: 5,
    application: '太阳能背板',
    productionLineId: plMap['PL-03'],
    shiftTeam: 'C班',
    machineNo: 'M-05',
    batchNo: 'BT-2026-0305',
    feedbackContent: '涂布层出现局部脱落，脱落区域呈点状分布，直径1-3mm，密度约5个/㎡。在加速老化测试中脱落面积扩大，严重影响产品耐候性。客户已暂停使用该批次产品。',
    category: '涂布表观',
    closureStatus: 'pending',
    responsibleDeptId: deptMap['生产部'],
    responsibleProcessId: procMap['PROC-04'],
    createdById: superadmin.id,
    remark: '待技术部联合分析涂布配方及工艺参数，已通知研发部门介入',
    templateIds: JSON.stringify([complexTemplate.id, quickTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '特急',
      isRecurring: false,
      defectLocation: '膜面正面',
      customerContact: '王总',
      contactPhone: '137-0013-7000'
    })
  }

  // 记录 4：已闭环记录（规格尺寸 - 厚度偏差）
  const record4 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-03-25'),
    productionTime: new Date('2026-03-20'),
    productModelId: pmMap['PM-04'],
    shaftCount: 2,
    thickness: '25μm',
    rollNo: 'RL-2026-0325-A',
    specification: '1300*10000*25μm',
    customerId: cusMap['CUS-05'],
    quantityInvolved: 2,
    application: '光学保护膜',
    productionLineId: plMap['PL-04'],
    shiftTeam: 'A班',
    machineNo: 'M-07',
    batchNo: 'BT-2026-0320',
    feedbackContent: '客户反馈膜卷厚度偏差超出规格要求，规格要求25±0.5μm，实测局部区域厚度达26.2μm，偏差达+1.2μm。主要分布在膜卷两端100米范围内。',
    category: '规格尺寸',
    closureStatus: 'closed',
    responsibleDeptId: deptMap['生产部'],
    responsibleProcessId: procMap['PROC-01'],
    rootCauseAnalysis: '挤出工序模头两端温度偏高（设定265°C，实测272°C），导致两端熔体流动速率增大，厚度偏厚。原因是模头温控分区3和7的热电偶老化，显示值偏低导致加热器持续加热。',
    correctiveAction: '1. 更换模头分区3和7的热电偶\n2. 校准全部温控分区\n3. 建立热电偶定期校准制度（每季度一次）',
    lessonsLearned: '温度传感器的准确性直接影响产品厚度精度，应纳入关键控制点管理。',
    reviewConclusion: '更换热电偶后连续3个批次厚度偏差控制在±0.3μm以内，问题已解决。',
    productUsage: '光学级保护膜',
    improvementAction: '引入在线测厚仪与模头温控联动系统，实现厚度自动闭环控制。',
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '已闭环。客户对整改效果满意，恢复正常供货。',
    templateIds: JSON.stringify([complexTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '紧急',
      isRecurring: false,
      defectLocation: '边缘',
      customerContact: '赵经理',
      contactPhone: '136-0013-6000'
    })
  }

  // 记录 5：处理中记录（物理特性 - 力学性能异常）
  const record5 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-04-08'),
    productionTime: new Date('2026-04-03'),
    productModelId: pmMap['PM-06'],
    shaftCount: 1,
    thickness: '50μm',
    rollNo: 'RL-2026-0401',
    specification: '1000*8000*50μm',
    customerId: cusMap['CUS-07'],
    quantityInvolved: 1,
    application: '绝缘材料',
    productionLineId: plMap['PL-02'],
    shiftTeam: 'B班',
    machineNo: 'M-03',
    batchNo: 'BT-2026-0403',
    feedbackContent: '客户反馈产品拉伸强度低于规格要求。规格要求MD≥230MPa，实测MD=198MPa；TD≥200MPa，实测TD=175MPa。断裂伸长率正常。客户要求提供原因分析报告。',
    category: '物理特性',
    closureStatus: 'processing',
    responsibleDeptId: deptMap['质量部'],
    responsibleProcessId: procMap['PROC-09'],
    rootCauseAnalysis: '初步分析：1) 纵拉和横拉拉伸比可能偏离工艺标准；2) 原料批次切换可能导致分子量分布变化。正在调取生产过程数据和原料检测报告进行对比分析。',
    correctiveAction: '1. 正在核查拉伸比参数设定\n2. 已取样送第三方实验室进行分子量分布测试\n3. 暂时切换至备用原料批次',
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '等待实验室测试结果，预计4月15日出报告',
    templateIds: JSON.stringify([complexTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '紧急',
      isRecurring: false,
      defectLocation: '整体',
      customerContact: '孙工',
      contactPhone: '135-0013-5000'
    })
  }

  // 记录 6：使用简易模板的记录（包装运输问题）
  const record6 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-04-15'),
    customerId: cusMap['CUS-06'],
    feedbackContent: '客户收货时发现木托盘破损，导致3卷产品外包装变形，其中1卷膜卷端面有压痕。要求赔偿并改善包装方案。',
    category: '包装运输',
    closureStatus: 'closed',
    responsibleDeptId: deptMap['仓储部'],
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '已与客户协商赔偿方案，包装方案已升级为钢带固定+护角',
    templateIds: JSON.stringify([quickTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '一般'
    })
  }

  // 记录 7：使用简易模板的待处理记录
  const record7 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-05-02'),
    customerId: cusMap['CUS-03'],
    feedbackContent: '客户反映近期批次产品在分条过程中容易出现毛边，怀疑是薄膜硬度偏高。请协助检测并反馈。',
    category: '成品外观',
    closureStatus: 'pending',
    responsibleDeptId: deptMap['质量部'],
    createdById: superadmin.id,
    remark: '已安排取样检测',
    templateIds: JSON.stringify([quickTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '一般'
    })
  }

  // 记录 8：多模板关联的复杂记录
  const record8 = {
    dataNo: genDataNo(),
    feedbackDate: new Date('2026-05-18'),
    productionTime: new Date('2026-05-12'),
    productModelId: pmMap['PM-08'],
    shaftCount: 4,
    thickness: '100μm',
    rollNo: 'RL-2026-0512-1\nRL-2026-0512-2\nRL-2026-0512-3\nRL-2026-0512-4',
    specification: '1000*4000*100μm',
    customerId: cusMap['CUS-08'],
    quantityInvolved: 4,
    application: '模切基材',
    productionLineId: plMap['PL-05'],
    shiftTeam: 'C班',
    machineNo: 'M-08',
    batchNo: 'BT-2026-0512',
    feedbackContent: '模切加工时发现薄膜层间附着力不稳定，部分区域出现分层。客户在模切300mm宽幅时，切口处有轻微起层现象。此问题在之前批次中未出现过。',
    category: '物理特性',
    closureStatus: 'processing',
    responsibleDeptId: deptMap['技术部'],
    responsibleProcessId: procMap['PROC-12'],
    rootCauseAnalysis: '正在分析中。可能原因：1) 涂布工艺参数变化（涂布速度、温度）；2) 原料配方微调影响了层间结合力；3) 熟化条件变化。',
    correctiveAction: '1. 已取样进行剥离力测试\n2. 正在对比当前批次与历史正常批次的工艺参数差异\n3. 暂时调整模切刀具角度以减轻起层',
    createdById: superadmin.id,
    updatedById: superadmin.id,
    remark: '多部门联合分析中，技术部和生产部已召开2次分析会议',
    templateIds: JSON.stringify([complexTemplate.id, quickTemplate.id]),
    templateData: JSON.stringify({
      urgencyLevel: '特急',
      isRecurring: false,
      defectLocation: '端面',
      customerContact: '周总',
      contactPhone: '133-0013-3000'
    })
  }

  const records = [record1, record2, record3, record4, record5, record6, record7, record8]

  for (const record of records) {
    await prisma.dataRecord.create({ data: record })
  }

  console.log(`  → 创建了 ${records.length} 条数据记录\n`)

  // ─── 统计输出 ───
  console.log('[4/4] 统计创建结果...')
  const templateCount = await prisma.formTemplate.count()
  const fieldCount = await prisma.formTemplateField.count()
  const dataCount = await prisma.dataRecord.count()

  console.log('')
  console.log('========================================')
  console.log('  复杂表单模拟数据创建完成!')
  console.log('========================================')
  console.log('')
  console.log('当前数据库内容:')
  console.log(`  表单模板:      ${templateCount} 条`)
  console.log(`  模板字段:      ${fieldCount} 条`)
  console.log(`  数据记录:      ${dataCount} 条`)
  console.log('')
  console.log('新增模板:')
  console.log('  1. 复杂表单全字段测试模板 (33个字段，覆盖全部9种字段类型)')
  console.log('  2. 简易快速记录模板 (7个核心字段)')
  console.log('')
  console.log('新增数据记录:')
  console.log('  1. DR-2026-0001  成品外观 - 划痕问题      [已闭环]')
  console.log('  2. DR-2026-0002  膜面平整性 - 横向条纹    [处理中]')
  console.log('  3. DR-2026-0003  涂布表观 - 涂层脱落      [待处理]')
  console.log('  4. DR-2026-0004  规格尺寸 - 厚度偏差      [已闭环]')
  console.log('  5. DR-2026-0005  物理特性 - 力学性能异常  [处理中]')
  console.log('  6. DR-2026-0006  包装运输 - 托盘破损      [已闭环]')
  console.log('  7. DR-2026-0007  成品外观 - 毛边问题      [待处理]')
  console.log('  8. DR-2026-0008  物理特性 - 层间附着力    [处理中]')
  console.log('----------------------------------------')
}

main()
  .catch((e) => {
    console.error('创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
