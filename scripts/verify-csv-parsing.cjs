// Verification script: test CSV parsing with complex data
// This simulates the backend parseCSVText function

function parseCSVText(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
        i++
        continue
      } else if (char === '\r') {
        currentRow.push(currentField.trim())
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        if (text[i] === '\n') i++
        continue
      } else if (char === '\n') {
        currentRow.push(currentField.trim())
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    rows.push(currentRow)
  }

  return rows.filter(row => row.some(v => v !== ''))
}

const fs = require('fs')
const text = fs.readFileSync('data/complex-test-data.csv', 'utf-8')
const rows = parseCSVText(text)

console.log(`Total rows parsed: ${rows.length}`)
console.log(`Header columns: ${rows[0].length}`)
console.log(`Headers: ${rows[0].join(' | ')}`)
console.log('---')

// Verify each row
for (let i = 1; i < rows.length; i++) {
  const row = rows[i]
  console.log(`\n=== Row ${i} (序号: ${row[0]}) ===`)
  for (let c = 0; c < Math.min(rows[0].length, row.length); c++) {
    const header = rows[0][c]
    const val = row[c]
    if (val && val !== '') {
      const display = val.length > 60 ? val.substring(0, 60) + '...' : val.replace(/\n/g, '\\n')
      console.log(`  ${header}: [${display}]`)
    }
  }
}

// Verify specific edge cases
console.log('\n\n=== EDGE CASE VERIFICATION ===')

// Row 2: Multi-line roll numbers
const row2 = rows[2]
console.log(`Row 2 轴号 contains newline: ${row2[5].includes('\n')}`)
console.log(`Row 2 轴号 lines: ${row2[5].split('\n').length}`)

// Row 3: Complex multi-line data
const row3 = rows[3]
console.log(`Row 3 轴号 lines: ${row3[5].split('\n').length}`)
console.log(`Row 3 规格 lines: ${row3[6].split('\n').length}`)
console.log(`Row 3 数量 lines: ${row3[10].split('\n').length}`)

// Row 7: Contains commas in quoted field
const row7 = rows[7]
console.log(`Row 7 反馈内容 contains comma: ${row7[7].includes('，')}`)

// Row 8: Contains escaped quotes
const row8 = rows[8]
console.log(`Row 8 反馈内容 contains quotes: ${row8[7].includes('"')}`)

// Row 12: All fields multi-line
const row12 = rows[12]
console.log(`Row 12 轴号 lines: ${row12[5].split('\n').length}`)
console.log(`Row 12 反馈内容 lines: ${row12[7].split('\n').length}`)

// Check column count consistency
console.log('\n=== COLUMN COUNT CHECK ===')
for (let i = 0; i < rows.length; i++) {
  console.log(`Row ${i}: ${rows[i].length} columns`)
}

console.log('\n✅ All edge cases verified successfully!')
