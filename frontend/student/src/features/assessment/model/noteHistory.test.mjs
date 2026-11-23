// A27-UX 탐구 노트 되돌리기·다시 하기 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyHistory, record, redo, undo } from './noteHistory.ts'

const b = (id, text, type = 'PARAGRAPH') => ({ blockId: id, type, text })

test('연속 입력은 한 단계로 묶고, 멈춘 뒤 입력은 새 단계', () => {
  let h = emptyHistory()
  const v0 = [b('a', '')]
  const v1 = [b('a', '탐')]
  const v2 = [b('a', '탐구')]
  const v3 = [b('a', '탐구 동기')]
  h = record(h, v0, v1, 1000)
  h = record(h, v1, v2, 1200)
  h = record(h, v2, v3, 3000)
  assert.equal(h.past.length, 2)
  const first = undo(h, v3)
  assert.deepEqual(first.blocks, v2)
  const second = undo(first.history, first.blocks)
  assert.deepEqual(second.blocks, v0)
  assert.equal(undo(second.history, second.blocks), null)
})

test('블록 나누기·유형 바꾸기는 바로 한 단계, 다시 하기로 되살린다', () => {
  let h = emptyHistory()
  const v0 = [b('a', '가나')]
  const v1 = [b('a', '가'), b('b', '나')]
  const v2 = [b('a', '가', 'HEADING'), b('b', '나')]
  h = record(h, v0, v1, 1000)
  h = record(h, v1, v2, 1001)
  assert.equal(h.past.length, 2)
  const back = undo(h, v2)
  assert.deepEqual(back.blocks, v1)
  const forward = redo(back.history, back.blocks)
  assert.deepEqual(forward.blocks, v2)
  // 되돌린 뒤 새로 고치면 다시 하기 목록은 비운다
  const branched = record(back.history, v1, [b('a', '다'), b('b', '나')], 5000)
  assert.equal(branched.future.length, 0)
})
