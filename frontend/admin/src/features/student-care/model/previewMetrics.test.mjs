import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PREVIEW_AS_OF, previewDailyStudy, previewScenario } from '../api/previewData.ts'
import { compareMetric } from './metricComparison.ts'
import { buildPreviewMetrics } from './previewMetrics.ts'

const build = (id, period = 28, weekdays = false) => buildPreviewMetrics(id, PREVIEW_AS_OF,
  previewDailyStudy(id), previewScenario(id).usualDailyMinutes, period, weekdays)
const metric = (id, type) => build(id).metrics.find(item => item.type === type)
const comparison = (id, type) => compareMetric(metric(id, type), PREVIEW_AS_OF)
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('comparison values agree with the raw execution, start and subject fixtures', () => {
  close(comparison('stu_004', 'EXECUTION_GAP').current, 53)
  close(comparison('stu_004', 'EXECUTION_GAP').before, 88)
  assert.equal(comparison('stu_006', 'START_TIME_SHIFT').before, 1150)
  assert.equal(comparison('stu_006', 'START_TIME_SHIFT').current, 1300)
  assert.equal(comparison('stu_005', 'SUBJECT_SHARE').before, 30)
  assert.equal(comparison('stu_005', 'SUBJECT_SHARE').current, 10)
})

test('submission considers all seven days, including days without attendance', () => {
  close(comparison('stu_002', 'PLAN_MISSING').current, 3 / 7 * 100)
  assert.equal(comparison('stu_002', 'PLAN_MISSING').before, 100)
  assert.equal(metric('stu_002', 'PLAN_MISSING').view.days.length, 28)
})

test('attendance calendar and recent weekly value use the actual preview daily presence', () => {
  const daily = previewDailyStudy('stu_001')
  const view = metric('stu_001', 'CONSECUTIVE_ABSENCE').view
  assert.equal(view.weeks.at(-1).value, 1)
  for (const day of daily) {
    assert.equal(view.calendar.find(item => item.date === day.date).came, day.minutes > 0)
  }
})

test('subject shares stay at 100 and cropping does not change recent comparison values', () => {
  const view = metric('stu_005', 'SUBJECT_SHARE').view
  close(view.subjects.reduce((sum, item) => sum + item.plan, 0), 100)
  close(view.subjects.reduce((sum, item) => sum + item.actual, 0), 100)
  const short = build('stu_006', 14).metrics.find(item => item.type === 'START_TIME_SHIFT')
  assert.ok(short.view.days.every(day => day.date >= '2026-10-11'))
  assert.equal(compareMetric(short, PREVIEW_AS_OF).current, 1300)
})

test('weekend exclusions skip submission targets and attendance, not zero-fill comparisons', () => {
  const result = build('stu_002', 28, true)
  const submissions = result.metrics.find(item => item.type === 'PLAN_MISSING').view.days
  for (const day of submissions) {
    const weekend = [0, 6].includes(new Date(day.date + 'T00:00:00Z').getUTCDay())
    if (weekend) assert.equal(day.state, 'skip')
  }
  const attendance = result.metrics.find(item => item.type === 'CONSECUTIVE_ABSENCE').view
  for (const day of attendance.calendar.filter(day => day.skip)) assert.equal(day.came, false)
})
