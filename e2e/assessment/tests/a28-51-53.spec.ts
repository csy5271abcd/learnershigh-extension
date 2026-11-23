import { readFile } from 'node:fs/promises'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { API, STUDENT, STUDENT_ID, runTag, uniquePdf } from '../support.ts'

// A28-51~53 (2026-11-24 사용자 화면 01·02). 일회용 DB·Storage·합성 데이터만 쓴다(사용자 DB 영구 삭제 없음).
// 51 노트 내보내기 → 실제 PDF(텍스트 추출·여러 쪽·이미지·첨부 목록·저장 전 안내·실패 표시)
// 52 ⋯ 메뉴 '휴지통으로 이동'(휴지통 아이콘) vs '영구 삭제'(X 원 아이콘) 구별
// 53 휴지통 행 '복구' 옆 '영구 삭제' — 같은 모양, 확인 창 재사용, 행 제거·새로고침 뒤에도 없음, 409 보존, 복구 독립
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
const other = { 'X-Assessment-Student-Id': 'stu_002' }
const S = `${API}/api/student/assessment`
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

type PdfDoc = { numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: { str?: string }[] }> }> }
async function pdfText(bytes: Buffer): Promise<{ pages: number; text: string[] }> {
  const pdfjs = (await import(new URL('../../../frontend/node_modules/pdfjs-dist/legacy/build/pdf.mjs', import.meta.url).href)) as {
    getDocument(options: object): { promise: Promise<PdfDoc> }
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise
  const text: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    text.push(content.items.map((item) => item.str ?? '').join(''))
  }
  return { pages: doc.numPages, text }
}

async function newAssessment(request: APIRequestContext, title: string) {
  const created = await request.post(`${S}/school-assessments`, { headers: student, data: { title, subjectId: 'subj_02', academicYear: 2026, semester: 2 } })
  expect(created.status()).toBe(201)
  return (await created.json()).assessmentId as string
}

