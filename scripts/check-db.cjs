// Check database directly for deptadmin user
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, enabled: true, password: true }
  })
  for (const u of users) {
    console.log(`id=${u.id} username=${u.username} role=${u.role} enabled=${u.enabled} password=${u.password.substring(0, 20)}...`)
  }
  await prisma.$disconnect()
}
main().catch(e => console.error(e))
