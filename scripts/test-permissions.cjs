/**
 * 权限隔离系统全面端到端测试
 *
 * 测试矩阵：
 * ┌──────────┬───────────┬──────────────┬──────────────┬──────────────┐
 * │          │ superadmin │ deptAdmin    │ normalUser   │ otherDeptUser│
 * ├──────────┼───────────┼──────────────┼──────────────┼──────────────┤
 * │ 查看公开  │ ✅ 全部    │ ✅ 本部门     │ ✅ 本部门     │ ❌ 他部门    │
 * │ 查看私密  │ ✅ 全部    │ ✅ 自己创建   │ ✅ 自己创建   │ ❌ 他部门    │
 * │ 创建数据  │ ✅ 任意部门 │ ✅ 本部门     │ ✅ 本部门     │ ✅ 本部门     │
 * │ 修改自己  │ ✅         │ ✅            │ ✅            │ ✅            │
 * │ 修改他人  │ ✅         │ ✅ 本部门的   │ ❌            │ ❌            │
 * │ 删除自己  │ ✅         │ ✅            │ ✅            │ ✅            │
 * │ 删除他人  │ ✅         │ ✅ 本部门的   │ ❌            │ ❌            │
 * │ 切换公开  │ ✅ 全部    │ ✅ 本部门+自己│ ✅ 自己       │ ✅ 自己       │
 * │ 审批申请  │ ✅ 全部    │ ✅ 本部门     │ ❌            │ ❌            │
 * │ 跨部门申请│ ✅ N/A     │ ✅ 可申请     │ ✅ 可申请     │ ✅ 可申请     │
 * └──────────┴───────────┴──────────────┴──────────────┴──────────────┘
 */

const BASE = process.env.BASE_URL || 'http://localhost:3001'

let passCount = 0
let failCount = 0
const results = []

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '\u2705' : status === 'FAIL' ? '\u274c' : '\u26a0\ufe0f'
  console.log(`${icon} [${status}] ${test}${detail ? ' - ' + detail : ''}`)
  results.push({ test, status, detail })
  if (status === 'PASS') passCount++
  else if (status === 'FAIL') failCount++
}

async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { method, headers }
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    opts.body = JSON.stringify(body)
  }

  const resp = await fetch(`${BASE}${path}`, opts)
  const ct = resp.headers.get('content-type') || ''

  if (ct.includes('spreadsheet') || ct.includes('octet-stream')) {
    const buffer = Buffer.from(await resp.arrayBuffer())
    return { ok: resp.ok, status: resp.status, buffer, headers: resp.headers }
  }

  const text = await resp.text()
  let data = null
  try { data = JSON.parse(text) } catch {}

  return { ok: resp.ok, status: resp.status, data, text, headers: resp.headers }
}

async function login(username, password) {
  const resp = await api('POST', '/api/auth/login', { username, password })
  if (resp.ok && resp.data?.success && resp.data?.data?.token) {
    return { token: resp.data.data.token, user: resp.data.data.user }
  }
  return null
}

