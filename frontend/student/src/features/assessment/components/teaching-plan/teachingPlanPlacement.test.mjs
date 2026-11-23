// A26 월별 운영계획 주차 임시 배치 시험 (node --test, Node 22 타입 제거로 .ts를 직접 읽는다). 합성 계획만 쓴다.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarYear, entryFromRow, monthsOf, placeEntries, semesterMonths } from './teachingPlanPlacement.ts'

let seq = 0
const entry = (subjectName, schedule, extra = {}) =>
  entryFromRow({ rowKey: `r${++seq}`, unit: `${subjectName} 단원`, schedule, ...extra }, { id: `${subjectName}|r${seq}`, subjectName, status: 'CONFIRMED', academicYear: 2026 })
const week = (month, from, to = null) => ({ precision: 'WEEK_IN_MONTH', monthFrom: month, weekFrom: from, weekTo: to, weekScope: 'IN_MONTH' })
const daysOf = (placement, id) => placement.tentativeDates[id] ?? []
const dayNo = (iso) => Number(iso.slice(8, 10))

test('Case1·2: 2026년 3월 2주는 3월 8~14일, 3주는 15~21일 안에만 놓인다 (월~금 우선)', () => {
  const a = entry('국어', week(3, 2))
  const b = entry('영어', week(3, 3))
  const placement = placeEntries([a, b], 2026, 3)
  for (const iso of daysOf(placement, a.id)) assert.ok(iso.startsWith('2026-03-') && dayNo(iso) >= 9 && dayNo(iso) <= 13, iso)
  for (const iso of daysOf(placement, b.id)) assert.ok(iso.startsWith('2026-03-') && dayNo(iso) >= 16 && dayNo(iso) <= 20, iso)
  assert.equal(daysOf(placement, a.id).length, 1)
  assert.equal(placement.weekBands.length, 0, '배치된 계획은 주차 줄에 겹쳐 두지 않는다')
})

test('Case3: 4월 2주는 4월 달력 두 번째 줄(4/5~4/11)에만, 3월 달력에는 나오지 않는다', () => {
  const april = entry('수학', week(4, 2))
  const placement = placeEntries([april], 2026, 4)
  const [iso] = daysOf(placement, april.id)
  assert.ok(iso >= '2026-04-06' && iso <= '2026-04-10', iso)
  assert.deepEqual(placeEntries([april], 2026, 3).tentativeDates, {})
})

test('Case4·5: 같은 주 20개는 주중에 고르게 나뉘고 누락 없이, 다시 계산해도 같은 날짜', () => {
  const list = Array.from({ length: 20 }, (_, index) => entry(`과목${String(index).padStart(2, '0')}`, week(3, 2)))
  const first = placeEntries(list, 2026, 3)
  const again = placeEntries([...list].reverse(), 2026, 3)
  assert.deepEqual(first.tentativeDates, again.tentativeDates, '입력 순서와 무관하게 결정적')
  const counts = {}
  for (const item of list) {
    const [iso] = daysOf(first, item.id)
    assert.ok(iso >= '2026-03-09' && iso <= '2026-03-13', iso)
    counts[iso] = (counts[iso] ?? 0) + 1
  }
  assert.deepEqual(Object.values(counts), [4, 4, 4, 4, 4], '월~금 4개씩')
  const shown = first.cells.filter(Boolean).reduce((sum, cell) => sum + cell.tentativeIds.length, 0)
  assert.equal(shown, 20, '모두 달력 칸에 있다')
})

test('Case6: 원문이 3월 12일이면 그 날짜 그대로(임시 배치 아님)', () => {
  const dated = entry('과학', { precision: 'EXACT_DATE', monthFrom: 3, dateFrom: { year: null, month: 3, day: 12 } })
  const placement = placeEntries([dated], 2026, 3)
  const cell = placement.cells.find((candidate) => candidate?.iso === '2026-03-12')
  assert.ok(cell.entries.includes(dated))
  assert.deepEqual(cell.tentativeIds, [])
  assert.deepEqual(placement.tentativeDates, {})
})

test('Case7: 3월 2~3주는 2주차·3주차 줄에 한 번씩(기간), 원문 행은 하나', () => {
  const span = entry('사회', week(3, 2, 3))
  const dates = daysOf(placeEntries([span], 2026, 3), span.id)
  assert.equal(dates.length, 2)
  assert.ok(dayNo(dates[0]) >= 9 && dayNo(dates[0]) <= 13)
  assert.ok(dayNo(dates[1]) >= 16 && dayNo(dates[1]) <= 20)
})

