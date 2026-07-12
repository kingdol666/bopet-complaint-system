// Test: verify deptadmin imported data is visible to same-department normal users
async function main() {
  const BASE = 'http://localhost:3001'

  // Login as deptadmin
  const deptAdminLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'deptadmin', password: 'deptadmin123' })
  }).then(r => r.json())
  const deptAdminToken = deptAdminLogin.data.token
  console.log('deptAdmin departments:', deptAdminLogin.data.user.departments)

  // deptadmin creates data WITHOUT responsibleDeptId (simulating old import behavior)
  const createResp = await fetch(BASE + '/api/datas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + deptAdminToken },
    body: JSON.stringify({
      feedbackDate: '2025-07-12',
      feedbackContent: 'deptadmin创建的无部门数据',
      isPublic: true,
      templateIds: []
    })
  }).then(r => r.json())
  console.log('deptadmin creates data without dept:', createResp.success, 'id:', createResp.data?.id, 'deptId:', createResp.data?.responsibleDeptId)

  // deptadmin creates data WITH responsibleDeptId
  const create2Resp = await fetch(BASE + '/api/datas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + deptAdminToken },
    body: JSON.stringify({
      feedbackDate: '2025-07-12',
      feedbackContent: 'deptadmin创建的生产部数据',
      isPublic: true,
      responsibleDeptId: 1,
      templateIds: []
    })
  }).then(r => r.json())
  console.log('deptadmin creates data with dept=1:', create2Resp.success, 'id:', create2Resp.data?.id)

  // Login as operator (normal user, dept=1)
  const opLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'operator123' })
  }).then(r => r.json())
  const opToken = opLogin.data.token

  // Operator views data list
  const listResp = await fetch(BASE + '/api/datas?page=1&pageSize=100', {
    headers: { Authorization: 'Bearer ' + opToken }
  }).then(r => r.json())
  console.log('\nOperator visible records:', listResp.data.pagination.total)
  for (const r of listResp.data.records) {
    console.log(`  id=${r.id} deptId=${r.responsibleDeptId} isPublic=${r.isPublic} createdById=${r.createdById} content=${r.feedbackContent?.substring(0, 30)}`)
  }

  // Check if operator can see the no-dept data
  const noDeptVisible = listResp.data.records.some(r => r.feedbackContent === 'deptadmin创建的无部门数据')
  console.log('\nOperator can see deptadmin no-dept data:', noDeptVisible ? 'YES' : 'NO')

  // Check if operator can see the dept=1 data
  const dept1Visible = listResp.data.records.some(r => r.feedbackContent === 'deptadmin创建的生产部数据')
  console.log('Operator can see deptadmin dept=1 data:', dept1Visible ? 'YES' : 'NO')

  // Check if operator can view detail of no-dept data
  if (createResp.data?.id) {
    const detailResp = await fetch(BASE + '/api/datas/' + createResp.data.id, {
      headers: { Authorization: 'Bearer ' + opToken }
    })
    console.log('Operator view no-dept data detail:', detailResp.status === 200 ? 'OK' : 'FAIL (' + detailResp.status + ')')
  }

  // Check if operator can get attachments for no-dept data
  if (createResp.data?.id) {
    const imgResp = await fetch(BASE + '/api/images/' + createResp.data.id, {
      headers: { Authorization: 'Bearer ' + opToken }
    })
    console.log('Operator get attachments for no-dept data:', imgResp.status === 200 ? 'OK' : 'FAIL (' + imgResp.status + ')')
  }

  // Cleanup
  if (createResp.data?.id) {
    await fetch(BASE + '/api/datas/' + createResp.data.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + deptAdminToken } })
  }
  if (create2Resp.data?.id) {
    await fetch(BASE + '/api/datas/' + create2Resp.data.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + deptAdminToken } })
  }
  console.log('\nCleanup done')
}

main().catch(e => console.error(e))
