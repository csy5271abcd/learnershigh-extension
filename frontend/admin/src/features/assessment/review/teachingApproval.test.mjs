// A28-31 월별 운영계획 원클릭 승인 모델 시험 (node --test) — 합성 행
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teachingApproval, teachingRowKey } from './teachingApproval.ts'

const row = (subjectIndex, rowIndex, sources = [{ pdfPageNumber: 3 }]) => ({
  subjectIndex,
  rowIndex,
  subjectName: `과목${subjectIndex}`,
  row: { rowKey: `S${subjectIndex}.T${String(rowIndex + 1).padStart(3, '0')}`, sources },
})
const refs195 = Array.from({ length: 195 }, (_, i) => row(i % 11, Math.floor(i / 11)))
const links = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, `subj_${i}`]))

test('행마다 확인하지 않아도 원문 근거가 있는 후보 195행 전부 기본 포함', () => {
  const plan = teachingApproval({ refs: refs195, decisions: {}, subjectIds: links })
  assert.equal(plan.rows.length, 195)
  assert.equal(plan.published, 195)
  assert.deepEqual(plan.counts, { auto: 195, confirmed: 0, edited: 0, excluded: 0, noEvidence: 0, otherGrade: 0 })
  assert.ok(plan.rows.every((r) => r.decision === 'CONFIRMED' && r.subjectId.startsWith('subj_')))
  assert.deepEqual(plan.missingSubjects, [])
})

test('제외 2 · 수정 1 → 공개 193(수정 반영), 제외 행도 결정으로 보낸다', () => {
  const decisions = {
    [teachingRowKey(refs195[0])]: { kind: 'absent', page: '3' },
    [teachingRowKey(refs195[1])]: { kind: 'absent', page: '3' },
    [teachingRowKey(refs195[2])]: { kind: 'edited', value: JSON.stringify({ unit: '고친 단원' }), page: '3' },
  }
  const plan = teachingApproval({ refs: refs195, decisions, subjectIds: links })
  assert.equal(plan.published, 193)
  assert.equal(plan.counts.excluded, 2)
  assert.equal(plan.counts.edited, 1)
  assert.equal(plan.counts.auto, 192)
  assert.equal(plan.rows.length, 195)
  assert.deepEqual(plan.rows.find((r) => r.decision === 'EDITED')?.edits, { unit: '고친 단원' })
})

test('원문 근거 없는 행·다른 학년 과목 행은 자동 포함하지 않고 확인 필요로 센다', () => {
  const refs = [row(0, 0), row(0, 1, []), row(1, 0)]
  const plan = teachingApproval({ refs, decisions: {}, subjectIds: { 0: 'subj_0', 1: 'subj_1' }, subjectGrades: [[1], [2]], documentGrade: 1 })
  assert.equal(plan.published, 1)
  assert.equal(plan.counts.noEvidence, 1)
  assert.equal(plan.counts.otherGrade, 1)
  assert.deepEqual(plan.rows.map((r) => r.rowKey), ['S0.T001'])
})

test('포함 대상 과목에 연결이 없으면 그 과목을 알려 승인을 막는다', () => {
  const plan = teachingApproval({ refs: [row(0, 0), row(1, 0)], decisions: {}, subjectIds: { 0: 'subj_0' } })
  assert.deepEqual(plan.missingSubjects, ['과목1'])
})
