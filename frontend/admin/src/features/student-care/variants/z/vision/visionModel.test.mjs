import { test } from 'node:test'
import assert from 'node:assert/strict'
import { managementReasons } from './visionContract.ts'
import { studentVision, latestFacility } from './visionModel.ts'

const r = (n, d) => ({ numerator: n, denominator: d, value: d ? n / d : null })
const doc = (studentId, episodes = [], findings = []) => ({
  reportId: `r-${studentId}`, revision: 1,
  facts: { studentId, sessionState: 'observed', quality: 'sufficient', episodes,
    metrics: { person_visible: r(9, 10), phone_interaction: r(1, 9), head_down: r(2, 9), reading_or_writing: r(5, 9), desk_resting: r(0, 9) } },
  findings, summary: 's', content: { supportingFacts: { absenceRatio: r(1, 10) } },
})
const ep = (id, reason) => ({ episodeId: id, studentId: 'a', reason, status: 'active' })

test('management reasons follow the vision server rule (repeated or prolonged findings only)', () => {
  const d = doc('a', [ep('e1', 'phone_interaction_observed'), ep('e2', 'desk_resting_observed')], [
    { findingId: 'f1', episodeIds: ['e1'], kind: 'repeated_across_periods', text: '' },
    { findingId: 'f2', episodeIds: ['e2'], kind: 'limited_observation', text: '' },
  ])
  assert.deepEqual(managementReasons(d), ['phone_interaction_observed'])
})

test('week view counts reason days, sums ratios, and keeps missing days as null', () => {
  const flagged = doc('a', [ep('e1', 'absence_observed')], [{ findingId: 'f', episodeIds: ['e1'], kind: 'single_prolonged', text: '' }])
  const reports = new Map([['d1', { reports: [flagged] }], ['d2', null], ['d3', { reports: [doc('a')] }]])
  const v = studentVision(reports, ['d1', 'd2', 'd3'], 'a')
  assert.deepEqual(v.reasonDays, [{ reason: 'absence_observed', days: 1 }])
  assert.equal(v.days[1].doc, null)
  assert.deepEqual(v.totals.person_visible, { numerator: 2, denominator: 20, value: 0.1 })
  assert.deepEqual(v.totals.phone_interaction, { numerator: 2, denominator: 18, value: 2 / 18 })
  assert.equal(v.latest.date, 'd3')
  assert.equal(latestFacility(reports, ['d1', 'd2', 'd3']), reports.get('d3'))
  assert.equal(studentVision(reports, ['d1', 'd2', 'd3'], 'zz').reasonDays.length, 0)
})
