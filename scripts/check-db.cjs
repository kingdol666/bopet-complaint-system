/**
 * Check database for existing users
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, enabled: true, password: true }
  })
  console.log('Users in database:')
  for (const u of users) {
    console.log(`  ID=${u.id}, username="${u.username}", name="${u.name}", role=${u.role}, enabled=${u.enabled}, password_prefix=${u.password.substring(0, 20)}...`)
  }

  const templates = await prisma.formTemplate.findMany({
    select: { id: true, name: true, enabled: true, isDefault: true, _count: { select: { fields: true } } }
  })
  console.log('\nTemplates in database:')
  for (const t of templates) {
    console.log(`  ID=${t.id}, name="${t.name}", fields=${t._count.fields}, default=${t.isDefault}`)
  }

  const dataCount = await prisma.dataRecord.count()
  console.log(`\nData records: ${dataCount}`)

  const customers = await prisma.customer.count()
  const products = await prisma.productModel.count()
  const depts = await prisma.responsibleDepartment.count()
  console.log(`\nConfig: customers=${customers}, products=${products}, departments=${depts}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
