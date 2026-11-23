import { readFile } from 'node:fs/promises'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { API, STUDENT, STUDENT_ID, runTag, uniquePdf } from '../support.ts'

// A28-48~50 (2026-11-23 사용자 화면 1~3). 일회용 DB·Storage·합성 파일만 쓴다.
// 48 학생 탐구 노트 첨부 바로 미리보기(이미지·PDF·미지원 형식) · 49 ⋯ 메뉴: 평가 정보 수정·심화 탐구·노트 내보내기·휴지통·삭제
// (50 표시 날짜 dropdown 모양은 a28-33-calendar-placement 에서 같은 흐름으로 확인)
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 8, 0, 1, 2, 3, 4])

async function newAssessment(request: APIRequestContext, title: string) {
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, { headers: student, data: { title, subjectId: 'subj_02', academicYear: 2026, semester: 2 } })
  expect(created.status()).toBe(201)
  return (await created.json()).assessmentId as string
}

async function attach(request: APIRequestContext, name: string, mimeType: string, buffer: Buffer) {
  const response = await request.post(`${API}/api/student/assessment/note-attachments`, { headers: student, multipart: { file: { name, mimeType, buffer } } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json() as Promise<{ attachmentId: string; fileName: string; contentType: string; sizeBytes: number }>
}

const fileBlock = (id: string, type: string, a: { attachmentId: string; fileName: string; contentType: string; sizeBytes: number }) => ({
  blockId: id,
  type,
  text: '',
  attrs: { file: { name: a.fileName, size: a.sizeBytes, mimeType: a.contentType, attachmentId: a.attachmentId } },
})

async function openMenu(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '더보기' }).click()
}

