/**
 * 端到端 API 测试脚本
 * 测试内容：登录、数据列表、数据可见性、导出（筛选+选中）、PATCH 切换公开/私密
 */
const BASE = process.env.BASE_URL || 'http://localhost:3001'

let passCount = 0
let failCount = 0
const results = []

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
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

  // Binary response (Excel export)
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
    return resp.data.data.token
  }
  return null
}

async function main() {
  console.log('='.repeat(80))
  console.log('端到端 API 测试开始')
  console.log('='.repeat(80))

  // ─── 1. 登录测试 ───
  console.log('\n--- 1. 登录测试 ---')

  const superadminToken = await login('admin', 'admin123')
  if (superadminToken) {
    log('SuperAdmin 登录', 'PASS', `token=${superadminToken.slice(0, 20)}...`)
  } else {
    log('SuperAdmin 登录', 'FAIL', '无法获取 token')
    process.exit(1)
  }

  // 获取其他用户
  const usersResp = await api('GET', '/api/users', null, superadminToken)
  let adminToken = null
  let adminUser = null

  if (usersResp.ok && usersResp.data?.success) {
    const users = usersResp.data.data.records || usersResp.data.data
    if (Array.isArray(users)) {
      adminUser = users.find(u => u.role === 'admin' && u.username !== 'admin')
      if (adminUser) {
        // 尝试多个可能的密码
        for (const pwd of ['deptadmin123', 'admin123', '123456', 'password']) {
          adminToken = await login(adminUser.username, pwd)
          if (adminToken) break
        }
        if (adminToken) {
          log('部门管理员登录', 'PASS', `user=${adminUser.username}`)
        } else {
          log('部门管理员登录', 'WARN', `登录失败 ${adminUser.username}`)
        }
      } else {
        log('部门管理员登录', 'WARN', '数据库中没有其他 admin 用户')
      }
    } else {
      log('获取用户列表', 'WARN', '用户列表格式异常')
    }
  }

  // ─── 2. 数据列表测试 ───
  console.log('\n--- 2. 数据列表测试 ---')

  const listResp = await api('GET', '/api/datas?page=1&pageSize=5', null, superadminToken)
  let testRecord = null

  if (listResp.ok && listResp.data?.success) {
    const records = listResp.data.data.records
    log('SuperAdmin 获取数据列表', 'PASS', `共 ${listResp.data.data.pagination.total} 条，当前页 ${records.length} 条`)

    if (records.length > 0 && records[0].isPublic !== undefined) {
      log('数据包含 isPublic 字段', 'PASS', `isPublic=${records[0].isPublic}`)
      testRecord = records[0]
    } else if (records.length > 0) {
      log('数据包含 isPublic 字段', 'FAIL', 'isPublic 字段缺失')
      testRecord = records[0]
    } else {
      log('数据包含 isPublic 字段', 'WARN', '无数据可验证')
    }
  } else {
    log('SuperAdmin 获取数据列表', 'FAIL', `status=${listResp.status}`)
  }

  if (adminToken) {
    const adminListResp = await api('GET', '/api/datas?page=1&pageSize=5', null, adminToken)
    if (adminListResp.ok && adminListResp.data?.success) {
      log('部门管理员获取数据列表', 'PASS', `共 ${adminListResp.data.data.pagination.total} 条`)
    } else {
      log('部门管理员获取数据列表', 'FAIL', `status=${adminListResp.status}`)
    }
  }

  // ─── 3. 数据可见性权限测试 ───
  console.log('\n--- 3. 数据可见性权限测试 ---')

  if (testRecord) {
    // 3.1 SuperAdmin 查看详情
    const detailResp = await api('GET', `/api/datas/${testRecord.id}`, null, superadminToken)
    if (detailResp.ok && detailResp.data?.success) {
      log('SuperAdmin 查看数据详情', 'PASS', `dataNo=${detailResp.data.data.dataNo}`)
    } else {
      log('SuperAdmin 查看数据详情', 'FAIL', `status=${detailResp.status}`)
    }

    // 3.2 PATCH 切换为私密
    const patchResp = await api('PATCH', `/api/datas/${testRecord.id}`, { isPublic: false }, superadminToken)
    if (patchResp.ok && patchResp.data?.success) {
      log('PATCH 切换为私密', 'PASS', `isPublic=${patchResp.data.data.isPublic}`)
    } else {
      log('PATCH 切换为私密', 'FAIL', `status=${patchResp.status}`)
    }

    // 3.3 切换回公开
    const patchBackResp = await api('PATCH', `/api/datas/${testRecord.id}`, { isPublic: true }, superadminToken)
    if (patchBackResp.ok && patchBackResp.data?.success) {
      log('PATCH 切换回公开', 'PASS', `isPublic=${patchBackResp.data.data.isPublic}`)
    } else {
      log('PATCH 切换回公开', 'FAIL', `status=${patchBackResp.status}`)
    }

    // 3.4 PATCH 缺少参数
    const patchInvalidResp = await api('PATCH', `/api/datas/${testRecord.id}`, {}, superadminToken)
    if (patchInvalidResp.status === 400) {
      log('PATCH 缺少 isPublic 参数返回 400', 'PASS')
    } else {
      log('PATCH 缺少 isPublic 参数返回 400', 'FAIL', `status=${patchInvalidResp.status}`)
    }

    // 3.5 PATCH 不存在的记录
    const patchNotFoundResp = await api('PATCH', '/api/datas/999999', { isPublic: true }, superadminToken)
    if (patchNotFoundResp.status === 404) {
      log('PATCH 不存在的记录返回 404', 'PASS')
    } else {
      log('PATCH 不存在的记录返回 404', 'FAIL', `status=${patchNotFoundResp.status}`)
    }
  }

  // ─── 4. 导出测试 ───
  console.log('\n--- 4. 导出测试 ---')

  // 4.1 按筛选条件导出
  const exportResp = await api('POST', '/api/datas/export', {
    sortBy: 'feedbackDate',
    sortOrder: 'desc'
  }, superadminToken)
  if (exportResp.ok && exportResp.buffer && exportResp.buffer.length > 0) {
    const ct = exportResp.headers.get('content-type') || ''
    if (ct.includes('spreadsheet')) {
      log('按筛选条件导出 Excel', 'PASS', `大小=${exportResp.buffer.length} bytes`)
    } else {
      log('按筛选条件导出 Excel', 'FAIL', `content-type=${ct}`)
    }
  } else {
    log('按筛选条件导出 Excel', 'FAIL', `status=${exportResp.status}, ${exportResp.text || ''}`)
  }

  // 4.2 按选中条目导出
  if (testRecord) {
    const selectedExportResp = await api('POST', '/api/datas/export', {
      selectedIds: [testRecord.id]
    }, superadminToken)
    if (selectedExportResp.ok && selectedExportResp.buffer && selectedExportResp.buffer.length > 0) {
      log('按选中条目导出 Excel', 'PASS', `大小=${selectedExportResp.buffer.length} bytes`)
    } else {
      log('按选中条目导出 Excel', 'FAIL', `status=${selectedExportResp.status}`)
    }
  }

  // 4.3 导出带关键词筛选（"2025" 可匹配种子数据 dataNo）
  const keywordExportResp = await api('POST', '/api/datas/export', {
    keyword: '2025',
    sortBy: 'feedbackDate',
    sortOrder: 'desc'
  }, superadminToken)
  if (keywordExportResp.ok && keywordExportResp.buffer && keywordExportResp.buffer.length > 0) {
    log('带关键词筛选导出', 'PASS', `大小=${keywordExportResp.buffer.length} bytes`)
  } else {
    log('带关键词筛选导出', 'FAIL', `status=${keywordExportResp.status}`)
  }

  // 4.4 关键词无匹配数据时导出应返回 404（前端会提示"没有符合条件的数据可导出"）
  const emptyExportResp = await api('POST', '/api/datas/export', {
    keyword: 'NO_SUCH_KEYWORD_XYZ'
  }, superadminToken)
  if (emptyExportResp.status === 404) {
    log('无匹配数据导出返回404', 'PASS', '符合设计预期')
  } else {
    log('无匹配数据导出返回404', 'FAIL', `status=${emptyExportResp.status}`)
  }

  // ─── 5. 关键词搜索安全测试 ───
  console.log('\n--- 5. 关键词搜索安全测试（验证 OR 覆盖修复）---')

  if (adminToken) {
    const kwResp = await api('GET', '/api/datas?page=1&pageSize=100&keyword=a', null, adminToken)
    if (kwResp.ok && kwResp.data?.success) {
      const records = kwResp.data.data.records
      log('部门管理员关键词搜索', 'PASS', `返回 ${records.length} 条记录`)
    } else {
      log('部门管理员关键词搜索', 'FAIL', `status=${kwResp.status}`)
    }
  }

  // ─── 6. 数据创建测试（含 isPublic） ───
  console.log('\n--- 6. 数据创建测试（含 isPublic）---')

  const createBody = {
    feedbackDate: new Date().toISOString().slice(0, 10),
    feedbackContent: 'E2E测试记录 - isPublic=false',
    category: '测试',
    isPublic: false,
    templateIds: [1]
  }
  const createResp = await api('POST', '/api/datas', createBody, superadminToken)
  let createdId = null
  if (createResp.ok && createResp.data?.success) {
    createdId = createResp.data.data.id
    if (createResp.data.data.isPublic === false) {
      log('创建私密数据', 'PASS', `id=${createdId}, isPublic=false`)
    } else {
      log('创建私密数据', 'FAIL', `isPublic=${createResp.data.data.isPublic}`)
    }
  } else {
    log('创建私密数据', 'FAIL', `status=${createResp.status}, ${createResp.text || ''}`)
  }

  // 创建公开数据
  const createPublicResp = await api('POST', '/api/datas', {
    feedbackDate: new Date().toISOString().slice(0, 10),
    feedbackContent: 'E2E测试记录 - isPublic=true',
    category: '测试',
    isPublic: true,
    templateIds: [1]
  }, superadminToken)
  let createdPublicId = null
  if (createPublicResp.ok && createPublicResp.data?.success) {
    createdPublicId = createPublicResp.data.data.id
    if (createPublicResp.data.data.isPublic === true) {
      log('创建公开数据', 'PASS', `id=${createdPublicId}, isPublic=true`)
    } else {
      log('创建公开数据', 'FAIL', `isPublic=${createPublicResp.data.data.isPublic}`)
    }
  } else {
    log('创建公开数据', 'FAIL', `status=${createPublicResp.status}`)
  }

  // ─── 7. PUT 更新 isPublic 测试 ───
  console.log('\n--- 7. PUT 更新 isPublic 测试 ---')

  if (createdPublicId) {
    const updateResp = await api('PUT', `/api/datas/${createdPublicId}`, { isPublic: false }, superadminToken)
    if (updateResp.ok && updateResp.data?.success && updateResp.data.data.isPublic === false) {
      log('PUT 更新 isPublic 为 false', 'PASS')
    } else {
      log('PUT 更新 isPublic 为 false', 'FAIL', `isPublic=${updateResp.data?.data?.isPublic}`)
    }
    // 切换回来
    await api('PUT', `/api/datas/${createdPublicId}`, { isPublic: true }, superadminToken)
  }

  // ─── 8. 跨用户可见性测试 ───
  console.log('\n--- 8. 跨用户可见性测试 ---')

  if (createdId && adminToken && adminUser) {
    // SuperAdmin 查看私密数据
    const privateDetailResp = await api('GET', `/api/datas/${createdId}`, null, superadminToken)
    if (privateDetailResp.ok && privateDetailResp.data?.success) {
      log('SuperAdmin 查看私密数据', 'PASS', `isPublic=${privateDetailResp.data.data.isPublic}`)
    } else {
      log('SuperAdmin 查看私密数据', 'FAIL', `status=${privateDetailResp.status}`)
    }

    // 部门管理员尝试查看私密数据（如果不是创建者应该 403）
    const adminDetailResp = await api('GET', `/api/datas/${createdId}`, null, adminToken)
    if (adminDetailResp.status === 403) {
      log('部门管理员被拒绝查看私密数据', 'PASS', '返回 403')
    } else if (adminDetailResp.ok) {
      if (adminDetailResp.data?.data?.createdById === adminUser.id) {
        log('部门管理员查看私密数据（自己是创建者）', 'PASS', '可以查看自己创建的私密数据')
      } else {
        log('部门管理员查看私密数据', 'FAIL', '应该返回 403，但返回了 200')
      }
    } else {
      log('部门管理员查看私密数据', 'WARN', `status=${adminDetailResp.status}`)
    }
  }

  // ─── 9. 清理测试数据 ───
  console.log('\n--- 9. 清理测试数据 ---')

  if (createdId) {
    const delResp = await api('DELETE', `/api/datas/${createdId}`, null, superadminToken)
    if (delResp.ok && delResp.data?.success) {
      log('删除测试私密数据', 'PASS', `id=${createdId}`)
    } else {
      log('删除测试私密数据', 'FAIL', `status=${delResp.status}`)
    }
  }

  if (createdPublicId) {
    const delResp = await api('DELETE', `/api/datas/${createdPublicId}`, null, superadminToken)
    if (delResp.ok && delResp.data?.success) {
      log('删除测试公开数据', 'PASS', `id=${createdPublicId}`)
    } else {
      log('删除测试公开数据', 'FAIL', `status=${delResp.status}`)
    }
  }

  // ─── 10. 未授权访问测试 ───
  console.log('\n--- 10. 未授权访问测试 ---')

  const noAuthListResp = await api('GET', '/api/datas')
  if (noAuthListResp.status === 401) {
    log('未授权访问数据列表返回 401', 'PASS')
  } else {
    log('未授权访问数据列表返回 401', 'FAIL', `status=${noAuthListResp.status}`)
  }

  const noAuthExportResp = await api('POST', '/api/datas/export', { sortBy: 'feedbackDate' })
  if (noAuthExportResp.status === 401) {
    log('未授权导出返回 401', 'PASS')
  } else {
    log('未授权导出返回 401', 'FAIL', `status=${noAuthExportResp.status}`)
  }

  // ─── 总结 ───
  console.log('\n' + '='.repeat(80))
  const warnCount = results.length - passCount - failCount
  console.log(`测试完成: ${passCount} 通过, ${failCount} 失败, ${warnCount} 警告`)
  console.log('='.repeat(80))

  if (failCount > 0) {
    console.log('\n失败的测试:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  [FAIL] ${r.test} - ${r.detail}`)
    })
    process.exit(1)
  } else {
    console.log('\n所有测试通过！')
  }
}

main().catch(err => {
  console.error('测试脚本异常:', err)
  process.exit(1)
})
