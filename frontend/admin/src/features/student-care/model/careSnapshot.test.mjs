import { test } from 'node:test'
import assert from 'node:assert/strict'
import { studentCareApi } from '../api/studentCareApi.ts'
import { buildCareSnapshot, attendanceLabel, submissionLabel } from './careSnapshot.ts'

test('date evidence keeps attendance and submission independent and shows every calendar day', async () => {
  const detail = await studentCareApi.detail('br_gangnam', 'stu_002')
  const snapshot = buildCareSnapshot(detail)
  assert.equal(snapshot.days.length, 14)
  const recent = snapshot.days.slice(-7)
  assert.equal(recent.filter(d => d.attendance === 'absent').length, 2)
  assert.equal(recent.filter(d => d.submission === 'missing').length, 4)
  assert.equal(recent.filter(d => d.attendance === 'absent' && d.submission === 'missing').length, 1)
  assert.equal(snapshot.recent.missingPlans, 4)
  assert.equal(snapshot.recent.minutesPerVisit, 250)
  assert.deepEqual(recent.map(d => d.date), ['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24'])
})
test('deferred judgment still preserves observed daily records; no attendance is not a proven absence', async () => {
  const detail = await studentCareApi.detail('br_gangnam', 'stu_008')
  const snapshot = buildCareSnapshot(detail)
  assert.equal(snapshot.deferred, true)
  assert.equal(snapshot.recent.attended, 2)
  assert.equal(attendanceLabel('absent'), '미입실')
  assert.equal(attendanceLabel('unknown'), '기록 없음')
  assert.equal(submissionLabel('excluded'), '제외')
})
test('weekend exclusion keeps date positions and does not disguise excluded days as missing', async () => {
  const detail = await studentCareApi.detail('br_gangnam', 'stu_002')
  const snapshot = buildCareSnapshot(detail, 28, true)
  assert.equal(snapshot.days.length, 28)
  const end = snapshot.days.at(-1)
  assert.equal(end.attendance, 'excluded')
  assert.equal(end.submission, 'excluded')
  assert.equal(end.minutes, null)
  assert.equal(end.start, null)
  assert.equal(end.actual, null)
})

test('planned versus actual uses the same observed learning minutes and leaves unsubmitted plans unavailable', async () => {
  const detail = await studentCareApi.detail('br_gangnam', 'stu_002')
  const snapshot = buildCareSnapshot(detail)
  for (const day of snapshot.days) {
    if (day.submission === 'missing' || day.attendance !== 'present') assert.equal(day.planned, null)
    if (day.attendance === 'present') assert.equal(day.actual, day.minutes, 'actual learning remains available without a submitted plan')
    else if (day.actual !== null) assert.equal(day.actual, day.minutes)
  }
})

test('new supporting metrics keep runs and plan coverage explicit', async () => {
  const snapshot = buildCareSnapshot(await studentCareApi.detail('br_gangnam','stu_002'))
  assert.equal(snapshot.recent.longestMissingRun,4)
  assert.equal(snapshot.recent.comparablePlanDays,2)
  assert.ok(snapshot.recent.planGapMinutes < 0)
})

test('unknown and excluded days do not provide evidence of zero absences or complete submission', async () => {
  const { recentRecordAvailability } = await import('./careSnapshot.ts')
  const snapshot = buildCareSnapshot(await studentCareApi.detail('br_gangnam','stu_002'))
  snapshot.days = snapshot.days.map(day => ({...day, attendance:'unknown',submission:'unknown',minutes:null}))
  assert.deepEqual(recentRecordAvailability(snapshot),{attendanceDays:0,submissionDays:0,studyDays:0})
})
