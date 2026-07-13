const BASE = 'http://localhost:3001'

async function main() {
  // 1. 登录
  const loginResp = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  const loginData = await loginResp.json()
  if (!loginData.success) { console.error('登录失败'); process.exit(1) }
  const token = loginData.data.token
  console.log('登录成功')

  // 2. 导出全部数据
  console.log('\n=== 导出全部数据 ===')
  const exportResp = await fetch(`${BASE}/api/datas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ sortBy: 'feedbackDate', sortOrder: 'desc' })
  })
  if (!exportResp.ok) { console.error('导出失败:', exportResp.status); process.exit(1) }
  const exportBuffer = await exportResp.arrayBuffer()
  console.log('导出成功! 文件大小:', (exportBuffer.byteLength / 1024).toFixed(2), 'KB')

  // 3. 验证Excel
  const ExcelJS = require('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(exportBuffer)
  console.log(`Sheet 数量: ${wb.worksheets.length}`)
  
  // 被禁止的固定列
  const forbiddenHeaders = [
    '记录编号', '反馈日期', '生产日期', '客户名称', '产品型号', '轴数', '厚度',
    '轴号', '规格', '涉及数量', '产线', '班组', '机台', '批次号', '反馈内容',
    '数据分类', '闭环状态', '责任部门', '责任工序', '原因分析', '纠正措施',
    '改善措施', '经验总结', '复盘结论', '公开状态', '备注'
  ]

  for (const ws of wb.worksheets) {
    console.log(`\n  Sheet: "${ws.name}", 行数: ${ws.rowCount}, 列数: ${ws.columnCount}`)
    
    // 读取表头行（第2行，第1行是信息行）
    if (ws.rowCount >= 2) {
      const headerRow = ws.getRow(2)
      const headers = []
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        headers.push(cell.value)
      })
      console.log(`  表头 (${headers.length}列): ${headers.join(' | ')}`)
      
      // 检查是否有被禁止的列
      const found = headers.filter(h => forbiddenHeaders.includes(h))
      if (found.length > 0) {
        console.log(`  ❌ 发现禁止列: ${found.join(', ')}`)
      } else {
        console.log(`  ✅ 无固定DB列`)
      }
      
      // 打印第一行数据
      if (ws.rowCount >= 3) {
        const dataRow = ws.getRow(3)
        const values = []
        dataRow.eachCell({ includeEmpty: false }, (cell) => {
          const v = typeof cell.value === 'string' ? cell.value.substring(0, 20) : cell.value
          values.push(v)
        })
        console.log(`  首行数据: ${values.join(' | ')}`)
      }
    }
  }

  console.log('\n=== 测试完成 ===')
}

main().catch(err => { console.error('异常:', err); process.exit(1) })