test('[A28-48] 학생 탐구 노트: 이미지·PDF 첨부 바로 미리보기, 미지원 형식은 안내 + 내려받기', async ({ page, request }) => {
  test.setTimeout(120_000)
  const tag = runTag()
  const sa = await newAssessment(request, `E2E 노트 미리보기 ${tag}`)
  const image = await attach(request, `사진 ${tag}.png`, 'image/png', PNG)
  const pdf = await attach(request, `보고서 ${tag}.pdf`, 'application/pdf', uniquePdf(`${tag}-a2848`))
  const docx = await attach(request, `정리 ${tag}.docx`, 'application/octet-stream', DOCX)
  expect((await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: `노트 ${tag}`, blocks: [fileBlock('img', 'IMAGE', image), fileBlock('pdf', 'FILE', pdf), fileBlock('doc', 'FILE', docx)] },
  })).status()).toBe(201)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`)
  const files = page.getByTestId('note-file')
  await expect(files).toHaveCount(3, { timeout: 20_000 })

  await files.nth(0).getByTestId('note-file-preview').click()
  await expect(page.getByTestId('note-preview')).toHaveAttribute('data-kind', 'image')
  await expect.poll(async () => page.getByTestId('note-preview-image').evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1)
  await page.getByTestId('note-preview-zoom-in').click()
  await expect(page.getByTestId('note-preview-zoom')).not.toHaveText('화면 맞춤')
  await page.screenshot({ path: 'test-results/a28-48-image-preview.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('note-preview')).toHaveCount(0)

  await files.nth(1).getByTestId('note-file-preview').click()
  await expect(page.getByTestId('note-preview')).toHaveAttribute('data-kind', 'pdf')
  await expect(page.getByTestId('note-preview').locator('canvas')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'test-results/a28-48-pdf-preview.png' })
  await page.getByTestId('note-preview-close').click()

  await files.nth(2).getByTestId('note-file-preview').click()
  await expect(page.getByTestId('note-preview-unsupported')).toContainText('미리보기를 지원하지 않아요')
  const download = page.waitForEvent('download')
  await page.getByTestId('note-preview-download').click()
  expect((await readFile((await (await download).path()) as string)).equals(DOCX)).toBe(true)
  await page.getByTestId('note-preview-close').click()
})

test('[A28-49] ⋯ 메뉴: 평가 정보 수정 · 심화 탐구 · 노트 내보내기 · 휴지통 · 삭제가 모두 실제로 동작하고 준비 중 항목이 없다', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const title = `E2E 메뉴 ${tag}`
  const sa = await newAssessment(request, title)
  expect((await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: `노트 ${tag}`, blocks: [{ blockId: 'h', type: 'HEADING', text: `조사 ${tag}`, attrs: { level: 2 } }, { blockId: 'p', type: 'PARAGRAPH', text: `본문 기록 ${tag}` }] },
  })).status()).toBe(201)
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`)
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 })

  await openMenu(page)
  await expect(page.getByRole('menu').getByText('준비 중')).toHaveCount(0)
  await expect(page.getByRole('menuitem')).toHaveText(['평가 정보 수정', '심화 탐구로 이어가기', '성장 기록에 남기기', '노트 내보내기', '휴지통으로 이동', '삭제'])

  // 평가 정보 수정 → 수정 창
  await page.getByRole('menuitem', { name: '평가 정보 수정' }).click()
  await expect(page.getByRole('dialog', { name: '수행평가 정보 수정' })).toBeVisible()
  await page.keyboard.press('Escape')

  // 노트 내보내기 → Markdown 파일(제목·본문)
  await openMenu(page)
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: '노트 내보내기' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.md$/)
  const text = await readFile((await file.path()) as string, 'utf8')
  expect(text).toContain(`# ${title}`)
  expect(text).toContain(`본문 기록 ${tag}`)
  expect(text).toContain('## 첨부 파일')

  // 심화 탐구로 이어가기 → 심화 탐구 첫 화면
  await openMenu(page)
  await page.getByRole('menuitem', { name: '심화 탐구로 이어가기' }).click()
  await expect(page).toHaveURL(/\/assessment\/enrichment$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 })

  // 삭제 → 제목을 적어야 버튼이 켜짐 → 영구 삭제 → 목록으로, 서버에서도 없음
  await openMenu(page)
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click()
  const confirm = page.getByTestId('delete-assessment-confirm')
  await expect(confirm).toBeDisabled()
  await page.getByTestId('delete-assessment-title').fill('다른 제목')
  await expect(confirm).toBeDisabled()
  await page.getByTestId('delete-assessment-title').fill(title)
  await confirm.click()
  await expect(page).toHaveURL(/\/assessment\/school-assessments$/, { timeout: 15_000 })
  expect((await request.get(`${API}/api/student/assessment/school-assessments/${sa}`, { headers: student })).status()).toBe(404)
  await page.screenshot({ path: 'test-results/a28-49-after-delete.png' })
})

test('[A28-49] 피드백을 보낸 수행평가는 삭제 대신 이유를 보이고 데이터는 그대로, 휴지통 이동은 그대로 된다', async ({ page, request }) => {
  test.setTimeout(120_000)
  const tag = runTag()
  const title = `E2E 삭제 보호 ${tag}`
  const sa = await newAssessment(request, title)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: '노트', blocks: [{ blockId: 'p', type: 'PARAGRAPH', text: '요청 당시' }] },
  })).json()
  expect((await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: student, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, noteRevisionId: note.revisionId, artifactVersionIds: [] } })).status()).toBe(201)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`)
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 })
  await openMenu(page)
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click()
  await page.getByTestId('delete-assessment-title').fill(title)
  await page.getByTestId('delete-assessment-confirm').click()
  await expect(page.getByTestId('delete-assessment-error')).toContainText('피드백 요청 기록')
  expect((await request.get(`${API}/api/student/assessment/school-assessments/${sa}`, { headers: student })).status()).toBe(200)
  await page.keyboard.press('Escape')

  // 휴지통 이동 회귀
  await openMenu(page)
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('menuitem', { name: '휴지통으로 이동' }).click()
  await expect(page).toHaveURL(/\/assessment\/archive\?tab=trash/, { timeout: 15_000 })
})
