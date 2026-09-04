/**
 * 数值聚合分析链路验证：按分组字段聚合数字类型字段（sum/avg/max/min）+ 占比
 * 场景：产线(select) + 问题数量(number)
 *   1号产线: 15, 20, 30 → sum=65, 占比 66.3%
 *   2号产线: 15, 18     → sum=33, 占比 33.7%
 */
const BASE = process.env.BASE_URL || 'http://localhost:3100'

let passCount = 0
let failCount = 0
const cleanupIds = { templateId: null, dataIds: [] }

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} [${status}] ${test}${detail ? ' - ' + detail : ''}`)
  if (status === 'PASS') passCount++
  else failCount++
}

async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts = { method, headers }
  if (body && method !== 'GET') opts.body = JSON.stringify(body)
  const resp = await fetch(`${BASE}${path}`, opts)
  const text = await resp.text()
  let data = null
  try { data = JSON.parse(text) } catch {}
  return { ok: resp.ok, status: resp.status, data }
}

// 按名称查找聚合结果项
function findItem(results, name) {
  return (results || []).find(r => r.name === name)
}

async function main() {
  // ─── 1. 登录 ───
  const login = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  const token = login.data?.data?.token
  log('管理员登录', token ? 'PASS' : 'FAIL')
  if (!token) process.exit(1)

  // ─── 2. 创建模板：产线(select) + 问题数量(number) ───
  const tpl = await api('POST', '/api/templates', {
    name: '聚合测试-产线问题统计表单',
    description: '验证数值聚合分析',
    enabled: true,
    fields: [
      { fieldKey: 'agg_production_line', fieldLabel: '产线', fieldType: 'select', required: true, sortOrder: 0, options: '1号产线,2号产线' },
      { fieldKey: 'agg_issue_count', fieldLabel: '问题数量', fieldType: 'number', required: true, sortOrder: 1 }
    ]
  }, token)
  const templateId = tpl.data?.data?.id
  cleanupIds.templateId = templateId
  log('创建模板（产线select + 问题数量number）', templateId ? 'PASS' : 'FAIL', `templateId=${templateId}`)
  if (!templateId) process.exit(1)

  // ─── 3. 录入数据：1号产线 15/20/30，2号产线 15/18 ───
  const rows = [
    { line: '1号产线', qty: 15 }, { line: '1号产线', qty: 20 }, { line: '1号产线', qty: 30 },
    { line: '2号产线', qty: 15 }, { line: '2号产线', qty: 18 }
  ]
  for (const [i, row] of rows.entries()) {
    const r = await api('POST', '/api/datas', {
      feedbackDate: `2026-09-0${i + 1}`,
      feedbackContent: `聚合测试数据${i + 1}`,
      closureStatus: 'pending',
      templateIds: [templateId],
      templateData: { agg_production_line: row.line, agg_issue_count: row.qty },
      isPublic: true
    }, token)
    const id = r.data?.data?.id
    if (id) cleanupIds.dataIds.push(id)
    log(`录入数据${i + 1}（${row.line}=${row.qty}）`, id ? 'PASS' : 'FAIL')
  }

  // ─── 4. 求和聚合：1号产线 65（66.3%），2号产线 33（33.7%） ───
  const sumResp = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_issue_count&aggFunc=sum&limit=30`, null, token)
  const sumD = sumResp.data?.data
  const s1 = findItem(sumD?.results, '1号产线')
  const s2 = findItem(sumD?.results, '2号产线')
  log('求和聚合 API 调用成功', sumResp.ok && sumD?.mode === 'aggregate' ? 'PASS' : 'FAIL',
    `mode=${sumD?.mode}, total=${sumD?.total}`)

  log('1号产线求和 = 15+20+30 = 65', s1 && Number(s1.value) === 65 ? 'PASS' : 'FAIL',
    `value=${s1?.value}, count=${s1?.count}`)
  log('2号产线求和 = 15+18 = 33', s2 && Number(s2.value) === 33 ? 'PASS' : 'FAIL',
    `value=${s2?.value}, count=${s2?.count}`)
  log('聚合总计 = 98', Number(sumD?.total) === 98 ? 'PASS' : 'FAIL', `total=${sumD?.total}`)
  log('1号产线占比 ≈ 66.3%', s1 && Math.abs(Number(s1.percentage) - 66.3) < 0.15 ? 'PASS' : 'FAIL',
    `percentage=${s1?.percentage}%`)
  log('2号产线占比 ≈ 33.7%', s2 && Math.abs(Number(s2.percentage) - 33.7) < 0.15 ? 'PASS' : 'FAIL',
    `percentage=${s2?.percentage}%`)

  // ─── 5. 平均 / 最大 / 最小聚合 ───
  const avgResp = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_issue_count&aggFunc=avg`, null, token)
  const a1 = findItem(avgResp.data?.data?.results, '1号产线')
  log('平均聚合：1号产线 avg = (15+20+30)/3 ≈ 21.67',
    a1 && Math.abs(Number(a1.value) - 21.67) < 0.01 ? 'PASS' : 'FAIL', `value=${a1?.value}`)

  const maxResp = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_issue_count&aggFunc=max`, null, token)
  const m1 = findItem(maxResp.data?.data?.results, '1号产线')
  log('最大聚合：1号产线 max = 30', m1 && Number(m1.value) === 30 ? 'PASS' : 'FAIL', `value=${m1?.value}`)

  const minResp = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_issue_count&aggFunc=min`, null, token)
  const n2 = findItem(minResp.data?.data?.results, '2号产线')
  log('最小聚合：2号产线 min = 15', n2 && Number(n2.value) === 15 ? 'PASS' : 'FAIL', `value=${n2?.value}`)

  // ─── 6. 非数字字段作为数值字段应报 400 ───
  const badResp = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_production_line`, null, token)
  log('数值字段为非数字类型时拒绝（400）', badResp.status === 400 ? 'PASS' : 'FAIL',
    `status=${badResp.status}, msg=${badResp.data?.message || badResp.data?.data?.message}`)

  // ─── 7. 过滤条件 + 聚合叠加 ───
  const filtered = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&valueField=agg_issue_count&aggFunc=sum&filters=${encodeURIComponent(JSON.stringify([{ field: 'agg_production_line', operator: 'in', values: ['1号产线'] }]))}`, null, token)
  const f1 = findItem(filtered.data?.data?.results, '1号产线')
  log('过滤后聚合：仅1号产线，总计 65',
    filtered.ok && f1 && Number(f1.value) === 65 && Number(filtered.data?.data?.total) === 65 ? 'PASS' : 'FAIL',
    `value=${f1?.value}, total=${filtered.data?.data?.total}`)

  // ─── 8. 不带 valueField 的原有分组统计不受影响 ───
  const plain = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=agg_production_line&mode=group`, null, token)
  const p1 = findItem(plain.data?.data?.results, '1号产线')
  log('原有分组统计（计数）不受影响：1号产线 3 条',
    plain.ok && p1 && Number(p1.count) === 3 ? 'PASS' : 'FAIL', `count=${p1?.count}`)

  // ─── 9. 清理 ───
  for (const id of cleanupIds.dataIds) {
    await api('DELETE', `/api/datas/${id}`, null, token)
  }
  if (cleanupIds.templateId) {
    const del = await api('DELETE', `/api/templates/${cleanupIds.templateId}`, null, token)
    log('清理测试模板与数据', del.ok ? 'PASS' : 'FAIL')
  }

  console.log('='.repeat(60))
  console.log(`  数值聚合分析链路: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
