// A27-UX 부록 N5-3 간편 검토 필터 시험 (node --test). 화면 필터는 결정을 만들지 않는다.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approvalSummary, attentionReasons, defaultIncluded, filterCounts, matchesFilter, nextMatchingCell } from './reviewFilter.ts'

const field = (fieldPath, candidate, sourcePages = [3], sourceLocators = []) => ({ subjectIndex: 0, subjectName: '국어', fieldPath, label: fieldPath, kind: 'number', candidate, sourcePages, sourceLocators })

test('값 없음·근거 없음만 먼저 볼 항목이다', () => {
  assert.deepEqual(attentionReasons(field('a', 30)), [])
  assert.deepEqual(attentionReasons(field('a', null)), ['값 없음'])
  assert.deepEqual(attentionReasons(field('a', 30, [], [])), ['근거 없음'])
  assert.deepEqual(attentionReasons(field('a', '', [], [])), ['값 없음', '근거 없음'])
})

test('필터 수(A28-03): 결정 없는 정상 후보는 기본 승인, 값·근거 없는 후보는 확인 필요 · 관리자 결정은 따로 센다', () => {
  const fields = [field('a', 30), field('b', null), field('c', 40, []), field('d', 50)]
  const none = filterCounts(fields, {})
  assert.deepEqual(none, { all: 4, attention: 2, edited: 0, absent: 0, default: 2, confirmed: 0 })
  const some = filterCounts(fields, { '0|b': { kind: 'absent', page: '' }, '0|d': { kind: 'edited', value: '55', page: '3' } })
  assert.deepEqual(some, { all: 4, attention: 1, edited: 1, absent: 1, default: 1, confirmed: 0 })
  assert.equal(matchesFilter(fields[1], { kind: 'absent', page: '' }, 'attention'), false)
})

test('다음 먼저 볼 칸으로: 과목·수행평가 순서로 돌고 지금 칸은 건너뛴다', () => {
  const f = (subjectIndex, fieldPath, candidate) => ({ subjectIndex, subjectName: 's', fieldPath, label: '', kind: 'number', candidate, sourcePages: [1], sourceLocators: [] })
  const fields = [f(0, 'performanceEvaluation.weightPercent', 30), f(0, 'performanceEvaluation.items[1].weightPercent', null), f(2, 'writtenEvaluation.weightPercent', null)]
  assert.deepEqual(nextMatchingCell(fields, {}, 'attention', { subjectIndex: 0, item: 'common' }), { subjectIndex: 0, item: 1 })
  assert.deepEqual(nextMatchingCell(fields, {}, 'attention', { subjectIndex: 0, item: 1 }), { subjectIndex: 2, item: 'common' })
  assert.deepEqual(nextMatchingCell(fields, {}, 'attention', { subjectIndex: 2, item: 'common' }), { subjectIndex: 0, item: 1 })
  assert.equal(nextMatchingCell(fields, { '0|performanceEvaluation.items[1].weightPercent': { kind: 'absent', page: '' }, '2|writtenEvaluation.weightPercent': { kind: 'absent', page: '' } }, 'attention', { subjectIndex: 0, item: 'common' }), null)
})

test('부록 O 한 번에 확정: 근거 있는 미확인 후보만 기본 포함 · 관리자 결정은 덮어쓰지 않음 · 근거 없는 후보는 보류 · 제외 과목 무시', () => {
  const f = (subjectIndex, fieldPath, candidate, sourcePages = [2]) => ({ subjectIndex, subjectName: 's', fieldPath, label: '', kind: 'number', candidate, sourcePages, sourceLocators: [] })
  const fields = [f(0, 'a', 30), f(0, 'b', 40), f(0, 'c', null), f(0, 'd', 50, []), f(1, 'e', 60)]
  const decisions = { '0|b': { kind: 'edited', value: '45', page: '3' } }
  const result = defaultIncluded(fields, decisions, new Set([1]))
  assert.deepEqual(result.merged['0|a'], { kind: 'confirmed', value: '30', page: '2' })
  assert.deepEqual(result.merged['0|b'], { kind: 'edited', value: '45', page: '3' })
  assert.equal(result.merged['1|e'], undefined)
  assert.deepEqual(result.pending.map((field) => field.fieldPath), ['c', 'd'])
  assert.equal(result.defaulted, 1)
  assert.equal(result.edited, 1)
})

test('A28-03 기본 승인: 168개 중 정상 164개는 클릭 없이 승인 대상 · 확인 필요 4개만 따로 · 수정 3개는 관리자 값 우선 · 나머지 AI 값 유지', () => {
  const f = (i, candidate, sourcePages = [1 + (i % 9)]) => ({ subjectIndex: i % 12, subjectName: 's', fieldPath: `p${i}`, label: '', kind: 'number', candidate, sourcePages, sourceLocators: [] })
  const fields = Array.from({ length: 168 }, (_, i) => (i < 2 ? f(i, null) : i < 4 ? f(i, 10, []) : f(i, 20 + (i % 5))))
  const start = approvalSummary(fields, {}, new Set())
  assert.deepEqual(start, { total: 168, approvalTarget: 164, defaulted: 164, edited: 0, confirmed: 0, absent: 0, needsReview: 4, excludedFields: 0 })
  // 확인 필요 4개 해결(값 입력 2 · 원문에 없음 2) + 정상 항목 3개 수정
  const decisions = {
    '0|p0': { kind: 'edited', value: '15', page: '1' },
    '1|p1': { kind: 'edited', value: '15', page: '1' },
    '2|p2': { kind: 'absent', page: '' },
    '3|p3': { kind: 'absent', page: '' },
    '10|p10': { kind: 'edited', value: '25', page: '2' },
    '11|p11': { kind: 'edited', value: '26', page: '3' },
    '0|p12': { kind: 'edited', value: '27', page: '4' },
  }
  const after = approvalSummary(fields, decisions, new Set())
  assert.deepEqual(after, { total: 168, approvalTarget: 168, defaulted: 161, edited: 5, confirmed: 0, absent: 2, needsReview: 0, excludedFields: 0 })
  const merged = defaultIncluded(fields, decisions, new Set()).merged
  assert.equal(Object.keys(merged).length, 168, '최종 승인 1회에 168개 모두')
  assert.deepEqual(merged['10|p10'], { kind: 'edited', value: '25', page: '2' }, '관리자 수정값 우선')
  assert.deepEqual(merged['5|p5'], { kind: 'confirmed', value: String(fields[5].candidate), page: String(fields[5].sourcePages[0]) }, '수정 안 한 값은 AI 값 유지')
  // 수정 뒤에도 다른 항목의 기본 승인은 그대로다(초기화 없음)
  assert.equal(filterCounts(fields, decisions).default, 161)
  // 과목 제외: 그 과목 후보는 검토 대상·승인 대상에서 빠진다(삭제 아님)
  const excluded = approvalSummary(fields, decisions, new Set([11]))
  assert.equal(excluded.excludedFields, 14)
  assert.equal(excluded.total, 154)
  assert.equal(excluded.needsReview, 0)
})