async function main() {
  console.log('='.repeat(80))
  console.log('  权限隔离系统全面端到端测试')
  console.log('  目标: 验证企业级权限隔离符合需求')
  console.log('='.repeat(80))

  // ─── 0. 登录所有测试用户 ───
  console.log('\n--- 0. 登录测试用户 ---')

  const admin = await login('admin', 'admin123')
  if (!admin) { console.log('FATAL: admin login failed'); process.exit(1) }
  log('SuperAdmin 登录', 'PASS', `user=${admin.user.username}`)

  const deptAdmin = await login('deptadmin', 'deptadmin123')
  if (!deptAdmin) { console.log('FATAL: deptadmin login failed'); process.exit(1) }
  log('部门管理员登录', 'PASS', `user=${deptAdmin.user.username}, depts=${deptAdmin.user.departments?.map(d => d.name).join(',')}`)

  const operator = await login('operator', 'operator123')
  if (!operator) { console.log('FATAL: operator login failed'); process.exit(1) }
  log('普通员工(operator)登录', 'PASS', `user=${operator.user.username}, depts=${operator.user.departments?.map(d => d.name).join(',')}`)

  const quality = await login('quality', 'quality123')
  if (!quality) { console.log('FATAL: quality login failed'); process.exit(1) }
  log('普通员工(quality)登录', 'PASS', `user=${quality.user.username}, depts=${quality.user.departments?.map(d => d.name).join(',')}`)

  // 获取部门信息
  const deptResp = await api('GET', '/api/departments', null, admin.token)
  const departments = deptResp.data?.data || []
  const dept01 = departments.find(d => d.code === 'DEPT-01') // 生产部
  const dept02 = departments.find(d => d.code === 'DEPT-02') // 质量部
  const dept03 = departments.find(d => d.code === 'DEPT-03') // 技术部

  console.log(`\n部门信息: 生产部=${dept01?.id}, 质量部=${dept02?.id}, 技术部=${dept03?.id}`)
  console.log(`operator 部门: ${operator.user.departments?.map(d => d.id).join(',')}`)
  console.log(`quality  部门: ${quality.user.departments?.map(d => d.id).join(',')}`)
  console.log(`deptAdmin 部门: ${deptAdmin.user.departments?.map(d => d.id).join(',')}`)

  // ─── 1. 数据可见性测试 ───
  console.log('\n--- 1. 数据可见性测试 ---')

  // 1.1 普通员工创建公开数据（本部门）
  const operatorCreateResp = await api('POST', '/api/datas', {
    feedbackDate: '2025-07-12',
    feedbackContent: 'operator创建的公开数据-生产部',
    category: '成品外观',
    isPublic: true,
    responsibleDeptId: dept01?.id,
    templateIds: []
  }, operator.token)

  let operatorRecordId = null
  if (operatorCreateResp.ok && operatorCreateResp.data?.success) {
    operatorRecordId = operatorCreateResp.data.data.id
    log('普通员工创建公开数据（本部门）', 'PASS', `id=${operatorRecordId}`)
  } else {
    log('普通员工创建公开数据（本部门）', 'FAIL', `status=${operatorCreateResp.status}, ${operatorCreateResp.text || ''}`)
  }

  // 1.2 普通员工创建私密数据
  const operatorPrivateResp = await api('POST', '/api/datas', {
    feedbackDate: '2025-07-12',
    feedbackContent: 'operator创建的私密数据',
    category: '成品外观',
    isPublic: false,
    responsibleDeptId: dept01?.id,
    templateIds: []
  }, operator.token)

  let operatorPrivateId = null
  if (operatorPrivateResp.ok && operatorPrivateResp.data?.success) {
    operatorPrivateId = operatorPrivateResp.data.data.id
    log('普通员工创建私密数据', 'PASS', `id=${operatorPrivateId}`)
  } else {
    log('普通员工创建私密数据', 'FAIL', `status=${operatorPrivateResp.status}`)
  }

  // 1.3 普通员工尝试为他部门创建数据
  const operatorOtherDeptResp = await api('POST', '/api/datas', {
    feedbackDate: '2025-07-12',
    feedbackContent: 'operator尝试为质量部创建数据',
    category: '成品外观',
    isPublic: true,
    responsibleDeptId: dept02?.id, // 质量部 - operator 不属于
    templateIds: []
  }, operator.token)

  if (operatorOtherDeptResp.status === 403) {
    log('普通员工不能为他部门创建数据', 'PASS', '返回403')
  } else {
    log('普通员工不能为他部门创建数据', 'FAIL', `status=${operatorOtherDeptResp.status}`)
  }

  // 1.4 quality（同部门）查看 operator 的公开数据
  if (operatorRecordId) {
    const qualityViewResp = await api('GET', `/api/datas/${operatorRecordId}`, null, quality.token)
    // quality 也在生产部？让我检查...
    // operator 在 DEPT-01（生产部），quality 在 DEPT-02（质量部）
    // 所以 quality 不应该看到 operator 的公开数据（不同部门）
    if (qualityViewResp.status === 403) {
      log('不同部门员工不能查看他部门公开数据', 'PASS', '返回403')
    } else if (qualityViewResp.ok) {
      log('不同部门员工不能查看他部门公开数据', 'FAIL', '应该返回403但返回了200')
    } else {
      log('不同部门员工不能查看他部门公开数据', 'WARN', `status=${qualityViewResp.status}`)
    }
  }

  // 1.5 deptAdmin（同部门管理员）查看 operator 的公开数据
  if (operatorRecordId) {
    // deptAdmin 在 DEPT-01 和 DEPT-02
    const adminViewResp = await api('GET', `/api/datas/${operatorRecordId}`, null, deptAdmin.token)
    if (adminViewResp.ok && adminViewResp.data?.success) {
      log('同部门管理员查看公开数据', 'PASS')
    } else {
      log('同部门管理员查看公开数据', 'FAIL', `status=${adminViewResp.status}`)
    }
  }

  // 1.6 普通员工查看自己的私密数据
  if (operatorPrivateId) {
    const ownerViewResp = await api('GET', `/api/datas/${operatorPrivateId}`, null, operator.token)
    if (ownerViewResp.ok && ownerViewResp.data?.success) {
      log('创建者查看自己的私密数据', 'PASS')
    } else {
      log('创建者查看自己的私密数据', 'FAIL', `status=${ownerViewResp.status}`)
    }
  }

  // 1.7 其他员工查看他人的私密数据
  if (operatorPrivateId) {
    const otherViewResp = await api('GET', `/api/datas/${operatorPrivateId}`, null, quality.token)
    if (otherViewResp.status === 403) {
      log('他人不能查看私密数据', 'PASS', '返回403')
    } else {
      log('他人不能查看私密数据', 'FAIL', `status=${otherViewResp.status}`)
    }
  }

  // 1.8 SuperAdmin 查看所有数据
  if (operatorPrivateId) {
    const superViewResp = await api('GET', `/api/datas/${operatorPrivateId}`, null, admin.token)
    if (superViewResp.ok && superViewResp.data?.success) {
      log('SuperAdmin 查看私密数据', 'PASS')
    } else {
      log('SuperAdmin 查看私密数据', 'FAIL', `status=${superViewResp.status}`)
    }
  }

  // ─── 2. 数据修改权限测试 ───
  console.log('\n--- 2. 数据修改权限测试 ---')

  // 2.1 普通员工修改自己的数据
  if (operatorRecordId) {
    const selfEditResp = await api('PUT', `/api/datas/${operatorRecordId}`, {
      feedbackContent: 'operator修改了自己的数据'
    }, operator.token)
    if (selfEditResp.ok && selfEditResp.data?.success) {
      log('普通员工修改自己的数据', 'PASS')
    } else {
      log('普通员工修改自己的数据', 'FAIL', `status=${selfEditResp.status}, ${selfEditResp.text || ''}`)
    }
  }

  // 2.2 普通员工修改他人的数据
  // 先让 quality 创建一条数据
  const qualityCreateResp = await api('POST', '/api/datas', {
    feedbackDate: '2025-07-12',
    feedbackContent: 'quality创建的数据',
    category: '成品外观',
    isPublic: true,
    responsibleDeptId: dept02?.id,
    templateIds: []
  }, quality.token)

  let qualityRecordId = null
  if (qualityCreateResp.ok && qualityCreateResp.data?.success) {
    qualityRecordId = qualityCreateResp.data.data.id
  }

  if (qualityRecordId) {
    const crossEditResp = await api('PUT', `/api/datas/${qualityRecordId}`, {
      feedbackContent: 'operator尝试修改quality的数据'
    }, operator.token)
    if (crossEditResp.status === 403) {
      log('普通员工不能修改他人的数据', 'PASS', '返回403')
    } else {
      log('普通员工不能修改他人的数据', 'FAIL', `status=${crossEditResp.status}`)
    }
  }

  // 2.3 部门管理员修改本部门数据
  if (operatorRecordId) {
    const adminEditResp = await api('PUT', `/api/datas/${operatorRecordId}`, {
      feedbackContent: 'deptAdmin修改了本部门数据'
    }, deptAdmin.token)
    // deptAdmin 在 DEPT-01，operator 的数据也在 DEPT-01
    if (adminEditResp.ok && adminEditResp.data?.success) {
      log('部门管理员修改本部门数据', 'PASS')
    } else {
      log('部门管理员修改本部门数据', 'FAIL', `status=${adminEditResp.status}, ${adminEditResp.text || ''}`)
    }
  }

  // 2.4 普通员工不能更改责任部门
  if (operatorRecordId) {
    const changeDeptResp = await api('PUT', `/api/datas/${operatorRecordId}`, {
      responsibleDeptId: dept02?.id
    }, operator.token)
    if (changeDeptResp.status === 403) {
      log('普通员工不能更改责任部门', 'PASS', '返回403')
    } else {
      log('普通员工不能更改责任部门', 'FAIL', `status=${changeDeptResp.status}`)
    }
  }

  // 2.5 SuperAdmin 修改任意数据
  if (qualityRecordId) {
    const superEditResp = await api('PUT', `/api/datas/${qualityRecordId}`, {
      feedbackContent: 'SuperAdmin修改了任意数据'
    }, admin.token)
    if (superEditResp.ok && superEditResp.data?.success) {
      log('SuperAdmin 修改任意数据', 'PASS')
    } else {
      log('SuperAdmin 修改任意数据', 'FAIL', `status=${superEditResp.status}`)
    }
  }

  // ─── 3. 数据删除权限测试 ───
  console.log('\n--- 3. 数据删除权限测试 ---')

  // 3.1 普通员工删除自己的数据
  const operatorDeleteResp = await api('POST', '/api/datas', {
    feedbackDate: '2025-07-12',
    feedbackContent: 'operator创建用于删除测试的数据',
    isPublic: true,
    responsibleDeptId: dept01?.id,
    templateIds: []
  }, operator.token)

  if (operatorDeleteResp.ok && operatorDeleteResp.data?.success) {
    const deleteId = operatorDeleteResp.data.data.id
    const selfDeleteResp = await api('DELETE', `/api/datas/${deleteId}`, null, operator.token)
    if (selfDeleteResp.ok && selfDeleteResp.data?.success) {
      log('普通员工删除自己的数据', 'PASS')
    } else {
      log('普通员工删除自己的数据', 'FAIL', `status=${selfDeleteResp.status}`)
    }
  }

  // 3.2 普通员工删除他人的数据
  if (qualityRecordId) {
    const crossDeleteResp = await api('DELETE', `/api/datas/${qualityRecordId}`, null, operator.token)
    if (crossDeleteResp.status === 403) {
      log('普通员工不能删除他人的数据', 'PASS', '返回403')
    } else {
      log('普通员工不能删除他人的数据', 'FAIL', `status=${crossDeleteResp.status}`)
    }
  }

  // ─── 4. 可见性切换权限测试 ───
  console.log('\n--- 4. 可见性切换（PATCH isPublic）权限测试 ---')

  // 4.1 普通员工切换自己数据的可见性
  if (operatorRecordId) {
    const toggleResp = await api('PATCH', `/api/datas/${operatorRecordId}`, { isPublic: false }, operator.token)
    if (toggleResp.ok && toggleResp.data?.success && toggleResp.data.data.isPublic === false) {
      log('普通员工切换自己数据的可见性', 'PASS', 'isPublic=false')
    } else {
      log('普通员工切换自己数据的可见性', 'FAIL', `status=${toggleResp.status}`)
    }
    // 切换回来
    await api('PATCH', `/api/datas/${operatorRecordId}`, { isPublic: true }, operator.token)
  }

  // 4.2 普通员工切换他人数据的可见性
  if (qualityRecordId) {
    const toggleOtherResp = await api('PATCH', `/api/datas/${qualityRecordId}`, { isPublic: false }, operator.token)
    if (toggleOtherResp.status === 403) {
      log('普通员工不能切换他人数据的可见性', 'PASS', '返回403')
    } else {
      log('普通员工不能切换他人数据的可见性', 'FAIL', `status=${toggleOtherResp.status}`)
    }
  }

  // ─── 5. 跨部门访问申请测试 ───
  console.log('\n--- 5. 跨部门访问申请流程测试 ---')

  // 5.1 普通员工申请访问他部门
  const requestResp = await api('POST', '/api/departments/access-requests', {
    departmentId: dept02?.id, // quality 部门
    reason: '需要查看质量部数据'
  }, operator.token)

  let requestId = null
  if (requestResp.ok && requestResp.data?.success) {
    requestId = requestResp.data.data.id
    log('普通员工申请跨部门访问', 'PASS', `requestId=${requestId}`)
  } else {
    log('普通员工申请跨部门访问', 'FAIL', `status=${requestResp.status}, ${requestResp.text || ''}`)
  }

  // 5.2 普通员工尝试审批请求
  if (requestId) {
    const approveAttemptResp = await api('PUT', `/api/departments/access-requests/${requestId}`, {
      action: 'approve'
    }, operator.token)
    if (approveAttemptResp.status === 403) {
      log('普通员工不能审批访问请求', 'PASS', '返回403')
    } else {
      log('普通员工不能审批访问请求', 'FAIL', `status=${approveAttemptResp.status}`)
    }
  }

  // 5.3 非目标部门管理员尝试审批
  if (requestId) {
    // quality 不在 DEPT-02 的管理员（quality 是 normal 角色）
    // 但 deptAdmin 同时在 DEPT-01 和 DEPT-02
    // 让我们用 quality（normal）尝试
    const wrongApproveResp = await api('PUT', `/api/departments/access-requests/${requestId}`, {
      action: 'approve'
    }, quality.token)
    if (wrongApproveResp.status === 403) {
      log('非管理员不能审批访问请求', 'PASS', '返回403')
    } else {
      log('非管理员不能审批访问请求', 'FAIL', `status=${wrongApproveResp.status}`)
    }
  }

  // 5.4 目标部门管理员审批
  if (requestId) {
    // deptAdmin 在 DEPT-02，可以审批
    const approveResp = await api('PUT', `/api/departments/access-requests/${requestId}`, {
      action: 'approve'
    }, deptAdmin.token)
    if (approveResp.ok && approveResp.data?.success) {
      log('目标部门管理员审批通过', 'PASS')
    } else {
      log('目标部门管理员审批通过', 'FAIL', `status=${approveResp.status}, ${approveResp.text || ''}`)
    }
  }

  // 5.5 验证授权后可以查看他部门公开数据
  if (qualityRecordId) {
    // operator 现在应该被授权访问 DEPT-02 的数据
    const accessViewResp = await api('GET', `/api/datas/${qualityRecordId}`, null, operator.token)
    if (accessViewResp.ok && accessViewResp.data?.success) {
      log('授权后可查看他部门公开数据', 'PASS')
    } else {
      log('授权后可查看他部门公开数据', 'FAIL', `status=${accessViewResp.status}, ${accessViewResp.text || ''}`)
    }
  }

  // 5.6 验证授权后仍不能修改他部门数据
  if (qualityRecordId) {
    const accessEditResp = await api('PUT', `/api/datas/${qualityRecordId}`, {
      feedbackContent: '授权后尝试修改'
    }, operator.token)
    if (accessEditResp.status === 403) {
      log('授权后仍不能修改他部门数据', 'PASS', '返回403')
    } else {
      log('授权后仍不能修改他部门数据', 'FAIL', `status=${accessEditResp.status}`)
    }
  }

  // ─── 6. 数据列表可见性测试 ───
  console.log('\n--- 6. 数据列表可见性测试 ---')

  // 6.1 operator 的数据列表应只包含可见的数据
  const operatorListResp = await api('GET', '/api/datas?page=1&pageSize=100', null, operator.token)
  if (operatorListResp.ok && operatorListResp.data?.success) {
    const records = operatorListResp.data.data.records
    const total = operatorListResp.data.data.pagination.total
    // 检查是否有不可见的数据
    const hasOtherDeptPrivate = records.some(r =>
      r.responsibleDeptId !== dept01?.id &&
      r.createdById !== operator.user.id &&
      !r.isPublic
    )
    if (!hasOtherDeptPrivate) {
      log('数据列表不包含不可见数据', 'PASS', `total=${total}`)
    } else {
      log('数据列表不包含不可见数据', 'FAIL', '发现了不应可见的数据')
    }
  } else {
    log('数据列表不包含不可见数据', 'FAIL', `status=${operatorListResp.status}`)
  }

  // 6.2 SuperAdmin 的数据列表应包含全部
  const adminListResp = await api('GET', '/api/datas?page=1&pageSize=100', null, admin.token)
  if (adminListResp.ok && adminListResp.data?.success) {
    log('SuperAdmin 数据列表', 'PASS', `total=${adminListResp.data.data.pagination.total}`)
  } else {
    log('SuperAdmin 数据列表', 'FAIL', `status=${adminListResp.status}`)
  }

  // ─── 7. 导出权限测试 ───
  console.log('\n--- 7. 导出权限测试 ---')

  // 7.1 普通员工导出（只能导出可见数据）
  const operatorExportResp = await api('POST', '/api/datas/export', {
    sortBy: 'feedbackDate',
    sortOrder: 'desc'
  }, operator.token)
  if (operatorExportResp.ok && operatorExportResp.buffer?.length > 0) {
    log('普通员工导出数据', 'PASS', `size=${operatorExportResp.buffer.length} bytes`)
  } else {
    log('普通员工导出数据', 'FAIL', `status=${operatorExportResp.status}`)
  }

  // 7.2 未授权访问导出
  const noAuthExportResp = await api('POST', '/api/datas/export', { sortBy: 'feedbackDate' })
  if (noAuthExportResp.status === 401) {
    log('未授权导出被拒绝', 'PASS', '返回401')
  } else {
    log('未授权导出被拒绝', 'FAIL', `status=${noAuthExportResp.status}`)
  }

  // ─── 8. 未授权访问测试 ───
  console.log('\n--- 8. 未授权访问测试 ---')

  const noAuthList = await api('GET', '/api/datas')
  if (noAuthList.status === 401) {
    log('未授权访问数据列表被拒绝', 'PASS')
  } else {
    log('未授权访问数据列表被拒绝', 'FAIL', `status=${noAuthList.status}`)
  }

  const noAuthCreate = await api('POST', '/api/datas', { feedbackDate: '2025-01-01' })
  if (noAuthCreate.status === 401) {
    log('未授权创建数据被拒绝', 'PASS')
  } else {
    log('未授权创建数据被拒绝', 'FAIL', `status=${noAuthCreate.status}`)
  }

  // ─── 9. 清理测试数据 ───
  console.log('\n--- 9. 清理测试数据 ---')

  if (operatorRecordId) {
    const delResp = await api('DELETE', `/api/datas/${operatorRecordId}`, null, admin.token)
    if (delResp.ok) log('清理 operator 公开数据', 'PASS')
    else log('清理 operator 公开数据', 'FAIL', `status=${delResp.status}`)
  }

  if (operatorPrivateId) {
    const delResp = await api('DELETE', `/api/datas/${operatorPrivateId}`, null, admin.token)
    if (delResp.ok) log('清理 operator 私密数据', 'PASS')
    else log('清理 operator 私密数据', 'FAIL', `status=${delResp.status}`)
  }

  if (qualityRecordId) {
    const delResp = await api('DELETE', `/api/datas/${qualityRecordId}`, null, admin.token)
    if (delResp.ok) log('清理 quality 数据', 'PASS')
    else log('清理 quality 数据', 'FAIL', `status=${delResp.status}`)
  }

  // 撤销跨部门授权
  const accessListResp = await api('GET', '/api/departments/access?scope=mine', null, operator.token)
  if (accessListResp.ok && accessListResp.data?.success) {
    for (const access of accessListResp.data.data) {
      await api('DELETE', `/api/departments/access/${access.id}`, null, operator.token)
    }
    log('清理跨部门授权', 'PASS')
  }

  // ─── 总结 ───
  console.log('\n' + '='.repeat(80))
  const warnCount = results.length - passCount - failCount
  console.log(`  测试完成: ${passCount} 通过, ${failCount} 失败, ${warnCount} 警告`)
  console.log('='.repeat(80))

  if (failCount > 0) {
    console.log('\n失败的测试:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  [FAIL] ${r.test} - ${r.detail}`)
    })
    process.exit(1)
  } else {
    console.log('\n  \u2705 所有权限隔离测试通过！系统符合企业级权限要求。')
  }
}

main().catch(err => {
  console.error('测试脚本异常:', err)
  process.exit(1)
})
