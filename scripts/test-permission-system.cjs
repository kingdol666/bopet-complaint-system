/**
 * 权限系统完善链路验证
 *
 * 需求1：数据编辑权限（创建者本人 + 管理员本部门 + superadmin），
 *        私密设置仅创建者可操作，"我创建的数据" API（/api/datas/mine）
 * 需求2：模板级访问授权（申请 → 部门管理员审批 → 撤销），数据可见性联动
 *
 * 部门映射（seed）：operator→DEPT-01(生产部)，quality→DEPT-02(质量部)，
 *                   deptadmin→DEPT-01+02，admin=superadmin
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
  // ═══════════ 登录 ═══════════
  const superToken = await login('admin', 'admin123')
  const adminToken = await login('deptadmin', 'deptadmin123') // DEPT-01+02 管理员
  const operatorToken = await login('operator', 'operator123') // DEPT-01 普通用户
  const qualityToken = await login('quality', 'quality123')    // DEPT-02 普通用户
  log('四个测试用户登录（superadmin/管理员×1/普通×2）',
    superToken && adminToken && operatorToken && qualityToken ? 'PASS' : 'FAIL')
  if (!superToken || !adminToken || !operatorToken || !qualityToken) process.exit(1)

  // ═══════════ 预清理：上次失败运行残留的数据/模板 ═══════════
  for (const tk of [superToken, operatorToken, adminToken, qualityToken]) {
    const mineNoKw = await api('GET', '/api/datas/mine?pageSize=100', null, tk)
    for (const r of (mineNoKw.data?.data?.records || [])) {
      if ((r.feedbackContent || '').includes('权限测试')) await api('DELETE', `/api/datas/${r.id}`, null, superToken)
    }
  }
  const allTpl = await api('GET', '/api/templates?all=1', null, superToken)
  for (const t of (allTpl.data?.data || [])) {
    if ((t.name || '').startsWith('权限测试-')) await api('DELETE', `/api/templates/${t.id}`, null, superToken)
  }
  // 清理残留的测试用户（上次运行可能 FATAL 退出未清理）
  const userList = await api('GET', '/api/users?pageSize=100', null, superToken)
  for (const u of (userList.data?.data?.records || userList.data?.data || [])) {
    if ((u.username || '').startsWith('permtest_')) await api('DELETE', `/api/users/${u.id}`, null, superToken)
  }
  console.log('[预清理] 完成')

  // ═══════════ 准备：部门ID + DEPT-01 管理员 + 全局模板 ═══════════
  const meOp = await api('GET', '/api/auth/me', null, operatorToken)
  const dept01Id = meOp.data?.data?.departments?.[0]?.id
  const meQ = await api('GET', '/api/auth/me', null, qualityToken)
  const dept02Id = meQ.data?.data?.departments?.[0]?.id
  log('获取测试部门ID（operator→DEPT-01, quality→DEPT-02）',
    dept01Id && dept02Id && dept01Id !== dept02Id ? 'PASS' : 'FAIL', `DEPT-01=${dept01Id}, DEPT-02=${dept02Id}`)

  const createUser = await api('POST', '/api/users', {
    username: 'permtest_adm',
    password: 'permea123',
    name: '权限测试-生产部管理员',
    role: 'admin',
    departmentIds: [dept01Id]
  }, superToken)
  const dept01AdminToken = await login('permtest_adm', 'permea123').catch(() => null)
  if (createUser.data?.data?.id) cleanup.userIds.push(createUser.data.data.id)
  log('创建 DEPT-01 管理员用户', createUser.ok && dept01AdminToken ? 'PASS' : 'FAIL',
    `userId=${createUser.data?.data?.id}`)

  // 全局模板（数据创建必须关联模板）
  const gt = await api('POST', '/api/templates', {
    name: '权限测试-全局基础模板',
    enabled: true,
    fields: [{ fieldKey: 'perm_note', fieldLabel: '备注', fieldType: 'text', required: false, sortOrder: 0 }]
  }, superToken)
  const globalTplId = gt.data?.data?.id
  if (globalTplId) cleanup.templateIds.push(globalTplId)
  log('创建全局基础模板（数据录入用）', globalTplId ? 'PASS' : 'FAIL', `templateId=${globalTplId}`)
  if (!globalTplId) process.exit(1)

  // ═══════════ 需求1：数据编辑与私密权限 ═══════════
  console.log('\n──────── 需求1：数据编辑与私密权限 ────────')

  // operator 创建公开数据 D1（DEPT-01）
  const d1 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '权限测试-操作员创建',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [globalTplId],
    templateData: { perm_note: 'n1' },
    isPublic: true
  }, operatorToken)
  const d1Id = d1.data?.data?.id
  if (d1Id) cleanup.dataIds.push(d1Id)
  log('操作员创建公开数据（DEPT-01）', d1Id ? 'PASS' : 'FAIL', `id=${d1Id}, msg=${d1.data?.message}`)

  // 1.1 创建者编辑自己的数据
  const ownerEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '权限测试-创建者编辑' }, operatorToken)
  log('创建者编辑自己的数据 → 允许', ownerEdit.status === 200 ? 'PASS' : 'FAIL', `status=${ownerEdit.status}`)

  // 1.2 其他部门普通用户编辑 → 拒绝
  const crossEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '越权尝试' }, qualityToken)
  log('其他部门普通用户编辑他人数据 → 403', crossEdit.status === 403 ? 'PASS' : 'FAIL', `status=${crossEdit.status}`)

  // 1.3 其他部门管理员编辑 → 拒绝：先由 quality（DEPT-02）创建数据，DEPT-01 管理员去编辑
  const dq = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '权限测试-质检员创建',
    closureStatus: 'pending',
    responsibleDeptId: dept02Id,
    templateIds: [globalTplId],
    templateData: { perm_note: 'nq' },
    isPublic: true
  }, qualityToken)
  const dqId = dq.data?.data?.id
  if (dqId) cleanup.dataIds.push(dqId)
  const crossAdminEdit = await api('PUT', `/api/datas/${dqId}`, { feedbackContent: '越权尝试' }, dept01AdminToken)
  log('其他部门管理员编辑非本部门数据 → 403', crossAdminEdit.status === 403 ? 'PASS' : 'FAIL', `status=${crossAdminEdit.status}`)

  // 1.4 本部门管理员编辑 → 允许（DEPT-01 管理员编辑 operator 的数据）
  const deptAdminEdit = await api('PUT', `/api/datas/${d1Id}`, { feedbackContent: '权限测试-本部门管理员编辑' }, dept01AdminToken)
  log('本部门管理员编辑部门数据 → 允许', deptAdminEdit.status === 200 ? 'PASS' : 'FAIL', `status=${deptAdminEdit.status}`)

  // 1.5 其他部门普通用户设置他人数据私密 → 拒绝
  const qualityPrivatize = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, qualityToken)
  log('其他部门普通用户设置他人数据私密 → 403', qualityPrivatize.status === 403 ? 'PASS' : 'FAIL', `status=${qualityPrivatize.status}`)

  // 1.6 管理员设置他人数据私密 → 拒绝（仅创建者可设置）
  const adminPrivatize = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, dept01AdminToken)
  log('管理员设置他人数据私密 → 403（仅创建者可设置）', adminPrivatize.status === 403 ? 'PASS' : 'FAIL', `status=${adminPrivatize.status}`)

  // 1.7 创建者设置自己数据私密 → 允许
  const ownerPrivatize = await api('PATCH', `/api/datas/${d1Id}`, { isPublic: false }, operatorToken)
  log('创建者设置自己数据私密 → 允许', ownerPrivatize.status === 200 ? 'PASS' : 'FAIL', `status=${ownerPrivatize.status}`)

  // 1.8 私密数据仅创建者可见：本部门管理员查看 → 拒绝
  const adminViewPrivate = await api('GET', `/api/datas/${d1Id}`, null, dept01AdminToken)
  log('私密数据：本部门管理员查看 → 403（仅创建者可见）', adminViewPrivate.status === 403 ? 'PASS' : 'FAIL', `status=${adminViewPrivate.status}`)

  // 1.9 私密数据创建者可查看
  const ownerViewPrivate = await api('GET', `/api/datas/${d1Id}`, null, operatorToken)
  log('私密数据：创建者查看 → 允许', ownerViewPrivate.status === 200 ? 'PASS' : 'FAIL', `status=${ownerViewPrivate.status}`)

  // 1.10 我创建的数据 API：只返回自己创建的（含私密）
  const d2 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '权限测试-第二条',
    closureStatus: 'pending',
    responsibleDeptId: dept01Id,
    templateIds: [globalTplId],
    templateData: { perm_note: 'n2' },
    isPublic: true
  }, operatorToken)
  const d2Id = d2.data?.data?.id
  if (d2Id) cleanup.dataIds.push(d2Id)
  const mine = await api('GET', '/api/datas/mine?pageSize=100', null, operatorToken)
  const mineRecords = mine.data?.data?.records || []
  const opId = meOp.data?.data?.id
  const mineAllOwner = mineRecords.every((r) => r.createdById === opId)
  const mineHasD1 = mineRecords.some((r) => r.id === d1Id)
  log('「我创建的数据」API 返回且仅返回自己创建的数据（含私密）',
    mine.ok && mineAllOwner && mineHasD1 ? 'PASS' : 'FAIL',
    `total=${mine.data?.data?.pagination?.total}, 含D1=${mineHasD1}`)

  // mine 支持 visibility 过滤
  const minePrivate = await api('GET', '/api/datas/mine?visibility=private&pageSize=100', null, operatorToken)
  const privateRecords = minePrivate.data?.data?.records || []
  log('「我创建的数据」按可见性过滤（私密）',
    minePrivate.ok && privateRecords.some((r) => r.id === d1Id) && privateRecords.every((r) => !r.isPublic) ? 'PASS' : 'FAIL',
    `privateCount=${privateRecords.length}`)

  // ═══════════ 需求2：模板级访问授权 ═══════════
  console.log('\n──────── 需求2：模板级访问授权 ────────')

  // 准备：DEPT-02 非公开模板 T1（deptadmin 创建，其属 DEPT-02 管理员）+ 该模板下的公开数据 D3
  const t1 = await api('POST', '/api/templates', {
    name: '权限测试-质量部专用模板',
    description: '模板级访问授权测试',
    enabled: true,
    isPublic: false,
    departmentId: dept02Id,
    fields: [
      { fieldKey: 'perm_test_field', fieldLabel: '测试字段', fieldType: 'text', required: false, sortOrder: 0 }
    ]
  }, adminToken)
  const t1Id = t1.data?.data?.id
  if (t1Id) cleanup.templateIds.push(t1Id)
  log('创建 DEPT-02 非公开模板', t1Id ? 'PASS' : 'FAIL', `templateId=${t1Id}`)

  const d3 = await api('POST', '/api/datas', {
    feedbackDate: '2026-09-04',
    feedbackContent: '权限测试-质量部模板数据',
    closureStatus: 'pending',
    responsibleDeptId: dept02Id,
    templateIds: [t1Id],
    templateData: { perm_test_field: 'TV-001' },
    isPublic: true
  }, adminToken)
  const d3Id = d3.data?.data?.id
  if (d3Id) cleanup.dataIds.push(d3Id)
  log('DEPT-02 管理员用该模板录入公开数据', d3Id ? 'PASS' : 'FAIL', `id=${d3Id}`)

  // 2.1 默认模板列表不含非公开部门模板（operator 属 DEPT-01）
  const tplDefault = await api('GET', '/api/templates', null, operatorToken)
  const inDefault = (tplDefault.data?.data || []).some((t) => t.id === t1Id)
  log('默认模板列表不含非公开部门模板', !inDefault ? 'PASS' : 'FAIL')

  // 2.2 all=1 目录包含所有模板且带所属部门
  const tplAll = await api('GET', '/api/templates?all=1', null, operatorToken)
  const allItem = (tplAll.data?.data || []).find((t) => t.id === t1Id)
  log('模板目录(all=1)包含所有模板且带所属部门',
    tplAll.ok && !!allItem && allItem.department?.id === dept02Id ? 'PASS' : 'FAIL',
    `name=${allItem?.name}, dept=${allItem?.department?.name}`)

  // 2.3 未授权时按模板筛选看不到数据
  const beforeAccess = await api('GET', `/api/datas?templateId=${t1Id}&pageSize=50`, null, operatorToken)
  const beforeCount = (beforeAccess.data?.data?.records || []).length
  log('未授权时按模板筛选数据 → 不可见', beforeCount === 0 ? 'PASS' : 'FAIL', `count=${beforeCount}`)

  // 2.4 发起申请
  const apply = await api('POST', '/api/templates/access/requests', {
    templateId: t1Id,
    reason: '需要查看质量部检测数据'
  }, operatorToken)
  const requestId = apply.data?.data?.id
  log('向模板所属部门发起查看申请 → 成功', apply.ok ? 'PASS' : 'FAIL', `requestId=${requestId}, msg=${apply.data?.message}`)

  // 2.5 重复申请 → 拒绝
  const applyAgain = await api('POST', '/api/templates/access/requests', { templateId: t1Id }, operatorToken)
  log('重复申请 → 400', applyAgain.status === 400 ? 'PASS' : 'FAIL', `status=${applyAgain.status}, msg=${applyAgain.data?.message}`)

  // 2.6 无权审批的用户 → 拒绝（quality 为 DEPT-02 普通用户；operator 为 DEPT-01 用户）
  const qualityApprove = await api('PUT', `/api/templates/access/requests/${requestId}`, { action: 'approve' }, qualityToken)
  log('普通用户审批申请 → 403', qualityApprove.status === 403 ? 'PASS' : 'FAIL', `status=${qualityApprove.status}`)
  const operatorApprove = await api('PUT', `/api/templates/access/requests/${requestId}`, { action: 'approve' }, operatorToken)
  log('非模板所属部门管理员审批 → 403', operatorApprove.status === 403 ? 'PASS' : 'FAIL', `status=${operatorApprove.status}`)

  // 2.7 模板所属部门管理员（deptadmin 属 DEPT-02）批准
  const approve = await api('PUT', `/api/templates/access/requests/${requestId}`, { action: 'approve' }, adminToken)
  log('模板所属部门管理员批准申请 → 成功', approve.ok ? 'PASS' : 'FAIL', `status=${approve.status}, msg=${approve.data?.message}`)

  // 2.8 授权后按模板筛选可见
  const afterAccess = await api('GET', `/api/datas?templateId=${t1Id}&pageSize=50`, null, operatorToken)
  const afterRecords = afterAccess.data?.data?.records || []
  log('授权后按模板筛选数据 → 可见（公开数据）',
    afterRecords.some((r) => r.id === d3Id) ? 'PASS' : 'FAIL', `count=${afterRecords.length}`)

  // 2.9 授权后查看数据详情
  const viewDetail = await api('GET', `/api/datas/${d3Id}`, null, operatorToken)
  log('授权后查看数据详情 → 允许', viewDetail.status === 200 ? 'PASS' : 'FAIL', `status=${viewDetail.status}`)

  // 2.10 管理员查看授出的授权列表
  const managed = await api('GET', '/api/templates/access?scope=managed', null, adminToken)
  const managedItem = (managed.data?.data || []).find((a) => a.templateId === t1Id)
  log('管理员查看模板授权记录（managed）', managed.ok && !!managedItem ? 'PASS' : 'FAIL',
    `grantee=${managedItem?.user?.name}`)

  // 2.11 撤销授权
  const revoke = await api('DELETE', `/api/templates/access/${managedItem.id}`, null, adminToken)
  log('管理员撤销模板查看授权 → 成功', revoke.ok ? 'PASS' : 'FAIL', `status=${revoke.status}`)

  // 2.12 撤销后不可见
  const afterRevoke = await api('GET', `/api/datas?templateId=${t1Id}&pageSize=50`, null, operatorToken)
  const afterRevokeRecords = (afterRevoke.data?.data?.records || [])
  log('撤销后按模板筛选数据 → 不可见', afterRevokeRecords.length === 0 ? 'PASS' : 'FAIL', `count=${afterRevokeRecords.length}`)
  const viewDetail2 = await api('GET', `/api/datas/${d3Id}`, null, operatorToken)
  log('撤销后查看数据详情 → 403', viewDetail2.status === 403 ? 'PASS' : 'FAIL', `status=${viewDetail2.status}`)

  // 2.13 本部门成员申请本部门模板 → 已有权限无需申请（quality 属 DEPT-02）
  const selfApply = await api('POST', '/api/templates/access/requests', { templateId: t1Id }, qualityToken)
  log('本部门成员申请本部门模板 → 400（已有权限）', selfApply.status === 400 ? 'PASS' : 'FAIL', `status=${selfApply.status}, msg=${selfApply.data?.message}`)

  // 2.14 我发起的申请列表
  const outgoing = await api('GET', '/api/templates/access/requests?type=outgoing', null, operatorToken)
  const myReq = (outgoing.data?.data || []).find((r) => r.id === requestId)
  log('我发起的申请列表（状态为已批准）', outgoing.ok && myReq && myReq.status === 'approved' ? 'PASS' : 'FAIL', `status=${myReq?.status}`)

  // 2.15 再次申请并批准，验证撤销权限边界
  const apply2 = await api('POST', '/api/templates/access/requests', { templateId: t1Id }, operatorToken)
  const requestId2 = apply2.data?.data?.id
  await api('PUT', `/api/templates/access/requests/${requestId2}`, { action: 'approve' }, adminToken)
  const accList = await api('GET', '/api/templates/access?scope=mine', null, operatorToken)
  const myAcc = (accList.data?.data || []).find((a) => a.templateId === t1Id)
  const outsiderRevoke = await api('DELETE', `/api/templates/access/${myAcc.id}`, null, qualityToken)
  log('无关用户撤销他人授权 → 403', outsiderRevoke.status === 403 ? 'PASS' : 'FAIL', `status=${outsiderRevoke.status}`)
  // 被授权人本人可放弃授权
  const selfRevoke = await api('DELETE', `/api/templates/access/${myAcc.id}`, null, operatorToken)
  log('被授权人本人放弃授权 → 允许', selfRevoke.ok ? 'PASS' : 'FAIL', `status=${selfRevoke.status}`)

  // ═══════════ 清理 ═══════════
  console.log('\n──────── 清理测试数据 ────────')
  for (const id of cleanup.dataIds) {
    await api('DELETE', `/api/datas/${id}`, null, superToken)
  }
  for (const tid of cleanup.templateIds) {
    await api('DELETE', `/api/templates/${tid}`, null, superToken)
  }
  for (const uid of cleanup.userIds) {
    await api('DELETE', `/api/users/${uid}`, null, superToken)
  }
  log('清理测试数据（数据/模板/用户）', 'PASS', `data=${cleanup.dataIds.length}, tpl=${cleanup.templateIds.length}, user=${cleanup.userIds.length}`)

  console.log('='.repeat(60))
  console.log(`  权限系统完善链路: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
