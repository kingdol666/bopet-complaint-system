/**
 * Clean up debug-created test data
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Delete the debug-created record (ID 153, dataNo starts with TEST-API)
  const debugRecords = await prisma.dataRecord.findMany({
    where: { OR: [
      { dataNo: { startsWith: 'TEST-API' } },
      { feedbackContent: 'test content' }
    ]},
    select: { id: true, dataNo: true }
  })
  for (const r of debugRecords) {
    await prisma.dataRecord.delete({ where: { id: r.id } })
    console.log(`Deleted record: ${r.id} (${r.dataNo})`)
  }

  // Delete debug-created template (name starts with "Test Template")
  const debugTemplates = await prisma.formTemplate.findMany({
    where: { name: { startsWith: 'Test Template' } },
    select: { id: true, name: true }
  })
  for (const t of debugTemplates) {
    await prisma.formTemplateField.deleteMany({ where: { templateId: t.id } })
    await prisma.formTemplate.delete({ where: { id: t.id } })
    console.log(`Deleted template: ${t.id} (${t.name})`)
  }

  // Also clean up any test templates from the deep test
  const testTemplates = await prisma.formTemplate.findMany({
    where: { name: { startsWith: 'API测试模板' } },
    select: { id: true, name: true }
  })
  for (const t of testTemplates) {
    await prisma.formTemplateField.deleteMany({ where: { templateId: t.id } })
    await prisma.formTemplate.delete({ where: { id: t.id } })
    console.log(`Deleted test template: ${t.id} (${t.name})`)
  }

  console.log('\nCleanup complete')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
