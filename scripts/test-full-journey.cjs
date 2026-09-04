/**
 * 完整用户旅程真实场景测试
 *
 * 场景：admin 登录 → 创建多个用户（不同部门/角色）→ 创建模板 →
 *       各用户上传数据（公开/私密）→ 验证权限隔离 → 公开/私密 → 数据可视化
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
  console.log('══════════ 阶段0：admin 登录 ══════════')
  const adminToken = await login('admin', 'admin123')
  log('admin（超级管理员）登录', adminToken ? 'PASS' : 'FAIL')
  if (!adminToken) process.exit(1)

  console.log('\n══════════ 阶段1：admin 创建多个用户 ══════════')
  // 获取部门列表
  const depts = await api('GET', '/api/departments', null, adminToken)
  const deptList = depts.data?.data || []
  const prod = deptList.find((d) => d.name === '生产部')
  const qual = deptList.find((d) => d.name === '质量部')
  log('获取部门列表（生产部/质量部）', prod && qual ? 'PASS' : 'FAIL',
    `共${deptList.length}个部门, 生产部=${prod?.id}, 质量部=${qual?.id}`)

  // 创建4个测试用户：生产部操作员A/B、质量部操作员C、生产部管理员D
  const users = [
    { username: 'e2e_op_a', password: 'e2e12345', name: '旅程测试-操作员A', role: 'normal', dept: prod?.id },
    { username: 'e2e_op_b', password: 'e2e12345', name: '旅程测试-操作员B', role: 'normal', dept: prod?.id },
    { username: 'e2e_op_c', password: 'e2e12345', name: '旅程测试-操作员C', role: 'normal', dept: qual?.id },
    { username: 'e2e_adm_d', password: 'e2e12345', name: '旅程测试-管理员D', role: 'admin', dept: prod?.id }
  ]
  for (const u of users) {
    const r = await api('POST', '/api/users', {
      username: u.username, password: u.password, name: u.name,
      role: u.role, departmentIds: u.dept ? [u.dept] : []
    }, adminToken)
    if (r.data?.data?.id) cleanup.userIds.push(r.data.data.id)
    log(`创建用户 ${u.username}（${u.role}, 部门${u.dept}）`, r.ok && r.data?.data?.id ? 'PASS' : 'FAIL',
      `id=${r.data?.data?.id}, msg=${r.data?.message || (r.ok ? '成功' : JSON.stringify(r.data).slice(0, 80))}`)
  }

  const opAToken = await login('e2e_op_a', 'e2e12345')
  const opBToken = await login('e2e_op_b', 'e2e12345')
  const opCToken = await login('e2e_op_c', 'e2e12345')
  const admDToken = await login('e2e_adm_d', 'e2e12345')
  log('四个新用户全部可登录', opAToken && opBToken && opCToken && admDToken ? 'PASS' : 'FAIL')

  console.log('\n══════════ 阶段2：创建模板（admin + 各用户） ══════════')
  // admin 创建生产部模板
  const tplProd = await api('POST', '/api/templates', {
    name: '旅程测试-产线问题表单',
    description: '产线问题记录',
    enabled: true,
    isPublic: false,
    departmentId: prod?.id,
    fields: [
      { fieldKey: 'e2e_line', fieldLabel: '产线', fieldType: 'select', required: true, sortOrder: 0, options: '1号产线,2号产线,3号产线' },
      { fieldKey: 'e2e_qty', fieldLabel: '问题数量', fieldType: 'number', required: true, sortOrder: 1 },
      { fieldKey: 'e2e_note', fieldLabel: '备注', fieldType: 'text', required: false, sortOrder: 2 }
    ]
  }, adminToken)
  const tplProdId = tplProd.data?.data?.id
  if (tplProdId) cleanup.templateIds.push(tplProdId)
  log('admin 创建生产部模板（产线select+问题数量number）', tplProdId ? 'PASS' : 'FAIL', `templateId=${tplProdId}`)

  // admin 创建全局模板
  const tplGlobal = await api('POST', '/api/templates', {
    name: '旅程测试-通用记录表单',
    enabled: true,
    fields: [
      { fieldKey: 'e2e_item', fieldLabel: '项目', fieldType: 'text', required: true, sortOrder: 0 },
      { fieldKey: 'e2e_value', fieldLabel: '数值', fieldType: 'number', required: false, sortOrder: 1 }
    ]
  }, adminToken)
  const tplGlobalId = tplGlobal.data?.data?.id
  if (tplGlobalId) cleanup.templateIds.push(tplGlobalId)
  log('admin 创建全局模板', tplGlobalId ? 'PASS' : 'FAIL', `templateId=${tplGlobalId}`)

  // 操作员A 自己创建一个生产部模板（验证普通用户可创建模板——若不允许则跳过）
  const tplByOpA = await api('POST', '/api/templates', {
    name: '旅程测试-操作员A自建表单',
    enabled: true,
    departmentId: prod?.id,
    fields: [{ fieldKey: 'e2e_self', fieldLabel: '自建字段', fieldType: 'text', required: false, sortOrder: 0 }]
  }, opAToken)
  const tplByOpAId = tplByOpA.data?.data?.id
  if (tplByOpAId) cleanup.templateIds.push(tplByOpAId)
  log('普通用户创建模板 → 403（模板为管理资源，仅管理员可创建）', tplByOpA.status === 403 ? 'PASS' : 'FAIL', `status=${tplByOpA.status}`)

  // 各用户可见模板验证
  const tplOpC = await api('GET', '/api/templates', null, opCToken)
  const opCSeesProdTpl = (tplOpC.data?.data || []).some((t) => t.id === tplProdId)
  const opCSeesGlobal = (tplOpC.data?.data || []).some((t) => t.id === tplGlobalId)
  log('质量部用户可见全局模板、不可见生产部非公开模板',
    opCSeesGlobal && !opCSeesProdTpl ? 'PASS' : 'FAIL', `全局=${opCSeesGlobal}, 生产部模板=${opCSeesProdTpl}`)

  console.log('\n══════════ 阶段3：各用户上传数据（公开/私密） ══════════')
  // 操作员A：3条公开数据（产线问题数量：1号=15, 2号=20, 3号=30）
  const rowsA = [
    { line: '1号产线', qty: 15 }, { line: '2号产线', qty: 20 }, { line: '3号产线', qty: 30 }
  ]
  for (const [i, row] of rowsA.entries()) {
    const r = await api('POST', '/api/datas', {
      feedbackDate: '2026-09-04',
      feedbackContent: `旅程测试-操作员A数据${i + 1}`,
      closureStatus: 'pending',
      responsibleDeptId: prod?.id,
      templateIds: [tplProdId],
      templateData: { e2e_line: row.line, e2e_qty: row.qty, e2e_note: `第${i + 1}条` },
      isPublic: true
    }, opAToken)
    if (r.data?.data?.id) cleanup.dataIds.push(r.data.data.id)
    log(`操作员A上传公开数据（${row.line}=${row.qty}）`, r.data?.data?.id ? 'PASS' : 'FAIL', `id=${r.data?.data?.id}`)
  }

  // 操作员A：1条私密数据（1号产线=100）
  const privA = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '旅程测试-操作员A私密数据',
    closureStatus: 'pending',
    responsibleDeptId: prod?.id,
    templateIds: [tplProdId],
    templateData: { e2e_line: '1号产线', e2e_qty: 100, e2e_note: '私密' },
    isPublic: false
  }, opAToken)
  const privAId = privA.data?.data?.id
  if (privAId) cleanup.dataIds.push(privAId)
  log('操作员A上传私密数据（1号产线=100）', privAId ? 'PASS' : 'FAIL', `id=${privAId}`)

  // 操作员B：2条公开数据（1号=10, 2号=5）
  const rowsB = [{ line: '1号产线', qty: 10 }, { line: '2号产线', qty: 5 }]
  for (const [i, row] of rowsB.entries()) {
    const r = await api('POST', '/api/datas', {
      feedbackDate: '2026-09-04',
      feedbackContent: `旅程测试-操作员B数据${i + 1}`,
      closureStatus: 'pending',
      responsibleDeptId: prod?.id,
      templateIds: [tplProdId],
      templateData: { e2e_line: row.line, e2e_qty: row.qty },
      isPublic: true
    }, opBToken)
    if (r.data?.data?.id) cleanup.dataIds.push(r.data.data.id)
    log(`操作员B上传公开数据（${row.line}=${row.qty}）`, r.data?.data?.id ? 'PASS' : 'FAIL', `id=${r.data?.data?.id}`)
  }

  // 操作员C（质量部）：1条公开数据
  const rC = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '旅程测试-操作员C质量部数据',
    closureStatus: 'pending',
    responsibleDeptId: qual?.id,
    templateIds: [tplGlobalId],
    templateData: { e2e_item: '来料检验', e2e_value: 7 },
    isPublic: true
  }, opCToken)
  if (rC.data?.data?.id) cleanup.dataIds.push(rC.data.data.id)
  log('操作员C（质量部）上传公开数据', rC.data?.data?.id ? 'PASS' : 'FAIL', `id=${rC.data?.data?.id}`)

  console.log('\n══════════ 阶段4：权限隔离验证 ══════════')
  // 获取一条操作员A的公开数据 ID
  const listA = await api('GET', '/api/datas/mine?pageSize=10', null, opAToken)
  const pubAId = (listA.data?.data?.records || []).find((r) => r.isPublic && (r.feedbackContent || '').includes('操作员A数据'))?.id

  // 4.1 同部门操作员B 可见 A 的公开数据
  const bViewA = await api('GET', `/api/datas/${pubAId}`, null, opBToken)
  log('同部门用户查看他人公开数据 → 允许', bViewA.status === 200 ? 'PASS' : 'FAIL', `status=${bViewA.status}`)

  // 4.2 跨部门操作员C 不可见 A 的公开数据（非公开部门）
  const cViewA = await api('GET', `/api/datas/${pubAId}`, null, opCToken)
  log('跨部门用户查看他部门数据 → 403', cViewA.status === 403 ? 'PASS' : 'FAIL', `status=${cViewA.status}`)

  // 4.3 同部门操作员B 不可见 A 的私密数据
  const bViewPriv = await api('GET', `/api/datas/${privAId}`, null, opBToken)
  log('同部门用户查看他人私密数据 → 403', bViewPriv.status === 403 ? 'PASS' : 'FAIL', `status=${bViewPriv.status}`)

  // 4.4 同部门管理员D 可见 A 的公开数据 + 可编辑
  const dViewA = await api('GET', `/api/datas/${pubAId}`, null, admDToken)
  const dEditA = await api('PUT', `/api/datas/${pubAId}`, { feedbackContent: '旅程测试-管理员D编辑' }, admDToken)
  log('本部门管理员查看+编辑部门数据 → 允许', dViewA.status === 200 && dEditA.status === 200 ? 'PASS' : 'FAIL',
    `view=${dViewA.status}, edit=${dEditA.status}`)

  // 4.5 同部门管理员D 不可见 A 的私密数据
  const dViewPriv = await api('GET', `/api/datas/${privAId}`, null, admDToken)
  log('本部门管理员查看他人私密数据 → 403（私密仅创建者可见）', dViewPriv.status === 403 ? 'PASS' : 'FAIL', `status=${dViewPriv.status}`)

  // 4.6 操作员B 编辑 A 的数据 → 拒绝（普通用户只能编辑自己的）
  const bEditA = await api('PUT', `/api/datas/${pubAId}`, { feedbackContent: '越权' }, opBToken)
  log('同部门普通用户编辑他人数据 → 403', bEditA.status === 403 ? 'PASS' : 'FAIL', `status=${bEditA.status}`)

  // 4.7 操作员B 删除 A 的数据 → 拒绝
  const bDelA = await api('DELETE', `/api/datas/${pubAId}`, null, opBToken)
  log('同部门普通用户删除他人数据 → 403', bDelA.status === 403 ? 'PASS' : 'FAIL', `status=${bDelA.status}`)

  // 4.8 admin（superadmin）可见+可编辑所有数据（含私密）
  const adminViewPriv = await api('GET', `/api/datas/${privAId}`, null, adminToken)
  const adminEditPriv = await api('PUT', `/api/datas/${privAId}`, { feedbackContent: '旅程测试-admin编辑私密' }, adminToken)
  log('superadmin 查看+编辑私密数据 → 允许', adminViewPriv.status === 200 && adminEditPriv.status === 200 ? 'PASS' : 'FAIL',
    `view=${adminViewPriv.status}, edit=${adminEditPriv.status}`)

  // 4.9 数据列表可见性隔离：操作员C（质量部）看不到 A/B 的生产部数据
  const listC = await api('GET', '/api/datas?pageSize=100', null, opCToken)
  const cRecords = listC.data?.data?.records || []
  const cSeesProdData = cRecords.some((r) => (r.feedbackContent || '').includes('操作员A数据') || (r.feedbackContent || '').includes('操作员B数据'))
  log('跨部门数据列表隔离（质量部看不到生产部数据）', !cSeesProdData ? 'PASS' : 'FAIL', `count=${cRecords.length}`)

  // 4.10 管理员D 数据列表可见本部门所有公开数据（A + B 的）
  const listD = await api('GET', '/api/datas?pageSize=100', null, admDToken)
  const dRecords = listD.data?.data?.records || []
  const dSeesA = dRecords.some((r) => (r.feedbackContent || '').includes('操作员A数据'))
  const dSeesB = dRecords.some((r) => (r.feedbackContent || '').includes('操作员B数据'))
  const dSeesPriv = dRecords.some((r) => r.id === privAId)
  log('本部门管理员列表可见部门公开数据（A+B）、不见他人私密数据',
    dSeesA && dSeesB && !dSeesPriv ? 'PASS' : 'FAIL', `A=${dSeesA}, B=${dSeesB}, 私密=${dSeesPriv}`)

  console.log('\n══════════ 阶段5：公开/私密功能验证 ══════════')
  // 5.1 创建者把私密数据转公开
  const makePublic = await api('PATCH', `/api/datas/${privAId}`, { isPublic: true }, opAToken)
  log('创建者把私密数据设为公开 → 允许', makePublic.status === 200 ? 'PASS' : 'FAIL', `status=${makePublic.status}`)
  // 现在管理员D可见了
  const dViewNow = await api('GET', `/api/datas/${privAId}`, null, admDToken)
  log('转公开后本部门管理员可见', dViewNow.status === 200 ? 'PASS' : 'FAIL', `status=${dViewNow.status}`)

  // 5.2 管理员D 不能设置 A 的数据为私密（仅创建者）
  const dPrivatize = await api('PATCH', `/api/datas/${privAId}`, { isPublic: false }, admDToken)
  log('管理员设置他人数据私密 → 403（仅创建者可设置）', dPrivatize.status === 403 ? 'PASS' : 'FAIL', `status=${dPrivatize.status}`)

  // 5.3 操作员B 也不能设置
  const bPrivatize = await api('PATCH', `/api/datas/${privAId}`, { isPublic: false }, opBToken)
  log('其他普通用户设置他人数据私密 → 403', bPrivatize.status === 403 ? 'PASS' : 'FAIL', `status=${bPrivatize.status}`)

  // 5.4 创建者改回私密
  const makePrivate = await api('PATCH', `/api/datas/${privAId}`, { isPublic: false }, opAToken)
  log('创建者把数据改回私密 → 允许', makePrivate.status === 200 ? 'PASS' : 'FAIL', `status=${makePrivate.status}`)

  // 5.5 「我创建的数据」：A 可见自己的全部（含私密），B 只见自己的
  const mineA = await api('GET', '/api/datas/mine?pageSize=100', null, opAToken)
  const mineACount = mineA.data?.data?.pagination?.total
  const mineAHasPriv = (mineA.data?.data?.records || []).some((r) => r.id === privAId)
  log('「我创建的数据」含自己的私密数据', mineAHasPriv ? 'PASS' : 'FAIL', `total=${mineACount}`)
  const mineB = await api('GET', '/api/datas/mine?pageSize=100', null, opBToken)
  const meB = await api('GET', '/api/auth/me', null, opBToken)
  const mineBAll = (mineB.data?.data?.records || []).every((r) => r.createdById === meB.data?.data?.id)
  log('「我创建的数据」仅返回本人创建', mineBAll ? 'PASS' : 'FAIL')

  console.log('\n══════════ 阶段6：数据可视化验证 ══════════')
  // 6.1 计数分组（操作员A按产线分组——自己的数据）
  const groupA = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&limit=30`, null, opAToken)
  const gItems = groupA.data?.data?.results || []
  log('可视化：按产线分组统计（自己的数据）', groupA.ok && gItems.length > 0 ? 'PASS' : 'FAIL',
    `groups=${gItems.map((g) => `${g.name}:${g.count}`).join(',')}`)

  // 6.2 数值聚合：admin 对全部数据按产线求和
  // 公开数据：1号=15+10=25, 2号=20+5=25, 3号=30；私密1号=100 不属于公开，admin 可见全部
  const aggAdmin = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, adminToken)
  const aggItems = aggAdmin.data?.data?.results || []
  const l1 = aggItems.find((g) => g.name === '1号产线')
  const l2 = aggItems.find((g) => g.name === '2号产线')
  const l3 = aggItems.find((g) => g.name === '3号产线')
  const sumL1 = Number(l1?.value)
  const sumL2 = Number(l2?.value)
  const sumL3 = Number(l3?.value)
  log('可视化：admin聚合求和 1号产线=15+10+100=125', sumL1 === 125 ? 'PASS' : 'FAIL', `value=${sumL1}`)
  log('可视化：admin聚合求和 2号产线=20+5=25', sumL2 === 25 ? 'PASS' : 'FAIL', `value=${sumL2}`)
  log('可视化：admin聚合求和 3号产线=30', sumL3 === 30 ? 'PASS' : 'FAIL', `value=${sumL3}`)
  const totalAgg = Number(aggAdmin.data?.data?.total)
  log('可视化：聚合总计=180', totalAgg === 180 ? 'PASS' : 'FAIL', `total=${totalAgg}`)
  const pctL1 = Number(l1?.percentage)
  log('可视化：1号产线占比≈69.4%', Math.abs(pctL1 - 69.4) < 0.15 ? 'PASS' : 'FAIL', `percentage=${pctL1}%`)

  // 6.3 操作员A 的聚合（自己的数据：15+20+30+私密100，B 的不可见）
  const aggA = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, opAToken)
  const aL1 = Number((aggA.data?.data?.results || []).find((g) => g.name === '1号产线')?.value)
  log('可视化：操作员A聚合（自己15+100 + 同部门公开10 = 125，同部门公开互相可见）', aL1 === 125 ? 'PASS' : 'FAIL', `value=${aL1}`)

  // 6.4 操作员B 的聚合（自己的：1号=10, 2号=5）
  const aggB = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, opBToken)
  const bL1 = Number((aggB.data?.data?.results || []).find((g) => g.name === '1号产线')?.value)
  const bL2 = Number((aggB.data?.data?.results || []).find((g) => g.name === '2号产线')?.value)
  log('可视化：操作员B聚合（1号=10+A公开15=25, 2号=5+20=25，不含A私密100）', bL1 === 25 && bL2 === 25 ? 'PASS' : 'FAIL', `1号=${bL1}, 2号=${bL2}`)

  // 6.5 管理员D 的聚合（本部门所有公开：1号=25, 2号=25, 3号=30；不含A的私密）
  const aggD = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, admDToken)
  const dL1 = Number((aggD.data?.data?.results || []).find((g) => g.name === '1号产线')?.value)
  log('可视化：管理员D聚合部门公开数据（1号=25，不含私密100）', dL1 === 25 ? 'PASS' : 'FAIL', `value=${dL1}`)

  // 6.6 平均聚合
  const aggAvg = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=avg&limit=30`, null, adminToken)
  const avgL3 = Number((aggAvg.data?.data?.results || []).find((g) => g.name === '3号产线')?.value)
  log('可视化：平均聚合（3号=30/1=30）', avgL3 === 30 ? 'PASS' : 'FAIL', `value=${avgL3}`)

  // 6.7 过滤条件 + 聚合叠加
  const aggFiltered = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&filters=${encodeURIComponent(JSON.stringify([{ field: 'e2e_line', operator: 'in', values: ['1号产线'] }]))}`, null, adminToken)
  const fL1 = Number((aggFiltered.data?.data?.results || []).find((g) => g.name === '1号产线')?.value)
  log('可视化：过滤+聚合叠加（仅1号=125）', fL1 === 125 ? 'PASS' : 'FAIL', `value=${fL1}`)

  // 6.8 质量部用户聚合生产部模板数据 → 无数据（隔离）
  const aggC = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, opCToken)
  const cAggCount = (aggC.data?.data?.results || []).length
  log('可视化：跨部门用户聚合生产部数据 → 空（隔离）', cAggCount === 0 ? 'PASS' : 'FAIL', `groups=${cAggCount}`)

  console.log('\n══════════ 阶段7：模板级访问授权联动 ══════════')
  // 7.1 C 申请生产部模板
  const apply = await api('POST', '/api/templates/access/requests', { templateId: tplProdId, reason: '需要查看产线问题数据' }, opCToken)
  const reqId = apply.data?.data?.id
  log('质量部用户申请生产部模板 → 成功', apply.ok ? 'PASS' : 'FAIL', `requestId=${reqId}`)

  // 7.2 admin 审批（superadmin 可审批任何）
  const approve = await api('PUT', `/api/templates/access/requests/${reqId}`, { action: 'approve' }, adminToken)
  log('admin 批准申请 → 成功', approve.ok ? 'PASS' : 'FAIL', `status=${approve.status}`)

  // 7.3 C 现在能看到该模板下生产部的公开数据
  const cViewAfter = await api('GET', `/api/datas?templateId=${tplProdId}&pageSize=50`, null, opCToken)
  const cAfterCount = (cViewAfter.data?.data?.records || []).filter((r) => r.isPublic).length
  log('授权后可见该模板下的公开数据（不含私密）', cAfterCount > 0 ? 'PASS' : 'FAIL', `count=${cAfterCount}`)
  const cStillNoPriv = !(cViewAfter.data?.data?.records || []).some((r) => r.id === privAId)
  log('授权后仍不可见他人私密数据', cStillNoPriv ? 'PASS' : 'FAIL')

  // 7.4 C 现在可以对该模板做可视化
  const aggCAfter = await api('GET', `/api/stats/custom?templateId=${tplProdId}&groupBy=e2e_line&valueField=e2e_qty&aggFunc=sum&limit=30`, null, opCToken)
  const cAggL1 = Number((aggCAfter.data?.data?.results || []).find((g) => g.name === '1号产线')?.value)
  log('授权后可视化聚合生效（1号公开=25，不含私密100）', cAggL1 === 25 ? 'PASS' : 'FAIL', `value=${cAggL1}`)

  // 7.5 admin 撤销授权
  const managed = await api('GET', '/api/templates/access?scope=managed', null, adminToken)
  const accItem = (managed.data?.data || []).find((a) => a.templateId === tplProdId)
  const revoke = await api('DELETE', `/api/templates/access/${accItem.id}`, null, adminToken)
  log('admin 撤销授权 → 成功', revoke.ok ? 'PASS' : 'FAIL', `status=${revoke.status}`)
  const cViewRevoke = await api('GET', `/api/datas?templateId=${tplProdId}&pageSize=50`, null, opCToken)
  log('撤销后不可见', (cViewRevoke.data?.data?.records || []).length === 0 ? 'PASS' : 'FAIL')

  console.log('\n══════════ 清理 ══════════')
  let delOk = 0
  for (const id of cleanup.dataIds) {
    const r = await api('DELETE', `/api/datas/${id}`, null, adminToken)
    if (r.ok) delOk++
  }
  for (const tid of cleanup.templateIds) {
    await api('DELETE', `/api/templates/${tid}`, null, adminToken)
  }
  for (const uid of cleanup.userIds) {
    await api('DELETE', `/api/users/${uid}`, null, adminToken)
  }
  log(`清理测试数据（data=${delOk}/${cleanup.dataIds.length}, tpl=${cleanup.templateIds.length}, user=${cleanup.userIds.length}）`,
    delOk === cleanup.dataIds.length ? 'PASS' : 'FAIL')

  console.log('='.repeat(60))
  console.log(`  完整用户旅程: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
