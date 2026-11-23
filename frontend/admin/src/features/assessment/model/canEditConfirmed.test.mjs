// A28-38 확정 내용 수정 진입점 조건 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canEditConfirmed } from './schoolInfoSync.ts'

const official = 'https://www.schoolinfo.go.kr/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=abc'

test('PDF 는 출처와 상관없이, 학교알리미 원본은 HWP·HWPX 도 수정 진입점을 보인다(이미지 02 결함)', () => {
  assert.equal(canEditConfirmed('PDF', null), true)
  assert.equal(canEditConfirmed(null, null), true)
  assert.equal(canEditConfirmed('HWP', official), true)
  assert.equal(canEditConfirmed('HWPX', official), true)
})

test('관리자가 직접 올린 HWP·HWPX 는 운영 확정 경로가 없어 보이지 않는다', () => {
  assert.equal(canEditConfirmed('HWP', null), false)
  assert.equal(canEditConfirmed('HWPX', 'https://example.com/a.hwpx'), false)
})
