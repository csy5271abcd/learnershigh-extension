// A27-UX(계정 B) 탐구 노트 인라인 서식 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adjustMarks, concatMarks, hasMark, normalizeMarks, safeHref, segmentsOf, splitMarks, toggleMark, withMarks } from './noteInlineMarks.ts'

test('서식 켜기·끄기, 부분 끄기는 범위를 나눈다', () => {
  let marks = toggleMark([], 'bold', 0, 4, 10)
  assert.deepEqual(marks, [{ type: 'bold', start: 0, end: 4 }])
  assert.equal(hasMark(marks, 'bold', 1, 3), true)
  marks = toggleMark(marks, 'bold', 1, 3, 10)
  assert.deepEqual(marks, [{ type: 'bold', start: 0, end: 1 }, { type: 'bold', start: 3, end: 4 }])
  marks = toggleMark(marks, 'bold', 0, 4, 10)
  assert.deepEqual(marks, [{ type: 'bold', start: 0, end: 4 }])
  marks = toggleMark(marks, 'italic', 2, 6, 10)
  assert.deepEqual(marks.map((mark) => mark.type), ['bold', 'italic'])
})

test('글 입력·삭제에 따라 범위가 따라간다 (끝에서 이어 친 글은 넓히지 않음)', () => {
  const bold = [{ type: 'bold', start: 3, end: 6 }]
  assert.deepEqual(adjustMarks('탐구 동기 정리', '새 탐구 동기 정리', bold), [{ type: 'bold', start: 5, end: 8 }])
  assert.deepEqual(adjustMarks('탐구 동기 정리', '탐구 동기!! 정리', [{ type: 'bold', start: 3, end: 5 }]), [{ type: 'bold', start: 3, end: 5 }])
  assert.deepEqual(adjustMarks('탐구 동기 정리', '탐구 동ㄱ기 정리', bold), [{ type: 'bold', start: 3, end: 7 }])
  assert.deepEqual(adjustMarks('탐구 동기 정리', '탐구 정리', bold), [])
  assert.deepEqual(adjustMarks('탐구 동기 정리', '탐구 동 정리', bold), [{ type: 'bold', start: 3, end: 5 }])
})

test('한글 조합 중 바뀌는 글자도 범위를 잃지 않는다', () => {
  let marks = [{ type: 'underline', start: 0, end: 2 }]
  let text = '실험'
  for (const next of ['실험 ㄱ', '실험 겨', '실험 결', '실험 결과']) {
    marks = adjustMarks(text, next, marks)
    text = next
  }
  assert.deepEqual(marks, [{ type: 'underline', start: 0, end: 2 }])
})

test('나누기·합치기', () => {
  const marks = [{ type: 'bold', start: 2, end: 8 }]
  const [before, after] = splitMarks(marks, 5, 5, 10)
  assert.deepEqual(before, [{ type: 'bold', start: 2, end: 5 }])
  assert.deepEqual(after, [{ type: 'bold', start: 0, end: 3 }])
  assert.deepEqual(concatMarks(before, 5, after, 10), [{ type: 'bold', start: 2, end: 8 }])
})

test('링크는 http(s)만, 저장값은 다시 검사한다', () => {
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('example.com/a'), 'https://example.com/a')
  assert.deepEqual(normalizeMarks([{ type: 'link', start: 0, end: 3, href: 'javascript:x' }, { type: 'bad', start: 0, end: 1 }, { type: 'bold', start: 5, end: 99 }, 'x'], 7), [{ type: 'bold', start: 5, end: 7 }])
  const marks = toggleMark([], 'link', 0, 2, 5, 'https://a.example/')
  assert.deepEqual(segmentsOf('자료 링크', marks).map((segment) => [segment.text, segment.href]), [['자료', 'https://a.example/'], [' 링크', null]])
})

test('서식이 없으면 attrs를 만들지 않고, 다른 attrs는 보존한다', () => {
  assert.deepEqual(withMarks({ blockId: 'b', type: 'PARAGRAPH', text: 'a' }, []), { blockId: 'b', type: 'PARAGRAPH', text: 'a' })
  assert.deepEqual(withMarks({ blockId: 'b', type: 'BULLET', text: 'a', attrs: { indent: 1, marks: [] } }, []), { blockId: 'b', type: 'BULLET', text: 'a', attrs: { indent: 1 } })
  assert.deepEqual(segmentsOf('기존 노트', undefined), [{ text: '기존 노트', bold: false, italic: false, underline: false, href: null }])
})
