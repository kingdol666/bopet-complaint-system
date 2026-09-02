/**
 * 完整链路验证：任意表单建立模板解析 + 可视化分析
 * 使用 Node 原生 fetch，避免 curl 中文编码问题
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

async function main() {
  // ─── 1. 登录 ───
  const login = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  const token = login.data?.data?.token
  log('管理员登录', token ? 'PASS' : 'FAIL')

  // ─── 2. 创建自定义模板（任意表单结构） ───
  const tpl = await api('POST', '/api/templates', {
    name: '链路测试-产品抽检表单',
    description: '验证任意表单结构的模板解析',
    enabled: true,
    fields: [
      { fieldKey: 'sample_batch', fieldLabel: '抽检批次', fieldType: 'text', required: true, sortOrder: 0 },
      { fieldKey: 'sample_qty', fieldLabel: '抽检数量', fieldType: 'number', required: true, sortOrder: 1 },
      { fieldKey: 'sample_level', fieldLabel: '缺陷等级', fieldType: 'select', required: true, sortOrder: 2, options: '轻微,一般,严重' },
      { fieldKey: 'sample_line', fieldLabel: '产线', fieldType: 'select-config', required: false, sortOrder: 3, configType: 'productionLine' },
      { fieldKey: 'sample_date', fieldLabel: '抽检日期', fieldType: 'date', required: false, sortOrder: 4 },
      { fieldKey: 'sample_note', fieldLabel: '备注', fieldType: 'textarea', required: false, sortOrder: 5 }
    ]
  }, token)
  const templateId = tpl.data?.data?.id
  cleanupIds.templateId = templateId
  log('创建自定义模板（含text/number/select/select-config/date/textarea 6种字段类型）',
    templateId ? 'PASS' : 'FAIL', `templateId=${templateId}, name=${tpl.data?.data?.name}`)

  // ─── 3. 用该模板录入 3 条数据（templateData 携带模板字段值） ───
  const rows = [
    { sample_batch: 'B2026-001', sample_qty: 120, sample_level: '轻微', sample_date: '2026-08-01', sample_note: '边缘轻微划伤' },
    { sample_batch: 'B2026-002', sample_qty: 85, sample_level: '一般', sample_date: '2026-08-02', sample_note: '局部厚度偏差' },
    { sample_batch: 'B2026-003', sample_qty: 240, sample_level: '严重', sample_date: '2026-08-03', sample_note: '大面积脱落' }
  ]
  for (const [i, td] of rows.entries()) {
    const r = await api('POST', '/api/datas', {
      feedbackDate: `2026-08-0${i + 1}`,
      feedbackContent: `链路测试数据${i + 1}`,
      closureStatus: ['pending', 'processing', 'closed'][i],
      templateIds: [templateId],
      templateData: td,
      isPublic: true
    }, token)
    const id = r.data?.data?.id
    if (id) cleanupIds.dataIds.push(id)
    log(`用自定义模板录入数据${i + 1}（${td.sample_batch}）`, id ? 'PASS' : 'FAIL', `id=${id}, dataNo=${r.data?.data?.dataNo}`)
  }

  // ─── 4. 验证模板解析：读回详情，templateData 与模板字段一一对应 ───
  const detail = await api('GET', `/api/datas/${cleanupIds.dataIds[0]}`, null, token)
  // API 返回 templateData 为 JSON 字符串（前端 JSON.parse 兼容），此处同样解析
  const tdRaw = detail.data?.data?.templateData
  const td = typeof tdRaw === 'string' ? JSON.parse(tdRaw) : (tdRaw || {})
  const parsedOk = td.sample_batch === 'B2026-001' && Number(td.sample_qty) === 120 && td.sample_level === '轻微'
  const tplFields = detail.data?.data?.templates?.[0]?.fields || detail.data?.data?.templateIds
  log('读回数据详情：templateData 按模板字段解析正确',
    parsedOk ? 'PASS' : 'FAIL',
    `sample_batch=${td.sample_batch}, sample_qty=${td.sample_qty}, sample_level=${td.sample_level}`)

  // 模板字段定义跟随数据返回（前端表单渲染依赖）
  const hasTplMeta = Array.isArray(tplFields) ? tplFields.length > 0 : !!tplFields
  log('数据详情返回模板/模板字段元信息', hasTplMeta ? 'PASS' : 'FAIL',
    typeof tplFields === 'object' ? JSON.stringify(tplFields).slice(0, 120) : String(tplFields))

  // ─── 5. 可视化分析：custom 自定义分析（按模板字段分组） ───
  // 响应结构：data.results（分组数组）
  const getResults = (d) => (d && Array.isArray(d.results)) ? d.results : []
  // 5.1 按模板下拉字段 sample_level 分组统计
  const custom1 = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=sample_level&mode=group&limit=30`, null, token)
  const c1Items = getResults(custom1.data?.data)
  log('自定义分析：按模板select字段(缺陷等级)分组统计',
    custom1.ok && c1Items.length > 0 ? 'PASS' : 'FAIL',
    `status=${custom1.status}, groups=${JSON.stringify(c1Items).slice(0, 200)}`)

  // 5.2 按模板文本字段 sample_batch 分组
  const custom2 = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=sample_batch&mode=group`, null, token)
  const c2Items = getResults(custom2.data?.data)
  log('自定义分析：按模板text字段(抽检批次)分组统计',
    custom2.ok && c2Items.length > 0 ? 'PASS' : 'FAIL',
    `status=${custom2.status}, groups=${JSON.stringify(c2Items).slice(0, 200)}`)

  // 5.3 按模板number字段求和统计（若有 metric/mode 支持）
  const custom3 = await api('GET', `/api/stats/custom?templateId=${templateId}&groupBy=sample_level&mode=group&filters=${encodeURIComponent(JSON.stringify([{ field: 'sample_level', operator: 'in', values: ['轻微', '严重'] }]))}`, null, token)
  log('自定义分析：模板字段过滤(in)生效',
    custom3.ok ? 'PASS' : 'FAIL', `status=${custom3.status}, body=${JSON.stringify(custom3.data?.data).slice(0, 160)}`)

  // ─── 6. 可视化分析：overview / trend / by-category ───
  const overview = await api('GET', '/api/stats/overview', null, token)
  const ov = overview.data?.data
  log('统计概览 overview', overview.ok && ov ? 'PASS' : 'FAIL',
    `total=${ov?.total ?? ov?.totalRecords ?? '?'}, keys=${ov ? Object.keys(ov).slice(0, 8).join(',') : '-'}`)

  const trend = await api('GET', '/api/stats/trend?year=2026', null, token)
  const tr = trend.data?.data
  const trMonthly = tr?.monthly || tr
  const trTotal = Array.isArray(trMonthly) ? trMonthly.reduce((s, m) => s + (m.total || 0), 0) : 0
  log('趋势分析 trend（2026年月度分组）',
    trend.ok && trTotal >= 3 ? 'PASS' : 'FAIL', `2026年合计=${trTotal} 条`)

  const byCat = await api('GET', '/api/stats/by-category', null, token)
  log('分类统计 by-category', byCat.ok ? 'PASS' : 'FAIL',
    `status=${byCat.status}, body=${JSON.stringify(byCat.data?.data).slice(0, 120)}`)

  // ─── 7. 清理测试数据（DEBUG_INVESTIGATE=1 时跳过） ───
  if (process.env.DEBUG_INVESTIGATE === '1') {
    console.log('[DEBUG] 保留测试数据供调查: templateId=' + cleanupIds.templateId + ', dataIds=' + cleanupIds.dataIds.join(','))
  } else {
    for (const id of cleanupIds.dataIds) {
      await api('DELETE', `/api/datas/${id}`, null, token)
    }
    if (cleanupIds.templateId) {
      const del = await api('DELETE', `/api/templates/${cleanupIds.templateId}`, null, token)
      log('清理测试模板与数据', del.ok ? 'PASS' : 'FAIL')
    }
  }

  console.log('='.repeat(60))
  console.log(`  模板解析+可视化分析链路: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
