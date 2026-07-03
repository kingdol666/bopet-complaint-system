/**
 * Investigate data format issues
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check date format in database
  console.log('=== Data Record Date Format ===')
  const records = await prisma.dataRecord.findMany({
    take: 5,
    select: { id: true, dataNo: true, feedbackDate: true, productionTime: true, createdAt: true }
  })
  for (const r of records) {
    console.log(`  ID=${r.id}, dataNo=${r.dataNo}, feedbackDate=${r.feedbackDate} (${typeof r.feedbackDate}), productionTime=${r.productionTime}, createdAt=${r.createdAt}`)
  }

  // Check raw date string in DB
  console.log('\n=== Raw SQL Date Check ===')
  const rawDates = await prisma.$queryRawUnsafe('SELECT id, feedbackDate, typeof(feedbackDate) as dt FROM data_records LIMIT 5')
  for (const r of rawDates) {
    console.log(`  ID=${r.id}, feedbackDate=${r.feedbackDate}, type=${r.dt}`)
  }

  // Test strftime
  console.log('\n=== strftime Test ===')
  const strftimeResult = await prisma.$queryRawUnsafe("SELECT strftime('%Y-%m-%d', feedbackDate) as formatted, feedbackDate as raw FROM data_records LIMIT 3")
  for (const r of strftimeResult) {
    console.log(`  raw=${r.raw}, formatted=${r.formatted}`)
  }

  // Check user API - what does it actually return
  console.log('\n=== User Check ===')
  const userCount = await prisma.user.count()
  console.log(`  User count from Prisma: ${userCount}`)

  // Check if there's a department filter issue
  const usersWithDepts = await prisma.user.findMany({
    select: {
      id: true, username: true, name: true, role: true, enabled: true,
      departments: { select: { departmentId: true } }
    }
  })
  console.log(`  Users found: ${usersWithDepts.length}`)
  for (const u of usersWithDepts) {
    console.log(`    ${u.username}: deptIds=${JSON.stringify(u.departments.map(d => d.departmentId))}`)
  }

  // Check what year the feedbackDates are in
  console.log('\n=== Feedback Date Year Distribution ===')
  const yearDist = await prisma.$queryRawUnsafe(
    "SELECT substr(feedbackDate, 1, 4) as year, COUNT(*) as cnt FROM data_records GROUP BY year ORDER BY cnt DESC LIMIT 10"
  )
  for (const r of yearDist) {
    console.log(`  Year ${r.year}: ${r.cnt} records`)
  }

  // Check the actual date range
  console.log('\n=== Date Range ===')
  const dateRange = await prisma.$queryRawUnsafe(
    "SELECT MIN(feedbackDate) as min_date, MAX(feedbackDate) as max_date FROM data_records"
  )
  console.log(`  Min: ${dateRange[0].min_date}, Max: ${dateRange[0].max_date}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