async function attach(request: APIRequestContext, name: string, mimeType: string, buffer: Buffer) {
  const response = await request.post(`${S}/note-attachments`, { headers: student, multipart: { file: { name, mimeType, buffer } } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json() as Promise<{ attachmentId: string; fileName: string; contentType: string; sizeBytes: number }>
}

const fileBlock = (id: string, type: string, a: { attachmentId: string; fileName: string; contentType: string; sizeBytes: number }) => ({
  blockId: id,
  type,
  text: '',
  attrs: { file: { name: a.fileName, size: a.sizeBytes, mimeType: a.contentType, attachmentId: a.attachmentId } },
})

async function saveNote(request: APIRequestContext, sa: string, blocks: object[]) {
  const response = await request.post(`${S}/notes`, { headers: student, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: '탐구 과정', blocks } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json() as Promise<{ noteId: string; revisionId: string }>
}

async function openDetail(page: Page, sa: string, title: string) {
  await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`)
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 })
}

async function openMenu(page: Page) {
  await page.getByRole('button', { name: '더보기' }).click()
}

async function exportPdf(page: Page) {
  await openMenu(page)
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: '노트 내보내기' }).click()
  const file = await download
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path()) as string) }
}

test('[A28-51] 노트 내보내기 → 한글·영문·특수문자·여러 쪽·이미지·첨부 목록이 든 텍스트 PDF', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const title = `나의 20세기 역사 탐구 ${tag}`
  const sa = await newAssessment(request, title)
  const image1 = await attach(request, `지도 ${tag}.png`, 'image/png', PNG)
  const image2 = await attach(request, `사진 ${tag}.png`, 'image/png', PNG)
  const pdf = await attach(request, `참고 ${tag}.pdf`, 'application/pdf', uniquePdf(`${tag}-a2851`))
  const blocks: object[] = [{ blockId: 'h', type: 'HEADING', text: '1. 조사 배경 (Background)', attrs: { level: 1 } }]
  for (let i = 0; i < 45; i++) blocks.push({ blockId: `p${i}`, type: 'PARAGRAPH', text: `문단 ${i} — WWII & 냉전 (1945~1991) · 100% <특수> 『인용』 ${tag}` })
  blocks.push({ blockId: 'b', type: 'BULLET', text: '글머리 항목' }, { blockId: 'c', type: 'CHECKLIST', text: '자료 확인', attrs: { checked: true } })
  blocks.push(fileBlock('i1', 'IMAGE', image1), fileBlock('i2', 'IMAGE', image2), fileBlock('f', 'FILE', pdf))
  blocks.push({ blockId: 'last', type: 'PARAGRAPH', text: `마지막 문단 ${tag}` })
  await saveNote(request, sa, blocks)

  await page.setViewportSize({ width: 1366, height: 900 })
  await openDetail(page, sa, title)
  const exported = await exportPdf(page)
  expect(exported.name).toMatch(new RegExp(`^나의 20세기 역사 탐구 ${tag}_탐구노트_\\d{4}-\\d{2}-\\d{2}\\.pdf$`))
  expect(exported.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  await expect(page.getByTestId('toast')).toContainText('PDF 파일로 내보냈어요')

  const { pages, text } = await pdfText(exported.bytes)
  expect(pages).toBeGreaterThanOrEqual(2)
  const all = text.join('\n')
  expect(text[0]).toContain(title)
  expect(text[0]).toContain('진행 상태')
  expect(all).toContain(`문단 0 — WWII & 냉전 (1945~1991) · 100% <특수> 『인용』 ${tag}`)
  expect(all).toContain(`문단 44 — WWII`)
  expect(all).toContain(`마지막 문단 ${tag}`)
  expect(all).toContain(`[PDF 첨부] 참고 ${tag}.pdf`)
  expect(all).toContain(`지도 ${tag}.png · 이미지`)
  expect(text[pages - 1]).toContain(`${pages} / ${pages}`)
  expect(all).not.toMatch(/[□■�]/)
  // 서버 응답도 직접: MIME·파일 이름·남의 수행평가 404·비인증 401
  const direct = await request.post(`${S}/school-assessments/${sa}/note-export`, { headers: student, data: { subjectName: '한국사', meta: [] } })
  expect(direct.status()).toBe(200)
  expect(direct.headers()['content-type']).toBe('application/pdf')
  expect(direct.headers()['content-disposition']).toContain("filename*=UTF-8''")
  expect((await request.post(`${S}/school-assessments/${sa}/note-export`, { headers: other, data: { meta: [] } })).status()).toBe(404)
  expect((await request.post(`${S}/school-assessments/${sa}/note-export`, { data: { meta: [] } })).status()).toBe(401)
})

test('[A28-51] 빈 노트 · 저장 전 편집 안내 · 만드는 중 다시 누르기 막음 · 실패 표시', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const title = `E2E 내보내기 상태 ${tag}`
  const sa = await newAssessment(request, title)
  await page.setViewportSize({ width: 1366, height: 900 })
  await openDetail(page, sa, title)

  // 노트가 없어도 PDF(저장된 노트 없음)
  const empty = await exportPdf(page)
  const emptyText = (await pdfText(empty.bytes)).text.join('\n')
  expect(emptyText).toContain('저장된 노트 없음')
  expect(emptyText).toContain('저장된 노트 내용이 없어요')

  // 만드는 중: 메뉴 항목이 '만드는 중'으로 바뀌고 다시 눌러도 요청이 하나뿐 → 실패하면 오류 표시
  let calls = 0
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/note-export', async (route) => {
    calls += 1
    await held
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류(시험)', details: {} }) })
  })
  await openMenu(page)
  await page.getByRole('menuitem', { name: '노트 내보내기' }).click()
  await openMenu(page)
  const busy = page.getByRole('menuitem', { name: /PDF 만드는 중/ })
  await expect(busy).toBeVisible()
  await expect(busy).toHaveAttribute('aria-disabled', 'true')
  await busy.click({ force: true })
  release()
  await expect(page.getByTestId('toast')).toContainText('PDF를 만들지 못했어요')
  expect(calls).toBe(1)
  await page.unroute('**/note-export')

  // 저장 전 편집: 저장이 실패해 편집이 남은 상태 → 먼저 저장하라는 확인 창, 취소하면 내보내지 않음
  await page.route('**/api/student/assessment/notes**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()))
  await page.getByLabel('노트 본문').locator('textarea').first().fill(`아직 저장 안 한 편집 ${tag}`)
  await page.getByTestId('note-save-now').click().catch(() => {})
  let message = ''
  page.once('dialog', (dialog) => {
    message = dialog.message()
    void dialog.dismiss()
  })
  let downloaded = false
  page.once('download', () => (downloaded = true))
  await openMenu(page)
  await page.getByRole('menuitem', { name: '노트 내보내기' }).click()
  await expect.poll(() => message).toContain('저장하지 않은 편집')
  expect(message).toContain('먼저 저장')
  await page.waitForTimeout(1000)
  expect(downloaded).toBe(false)
  await page.unroute('**/api/student/assessment/notes**')
})

test('[A28-52] ⋯ 메뉴: 휴지통으로 이동(휴지통 아이콘)과 영구 삭제(X 원 아이콘)가 구별되고 키보드로 고를 수 있다', async ({ page, request }) => {
  test.setTimeout(90_000)
  const tag = runTag()
  const title = `E2E 아이콘 ${tag}`
  const sa = await newAssessment(request, title)
  await page.setViewportSize({ width: 1366, height: 900 })
  await openDetail(page, sa, title)
  await openMenu(page)
  await expect(page.getByRole('menuitem')).toHaveText(['평가 정보 수정', '심화 탐구로 이어가기', '성장 기록에 남기기', '노트 내보내기', '휴지통으로 이동', '영구 삭제'])
  const trash = page.getByRole('menuitem', { name: '휴지통으로 이동' })
  const remove = page.getByRole('menuitem', { name: '영구 삭제' })
  const trashIcon = await trash.locator('svg').innerHTML()
  const removeIcon = await remove.locator('svg').innerHTML()
  expect(trashIcon).not.toBe(removeIcon)
  expect(removeIcon).toContain('<circle')
  expect(trashIcon).not.toContain('<circle')
  await page.screenshot({ path: 'test-results/a28-52-menu-icons.png' })
  // 키보드: 영구 삭제에 포커스 → Enter → 확인 창(제목 입력 전 버튼 꺼짐)
  await remove.focus()
  await expect(remove).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('delete-assessment-confirm')).toBeDisabled()
  await page.keyboard.press('Escape')
  expect((await request.get(`${S}/school-assessments/${sa}`, { headers: student })).status()).toBe(200)
})

test('[A28-53] 휴지통 행: 복구 옆 같은 모양 영구 삭제 → 제목 확인 → 행 제거·새로고침 뒤에도 없음, 다른 행 복구는 그대로', async ({ page, request }) => {
  test.setTimeout(180_000)
  const tag = runTag()
  const goneTitle = `E2E 휴지통 영구 삭제 ${tag}`
  const keepTitle = `E2E 휴지통 복구 ${tag}`
  const gone = await newAssessment(request, goneTitle)
  const keep = await newAssessment(request, keepTitle)
  await saveNote(request, gone, [{ blockId: 'p', type: 'PARAGRAPH', text: `지울 노트 ${tag}` }])
  const image = await attach(request, `복구 사진 ${tag}.png`, 'image/png', PNG)
  await saveNote(request, keep, [{ blockId: 'p', type: 'PARAGRAPH', text: `남길 노트 ${tag}` }, fileBlock('i', 'IMAGE', image)])
  for (const id of [gone, keep]) expect((await request.delete(`${S}/school-assessments/${id}`, { headers: student })).status()).toBe(204)

  // 권한: 남의 학생 404 · 비인증 401 · 제목 다르면 400 — 데이터 그대로
  expect((await request.post(`${S}/school-assessments/${gone}/permanent-delete`, { headers: other, data: { confirmTitle: goneTitle } })).status()).toBe(404)
  expect((await request.post(`${S}/school-assessments/${gone}/permanent-delete`, { data: { confirmTitle: goneTitle } })).status()).toBe(401)
  expect((await request.post(`${S}/school-assessments/${gone}/permanent-delete`, { headers: student, data: { confirmTitle: '다른 제목' } })).status()).toBe(400)

  for (const width of [800, 1366, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${STUDENT}/assessment/archive?tab=trash`)
    const row = page.getByRole('listitem').filter({ hasText: goneTitle })
    await expect(row).toBeVisible({ timeout: 20_000 })
    const restoreButton = row.getByTestId('trash-restore')
    const deleteButton = row.getByTestId('trash-permanent-delete')
    await expect(deleteButton).toHaveText('영구 삭제')
    await expect(deleteButton).toHaveAccessibleName(`'${goneTitle}' 영구 삭제(되돌릴 수 없음)`)
    const [a, b] = [await restoreButton.boundingBox(), await deleteButton.boundingBox()]
    expect(Math.abs((a?.height ?? 0) - (b?.height ?? -1))).toBeLessThanOrEqual(1)
    const look = (el: Element) => { const s = getComputedStyle(el); return [s.borderRadius, s.borderTopWidth, s.borderTopStyle, s.fontSize].join('|') }
    expect(await deleteButton.evaluate(look)).toBe(await restoreButton.evaluate(look))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: `test-results/a28-53-trash-${width}.png` })
  }

  const row = page.getByRole('listitem').filter({ hasText: goneTitle })
  // 취소 → 그대로
  await row.getByTestId('trash-permanent-delete').click()
  await expect(page.getByRole('dialog')).toContainText('되돌릴 수 없어요')
  await page.getByRole('button', { name: '취소' }).click()
  await expect(row).toBeVisible()
  // 요청 실패 → 오류 표시, 행 그대로
  await page.route('**/permanent-delete', (route) => route.abort())
  await row.getByTestId('trash-permanent-delete').click()
  const confirm = page.getByTestId('delete-assessment-confirm')
  await expect(confirm).toBeDisabled()
  await page.getByTestId('delete-assessment-title').fill('다른 제목')
  await expect(confirm).toBeDisabled()
  await page.getByTestId('delete-assessment-title').fill(goneTitle)
  await confirm.click()
  await expect(page.getByTestId('delete-assessment-error')).toBeVisible()
  await page.unroute('**/permanent-delete')
  // 성공(연속 클릭해도 요청 한 번) → 행만 사라짐
  let deletes = 0
  page.on('request', (req) => { if (req.url().endsWith('/permanent-delete')) deletes += 1 })
  await confirm.dblclick()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })
  await expect(row).toHaveCount(0)
  expect(deletes).toBe(1)
  await expect(page.getByRole('listitem').filter({ hasText: keepTitle })).toBeVisible()
  await expect(page.getByTestId('toast')).toContainText('영구 삭제했어요')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: keepTitle })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('listitem').filter({ hasText: goneTitle })).toHaveCount(0)
  expect((await request.get(`${S}/school-assessments/${gone}`, { headers: student })).status()).toBe(404)

  // 다른 항목 복구 → 상세·노트·첨부 그대로
  await page.getByRole('listitem').filter({ hasText: keepTitle }).getByTestId('trash-restore').click()
  await expect(page.getByRole('listitem').filter({ hasText: keepTitle })).toHaveCount(0, { timeout: 15_000 })
  await openDetail(page, keep, keepTitle)
  await expect(page.getByText(`남길 노트 ${tag}`)).toBeVisible()
  await expect(page.getByTestId('note-file')).toContainText(`복구 사진 ${tag}.png`)
})

