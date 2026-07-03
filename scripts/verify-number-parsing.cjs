// Verify number field parsing for multi-line values
const NUMBER_FIELDS = new Set([
  'quantityInvolved', 'shaftCount', 'customerId', 'productModelId',
  'responsibleDeptId', 'responsibleProcessId', 'productionLineId'
])

function processFieldValue(fieldKey, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null

  const str = String(rawValue).trim()
  if (!str || str.startsWith('=')) return null

  if (NUMBER_FIELDS.has(fieldKey)) {
    const firstLine = str.split(/[\n\r]+/)[0].trim()
    const n = Number(firstLine)
    return isNaN(n) ? null : n
  }

  return str
}

const testCases = [
  { field: 'quantityInvolved', input: '5', expected: 5, desc: '简单数字' },
  { field: 'quantityInvolved', input: '0', expected: 0, desc: '零' },
  { field: 'quantityInvolved', input: '99999', expected: 99999, desc: '大数字' },
  { field: 'quantityInvolved', input: '3\n2\n1', expected: 3, desc: '多行数字取首行' },
  { field: 'quantityInvolved', input: '', expected: null, desc: '空字符串' },
  { field: 'quantityInvolved', input: '/', expected: null, desc: '斜杠占位符(数字字段返回null)' },
  { field: 'quantityInvolved', input: 'N/A', expected: null, desc: '非数字文本(数字字段返回null)' },
  { field: 'rollNo', input: '/', expected: '/', desc: '斜杠占位符(文本字段保留)' },
  { field: 'rollNo', input: 'N/A', expected: 'N/A', desc: '非数字文本(文本字段保留)' },
]

console.log('=== NUMBER FIELD PARSING VERIFICATION ===\n')
let pass = 0, fail = 0

for (const t of testCases) {
  const result = processFieldValue(t.field, t.input)
  const ok = result === t.expected
  if (ok) { pass++; console.log(`✅ ${t.desc}: "${t.input}" → ${result}`) }
  else { fail++; console.log(`❌ ${t.desc}: "${t.input}" → ${result} (expected: ${t.expected})`) }
}

console.log(`\nPassed: ${pass}/${testCases.length}`)
if (fail === 0) console.log('✅ All number parsing tests passed!')
else { console.log('❌ Some tests failed!'); process.exit(1) }
