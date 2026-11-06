// 과업 시험 직후 서버 상태 재조회(Q9 이력, Q10 최종 설정값). 사용: node scripts/research/care-task-after.mjs <original|ops>
import { readFileSync, writeFileSync } from 'node:fs'
const screen = process.argv[2]
const key = JSON.parse(readFileSync(new URL('../../docs/design/ops-redesign/task-answers.json', import.meta.url), 'utf8'))
const B = 'http://127.0.0.1:8081/api/admin/student-care'
const q9History = await (await fetch(`${B}/students/${key.Q9.studentId}/history?branchId=demo_large`)).json()
const q10Final = (await (await fetch(`${B}/settings?branchId=demo_small`)).json()).absenceDays
writeFileSync(new URL(`../../docs/design/ops-redesign/task-runs/${screen}-after.json`, import.meta.url), JSON.stringify({ q9History, q10Final }, null, 2))
console.log('q10Final', q10Final, 'history items', q9History.items?.length)
