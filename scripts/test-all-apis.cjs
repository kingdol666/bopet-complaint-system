/**
 * Comprehensive API test script - v2
 * Fixed: port, token extraction, config API paths, URI encoding
 */
const http = require('http')

const PORT = 3001
let token = null
let testResults = { pass: 0, fail: 0, errors: [] }

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: headers
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ status: res.statusCode, data: json, headers: res.headers })
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function assert(condition, message) {
  if (condition) {
    testResults.pass++
    console.log(`  PASS ${message}`)
  } else {
    testResults.fail++
    testResults.errors.push(message)
    console.log(`  FAIL ${message}`)
  }
}

async function test(name, fn) {
  console.log(`\n--- ${name} ---`)
  try {
    await fn()
  } catch (e) {
    testResults.fail++
    testResults.errors.push(`${name}: ${e.message}`)
    console.log(`  ERROR ${e.message}`)
  }
}

async function run() {
  console.log('='.repeat(60))
  console.log('Comprehensive API Test (port ' + PORT + ')')
  console.log('='.repeat(60))

  // ─── 1. Auth ───
  await test('Auth - Login', async () => {
    const resp = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
    assert(resp.status === 200, `login returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'login returns success=true')
    assert(!!resp.data.data?.token, 'response contains token')
    token = resp.data.data?.token || null
    console.log(`  INFO user: ${resp.data.data?.user?.name} (${resp.data.data?.user?.role})`)
  })

  await test('Auth - Me', async () => {
    const resp = await request('GET', '/api/auth/me')
    assert(resp.status === 200, `me returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'me returns success=true')
  })

  // ─── 2. Config API ───
  await test('Config - All', async () => {
    const resp = await request('GET', '/api/config')
    assert(resp.status === 200, `config returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'config returns success=true')
    const d = resp.data.data
    console.log(`  INFO customers=${d.customers?.length}, products=${d.productModels?.length}, depts=${d.responsibleDepartments?.length}, lines=${d.productionLines?.length}, processes=${d.responsibleProcesses?.length}`)
  })

  await test('Config - Field Options', async () => {
    const resp = await request('GET', '/api/config/field-options')
    assert(resp.status === 200, `field-options returns 200 (got ${resp.status})`)
  })

  // ─── 3. Template APIs ───
  let templateId = null
  await test('Templates - List', async () => {
    const resp = await request('GET', '/api/templates')
    assert(resp.status === 200, `templates list returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO template count: ${resp.data.data?.length || 0}`)
    if (resp.data.data?.length > 0) {
      templateId = resp.data.data[0].id
      console.log(`  INFO using template ID: ${templateId} (${resp.data.data[0].name})`)
    }
  })

  if (templateId) {
    await test('Templates - Get Detail', async () => {
      const resp = await request('GET', `/api/templates/${templateId}`)
      assert(resp.status === 200, `template detail returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO fields: ${resp.data.data?.fields?.length || 0}`)
    })

    await test('Templates - Filter Fields', async () => {
      const resp = await request('GET', `/api/templates/${templateId}/filter-fields`)
      assert(resp.status === 200, `filter-fields returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      const fields = resp.data.data || []
      const types = {}
      fields.forEach(f => { types[f.fieldType] = (types[f.fieldType] || 0) + 1 })
      console.log(`  INFO filter fields: ${fields.length}, types: ${JSON.stringify(types)}`)
    })
  }

  // ─── 4. Data APIs ───
  await test('Data - Basic Query', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=5')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    assert(Array.isArray(resp.data.data?.records), 'returns records array')
    assert(!!resp.data.data?.pagination, 'returns pagination')
    console.log(`  INFO total: ${resp.data.data.pagination.total}, page records: ${resp.data.data.records.length}`)
  })

  await test('Data - Keyword Search', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=5&keyword=' + encodeURIComponent('测试'))
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO keyword search total: ${resp.data.data.pagination.total}`)
  })

  await test('Data - Date Range Filter', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=5&startDate=2025-01-01&endDate=2026-12-31')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO date range filter total: ${resp.data.data.pagination.total}`)
  })

  await test('Data - Status Filter', async () => {
    const resp = await request('GET', '/api/datas?page=1&pageSize=5&closureStatus=closed')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO closed records: ${resp.data.data.pagination.total}`)
  })

  if (templateId) {
    await test('Data - Template Filter', async () => {
      const resp = await request('GET', `/api/datas?page=1&pageSize=5&templateId=${templateId}`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO template filter total: ${resp.data.data.pagination.total}`)
    })

    await test('Data - Dynamic Filters (JSON)', async () => {
      const filters = encodeURIComponent(JSON.stringify([{ field: 'category', operator: 'contains', value: '' }]))
      const resp = await request('GET', `/api/datas?page=1&pageSize=5&filters=${filters}`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO dynamic filter total: ${resp.data.data.pagination.total}`)
    })
  }

  // ─── 5. Stats APIs ───
  await test('Stats - Overview', async () => {
    const resp = await request('GET', '/api/stats/overview')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    assert(typeof resp.data.data?.total === 'number', 'returns total number')
    console.log(`  INFO total=${resp.data.data.total}, thisMonth=${resp.data.data.thisMonth}, pending=${resp.data.data.byStatus.pending}, closed=${resp.data.data.byStatus.closed}`)
  })

  await test('Stats - Trend (2026)', async () => {
    const resp = await request('GET', '/api/stats/trend?year=2026')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    assert(Array.isArray(resp.data.data?.monthly), 'returns monthly array')
    assert(resp.data.data.monthly.length === 12, 'returns 12 months')
    const totalRecords = resp.data.data.monthly.reduce((s, m) => s + m.total, 0)
    console.log(`  INFO 2026 total records: ${totalRecords}`)
  })

  await test('Stats - Trend (2025)', async () => {
    const resp = await request('GET', '/api/stats/trend?year=2025')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    const totalRecords = resp.data.data.monthly.reduce((s, m) => s + m.total, 0)
    console.log(`  INFO 2025 total records: ${totalRecords}`)
  })

  await test('Stats - By Category', async () => {
    const resp = await request('GET', '/api/stats/by-category')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO byCustomer=${resp.data.data.byCustomer?.length}, byProductModel=${resp.data.data.byProductModel?.length}, byDepartment=${resp.data.data.byDepartment?.length}`)
  })

  await test('Stats - By Category (with date range)', async () => {
    const resp = await request('GET', '/api/stats/by-category?startDate=2025-01-01&endDate=2026-12-31')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO date range filter OK`)
  })

  if (templateId) {
    // Get filter fields first
    const fieldsResp = await request('GET', `/api/templates/${templateId}/filter-fields`)
    const allFields = fieldsResp.data?.data || []
    const textFields = allFields.filter(f => f.fieldType === 'text' || f.fieldType === 'select' || f.fieldType === 'select-config')
    const numFields = allFields.filter(f => f.fieldType === 'number')
    const dateFields = allFields.filter(f => f.fieldType === 'date')

    await test('Stats - Custom (group mode, single field)', async () => {
      if (textFields.length === 0) { console.log('  SKIP no text fields'); return }
      const fieldKey = encodeURIComponent(textFields[0].fieldKey)
      const resp = await request('GET', `/api/stats/custom?groupBy=${fieldKey}&templateId=${templateId}&limit=10`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO field="${textFields[0].fieldLabel}", total=${resp.data.data.total}, groups=${resp.data.data.results?.length}`)
    })

    await test('Stats - Custom (group mode, multi field)', async () => {
      if (textFields.length < 2) { console.log('  SKIP not enough text fields'); return }
      const keys = encodeURIComponent(textFields.slice(0, 2).map(f => f.fieldKey).join(','))
      const resp = await request('GET', `/api/stats/custom?groupBy=${keys}&templateId=${templateId}&limit=10`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO multi-field groups: ${resp.data.data.results?.length}`)
    })

    await test('Stats - Custom (date_group mode, built-in)', async () => {
      const resp = await request('GET', `/api/stats/custom?groupBy=feedbackDate&templateId=${templateId}&mode=date_group&limit=10`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      assert(resp.data.data.mode === 'date_group', 'returns date_group mode')
      console.log(`  INFO date_group results: ${resp.data.data.results?.length} dates, total=${resp.data.data.total}`)
      if (resp.data.data.results?.length > 0) {
        console.log(`  INFO sample: ${resp.data.data.results[0].name} = ${resp.data.data.results[0].count}`)
      }
    })

    await test('Stats - Custom (trend mode)', async () => {
      if (numFields.length === 0) { console.log('  SKIP no number fields'); return }
      const fieldKey = encodeURIComponent(numFields[0].fieldKey)
      const resp = await request('GET', `/api/stats/custom?groupBy=${fieldKey}&templateId=${templateId}&mode=trend&limit=10`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      if (resp.data.data.mode === 'trend') {
        console.log(`  INFO trend: count=${resp.data.data.stats?.count}, avg=${resp.data.data.stats?.avg}, min=${resp.data.data.stats?.min}, max=${resp.data.data.stats?.max}`)
      } else {
        console.log(`  INFO mode: ${resp.data.data.mode}, total: ${resp.data.data.total}`)
      }
    })

    await test('Stats - Custom (with date range)', async () => {
      if (textFields.length === 0) { console.log('  SKIP no text fields'); return }
      const fieldKey = encodeURIComponent(textFields[0].fieldKey)
      const resp = await request('GET', `/api/stats/custom?groupBy=${fieldKey}&templateId=${templateId}&startDate=2025-01-01&endDate=2026-12-31&limit=10`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
      console.log(`  INFO date range filter total: ${resp.data.data.total}`)
    })

    // Test custom date field date_group if available
    if (dateFields.length > 0) {
      await test('Stats - Custom (date_group mode, custom date field)', async () => {
        const fieldKey = encodeURIComponent(dateFields[0].fieldKey)
        const resp = await request('GET', `/api/stats/custom?groupBy=${fieldKey}&templateId=${templateId}&mode=date_group&limit=10`)
        assert(resp.status === 200, `returns 200 (got ${resp.status})`)
        assert(resp.data.success === true, 'returns success=true')
        console.log(`  INFO custom date field "${dateFields[0].fieldLabel}": ${resp.data.data.results?.length} dates, total=${resp.data.data.total}`)
      })
    }
  }

  // ─── 6. Analysis & Dashboard APIs ───
  let analysisId = null
  await test('Analysis - Create', async () => {
    const resp = await request('POST', '/api/analyses', {
      name: 'API Test Analysis',
      config: { templateId, groupByField: ['category'], chartType: 'bar', limit: 30 }
    })
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      analysisId = resp.data.data.id
      console.log(`  INFO created analysis ID: ${analysisId}`)
    }
  })

  await test('Analysis - List', async () => {
    const resp = await request('GET', '/api/analyses')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO saved analyses: ${resp.data.data?.length || 0}`)
  })

  if (analysisId) {
    await test('Analysis - Update', async () => {
      const resp = await request('PUT', `/api/analyses/${analysisId}`, {
        name: 'API Test Analysis (Updated)',
        config: { templateId, groupByField: ['category'], chartType: 'pie', limit: 50 }
      })
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Analysis - Delete', async () => {
      const resp = await request('DELETE', `/api/analyses/${analysisId}`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  let dashboardId = null
  await test('Dashboard - Create', async () => {
    const resp = await request('POST', '/api/dashboards', {
      name: 'API Test Dashboard',
      description: 'Test dashboard',
      panelIds: []
    })
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    if (resp.data.data?.id) {
      dashboardId = resp.data.data.id
      console.log(`  INFO created dashboard ID: ${dashboardId}`)
    }
  })

  await test('Dashboard - List', async () => {
    const resp = await request('GET', '/api/dashboards')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    console.log(`  INFO dashboards: ${resp.data.data?.length || 0}`)
  })

  if (dashboardId) {
    await test('Dashboard - Get Detail', async () => {
      const resp = await request('GET', `/api/dashboards/${dashboardId}`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Dashboard - Update', async () => {
      const resp = await request('PUT', `/api/dashboards/${dashboardId}`, {
        name: 'API Test Dashboard (Updated)',
        description: 'Updated description'
      })
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })

    await test('Dashboard - Delete', async () => {
      const resp = await request('DELETE', `/api/dashboards/${dashboardId}`)
      assert(resp.status === 200, `returns 200 (got ${resp.status})`)
      assert(resp.data.success === true, 'returns success=true')
    })
  }

  // ─── 7. User APIs ───
  await test('Users - List', async () => {
    const resp = await request('GET', '/api/users')
    assert(resp.status === 200, `returns 200 (got ${resp.status})`)
    assert(resp.data.success === true, 'returns success=true')
    assert(Array.isArray(resp.data.data?.records), 'returns records array')
    console.log(`  INFO users: ${resp.data.data?.pagination?.total || 0}`)
  })

  // ─── Summary ───
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS SUMMARY')
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

run().catch(e => {
  console.error('Test script error:', e)
  process.exit(1)
})