test('[A28-53] 피드백 요청·성장 기록이 연결된 휴지통 항목은 영구 삭제가 409로 막히고 이유가 보이며 데이터는 그대로', async ({ page, request }) => {
  test.setTimeout(120_000)
  const tag = runTag()
  const feedbackTitle = `E2E 휴지통 피드백 ${tag}`
  const growthTitle = `E2E 휴지통 성장 ${tag}`
  const withFeedback = await newAssessment(request, feedbackTitle)
  const note = await saveNote(request, withFeedback, [{ blockId: 'p', type: 'PARAGRAPH', text: '요청 당시' }])
  expect((await request.post(`${S}/feedback-requests`, { headers: student, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: withFeedback, noteRevisionId: note.revisionId, artifactVersionIds: [] } })).status()).toBe(201)
  const withGrowth = await newAssessment(request, growthTitle)
  expect((await request.post(`${S}/growth-records`, { headers: student, data: { title: `연결 기록 ${tag}`, subjectId: 'subj_02', relatedSourceType: 'SCHOOL_ASSESSMENT', relatedSourceId: withGrowth, artifactIds: [] } })).status()).toBe(201)
  for (const id of [withFeedback, withGrowth]) expect((await request.delete(`${S}/school-assessments/${id}`, { headers: student })).status()).toBe(204)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/archive?tab=trash`)
  for (const [title, reason] of [[feedbackTitle, '피드백 요청 기록'], [growthTitle, '성장 기록']] as const) {
    const row = page.getByRole('listitem').filter({ hasText: title })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await row.getByTestId('trash-permanent-delete').click()
    await page.getByTestId('delete-assessment-title').fill(title)
    await page.getByTestId('delete-assessment-confirm').click()
    await expect(page.getByTestId('delete-assessment-error')).toContainText(reason)
    await page.getByRole('button', { name: '취소' }).click()
    await expect(row).toBeVisible()
  }
  await page.screenshot({ path: 'test-results/a28-53-blocked.png' })
  const trash = await (await request.get(`${S}/archive`, { headers: student, params: { tab: 'trash', page: 0, size: 100 } })).json()
  const ids = (trash.items as { sourceId: string }[]).map((item) => item.sourceId)
  expect(ids).toEqual(expect.arrayContaining([withFeedback, withGrowth]))
})
