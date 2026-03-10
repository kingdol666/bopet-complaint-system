import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simple hash function for demo (in production use bcrypt)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

async function main() {
  console.log('开始种子数据初始化...')

  // ==================== 清理现有数据 ====================
  console.log('清理现有数据...')
  await prisma.operationLog.deleteMany()
  await prisma.complaintRecord.deleteMany()
  await prisma.complaintProblemMapping.deleteMany()
  await prisma.responsibleProcess.deleteMany()
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
  await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        password: hashPassword('admin123'),
        name: '系统管理员',
        role: 'admin',
        enabled: true
      },
      {
        username: 'operator',
        password: hashPassword('operator123'),
        name: '操作员张三',
        role: 'operator',
        enabled: true
      },
      {
        username: 'quality',
        password: hashPassword('quality123'),
        name: '质检员李四',
        role: 'operator',
        enabled: true
      }
    ]
  })

  // ==================== 产线数据 ====================
  console.log('创建产线数据...')
  await prisma.productionLine.createMany({
    data: [
      { code: 'PL-001', name: '1号线', enabled: true, sortOrder: 1 },
      { code: 'PL-002', name: '2号线', enabled: true, sortOrder: 2 },
      { code: 'PL-003', name: '3号线', enabled: true, sortOrder: 3 },
      { code: 'PL-004', name: '4号线', enabled: true, sortOrder: 4 },
      { code: 'PL-005', name: '5号线', enabled: false, sortOrder: 5 }
    ]
  })

  // ==================== 客户数据 ====================
  console.log('创建客户数据...')
  await prisma.customer.createMany({
    data: [
      { code: 'C001', name: '江苏恒力新材料科技有限公司', shortName: '恒力新材', enabled: true, sortOrder: 1 },
      { code: 'C002', name: '浙江大东南包装科技有限公司', shortName: '大东南', enabled: true, sortOrder: 2 },
      { code: 'C003', name: '广东佛塑科技集团股份有限公司', shortName: '佛塑科技', enabled: true, sortOrder: 3 },
      { code: 'C004', name: '上海紫东薄膜材料股份有限公司', shortName: '紫东薄膜', enabled: true, sortOrder: 4 },
      { code: 'C005', name: '四川东材科技集团股份有限公司', shortName: '东材科技', enabled: true, sortOrder: 5 },
      { code: 'C006', name: '安徽国风新材料股份有限公司', shortName: '国风新材', enabled: true, sortOrder: 6 },
      { code: 'C007', name: '山东胜利塑胶有限公司', shortName: '胜利塑胶', enabled: true, sortOrder: 7 },
      { code: 'C008', name: '浙江强盟实业股份有限公司', shortName: '强盟实业', enabled: true, sortOrder: 8 }
    ]
  })

  // ==================== 产品型号数据 ====================
  console.log('创建产品型号数据...')
  await prisma.productModel.createMany({
    data: [
      { code: 'PM-12-A', name: '12μm通用型BOPET', thickness: '12μm', application: '通用包装', enabled: true, sortOrder: 1 },
      { code: 'PM-15-A', name: '15μm通用型BOPET', thickness: '15μm', application: '通用包装', enabled: true, sortOrder: 2 },
      { code: 'PM-25-A', name: '25μm通用型BOPET', thickness: '25μm', application: '通用包装', enabled: true, sortOrder: 3 },
      { code: 'PM-12-HA', name: '12μm高透型BOPET', thickness: '12μm', application: '高透明包装', enabled: true, sortOrder: 4 },
      { code: 'PM-15-HA', name: '15μm高透型BOPET', thickness: '15μm', application: '高透明包装', enabled: true, sortOrder: 5 },
      { code: 'PM-25-HA', name: '25μm高透型BOPET', thickness: '25μm', application: '高透明包装', enabled: true, sortOrder: 6 },
      { code: 'PM-12-MA', name: '12μm哑光型BOPET', thickness: '12μm', application: '哑光包装', enabled: true, sortOrder: 7 },
      { code: 'PM-25-MA', name: '25μm哑光型BOPET', thickness: '25μm', application: '哑光包装', enabled: true, sortOrder: 8 },
      { code: 'PM-50-IA', name: '50μm绝缘型BOPET', thickness: '50μm', application: '电工绝缘', enabled: true, sortOrder: 9 },
      { code: 'PM-75-IA', name: '75μm绝缘型BOPET', thickness: '75μm', application: '电工绝缘', enabled: true, sortOrder: 10 },
      { code: 'PM-12-TH', name: '12μm热封型BOPET', thickness: '12μm', application: '热封包装', enabled: true, sortOrder: 11 },
      { code: 'PM-25-TH', name: '25μm热封型BOPET', thickness: '25μm', application: '热封包装', enabled: true, sortOrder: 12 }
    ]
  })

  // ==================== 问题大类数据 ====================
  console.log('创建问题大类数据...')
  const problemCategories = await prisma.problemCategory.createManyAndReturn({
    data: [
      { code: 'PC-01', name: '外观缺陷', enabled: true, sortOrder: 1 },
      { code: 'PC-02', name: '尺寸偏差', enabled: true, sortOrder: 2 },
      { code: 'PC-03', name: '物理性能', enabled: true, sortOrder: 3 },
      { code: 'PC-04', name: '表面处理', enabled: true, sortOrder: 4 },
      { code: 'PC-05', name: '包装运输', enabled: true, sortOrder: 5 },
      { code: 'PC-06', name: '其他问题', enabled: true, sortOrder: 6 }
    ]
  })

  // ==================== 问题小类数据 ====================
  console.log('创建问题小类数据...')
  const categoryMap: Record<string, number> = {}
  problemCategories.forEach((c: { code: string; id: number }) => { categoryMap[c.code] = c.id })

  await prisma.problemSubcategory.createMany({
    data: [
      // 外观缺陷
      { code: 'PS-0101', name: '晶点', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 1 },
      { code: 'PS-0102', name: '划痕', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 2 },
      { code: 'PS-0103', name: '气泡', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 3 },
      { code: 'PS-0104', name: '杂质', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 4 },
      { code: 'PS-0105', name: '色差', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 5 },
      { code: 'PS-0106', name: '条纹', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 6 },
      { code: 'PS-0107', name: '皱折', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 7 },
      { code: 'PS-0108', name: '破洞', categoryId: categoryMap['PC-01'], enabled: true, sortOrder: 8 },
      // 尺寸偏差
      { code: 'PS-0201', name: '厚度偏差', categoryId: categoryMap['PC-02'], enabled: true, sortOrder: 1 },
      { code: 'PS-0202', name: '宽度偏差', categoryId: categoryMap['PC-02'], enabled: true, sortOrder: 2 },
      { code: 'PS-0203', name: '长度不足', categoryId: categoryMap['PC-02'], enabled: true, sortOrder: 3 },
      { code: 'PS-0204', name: '收卷不齐', categoryId: categoryMap['PC-02'], enabled: true, sortOrder: 4 },
      // 物理性能
      { code: 'PS-0301', name: '拉伸强度不足', categoryId: categoryMap['PC-03'], enabled: true, sortOrder: 1 },
      { code: 'PS-0302', name: '热收缩率偏差', categoryId: categoryMap['PC-03'], enabled: true, sortOrder: 2 },
      { code: 'PS-0303', name: '透光率偏差', categoryId: categoryMap['PC-03'], enabled: true, sortOrder: 3 },
      { code: 'PS-0304', name: '雾度超标', categoryId: categoryMap['PC-03'], enabled: true, sortOrder: 4 },
      { code: 'PS-0305', name: '摩擦系数异常', categoryId: categoryMap['PC-03'], enabled: true, sortOrder: 5 },
      // 表面处理
      { code: 'PS-0401', name: '电晕处理不足', categoryId: categoryMap['PC-04'], enabled: true, sortOrder: 1 },
      { code: 'PS-0402', name: '涂层脱落', categoryId: categoryMap['PC-04'], enabled: true, sortOrder: 2 },
      { code: 'PS-0403', name: '涂布不均', categoryId: categoryMap['PC-04'], enabled: true, sortOrder: 3 },
      // 包装运输
      { code: 'PS-0501', name: '包装破损', categoryId: categoryMap['PC-05'], enabled: true, sortOrder: 1 },
      { code: 'PS-0502', name: '标签错误', categoryId: categoryMap['PC-05'], enabled: true, sortOrder: 2 },
      { code: 'PS-0503', name: '运输损坏', categoryId: categoryMap['PC-05'], enabled: true, sortOrder: 3 },
      // 其他
      { code: 'PS-0601', name: '其他', categoryId: categoryMap['PC-06'], enabled: true, sortOrder: 1 }
    ]
  })

  // ==================== 客户诉求数据 ====================
  console.log('创建客户诉求数据...')
  await prisma.customerDemand.createMany({
    data: [
      { code: 'CD-01', name: '换货', enabled: true, sortOrder: 1 },
      { code: 'CD-02', name: '退货', enabled: true, sortOrder: 2 },
      { code: 'CD-03', name: '降价处理', enabled: true, sortOrder: 3 },
      { code: 'CD-04', name: '质量赔偿', enabled: true, sortOrder: 4 },
      { code: 'CD-05', name: '技术支持', enabled: true, sortOrder: 5 },
      { code: 'CD-06', name: '改善改进', enabled: true, sortOrder: 6 },
      { code: 'CD-07', name: '仅反馈', enabled: true, sortOrder: 7 }
    ]
  })

  // ==================== 质量赔偿方式数据 ====================
  console.log('创建质量赔偿方式数据...')
  await prisma.compensationType.createMany({
    data: [
      { code: 'CT-01', name: '无赔偿', enabled: true, sortOrder: 1 },
      { code: 'CT-02', name: '免费换货', enabled: true, sortOrder: 2 },
      { code: 'CT-03', name: '全额退款', enabled: true, sortOrder: 3 },
      { code: 'CT-04', name: '部分退款', enabled: true, sortOrder: 4 },
      { code: 'CT-05', name: '下次订单折扣', enabled: true, sortOrder: 5 },
      { code: 'CT-06', name: '赠送同等数量产品', enabled: true, sortOrder: 6 }
    ]
  })

  // ==================== 严重等级数据 ====================
  console.log('创建严重等级数据...')
  await prisma.severityLevel.createMany({
    data: [
      { code: 'SL-01', name: '轻微', level: 1, color: '#52c41a', enabled: true, sortOrder: 1 },
      { code: 'SL-02', name: '一般', level: 2, color: '#1890ff', enabled: true, sortOrder: 2 },
      { code: 'SL-03', name: '较重', level: 3, color: '#faad14', enabled: true, sortOrder: 3 },
      { code: 'SL-04', name: '严重', level: 4, color: '#fa8c16', enabled: true, sortOrder: 4 },
      { code: 'SL-05', name: '特别严重', level: 5, color: '#f5222d', enabled: true, sortOrder: 5 }
    ]
  })

  // ==================== 责任部门数据 ====================
  console.log('创建责任部门数据...')
  const departments = await prisma.responsibleDepartment.createManyAndReturn({
    data: [
      { code: 'RD-01', name: '生产部', enabled: true, sortOrder: 1 },
      { code: 'RD-02', name: '质量部', enabled: true, sortOrder: 2 },
      { code: 'RD-03', name: '技术部', enabled: true, sortOrder: 3 },
      { code: 'RD-04', name: '仓储部', enabled: true, sortOrder: 4 },
      { code: 'RD-05', name: '物流部', enabled: true, sortOrder: 5 },
      { code: 'RD-06', name: '采购部', enabled: true, sortOrder: 6 },
      { code: 'RD-07', name: '销售部', enabled: true, sortOrder: 7 }
    ]
  })

  // ==================== 责任工序数据 ====================
  console.log('创建责任工序数据...')
  const deptMap: Record<string, number> = {}
  departments.forEach(d => { deptMap[d.code] = d.id })

  await prisma.responsibleProcess.createMany({
    data: [
      // 生产部工序
      { code: 'RP-0101', name: '配料', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 1 },
      { code: 'RP-0102', name: '挤出', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 2 },
      { code: 'RP-0103', name: '纵向拉伸', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 3 },
      { code: 'RP-0104', name: '横向拉伸', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 4 },
      { code: 'RP-0105', name: '热定型', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 5 },
      { code: 'RP-0106', name: '收卷', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 6 },
      { code: 'RP-0107', name: '分切', departmentId: deptMap['RD-01'], enabled: true, sortOrder: 7 },
      // 质量部工序
      { code: 'RP-0201', name: '来料检验', departmentId: deptMap['RD-02'], enabled: true, sortOrder: 1 },
      { code: 'RP-0202', name: '过程检验', departmentId: deptMap['RD-02'], enabled: true, sortOrder: 2 },
      { code: 'RP-0203', name: '成品检验', departmentId: deptMap['RD-02'], enabled: true, sortOrder: 3 },
      { code: 'RP-0204', name: '出货检验', departmentId: deptMap['RD-02'], enabled: true, sortOrder: 4 },
      // 技术部工序
      { code: 'RP-0301', name: '配方设计', departmentId: deptMap['RD-03'], enabled: true, sortOrder: 1 },
      { code: 'RP-0302', name: '工艺参数', departmentId: deptMap['RD-03'], enabled: true, sortOrder: 2 },
      { code: 'RP-0303', name: '设备调试', departmentId: deptMap['RD-03'], enabled: true, sortOrder: 3 },
      // 仓储部工序
      { code: 'RP-0401', name: '入库管理', departmentId: deptMap['RD-04'], enabled: true, sortOrder: 1 },
      { code: 'RP-0402', name: '存储管理', departmentId: deptMap['RD-04'], enabled: true, sortOrder: 2 },
      { code: 'RP-0403', name: '出库管理', departmentId: deptMap['RD-04'], enabled: true, sortOrder: 3 },
      // 物流部工序
      { code: 'RP-0501', name: '装车', departmentId: deptMap['RD-05'], enabled: true, sortOrder: 1 },
      { code: 'RP-0502', name: '运输', departmentId: deptMap['RD-05'], enabled: true, sortOrder: 2 },
      { code: 'RP-0503', name: '交货', departmentId: deptMap['RD-05'], enabled: true, sortOrder: 3 },
      // 采购部工序
      { code: 'RP-0601', name: '原料采购', departmentId: deptMap['RD-06'], enabled: true, sortOrder: 1 },
      { code: 'RP-0602', name: '供应商管理', departmentId: deptMap['RD-06'], enabled: true, sortOrder: 2 },
      // 销售部工序
      { code: 'RP-0701', name: '订单沟通', departmentId: deptMap['RD-07'], enabled: true, sortOrder: 1 },
      { code: 'RP-0702', name: '客户对接', departmentId: deptMap['RD-07'], enabled: true, sortOrder: 2 }
    ]
  })

  // ==================== 问题映射字典数据 ====================
  console.log('创建问题映射字典数据...')
  await prisma.complaintProblemMapping.createMany({
    data: [
      {
        customerExpression: '膜上有小点',
        keywordPattern: '小点,晶点,白点,黑点,颗粒',
        internalComplaintName: '晶点',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜上有划伤',
        keywordPattern: '划伤,划痕,刮伤,刮痕,擦伤',
        internalComplaintName: '划痕',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜里有气泡',
        keywordPattern: '气泡,气孔,鼓泡,起泡',
        internalComplaintName: '气泡',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜不干净',
        keywordPattern: '不干净,脏,杂质,异物,黑点',
        internalComplaintName: '杂质',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '颜色不对',
        keywordPattern: '颜色,色差,偏黄,发黄,颜色不均',
        internalComplaintName: '色差',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜有纹路',
        keywordPattern: '纹路,条纹,流纹,水波纹',
        internalComplaintName: '条纹',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜起皱',
        keywordPattern: '起皱,皱折,皱褶,折痕',
        internalComplaintName: '皱折',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '膜有破洞',
        keywordPattern: '破洞,穿孔,漏洞,孔洞',
        internalComplaintName: '破洞',
        problemCategoryId: categoryMap['PC-01'],
        enabled: true
      },
      {
        customerExpression: '厚度不对',
        keywordPattern: '厚度,偏厚,偏薄,厚度不均,薄厚不均',
        internalComplaintName: '厚度偏差',
        problemCategoryId: categoryMap['PC-02'],
        enabled: true
      },
      {
        customerExpression: '宽度不够',
        keywordPattern: '宽度,偏窄,不够宽',
        internalComplaintName: '宽度偏差',
        problemCategoryId: categoryMap['PC-02'],
        enabled: true
      },
      {
        customerExpression: '米数不够',
        keywordPattern: '米数,长度,不够长,短了',
        internalComplaintName: '长度不足',
        problemCategoryId: categoryMap['PC-02'],
        enabled: true
      },
      {
        customerExpression: '卷不齐',
        keywordPattern: '卷不齐,收卷不齐,端面不齐,塔形',
        internalComplaintName: '收卷不齐',
        problemCategoryId: categoryMap['PC-02'],
        enabled: true
      },
      {
        customerExpression: '膜容易断',
        keywordPattern: '容易断,强度不够,拉力不够,拉伸强度',
        internalComplaintName: '拉伸强度不足',
        problemCategoryId: categoryMap['PC-03'],
        enabled: true
      },
      {
        customerExpression: '收缩太大',
        keywordPattern: '收缩,热收缩,尺寸变化',
        internalComplaintName: '热收缩率偏差',
        problemCategoryId: categoryMap['PC-03'],
        enabled: true
      },
      {
        customerExpression: '透明度不好',
        keywordPattern: '透明度,透光率,不够透,模糊',
        internalComplaintName: '透光率偏差',
        problemCategoryId: categoryMap['PC-03'],
        enabled: true
      },
      {
        customerExpression: '雾度超标',
        keywordPattern: '雾度,雾蒙蒙,发雾',
        internalComplaintName: '雾度超标',
        problemCategoryId: categoryMap['PC-03'],
        enabled: true
      },
      {
        customerExpression: '电晕不够',
        keywordPattern: '电晕,达因值,附着力,表面张力',
        internalComplaintName: '电晕处理不足',
        problemCategoryId: categoryMap['PC-04'],
        enabled: true
      },
      {
        customerExpression: '包装坏了',
        keywordPattern: '包装,破损,散包,纸管坏',
        internalComplaintName: '包装破损',
        problemCategoryId: categoryMap['PC-05'],
        enabled: true
      },
      {
        customerExpression: '标签贴错了',
        keywordPattern: '标签,标错,贴错,信息不对',
        internalComplaintName: '标签错误',
        problemCategoryId: categoryMap['PC-05'],
        enabled: true
      },
      {
        customerExpression: '运输坏了',
        keywordPattern: '运输,物流,送货,运输途中',
        internalComplaintName: '运输损坏',
        problemCategoryId: categoryMap['PC-05'],
        enabled: true
      }
    ]
  })

  console.log('种子数据初始化完成!')
  console.log('----------------------------------------')
  console.log('默认账号:')
  console.log('  管理员: admin / admin123')
  console.log('  操作员: operator / operator123')
  console.log('  质检员: quality / quality123')
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
