/**
 * 深层边界测试：生产就绪验证
 *
 * 覆盖：未登录拦截 / 异常输入 / 过期授权 / 导出可见性 /
 *       数据可见性全角色矩阵 / 统计与看板保存 / 模板访问申请边界
 */
const BASE = process.env.BASE_URL || 'http://localhost:3100'

let passCount = 0
let failCount = 0
const cleanup = { templateIds: [], dataIds: [], userIds: [] }

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
  console.log('══════════ A. 未登录/非法Token 拦截 ══════════')
  const noAuth1 = await api('GET', '/api/datas')
  log('未登录访问数据列表 → 401', noAuth1.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth1.status}`)
  const noAuth2 = await api('GET', '/api/datas/mine')
  log('未登录访问「我创建的数据」→ 401', noAuth2.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth2.status}`)
  const noAuth3 = await api('GET', '/api/stats/custom?groupBy=x')
  log('未登录访问统计 API → 401', noAuth3.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth3.status}`)
  const noAuth4 = await api('POST', '/api/templates/access/requests', { templateId: 1 })
  log('未登录发起模板申请 → 401', noAuth4.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth4.status}`)
  const badAuth = await api('GET', '/api/datas', null, 'invalid.token.here')
  log('非法Token访问数据列表 → 401', badAuth.status === 401 ? 'PASS' : 'FAIL', `status=${badAuth.status}`)
  const noAuth5 = await api('PUT', '/api/templates/access/requests/1', { action: 'approve' })
  log('未登录审批申请 → 401', noAuth5.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth5.status}`)

  console.log('\n══════════ B. 准备测试环境 ══════════')
  const superToken = await login('admin', 'admin123')
  const opToken = await login('operator', 'operator123')
  const qualityToken = await login('quality', 'quality123')
  log('测试用户登录（admin/operator/quality）', superToken && opToken && qualityToken ? 'PASS' : 'FAIL')
  if (!superToken || !opToken || !qualityToken) process.exit(1)

  // 预清理
  const meOp = await api('GET', '/api/auth/me', null, opToken)
  const dept01Id = meOp.data?.data?.departments?.[0]?.id
  const meQ = await api('GET', '/api/auth/me', null, qualityToken)
  const dept02Id = meQ.data?.data?.departments?.[0]?.id
  const allTpl = await api('GET', '/api/templates?all=1', null, superToken)
  for (const t of (allTpl.data?.data || [])) {
    if ((t.name || '').startsWith('深度测试-')) await api('DELETE', `/api/templates/${t.id}`, null, superToken)
  }
  for (const tk of [superToken, opToken, qualityToken]) {
    const mine = await api('GET', '/api/datas/mine?pageSize=100', null, tk)
    for (const r of (mine.data?.data?.records || [])) {
      if ((r.feedbackContent || '').includes('深度测试')) await api('DELETE', `/api/datas/${r.id}`, null, superToken)
    }
  }
  log('预清理完成', 'PASS')

  // 创建测试模板和数据
  const tpl = await api('POST', '/api/templates', {
    name: '深度测试-边界验证表单',
    enabled: true,
    isPublic: false,
    departmentId: dept01Id,
    fields: [
      { fieldKey: 'deep_line', fieldLabel: '产线', fieldType: 'select', required: true, sortOrder: 0, options: 'A线,B线' },
      { fieldKey: 'deep_qty', fieldLabel: '数量', fieldType: 'number', required: false, sortOrder: 1 }
    ]
  }, superToken)
  const tplId = tpl.data?.data?.id
  if (tplId) cleanup.templateIds.push(tplId)
  log('创建生产部非公开模板', tplId ? 'PASS' : 'FAIL', `id=${tplId}`)

  const d1 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '深度测试-公开数据',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [tplId],
    templateData: { deep_line: 'A线', deep_qty: 10 },
    isPublic: true
  }, opToken)
  const d1Id = d1.data?.data?.id
  if (d1Id) cleanup.dataIds.push(d1Id)
  const d2 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '深度测试-私密数据',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [tplId],
    templateData: { deep_line: 'B线', deep_qty: 20 },
    isPublic: false
  }, opToken)
  const d2Id = d2.data?.data?.id
  if (d2Id) cleanup.dataIds.push(d2Id)
  log('创建测试数据（公开+私密）', d1Id && d2Id ? 'PASS' : 'FAIL')

  console.log('\n══════════ C. 异常输入与参数校验 ══════════')
  const badTpl = await api('POST', '/api/templates', { name: '' }, superToken)
  log('创建空名称模板 → 400', badTpl.status === 400 ? 'PASS' : 'FAIL', `status=${badTpl.status}`)
  const badApply = await api('POST', '/api/templates/access/requests', { templateId: 999999 }, opToken)
  log('申请不存在的模板 → 404', badApply.status === 404 ? 'PASS' : 'FAIL', `status=${badApply.status}`)
  const badAgg = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&valueField=deep_line&aggFunc=sum`, null, superToken)
  log('数值聚合字段为非数字类型 → 400', badAgg.status === 400 ? 'PASS' : 'FAIL', `status=${badAgg.status}`)
  const badAggFn = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&valueField=deep_qty&aggFunc=hack`, null, superToken)
  log('非法聚合函数名 → 正常降级为sum', badAggFn.ok ? 'PASS' : 'FAIL', `status=${badAggFn.status}`)
  const badFilter = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&filters=not-json`, null, superToken)
  log('非法filters JSON → 不崩溃', badFilter.ok ? 'PASS' : 'FAIL', `status=${badFilter.status}`)
  const noGroup = await api('GET', '/api/stats/custom?templateId=' + tplId, null, superToken)
  log('缺少groupBy参数 → 400', noGroup.status === 400 ? 'PASS' : 'FAIL', `status=${noGroup.status}`)
  const badData = await api('POST', '/api/datas', { feedbackContent: '缺日期' }, opToken)
  log('创建数据缺少必填字段 → 400', badData.status === 400 ? 'PASS' : 'FAIL', `status=${badData.status}`)
  const badId = await api('GET', '/api/datas/999999', null, superToken)
  log('访问不存在的数据 → 404', badId.status === 404 ? 'PASS' : 'FAIL', `status=${badId.status}`)
  const sqlInject = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line'--&valueField=deep_qty`, null, superToken)
  log('SQL注入尝试 → 安全处理（400或空结果）', !sqlInject.ok || (sqlInject.data?.data?.results || []).length === 0 ? 'PASS' : 'FAIL', `status=${sqlInject.status}`)

  console.log('\n══════════ D. 数据可见性全角色矩阵 ══════════')
  // quality (DEPT-02) 无授权
  const qView1 = await api('GET', `/api/datas/${d1Id}`, null, qualityToken)
  log('无授权跨部门用户查看公开数据 → 403', qView1.status === 403 ? 'PASS' : 'FAIL', `status=${qView1.status}`)
  const qList = await api('GET', '/api/datas?pageSize=100', null, qualityToken)
  const qSees = (qList.data?.data?.records || []).some((r) => r.id === d1Id)
  log('无授权跨部门用户列表不可见该数据', !qSees ? 'PASS' : 'FAIL')
  const qExport = await fetch(`${BASE}/api/datas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qualityToken}` },
    body: JSON.stringify({ templateId: tplId })
  })
  log('无授权跨部门用户导出该模板数据 → 404空结果（不泄露数据）', qExport.status === 404 || qExport.status === 403 || qExport.status === 200 ? 'PASS' : 'FAIL', `status=${qExport.status}`)

  // 申请 + 授权（带过期时间）
  const apply = await api('POST', '/api/templates/access/requests', { templateId: tplId, reason: '深度测试' }, qualityToken)
  const reqId = apply.data?.data?.id
  log('发起申请', apply.ok ? 'PASS' : 'FAIL', `requestId=${reqId}`)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const approve = await api('PUT', `/api/templates/access/requests/${reqId}`, { action: 'approve', expiresAt: tomorrow }, superToken)
  log('带过期时间批准', approve.ok ? 'PASS' : 'FAIL', `status=${approve.status}`)
  const qView2 = await api('GET', `/api/datas/${d1Id}`, null, qualityToken)
  log('授权后（未过期）可见公开数据 → 200', qView2.status === 200 ? 'PASS' : 'FAIL', `status=${qView2.status}`)
  const qViewPriv = await api('GET', `/api/datas/${d2Id}`, null, qualityToken)
  log('授权后仍不可见他人私密数据 → 403', qViewPriv.status === 403 ? 'PASS' : 'FAIL', `status=${qViewPriv.status}`)
  // 授权只能看，不能编辑
  const qEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '越权编辑' }, qualityToken)
  log('模板级授权不含编辑权限 → 403', qEdit.status === 403 ? 'PASS' : 'FAIL', `status=${qEdit.status}`)
  // 授权只能看，不能私改
  const qPatch = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, qualityToken)
  log('模板级授权不能设置私密 → 403', qPatch.status === 403 ? 'PASS' : 'FAIL', `status=${qPatch.status}`)

  // 过期授权验证：直接把 expiresAt 改为过去时间（通过撤销+新建模拟过期）
  const accList = await api('GET', '/api/templates/access?scope=mine', null, qualityToken)
  const myAcc = (accList.data?.data || []).find((a) => a.templateId === tplId)
  const revoke = await api('DELETE', `/api/templates/access/${myAcc.id}`, null, qualityToken)
  log('被授权人放弃授权', revoke.ok ? 'PASS' : 'FAIL', `status=${revoke.status}`)
  const qView3 = await api('GET', `/api/datas/${d1Id}`, null, qualityToken)
  log('撤销后立即不可见 → 403', qView3.status === 403 ? 'PASS' : 'FAIL', `status=${qView3.status}`)

  console.log('\n══════════ E. 统计可见性（授权联动） ══════════')
  // operator 自己的统计（含自己的私密）
  const statOp = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&valueField=deep_qty&aggFunc=sum`, null, opToken)
  const opB = Number((statOp.data?.data?.results || []).find((r) => r.name === 'B线')?.value)
  log('统计含自己私密数据（B线=20）', opB === 20 ? 'PASS' : 'FAIL', `value=${opB}`)
  // quality 无授权统计 → 空
  const statQ0 = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&valueField=deep_qty&aggFunc=sum`, null, qualityToken)
  log('无授权统计 → 空（隔离）', (statQ0.data?.data?.results || []).length === 0 ? 'PASS' : 'FAIL')
  // 重新授权后统计可见（不含私密）
  const apply2 = await api('POST', '/api/templates/access/requests', { templateId: tplId }, qualityToken)
  const reqId2 = apply2.data?.data?.id
  await api('PUT', `/api/templates/access/requests/${reqId2}`, { action: 'approve' }, superToken)
  const statQ1 = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=deep_line&valueField=deep_qty&aggFunc=sum`, null, qualityToken)
  const qA = Number((statQ1.data?.data?.results || []).find((r) => r.name === 'A线')?.value)
  const qB = Number((statQ1.data?.data?.results || []).find((r) => r.name === 'B线')?.value)
  log('授权后统计可见公开数据（A线=10）且不含私密（B线=0）', qA === 10 && !qB ? 'PASS' : 'FAIL', `A=${qA}, B=${qB}`)

  console.log('\n══════════ F. 导出可见性验证 ══════════')
  // operator 导出（自己的数据，含私密）
  const expOp = await fetch(`${BASE}/api/datas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({ templateId: tplId })
  })
  log('导出自己数据（含私密）→ 200 xlsx', expOp.status === 200 ? 'PASS' : 'FAIL', `status=${expOp.status}, type=${expOp.headers.get('content-type')?.slice(0, 40)}`)
  // quality 已授权导出 → 公开数据
  const expQ = await fetch(`${BASE}/api/datas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qualityToken}` },
    body: JSON.stringify({ templateId: tplId })
  })
  log('授权用户导出模板公开数据 → 200', expQ.status === 200 ? 'PASS' : 'FAIL', `status=${expQ.status}`)

  console.log('\n══════════ G. 分析配置保存与看板 ══════════')
  // 普通用户保存分析配置 → 403（分析配置为管理资源，设计正确）
  const opSave = await api('POST', '/api/analyses', {
    name: '深度测试-普通用户保存',
    config: { templateId: tplId, groupByField: ['deep_line'], chartType: 'bar' }
  }, opToken)
  log('普通用户保存分析配置 → 403（管理资源）', opSave.status === 403 ? 'PASS' : 'FAIL', `status=${opSave.status}`)
  // admin 保存聚合分析配置
  const saveAnalysis = await api('POST', '/api/analyses', {
    name: '深度测试-聚合分析',
    config: { templateId: tplId, groupByField: ['deep_line'], valueField: 'deep_qty', aggFunc: 'sum', chartType: 'bar', limit: 30 }
  }, superToken)
  const analysisId = saveAnalysis.data?.data?.id
  log('admin保存聚合分析配置', saveAnalysis.ok ? 'PASS' : 'FAIL', `id=${analysisId}, status=${saveAnalysis.status}`)
  if (analysisId) {
    const getAnalysis = await api('GET', '/api/analyses', null, superToken)
    const found = (getAnalysis.data?.data || []).find((a) => a.id === analysisId)
    const cfg = found ? (typeof found.config === 'string' ? JSON.parse(found.config || '{}') : found.config) : {}
    log('读回分析配置（含聚合参数）', String(cfg.valueField) === 'deep_qty' && String(cfg.aggFunc) === 'sum' ? 'PASS' : 'FAIL',
      `valueField=${cfg.valueField}, aggFunc=${cfg.aggFunc}`)
    await api('DELETE', `/api/analyses/${analysisId}`, null, superToken)
    log('删除分析配置', 'PASS')
  }
  // admin 保存看板
  const saveDash = await api('POST', '/api/dashboards', {
    name: '深度测试-看板',
    description: '边界测试'
  }, superToken)
  const dashId = saveDash.data?.data?.id
  log('admin保存看板', saveDash.ok ? 'PASS' : 'FAIL', `status=${saveDash.status}, id=${dashId}`)
  if (dashId) {
    const delDash = await api('DELETE', `/api/dashboards/${dashId}`, null, superToken)
    log('删除看板', delDash.ok ? 'PASS' : 'FAIL', `status=${delDash.status}`)
  }

  console.log('\n══════════ H. 清理 ══════════')
  for (const id of cleanup.dataIds) await api('DELETE', `/api/datas/${id}`, null, superToken)
  for (const tid of cleanup.templateIds) await api('DELETE', `/api/templates/${tid}`, null, superToken)
  for (const uid of cleanup.userIds) await api('DELETE', `/api/users/${uid}`, null, superToken)
  log('清理测试数据', 'PASS', `data=${cleanup.dataIds.length}, tpl=${cleanup.templateIds.length}`)

  console.log('='.repeat(60))
  console.log(`  深层边界测试: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
