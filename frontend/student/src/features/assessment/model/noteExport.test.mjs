// A28-49 노트 내보내기 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exportFileName, noteToMarkdown } from './noteExport.ts'

const base = {
  assessmentTitle: '과학 원리가 적용된 탐구 산출물 구상하기',
  subjectName: '과학탐구실험2',
  meta: [['평가 유형', '보고서'], ['평가일', '11. 28.'], ['반영 비율', null]],
  noteTitle: '탐구 노트',
  revisionNumber: 8,
  savedAt: '2026-11-23T21:00:00+09:00',
  exportedAt: new Date(2026, 10, 23, 21, 30),
}

test('제목·메타·본문 블록·첨부 목록이 들어가고 값 없는 메타는 빠진다', () => {
  const md = noteToMarkdown({
    ...base,
    blocks: [
      { blockId: 'h', type: 'HEADING', text: '조사 내용', attrs: { level: 1 } },
      { blockId: 'p', type: 'PARAGRAPH', text: '엔트로피 변화' },
      { blockId: 'c', type: 'CHECKLIST', text: '자료 찾기', attrs: { checked: true } },
      { blockId: 'n1', type: 'NUMBERED', text: '첫째' },
      { blockId: 'n2', type: 'NUMBERED', text: '둘째' },
      { blockId: 't', type: 'TABLE', text: '', attrs: { rows: [['항목', '값'], ['온도', '25|30']] } },
      { blockId: 'i', type: 'IMAGE', text: '', attrs: { file: { name: '사진.png', size: 2048, mimeType: 'image/png', attachmentId: 'noteatt_1' } } },
      { blockId: 'f', type: 'FILE', text: '', attrs: { file: { name: '이전.pdf', size: 10, mimeType: 'application/pdf' } } },
      { blockId: 'u', type: 'MYSTERY', text: '모르는 블록도 글은 남긴다' },
    ],
  })
  assert.match(md, /^# 과학 원리가 적용된 탐구 산출물 구상하기/)
  assert.match(md, /- 과목: 과학탐구실험2/)
  assert.match(md, /- 평가 유형: 보고서/)
  assert.doesNotMatch(md, /반영 비율/)
  assert.match(md, /- 노트 버전: v8/)
  assert.match(md, /### 조사 내용/)
  assert.match(md, /- \[x\] 자료 찾기/)
  assert.match(md, /1\. 첫째\n2\. 둘째/)
  assert.match(md, /\| 온도 \| 25\\\|30 \|/)
  assert.match(md, /\[이미지 첨부\] 사진\.png \(2\.0KB · 서버에 저장됨\)/)
  assert.match(md, /이전\.pdf · PDF · 10B · 파일 미저장\(이전 첨부\)/)
  assert.match(md, /모르는 블록도 글은 남긴다/)
})

test('빈 노트도 깨지지 않고 안내와 첨부 없음이 들어간다 · 파일 이름 정리', () => {
  const md = noteToMarkdown({ ...base, blocks: [], revisionNumber: null, savedAt: null })
  assert.match(md, /저장된 노트 내용이 없어요/)
  assert.match(md, /## 첨부 파일\n\n- 없음/)
  assert.equal(exportFileName('a/b:c*?', new Date(2026, 10, 23)), 'a b c_탐구노트_20261123.md')
  assert.equal(exportFileName('', new Date(2026, 0, 2)), '탐구노트_탐구노트_20260102.md')
})
