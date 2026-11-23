import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, API, STUDENT, STUDENT_ID, runTag, uniquePdf } from '../support.ts'

// A28-43~47 (2026-11-23 사용자 화면 01~05). 일회용 DB·Storage·합성 파일만 쓴다.
// 43 최근 활동 범례 · 44 관리자 피드백 첨부 바로 미리보기(이미지·PDF·미지원 형식)·Snapshot 유지·권한
// 46 학생 수행평가 상단 메뉴 '휴지통으로 이동' → 목록에서 사라짐 → 보관함 휴지통 복원 → 노트 그대로 · 47 자료함 불필요 액션 0
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const PNG2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
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

const block = (id: string, type: string, a: { attachmentId: string; fileName: string; contentType: string; sizeBytes: number }) => ({
  blockId: id,
  type,
  text: '',
  attrs: { file: { name: a.fileName, size: a.sizeBytes, mimeType: a.contentType, attachmentId: a.attachmentId } },
})

test('[A28-43] 관리자 최근 활동: 점 색 범례(등록·분석·확정·피드백), 활동명 유지', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${ADMIN}/assessment`)
  const legend = page.getByTestId('overview-activity-legend')
  await expect(legend).toBeVisible({ timeout: 30_000 })
  await expect(legend.locator('li')).toHaveText(['등록', '분석', '확정(평가정보·운영계획)', '피드백'])
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('[A28-44] 관리자 피드백: 이미지·PDF 바로 미리보기, 미지원 형식은 내려받기만, 학생 교체 뒤에도 요청 당시 파일, 범위 밖 거절', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const sa = await newAssessment(request, `E2E 미리보기 ${tag}`)
  const image = await attach(request, `실험 사진 ${tag}.png`, 'image/png', PNG)
  const pdf = await attach(request, `보고서 ${tag}.pdf`, 'application/pdf', uniquePdf(`${tag}-a2844`))
  const docx = await attach(request, `정리 ${tag}.docx`, 'application/octet-stream', DOCX)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: `미리보기 노트 ${tag}`, blocks: [{ blockId: 'p', type: 'PARAGRAPH', text: `기록 ${tag}` }, block('img', 'IMAGE', image), block('pdf', 'FILE', pdf), block('doc', 'FILE', docx)] },
  })).json()
  const created = await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: student, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, noteRevisionId: note.revisionId, artifactVersionIds: [] } })
  expect(created.status()).toBe(201)
  const requestId = (await created.json()).requestId as string
  // 요청 뒤 학생이 사진을 바꾼다 → 관리자 화면은 요청 당시 사진
  const replaced = await attach(request, `바꾼 사진 ${tag}.png`, 'image/png', PNG2)
  expect((await request.put(`${API}/api/student/assessment/notes/${note.noteId}`, { headers: student, data: { expectedRevisionId: note.revisionId, title: `미리보기 노트 ${tag}`, blocks: [block('img', 'IMAGE', replaced)] } })).status()).toBe(200)
  const statusBefore = (await (await request.get(`${API}/api/admin/assessment/feedback-requests/${requestId}`, { headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' } })).json()).status

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/feedback/${requestId}?devAdmin=adm_gangnam`)
  const cards = page.getByTestId('admin-note-file')
  await expect(cards).toHaveCount(3, { timeout: 30_000 })

  // 이미지: 같은 화면 모달, 실제로 그려짐(1×1), 확대·화면 맞춤, ESC 로 닫힘
  await cards.nth(0).getByTestId('admin-note-file-preview').click()
  const modal = page.getByTestId('attachment-preview')
  await expect(modal).toHaveAttribute('data-kind', 'image')
  await expect.poll(async () => page.getByTestId('attachment-preview-image').evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1)
  await page.getByTestId('attachment-preview-zoom-in').click()
  await expect(page.getByTestId('attachment-preview-zoom')).not.toHaveText('화면 맞춤')
  const download = page.waitForEvent('download')
  await page.getByTestId('attachment-preview-download').click()
  expect(sha(await readFile((await (await download).path()) as string))).toBe(sha(PNG))
  await page.screenshot({ path: 'test-results/a28-44-image-preview.png' })
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)

  // PDF: 기존 pdf.js 뷰어(캔버스)
  await cards.nth(1).getByTestId('admin-note-file-preview').click()
  await expect(page.getByTestId('attachment-preview')).toHaveAttribute('data-kind', 'pdf')
  await expect(page.getByTestId('attachment-preview').locator('canvas')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'test-results/a28-44-pdf-preview.png' })
  await page.getByTestId('attachment-preview-close').click()

  // DOCX: 미리보기 미지원 · 내려받기만(빈 화면으로 속이지 않음)
  await cards.nth(2).getByTestId('admin-note-file-preview').click()
  await expect(page.getByTestId('attachment-preview-unsupported')).toContainText('미리보기 미지원')
  await page.getByTestId('attachment-preview-close').click()

  // 새로고침 뒤에도 같다 · 미리보기는 피드백 상태를 바꾸지 않는다
  await page.reload()
  await page.getByTestId('admin-note-file').nth(0).getByTestId('admin-note-file-preview').click()
  await expect.poll(async () => page.getByTestId('attachment-preview-image').evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1)
  const statusAfter = (await (await request.get(`${API}/api/admin/assessment/feedback-requests/${requestId}`, { headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' } })).json()).status
  expect(statusAfter).toBe(statusBefore)

  // 권한: 다른 지점 관리자 404 · 인증 없음 401 · 다른 학생 404
  expect((await request.get(`${API}/api/admin/assessment/note-attachments/${image.attachmentId}/preview`, { headers: { 'X-Assessment-Admin-Id': 'adm_bundang' } })).status()).toBe(404)
  expect((await request.get(`${API}/api/admin/assessment/note-attachments/${image.attachmentId}/preview`)).status()).toBe(401)
  expect((await request.get(`${API}/api/student/assessment/note-attachments/${image.attachmentId}/preview`, { headers: { 'X-Assessment-Student-Id': 'stu_002' } })).status()).toBe(404)
})

test('[A28-46] 학생 수행평가: 상단 메뉴 휴지통 이동 → 목록에서 사라짐 → 보관함 휴지통 복원 → 노트 그대로, 정책 미확정 문구 없음', async ({ page, request }) => {
  test.setTimeout(120_000)
  const tag = runTag()
  const title = `E2E 휴지통 ${tag}`
  const sa = await newAssessment(request, title)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: `휴지통 노트 ${tag}`, blocks: [{ blockId: 'p', type: 'PARAGRAPH', text: `보존할 기록 ${tag}` }] },
  })).json()
  const listed = async () => {
    const items = (await (await request.get(`${API}/api/student/assessment/school-assessments`, { headers: student, params: { academicYear: '2026', semester: '2' } })).json()).items as { assessmentId: string }[]
    return items.some((item) => item.assessmentId === sa)
  }
  expect(await listed()).toBe(true)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`)
  await page.getByRole('button', { name: '더보기' }).click()
  // A28-49 부터 메뉴에 '삭제'(영구 삭제, 확인 창)도 있다 — 이 시험은 휴지통 흐름만
  await expect(page.getByRole('menuitem', { name: '휴지통으로 이동', exact: true })).toHaveCount(1)
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('menuitem', { name: '휴지통으로 이동' }).click()
  await expect(page).toHaveURL(/\/assessment\/archive\?tab=trash/, { timeout: 15_000 })
  await expect(page.getByText('정책이 확정되기 전')).toHaveCount(0)
  expect(await listed()).toBe(false)
  await page.screenshot({ path: 'test-results/a28-46-trash.png' })

  // 다른 학생은 복원 못 함
  expect((await request.post(`${API}/api/student/assessment/archive/restore`, { headers: { 'X-Assessment-Student-Id': 'stu_002' }, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa } })).status()).toBeGreaterThanOrEqual(400)

  // 보관함 휴지통에서 복원 → 목록에 돌아오고 노트 내용 그대로
  const row = page.locator('li, tr, article').filter({ hasText: title }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.getByTestId('trash-restore').click()
  await expect.poll(listed, { timeout: 15_000 }).toBe(true)
  const notes = (await (await request.get(`${API}/api/student/assessment/notes`, { headers: student, params: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa } })).json()).items
  expect(notes[0].noteId).toBe(note.noteId)
  expect(JSON.stringify(notes[0].blocks)).toContain(`보존할 기록 ${tag}`)
})

test('[A28-47] 학생 자료함: 출처 확인 필요·AI 요약 없음, 검색·종류 필터·상세는 그대로', async ({ page, request }) => {
  const tag = runTag()
  const created = await request.post(`${API}/api/student/assessment/resources`, { headers: student, data: { type: 'LINK', title: `E2E 자료 ${tag}`, sourceUrl: 'https://example.com/a', tags: [] } })
  expect(created.status(), await created.text()).toBe(201)
  for (const width of [800, 1366, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${STUDENT}/assessment/resources`)
    await expect(page.getByText(`E2E 자료 ${tag}`)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('출처 확인 필요')).toHaveCount(0)
    await expect(page.getByText('AI 요약')).toHaveCount(0)
    await expect(page.getByText('Stage 3')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
  await page.getByRole('button', { name: '링크', exact: true }).click()
  await expect(page.getByText(`E2E 자료 ${tag}`)).toBeVisible()
  await page.getByText(`E2E 자료 ${tag}`).click()
  await expect(page).toHaveURL(/\/assessment\/resources\//)
  await expect(page.getByText('출처 확인 필요')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a28-47-resource-detail.png' })
})
