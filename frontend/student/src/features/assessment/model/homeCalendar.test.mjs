// A28-23 학생 홈 월간 달력 일정 모델 시험 (node --test) — 합성 데이터(실제 DB 아님), 3개 과목
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entryFromRow } from '../components/teaching-plan/teachingPlanPlacement.ts'
import { monthCalendar, monthsInTiming } from './homeCalendar.ts'
import { timingIsPast, upcomingAssessments } from './upcomingAssessments.ts'

const context = { subjects: [{ subjectId: 'KOR', name: '공통국어2' }, { subjectId: 'MAT', name: '공통수학2' }, { subjectId: 'ENG', name: '공통영어2' }], catalogSubjects: [] }
const nameOf = (id) => context.subjects.find((s) => s.subjectId === id)?.name ?? id
const row = (rowKey, schedule, unit) => ({ rowKey, unit, content: `${unit} 내용`, schedule, sources: [{ pdfPageNumber: 1 }] })
const entry = (id, subjectName, schedule, unit) => entryFromRow(row(id, schedule, unit), { id, subjectName, status: 'CONFIRMED', academicYear: 2026 })
const entries = [
  entry('k1', '공통국어2', { precision: 'EXACT_DATE', dateFrom: { year: 2026, month: 10, day: 14 }, monthFrom: 10 }, '토론'),
  entry('k2', '공통국어2', { precision: 'WEEK_IN_MONTH', monthFrom: 10, weekFrom: 2, weekTo: 2, weekLabel: '2주' }, '어휘'),
  entry('m1', '공통수학2', { precision: 'MONTH', monthFrom: 10 }, '도형의 방정식'),
  entry('m2', '공통수학2', { precision: 'EXACT_DATE', dateFrom: { year: 2026, month: 10, day: 14 }, monthFrom: 10 }, '원의 방정식'),
  entry('e1', '공통영어2', { precision: 'EXACT_DATE', dateFrom: { year: 2026, month: 10, day: 14 }, monthFrom: 10 }, 'Unit 5'),
  entry('e2', '공통영어2', null, '시기 미정 단원'),
  entry('x1', '공통영어2', { precision: 'MONTH', monthFrom: 3 }, '학기 밖'),
]
const plans = [{
  planId: 'P1', documentRevisionId: 'R1', confirmedFields: [
    { subjectId: 'KOR', fieldPath: 'writtenEvaluation.exams[0].timing', value: '9-10월', pdfPageNumber: 1 },
    { subjectId: 'MAT', fieldPath: 'writtenEvaluation.exams[0].label', value: '기말고사', pdfPageNumber: 1 },
    { subjectId: 'MAT', fieldPath: 'writtenEvaluation.exams[0].timing', value: '12월', pdfPageNumber: 1 },
  ],
}]
const a = (id, o) => ({ assessmentId: id, subjectId: 'KOR', title: id, status: 'BEFORE_START', deadlineDate: null, evaluationDate: null, evaluationItemRef: null, createdAt: '', ...o })
const assessments = [
  a('보고서 쓰기', { evaluationDate: '2026-10-14', deadlineDate: '2026-11-02' }), // 마감이 다음 달
  a('발표자료 제출', { subjectId: 'ENG', deadlineDate: '2026-10-14' }),
  a('학교 확정 탐구', { official: { planId: 'P1', status: 'ACTIVE', timing: '10월', weightPercent: 20, maxScore: 20 } }),
  a('수시 과제', { subjectId: 'MAT', official: { planId: 'P1', status: 'ACTIVE', timing: '수시', weightPercent: 10, maxScore: 10 } }),
  a('빠진 항목', { official: { planId: 'P1', status: 'WITHDRAWN', timing: '10월', weightPercent: 20, maxScore: 20 } }),
]
const base = { academicYear: 2026, planEntries: entries, assessments, confirmedPlans: plans, context, subjectName: nameOf }

