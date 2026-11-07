// 과업 시험 채점(task-test.md 채점 규칙). 시험관 답(task-runs/<screen>-answers.json)과 기록(<screen>-log*.json)을 정답과 비교한다.
// Q9·Q10은 기록기의 저장 요청과, 시험 직후 저장해 둔 API 재조회 결과(task-runs/<screen>-after.json)로 채점한다.
// 사용: node scripts/research/care-task-score.mjs <original|ops>
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'

const screen = process.argv[2]
const V5 = ['original-v5', 'a', 'b', 'c', 'd'].includes(screen)
const dir = new URL(`../../docs/design/ops-redesign/${V5 ? 'task-runs-v5' : 'task-runs'}/`, import.meta.url)
const key = JSON.parse(readFileSync(new URL(V5 ? '../task-answers-v5.json' : '../task-answers.json', dir), 'utf8'))
const answers = JSON.parse(readFileSync(new URL(`${screen}-answers.json`, dir), 'utf8'))
const logs = readdirSync(dir).filter((f) => f.startsWith(`${screen}-log`) && f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
const after = existsSync(new URL(`${screen}-after.json`, dir)) ? JSON.parse(readFileSync(new URL(`${screen}-after.json`, dir), 'utf8')) : null

const norm = (s) => String(s).replace(/\s/g, '')
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,，、]/) : []).map(norm).filter(Boolean)
const jaccard = (a, b) => { const A = new Set(list(a)), B = new Set(list(b)); const inter = [...A].filter((x) => B.has(x)).length; const uni = new Set([...A, ...B]).size; return uni ? inter / uni : 1 }
const listScore = (got, want) => { const j = jaccard(got, want); return j >= 0.8 ? 10 : j >= 0.5 ? 5 : 0 }
const num = (v) => Number(String(v).match(/-?\d+(\.\d+)?/)?.[0] ?? NaN)
const minutes = (v) => { if (typeof v === 'number') return v; const s = String(v); const h = num(s.match(/(\d+)\s*시간/)?.[1] ?? 0), m = num(s.match(/(\d+)\s*분/)?.[1] ?? 0); if (/시간|분/.test(s)) return h * 60 + m; const hm = s.match(/(\d+):(\d+)/); return hm ? Number(hm[1]) * 60 + Number(hm[2]) : num(s) }
const dateIn = (s) => { const m = String(s).match(/(\d{1,2})[/.-](\d{1,2})(?!\d)/) ?? String(s).match(/10-(\d{2})/); return m ? (m.length === 3 ? `${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}` : `10-${m[1]}`) : null }
const writes = logs.flatMap((l) => l.writes ?? [])
const reads = logs.flatMap((l) => l.reads ?? [])
const ops = logs.flatMap((l) => l.log ?? [])
const opsFor = (q) => ops.filter((e) => e.question === q).length + ops.filter((e) => e.question === q && e.autoMove).length

const s = {}
s.Q1 = num(answers.Q1) === key.Q1.answer ? 10 : 0
s.Q2 = listScore(answers.Q2, key.Q2.answer)
s.Q3 = listScore(answers.Q3, key.Q3.answer)
s.Q4 = listScore(answers.Q4, key.Q4.answer)
s.Q5 = listScore(list(answers.Q5).map((d) => dateIn(d)), key.Q5.answer.map((d) => d.slice(5)))
{ const a = answers.Q6, d = dateIn(typeof a === 'object' ? a.date : a), t = minutes(typeof a === 'object' ? a.time : String(a).match(/\d{1,2}:\d{2}/)?.[0] ?? ''), kt = minutes(key.Q6.answer.time)
  s.Q6 = d === key.Q6.answer.date.slice(5) ? (Math.abs(t - kt) <= 5 ? 10 : 5) : 0 }
