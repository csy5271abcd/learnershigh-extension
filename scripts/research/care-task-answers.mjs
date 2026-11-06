// 과업 시험 정답 계산. API 스냅숏(docs/design/ops-redesign/data-snapshot)만 읽는다.
// 사용: node scripts/research/care-task-answers.mjs  → docs/design/ops-redesign/task-answers.json
import { readFileSync, writeFileSync } from 'node:fs'
import { createDataset } from '../demo/generate-care-seed.mjs'

const dir = new URL('../../docs/design/ops-redesign/data-snapshot/', import.meta.url)
const read = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'))
const board = read('board-demo_large.json')
const metrics = read('metrics-demo_large.json')
const settingsSmall = read('settings-demo_small.json')
const scenario = Object.fromEntries(createDataset().students.map((s) => [s.id, s.scenario]))
const byId = Object.fromEntries(metrics.students.map((s) => [s.student.studentId, s]))
const name = (id) => byId[id].student.studentName
const days = (id) => byId[id].review.days
const absences = (id) => days(id).filter((d) => d.attendance === 'ABSENT').length
const hasSignal = (card, type) => card.signals.some((s) => s.type === type)
const sortIds = (ids) => [...ids].sort()
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const cards = [...board.needsCheck, ...board.inAdjustment] // 상담 필요 + 관리 중. 표시 여부는 관리 상태와 무관하게 센다
const flagged = new Set(cards.map((c) => c.studentId))

// Q5: 계획 미제출 신호가 있고 결석 신호는 없는 상담 필요 학생 중 ID가 가장 앞선 학생
const q5 = sortIds(board.needsCheck.filter((c) => hasSignal(c, 'PLAN_MISSING') && !hasSignal(c, 'CONSECUTIVE_ABSENCE')).map((c) => c.studentId))[0]
// Q6: 입실 시각 변화 신호가 있는 학생 중 ID가 가장 앞선 학생
const q6 = sortIds(board.needsCheck.filter((c) => hasSignal(c, 'START_TIME_SHIFT')).map((c) => c.studentId))[0]
const q6Late = days(q6).filter((d) => d.startMinutes !== null).sort((a, b) => b.startMinutes - a.startMinutes)[0]
// Q8: 어떤 표시도 없는 장시간형 정상 학생 중 ID가 가장 앞선 학생
const q8 = sortIds(metrics.students.map((s) => s.student.studentId).filter((id) => scenario[id] === 'healthy_long' && !flagged.has(id) && !board.deferred.some((d) => d.studentId === id)))[0]
const q8Minutes = days(q8).reduce((sum, d) => sum + (d.minutes ?? 0), 0)
// Q9: 결석 신호가 있고 아직 관리 중이 아닌 상담 필요 학생. 두 화면 모두 같은 학생을 쓰고, 화면별 시험 전에 DB를 초기 상태로 복원한다
const q9 = sortIds(board.needsCheck.filter((c) => hasSignal(c, 'CONSECUTIVE_ABSENCE')).map((c) => c.studentId))[0]
// Q11: 신호가 2개 이상인 상담 필요 학생 중 ID가 가장 앞선 학생의 표시 이유(신호 이름)
const q11 = sortIds(board.needsCheck.filter((c) => c.signals.length >= 2 && c.studentId !== q9).map((c) => c.studentId))[0]
const q11Labels = board.needsCheck.find((c) => c.studentId === q11).signals.map((s) => s.label)
// Q12: 최근 7일 결석이 2일 이상인 학생을 결석이 이어진 학생과 흩어진 학생으로 나눈다.
// 등원 예정이 없는 날(UNSCHEDULED)은 연속을 끊지 않는다. 기록 없음(UNKNOWN)은 연속을 끊는다
const absencePattern = (id) => { let run = 0, best = 0
  for (const d of days(id)) { if (d.attendance === 'ABSENT') { run++; best = Math.max(best, run) } else if (d.attendance !== 'UNSCHEDULED') run = 0 }
  const n = absences(id); return n >= 2 ? (best === n ? '연속' : '흩어짐') : null }
