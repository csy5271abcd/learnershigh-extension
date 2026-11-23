// A28-51 노트 PDF 내보내기 요청·파일 이름 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exportFileName, noteExportRequest, pdfFileName } from './noteExport.ts'

test('평가 정보는 값이 없어도 빼지 않고 null 로 보낸다(PDF 에 미정)', () => {
  assert.deepEqual(noteExportRequest('한국사2', [['진행 상태', '진행 중'], ['평가일', undefined], ['반영 비율', '']]), {
    subjectName: '한국사2',
    meta: [['진행 상태', '진행 중'], ['평가일', null], ['반영 비율', null]],
  })
})

test('파일 이름: 서버 filename* 우선, 없으면 쓸 수 없는 글자만 뺀 한글 이름 .pdf', () => {
  const at = new Date(2026, 10, 24)
  assert.equal(pdfFileName("attachment; filename=\"x.pdf\"; filename*=UTF-8''%EB%82%98%EC%9D%98%20%ED%83%90%EA%B5%AC_%ED%83%90%EA%B5%AC%EB%85%B8%ED%8A%B8_2026-11-24.pdf", '무시', at), '나의 탐구_탐구노트_2026-11-24.pdf')
  assert.equal(pdfFileName(null, '나의 20세기: 역사/탐구?*', at), '나의 20세기 역사 탐구_탐구노트_2026-11-24.pdf')
  assert.equal(pdfFileName("attachment; filename*=UTF-8''%E0%A4%A", 'a', at), 'a_탐구노트_2026-11-24.pdf')
  assert.equal(exportFileName('   ', new Date(2026, 0, 2)), '수행평가_탐구노트_2026-01-02.pdf')
  assert.ok(!exportFileName('제목', at).endsWith('.md'))
})