s.Q7 = num(answers.Q7) === key.Q7.answer ? 10 : 0
s.Q8 = Math.abs(minutes(answers.Q8) - key.Q8.answer) <= 10 ? 10 : 0
{ const post = writes.filter((w) => w.question === 'Q9' && w.method === 'POST' && /\/cases/.test(w.url) && w.status < 300).map((w) => { try { return JSON.parse(w.body) } catch { return {} } })
  const ok = post.some((b) => b.studentId === key.Q9.studentId && b.channel === 'MEETING' && b.reason === 'ADJUSTMENT_NEEDED' && b.recheckDate === key.Q9.answer)
  // 새로 만든 기록만 인정한다: 시험 전 스냅숏 이력에 없던 케이스이고, 같은 학생·업무일·다음 확인일이어야 한다
  const before = JSON.parse(readFileSync(new URL(`../data-snapshot/history-${key.Q9.studentId}.json`, dir), 'utf8'))
  const oldCases = new Set([...(before.cases ?? []).map((c) => c.caseId), ...(before.items ?? []).map((i) => i.caseId)])
  const newCases = (after?.q9History?.cases ?? []).filter((c) => !oldCases.has(c.caseId) && c.studentId === key.Q9.studentId && c.openedOn === key.businessDate && c.recheckDate === key.Q9.answer)
  const inHistory = newCases.length > 0 && (after?.q9History?.items ?? []).some((i) => newCases.some((c) => c.caseId === i.caseId))
  const said = dateIn(answers.Q9) === key.Q9.answer.slice(5)
  s.Q9 = ok && inHistory ? (said ? 10 : 5) : 0 }
{ const puts = writes.filter((w) => w.question === 'Q10' && w.method === 'PUT' && /\/settings\?branchId=demo_small/.test(w.url) && w.status < 300).map((w) => { try { return JSON.parse(w.body).absenceDays } catch { return null } })
  // 중간 값 확인은 수지점 설정 조회가 첫 저장 뒤·둘째 저장 전에 있었고 그 응답이 값+1인지로 본다
  const q10 = writes.filter((w) => w.question === 'Q10' && /branchId=demo_small/.test(w.url)).sort((a, b) => a.at.localeCompare(b.at))
  const putAt = q10.filter((w) => w.method === 'PUT' && w.status < 300).map((w) => w.at)
  const gets = q10.filter((w) => w.method === 'GET' && putAt.length >= 2 && w.at > putAt[0] && w.at < putAt[1]).map((w) => { try { return JSON.parse(w.body).absenceDays } catch { return null } })
  const first = num(Array.isArray(answers.Q10) ? answers.Q10[0] : typeof answers.Q10 === 'object' ? answers.Q10.initial ?? answers.Q10.current : answers.Q10)
  const middleSaid = num(typeof answers.Q10 === 'object' && !Array.isArray(answers.Q10) ? answers.Q10.afterSave ?? answers.Q10.middle : Array.isArray(answers.Q10) ? answers.Q10[1] : NaN)
  const order = puts.length >= 2 && puts[0] === key.Q10.expectedSaves[0] && puts.at(-1) === key.Q10.expectedSaves[1]
  const middleSeen = gets.includes(key.Q10.middleValue) && reads.some((r) => r.question === 'Q10' && r.text.includes(String(key.Q10.middleValue))) && middleSaid === key.Q10.middleValue
  const finalOk = after?.q10Final === key.Q10.answer
  s.Q10 = !puts.length ? 0 : first === key.Q10.answer && order && middleSeen && finalOk ? 10 : first === key.Q10.answer && finalOk ? 5 : 0 }
// 사유는 화면마다 이름이 다르다(미입실/결석, 공부 시간 감소/학습 감소 등). 같은 신호 종류로 바꿔 비교한다
const reasonType = (t) => /결석|미입실/.test(t) ? 'absence' : /미제출/.test(t) ? 'plan' : /공부|학습/.test(t) && /감소|−|-/.test(t) ? 'study' : /진행률|미달성|달성률/.test(t) && !/과목|국어|수학|영어|탐구/.test(t) ? 'exec' : /입실|등원/.test(t) ? 'start' : /비중|국어|수학|영어|탐구/.test(t) ? 'subject' : norm(t)
s.Q11 = listScore(list(answers.Q11).map(reasonType), key.Q11.answer.map(reasonType))
{ const a = answers.Q12 ?? {}; s.Q12 = (listScore(a['연속'] ?? a.consecutive, key.Q12.answer['연속']) + listScore(a['흩어짐'] ?? a.scattered, key.Q12.answer['흩어짐'])) / 2 }
{ const a = answers.Q13, dir = /감소|줄/.test(JSON.stringify(a)) ? '감소' : /증가|늘/.test(JSON.stringify(a)) ? '증가' : '같음', p = num(typeof a === 'object' ? a.percent : String(a).match(/-?\d+(\.\d+)?\s*%/)?.[0] ?? a)
  s.Q13 = dir === key.Q13.answer.direction ? (Math.abs(Math.abs(p) - Math.abs(key.Q13.answer.percent)) <= 3 ? 10 : 5) : 0 }
{ const a = answers.Q14 ?? {}, rate = num(typeof a === 'object' ? a.executionRate ?? a.rate : a), subj = norm(typeof a === 'object' ? a.subject ?? '' : a), gap = num(typeof a === 'object' ? a.gapPoints ?? a.gap : NaN)
  s.Q14 = (Math.abs(rate - key.Q14.answer.executionRate) <= 2 ? 5 : 0) + (subj.includes(key.Q14.answer.subject) && Math.abs(Math.abs(gap) - Math.abs(key.Q14.answer.gapPoints)) <= 3 ? 5 : 0) }
