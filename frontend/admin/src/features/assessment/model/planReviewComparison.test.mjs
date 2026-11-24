// A27-UX(계정 B) 결과 조회 비교·진행률 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparisonRowsOf, filterRows, reviewProgressOf } from './planReviewComparison.ts'

const field = (subjectIndex, fieldPath, candidate) => ({ subjectIndex, subjectName: `과목${subjectIndex}`, fieldPath, label: fieldPath, kind: 'text', candidate, sourcePages: [3], sourceLocators: [], documentLocators: [] })
const fields = [field(0, 'performanceEvaluation.weightPercent', 40), field(0, 'performanceEvaluation.items[0].label', '보고서'), field(1, 'writtenEvaluation.weightPercent', 60)]
const draft = (status, decisions, subjectLinks = []) => ({ draftId: 'd', analysisId: 'a', status, closedReason: null, version: 1, decisions, subjectLinks, decisionCount: decisions.length, analyzerVersion: 'v', createdBy: 'x', createdAt: '', updatedBy: 'x', updatedAt: '' })
const decision = (subjectIndex, fieldPath, kind, value) => ({ subjectIndex, fieldPath, decision: kind, value, pdfPageNumber: 3 })

test('진행률: 검토 대상에 있는 결정만 센다, 모두 결정해야 검토 완료', () => {
  const partial = reviewProgressOf(fields, draft('ACTIVE', [decision(0, 'performanceEvaluation.weightPercent', 'CONFIRMED', '40'), decision(9, 'unknown', 'CONFIRMED', 'x')]))
  assert.deepEqual(partial, { total: 3, decided: 1, draftStatus: 'ACTIVE', allDecided: false })
  const all = reviewProgressOf(fields, draft('ACTIVE', fields.map((f) => decision(f.subjectIndex, f.fieldPath, 'CONFIRMED', String(f.candidate)))))
  assert.equal(all.allDecided, true)
  // 닫힌 초안(확정 뒤)은 '검토 완료·미확정'이 아니다
  const closed = reviewProgressOf(fields, draft('CLOSED', fields.map((f) => decision(f.subjectIndex, f.fieldPath, 'CONFIRMED', String(f.candidate)))))
  assert.equal(closed.allDecided, false)
  assert.deepEqual(reviewProgressOf([], null), { total: 0, decided: 0, draftStatus: 'NONE', allDecided: false })
})

test('비교: AI 후보·관리자 수정·확정값을 따로 보여 주고 서로 덮어쓰지 않는다', () => {
  const history = {
    planId: 'p',
    revisionId: 'r',
    reReviewOpen: false,
    items: [
      { reviewId: 'r2', analysisId: 'a', reviewedBy: 'x', reviewedAt: '', current: true, confirmedFieldCount: 2, confirmedFields: [
        { subjectId: 'S0', fieldPath: 'performanceEvaluation.weightPercent', value: 50, pdfPageNumber: 3, analysisSubjectIndex: 0 },
        { subjectId: 'S0', fieldPath: 'performanceEvaluation.items[0].label', value: '보고서', pdfPageNumber: 3 },
      ] },
      { reviewId: 'r1', analysisId: 'a', reviewedBy: 'x', reviewedAt: '', current: false, confirmedFieldCount: 1, confirmedFields: [
        { subjectId: 'S0', fieldPath: 'performanceEvaluation.weightPercent', value: 40, pdfPageNumber: 3, analysisSubjectIndex: 0 },
      ] },
    ],
  }
  const rows = comparisonRowsOf(fields, draft('CLOSED', [decision(0, 'performanceEvaluation.weightPercent', 'EDITED', '50'), decision(0, 'performanceEvaluation.items[0].label', 'CONFIRMED', '보고서')], [{ subjectIndex: 0, subjectId: 'S0' }]), history)
  assert.equal(rows[0].ai, 40)
  assert.equal(rows[0].review.value, '50')
  assert.equal(rows[0].confirmed.value, 50)
  assert.equal(rows[0].previous.value, 40)
  assert.equal(rows[0].adminChanged, true)
  // 과목 번호가 없는 이전 확정값은 초안 과목 연결로만 찾는다
  assert.equal(rows[1].confirmed.value, '보고서')
  assert.equal(rows[1].adminChanged, false)
  // 확정 기록에 없는 값은 만들지 않는다
  assert.equal(rows[2].confirmed, null)
  assert.deepEqual(filterRows(rows, 'changed', false).map((row) => row.key), ['0|performanceEvaluation.weightPercent'])
  assert.deepEqual(filterRows(rows, 'unreviewed', false).map((row) => row.key), ['1|writtenEvaluation.weightPercent'])
})

test('비교: 과목 연결이 없으면 번호 없는 확정값을 추정하지 않는다', () => {
  const history = { planId: 'p', revisionId: 'r', reReviewOpen: false, items: [{ reviewId: 'r1', analysisId: 'a', reviewedBy: 'x', reviewedAt: '', current: true, confirmedFieldCount: 1, confirmedFields: [{ subjectId: 'S0', fieldPath: 'performanceEvaluation.weightPercent', value: 40, pdfPageNumber: 3 }] }] }
  const rows = comparisonRowsOf(fields, null, history)
  assert.equal(rows[0].confirmed, null)
  assert.equal(rows[0].review, null)
})

test('비교: 분석 과목 1개 + 번호 없는 확정 과목 1개면 그 과목으로 맞춘다 (A10 ③), 확정 과목이 2개면 맞추지 않는다', () => {
  const single = [field(0, 'performanceEvaluation.weightPercent', 60)]
  const item = (confirmedFields) => ({ planId: 'p', revisionId: 'r', reReviewOpen: false, items: [{ reviewId: 'r1', analysisId: 'a', reviewedBy: 'x', reviewedAt: '', current: true, confirmedFieldCount: confirmedFields.length, confirmedFields }] })
  const one = comparisonRowsOf(single, null, item([{ subjectId: 'S0', fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }]))
  assert.equal(one[0].confirmed.value, 60)
  assert.equal(filterRows(one, 'unreviewed', false).length, 0)
  const two = comparisonRowsOf(single, null, item([
    { subjectId: 'S0', fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 },
    { subjectId: 'S1', fieldPath: 'performanceEvaluation.weightPercent', value: 70, pdfPageNumber: 1 },
  ]))
  assert.equal(two[0].confirmed, null)
})