test('Case8: 1일이 일요일이 아닌 달 — 2026년 4월(수요일 시작) 1주는 4/1~4/4 중 주중, 5월(금요일 시작) 1주는 5/1', () => {
  const april = entry('국어', week(4, 1))
  const [aprilDay] = daysOf(placeEntries([april], 2026, 4), april.id)
  assert.ok(aprilDay >= '2026-04-01' && aprilDay <= '2026-04-03', aprilDay)
  const may = entry('영어', week(5, 1))
  assert.deepEqual(daysOf(placeEntries([may], 2026, 5), may.id), ['2026-05-01'])
})

test('주말만 있는 첫 줄·없는 주차·학기 주차·연도 미확정 달은 날짜를 만들지 않거나 그 줄 안에서만', () => {
  // 2026년 8월 1일은 토요일 → 1주 줄은 8/1뿐 → 그 날짜 사용
  const august = entry('국어', week(8, 1))
  assert.deepEqual(daysOf(placeEntries([august], 2026, 8), august.id), ['2026-08-01'])
  // 2026년 2월(학년도 2026의 2월 → 연도 미확정) → 달력 없음 → 배치 없음
  const feb = entry('국어', week(2, 2))
  assert.deepEqual(placeEntries([feb], 2026, 2).tentativeDates, {})
  // 3월 6주는 줄이 없다 → 주차 줄에 남는다
  const sixth = entry('국어', week(3, 6))
  const placement = placeEntries([sixth], 2026, 3)
  assert.deepEqual(placement.tentativeDates, {})
  assert.equal(placement.weekBands[0].entries[0], sixth)
  // 학기 누적 주차는 날짜로 바꾸지 않는다
  const term = entry('국어', { precision: 'TERM_WEEK', monthFrom: 3, weekFrom: 2, weekScope: 'TERM_SEQUENCE' })
  assert.deepEqual(placeEntries([term], 2026, 3).tentativeDates, {})
})

test('원문 시기 값은 바뀌지 않는다(표시용 계산만)', () => {
  const original = entry('국어', week(3, 2))
  const before = JSON.stringify(original)
  placeEntries([original], 2026, 3)
  assert.equal(JSON.stringify(original), before)
})

test('A28-36 학기 월: 1학기 3~8월, 2학기 8~12월 + 다음 해 1월(2월 제외), 1월 연도 = 학년도 + 1', () => {
  assert.deepEqual(semesterMonths(1), [3, 4, 5, 6, 7, 8])
  assert.deepEqual(semesterMonths(2), [8, 9, 10, 11, 12, 1])
  assert.ok(!semesterMonths(2).includes(2))
  assert.equal(calendarYear(2026, 8), 2026)
  assert.equal(calendarYear(2026, 12), 2026)
  assert.equal(calendarYear(2026, 1), 2027)
  assert.equal(calendarYear(2027, 1), 2028)
  assert.equal(calendarYear(2026, 2), null)
})

test('A28-36 2026-12 → 2027-01 경계: 1월 1주는 2027년 1월 달력 첫 줄 안, 1월 날짜 원문은 2027년 칸', () => {
  const jan = entry('국어', week(1, 1))
  const placement = placeEntries([jan], 2026, 1)
  assert.equal(placement.year, 2027)
  const [day] = daysOf(placement, jan.id)
  assert.match(day, /^2027-01-0[1-3]$/, '2027-01-01 은 금요일 → 첫 줄 1~2일(평일 금)')
  const dated = entry('수학', { precision: 'EXACT_DATE', monthFrom: 1, dateFrom: { year: null, month: 1, day: 8 } })
  assert.equal(dated.dateFrom, '2027-01-08')
  const dec = placeEntries([entry('영어', week(12, 5))], 2026, 12)
  assert.equal(dec.year, 2026)
})

test('A28-36 2학기 8월 운영계획은 2학기 달에 들고, 2월 행은 2학기 밖', () => {
  const aug = entry('과학', week(8, 4))
  const feb = entry('과학', { precision: 'MONTH', monthFrom: 2 })
  const months = semesterMonths(2)
  assert.ok(monthsOf(aug).some((m) => months.includes(m)), '8월은 2학기 안')
  assert.ok(!monthsOf(feb).some((m) => months.includes(m)), '2월은 2학기 밖')
  const placement = placeEntries([aug], 2026, 8)
  assert.equal(placement.year, 2026)
  assert.equal(daysOf(placement, aug.id).length, 1)
})
