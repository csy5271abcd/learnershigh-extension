// 스냅숏 묶음 일관성 검사: 상세(detail) 스냅숏의 날짜별 값·과목 비중이 같은 학생의 metrics 스냅숏과 같은지,
// 정답 파일의 상담 필요·관리 중 인원이 board 스냅숏과 같은지, 시드 해시가 현재 파일과 같은지 확인한다.
// 사용: node scripts/research/care-snapshot-check.mjs  (불일치가 있으면 종료 코드 1)
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const dir = new URL('../../docs/design/ops-redesign/data-snapshot/', import.meta.url)
const read = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'))
const problems = []
const metrics = read('metrics-demo_large.json')
const byId = Object.fromEntries(metrics.students.map((s) => [s.student.studentId, s.review]))
for (const file of readdirSync(dir).filter((f) => f.startsWith('detail-'))) {
  const id = file.slice(7, -5)
  const detail = read(file)
  const a = byId[id]
  if (!a) { problems.push(`${id}: metrics에 없음`); continue }
  const b = detail.review
  for (const [i, d] of a.days.entries()) {
    const e = b.days[i]
    for (const k of ['date', 'attendance', 'submission', 'minutes', 'startMinutes', 'plannedMinutes', 'actualMinutes']) if (d[k] !== e?.[k]) problems.push(`${id} ${d.date} ${k}: metrics ${d[k]} / detail ${e?.[k]}`)
  }
  for (const s of a.subjects) {
    const t = b.subjects.find((x) => x.name === s.name)
    if (!t || Math.abs(t.actualShare - s.actualShare) > 0.01 || Math.abs(t.plannedShare - s.plannedShare) > 0.01) problems.push(`${id} 과목 ${s.name} 비중 불일치`)
  }
}
const board = read('board-demo_large.json')
const answers = JSON.parse(readFileSync(new URL('../task-answers.json', dir), 'utf8'))
if (answers.Q1.answer !== board.needsCheck.length) problems.push(`Q1 ${answers.Q1.answer} != board ${board.needsCheck.length}`)
if (answers.Q7.answer !== board.inAdjustment.length) problems.push(`Q7 ${answers.Q7.answer} != board ${board.inAdjustment.length}`)
const hashes = readFileSync(new URL('seed-hashes.txt', dir), 'utf8').trim().split('\n').map((l) => l.split(/\s+\*?/))
for (const [hash, file] of hashes) {
  const now = createHash('sha256').update(readFileSync(new URL(`../../../../${file.replace(/^\*/, '')}`, dir))).digest('hex')
  if (now !== hash) problems.push(`시드 해시 불일치 ${file}`)
}
console.log(problems.length ? problems.join('\n') : 'OK: detail·metrics·board·정답·시드 해시 일치')
process.exit(problems.length ? 1 : 0)
