import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareMetric, formatMetricValue, formatMetricDelta } from './metricComparison.ts'

test('study comparison uses the same weekly unit and percent denominator', () => {
  const result = compareMetric({ type: 'STUDY_DROP', label: '공부 시간', view: { kind: 'weekly', unit: 'minutes', usual: 600, weeks: [{ value: 300 }] } }, '2026-09-30')
  assert.equal(result.before, 600)
  assert.equal(result.current, 300)
  assert.equal(formatMetricValue(300, result.unit), '5시간')
  assert.equal(formatMetricDelta(result), '50% 감소')
})

test('missing comparison and absent start records are not displayed as zero', () => {
  const study = compareMetric({ type: 'STUDY_DROP', label: '공부 시간', view: { kind: 'weekly', unit: 'minutes', usual: 0, weeks: [{ value: 0 }] } }, '2026-09-30')
  const time = compareMetric({ type: 'START_TIME_SHIFT', label: '입실 시각', view: { kind: 'line', usual: 1140, days: [{ date: '2026-09-30', value: null }] } }, '2026-09-30')
  assert.equal(study.before, null)
  assert.equal(time.current, null)
  assert.equal(formatMetricValue(null, 'clock'), '기록 없음')
  assert.equal(formatMetricDelta(study), '비교할 데이터 없음')
})

test('plan execution compares calendar periods, not the last 14 attended records', () => {
  const result = compareMetric({ type: 'EXECUTION_GAP', label: '계획 달성', view: { kind: 'planActual', days: [
    { date: '2026-09-09', planned: 100, actual: 80 },
    { date: '2026-09-18', planned: 100, actual: 50 },
    { date: '2026-09-29', planned: 100, actual: 50 },
  ] } }, '2026-09-30')
  assert.equal(result.before, 80)
  assert.equal(result.current, 50)
  assert.equal(formatMetricDelta(result), '30%p 감소')
})

test('subject share labels the comparator as the plan and uses percentage points', () => {
  const result = compareMetric({ type: 'SUBJECT_SHARE', label: '과목 계획', view: { kind: 'share', worst: '수학', subjects: [{ name: '수학', plan: 30, actual: 12 }] } }, '2026-09-30')
  assert.equal(result.beforeLabel, '수학 계획')
  assert.equal(result.before, 30)
  assert.equal(result.current, 12)
  assert.equal(formatMetricDelta(result), '18%p 부족')
})

test('submission rates exclude days that are not attendance targets', () => {
  const result = compareMetric({ type: 'PLAN_MISSING', label: '계획 제출', view: { kind: 'dateList', days: [
    { date: '2026-09-10', state: 'ok' }, { date: '2026-09-11', state: 'missOld' },
    { date: '2026-09-29', state: 'ok' }, { date: '2026-09-30', state: 'skip' },
  ] } }, '2026-09-30')
  assert.equal(result.before, 50)
  assert.equal(result.current, 100)
})

test('clock rounding carries minutes and study increases stay signed correctly', () => {
  assert.equal(formatMetricValue(1199.7, 'clock'), '20:00')
  assert.equal(formatMetricDelta({type:'START_TIME_SHIFT',unit:'clock',before:1152.5,current:1160}), '7분 늦어짐')
  const result = compareMetric({ type: 'STUDY_DROP', label: '공부 시간', view: { kind: 'weekly', unit: 'minutes', usual: 600, weeks: [{ value: 900 }] } }, '2026-09-30')
  assert.equal(formatMetricDelta(result), '50% 증가')
})

test('attendance summary counts distinct days instead of treating daily presence as event frequency',()=>{
 const result=compareMetric({type:'CONSECUTIVE_ABSENCE',label:'출결',view:{kind:'weekly',unit:'count',usual:5,weeks:[{value:3}]}},'2026-10-24')
 assert.equal(result.unit,'days')
 assert.equal(formatMetricValue(result.current,result.unit),'3일')
 assert.equal(formatMetricDelta(result),'2일 감소')
})
