// A28-36 재분석 뒤 다음 동작 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reanalyzeNext } from './reanalyzeNext.ts'

test('미확정 문서는 결과와 상관없이 검토 화면으로', () => {
  assert.deepEqual(reanalyzeNext({ confirmed: false, changed: true, teachingConfirmed: false, candidates: 0 }), { kind: 'review' })
  assert.deepEqual(reanalyzeNext({ confirmed: false, changed: false, teachingConfirmed: false, candidates: 12 }), { kind: 'review' })
})

test('평가 정보만 확정 · 같은 결과 · 운영계획 후보 있음 → 검토(운영계획만 승인, 평가 정보 재확정 없음)', () => {
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: false, teachingConfirmed: false, candidates: 33 }), { kind: 'review' })
})

test('확정 문서 · 같은 결과 · 승인할 것 없음(운영계획 확정 또는 후보 0) → 닫기만', () => {
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: false, teachingConfirmed: true, candidates: 33 }), { kind: 'close' })
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: false, teachingConfirmed: false, candidates: 0 }), { kind: 'close' })
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: false, teachingConfirmed: false, candidates: null }), { kind: 'close' })
})

test('확정 문서 · 새 결과 → 재검토를 연 뒤 검토(운영계획이 확정돼 있으면 운영계획 재검토도)', () => {
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: true, teachingConfirmed: false, candidates: 10 }), { kind: 'reopen', teaching: false })
  assert.deepEqual(reanalyzeNext({ confirmed: true, changed: true, teachingConfirmed: true, candidates: 10 }), { kind: 'reopen', teaching: true })
})
