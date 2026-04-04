const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get the superadmin user as creator
  const admin = await prisma.user.findFirst({ where: { role: 'superadmin' } })
  if (!admin) {
    console.error('No superadmin user found')
    process.exit(1)
  }

  // Check existing complaints count to avoid duplicates
  const existingCount = await prisma.complaintRecord.count()
  if (existingCount > 0) {
    console.log(`Already ${existingCount} complaints exist, skipping seed`)
    await prisma.$disconnect()
    return
  }

  // Generate complaint number
  function makeComplaintNo(seq) {
    return `CP-2026-${String(seq).padStart(4, '0')}`
  }

  const complaints = [
    // ========================================
    // 包装客诉表单 (Template ID: 3) - 5 records
    // ========================================
    {
      complaintNo: makeComplaintNo(1),
      feedbackDate: new Date('2026-01-08'),
      customerId: 17, // 江苏恒力
      productModelId: 25, // 12μm通用型
      thickness: '12μm',
      productionLineId: 11, // 1号线
      responsibleDeptId: 18, // 仓储部
      feedbackContent: '客户收到货物后发现外箱严重破损，内有3卷端面损伤',
      disposalResult: '已安排补发3卷，加强包装防护',
      closureStatus: 'closed',
      templateIds: JSON.stringify([3]),
      templateData: JSON.stringify({
        custom_damageType: '外箱破损',
        custom_damageQty: 3,
        custom_damageDesc: '外箱有挤压变形痕迹，内部纸管端面有明显磕碰',
        custom_urgentFlag: true
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(2),
      feedbackDate: new Date('2026-01-15'),
      customerId: 18, // 浙江大东南
      productModelId: 26, // 15μm通用型
      thickness: '15μm',
      productionLineId: 12, // 2号线
      responsibleDeptId: 19, // 物流部
      feedbackContent: '运输途中内膜破损导致膜面受潮',
      disposalResult: '退货处理后重新发货',
      closureStatus: 'closed',
      templateIds: JSON.stringify([3]),
      templateData: JSON.stringify({
        custom_damageType: '内膜破损',
        custom_damageQty: 5,
        custom_damageDesc: '防潮内膜有两处撕裂，膜面出现水渍',
        custom_urgentFlag: true
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(3),
      feedbackDate: new Date('2026-02-03'),
      customerId: 19, // 广东佛塑
      productModelId: 27, // 25μm通用型
      thickness: '25μm',
      productionLineId: 13, // 3号线
      responsibleDeptId: 18, // 仓储部
      feedbackContent: '客户反映标签信息与实际产品不符',
      disposalResult: '已核实为贴标错误，补发正确标签',
      closureStatus: 'closed',
      templateIds: JSON.stringify([3]),
      templateData: JSON.stringify({
        custom_damageType: '标识错误',
        custom_damageQty: 2,
        custom_damageDesc: '2卷标签显示15μm，实际为25μm',
        custom_urgentFlag: false
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(4),
      feedbackDate: new Date('2026-03-10'),
      customerId: 20, // 上海紫东
      productModelId: 28, // 12μm高透型
      thickness: '12μm',
      productionLineId: 11, // 1号线
      responsibleDeptId: 19, // 物流部
      feedbackContent: '卸货时发现6卷端面有明显撞伤',
      closureStatus: 'processing',
      templateIds: JSON.stringify([3]),
      templateData: JSON.stringify({
        custom_damageType: '端面损伤',
        custom_damageQty: 6,
        custom_damageDesc: '端面有2-3cm深的凹陷',
        custom_urgentFlag: true
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(5),
      feedbackDate: new Date('2026-03-22'),
      customerId: 21, // 四川东材
      productModelId: 29, // 15μm高透型
      thickness: '15μm',
      productionLineId: 14, // 4号线
      responsibleDeptId: 18, // 仓储部
      feedbackContent: '收货时发现外包装变形严重，产品有挤压痕迹',
      closureStatus: 'pending',
      templateIds: JSON.stringify([3]),
      templateData: JSON.stringify({
        custom_damageType: '变形',
        custom_damageQty: 4,
        custom_damageDesc: '外箱有明显挤压痕迹，内部产品膜面有褶皱',
        custom_urgentFlag: false
      }),
      createdById: admin.id,
      updatedById: admin.id
    },

    // ========================================
    // 质量异常表单 (Template ID: 4) - 6 records
    // ========================================
    {
      complaintNo: makeComplaintNo(6),
      feedbackDate: new Date('2026-01-20'),
      customerId: 22, // 安徽国风
      productModelId: 30, // 25μm高透型
      problemCategoryId: 13, // 外观缺陷
      severityLevelId: 13, // 较重
      productionLineId: 12, // 2号线
      responsibleDeptId: 15, // 生产部
      customerComplaintText: '客户投诉25μm高透型BOPET膜面存在大量晶点，严重影响印刷质量',
      rootCauseAnalysis: '经分析为挤出温度偏高导致原料降解产生晶点',
      correctiveAction: '调整挤出温度参数，加强过程监控',
      closureStatus: 'closed',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面正面',
        custom_defectSize: '直径0.5-2mm',
        custom_defectRate: 3.5,
        custom_testReport: '质检报告QR-2026-015：晶点密度超标，每平方米平均12个'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(7),
      feedbackDate: new Date('2026-02-10'),
      customerId: 23, // 山东胜利
      productModelId: 31, // 12μm哑光型
      problemCategoryId: 13, // 外观缺陷
      severityLevelId: 12, // 一般
      productionLineId: 13, // 3号线
      responsibleDeptId: 15, // 生产部
      customerComplaintText: '哑光膜表面有纵向划痕，客户无法使用',
      rootCauseAnalysis: '收卷张力不均匀导致膜面与导辊摩擦产生划痕',
      correctiveAction: '更换导辊轴承，优化收卷张力参数',
      closureStatus: 'closed',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面正面',
        custom_defectSize: '长度10-50cm',
        custom_defectRate: 2.1,
        custom_testReport: '过程检验发现3号线收卷工位导辊有磨损'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(8),
      feedbackDate: new Date('2026-02-25'),
      customerId: 24, // 浙江强盟
      productModelId: 33, // 50μm绝缘型
      problemCategoryId: 15, // 物理性能
      severityLevelId: 14, // 严重
      productionLineId: 14, // 4号线
      responsibleDeptId: 17, // 技术部
      customerComplaintText: '绝缘膜拉伸强度不达标，击穿电压偏低',
      rootCauseAnalysis: '配方中添加剂比例偏差导致绝缘性能下降',
      closureStatus: 'processing',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面正面',
        custom_defectSize: '整卷',
        custom_defectRate: 15.0,
        custom_testReport: '第三方检测报告：拉伸强度MD方向偏低18%，击穿电压低于标准值22%'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(9),
      feedbackDate: new Date('2026-03-05'),
      customerId: 17, // 江苏恒力
      productModelId: 35, // 12μm热封型
      problemCategoryId: 16, // 表面处理
      severityLevelId: 13, // 较重
      productionLineId: 15, // 5号线
      responsibleDeptId: 17, // 技术部
      customerComplaintText: '热封膜电晕处理不均匀，部分区域无法热封',
      rootCauseAnalysis: '电晕处理辊表面有残留物导致处理不均',
      closureStatus: 'processing',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面背面',
        custom_defectSize: '条带状，宽5-10cm',
        custom_defectRate: 8.0,
        custom_testReport: '表面张力测试：合格区域42mN/m，不合格区域30mN/m'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(10),
      feedbackDate: new Date('2026-03-15'),
      customerId: 18, // 浙江大东南
      productModelId: 25, // 12μm通用型
      problemCategoryId: 13, // 外观缺陷
      severityLevelId: 12, // 一般
      productionLineId: 11, // 1号线
      responsibleDeptId: 15, // 生产部
      customerComplaintText: '膜面有少量气泡，但不影响使用',
      closureStatus: 'pending',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面正面',
        custom_defectSize: '直径1-3mm',
        custom_defectRate: 0.5,
        custom_testReport: '气泡主要集中在卷材外层100m范围'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(11),
      feedbackDate: new Date('2026-03-28'),
      customerId: 19, // 广东佛塑
      productModelId: 34, // 75μm绝缘型
      problemCategoryId: 15, // 物理性能
      severityLevelId: 15, // 特别严重
      productionLineId: 14, // 4号线
      responsibleDeptId: 17, // 技术部
      customerComplaintText: '75μm绝缘型BOPET热收缩率严重超标，客户制程中无法控制尺寸',
      rootCauseAnalysis: '热定型温度偏低，定型时间不足',
      closureStatus: 'pending',
      templateIds: JSON.stringify([4]),
      templateData: JSON.stringify({
        custom_defectLocation: '膜面正面',
        custom_defectSize: '整卷',
        custom_defectRate: 25.0,
        custom_testReport: '热收缩率MD: 5.2%（标准<3%），TD: 4.8%（标准<2%）'
      }),
      createdById: admin.id,
      updatedById: admin.id
    },

    // ========================================
    // 默认客诉表单 (Template ID: 5) - 7 records
    // ========================================
    {
      complaintNo: makeComplaintNo(12),
      feedbackDate: new Date('2026-01-05'),
      productionTime: new Date('2025-12-28'),
      customerId: 17,
      productModelId: 25,
      thickness: '12μm',
      rollNo: 'R-2026-0102',
      quantityInvolved: 5000,
      application: '印刷复合',
      productionLineId: 11,
      shiftTeam: '甲班',
      machineNo: 'EXT-01',
      batchNo: 'B20260102',
      feedbackContent: '客户反馈12μm通用型膜面有条状异物',
      customerComplaintText: '在印刷过程中发现膜面有条状凸起异物，导致印刷品报废',
      internalComplaintName: '条纹状异物',
      problemCategoryId: 13, // 外观缺陷
      problemSubcategoryId: 54, // 条纹
      severityLevelId: 13, // 较重
      repeatedIssue: true,
      customerDemandId: 15, // 换货
      compensationTypeId: 14, // 免费换货
      closureStatus: 'closed',
      responsibleDeptId: 15, // 生产部
      responsibleProcessId: 50, // 挤出
      disposalResult: '已免费换货5000米，并补偿客户印刷损失',
      rootCauseAnalysis: '挤出机过滤网破损，原料中杂质未完全过滤',
      correctiveAction: '更换过滤网，增加过滤网更换频次，从每72小时改为每48小时',
      lessonsLearned: '过滤网定期更换是保证产品质量的关键',
      reviewConclusion: '措施有效，后续批次未再出现类似问题',
      standardizedAction: true,
      remark: '已纳入SOP-EXT-012过滤网更换规程',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(13),
      feedbackDate: new Date('2026-01-25'),
      productionTime: new Date('2026-01-20'),
      customerId: 20,
      productModelId: 28,
      thickness: '12μm',
      rollNo: 'R-2026-0120',
      quantityInvolved: 3000,
      application: '光学膜',
      productionLineId: 12,
      shiftTeam: '乙班',
      machineNo: 'EXT-02',
      batchNo: 'B20260120',
      feedbackContent: '高透型BOPET透光率不达标',
      customerComplaintText: '实测透光率88%，低于合同约定的90%以上',
      internalComplaintName: '透光率偏差',
      problemCategoryId: 15, // 物理性能
      problemSubcategoryId: 63, // 透光率偏差
      severityLevelId: 12, // 一般
      repeatedIssue: false,
      customerDemandId: 17, // 降价处理
      compensationTypeId: 16, // 部分退款
      closureStatus: 'closed',
      responsibleDeptId: 17, // 技术部
      responsibleProcessId: 60, // 配方设计
      disposalResult: '部分退款处理，后续批次调整配方',
      rootCauseAnalysis: '原料批次变更导致透光率略有下降',
      correctiveAction: '更换原料供应商，严格来料检验',
      remark: '已更新原料检验标准QS-023',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(14),
      feedbackDate: new Date('2026-02-12'),
      productionTime: new Date('2026-02-08'),
      customerId: 21,
      productModelId: 33,
      thickness: '50μm',
      rollNo: 'R-2026-0208',
      quantityInvolved: 2000,
      application: '电气绝缘',
      productionLineId: 14,
      shiftTeam: '甲班',
      machineNo: 'EXT-04',
      batchNo: 'B20260208',
      feedbackContent: '50μm绝缘膜拉伸强度不达标',
      internalComplaintName: '拉伸强度不足',
      problemCategoryId: 15,
      problemSubcategoryId: 61,
      severityLevelId: 14, // 严重
      repeatedIssue: false,
      customerDemandId: 15, // 换货
      compensationTypeId: 14, // 免费换货
      closureStatus: 'closed',
      responsibleDeptId: 15,
      responsibleProcessId: 52, // 横向拉伸
      disposalResult: '免费换货2000米',
      rootCauseAnalysis: '横向拉伸比设置偏低',
      correctiveAction: '调整横向拉伸比参数，增加过程检测频次',
      lessonsLearned: '厚膜拉伸参数需单独优化',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(15),
      feedbackDate: new Date('2026-02-28'),
      productionTime: new Date('2026-02-22'),
      customerId: 22,
      productModelId: 26,
      thickness: '15μm',
      rollNo: 'R-2026-0222',
      quantityInvolved: 8000,
      application: '镀铝膜',
      productionLineId: 13,
      shiftTeam: '丙班',
      machineNo: 'EXT-03',
      batchNo: 'B20260222',
      feedbackContent: '镀铝后膜面出现大面积气泡',
      customerComplaintText: '客户镀铝加工后膜面出现密集气泡，整批报废',
      internalComplaintName: '镀铝气泡',
      problemCategoryId: 13,
      problemSubcategoryId: 51, // 气泡
      severityLevelId: 15, // 特别严重
      repeatedIssue: false,
      customerDemandId: 16, // 退货
      compensationTypeId: 15, // 全额退款
      closureStatus: 'processing',
      responsibleDeptId: 16, // 质量部
      responsibleProcessId: 58, // 成品检验
      disposalResult: '全额退款处理中',
      rootCauseAnalysis: '膜面含水量偏高，镀铝高温下产生气泡',
      correctiveAction: '调整分切环境湿度控制标准，增加含水率出厂检测',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(16),
      feedbackDate: new Date('2026-03-08'),
      productionTime: new Date('2026-03-01'),
      customerId: 23,
      productModelId: 27,
      thickness: '25μm',
      rollNo: 'R-2026-0301',
      quantityInvolved: 6000,
      application: '包装膜',
      productionLineId: 11,
      shiftTeam: '甲班',
      machineNo: 'EXT-01',
      batchNo: 'B20260301',
      feedbackContent: '膜面雾度超标，影响透明度',
      internalComplaintName: '雾度超标',
      problemCategoryId: 15,
      problemSubcategoryId: 64,
      severityLevelId: 12,
      repeatedIssue: true,
      customerDemandId: 17,
      compensationTypeId: 16,
      closureStatus: 'processing',
      responsibleDeptId: 15,
      responsibleProcessId: 53,
      disposalResult: '部分退款协商中',
      rootCauseAnalysis: '热定型温度波动导致雾度不稳定',
      correctiveAction: '增加热定型温度PID控制精度',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(17),
      feedbackDate: new Date('2026-03-18'),
      productionTime: new Date('2026-03-12'),
      customerId: 24,
      productModelId: 36,
      thickness: '25μm',
      rollNo: 'R-2026-0312',
      quantityInvolved: 4000,
      application: '热封包装',
      productionLineId: 15,
      shiftTeam: '乙班',
      machineNo: 'EXT-05',
      batchNo: 'B20260312',
      feedbackContent: '热封强度不够，客户包装线频繁开包',
      internalComplaintName: '热封强度不足',
      problemCategoryId: 16,
      problemSubcategoryId: 66,
      severityLevelId: 14,
      repeatedIssue: false,
      customerDemandId: 18, // 质量赔偿
      compensationTypeId: 16,
      closureStatus: 'pending',
      responsibleDeptId: 17,
      responsibleProcessId: 61, // 工艺参数
      disposalResult: '待分析',
      rootCauseAnalysis: '电晕处理后表面张力衰减过快',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    },
    {
      complaintNo: makeComplaintNo(18),
      feedbackDate: new Date('2026-03-30'),
      productionTime: new Date('2026-03-25'),
      customerId: 17,
      productModelId: 25,
      thickness: '12μm',
      rollNo: 'R-2026-0325',
      quantityInvolved: 10000,
      application: '印刷复合',
      productionLineId: 12,
      shiftTeam: '丙班',
      machineNo: 'EXT-02',
      batchNo: 'B20260325',
      feedbackContent: '色差问题，同批次膜卷色差明显',
      customerComplaintText: '同一批次10卷膜有明显色差，部分偏黄部分偏蓝',
      internalComplaintName: '色差',
      problemCategoryId: 13,
      problemSubcategoryId: 53,
      severityLevelId: 13,
      repeatedIssue: true,
      customerDemandId: 15,
      compensationTypeId: 14,
      closureStatus: 'pending',
      responsibleDeptId: 15,
      responsibleProcessId: 49, // 配料
      disposalResult: '待处理',
      rootCauseAnalysis: '初步判断为配料系统原料混合不均匀',
      templateIds: JSON.stringify([5]),
      templateData: JSON.stringify({}),
      createdById: admin.id,
      updatedById: admin.id
    }
  ]

  // Create all complaints
  for (const data of complaints) {
    await prisma.complaintRecord.create({ data })
    console.log(`Created: ${data.complaintNo}`)
  }

  console.log(`\nTotal: ${complaints.length} complaints created`)
  console.log('  - 包装客诉表单 (template 3): 5 records')
  console.log('  - 质量异常表单 (template 4): 6 records')
  console.log('  - 默认客诉表单 (template 5): 7 records')

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
