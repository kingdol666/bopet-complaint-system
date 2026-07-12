// Quick login test for all users
async function main() {
  const BASE = 'http://localhost:3001'
  const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'deptadmin', password: 'deptadmin123' },
    { username: 'operator', password: 'operator123' },
    { username: 'quality', password: 'quality123' }
  ]
  for (const u of users) {
    const resp = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u)
    })
    const data = await resp.json()
    if (data.success) {
      console.log(`OK: ${u.username} -> ${data.data.user.name} (role=${data.data.user.role})`)
    } else {
      console.log(`FAIL: ${u.username} -> status=${resp.status}, ${JSON.stringify(data)}`)
    }
  }
}
main().catch(e => console.error(e))
