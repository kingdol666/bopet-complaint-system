/**
 * EDA 过滤器 + 可视化模板可见性 测试
 *
 * 覆盖：
 * A. 按字段类型的过滤运算符：数值(=/>/>=/</<=)、文本(包含/不包含/等于)、时间段、多选、开关
 * B. 分析配置可见性：私有仅自己 / 部门共享同部门可见 / 跨部门不可见 / 仅创建者可改删
 * C. 看板可见性：同上
 */
const BASE = process.env.BASE_URL || 'http://localhost:3100'

let passCount = 0
let failCount = 0
const cleanup = { templateIds: [], dataIds: [], analysisIds: [], dashboardIds: [], userIds: [] }

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

async function login(username, password) {
  const r = await api('POST', '/api/auth/login', { username, password })
  return r.data?.data?.token || null
}

async function main() {
  console.log('══════════ 准备 ══════════')
  const superToken = await login('admin', 'admin123')
  const opToken = await login('operator', 'operator123') // DEPT-01
  const qToken = await login('quality', 'quality123') // DEPT-02
  log('登录（admin/operator/quality）', superToken && opToken && qToken ? 'PASS' : 'FAIL')
  if (!superToken || !opToken || !qToken) process.exit(1)

  const meOp = await api('GET', '/api/auth/me', null, opToken)
  const dept01Id = meOp.data?.data?.departments?.[0]?.id
  const meQ = await api('GET', '/api/auth/me', null, qToken)
  const dept02Id = meQ.data?.data?.departments?.[0]?.id

  // 预清理
  const allTpl = await api('GET', '/api/templates?all=1', null, superToken)
  for (const t of (allTpl.data?.data || [])) {
    if ((t.name || '').startsWith('EDA测试-')) await api('DELETE', `/api/templates/${t.id}`, null, superToken)
  }
  const opAnalyses = await api('GET', '/api/analyses', null, opToken)
  for (const a of (opAnalyses.data?.data || [])) {
    if ((a.name || '').startsWith('EDA测试-')) await api('DELETE', `/api/analyses/${a.id}`, null, opToken)
  }
  const qAnalyses = await api('GET', '/api/analyses', null, qToken)
  for (const a of (qAnalyses.data?.data || [])) {
    if ((a.name || '').startsWith('EDA测试-')) await api('DELETE', `/api/analyses/${a.id}`, null, qToken)
  }
  console.log('[预清理] 完成')

  // 建模板和数据：数量(number)、名称(text)、日期(date)、产线(select)、是否返工(switch)
  const tpl = await api('POST', '/api/templates', {
    name: 'EDA测试-过滤器表单',
    enabled: true,
    fields: [
      { fieldKey: 'eda_line', fieldLabel: '产线', fieldType: 'select', required: true, sortOrder: 0, options: 'A线,B线,C线' },
      { fieldKey: 'eda_qty', fieldLabel: '数量', fieldType: 'number', required: true, sortOrder: 1 },
      { fieldKey: 'eda_name', fieldLabel: '名称', fieldType: 'text', required: false, sortOrder: 2 },
      { fieldKey: 'eda_date', fieldLabel: '日期', fieldType: 'date', required: false, sortOrder: 3 },
      { fieldKey: 'eda_rework', fieldLabel: '是否返工', fieldType: 'switch', required: false, sortOrder: 4 }
    ]
  }, superToken)
  const tplId = tpl.data?.data?.id
  if (tplId) cleanup.templateIds.push(tplId)
  log('创建过滤器测试模板', tplId ? 'PASS' : 'FAIL', `id=${tplId}`)

  const rows = [
    { line: 'A线', qty: 10, name: '边缘划伤-A', date: '2026-09-01', rework: true },
    { line: 'A线', qty: 25, name: '厚度偏差-B', date: '2026-09-02', rework: false },
    { line: 'B线', qty: 40, name: '涂层气泡-A', date: '2026-09-03', rework: false },
    { line: 'C线', qty: 5, name: '轻微划痕-C', date: '2026-08-20', rework: true }
  ]
  for (const [i, row] of rows.entries()) {
    const r = await api('POST', '/api/datas', {
      feedbackDate: '2026-09-05',
      feedbackContent: `EDA测试数据${i + 1}`,
      closureStatus: 'pending',
      responsibleDeptId: dept01Id,
      templateIds: [tplId],
      templateData: { eda_line: row.line, eda_qty: row.qty, eda_name: row.name, eda_date: row.date, eda_rework: row.rework },
      isPublic: true
    }, opToken)
    if (r.data?.data?.id) cleanup.dataIds.push(r.data.data.id)
  }
  log(`创建 ${cleanup.dataIds.length}/4 条测试数据`, cleanup.dataIds.length === 4 ? 'PASS' : 'FAIL')

  const f = (filters) => encodeURIComponent(JSON.stringify(filters))

  console.log('\n══════════ A. 数值字段运算符（>/≥/</≤/=） ══════════')
  const gt = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_qty', operator: 'gt', value: 10 }])}`, null, opToken)
  const gtCount = (gt.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('数量 > 10 → 2条（25,40）', gt.ok && gtCount === 2 ? 'PASS' : 'FAIL', `count=${gtCount}`)
  const gte = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_qty', operator: 'gte', value: 25 }])}`, null, opToken)
  const gteCount = (gte.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('数量 ≥ 25 → 2条（25,40）', gte.ok && gteCount === 2 ? 'PASS' : 'FAIL', `count=${gteCount}`)
  const lt = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_qty', operator: 'lt', value: 25 }])}`, null, opToken)
  const ltCount = (lt.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('数量 < 25 → 2条（10,5）', lt.ok && ltCount === 2 ? 'PASS' : 'FAIL', `count=${ltCount}`)
  const lte = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_qty', operator: 'lte', value: 10 }])}`, null, opToken)
  const lteCount = (lte.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('数量 ≤ 10 → 2条（10,5）', lte.ok && lteCount === 2 ? 'PASS' : 'FAIL', `count=${lteCount}`)
  const numEq = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_qty', operator: 'num_eq', value: 40 }])}`, null, opToken)
  const numEqCount = (numEq.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('数量 = 40 → 1条', numEq.ok && numEqCount === 1 ? 'PASS' : 'FAIL', `count=${numEqCount}`)
  // 数值过滤 + 聚合叠加
  const aggFiltered = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&valueField=eda_qty&aggFunc=sum&filters=${f([{ field: 'eda_qty', operator: 'gte', value: 10 }])}`, null, opToken)
  const aggSum = Number(aggFiltered.data?.data?.total)
  log('数值过滤+聚合叠加（≥10 求和=75）', aggSum === 75 ? 'PASS' : 'FAIL', `total=${aggSum}`)

  console.log('\n══════════ B. 文本字段运算符（包含/不包含/等于） ══════════')
  const contains = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_name', operator: 'contains', value: '划' }])}`, null, opToken)
  const cCount = (contains.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('名称包含"划" → 2条', contains.ok && cCount === 2 ? 'PASS' : 'FAIL', `count=${cCount}`)
  const notContains = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_name', operator: 'not_contains', value: '划' }])}`, null, opToken)
  const ncCount = (notContains.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('名称不包含"划" → 2条', notContains.ok && ncCount === 2 ? 'PASS' : 'FAIL', `count=${ncCount}`)
  const eqText = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_name', operator: 'eq', value: '涂层气泡-A' }])}`, null, opToken)
  const eqCount = (eqText.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('名称等于"涂层气泡-A" → 1条', eqText.ok && eqCount === 1 ? 'PASS' : 'FAIL', `count=${eqCount}`)

  console.log('\n══════════ C. 时间段 / 多选 / 开关 / 组合过滤 ══════════')
  const dateRange = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_date', operator: 'date_range', value: '2026-09-01', valueEnd: '2026-09-03' }])}`, null, opToken)
  const dCount = (dateRange.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('日期 9/1~9/3 时间段 → 3条', dateRange.ok && dCount === 3 ? 'PASS' : 'FAIL', `count=${dCount}`)
  const inFilter = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_line', operator: 'in', values: ['A线', 'B线'] }])}`, null, opToken)
  const inCount = (inFilter.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('产线属于 A线/B线 → 3条', inFilter.ok && inCount === 3 ? 'PASS' : 'FAIL', `count=${inCount}`)
  const swTrue = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([{ field: 'eda_rework', operator: 'num_eq', value: 1 }])}`, null, opToken)
  const swCount = (swTrue.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('开关=是（返工） → 2条', swTrue.ok && swCount === 2 ? 'PASS' : 'FAIL', `count=${swCount}`)
  const combo = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=eda_line&filters=${f([
    { field: 'eda_qty', operator: 'gte', value: 10 },
    { field: 'eda_line', operator: 'in', values: ['A线', 'B线'] },
    { field: 'eda_name', operator: 'contains', value: '偏' }
  ])}`, null, opToken)
  const comboCount = (combo.data?.data?.results || []).reduce((s, r) => s + Number(r.count), 0)
  log('组合过滤（数量≥10 且 产线∈A/B 且 名称含"偏"） → 1条', combo.ok && comboCount === 1 ? 'PASS' : 'FAIL', `count=${comboCount}`)

  console.log('\n══════════ D. 分析配置可见性 ══════════')
  // 分析配置/看板创建为管理员功能（requireWritePermission）：普通用户创建 → 403（设计）
  const opCreate = await api('POST', '/api/analyses', {
    name: 'EDA测试-普通用户创建',
    config: { templateId: tplId }
  }, opToken)
  log('普通用户创建分析配置 → 403（管理资源，设计）', opCreate.status === 403 ? 'PASS' : 'FAIL', `status=${opCreate.status}`)

  // 创建 DEPT-01 专属管理员作为分析创建者
  const mkAdmin = await api('POST', '/api/users', {
    username: 'eda_test_adm',
    password: 'edatest123',
    name: 'EDA测试-部门管理员',
    role: 'admin',
    departmentIds: [dept01Id]
  }, superToken)
  const creatorToken = await login('eda_test_adm', 'edatest123').catch(() => null)
  const creatorUserId = mkAdmin.data?.data?.id
  if (creatorUserId) cleanup.userIds.push(creatorUserId)
  log('创建 DEPT-01 测试管理员（分析创建者）', mkAdmin.ok && creatorToken ? 'PASS' : 'FAIL', `userId=${creatorUserId}`)

  const a1 = await api('POST', '/api/analyses', {
    name: 'EDA测试-私有分析',
    config: { templateId: tplId, groupByField: ['eda_line'], chartType: 'bar' },
    visibility: 'private'
  }, creatorToken)
  const a1Id = a1.data?.data?.id
  if (a1Id) cleanup.analysisIds.push(a1Id)
  log('创建者创建私有分析', a1.ok ? 'PASS' : 'FAIL', `id=${a1Id}`)
  const a2 = await api('POST', '/api/analyses', {
    name: 'EDA测试-部门共享分析',
    config: { templateId: tplId, groupByField: ['eda_line'], valueField: 'eda_qty', aggFunc: 'sum', chartType: 'donut' },
    visibility: 'department'
  }, creatorToken)
  const a2Id = a2.data?.data?.id
  if (a2Id) cleanup.analysisIds.push(a2Id)
  log('创建者创建部门共享分析（含聚合参数）', a2.ok ? 'PASS' : 'FAIL', `id=${a2Id}`)

  // 同部门普通用户（operator DEPT-01）：可见共享、不可见私有
  const opList = await api('GET', '/api/analyses', null, opToken)
  const opSeesShared = (opList.data?.data || []).some((a) => a.id === a2Id)
  const opSeesPrivate = (opList.data?.data || []).some((a) => a.id === a1Id)
  log('同部门普通用户可见「部门共享」分析', opSeesShared ? 'PASS' : 'FAIL')
  log('同部门普通用户不可见他人「私有」分析', !opSeesPrivate ? 'PASS' : 'FAIL')

  // 跨部门（quality DEPT-02）不可见
  const qList = await api('GET', '/api/analyses', null, qToken)
  const qSeesShared = (qList.data?.data || []).some((a) => a.id === a2Id)
  log('跨部门用户不可见部门共享分析', !qSeesShared ? 'PASS' : 'FAIL')

  // 共享分析可读（含聚合参数回读）
  const opReadCfg = (opList.data?.data || []).find((a) => a.id === a2Id)
  const cfg = opReadCfg ? (typeof opReadCfg.config === 'string' ? JSON.parse(opReadCfg.config) : opReadCfg.config) : {}
  log('共享分析配置可读（含 valueField/aggFunc）', cfg.valueField === 'eda_qty' && cfg.aggFunc === 'sum' ? 'PASS' : 'FAIL',
    `valueField=${cfg.valueField}, aggFunc=${cfg.aggFunc}`)

  // 非创建者（另一管理员 deptadmin）不能改/删共享分析
  const deptAdminToken = await login('deptadmin', 'deptadmin123')
  const daPut = await api('PUT', `/api/analyses/${a2Id}`, { name: '越权改名' }, deptAdminToken)
  log('非创建者管理员修改共享分析 → 404（仅创建者）', daPut.status === 404 ? 'PASS' : 'FAIL', `status=${daPut.status}`)
  const daDel = await api('DELETE', `/api/analyses/${a2Id}`, null, deptAdminToken)
  log('非创建者管理员删除共享分析 → 404（仅创建者）', daDel.status === 404 ? 'PASS' : 'FAIL', `status=${daDel.status}`)
  // 普通用户（非创建者、无写权限）修改 → 403
  const opPut2 = await api('PUT', `/api/analyses/${a2Id}`, { name: '普通用户越权' }, opToken)
  log('普通用户修改共享分析 → 403（无写权限）', opPut2.status === 403 ? 'PASS' : 'FAIL', `status=${opPut2.status}`)
  // 创建者可更新可见性
  const crPut = await api('PUT', `/api/analyses/${a1Id}`, { visibility: 'department' }, creatorToken)
  log('创建者更新可见性（私有→部门共享）', crPut.ok ? 'PASS' : 'FAIL', `status=${crPut.status}`)
  const crGetAfter = await api('GET', '/api/analyses', null, creatorToken)
  const flipped = (crGetAfter.data?.data || []).find((a) => a.id === a1Id)
  log('可见性已生效', flipped?.visibility === 'department' ? 'PASS' : 'FAIL', `visibility=${flipped?.visibility}`)

  console.log('\n══════════ E. 看板可见性 ══════════')
  const db1 = await api('POST', '/api/dashboards', {
    name: 'EDA测试-部门共享看板',
    description: '可见性测试',
    visibility: 'department'
  }, creatorToken)
  const db1Id = db1.data?.data?.id
  if (db1Id) cleanup.dashboardIds.push(db1Id)
  log('创建者创建部门共享看板', db1.ok ? 'PASS' : 'FAIL', `id=${db1Id}`)
  const opDbList = await api('GET', '/api/dashboards', null, opToken)
  const opSeesDb = (opDbList.data?.data || []).some((d) => d.id === db1Id)
  log('同部门普通用户可见共享看板', opSeesDb ? 'PASS' : 'FAIL')
  if (opSeesDb) {
    const opDbDetail = await api('GET', `/api/dashboards/${db1Id}`, null, opToken)
    log('同部门普通用户可读取共享看板详情', opDbDetail.ok ? 'PASS' : 'FAIL', `status=${opDbDetail.status}`)
  }
  const qDbList = await api('GET', '/api/dashboards', null, qToken)
  const qSeesDb = (qDbList.data?.data || []).some((d) => d.id === db1Id)
  log('跨部门用户不可见共享看板', !qSeesDb ? 'PASS' : 'FAIL')
  const daDbPut = await api('PUT', `/api/dashboards/${db1Id}`, { name: '越权' }, deptAdminToken)
  log('非创建者更新共享看板 → 404（仅创建者）', daDbPut.status === 404 ? 'PASS' : 'FAIL', `status=${daDbPut.status}`)

  console.log('\n══════════ 清理 ══════════')
  for (const id of cleanup.analysisIds) await api('DELETE', `/api/analyses/${id}`, null, creatorToken)
  for (const id of cleanup.dashboardIds) await api('DELETE', `/api/dashboards/${id}`, null, creatorToken)
  for (const id of cleanup.dataIds) await api('DELETE', `/api/datas/${id}`, null, superToken)
  for (const tid of cleanup.templateIds) await api('DELETE', `/api/templates/${tid}`, null, superToken)
  if (creatorUserId) await api('DELETE', `/api/users/${creatorUserId}`, null, superToken)
  log('清理测试数据', 'PASS', `data=${cleanup.dataIds.length}, tpl=${cleanup.templateIds.length}, analysis=${cleanup.analysisIds.length}, dashboard=${cleanup.dashboardIds.length}, user=${creatorUserId ? 1 : 0}`)

  console.log('='.repeat(60))
  console.log(`  EDA过滤器+可见性: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
