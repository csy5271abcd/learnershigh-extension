import assert from 'node:assert/strict'
import test from 'node:test'
import { isNoAcademicRecord, parseTermParam, termCandidates } from './academicTerm.ts'

// A28-29: 학기 선택 후보 = 현재 학년도부터 앞 두 학년도까지 6개(최신 먼저). 학적이 없는 학기는 실패가 아니라 '없음'으로 뺀다.
test('학기 후보는 3개 학년도 × 1·2학기, 최신 학기 먼저', () => {
  assert.deepEqual(termCandidates({ academicYear: 2026, semester: 2 }), [
    { academicYear: 2026, semester: 2 },
    { academicYear: 2026, semester: 1 },
    { academicYear: 2025, semester: 2 },
    { academicYear: 2025, semester: 1 },
    { academicYear: 2024, semester: 2 },
    { academicYear: 2024, semester: 1 },
  ])
})

test('학적 없음(Backend 400 VALIDATION_ERROR · Mock 404 NOT_FOUND)만 목록에서 빼고, 연결 실패·서버 오류·인증은 실패로 남긴다', () => {
  assert.equal(isNoAcademicRecord({ status: 400, code: 'VALIDATION_ERROR' }), true)
  assert.equal(isNoAcademicRecord({ status: 404, code: 'NOT_FOUND' }), true)
  assert.equal(isNoAcademicRecord({ status: 503, code: 'EXISTING_STUDENT_UNAVAILABLE' }), false)
  assert.equal(isNoAcademicRecord({ status: 500, code: 'INTERNAL_ERROR' }), false)
  assert.equal(isNoAcademicRecord({ status: 401, code: 'UNAUTHORIZED' }), false)
  assert.equal(isNoAcademicRecord(new TypeError('Failed to fetch')), false)
  assert.equal(isNoAcademicRecord(null), false)
})

test('A28-34 주소의 학기 값: 2026-2 형식만 받고 나머지는 null', () => {
  assert.deepEqual(parseTermParam('2025-1'), { academicYear: 2025, semester: 1 })
  assert.deepEqual(parseTermParam(' 2026-2 '), { academicYear: 2026, semester: 2 })
  for (const bad of [null, '', '2026-3', '26-1', '2026/1', '2026-1;drop', '<script>']) assert.equal(parseTermParam(bad), null)
})
