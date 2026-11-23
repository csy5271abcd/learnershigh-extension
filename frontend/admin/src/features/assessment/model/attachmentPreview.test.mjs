// A28-44 관리자 첨부 미리보기 방식 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previewKindOf } from './attachmentPreview.ts'

test('이미지·PDF 만 화면 안에서 미리보고 나머지는 내려받기만', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) assert.equal(previewKindOf(type), 'image')
  assert.equal(previewKindOf('application/pdf'), 'pdf')
  for (const type of ['application/x-hwp', 'application/hwp+zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/svg+xml', 'text/html', '', null]) {
    assert.equal(previewKindOf(type), 'none', String(type))
  }
})
