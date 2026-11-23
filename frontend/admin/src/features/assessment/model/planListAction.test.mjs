// A28-39·40 분석 목록 주 CTA 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planListAction, reviewAfterAnalysis } from './planListAction.ts'

test('상태마다 주 CTA는 하나이고, 미확정 문서를 확정 결과라고 부르지 않는다', () => {
  assert.deepEqual(planListAction('NOT_ANALYZED', false), { kind: 'analyze-then-review', label: '검토 시작' })
  assert.deepEqual(planListAction('ANALYSIS_FAILED', false), { kind: 'retry-analysis', label: '다시 분석' })
  assert.deepEqual(planListAction('ANALYZED', false), { kind: 'review', label: '검토 시작' })
  assert.deepEqual(planListAction('REVIEWING', false), { kind: 'review', label: '검토 이어하기' })
  assert.deepEqual(planListAction('REVIEW_DONE', false), { kind: 'review', label: '검토 이어하기' })
  assert.deepEqual(planListAction('CONFIRMED', false), { kind: 'result', label: '확정 결과' })
  for (const stage of ['NOT_ANALYZED', 'ANALYSIS_FAILED', 'ANALYZED', 'REVIEWING', 'REVIEW_DONE']) assert.notEqual(planListAction(stage, false).label, '확정 결과')
})

test('요청 중·서버 분석 중이면 다시 누를 수 없는 분석 중 상태(두 번 클릭·재접속)', () => {
  assert.equal(planListAction('NOT_ANALYZED', true).kind, 'analyzing')
  assert.equal(planListAction('ANALYZING', false).kind, 'analyzing')
})

test('분석 실패·미요청 결과로는 검토 화면에 가지 않는다', () => {
  assert.equal(reviewAfterAnalysis('FAILED'), false)
  assert.equal(reviewAfterAnalysis('PROCESSING'), false)
  assert.equal(reviewAfterAnalysis(null), false)
  assert.equal(reviewAfterAnalysis('REVIEW_REQUIRED'), true)
  assert.equal(reviewAfterAnalysis('PARTIAL'), true)
  assert.equal(reviewAfterAnalysis('COMPLETED'), true)
})
