// A28 §5-4 확정 이력 변경 비교 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { confirmedChanges, originCounts } from './confirmedChanges.ts'

const f = (index, fieldPath, value, page = 3) => ({ subjectId: 'subj_01', fieldPath, value, pdfPageNumber: page, analysisSubjectIndex: index })

test('재확정: 바뀐 값만(이전 → 수정) · 근거 쪽 변경도 변경 · 새로 넣은 값·빠진 값 구분', () => {
  const first = [f(0, 'performanceEvaluation.weightPercent', 20), f(0, 'writtenEvaluation.weightPercent', 80), f(1, 'performanceEvaluation.weightPercent', 30)]
  const second = [f(0, 'performanceEvaluation.weightPercent', 25), f(0, 'writtenEvaluation.weightPercent', 80, 4), f(2, 'performanceEvaluation.weightPercent', 40)]
  const changes = confirmedChanges(second, first)
  assert.deepEqual(
    changes.map((c) => [c.kind, c.key, c.before, c.after]),
    [
      ['changed', '#0|performanceEvaluation.weightPercent', 20, 25],
      ['changed', '#0|writtenEvaluation.weightPercent', 80, 80],
      ['added', '#2|performanceEvaluation.weightPercent', null, 40],
      ['removed', '#1|performanceEvaluation.weightPercent', 30, null],
    ],
  )
  assert.equal(changes[1].beforePage, 3)
  assert.equal(changes[1].afterPage, 4)
  assert.deepEqual(confirmedChanges(first, first), [], '같은 값 재확정은 변경 0')
})

test('분석 과목 번호가 없으면 학업 과목 ID로 맞춘다(예전 확정분)', () => {
  const old = [{ subjectId: 'subj_09', fieldPath: 'a', value: '1', pdfPageNumber: 1 }]
  const now = [{ subjectId: 'subj_09', fieldPath: 'a', value: '2', pdfPageNumber: 1 }]
  assert.deepEqual(confirmedChanges(now, old).map((c) => [c.kind, c.key]), [['changed', 'subj_09|a']])
})

test('AI 후보 그대로 · 관리자 수정 · 후보 모름을 따로 센다(추측 없음)', () => {
  const fields = [f(0, 'a', 20), f(0, 'b', 25), f(0, 'c', '서술형')]
  const candidates = { '0|a': 20, '0|b': 20 }
  const counts = originCounts(fields, (field) => candidates[`${field.analysisSubjectIndex}|${field.fieldPath}`])
  assert.deepEqual(counts, { asCandidate: 1, edited: 1, unknown: 1 })
})
