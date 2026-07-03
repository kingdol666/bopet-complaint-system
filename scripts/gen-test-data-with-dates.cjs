/**
 * Generate complex test data with date fields for template creation and import testing
 * Includes: multiple date formats, multiline fields, special characters, etc.
 */
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const headers = [
  '反馈日期',
  '生产日期',
  '客户',
  '产品型号',
  '厚度',
  '规格',
  '轴号',
  '批次号',
  '班组',
  '机台',
  '数据分类',
  '反馈内容',
  '责任部门',
  '责任工序',
  '涉及数量',
  '产品用途',
  '原因分析',
  '改善措施',
  '检验日期',
  '出厂日期',
  '处理状态',
  '备注'
]

const rows = [
  // Row 1: Standard data with multiple date fields
  ['2026.1.5', '2025.12.28', '上海明华塑料', 'BOPET-12μm', '12μm', '1200mm', 'A001', 'BC2026001', '甲班', '1号机', '外观不良', '薄膜表面有划痕，长度约2米', '生产部', '分切工序', 500, '食品包装', '分切刀具磨损导致划伤', '更换刀具并加强巡检', '2026/1/8', '2026/1/10', 'closed', '客户已退货'],

  // Row 2: Different date format
  ['2026/1/10', '2026/1/2', '广州包装材料', 'BOPET-25μm', '25μm', '1000mm', 'B002', 'BC2026002', '乙班', '2号机', '厚度偏差', '厚度超出公差范围±0.5μm', '品质部', '检测工序', 1200, '工业用膜', '原材料粘度不稳定', '调整挤出温度参数', '2026/1/12', '2026/1/15', 'processing', '等待复检结果'],

  // Row 3: Date range and multiline content
  ['2026.1.15', '2026.1.10', '深圳电子科技', 'BOPET-50μm', '50μm', '1500mm', 'C003', 'BC2026003', '丙班', '3号机', '异物混入\n发现黑色颗粒', '产品中发现不明黑色颗粒\n初步判断为设备磨损产生', '设备部', '挤出工序', 300, '电子元件', '挤出机滤网破损', '更换滤网并清洁模头', '2026-01-18', '2026-01-20', 'pending', '需跟踪客户使用情况'],

  // Row 4: Empty fields and special characters
  ['2026-01-20', '', '北京食品包装', 'BOPET-15μm', '15μm', '', 'D004', '', '甲班', '', '色差', '产品颜色偏黄，与标准样有差异', '生产部', '', 800, '', '色母配比不准确', '重新校准色母计量泵', '2026/1/22', '', 'closed', ''],

  // Row 5: Excel serial date (44927 = 2023-01-01, 45658 = 2024-12-30)
  ['20260125', '20260120', '重庆新材料', 'PET-19μm', '19μm', '1300mm', 'E005', 'BC2026005', '乙班', '5号机', '印刷不良', '印刷套印偏差超过0.2mm', '印刷部', '印刷工序', 1000, '标签材料', '印刷张力不稳定\n导辊轴承磨损', '更换轴承并调整张力参数', '2026.1.28', '2026.2.1', 'processing', '客户要求赔款'],

  // Row 6: Very long text
  ['2026/2/1', '2026/1/25', '天津包装有限公司', 'BOPET-12μm', '12μm', '1100mm', 'F006', 'BC2026006', '丙班', '1号机', '端面不平', '分切端面出现锯齿状不平整，影响自动包装机使用。客户反馈在高速包装机上出现卡机现象，导致生产线停机。经检查发现分切刀片已使用超过规定寿命。', '生产部', '分切工序', 2000, '食品包装', '刀片使用时间过长导致磨损\n刀片安装角度偏移\n收卷张力设置不当', '1. 更换新刀片\n2. 重新校准刀片安装角度\n3. 优化收卷张力参数\n4. 制定刀片更换计划表', '2026/2/3', '2026/2/5', 'closed', '已赔偿客户停机损失'],

  // Row 7: Special characters in fields
  ['2026.2.5', '2026.2.1', '杭州精密制造', 'BOPET-38μm', '38μm', '1200mm', 'G007', 'BC2026007', '甲班', '2号机', '气泡', '薄膜中存在透明气泡（直径0.5-1mm）', '品质部', '挤出工序', 600, '光学薄膜', '树脂干燥不充分\n水分含量超标', '延长干燥时间至6小时', '2026/2/8', '2026/2/10', 'pending', '备注：需复检批次BC2026007~BC2026009'],

  // Row 8: Quote and comma in content
  ['2026-02-10', '2026-02-05', '成都塑料制品', 'BOPET-25μm', '25μm', '1000mm', 'H008', 'BC2026008', '乙班', '3号机', '拉伸强度不足', '纵向拉伸强度测试值为180MPa，低于标准值200MPa', '品质部', '检测工序', 1500, '工业用膜', '拉伸比设置偏低，纵拉温度偏高', '调整拉伸比从3.0到3.5，降低纵拉温度5℃', '2026-02-12', '2026-02-15', 'closed', '复检合格'],
]

// Create worksheet
const aoa = [headers, ...rows]
const ws = XLSX.utils.aoa_to_sheet(aoa)

// Set column widths
ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }))

// Create workbook
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '测试数据')

// Write file
const outputPath = path.join(__dirname, '..', 'data', 'complex-test-with-dates.xlsx')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
XLSX.writeFile(wb, outputPath)

console.log(`✅ 测试数据已生成: ${outputPath}`)
console.log(`   - 表头: ${headers.length} 列`)
console.log(`   - 数据行: ${rows.length} 行`)
console.log(`   - 包含: 4个日期字段(反馈日期/生产日期/检验日期/出厂日期)`)
console.log(`   - 包含: 多种日期格式(YYYY.M.D / YYYY/M/D / YYYY-MM-DD / YYYYMMDD)`)
console.log(`   - 包含: 多行文本、空字段、特殊字符、超长文本`)

// Also generate CSV version
const csvLines = [headers.join(',')]
for (const row of rows) {
  const cells = row.map(v => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  })
  csvLines.push(cells.join(','))
}
const csvPath = path.join(__dirname, '..', 'data', 'complex-test-with-dates.csv')
fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf-8')
console.log(`✅ CSV版本已生成: ${csvPath}`)
