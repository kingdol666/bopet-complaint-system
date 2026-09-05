/**
 * 最终完整端到端测试（Final Full E2E）
 *
 * 覆盖：模板创建（9种字段类型）/ 表单解析回读 / 双用户（不同权限）上传数据 /
 *       权限隔离（查看/编辑/私密/删除）/ 可视化（分组/聚合/占比/日期分布）/
 *       模板访问授权链路 / 导出 / mine API
 *
 * 用户矩阵：admin=superadmin, deptadmin=admin(DEPT-01+02),
 *           operator=normal(DEPT-01), quality=normal(DEPT-02)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3100'

let passCount = 0
let failCount = 0
const failures = []
const cleanup = { templateIds: [], dataIds: [] }

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} [${status}] ${test}${detail ? ' - ' + detail : ''}`)
  if (status === 'PASS') passCount++
  else { failCount++; failures.push({ test, detail }) }
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
  console.log('══════════ 阶段0：登录 ══════════')
  const superToken = await login('admin', 'admin123')
  const deptAdminToken = await login('deptadmin', 'deptadmin123')
  const opToken = await login('operator', 'operator123')
  const qToken = await login('quality', 'quality123')
  log('四用户登录（superadmin/admin/normal×2）',
    superToken && deptAdminToken && opToken && qToken ? 'PASS' : 'FAIL')
  if (!superToken || !deptAdminToken || !opToken || !qToken) process.exit(1)

  const meOp = await api('GET', '/api/auth/me', null, opToken)
  const dept01Id = meOp.data?.data?.departments?.[0]?.id
  const meQ = await api('GET', '/api/auth/me', null, qToken)
  const dept02Id = meQ.data?.data?.departments?.[0]?.id
  log('部门ID获取（operator→DEPT-01, quality→DEPT-02）',
    dept01Id && dept02Id && dept01Id !== dept02Id ? 'PASS' : 'FAIL', `D1=${dept01Id}, D2=${dept02Id}`)

  // 预清理上次运行残留
  const allTpl = await api('GET', '/api/templates?all=1', null, superToken)
  for (const t of (allTpl.data?.data || [])) {
    if ((t.name || '').startsWith('最终E2E-')) await api('DELETE', `/api/templates/${t.id}`, null, superToken)
  }
  for (const tk of [superToken, opToken, qToken]) {
    const mine = await api('GET', '/api/datas/mine?pageSize=100', null, tk)
    for (const r of (mine.data?.data?.records || [])) {
      if ((r.feedbackContent || '').includes('最终E2E')) await api('DELETE', `/api/datas/${r.id}`, null, superToken)
    }
  }
  console.log('[预清理] 完成')

  console.log('\n══════════ 阶段1：模板创建（9种字段类型） ══════════')
  const tpl = await api('POST', '/api/templates', {
    name: '最终E2E-全字段类型表单',
    description: '最终端到端测试：覆盖全部字段类型',
    enabled: true,
    isPublic: false,
    departmentId: dept01Id,
    fields: [
      { fieldKey: 'fe_text', fieldLabel: '文本字段', fieldType: 'text', required: true, sortOrder: 0 },
      { fieldKey: 'fe_textarea', fieldLabel: '多行文本', fieldType: 'textarea', required: false, sortOrder: 1 },
      { fieldKey: 'fe_number', fieldLabel: '数量', fieldType: 'number', required: true, sortOrder: 2 },
      { fieldKey: 'fe_select', fieldLabel: '缺陷等级', fieldType: 'select', required: false, sortOrder: 3, options: '轻微,一般,严重' },
      { fieldKey: 'fe_date', fieldLabel: '检测日期', fieldType: 'date', required: false, sortOrder: 4 },
      { fieldKey: 'fe_switch', fieldLabel: '是否返工', fieldType: 'switch', required: false, sortOrder: 5 },
      { fieldKey: 'fe_prodline', fieldLabel: '产线', fieldType: 'select-config', required: false, sortOrder: 6, configType: 'productionLines' },
      { fieldKey: 'fe_autoc', fieldLabel: '机台参考', fieldType: 'auto-complete', required: false, sortOrder: 7, configType: 'productionLines' }
    ]
  }, superToken)
  const tplId = tpl.data?.data?.id
  if (tplId) cleanup.templateIds.push(tplId)
  log('创建全字段类型模板（8字段）', tplId ? 'PASS' : 'FAIL', `templateId=${tplId}, msg=${tpl.data?.message}`)

  // 模板字段读回验证
  if (tplId) {
    const tplDetail = await api('GET', `/api/templates/${tplId}`, null, superToken)
    const fields = tplDetail.data?.data?.fields || []
    const typeOk = ['text','textarea','number','select','date','switch','select-config','auto-complete']
      .every(ft => fields.some(f => f.fieldType === ft))
    const sortOk = fields.length === 8 && fields[0].fieldKey === 'fe_text' && fields[7].fieldKey === 'fe_autoc'
    const optOk = (fields.find(f => f.fieldKey === 'fe_select')?.options || '').includes('轻微')
    log('模板字段读回：8种类型/排序/选项正确', typeOk && sortOk && optOk ? 'PASS' : 'FAIL',
      `fields=${fields.length}, typeOk=${typeOk}, sortOk=${sortOk}, optOk=${optOk}`)
  }

  // 全局模板（quality 上传数据用）
  const gTpl = await api('POST', '/api/templates', {
    name: '最终E2E-全局记录表单',
    enabled: true,
    fields: [
      { fieldKey: 'fe_gitem', fieldLabel: '项目', fieldType: 'text', required: true, sortOrder: 0 },
      { fieldKey: 'fe_gval', fieldLabel: '数值', fieldType: 'number', required: false, sortOrder: 1 }
    ]
  }, superToken)
  const gTplId = gTpl.data?.data?.id
  if (gTplId) cleanup.templateIds.push(gTplId)
  log('创建全局模板（quality上传用）', gTplId ? 'PASS' : 'FAIL', `templateId=${gTplId}`)

  console.log('\n══════════ 阶段2：双用户上传数据 + 表单解析 ══════════')
  // operator（DEPT-01 普通用户）用全字段模板上传公开数据
  const d1 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-05',
    feedbackContent: '最终E2E-操作员全字段公开数据',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [tplId],
    templateData: {
      fe_text: '边缘划伤',
      fe_textarea: '第一行内容\n第二行内容',
      fe_number: 10,
      fe_select: '轻微',
      fe_date: '2026-09-05',
      fe_switch: true,
      fe_prodline: '一号产线',
      fe_autoc: '二号产线'
    },
    isPublic: true
  }, opToken)
  const d1Id = d1.data?.data?.id
  if (d1Id) cleanup.dataIds.push(d1Id)
  log('operator上传全字段公开数据', d1Id ? 'PASS' : 'FAIL', `id=${d1Id}, msg=${d1.data?.message || JSON.stringify(d1.data).slice(0, 100)}`)

  // operator 上传第二条公开数据 + 一条私密数据
  const d2 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-05',
    feedbackContent: '最终E2E-操作员第二条',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [tplId],
    templateData: { fe_text: '厚度偏差', fe_number: 20, fe_select: '一般', fe_date: '2026-09-05', fe_switch: false, fe_prodline: '二号产线' },
    isPublic: true
  }, opToken)
  const d2Id = d2.data?.data?.id
  if (d2Id) cleanup.dataIds.push(d2Id)
  const d3 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-05',
    feedbackContent: '最终E2E-操作员私密数据',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [tplId],
    templateData: { fe_text: '内部记录', fe_number: 30, fe_select: '严重', fe_date: '2026-09-05', fe_switch: false, fe_prodline: '一号产线' },
    isPublic: false
  }, opToken)
  const d3Id = d3.data?.data?.id
  if (d3Id) cleanup.dataIds.push(d3Id)
  log('operator上传第二公开+私密数据', d2Id && d3Id ? 'PASS' : 'FAIL', `d2=${d2Id}, d3=${d3Id}`)

  // quality（DEPT-02 普通用户）用全局模板上传数据
  const dq = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-05',
    feedbackContent: '最终E2E-质检员质量部数据',
    closureStatus: 'pending',
    responsibleDeptId: dept02Id,
    templateIds: [gTplId],
    templateData: { fe_gitem: '来料检验', fe_gval: 7 },
    isPublic: true
  }, qToken)
  const dqId = dq.data?.data?.id
  if (dqId) cleanup.dataIds.push(dqId)
  log('quality上传质量部数据（全局模板）', dqId ? 'PASS' : 'FAIL', `id=${dqId}`)

  // ─── 表单解析：读回数据详情，逐字段验证 ───
  if (d1Id) {
    const detail = await api('GET', `/api/datas/${d1Id}`, null, opToken)
    const rec = detail.data?.data || {}
    const tdRaw = rec.templateData
    const td = typeof tdRaw === 'string' ? JSON.parse(tdRaw) : (tdRaw || {})
    const checks = [
      ['text', td.fe_text === '边缘划伤'],
      ['textarea含换行', td.fe_textarea === '第一行内容\n第二行内容'],
      ['number', Number(td.fe_number) === 10],
      ['select', td.fe_select === '轻微'],
      ['date', String(td.fe_date).startsWith('2026-09-05')],
      ['switch', td.fe_switch === true],
      ['select-config(名称字符串)', td.fe_prodline === '一号产线'],
      ['auto-complete', td.fe_autoc === '二号产线'],
      ['DB列写入(feedbackDate)', String(rec.feedbackDate || '').startsWith('2026-09-05')]
    ]
    for (const [name, ok] of checks) {
      log(`表单解析回读：${name}`, ok ? 'PASS' : 'FAIL',
        ok ? '' : `actual=${JSON.stringify({ fe_text: td.fe_text, fe_number: td.fe_number, prodline: rec.productionLine?.name }).slice(0, 120)}`)
    }
    // 模板字段跟随数据返回（前端表单渲染依赖）
    const tplIds = typeof rec.templateIds === 'string' ? JSON.parse(rec.templateIds) : rec.templateIds
    log('表单解析回读：templateIds关联正确', Array.isArray(tplIds) && tplIds.includes(tplId) ? 'PASS' : 'FAIL',
      `templateIds=${JSON.stringify(tplIds)}`)
  }

  console.log('\n══════════ 阶段3：权限隔离（双用户不同权限） ══════════')
  // 3.1 跨部门查看
  const qViewD1 = await api('GET', `/api/datas/${d1Id}`, null, qToken)
  log('quality查看DEPT-01公开数据 → 403', qViewD1.status === 403 ? 'PASS' : 'FAIL', `status=${qViewD1.status}`)
  const qList = await api('GET', '/api/datas?pageSize=100', null, qToken)
  const qSeesD1 = (qList.data?.data?.records || []).some((r) => r.id === d1Id)
  log('quality列表不可见DEPT-01数据', !qSeesD1 ? 'PASS' : 'FAIL')
  // 3.2 私密数据隔离
  const qViewD3 = await api('GET', `/api/datas/${d3Id}`, null, qToken)
  log('quality查看他人私密数据 → 403', qViewD3.status === 403 ? 'PASS' : 'FAIL', `status=${qViewD3.status}`)
  const admViewD3 = await api('GET', `/api/datas/${d3Id}`, null, deptAdminToken)
  log('部门管理员查看他人私密数据 → 403（仅创建者）', admViewD3.status === 403 ? 'PASS' : 'FAIL', `status=${admViewD3.status}`)
  const opViewD3 = await api('GET', `/api/datas/${d3Id}`, null, opToken)
  log('创建者查看自己私密数据 → 200', opViewD3.status === 200 ? 'PASS' : 'FAIL', `status=${opViewD3.status}`)
  // 3.3 编辑权限
  const opEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '最终E2E-创建者编辑' }, opToken)
  log('创建者编辑自己数据 → 200', opEdit.status === 200 ? 'PASS' : 'FAIL', `status=${opEdit.status}`)
  const qEditD1 = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '越权' }, qToken)
  log('跨部门用户编辑他人数据 → 403', qEditD1.status === 403 ? 'PASS' : 'FAIL', `status=${qEditD1.status}`)
  const deptAdmEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '最终E2E-部门管理员编辑' }, deptAdminToken)
  log('部门管理员编辑本部门数据 → 200', deptAdmEdit.status === 200 ? 'PASS' : 'FAIL', `status=${deptAdmEdit.status}`)
  // 3.4 私密设置仅创建者
  const qPatch = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, qToken)
  log('跨部门用户设置他人数据私密 → 403', qPatch.status === 403 ? 'PASS' : 'FAIL', `status=${qPatch.status}`)
  const deptAdmPatch = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, deptAdminToken)
  log('部门管理员设置他人数据私密 → 403（仅创建者）', deptAdmPatch.status === 403 ? 'PASS' : 'FAIL', `status=${deptAdmPatch.status}`)
  const opPatch = await api('PATCH', `/api/datas/${d2Id}`, { isPublic: false }, opToken)
  log('创建者设置自己数据私密 → 200', opPatch.status === 200 ? 'PASS' : 'FAIL', `status=${opPatch.status}`)
  await api('PATCH', `/api/datas/${d2Id}`, { isPublic: true }, opToken)
  // 3.5 删除权限
  const qDel = await api('DELETE', `/api/datas/${d1Id}`, null, qToken)
  log('跨部门用户删除他人数据 → 403', qDel.status === 403 ? 'PASS' : 'FAIL', `status=${qDel.status}`)
  // 3.6 部门管理员列表可见部门公开数据、不见他人私密
  const daList = await api('GET', '/api/datas?pageSize=100', null, deptAdminToken)
  const daRecords = daList.data?.data?.records || []
  log('部门管理员列表可见部门公开数据', daRecords.some((r) => r.id === d1Id) ? 'PASS' : 'FAIL')
  log('部门管理员列表不见他人私密数据', !daRecords.some((r) => r.id === d3Id) ? 'PASS' : 'FAIL')
  // 3.7 mine API
  const mineOp = await api('GET', '/api/datas/mine?pageSize=100', null, opToken)
  const mineRecs = mineOp.data?.data?.records || []
  log('「我创建的数据」含自己私密数据且仅本人创建',
    mineRecs.some((r) => r.id === d3Id) && mineRecs.every((r) => r.createdById === meOp.data?.data?.id) ? 'PASS' : 'FAIL',
    `total=${mineOp.data?.data?.pagination?.total}`)

  console.log('\n══════════ 阶段4：数据可视化 ══════════')
  // 4.1 计数分组（operator 视角：自己的3条）
  const g1 = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&limit=30`, null, opToken)
  const g1Items = g1.data?.data?.results || []
  const g1Line1 = g1Items.find((r) => r.name === '一号产线')
  log('可视化计数分组（FK字段显示名称）', g1.ok && g1Items.length === 2 && Number(g1Line1?.count) === 2 ? 'PASS' : 'FAIL',
    `groups=${g1Items.map((r) => `${r.name}:${r.count}`).join(',')}`)
  // 4.2 求和聚合（operator：1号=10+30=40, 2号=20）
  const agg1 = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&valueField=fe_number&aggFunc=sum&limit=30`, null, opToken)
  const a1 = agg1.data?.data?.results || []
  const a1L1 = Number(a1.find((r) => r.name === '一号产线')?.value)
  const a1L2 = Number(a1.find((r) => r.name === '二号产线')?.value)
  log('可视化求和聚合（1号=40, 2号=20）', a1L1 === 40 && a1L2 === 20 ? 'PASS' : 'FAIL', `1号=${a1L1}, 2号=${a1L2}`)
  const a1Total = Number(agg1.data?.data?.total)
  const a1Pct = Number(a1.find((r) => r.name === '一号产线')?.percentage)
  log('可视化聚合总计与占比（60 / 66.7%）', a1Total === 60 && Math.abs(a1Pct - 66.7) < 0.15 ? 'PASS' : 'FAIL',
    `total=${a1Total}, pct=${a1Pct}%`)
  // 4.3 平均聚合（1号=(10+30)/2=20）
  const aggAvg = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&valueField=fe_number&aggFunc=avg`, null, opToken)
  const avgL1 = Number((aggAvg.data?.data?.results || []).find((r) => r.name === '一号产线')?.value)
  log('可视化平均聚合（1号=20）', avgL1 === 20 ? 'PASS' : 'FAIL', `value=${avgL1}`)
  // 4.4 admin 视角聚合（superadmin 看全部：同60）
  const aggAdm = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&valueField=fe_number&aggFunc=sum`, null, superToken)
  const admL1 = Number((aggAdm.data?.data?.results || []).find((r) => r.name === '一号产线')?.value)
  log('可视化admin聚合（1号=40）', admL1 === 40 ? 'PASS' : 'FAIL', `value=${admL1}`)
  // 4.5 quality（无授权）统计 → 空
  const aggQ = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&valueField=fe_number&aggFunc=sum`, null, qToken)
  log('可视化无授权统计 → 空（隔离）', (aggQ.data?.data?.results || []).length === 0 ? 'PASS' : 'FAIL')
  // 4.6 日期分布模式（按 fe_date 分组：3条同日）
  const dg = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_date&mode=date_group&limit=30`, null, opToken)
  const dgItems = dg.data?.data?.results || []
  log('可视化日期分布（1个日期组，count=3）', dg.ok && dgItems.length === 1 && Number(dgItems[0]?.count) === 3 ? 'PASS' : 'FAIL',
    `groups=${JSON.stringify(dgItems.map((r) => ({ name: r.name, count: r.count })))}`)
  // 4.7 日期分布+聚合（sum=60）
  const dgAgg = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_date&valueField=fe_number&aggFunc=sum&mode=date_group&limit=30`, null, opToken)
  const dgAggVal = Number((dgAgg.data?.data?.results || [])[0]?.value)
  log('可视化日期分布+聚合（sum=60）', dgAggVal === 60 ? 'PASS' : 'FAIL', `value=${dgAggVal}`)
  // 4.8 select 字段分组计数
  const gSel = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_select&limit=30`, null, opToken)
  const selItems = gSel.data?.data?.results || []
  const selSevere = selItems.find((r) => r.name === '严重')
  log('可视化select字段分组（严重=1）', gSel.ok && Number(selSevere?.count) === 1 ? 'PASS' : 'FAIL',
    `groups=${selItems.map((r) => `${r.name}:${r.count}`).join(',')}`)

  console.log('\n══════════ 阶段5：模板访问授权链路 ══════════')
  const apply = await api('POST', '/api/templates/access/requests', { templateId: tplId, reason: '最终E2E授权测试' }, qToken)
  const reqId = apply.data?.data?.id
  log('quality发起模板访问申请', apply.ok ? 'PASS' : 'FAIL', `requestId=${reqId}`)
  const qApprove = await api('PUT', `/api/templates/access/requests/${reqId}`, { action: 'approve' }, qToken)
  log('普通用户审批 → 403', qApprove.status === 403 ? 'PASS' : 'FAIL', `status=${qApprove.status}`)
  const approve = await api('PUT', `/api/templates/access/requests/${reqId}`, { action: 'approve' }, deptAdminToken)
  log('模板所属部门管理员批准', approve.ok ? 'PASS' : 'FAIL', `status=${approve.status}`)
  const qViewAfter = await api('GET', `/api/datas/${d1Id}`, null, qToken)
  log('授权后可见该模板公开数据 → 200', qViewAfter.status === 200 ? 'PASS' : 'FAIL', `status=${qViewAfter.status}`)
  const qViewPrivAfter = await api('GET', `/api/datas/${d3Id}`, null, qToken)
  log('授权后仍不可见他人私密数据 → 403', qViewPrivAfter.status === 403 ? 'PASS' : 'FAIL', `status=${qViewPrivAfter.status}`)
  // 授权后可视化联动（公开：1号=10, 2号=20，不含私密30）
  const aggQAfter = await api('GET', `/api/stats/custom?templateId=${tplId}&groupBy=fe_prodline&valueField=fe_number&aggFunc=sum`, null, qToken)
  const qL1 = Number((aggQAfter.data?.data?.results || []).find((r) => r.name === '一号产线')?.value)
  log('授权后可视化聚合（1号=10，不含私密30）', qL1 === 10 ? 'PASS' : 'FAIL', `value=${qL1}`)
  // 撤销
  const managed = await api('GET', '/api/templates/access?scope=managed', null, deptAdminToken)
  const accItem = (managed.data?.data || []).find((a) => a.templateId === tplId)
  const revoke = await api('DELETE', `/api/templates/access/${accItem.id}`, null, deptAdminToken)
  log('管理员撤销授权', revoke.ok ? 'PASS' : 'FAIL', `status=${revoke.status}`)
  const qViewRevoke = await api('GET', `/api/datas/${d1Id}`, null, qToken)
  log('撤销后立即不可见 → 403', qViewRevoke.status === 403 ? 'PASS' : 'FAIL', `status=${qViewRevoke.status}`)

  console.log('\n══════════ 阶段6：导出与数据管理 ══════════')
  const exp = await fetch(`${BASE}/api/datas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({ templateId: tplId })
  })
  const isXlsx = (exp.headers.get('content-type') || '').includes('openxmlformats')
  log('导出自己数据（含私密）→ 200 xlsx', exp.status === 200 && isXlsx ? 'PASS' : 'FAIL',
    `status=${exp.status}, type=${(exp.headers.get('content-type') || '').slice(0, 40)}`)
  // 数据列表 + 模板筛选 + 关键字（d1 内容在阶段3被部门管理员编辑为'最终E2E-部门管理员编辑'）
  const listFiltered = await api('GET', `/api/datas?templateId=${tplId}&keyword=${encodeURIComponent('部门管理员编辑')}&pageSize=50`, null, opToken)
  const filteredCount = (listFiltered.data?.data?.records || []).length
  log('数据列表：模板筛选+关键字过滤生效', listFiltered.ok && filteredCount === 1 ? 'PASS' : 'FAIL', `count=${filteredCount}`)

  console.log('\n══════════ 清理 ══════════')
  let delData = 0
  for (const id of cleanup.dataIds) {
    const r = await api('DELETE', `/api/datas/${id}`, null, superToken)
    if (r.ok) delData++
  }
  let delTpl = 0
  for (const tid of cleanup.templateIds) {
    const r = await api('DELETE', `/api/templates/${tid}`, null, superToken)
    if (r.ok) delTpl++
  }
  log('清理测试数据', delData === cleanup.dataIds.length && delTpl === cleanup.templateIds.length ? 'PASS' : 'FAIL',
    `data=${delData}/${cleanup.dataIds.length}, tpl=${delTpl}/${cleanup.templateIds.length}`)

  console.log('='.repeat(60))
  console.log(`  最终完整E2E: ${passCount} 通过, ${failCount} 失败`)
  if (failures.length) {
    console.log('  失败项:')
    for (const f of failures) console.log(`   - ${f.test}: ${f.detail}`)
  }
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