test('10월: 일~토 날짜 칸(목요일 시작, 31일) · 같은 날 여러 과목 일정은 중요한 것 먼저(마감 → 수행 → 수업) · 과목 이름 · 잠정 없음', () => {
  const cal = monthCalendar({ ...base, month: 10 })
  assert.equal(cal.year, 2026)
  assert.equal(cal.cells.length % 7, 0)
  assert.equal(cal.cells.indexOf('2026-10-01'), 4, '2026-10-01 은 목요일')
  assert.equal(cal.cells.filter(Boolean).length, 31)
  const day = cal.byDate['2026-10-14'].map((e) => `${e.kind}:${e.subject}`)
  assert.deepEqual(day, ['deadline:공통영어2', 'evaluation:공통국어2', 'plan:공통국어2', 'plan:공통수학2', 'plan:공통영어2'])
  // A28-33(A28-26 규칙 변경): 'n월 2주'는 달력 2번째 줄(10/4~10/10) 평일 첫날에, '10월'만 적힌 수학 계획은 그 달 평일 가운데쯤에 개인 임시 배치
  const all = [...Object.values(cal.byDate).flat(), ...cal.monthUndated, ...cal.noTiming]
  assert.ok(all.every((e) => ['deadline', 'evaluation', 'written', 'plan'].includes(e.kind)))
  const week = cal.byDate['2026-10-05'].find((e) => e.title === '어휘')
  assert.deepEqual(week.tentative, { sourceKey: 'k2', rangeFrom: '2026-10-04', rangeTo: '2026-10-10', date: '2026-10-05', defaultDate: '2026-10-05', moved: false })
  assert.equal(week.meta, '원문: 10월 2주 · 달력 개인 임시 배치 · 공식 날짜 미확정')
  const monthOnly = cal.byDate['2026-10-16'].find((e) => e.title === '도형의 방정식')
  assert.equal(monthOnly.tentative.rangeFrom, '2026-10-01')
  assert.equal(monthOnly.tentative.rangeTo, '2026-10-31')
  // 원문 날짜 행은 임시 배치가 아니다
  assert.ok(cal.byDate['2026-10-14'].filter((e) => e.kind === 'plan').every((e) => !e.tentative))
  // 날짜 없는 것: 학교 확정 수행평가(10월) · 지필(9-10월). 빠진(WITHDRAWN) 항목·학기 밖 계획은 없음
  assert.deepEqual(cal.monthUndated.map((e) => `${e.kind}:${e.title}`).sort(), ['evaluation:학교 확정 탐구', 'written:지필평가 1'])
  assert.ok(!Object.values(cal.byDate).flat().some((e) => e.title === '빠진 항목'))
  assert.ok(!cal.monthUndated.some((e) => e.title === '학기 밖'))
  // 시기 미정: '수시' 학교 확정 수행평가만(시기 없는 운영계획 행은 홈에서 보이지 않음 — 월별 운영계획 화면에 그대로)
  assert.deepEqual(cal.noTiming.map((e) => e.title), ['수시 과제'])
  // 운영계획 = 원문 날짜 행 3(국어·수학·영어 10/14) + 임시 배치 2(주차·월)
  assert.deepEqual(cal.counts, { mine: 2, plans: 5, written: 1, undated: 2 })
})

test('다음 달 경계·지필 날짜 미정·과목 필터·윤년', () => {
  const nov = monthCalendar({ ...base, month: 11 })
  assert.equal(nov.byDate['2026-11-02'][0].kind, 'deadline')
  const dec = monthCalendar({ ...base, month: 12 })
  assert.deepEqual(dec.monthUndated.map((e) => `${e.kind}:${e.subject}:${e.title}`), ['written:공통수학2:기말고사'])
  assert.equal(Object.keys(dec.byDate).length, 0, '시기만 있는 시험은 날짜 칸에 두지 않는다')
  const mathOnly = monthCalendar({ ...base, month: 10, subject: '공통수학2' })
  assert.ok(Object.values(mathOnly.byDate).flat().every((e) => e.subject === '공통수학2'))
  assert.ok(mathOnly.monthUndated.every((e) => e.subject === '공통수학2'))
  // 2학기 2월: 2027-02 (윤년 아님 28일). 1학기 2028 학년도 2월은 없음 — 2학기 2028 → 2029-02(28일)
  const feb = monthCalendar({ ...base, academicYear: 2027, month: 2, planEntries: [], assessments: [], confirmedPlans: [] })
  assert.equal(feb.year, 2028)
  assert.equal(feb.cells.filter(Boolean).length, 29, '2028년 2월은 윤년(29일)')
})

test('시기 문장 해석·지난 시기', () => {
  assert.deepEqual(monthsInTiming('9-10월'), [9, 10])
  assert.deepEqual(monthsInTiming('3월~6월'), [3, 4, 5, 6])
  assert.deepEqual(monthsInTiming('12~2월'), [12, 1, 2])
  assert.deepEqual(monthsInTiming('5월 3-4주'), [5])
  assert.deepEqual(monthsInTiming('수시'), [])
  assert.equal(timingIsPast('9월', '2026-11-22'), true)
  assert.equal(timingIsPast('10-12월', '2026-11-22'), false)
  assert.equal(timingIsPast('1월', '2026-11-22'), false)
  assert.equal(timingIsPast(null, '2026-11-22'), false)
})

