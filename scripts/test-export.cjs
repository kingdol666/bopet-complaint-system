// Quick test for export API
async function main() {
  // Login
  const loginResp = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  const loginData = await loginResp.json()
  if (!loginData.success) {
    console.log('Login FAILED:', JSON.stringify(loginData))
    return
  }
  const token = loginData.data.token
  console.log('Login: OK')

  // Test export with filters
  const exportResp = await fetch('http://localhost:3001/api/datas/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ sortBy: 'feedbackDate', sortOrder: 'desc' })
  })
  const buf = Buffer.from(await exportResp.arrayBuffer())
  console.log('Export Status:', exportResp.status)
  console.log('Content-Type:', exportResp.headers.get('content-type'))
  console.log('Content-Length:', buf.length, 'bytes')
  console.log('First 300 chars:', buf.toString('utf8').substring(0, 300))
}

main().catch(e => console.error(e))
