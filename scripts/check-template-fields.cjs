/**
 * Check template 7 field definitions to understand fieldKey vs fieldLabel
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const fields = await prisma.formTemplateField.findMany({
    where: { templateId: 7 },
    orderBy: { sortOrder: 'asc' }
  })
  
  console.log('Template 7 (客诉台账-对外版1) fields:')
  for (const f of fields) {
    console.log(`  fieldKey="${f.fieldKey}", fieldLabel="${f.fieldLabel}", type=${f.fieldType}, configType=${f.configType || 'null'}`)
  }

  // Check a sample data record that was imported with this template
  const records = await prisma.dataRecord.findMany({
    where: { templateIds: { contains: '7' } },
    take: 2,
    select: { id: true, dataNo: true, templateData: true, feedbackDate: true, customerId: true, feedbackContent: true, category: true }
  })
  
  console.log('\nSample imported records:')
  for (const r of records) {
    console.log(`\n  Record ${r.id} (${r.dataNo}):`)
    console.log(`    feedbackDate=${r.feedbackDate}`)
    console.log(`    customerId=${r.customerId}`)
    console.log(`    feedbackContent=${r.feedbackContent}`)
    console.log(`    category=${r.category}`)
    if (r.templateData) {
      try {
        const td = JSON.parse(r.templateData)
        console.log(`    templateData keys: ${Object.keys(td).join(', ')}`)
        console.log(`    templateData: ${JSON.stringify(td).substring(0, 300)}`)
      } catch {
        console.log(`    templateData (raw): ${r.templateData.substring(0, 200)}`)
      }
    } else {
      console.log(`    templateData: null`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