test('A28-20 홈 다가오는 수행평가: 학교 확정 자동 등록 항목은 공식 항목 자리에 한 번만, 지난 시기는 뒤로', () => {
  const confirmed = [{
    planId: 'P1', documentRevisionId: 'R1', confirmedFields: [
      { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[0].label', value: '사회적 독서 활동', pdfPageNumber: 1 },
      { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[0].timing', value: '9월', pdfPageNumber: 1 },
      { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[1].label', value: '보고서 쓰기', pdfPageNumber: 1 },
      { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[1].timing', value: '12월', pdfPageNumber: 1 },
    ],
  }]
  const ref = (key) => ({ documentRevisionId: 'R1', subjectId: 'KOR', itemKey: key })
  const items = [
    a('auto1', { title: '사회적 독서 활동', evaluationItemRef: ref('P01'), official: { planId: 'P1', status: 'ACTIVE', timing: '9월' } }),
    a('auto2', { title: '보고서 쓰기', evaluationItemRef: ref('P02'), official: { planId: 'P1', status: 'ACTIVE', timing: '12월' } }),
    a('own', { title: '사회적 독서와 관련된 책 읽기', evaluationDate: '2026-11-30', deadlineDate: '2026-12-01' }),
  ]
  const view = upcomingAssessments(items, confirmed, context, '2026-11-22')
  assert.deepEqual(view.officialUndated.map((e) => [e.label, e.assessmentId, Boolean(e.past)]), [['보고서 쓰기', 'auto2', false], ['사회적 독서 활동', 'auto1', true]])
  assert.deepEqual(view.dated.map((e) => e.assessment.assessmentId), ['own'])
})

test('A28-33 개인 임시 배치: 범위 안 저장값만 쓰고, 여러 달·주 줄 없는 달·학기 주차는 배치하지 않으며 결정적이다', () => {
  const list = [
    entry('w1', '공통국어2', { precision: 'WEEK_IN_MONTH', monthFrom: 11, weekFrom: 2, weekTo: 2, weekLabel: '2주' }, '국어 2주'),
    entry('w2', '공통수학2', { precision: 'WEEK_IN_MONTH', monthFrom: 11, weekFrom: 2, weekTo: 2, weekLabel: '2주' }, '수학 2주'),
    entry('w6', '공통수학2', { precision: 'WEEK_IN_MONTH', monthFrom: 11, weekFrom: 7, weekTo: 7, weekLabel: '7주' }, '없는 주'),
    entry('r1', '공통영어2', { precision: 'MONTH_RANGE', monthFrom: 11, monthTo: 12 }, '여러 달'),
    entry('t1', '공통영어2', { precision: 'TERM_WEEK', monthFrom: 11, weekFrom: 10, weekScope: 'TERM_SEQUENCE' }, '학기 주차'),
    entry('n1', '공통영어2', { precision: 'MONTH', monthFrom: 11 }, '11월 A'),
    entry('n2', '공통국어2', { precision: 'MONTH', monthFrom: 11 }, '11월 B'),
  ]
  const at = (cal) => Object.fromEntries(Object.entries(cal.byDate).flatMap(([iso, events]) => events.filter((e) => e.tentative).map((e) => [e.title, iso])))
  const first = monthCalendar({ ...base, month: 11, planEntries: list, assessments: [], confirmedPlans: [] })
  const again = monthCalendar({ ...base, month: 11, planEntries: list, assessments: [], confirmedPlans: [] })
  assert.deepEqual(at(first), at(again), '같은 입력이면 같은 날짜')
  // 2026-11-01 은 일요일 → 2번째 줄 11/8~11/14, 평일 11/9부터 (과목명 순: 국어 → 수학)
  assert.equal(at(first)['국어 2주'], '2026-11-09')
  assert.equal(at(first)['수학 2주'], '2026-11-10')
  // 월만 적힌 두 행은 서로 다른 날로 펼친다
  assert.notEqual(at(first)['11월 A'], at(first)['11월 B'])
  assert.ok(!('없는 주' in at(first)) && !('여러 달' in at(first)) && !('학기 주차' in at(first)))
  assert.ok(first.monthUndated.some((e) => e.title === '여러 달'), '여러 달 행은 이달 날짜 미정에 그대로')
  // 저장값: 범위 안이면 그 날짜(moved), 범위 밖(시기가 바뀜)이면 기본 날짜
  const moved = monthCalendar({ ...base, month: 11, planEntries: list, assessments: [], confirmedPlans: [], placements: { w1: '2026-11-13', w2: '2026-11-20' } })
  const w1 = Object.values(moved.byDate).flat().find((e) => e.title === '국어 2주')
  assert.equal(w1.tentative.date, '2026-11-13')
  assert.equal(w1.tentative.moved, true)
  assert.equal(w1.tentative.defaultDate, '2026-11-09')
  assert.equal(at(moved)['수학 2주'], '2026-11-10')
})
