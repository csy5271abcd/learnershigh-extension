// A27-UX 탐구 노트 Markdown 단축 입력 시험 (node --test, Node 22 타입 제거로 .ts를 직접 읽는다)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyMarkdownShortcut } from './noteMarkdownShortcuts.ts'

const p = (text = '') => ({ blockId: 'b1', type: 'PARAGRAPH', text })

test('# 띄어쓰기는 제목 1, ## 은 제목 2, ### 은 제목 3 (블록 ID 유지)', () => {
  assert.deepEqual(applyMarkdownShortcut(p('#'), '#', '# '), { blockId: 'b1', type: 'HEADING', text: '', attrs: { level: 1 } })
  assert.equal(applyMarkdownShortcut(p('##'), '##', '## ').attrs.level, 2)
  assert.equal(applyMarkdownShortcut(p('###'), '###', '### ').attrs.level, 3)
})

test('목록·체크리스트·인용·구분선', () => {
  assert.equal(applyMarkdownShortcut(p('-'), '-', '- ').type, 'BULLET')
  assert.equal(applyMarkdownShortcut(p('*'), '*', '* ').type, 'BULLET')
  assert.equal(applyMarkdownShortcut(p('1.'), '1.', '1. ').type, 'NUMBERED')
  const check = applyMarkdownShortcut(p('[]'), '[]', '[] ')
  assert.equal(check.type, 'CHECKLIST')
  assert.equal(check.attrs.checked, false)
  assert.equal(applyMarkdownShortcut(p('>'), '>', '> ').type, 'QUOTE')
  assert.equal(applyMarkdownShortcut(p('--'), '--', '---').type, 'DIVIDER')
})

test('표시 앞에 이미 쓴 글이 있거나 본문이 아니면 바꾸지 않는다', () => {
  assert.equal(applyMarkdownShortcut(p('가#'), '가#', '가# '), null)
  assert.equal(applyMarkdownShortcut({ blockId: 'b2', type: 'BULLET', text: '-' }, '-', '- '), null)
  // 붙여넣기로 한 번에 들어온 "# 제목"은 바꾸지 않는다(이전 글이 표시가 아님)
  assert.equal(applyMarkdownShortcut(p(''), '', '# 제목'), null)
  // 한글 문장 중간의 하이픈은 그대로
  assert.equal(applyMarkdownShortcut(p('a-b'), 'a-b', 'a- b'), null)
})

test('표시 뒤에 이미 쓴 글은 남긴다 (커서를 맨 앞으로 옮겨 # 을 쓴 경우)', () => {
  const result = applyMarkdownShortcut(p('#탐구 동기'), '#탐구 동기', '# 탐구 동기')
  assert.equal(result.type, 'HEADING')
  assert.equal(result.text, '탐구 동기')
})
