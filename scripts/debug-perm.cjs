// Debug script to investigate the two issues
async function main() {
  const BASE = 'http://localhost:3001'

  // 1. Login as admin
  const adminLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  }).then(r => r.json())
  const adminToken = adminLogin.data.token
  console.log('Admin login:', adminLogin.data.user.name, 'depts:', adminLogin.data.user.departments)

  // 2. Login as operator (normal user, dept 1)
  const opLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'operator123' })
  }).then(r => r.json())
  const opToken = opLogin.data.token
  console.log('Operator login:', opLogin.data.user.name, 'depts:', opLogin.data.user.departments)

  // 3. Admin creates a public record for dept 1 (生产部)
  const createResp = await fetch(BASE + '/api/datas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: JSON.stringify({
      feedbackDate: '2025-07-12',
      feedbackContent: 'Admin created data for 生产部',
      isPublic: true,
      responsibleDeptId: 1,
      templateIds: []
    })
  }).then(r => r.json())
  console.log('\nAdmin creates data for dept 1:', JSON.stringify(createResp.success), 'id:', createResp.data?.id)

  // 4. Operator tries to see it in list
  const listResp = await fetch(BASE + '/api/datas?page=1&pageSize=100', {
    headers: { Authorization: 'Bearer ' + opToken }
  }).then(r => r.json())
  console.log('\nOperator data list total:', listResp.data?.pagination?.total)
  const adminCreated = listResp.data?.records?.find(r => r.feedbackContent === 'Admin created data for 生产部')
  console.log('Operator can see admin-created data in list:', !!adminCreated)

  if (adminCreated) {
    // 5. Operator tries to view detail
    const detailResp = await fetch(BASE + '/api/datas/' + adminCreated.id, {
      headers: { Authorization: 'Bearer ' + opToken }
    })
    console.log('Operator view detail status:', detailResp.status)
    if (detailResp.status === 200) {
      const detail = await detailResp.json()
      console.log('Detail isPublic:', detail.data?.isPublic, 'responsibleDeptId:', detail.data?.responsibleDeptId, 'createdById:', detail.data?.createdById)
    }

    // 6. Operator tries to get attachments
    const imgResp = await fetch(BASE + '/api/images/' + adminCreated.id, {
      headers: { Authorization: 'Bearer ' + opToken }
    })
    console.log('Operator get attachments status:', imgResp.status)
    if (imgResp.status !== 200) {
      const errText = await imgResp.text()
      console.log('Attachment error:', errText)
    }
  }

  // 7. Check what data operator can see
  console.log('\nOperator visible records:')
  for (const r of (listResp.data?.records || [])) {
    console.log(`  id=${r.id} dataNo=${r.dataNo} deptId=${r.responsibleDeptId} isPublic=${r.isPublic} createdById=${r.createdById} content=${r.feedbackContent?.substring(0, 30)}`)
  }

  // 8. Check what admin can see
  const adminListResp = await fetch(BASE + '/api/datas?page=1&pageSize=100', {
    headers: { Authorization: 'Bearer ' + adminToken }
  }).then(r => r.json())
  console.log('\nAdmin visible records total:', adminListResp.data?.pagination?.total)
  for (const r of (adminListResp.data?.records || [])) {
    console.log(`  id=${r.id} dataNo=${r.dataNo} deptId=${r.responsibleDeptId} isPublic=${r.isPublic} createdById=${r.createdById} content=${r.feedbackContent?.substring(0, 30)}`)
  }

  // 9. Test attachment endpoint for seed data (id=1)
  console.log('\n--- Attachment test for seed data (id=1) ---')
  const img1Resp = await fetch(BASE + '/api/images/1', {
    headers: { Authorization: 'Bearer ' + opToken }
  })
  console.log('Operator get attachments for id=1 status:', img1Resp.status)
  if (img1Resp.status === 200) {
    const img1Data = await img1Resp.json()
    console.log('Attachments:', img1Data.data?.length, 'items')
  } else {
    const errText = await img1Resp.text()
    console.log('Error:', errText)
  }

  // 10. Test /oss/ route directly
  console.log('\n--- OSS route test ---')
  const ossResp = await fetch(BASE + '/oss/test.png')
  console.log('OSS /oss/test.png status:', ossResp.status)

  // Clean up
  if (adminCreated) {
    await fetch(BASE + '/api/datas/' + adminCreated.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken }
    })
    console.log('\nCleaned up test data')
  }
}

main().catch(e => console.error(e))
