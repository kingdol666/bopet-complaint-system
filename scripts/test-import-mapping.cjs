/**
 * Test import-to-template API with the complex test CSV
 * Verifies that data is correctly stored in both DB columns and templateData
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3001
let token = null

function request(method, path, body, formData) {
  return new Promise((resolve, reject) => {
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    if (formData) {
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`
      let bodyStr = ''
      for (const [key, value] of Object.entries(formData)) {
        if (value.filename) {
          bodyStr += `--${boundary}\r\n`
          bodyStr += `Content-Disposition: form-data; name="${key}"; filename="${value.filename}"\r\n`
          bodyStr += `Content-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`
          bodyStr += value.data + '\r\n'
        } else {
          bodyStr += `--${boundary}\r\n`
          bodyStr += `Content-Disposition: form-data; name="${key}"\r\n\r\n`
          bodyStr += value + '\r\n'
        }
      }
      bodyStr += `--${boundary}--\r\n`

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
      req.write(bodyStr)
      req.end()
    } else {
      headers['Content-Type'] = 'application/json'
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
    }
  })
}

async function run() {
  console.log('='.repeat(60))
  console.log('Import Test: Data mapping verification')
  console.log('='.repeat(60))

  // Login
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })
  token = login.data.data.token
  console.log('Login OK')

  // Read the complex test CSV
  const csvPath = path.join(__dirname, '..', 'data', 'complex-test-data.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  console.log(`CSV file loaded: ${csvContent.split('\n').length} lines`)

  // Import with template 7
  console.log('\n--- Import with template 7 ---')
  const importResp = await request('POST', '/api/datas/import-to-template', null, {
    file: { filename: 'complex-test-data.csv', type: 'text/csv', data: csvContent },
    templateId: '7'
  })

  console.log(`Status: ${importResp.status}`)
  console.log(`Success: ${importResp.data?.success}`)
  console.log(`Message: ${importResp.data?.message}`)
  console.log(`Success count: ${importResp.data?.data?.successCount}`)
  console.log(`Error count: ${importResp.data?.data?.errorCount}`)

  if (importResp.data?.data?.errors?.length > 0) {
    console.log('\nErrors:')
    importResp.data.data.errors.forEach(e => console.log(`  Row ${e.row}: ${e.message}`))
  }

  // Now verify the imported data
  console.log('\n--- Verify imported data ---')
  const listResp = await request('GET', '/api/datas?page=1&pageSize=5&sortBy=id&sortOrder=desc', null, null)
  const records = listResp.data.data.records
  console.log(`Latest records: ${records.length}`)

  for (const r of records.slice(0, 3)) {
    console.log(`\n  Record ${r.id} (${r.dataNo}):`)
    console.log(`    feedbackDate: ${r.feedbackDate}`)
    console.log(`    customerId: ${r.customerId} (customer: ${r.customer?.name || 'null'})`)
    console.log(`    productModelId: ${r.productModelId} (product: ${r.productModel?.name || 'null'})`)
    console.log(`    responsibleDeptId: ${r.responsibleDeptId} (dept: ${r.responsibleDept?.name || 'null'})`)
    console.log(`    rollNo: ${r.rollNo || 'null'}`)
    console.log(`    specification: ${r.specification || 'null'}`)
    console.log(`    feedbackContent: ${r.feedbackContent || 'null'}`)
    console.log(`    category: ${r.category || 'null'}`)
    console.log(`    rootCauseAnalysis: ${r.rootCauseAnalysis || 'null'}`)
    console.log(`    productUsage: ${r.productUsage || 'null'}`)
    console.log(`    improvementAction: ${r.improvementAction || 'null'}`)

    if (r.templateData) {
      try {
        const td = JSON.parse(r.templateData)
        console.log(`    templateData keys: ${Object.keys(td).join(', ')}`)
        // Show a few key values
        const showKeys = ['序号', '投诉日期', '客户', '责任部门', '型号', '轴号', '规格', '反馈内容', '弊病源', '数量', '客诉分类']
        for (const k of showKeys) {
          if (td[k] !== undefined) {
            console.log(`      ${k}: ${td[k]}`)
          }
        }
      } catch {
        console.log(`    templateData: (parse error)`)
      }
    } else {
      console.log(`    templateData: null`)
    }
  }

  // Get one record detail and check what the detail page would show
  console.log('\n--- Detail page simulation ---')
  if (records.length > 0) {
    const detailResp = await request('GET', `/api/datas/${records[0].id}`, null, null)
    const rec = detailResp.data.data
    console.log(`Record ${rec.id} (${rec.dataNo}):`)

    // Load template fields
    const tplResp = await request('GET', '/api/templates/7', null, null)
    const fields = tplResp.data.data.fields

    // Simulate resolveDisplayValue
    let templateData = {}
    if (rec.templateData) {
      try { templateData = JSON.parse(rec.templateData) } catch {}
    }

    console.log('\n  Field display values:')
    for (const field of fields) {
      let value = rec[field.fieldKey]
      if (value === null || value === undefined) {
        value = templateData[field.fieldKey]
      }

      // FK resolution
      if (field.fieldKey === '客户' || field.fieldKey === 'customerId') {
        value = rec.customer?.name || value
      } else if (field.fieldKey === '型号' || field.fieldKey === 'productModelId') {
        value = rec.productModel?.name || value
      } else if (field.fieldKey === '责任部门' || field.fieldKey === 'responsibleDeptId') {
        value = rec.responsibleDept?.name || value
      }

      const display = (value === null || value === undefined || value === '') ? '-' : String(value)
      const marker = display === '-' ? ' ❌ EMPTY' : ' ✓'
      console.log(`    ${field.fieldLabel} (${field.fieldKey}): ${display}${marker}`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

run().catch(e => { console.error('Test error:', e); process.exit(1) })
