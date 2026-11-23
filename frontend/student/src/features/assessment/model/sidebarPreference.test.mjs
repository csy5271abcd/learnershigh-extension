// A27-UX 부록 E S1: 메뉴 접기 상태 저장 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSidebarCollapsed, SIDEBAR_COLLAPSED_KEY, writeSidebarCollapsed } from './sidebarPreference.ts'

const memory = () => {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), map }
}

test('기본값은 펼침이고, 접기·펼치기를 Assessment 전용 키에 기억한다', () => {
  const store = memory()
  assert.equal(readSidebarCollapsed(store), false)
  writeSidebarCollapsed(true, store)
  assert.equal(store.map.get(SIDEBAR_COLLAPSED_KEY), '1')
  assert.equal(readSidebarCollapsed(store), true)
  writeSidebarCollapsed(false, store)
  assert.equal(readSidebarCollapsed(store), false)
  assert.ok(SIDEBAR_COLLAPSED_KEY.startsWith('lh.assessment.student.'))
})

test('저장소가 없거나 막혀도 오류 없이 펼침으로 동작한다', () => {
  const blocked = { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('QuotaExceeded') } }
  assert.equal(readSidebarCollapsed(blocked), false)
  assert.doesNotThrow(() => writeSidebarCollapsed(true, blocked))
  assert.equal(readSidebarCollapsed(null), false)
  assert.doesNotThrow(() => writeSidebarCollapsed(true, null))
})
