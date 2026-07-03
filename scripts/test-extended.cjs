/**
 * Extended test: Export, Autocomplete, Departments, Health, User CRUD, Upload endpoints
 */
const http = require('http')

const PORT = 3001
let adminToken = null
let testResults = { pass: 0, fail: 0, errors: [] }

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const req = http.request({ hostname: 'localhost', port: PORT, path, method, headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }) }
        catch { resolve({ status: res.statusCode, data, headers: res.headers }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function assert(cond, msg) {
  if (cond) { testResults.pass++; console.log(`  PASS ${msg}`) }
  else { testResults.fail++; testResults.errors.push(msg); console.log(`  FAIL ${msg}`) }
}

async function test(name, fn) {
  console.log(`\n--- ${name} ---`)
  try { await fn() } catch (e) {
    testResults.fail++; testResults.errors.push(`${name}: ${e.message}`)
    console.log(`  ERROR ${e.message}`)
  }
}

async function run() {
  console.log('='.repeat(60))
  console.log('Extended Test: Export, Autocomplete, Departments, Health, Users CRUD')
  console.log('='.repeat(60))

  // Login
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  adminToken = login.data.data.token

  // ─── 1. Health ───
  await test('Health Check', async () => {
    const resp = await request('GET', '/api/health', null, null)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    console.log(`  INFO health: ${JSON.stringify(resp.data).substring(0, 100)}`)
  })

  // ─── 2. Export ───
  await test('Data Export (CSV)', async () => {
    const resp = await request('GET', '/api/datas/export?format=csv', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    // Export might return CSV text or JSON
    if (typeof resp.data === 'string') {
      const lines = resp.data.split('\n')
      console.log(`  INFO CSV export: ${lines.length} lines, first line: ${lines[0]?.substring(0, 80)}`)
      assert(lines.length > 0, 'should have content')
    } else if (resp.data?.success) {
      console.log(`  INFO export response: ${JSON.stringify(resp.data).substring(0, 100)}`)
    }
  })

  await test('Data Export (with filters)', async () => {
    const resp = await request('GET', '/api/datas/export?format=csv&startDate=2025-01-01&endDate=2026-12-31', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    console.log(`  INFO export with filters OK`)
  })

  // ─── 3. Autocomplete ───
  await test('Autocomplete - Data', async () => {
    const resp = await request('GET', '/api/datas/autocomplete-data?field=category&keyword=', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    if (resp.data.success !== undefined) {
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO autocomplete results: ${resp.data.data?.length || 0}`)
    } else {
      console.log(`  INFO autocomplete response: ${JSON.stringify(resp.data).substring(0, 100)}`)
    }
  })

  // ─── 4. Departments ───
  await test('Departments - List', async () => {
    const resp = await request('GET', '/api/departments', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO departments: ${resp.data.data?.length || 0}`)
  })

  let newDeptId = null
  await test('Departments - Create', async () => {
    const resp = await request('POST', '/api/departments', {
      name: 'API测试部门',
      code: 'TD' + Date.now().toString().slice(-6),
      sortOrder: 99
    }, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      newDeptId = resp.data.data.id
      console.log(`  INFO created department ID: ${newDeptId}`)
    }
  })

  if (newDeptId) {
    await test('Departments - Update', async () => {
      const resp = await request('PUT', `/api/departments/${newDeptId}`, {
        name: 'API测试部门(已更新)'
      }, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Departments - Delete', async () => {
      const resp = await request('DELETE', `/api/departments/${newDeptId}`, null, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  // ─── 5. User CRUD ───
  let newUserId = null
  await test('Users - Create', async () => {
    const resp = await request('POST', '/api/users', {
      username: 'testuser_crud_' + Date.now(),
      password: 'Test123456',
      name: 'CRUD测试用户',
      role: 'normal',
      enabled: true
    }, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      newUserId = resp.data.data.id
      console.log(`  INFO created user ID: ${newUserId}`)
    }
  })

  if (newUserId) {
    await test('Users - Update', async () => {
      const resp = await request('PUT', `/api/users/${newUserId}`, {
        name: 'CRUD测试用户(已更新)',
        role: 'admin'
      }, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Users - Delete', async () => {
      const resp = await request('DELETE', `/api/users/${newUserId}`, null, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  // ─── 6. Template from file ───
  await test('Template - Create from file (no file)', async () => {
    // Test without file - should return error but not crash
    const resp = await request('POST', '/api/templates/create-from-file', {}, adminToken)
    assert(resp.status >= 400, `should return error without file (got ${resp.status})`)
    console.log(`  INFO correctly rejects empty request`)
  })

  // ─── 7. Config field options ───
  await test('Config - Field Options detail', async () => {
    const resp = await request('GET', '/api/config/field-options', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    if (resp.data.success !== undefined) {
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO field options: ${JSON.stringify(resp.data.data).substring(0, 150)}`)
    }
  })

  // ─── 8. Data detail with template data ───
  await test('Data - Detail includes template data', async () => {
    const listResp = await request('GET', '/api/datas?page=1&pageSize=1', null, adminToken)
    if (listResp.data.data?.records?.length > 0) {
      const recordId = listResp.data.data.records[0].id
      const resp = await request('GET', `/api/datas/${recordId}`, null, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      const record = resp.data.data
      console.log(`  INFO record: ${record.dataNo}, templateIds=${record.templateIds}, hasTemplateData=${!!record.templateData}`)
    }
  })

  // ─── Summary ───
  console.log('\n' + '='.repeat(60))
  console.log('EXTENDED TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log(`  PASS: ${testResults.pass}`)
  console.log(`  FAIL: ${testResults.fail}`)
  if (testResults.errors.length > 0) {
    console.log('\nFailed items:')
    testResults.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }
  console.log('='.repeat(60))
  process.exit(testResults.fail > 0 ? 1 : 0)
}

run().catch(e => { console.error('Test error:', e); process.exit(1) })
