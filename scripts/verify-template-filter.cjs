// Verify templateIds filtering logic
// templateIds is stored as JSON array of numbers, e.g. "[1,2,3]"
// We need to match the number in any position to avoid false positives (e.g., 1 matching 11)

function matchesTemplateId(templateIdsStr, targetId) {
  const tid = String(targetId)
  const patterns = [
    `[${tid}]`,   // only template in list
    `[${tid},`,    // first in list
    `,${tid}]`,    // last in list
    `,${tid},`     // middle in list
  ]
  return patterns.some(p => templateIdsStr.includes(p))
}

const testCases = [
  // [templateIds stored string, search ID, expected result, description]
  ['[1]', 1, true, 'single template = 1'],
  ['[1]', 2, false, 'single template = 1, search 2'],
  ['[1,2,3]', 1, true, 'first in list'],
  ['[1,2,3]', 2, true, 'middle in list'],
  ['[1,2,3]', 3, true, 'last in list'],
  ['[1,2,3]', 4, false, 'not in list'],
  ['[11,22,33]', 1, false, 'should NOT match 1 when 11 exists'],
  ['[11,22,33]', 11, true, 'should match 11'],
  ['[11,22,33]', 2, false, 'should NOT match 2 when 22 exists'],
  ['[2,11,3]', 1, false, 'should NOT match 1 when 11 exists (middle)'],
  ['[2,11,3]', 11, true, 'should match 11 (middle)'],
  ['[111]', 1, false, 'should NOT match 1 when 111 exists'],
  ['[111]', 11, false, 'should NOT match 11 when 111 exists'],
  ['[111]', 111, true, 'should match 111'],
  ['[]', 1, false, 'empty array'],
  ['[1,11,111]', 1, true, '1 in list with 11 and 111'],
  ['[1,11,111]', 11, true, '11 in list with 1 and 111'],
  ['[1,11,111]', 111, true, '111 in list with 1 and 11'],
]

console.log('=== TEMPLATE IDS FILTER VERIFICATION ===\n')
let pass = 0, fail = 0

for (const [stored, searchId, expected, desc] of testCases) {
  const result = matchesTemplateId(stored, searchId)
  const ok = result === expected
  if (ok) { pass++; console.log(`✅ ${desc}: stored="${stored}", search=${searchId} → ${result}`) }
  else { fail++; console.log(`❌ ${desc}: stored="${stored}", search=${searchId} → ${result} (expected: ${expected})`) }
}

console.log(`\nPassed: ${pass}/${testCases.length}`)
if (fail === 0) console.log('✅ All templateIds filter tests passed!')
else { console.log('❌ Some tests failed!'); process.exit(1) }
