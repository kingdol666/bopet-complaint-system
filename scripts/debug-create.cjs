/**
 * Debug: Check create API error details
 */
const http = require('http')

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const req = http.request({ hostname: 'localhost', port: 3001, path, method, headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }) } catch { resolve({ status: res.statusCode, data }) } })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function run() {
  // Login
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  const token = login.data.data.token

  // Test template creation
  console.log('=== Template Creation ===')
  const tplResp = await request('POST', '/api/templates', {
    name: 'Test Template',
    description: 'Test',
    isDefault: false,
    fields: [
      { fieldKey: 'date1', fieldLabel: 'Date1', fieldType: 'date', required: true, sortOrder: 1 },
      { fieldKey: 'text1', fieldLabel: 'Text1', fieldType: 'text', required: true, sortOrder: 2 }
    ]
  }, token)
  console.log('Status:', tplResp.status)
  console.log('Response:', JSON.stringify(tplResp.data, null, 2))

  // Test data creation
  console.log('\n=== Data Creation ===')
  const dataResp = await request('POST', '/api/datas', {
    dataNo: 'TEST-' + Date.now(),
    feedbackDate: '2026-06-15',
    customerId: 1,
    productModelId: 1,
    category: 'test',
    feedbackContent: 'test content',
    closureStatus: 'pending'
  }, token)
  console.log('Status:', dataResp.status)
  console.log('Response:', JSON.stringify(dataResp.data, null, 2))
}

run().catch(console.error)
