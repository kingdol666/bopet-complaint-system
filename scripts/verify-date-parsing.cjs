// Verify date parsing for all date formats used in test data
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

const DATE_FORMATS = [
  'YYYY.M.D', 'YYYY.MM.DD', 'YYYY-MM-DD', 'YYYY/M/D', 'YYYY/MM/DD',
  'M/D/YY', 'M/D/YYYY', 'YYYY.MM', 'YYYY.M', 'YYYYMMDD', 'YYYYMM'
]

function looksLikeDate(str) {
  return /^[\d\s.\-/～~至到]+$/.test(str) && /\d/.test(str)
}

function parseDate(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('#'))) return null

  const str = String(val).trim()
  if (!str) return null

  // Check numeric Excel serial date
  const numVal = Number(str)
  if (!isNaN(numVal) && str.length >= 3 && /^\d+(\.\d+)?$/.test(str)) {
    if (numVal >= 40000 && numVal <= 60000) {
      const excelEpoch = new Date(1899, 11, 30)
      const d = new Date(excelEpoch.getTime() + numVal * 86400000)
      return dayjs(d).format('YYYY-MM-DD')
    }
  }

  const firstLine = str.split(/[\n\r]+/)[0].trim()
  if (!firstLine) return null

  if (!looksLikeDate(firstLine)) return null

  const startDate = firstLine.split(/[~～至到]+/)[0].trim()
  if (!startDate) return null

  const parsed = dayjs(startDate, DATE_FORMATS, true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')

  return null
}

// Test all date formats from the test data
const testDates = [
  { input: '2026.1.4', expected: '2026-01-04', desc: '点分隔日期' },
  { input: '2026.1.15', expected: '2026-01-15', desc: '点分隔日期2' },
  { input: '20260119', expected: '2026-01-19', desc: '纯数字日期YYYYMMDD' },
  { input: '2026/3/13', expected: '2026-03-13', desc: '斜杠日期' },
  { input: '2026.3.27', expected: '2026-03-27', desc: '点分隔日期3' },
  { input: '3/30/26', expected: '2026-03-30', desc: '美式日期M/D/YY' },
  { input: '2026.5.1', expected: '2026-05-01', desc: '点分隔日期4' },
  { input: '2026.5.2', expected: '2026-05-02', desc: '点分隔日期5' },
  { input: '2026.5.3', expected: '2026-05-03', desc: '点分隔日期6' },
  { input: '2026.6.15', expected: '2026-06-15', desc: '点分隔日期7' },
  { input: '2026.7.1', expected: '2026-07-01', desc: '点分隔日期8' },
  { input: '2026.7.20', expected: '2026-07-20', desc: '点分隔日期9' },
  { input: '2026.8.1', expected: '2026-08-01', desc: '点分隔日期10' },
  { input: '20260901', expected: '2026-09-01', desc: '纯数字日期2' },
  { input: '2026-10-15', expected: '2026-10-15', desc: 'ISO日期' },
  { input: '2025.8.16', expected: '2025-08-16', desc: '生产日期1' },
  { input: '2025.10.25', expected: '2025-10-25', desc: '生产日期2' },
  { input: '2026/2/11', expected: '2026-02-11', desc: '斜杠生产日期' },
  { input: '2026.3.20', expected: '2026-03-20', desc: '点分隔生产日期' },
  { input: '1/19/26', expected: '2026-01-19', desc: '美式生产日期' },
  { input: '2026.6.10', expected: '2026-06-10', desc: '点分隔生产日期2' },
  { input: '2026.6.25', expected: '2026-06-25', desc: '点分隔生产日期3' },
  { input: '2026.7.15', expected: '2026-07-15', desc: '点分隔生产日期4' },
  { input: '20260801', expected: '2026-08-01', desc: '纯数字生产日期' },
  { input: '2026-10-10', expected: '2026-10-10', desc: 'ISO生产日期' },
  // Multi-line dates
  { input: '20251111\n20251210\n20251112\n20250819', expected: '2025-11-11', desc: '多行日期取首行' },
  { input: '20260701\n20260702\n20260703', expected: '2026-07-01', desc: '多行日期取首行2' },
  // Edge cases
  { input: '', expected: null, desc: '空字符串' },
  { input: '/', expected: null, desc: '斜杠占位符' },
  { input: '视频', expected: null, desc: '非日期文本' },
]

console.log('=== DATE PARSING VERIFICATION ===\n')
let passCount = 0
let failCount = 0

for (const test of testDates) {
  const result = parseDate(test.input)
  const passed = result === test.expected
  if (passed) {
    passCount++
    console.log(`✅ ${test.desc}: "${test.input}" → "${result}"`)
  } else {
    failCount++
    console.log(`❌ ${test.desc}: "${test.input}" → "${result}" (expected: "${test.expected}")`)
  }
}

console.log(`\n=== SUMMARY ===`)
console.log(`Passed: ${passCount}/${testDates.length}`)
console.log(`Failed: ${failCount}/${testDates.length}`)
if (failCount === 0) {
  console.log('✅ All date parsing tests passed!')
} else {
  console.log('❌ Some date parsing tests failed!')
  process.exit(1)
}
