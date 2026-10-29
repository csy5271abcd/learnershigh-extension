import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBranchOverview, metricContributors } from './branchOverview.ts'

const first = '2026-10-19', second = '2026-10-20'
const day = (date, values = {}) => ({ date, attendance: 'present', submission: 'submitted', scheduled: true, minutes: 100, start: 600, planned: null, actual: null, ...values })
const base = (date, values = {}) => ({ date, minutes: 100, start: 600, samples: 4, ...values })
const row = (id, days, weekdayBaseline = days.map(d => base(d.date))) => ({ student: { studentId: id, studentName: `학생 ${id}` }, review: { days, weekdayBaseline, baselineDays: [] } })
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`)

test('study pairs own weekday expectations and preserves signed offset contributions', () => {
  const rows = [row('down', [day(first, { minutes: 0 })]), row('up', [day(first, { minutes: 150 })])]
  const metric = buildBranchOverview(rows).metrics.study
  assert.equal(metric.value, 150)
  assert.equal(metric.baseline, 200)
  close(metric.change, -25)
  assert.deepEqual(metric.contributors.map(c => [c.studentId, c.delta, c.impact]), [['down', -100, -50], ['up', 50, 25]])
  close(metric.contributors.reduce((s, c) => s + c.impact, 0), metric.change)
})

test('morning and evening arrivals share the same personal twenty minute shift', () => {
  const rows = [row('morning', [day(first, { start: 500 })], [base(first, { start: 480 })]), row('evening', [day(first, { start: 1100 })], [base(first, { start: 1080 })])]
  const metric = buildBranchOverview(rows, [], 20).metrics.arrival
  assert.equal(metric.value, 20)
  assert.equal(metric.baseline, 0)
  assert.equal(metric.change, 20)
  assert.equal(metric.lateCount, 2)
  assert.deepEqual(metric.contributors.map(c => c.delta), [20, 20])
  assert.equal(metric.contributors.reduce((s, c) => s + c.impact, 0), 20)
})

test('arrival impacts use observation weights and retain an improving offset', () => {
  const rows = [row('later', [day(first, { start: 660 }), day(second, { start: 660 })]), row('earlier', [day(first, { start: 570 })])]
  const metric = buildBranchOverview(rows).metrics.arrival
  assert.equal(metric.value, 30)
  assert.equal(metric.samples, 3)
  assert.equal(metric.contributors.find(c => c.studentId === 'earlier').impact, -10)
  assert.equal(metric.contributors.reduce((s, c) => s + c.impact, 0), metric.change)
})

test('true zero is paired while unknown current or expected values exclude both sides', () => {
  const rows = [row('a', [day(first, { minutes: 0 }), day(second, { minutes: null })]), row('b', [day(first, { minutes: 999 })], [base(first, { minutes: null })])]
  const metric = buildBranchOverview(rows).metrics.study
  assert.equal(metric.value, 0)
  assert.equal(metric.baseline, 100)
  assert.equal(metric.change, -100)
  assert.equal(metric.samples, 1)
  assert.equal(metric.missing, 2)
  assert.equal(metric.daily[1].value, null)
})

test('excluding a student recalculates current, benchmark, and contribution denominators', () => {
  const rows = [row('a', [day(first, { minutes: 50, start: 660 })]), row('b', [day(first, { minutes: 300, start: 570 })], [base(first, { minutes: 200 })])]
  const result = buildBranchOverview(rows, ['b', 'b', 'stale'])
  assert.equal(result.totalCount, 2)
  assert.equal(result.includedCount, 1)
  assert.equal(result.excludedCount, 1)
  assert.equal(result.metrics.study.value, 50)
  assert.equal(result.metrics.study.baseline, 100)
  assert.equal(result.metrics.study.change, -50)
  assert.equal(result.metrics.arrival.value, 60)
  assert.equal(result.metrics.arrival.contributors[0].impact, 60)
})

test('date accessor recomputes daily denominators and excludes other days', () => {
  const rows = [row('a', [day(first, { minutes: 50 }), day(second, { minutes: 200 })]), row('b', [day(first, { minutes: 200 })])]
  const contributors = metricContributors(rows, 'study', [], 60, second)
  assert.deepEqual(contributors.map(c => [c.studentId, c.current, c.baseline, c.impact, c.samples]), [['a', 200, 100, 100, 1]])
  assert.deepEqual(metricContributors(rows, 'study', [], 60, 'missing-date'), [])
  assert.deepEqual(metricContributors(rows, 'study', ['a'], 60, second), [])
})

test('absence counts observed nonentries regardless of an assumed schedule', () => {
  const rows = [row('a', [day(first, { attendance: 'absent' }), day(second, { attendance: 'absent', scheduled: null }), day('2026-10-21', { attendance: 'unknown' }), day('2026-10-22', { attendance: 'absent', scheduled: false })])]
  const metric = buildBranchOverview(rows).metrics.absence
  assert.equal(metric.value, 3)
  assert.equal(metric.samples, 3)
  assert.equal(metric.missing, 1)
  assert.equal(metric.baseline, null)
  assert.equal(metric.change, null)
  assert.equal(metric.contributors[0].baseline, null)
  assert.equal(metric.contributors[0].impact, 3)
})

test('submission counts known plans and missing records separately without prior rate', () => {
  const rows = [row('a', [day(first, { submission: 'missing', scheduled: null }), day(second), day('2026-10-21', { submission: 'unknown' }), day('2026-10-22', { submission: 'missing', scheduled: false }), day('2026-10-23', { submission: 'excluded' })])]
  const metric = buildBranchOverview(rows).metrics.submission
  assert.equal(metric.value, 1)
  assert.equal(metric.samples, 2)
  assert.equal(metric.missing, 1)
  assert.equal(metric.baseline, null)
  assert.equal(metric.change, null)
  assert.equal(metric.contributors[0].delta, 1)
  assert.equal(metric.daily.find(d => d.date === '2026-10-21').value, null)
})

test('arrival excludes confirmed absence and non-scheduled days from missing coverage', () => {
  const rows = [row('a', [day(first, { attendance: 'absent', start: null }), day(second, { start: null }), day('2026-10-21', { attendance: 'unknown' }), day('2026-10-22', { scheduled: false }), day('2026-10-23', { attendance: 'excluded' })])]
  const metric = buildBranchOverview(rows).metrics.arrival
  assert.equal(metric.samples, 0)
  assert.equal(metric.missing, 2)
  assert.equal(metric.value, null)
  assert.equal(metric.baseline, null)
  assert.equal(metric.change, null)
})

test('arrival missing weekday benchmark removes both sides and daily impact uses that day only', () => {
  const rows = [row('a', [day(first, { start: 660 }), day(second, { start: 570 })]), row('b', [day(first, { start: 1200 })], [base(first, { start: null })])]
  const metric = buildBranchOverview(rows).metrics.arrival
  assert.equal(metric.samples, 2)
  assert.equal(metric.missing, 1)
  assert.equal(metric.value, 15)
  assert.deepEqual(metric.daily.map(d => [d.value, d.baseline, d.samples, d.missing]), [[60, 0, 1, 1], [-30, 0, 1, 0]])
  assert.deepEqual(metricContributors(rows, 'arrival', [], 60, second).map(c => [c.current, c.baseline, c.delta, c.impact]), [[570, 600, -30, -30]])
})

test('zero study baseline has no percentage or percentage point contribution', () => {
  const metric = buildBranchOverview([row('a', [day(first)], [base(first, { minutes: 0 })])]).metrics.study
  assert.equal(metric.value, 100)
  assert.equal(metric.baseline, 0)
  assert.equal(metric.change, null)
  assert.equal(metric.contributors[0].delta, 100)
  assert.equal(metric.contributors[0].impact, 0)
})

test('empty and all excluded rosters retain dates and null values safely', () => {
  assert.deepEqual(buildBranchOverview([]).dates, [])
  const result = buildBranchOverview([row('a', [day(second), day(first)])], ['a'])
  assert.deepEqual(result.dates, [first, second])
  for (const metric of Object.values(result.metrics)) {
    assert.equal(metric.value, null)
    assert.equal(metric.samples, 0)
    assert.equal(metric.missing, 0)
    assert.deepEqual(metric.contributors, [])
    assert.ok(metric.daily.every(d => d.value === null))
  }
})

test('contributors sort by absolute impact then stable ID and never mutate input', () => {
  const rows = [row('b', [day(first, { minutes: 50 })]), row('a', [day(first, { minutes: 150 })])]
  const before = structuredClone(rows)
  assert.deepEqual(buildBranchOverview(rows).metrics.study.contributors.map(c => c.studentId), ['a', 'b'])
  assert.deepEqual(rows, before)
})