s.Q15 = listScore(list(answers.Q15).map((x) => x.replace(/요일/, '')), key.Q15.answer)

if (V5) {
  { const a = answers.Q16 ?? {}; s.Q16 = (num(a.analyzed) === key.Q16.answer.analyzed ? 5 : 0) + (num(a.yes) === key.Q16.answer.yes ? 5 : 0) }
  { const got = new Set(list(answers.Q17)), want = new Set(list(key.Q17.answer)); s.Q17 = got.size === want.size && [...want].every((x) => got.has(x)) ? 10 : 0 }
  { const a = answers.Q18 ?? {}, k = key.Q18.answer, near = (x, y) => Math.abs(num(x) - y) <= 1
    const ends = (near(a.q1, k.q1) ? 1 : 0) + (near(a.q3, k.q3) ? 1 : 0)
    const names = !k.students.length ? (list(a.students).length ? 0 : 3) : (() => { const j = jaccard(a.students, k.students); return j >= 0.8 ? 3 : j >= 0.5 ? 1 : 0 })()
    s.Q18 = (near(a.median, k.median) ? 4 : 0) + (ends === 2 ? 3 : ends === 1 ? 1 : 0) + names }
  { const a = answers.Q19 ?? {}, k = key.Q19.answer
    const dates = list(a.absentDates).filter((x) => !/없음/.test(x)).map(dateIn).sort().join(','), kd = k.absentDates.map((d) => d.slice(5)).sort().join(',')
    const late = k.latestStart.some((x) => x.diff === null ? /평소\s*없음/.test(String(a.latestStartDiff)) : Math.abs(num(a.latestStartDiff) - x.diff) <= 1)
    s.Q19 = (dates === kd ? 2 : 0) + (Math.abs(minutes(a.weekMinutes) - k.weekMinutes) <= 10 ? 2 : 0) + (k.usualWeek === null ? (/없음|—/.test(String(a.usualWeek)) ? 2 : 0) : Math.abs(minutes(a.usualWeek) - k.usualWeek) <= 10 ? 2 : 0) + (late ? 2 : 0) + (k.executionRate === null ? 0 : Math.abs(num(a.executionRate) - k.executionRate) <= 1 ? 2 : 0) }
}
const total = Object.values(s).reduce((a, b) => a + b, 0)
const perQuestion = Object.fromEntries(Object.keys(s).map((q) => [q, { score: s[q], operations: opsFor(q) }]))
const readOps = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15', ...(V5 ? ['Q18', 'Q19'] : [])].reduce((a, q) => a + opsFor(q), 0)
const compared = V5 ? Object.entries(s).filter(([q]) => q !== 'Q16' && q !== 'Q17').reduce((a, [, v]) => a + v, 0) : null
const out = { screen, total, max: V5 ? 190 : 150, ...(V5 ? { comparedTotal: compared, comparedMax: 170, vision: (s.Q16 ?? 0) + (s.Q17 ?? 0) } : {}), perQuestion, readOperations: readOps, writeOperations: { Q9: opsFor('Q9'), Q10: opsFor('Q10') }, autoMoves: ops.filter((e) => e.autoMove).length, pageErrors: logs.flatMap((l) => l.errors ?? []).length }
writeFileSync(new URL(`${screen}-score.json`, dir), JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 1))
