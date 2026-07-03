/**
 * Deep test: CRUD operations, template creation, edge cases, permission filtering
 */
const http = require('http')

const PORT = 3001
let adminToken = null
let deptadminToken = null
let testResults = { pass: 0, fail: 0, errors: [] }

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const req = http.request({
      hostname: 'localhost', port: PORT, path, method, headers
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data }) }
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
  console.log('Deep Test: CRUD, Templates, Edge Cases, Permissions')
  console.log('='.repeat(60))

  // Login as admin and deptadmin
  const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  adminToken = adminLogin.data.data.token
  const deptLogin = await request('POST', '/api/auth/login', { username: 'deptadmin', password: 'deptadmin123' })
  deptadminToken = deptLogin.data.data?.token || null
  console.log(`Admin login: ${adminToken ? 'OK' : 'FAIL'}`)
  console.log(`DeptAdmin login: ${deptadminToken ? 'OK' : 'FAIL'}`)

  // ─── 1. Template CRUD ───
  let newTemplateId = null
  await test('Template - Create with complex fields', async () => {
    const resp = await request('POST', '/api/templates', {
      name: 'API测试模板-完整字段',
      description: '测试用模板，包含多种字段类型',
      isDefault: false,
      fields: [
        { fieldKey: 'complaintDate', fieldLabel: '客诉日期', fieldType: 'date', required: true, sortOrder: 1 },
        { fieldKey: 'customerName', fieldLabel: '客户名称', fieldType: 'select-config', configType: 'customers', required: true, sortOrder: 2 },
        { fieldKey: 'productModel', fieldLabel: '产品型号', fieldType: 'select-config', configType: 'productModels', required: true, sortOrder: 3 },
        { fieldKey: 'defectCount', fieldLabel: '缺陷数量', fieldType: 'number', required: false, sortOrder: 4 },
        { fieldKey: 'defectType', fieldLabel: '缺陷类型', fieldType: 'select', options: JSON.stringify(['划痕','气泡','杂质','变形','色差','其他']), required: true, sortOrder: 5 },
        { fieldKey: 'description', fieldLabel: '问题描述', fieldType: 'text', required: true, sortOrder: 6 },
        { fieldKey: 'responsibleDept', fieldLabel: '责任部门', fieldType: 'select-config', configType: 'responsibleDepartments', required: false, sortOrder: 7 },
        { fieldKey: 'severity', fieldLabel: '严重程度', fieldType: 'select', options: JSON.stringify(['轻微','一般','严重','致命']), required: true, sortOrder: 8 }
      ]
    }, adminToken)
    assert(resp.status === 200, `create returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      newTemplateId = resp.data.data.id
      console.log(`  INFO created template ID: ${newTemplateId}`)
    }
  })

  if (newTemplateId) {
    await test('Template - Verify created template', async () => {
      const resp = await request('GET', `/api/templates/${newTemplateId}`, null, adminToken)
      assert(resp.status === 200, `get returns 200 (got ${resp.status})`)
      assert(resp.data.data?.fields?.length === 8, `should have 8 fields (got ${resp.data.data?.fields?.length})`)
      const dateField = resp.data.data.fields.find(f => f.fieldKey === 'complaintDate')
      assert(dateField?.fieldType === 'date', 'complaintDate should be date type')
      const selectField = resp.data.data.fields.find(f => f.fieldKey === 'defectType')
      assert(selectField?.fieldType === 'select', 'defectType should be select type')
      console.log(`  INFO template verified: ${resp.data.data.name}, ${resp.data.data.fields.length} fields`)
    })

    await test('Template - Filter fields for new template', async () => {
      const resp = await request('GET', `/api/templates/${newTemplateId}/filter-fields`, null, adminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      const fields = resp.data.data || []
      const hasDate = fields.some(f => f.fieldType === 'date')
      const hasNumber = fields.some(f => f.fieldType === 'number')
      const hasSelect = fields.some(f => f.fieldType === 'select')
      assert(hasDate, 'should include date fields')
      assert(hasNumber, 'should include number fields')
      assert(hasSelect, 'should include select fields')
      console.log(`  INFO filter fields: ${fields.length} fields`)
    })

    await test('Template - Delete', async () => {
      const resp = await request('DELETE', `/api/templates/${newTemplateId}`, null, adminToken)
      assert(resp.status === 200, `delete returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  // ─── 2. Data Record CRUD ───
  let newRecordId = null
  await test('Data - Create new record', async () => {
    const resp = await request('POST', '/api/datas', {
      dataNo: 'TEST-API-' + Date.now(),
      feedbackDate: '2026-06-15',
      customerId: 1,
      productModelId: 1,
      category: '外观缺陷',
      feedbackContent: 'API测试创建的记录',
      closureStatus: 'pending',
      thickness: '15um',
      rollNo: 'R001',
      specification: '1000mm',
      templateIds: [1],
      templateData: { complaintDate: '2026-06-15', defectType: '划痕', severity: '一般' }
    }, adminToken)
    assert(resp.status === 200, `create returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      newRecordId = resp.data.data.id
      console.log(`  INFO created record ID: ${newRecordId}`)
    }
  })

  if (newRecordId) {
    await test('Data - Get by ID', async () => {
      const resp = await request('GET', `/api/datas/${newRecordId}`, null, adminToken)
      assert(resp.status === 200, `get returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      assert(resp.data.data?.feedbackContent === 'API测试创建的记录', 'content should match')
      console.log(`  INFO record retrieved: ${resp.data.data?.dataNo}`)
    })

    await test('Data - Update record', async () => {
      const resp = await request('PUT', `/api/datas/${newRecordId}`, {
        feedbackContent: 'API测试-已更新',
        closureStatus: 'processing',
        rootCauseAnalysis: '测试根因分析'
      }, adminToken)
      assert(resp.status === 200, `update returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Data - Verify update', async () => {
      const resp = await request('GET', `/api/datas/${newRecordId}`, null, adminToken)
      assert(resp.data.data?.feedbackContent === 'API测试-已更新', 'content should be updated')
      assert(resp.data.data?.closureStatus === 'processing', 'status should be processing')
      console.log(`  INFO update verified: ${resp.data.data?.feedbackContent}, status=${resp.data.data?.closureStatus}`)
    })

    await test('Data - Close record', async () => {
      const resp = await request('PUT', `/api/datas/${newRecordId}`, {
        closureStatus: 'closed',
        reviewConclusion: '测试结论-已关闭'
      }, adminToken)
      assert(resp.status === 200, `close returns 200 (got ${resp.status})`)
    })

    await test('Data - Delete record', async () => {
      const resp = await request('DELETE', `/api/datas/${newRecordId}`, null, adminToken)
      assert(resp.status === 200, `delete returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  // ─── 3. Permission filtering ───
  await test('Permission - Admin sees all data', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=1', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    console.log(`  INFO admin sees: ${resp.data.data.pagination.total} records`)
  })

  if (deptadminToken) {
    await test('Permission - DeptAdmin sees filtered data', async () => {
      const resp = await request('GET', '/api/datas?page=1&pageSize=1', null, deptadminToken)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      const adminResp = await request('GET', '/api/datas?page=1&pageSize=1', null, adminToken)
      const adminTotal = adminResp.data.data.pagination.total
      const deptTotal = resp.data.data.pagination.total
      console.log(`  INFO admin=${adminTotal}, deptadmin=${deptTotal}`)
      assert(deptTotal <= adminTotal, 'deptadmin should see <= admin records')
    })

    await test('Permission - DeptAdmin cannot access user management', async () => {
      const resp = await request('GET', '/api/users', null, deptadminToken)
      assert(resp.status === 403, `should be forbidden (got ${resp.status})`)
      console.log(`  INFO deptadmin correctly forbidden from user management`)
    })
  }

  await test('Permission - Unauthenticated request rejected', async () => {
    const resp = await request('GET', '/api/datas', null, null)
    assert(resp.status === 401, `should be unauthorized (got ${resp.status})`)
  })

  // ─── 4. Edge cases ───
  await test('Edge - Empty page request', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=1', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.data.records.length <= 1, 'should return at most 1 record')
  })

  await test('Edge - Large page number', async () => {
    const resp = await request('GET', '/api/datas?page=9999&pageSize=10', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.data.records.length === 0, 'should return empty array for large page')
  })

  await test('Edge - Invalid sort field', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=1&sortBy=invalidField', null, adminToken)
    assert(resp.status === 400, `should reject invalid sort field (got ${resp.status})`)
  })

  await test('Edge - Stats with non-existent template', async () => {
    const resp = await request('GET', '/api/stats/custom?groupBy=category&templateId=99999&limit=10', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO non-existent template: total=${resp.data.data.total}`)
  })

  // ─── 5. Detailed date_group verification ───
  await test('Date Group - Verify date distribution', async () => {
    const resp = await request('GET', '/api/stats/custom?groupBy=feedbackDate&mode=date_group&limit=200', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    const results = resp.data.data.results
    console.log(`  INFO date distribution:`)
    for (const r of results.slice(0, 10)) {
      console.log(`    ${r.name}: ${r.count} (${r.percentage}%)`)
    }
    if (results.length > 10) console.log(`    ... and ${results.length - 10} more`)
    // Verify dates are in YYYY-MM-DD format
    const validDates = results.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.name))
    assert(validDates.length === results.length, `all dates should be YYYY-MM-DD format (got ${validDates.length}/${results.length})`)
  })

  await test('Date Group - Verify with date range filter', async () => {
    const resp = await request('GET', '/api/stats/custom?groupBy=feedbackDate&mode=date_group&startDate=2025-01-01&endDate=2025-12-31&limit=200', null, adminToken)
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    const results = resp.data.data.results
    // All dates should be in 2025
    const all2025 = results.every(r => r.name.startsWith('2025-'))
    assert(all2025, 'all dates should be in 2025 when filtered')
    console.log(`  INFO 2025 dates: ${results.length}, total=${resp.data.data.total}`)
  })

  // ─── 6. Template field types test ───
  await test('Template - Create with FK config fields', async () => {
    const resp = await request('POST', '/api/templates', {
      name: 'API测试模板-FK字段',
      description: '测试外键配置字段',
      isDefault: false,
      fields: [
        { fieldKey: 'fkCustomer', fieldLabel: 'FK客户', fieldType: 'select-config', configType: 'customers', required: true, sortOrder: 1 },
        { fieldKey: 'fkProduct', fieldLabel: 'FK产品', fieldType: 'select-config', configType: 'productModels', required: true, sortOrder: 2 },
        { fieldKey: 'fkDept', fieldLabel: 'FK部门', fieldType: 'select-config', configType: 'responsibleDepartments', required: false, sortOrder: 3 }
      ]
    }, adminToken)
    assert(resp.status === 200, `create returns 200 (got ${resp.status})`)
    if (resp.data.data?.id) {
      // Verify filter fields include FK fields
      const ffResp = await request('GET', `/api/templates/${resp.data.data.id}/filter-fields`, null, adminToken)
      const fkFields = (ffResp.data.data || []).filter(f => f.configType)
      assert(fkFields.length === 3, `should have 3 FK fields (got ${fkFields.length})`)
      console.log(`  INFO FK fields: ${fkFields.map(f => f.fieldLabel).join(', ')}`)
      // Clean up
      await request('DELETE', `/api/templates/${resp.data.data.id}`, null, adminToken)
    }
  })

  // ─── Summary ───
  console.log('\n' + '='.repeat(60))
  console.log('DEEP TEST RESULTS SUMMARY')
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
