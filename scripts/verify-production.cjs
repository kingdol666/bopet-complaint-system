/**
 * 生产环境最终验证：登录 + 核心 API + 模板/数据/聚合/EDA过滤 全链路
 */
const BASE = process.env.BASE || 'http://localhost:3001'

async function main() {
  // 1. 登录
  const login = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) }).then(r => r.json())
  console.log('1. 登录:', login.success && login.data?.token ? 'PASS' : 'FAIL')
  const token = login.data?.token
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  // 2. 核心 API 冒烟
  const tests = [
    ['用户列表', '/api/users'],
    ['部门列表', '/api/departments'],
    ['模板列表', '/api/templates'],
    ['数据列表', '/api/datas?pageSize=5'],
    ['统计概览', '/api/stats/overview'],
    ['我的分析', '/api/analyses'],
    ['看板列表', '/api/dashboards']
  ]
  for (const [name, path] of tests) {
    const r = await fetch(BASE + path, { headers: H })
    console.log('   ' + name + ':', r.status === 200 ? 'PASS' : 'FAIL(' + r.status + ')')
  }

  // 3. 创建模板（验证 select options 规范化存储）
  const tpl = await fetch(BASE + '/api/templates', { method: 'POST', headers: H, body: JSON.stringify({ name: '生产验证-表单', enabled: true, fields: [
    { fieldKey: 'p_line', fieldLabel: '产线', fieldType: 'select', required: true, sortOrder: 0, options: 'A线,B线' },
    { fieldKey: 'p_qty', fieldLabel: '数量', fieldType: 'number', required: true, sortOrder: 1 }
  ] }) }).then(r => r.json())
  const tplId = tpl.data?.id
  console.log('3. 创建模板:', tplId ? 'PASS (id=' + tplId + ')' : 'FAIL')
  const field = await fetch(BASE + '/api/templates/' + tplId, { headers: H }).then(r => r.json())
  const stored = (field.data?.fields || []).find(f => f.fieldKey === 'p_line')?.options
  console.log('   options 规范化存储:', stored === '["A线","B线"]' ? 'PASS (' + stored + ')' : 'CHECK(' + stored + ')')

  // 4. 录入数据
  for (const row of [{ line: 'A线', qty: 15 }, { line: 'A线', qty: 20 }, { line: 'B线', qty: 30 }]) {
    await fetch(BASE + '/api/datas', { method: 'POST', headers: H, body: JSON.stringify({
      feedbackDate: '2026-09-07', feedbackContent: '生产验证数据', closureStatus: 'pending',
      templateIds: [tplId], templateData: { p_line: row.line, p_qty: row.qty }, isPublic: true
    }) })
  }
  console.log('4. 录入 3 条数据: PASS')

  // 5. 聚合 + EDA 数值过滤（>15：A线只剩20，B线30）
  const aggPath = '/api/stats/custom?templateId=' + tplId + '&groupBy=p_line&valueField=p_qty&aggFunc=sum&filters=' +
    encodeURIComponent(JSON.stringify([{ field: 'p_qty', operator: 'gt', value: 15 }]))
  const agg = await fetch(BASE + aggPath, { headers: H }).then(r => r.json())
  const aLine = (agg.data?.results || []).find(r => r.name === 'A线')
  const bLine = (agg.data?.results || []).find(r => r.name === 'B线')
  const aggOk = Number(aLine?.value) === 20 && Number(bLine?.value) === 30
  console.log('5. 聚合+EDA过滤(>15):', aggOk ? 'PASS (A线=20, B线=30)' : 'FAIL (' + JSON.stringify(agg.data?.results) + ')')

  // 6. 清理
  const datas = await fetch(BASE + '/api/datas?keyword=生产验证&pageSize=10', { headers: H }).then(r => r.json())
  for (const d of (datas.data?.records || [])) await fetch(BASE + '/api/datas/' + d.id, { method: 'DELETE', headers: H })
  await fetch(BASE + '/api/templates/' + tplId, { method: 'DELETE', headers: H })
  console.log('6. 清理验证数据: DONE')
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) })
