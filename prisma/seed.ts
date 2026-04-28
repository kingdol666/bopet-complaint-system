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
  await prisma.operationLog.deleteMany()
  await prisma.complaintRecord.deleteMany()
  await prisma.complaintProblemMapping.deleteMany()
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

  const normalUser1 = await prisma.user.create({
    data: {
      username: 'operator',
      password: hashPassword('operator123'),
      name: '操作员-张三',
      role: 'normal',
      enabled: true
    }
  })

  const normalUser2 = await prisma.user.create({
    data: {
      username: 'quality',
      password: hashPassword('quality123'),
      name: '质检员-李四',
      role: 'normal',
      enabled: true
    }
  })

  const normalUser3 = await prisma.user.create({
    data: {
      username: 'technician',
      password: hashPassword('tech123'),
      name: '技术员-赵六',
      role: 'normal',
      enabled: true
    }
  })

  const normalUser4 = await prisma.user.create({
    data: {
      username: 'sales',
      password: hashPassword('sales123'),
      name: '销售代表-钱七',
      role: 'normal',
      enabled: true
    }
  })

  const normalUser5 = await prisma.user.create({
    data: {
      username: 'storage',
      password: hashPassword('storage123'),
      name: '仓管员-孙八',
      role: 'normal',
      enabled: true
    }
  })

  const disabledUser = await prisma.user.create({
    data: {
      username: 'inactive',
      password: hashPassword('inactive123'),
      name: '离职员工-周九',
      role: 'normal',
      enabled: false
    }
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

  const deptMap: Record<string, number> = {}
  departments.forEach(d => { deptMap[d.code] = d.id })

  // ==================== 用户-部门关联 ====================
  console.log('创建用户-部门关联...')
  await prisma.userDepartment.createMany({
    data: [
      // 超级管理员不需要部门关联，可以看所有部门数据
      // 部门管理员：分配到生产部和质量部
      { userId: adminUser.id, departmentId: deptMap['RD-01'] },
      { userId: adminUser.id, departmentId: deptMap['RD-02'] },
      // 普通用户-张三：分配到生产部
      { userId: normalUser1.id, departmentId: deptMap['RD-01'] },
      // 普通用户-李四：分配到质量部
      { userId: normalUser2.id, departmentId: deptMap['RD-02'] },
      // 技术员-赵六：分配到技术部
      { userId: normalUser3.id, departmentId: deptMap['RD-03'] },
      // 销售代表-钱七：分配到销售部
      { userId: normalUser4.id, departmentId: deptMap['RD-07'] },
      // 仓管员-孙八：分配到仓储部
      { userId: normalUser5.id, departmentId: deptMap['RD-04'] }
      // 离职员工不分配部门
    ]
  })

  // ==================== 责任工序数据 ====================
  console.log('创建责任工序数据...')
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

  const template2 = await prisma.formTemplate.create({
    data: {
      name: '质量问题分析单',
      description: '专用于质量问题分析和改善的模板',
      departmentId: deptMap['RD-02'], // 质量部
      createdById: adminUser.id,
      enabled: true,
      isDefault: false,
      sortOrder: 2
    }
  })

  const template3 = await prisma.formTemplate.create({
    data: {
      name: '生产工艺问题单',
      description: '用于记录生产工艺相关问题的模板',
      departmentId: deptMap['RD-01'], // 生产部
      createdById: normalUser1.id,
      enabled: true,
      isDefault: false,
      sortOrder: 3
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
      // 质量问题分析单字段
      { templateId: template2.id, fieldKey: 'qualityInspector', fieldLabel: '质检员', fieldType: 'text', required: true, sortOrder: 1 },
      { templateId: template2.id, fieldKey: 'inspectionDate', fieldLabel: '检验日期', fieldType: 'date', required: true, sortOrder: 2 },
      { templateId: template2.id, fieldKey: 'defectRate', fieldLabel: '不良率(%)', fieldType: 'number', required: false, sortOrder: 3 },
      { templateId: template2.id, fieldKey: 'sampleSize', fieldLabel: '抽样数量', fieldType: 'number', required: false, sortOrder: 4 },
      { templateId: template2.id, fieldKey: 'defectDescription', fieldLabel: '缺陷描述', fieldType: 'textarea', required: true, sortOrder: 5 },
      // 生产工艺问题单字段
      { templateId: template3.id, fieldKey: 'processStep', fieldLabel: '工序环节', fieldType: 'select', required: true, sortOrder: 1, options: '["配料","挤出","纵向拉伸","横向拉伸","热定型","收卷","分切"]' },
      { templateId: template3.id, fieldKey: 'equipmentNo', fieldLabel: '设备编号', fieldType: 'text', required: false, sortOrder: 2 },
      { templateId: template3.id, fieldKey: 'operatorName', fieldLabel: '操作员', fieldType: 'text', required: false, sortOrder: 3 },
      { templateId: template3.id, fieldKey: 'processParameter', fieldLabel: '工艺参数', fieldType: 'textarea', required: false, sortOrder: 4 }
    ]
  })

  // ==================== 客诉记录数据 ====================
  console.log('创建客诉记录数据...')
  
  // 获取问题小类ID映射
  const subcategories = await prisma.problemSubcategory.findMany({
    select: { id: true, code: true }
  })
  const subcategoryMap: Record<string, number> = {}
  subcategories.forEach(s => { subcategoryMap[s.code] = s.id })

  // 获取严重等级ID
  const severityLevels = await prisma.severityLevel.findMany({
    select: { id: true, level: true }
  })
  const severityMap: Record<number, number> = {}
  severityLevels.forEach(s => { severityMap[s.level] = s.id })

  // 获取客户诉求ID
  const customerDemands = await prisma.customerDemand.findMany({
    select: { id: true, code: true }
  })
  const demandMap: Record<string, number> = {}
  customerDemands.forEach(d => { demandMap[d.code] = d.id })

  // 获取赔偿方式ID
  const compensationTypes = await prisma.compensationType.findMany({
    select: { id: true, code: true }
  })
  const compensationMap: Record<string, number> = {}
  compensationTypes.forEach(c => { compensationMap[c.code] = c.id })

  // 获取产品型号ID
  const productModels = await prisma.productModel.findMany({
    select: { id: true, code: true }
  })
  const productModelMap: Record<string, number> = {}
  productModels.forEach(p => { productModelMap[p.code] = p.id })

  // 获取客户ID
  const customers = await prisma.customer.findMany({
    select: { id: true, code: true }
  })
  const customerMap: Record<string, number> = {}
  customers.forEach(c => { customerMap[c.code] = c.id })

  // 获取产线ID
  const productionLines = await prisma.productionLine.findMany({
    select: { id: true, code: true }
  })
  const productionLineMap: Record<string, number> = {}
  productionLines.forEach(p => { productionLineMap[p.code] = p.id })

  // 创建客诉记录
  const now = new Date()
  
  await prisma.complaintRecord.createMany({
    data: [
      {
        complaintNo: 'CS20240301001',
        feedbackDate: new Date('2024-03-01'),
        productionTime: new Date('2024-02-25'),
        productModelId: productModelMap['PM-12-A'],
        thickness: '12μm',
        rollNo: 'R20240225001',
        customerId: customerMap['C001'],
        quantityInvolved: 500,
        application: '食品包装',
        productionLineId: productionLineMap['PL-001'],
        shiftTeam: '甲班',
        machineNo: 'M01',
        batchNo: 'B20240225A',
        feedbackContent: '客户反馈薄膜表面有晶点，影响印刷效果',
        customerComplaintText: '膜上有小点',
        internalComplaintName: '晶点',
        problemCategoryId: categoryMap['PC-01'],
        problemSubcategoryId: subcategoryMap['PS-0101'],
        severityLevelId: severityMap[3],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-01'],
        disposalResult: '已安排换货处理，客户满意',
        compensationTypeId: compensationMap['CT-02'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-01'],
        responsibleProcessId: 2,
        rootCauseAnalysis: '原料中含有杂质，过滤网更换不及时',
        correctiveAction: '加强原料检验，缩短过滤网更换周期',
        lessonsLearned: '需要建立原料入库检验标准',
        reviewConclusion: '问题已解决，预防措施有效',
        standardizedAction: true,
        createdById: superadminUser.id,
        updatedById: superadminUser.id,
        templateIds: `[${template1.id}]`
      },
      {
        complaintNo: 'CS20240315002',
        feedbackDate: new Date('2024-03-15'),
        productionTime: new Date('2024-03-10'),
        productModelId: productModelMap['PM-25-A'],
        thickness: '25μm',
        rollNo: 'R20240310005',
        customerId: customerMap['C002'],
        quantityInvolved: 800,
        application: '工业包装',
        productionLineId: productionLineMap['PL-002'],
        shiftTeam: '乙班',
        machineNo: 'M02',
        batchNo: 'B20240310B',
        feedbackContent: '薄膜厚度不均匀，部分区域偏薄',
        customerComplaintText: '厚度不对',
        internalComplaintName: '厚度偏差',
        problemCategoryId: categoryMap['PC-02'],
        problemSubcategoryId: subcategoryMap['PS-0201'],
        severityLevelId: severityMap[4],
        repeatedIssue: true,
        customerDemandId: demandMap['CD-04'],
        disposalResult: '部分退款处理，客户接受',
        compensationTypeId: compensationMap['CT-04'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-01'],
        responsibleProcessId: 3,
        rootCauseAnalysis: '纵向拉伸温度控制不稳定，导致厚度波动',
        correctiveAction: '检修温控系统，优化拉伸工艺参数',
        lessonsLearned: '加强关键工艺参数监控',
        reviewConclusion: '设备维护后问题未再发生',
        standardizedAction: true,
        createdById: adminUser.id,
        updatedById: adminUser.id,
        templateIds: `[${template1.id},${template3.id}]`
      },
      {
        complaintNo: 'CS20240401003',
        feedbackDate: new Date('2024-04-01'),
        productionTime: new Date('2024-03-28'),
        productModelId: productModelMap['PM-12-HA'],
        thickness: '12μm',
        rollNo: 'R20240328012',
        customerId: customerMap['C003'],
        quantityInvolved: 300,
        application: '高透明包装',
        productionLineId: productionLineMap['PL-003'],
        shiftTeam: '丙班',
        machineNo: 'M03',
        batchNo: 'B20240328C',
        feedbackContent: '薄膜透明度不达标，雾度偏高',
        customerComplaintText: '透明度不好',
        internalComplaintName: '透光率偏差',
        problemCategoryId: categoryMap['PC-03'],
        problemSubcategoryId: subcategoryMap['PS-0303'],
        severityLevelId: severityMap[2],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-06'],
        disposalResult: '提供技术支持，协助客户调整加工工艺',
        compensationTypeId: compensationMap['CT-01'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-03'],
        responsibleProcessId: 11,
        rootCauseAnalysis: '原料配方中添加剂比例不当',
        correctiveAction: '优化配方设计，调整添加剂用量',
        lessonsLearned: '高透产品需要严格控制配方',
        reviewConclusion: '配方优化后产品合格',
        standardizedAction: true,
        createdById: normalUser1.id,
        updatedById: normalUser3.id,
        templateIds: `[${template2.id}]`
      },
      {
        complaintNo: 'CS20240420004',
        feedbackDate: new Date('2024-04-20'),
        productionTime: new Date('2024-04-15'),
        productModelId: productModelMap['PM-50-IA'],
        thickness: '50μm',
        rollNo: 'R20240415008',
        customerId: customerMap['C004'],
        quantityInvolved: 1200,
        application: '电工绝缘',
        productionLineId: productionLineMap['PL-001'],
        shiftTeam: '甲班',
        machineNo: 'M01',
        batchNo: 'B20240415A',
        feedbackContent: '薄膜表面有划痕，影响绝缘性能',
        customerComplaintText: '膜上有划伤',
        internalComplaintName: '划痕',
        problemCategoryId: categoryMap['PC-01'],
        problemSubcategoryId: subcategoryMap['PS-0102'],
        severityLevelId: severityMap[5],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-02'],
        disposalResult: '全额退款，退回不合格产品',
        compensationTypeId: compensationMap['CT-03'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-04'],
        responsibleProcessId: 12,
        rootCauseAnalysis: '仓储搬运过程中操作不当，造成机械损伤',
        correctiveAction: '改进搬运工具，加强操作培训',
        lessonsLearned: '绝缘产品需要特别保护表面',
        reviewConclusion: '改进措施已落实',
        standardizedAction: true,
        createdById: normalUser2.id,
        updatedById: superadminUser.id,
        templateIds: `[${template1.id}]`
      },
      {
        complaintNo: 'CS20240510005',
        feedbackDate: new Date('2024-05-10'),
        productionTime: new Date('2024-05-05'),
        productModelId: productModelMap['PM-15-A'],
        thickness: '15μm',
        rollNo: 'R20240505003',
        customerId: customerMap['C005'],
        quantityInvolved: 600,
        application: '印刷基材',
        productionLineId: productionLineMap['PL-002'],
        shiftTeam: '乙班',
        machineNo: 'M02',
        batchNo: 'B20240505B',
        feedbackContent: '电晕处理值偏低，印刷附着力不足',
        customerComplaintText: '电晕不够',
        internalComplaintName: '电晕处理不足',
        problemCategoryId: categoryMap['PC-04'],
        problemSubcategoryId: subcategoryMap['PS-0401'],
        severityLevelId: severityMap[3],
        repeatedIssue: true,
        customerDemandId: demandMap['CD-05'],
        disposalResult: '重新进行电晕处理，提供技术指导',
        compensationTypeId: compensationMap['CT-06'],
        closureStatus: 'processing',
        responsibleDeptId: deptMap['RD-03'],
        responsibleProcessId: 10,
        rootCauseAnalysis: '电晕机电极老化，处理效果下降',
        correctiveAction: '更换电极，建立定期检测制度',
        lessonsLearned: '电晕处理需要定期维护检测',
        reviewConclusion: '处理中，待验证效果',
        standardizedAction: false,
        createdById: adminUser.id,
        updatedById: normalUser3.id,
        templateIds: `[${template2.id},${template3.id}]`
      },
      {
        complaintNo: 'CS20240525006',
        feedbackDate: new Date('2024-05-25'),
        productionTime: new Date('2024-05-20'),
        productModelId: productModelMap['PM-25-TH'],
        thickness: '25μm',
        rollNo: 'R20240520015',
        customerId: customerMap['C001'],
        quantityInvolved: 450,
        application: '热封包装',
        productionLineId: productionLineMap['PL-003'],
        shiftTeam: '丙班',
        machineNo: 'M03',
        batchNo: 'B20240520C',
        feedbackContent: '热封温度范围窄，封口不牢固',
        customerComplaintText: '热封不好',
        internalComplaintName: '热收缩率偏差',
        problemCategoryId: categoryMap['PC-03'],
        problemSubcategoryId: subcategoryMap['PS-0302'],
        severityLevelId: severityMap[2],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-03'],
        disposalResult: '降价处理，客户继续使用',
        compensationTypeId: compensationMap['CT-05'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-03'],
        responsibleProcessId: 5,
        rootCauseAnalysis: '热定型工艺参数设置不当',
        correctiveAction: '优化热定型温度和速度参数',
        lessonsLearned: '热封产品需要精确控制热定型工艺',
        reviewConclusion: '参数优化后产品合格',
        standardizedAction: true,
        createdById: normalUser3.id,
        updatedById: normalUser3.id,
        templateIds: `[${template3.id}]`
      },
      {
        complaintNo: 'CS20240610007',
        feedbackDate: new Date('2024-06-10'),
        productionTime: new Date('2024-06-05'),
        productModelId: productModelMap['PM-12-MA'],
        thickness: '12μm',
        rollNo: 'R20240605009',
        customerId: customerMap['C006'],
        quantityInvolved: 350,
        application: '哑光包装',
        productionLineId: productionLineMap['PL-001'],
        shiftTeam: '甲班',
        machineNo: 'M01',
        batchNo: 'B20240605A',
        feedbackContent: '哑光效果不均匀，有明显亮斑',
        customerComplaintText: '颜色不均',
        internalComplaintName: '色差',
        problemCategoryId: categoryMap['PC-01'],
        problemSubcategoryId: subcategoryMap['PS-0105'],
        severityLevelId: severityMap[3],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-01'],
        disposalResult: '已换货处理',
        compensationTypeId: compensationMap['CT-02'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-03'],
        responsibleProcessId: 10,
        rootCauseAnalysis: '消光母料分散不均匀',
        correctiveAction: '改进母料分散工艺，增加混炼时间',
        lessonsLearned: '哑光产品需要确保母料充分分散',
        reviewConclusion: '工艺改进后效果稳定',
        standardizedAction: true,
        createdById: superadminUser.id,
        updatedById: superadminUser.id,
        templateIds: `[${template1.id}]`
      },
      {
        complaintNo: 'CS20240625008',
        feedbackDate: new Date('2024-06-25'),
        productionTime: new Date('2024-06-20'),
        productModelId: productModelMap['PM-75-IA'],
        thickness: '75μm',
        rollNo: 'R20240620006',
        customerId: customerMap['C007'],
        quantityInvolved: 200,
        application: '电机绝缘',
        productionLineId: productionLineMap['PL-002'],
        shiftTeam: '乙班',
        machineNo: 'M02',
        batchNo: 'B20240620B',
        feedbackContent: '包装破损，产品受潮',
        customerComplaintText: '包装坏了',
        internalComplaintName: '包装破损',
        problemCategoryId: categoryMap['PC-05'],
        problemSubcategoryId: subcategoryMap['PS-0501'],
        severityLevelId: severityMap[4],
        repeatedIssue: false,
        customerDemandId: demandMap['CD-04'],
        disposalResult: '部分退款，干燥处理后使用',
        compensationTypeId: compensationMap['CT-04'],
        closureStatus: 'closed',
        responsibleDeptId: deptMap['RD-05'],
        responsibleProcessId: 22,
        rootCauseAnalysis: '运输过程中包装被刺破',
        correctiveAction: '改进包装方式，增加防护层',
        lessonsLearned: '厚规格产品需要加强包装防护',
        reviewConclusion: '包装改进后无类似问题',
        standardizedAction: true,
        createdById: normalUser4.id,
        updatedById: adminUser.id,
        templateIds: `[${template1.id}]`
      }
    ]
  })

  console.log('种子数据初始化完成!')
  console.log('默认账号:')
  console.log('  超级管理员: admin / admin123 (可看所有部门)')
  console.log('  部门管理员: deptadmin / deptadmin123 (生产部+质量部)')
  console.log('  普通用户:   operator / operator123 (生产部,只读)')
  console.log('  普通用户:   quality / quality123 (质量部,只读)')
  console.log('  技术员:     technician / tech123 (技术部,只读)')
  console.log('  销售代表:   sales / sales123 (销售部,只读)')
  console.log('  仓管员:     storage / storage123 (仓储部,只读)')
  console.log('  离职员工:   inactive / inactive123 (已禁用)')
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
