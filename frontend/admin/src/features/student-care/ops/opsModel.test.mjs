import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildOpsRoster, absencePattern, weekdayAbsence, branchDays, branchStudyChange } from './opsModel.ts'

const snap = (name) => JSON.parse(readFileSync(new URL(`../../../../../../docs/design/ops-redesign/data-snapshot/${name}`, import.meta.url), 'utf8'))
const answers = JSON.parse(readFileSync(new URL('../../../../../../docs/design/ops-redesign/task-answers.json', import.meta.url), 'utf8'))
const board = snap('board-demo_large.json'), metrics = snap('metrics-demo_large.json')
const rows = buildOpsRoster(board, metrics)
const day = (attendance, extra = {}) => ({ date: '2026-10-21', dow: '수', attendance, submission: 'submitted', minutes: attendance === 'present' ? 100 : null, start: null, planned: null, actual: null, usualMinutes: 100, usualStart: null, ...extra })

test('roster keeps every student and puts flagged students first', () => {
  assert.equal(rows.length, 150)
  const firstNormal = rows.findIndex((r) => r.status === 'normal')
  assert.ok(rows.slice(0, firstNormal).every((r) => r.status !== 'normal'))
  assert.equal(rows.filter((r) => r.status === 'check').length, answers.Q1.answer)
  assert.equal(rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length, answers.Q7.answer)
})

test('absence pattern separates consecutive and scattered; off days do not break a run', () => {
  assert.equal(absencePattern([day('absent'), day('off'), day('absent')]), '연속')
  assert.equal(absencePattern([day('absent'), day('present'), day('absent')]), '흩어짐')
  assert.equal(absencePattern([day('absent'), day('unknown'), day('absent')]), '흩어짐')
  assert.equal(absencePattern([day('absent')]), null)
  const names = (p) => rows.filter((r) => r.absencePattern === p).map((r) => r.student.studentName).sort()
  assert.deepEqual(names('연속'), [...answers.Q12.answer['연속']].sort())
  assert.deepEqual(names('흩어짐'), [...answers.Q12.answer['흩어짐']].sort())
})

test('weekly same-day absence is found over 35 days and matches the answer key', () => {
  const found = rows.filter((r) => r.weekdayAbsence).map((r) => `${r.student.studentName}(${r.weekdayAbsence})`).sort()
  assert.deepEqual(found, [...answers.Q15.answer].sort())
  assert.equal(weekdayAbsence([day('absent', { dow: '목' }), day('absent', { dow: '목' })]), null)
})

test('absent days have no minutes (not drawn as 0) and unscheduled days are not missed plans', () => {
  for (const r of rows) for (const d of r.days) {
    if (d.attendance === 'absent') assert.equal(d.minutes, null)
    if (d.attendance === 'off') assert.notEqual(d.submission, 'missing')
  }
})

test('branch study change uses paired same-weekday observations (Q13 definition)', () => {
  const change = branchStudyChange(rows)
  assert.ok(Math.abs(change.percent - answers.Q13.answer.percent) < 0.1)
})

test('group-wide shift is visible even when no one is an outlier (synthetic)', () => {
  const synth = Array.from({ length: 20 }, (_, i) => ({ student: { studentId: `x${i}` }, days: [day('present', { minutes: 60, usualMinutes: 100 })] }))
  const [d] = branchDays(synth)
  assert.equal(Math.round(d.studyChange.median), -40)
  assert.equal(Math.round(d.studyChange.q1), -40)
  assert.equal(Math.round(d.studyChange.q3), -40)
})

test('one long day does not hide repeated drops in the day-level view (synthetic)', () => {
  const r = { student: { studentId: 'y' }, days: [day('present', { minutes: 40 }), day('present', { minutes: 40 }), day('present', { minutes: 40 }), day('present', { minutes: 40 }), day('present', { minutes: 400 })] }
  const perDay = branchDays([r]).map((d) => Math.round(d.studyChange.median))
  assert.deepEqual(perDay, [-60, -60, -60, -60, 300])
})

test('excluded students leave both the recent and usual side of the branch change', () => {
  const id = rows[0].student.studentId
  const all = branchStudyChange(rows), without = branchStudyChange(rows, new Set([id]))
  assert.ok(without.usual < all.usual && without.recent <= all.recent)
})