const allIds = sortIds(metrics.students.map((s) => s.student.studentId))
const q12 = { 연속: allIds.filter((id) => absencePattern(id) === '연속').map(name), 흩어짐: allIds.filter((id) => absencePattern(id) === '흩어짐').map(name) }
// Q15: 35일(이전 28일 + 최근 7일) 동안 같은 요일에 4번 이상 결석한 학생과 그 요일
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const q15 = allIds.flatMap((id) => { const all = [...byId[id].review.baselineDays, ...days(id)]; const count = {}
  for (const d of all) if (d.attendance === 'ABSENT') { const w = DOW[new Date(d.date + 'T00:00:00Z').getUTCDay()]; count[w] = (count[w] ?? 0) + 1 }
  return Object.entries(count).filter(([, n]) => n >= 4).map(([w]) => `${name(id)}(${w})`) })
// Q13: 강남점 전체 학습 시간 변화. 최근 7일 각 학생·날짜의 실제 분과 같은 학생의 같은 요일 평소 분을 짝지어 합한다(양쪽 값이 있는 관측만)
let recent = 0, usual = 0
for (const s of metrics.students) s.review.days.forEach((d, i) => { const b = s.review.weekdayBaseline[i]; if (d.minutes !== null && b && b.minutes !== null && b.samples > 0) { recent += d.minutes; usual += b.minutes } })
const q13 = Math.round(((recent - usual) / usual) * 1000) / 10
// Q14: 과목 비중 신호(SUBJECT_SHARE)가 있는 학생 중 ID가 가장 앞선 학생. 진행률과 계획·실제 비중 차이가 가장 큰 과목을 함께 읽는다
const q14 = sortIds(cards.filter((c) => hasSignal(c, 'SUBJECT_SHARE')).map((c) => c.studentId))[0]
const q14Gap = [...byId[q14].review.subjects].map((x) => ({ name: x.name, gap: Math.round((x.actualShare - x.plannedShare) * 10) / 10 })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0]

const answers = {
  dataAsOf: metrics.asOf, businessDate: '2026-10-28', branch: '강남점',
  Q1: { answer: board.needsCheck.length, rule: '정수 일치' },
  Q2: { answer: sortIds(metrics.students.map((s) => s.student.studentId).filter((id) => absences(id) >= 4)).map(name), rule: '명단 일치율' },
  Q3: { answer: sortIds(cards.filter((c) => hasSignal(c, 'STUDY_DROP') && absences(c.studentId) === 0).map((c) => c.studentId)).map(name), rule: '명단 일치율' },
  Q4: { answer: sortIds(cards.filter((c) => hasSignal(c, 'START_TIME_SHIFT')).map((c) => c.studentId)).map(name), rule: '명단 일치율' },
  Q5: { student: name(q5), studentId: q5, answer: days(q5).filter((d) => d.scheduled && d.submission === 'MISSING').map((d) => d.date), rule: '날짜 목록 일치율' },
  Q6: { student: name(q6), studentId: q6, answer: { date: q6Late.date, time: clock(q6Late.startMinutes) }, rule: '날짜 일치, 시각 ±5분' },
  Q7: { answer: board.inAdjustment.length, rule: '정수 일치' },
  Q8: { student: name(q8), studentId: q8, answer: q8Minutes, rule: '분 단위 ±10분' },
  Q9: { student: name(q9), studentId: q9, answer: '2026-11-04', expectedSave: { channel: 'MEETING', reason: 'ADJUSTMENT_NEEDED', recheckDate: '2026-11-04' }, rule: '저장 요청(POST /cases)의 학생·방법·결과·다음 확인일 일치, 서버 재조회 이력에 존재, 답한 날짜 일치' },
  Q10: { branchId: 'demo_small', answer: settingsSmall.absenceDays, middleValue: settingsSmall.absenceDays + 1, expectedSaves: [settingsSmall.absenceDays + 1, settingsSmall.absenceDays], rule: 'task-test.md Q10 채점 규칙' },
  Q11: { student: name(q11), studentId: q11, answer: q11Labels, rule: '이유 일치율(이름 단위)' },
  Q12: { answer: q12, rule: '연속·흩어짐 명단 각각 일치율' },
  Q13: { answer: { direction: q13 > 0 ? '증가' : q13 < 0 ? '감소' : '같음', percent: q13 }, rule: '방향 일치 + ±3%p' },
  Q14: { student: name(q14), studentId: q14, answer: { executionRate: Math.round(byId[q14].review.current.executionRate), subject: q14Gap.name, gapPoints: q14Gap.gap }, rule: '진행률 ±2%p 5점 + 과목 일치·차이 ±3%p 5점' },
  Q15: { answer: q15, rule: '학생(요일) 명단 일치율' },
}
writeFileSync(new URL('../task-answers.json', dir), JSON.stringify(answers, null, 2) + '\n')
console.log(JSON.stringify(answers, null, 1))
