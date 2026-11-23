import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A28-37~42 (2026-11-23 사용자 UAT 이미지 01~07). 일회용 DB · Stub 분석기 · 합성 문서·합성 파일만 쓴다.
// (a) 학생 주차 목록 = 달력 위 개수 · (b) 분석 전 '검토 시작' → 실제 분석 → 검토 화면 · (c) 상태별 주 CTA 하나('확정 결과')
// (e) 학생 노트 첨부 실제 업로드 → 새로고침 → 서버 바이트 SHA → 관리자 피드백 상세 열람·내려받기 → 학생 파일 교체 뒤에도 요청 당시 파일 유지
// (f) 다른 지점 관리자·다른 학생 거절
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
/** 실제로 그려지는 1×1 PNG */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const PNG2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

async function newAssessment(request: APIRequestContext, title: string) {
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, { headers: student, data: { title, subjectId: 'subj_02', academicYear: 2026, semester: 2 } })
  expect(created.status()).toBe(201)
  return (await created.json()).assessmentId as string
}

test('[A28-37] 학생 주차 목록: 달력 보기와 같은 개수, 원문 주차로 묶음, 토글·월 이동 뒤에도 유지', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a2837-contract03-${tag}.pdf`, uniquePdf(`${tag}-a2837`))
  const rowKeys = ['T01', 'T02', 'T03', 'T05', 'T06', 'T09']
  const teaching = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    data: { analysisId: doc.analysisId, rows: rowKeys.map((rowKey) => ({ subjectIndex: 0, rowKey, subjectId: 'subj_02', decision: 'CONFIRMED' })) },
  })
  expect(teaching.status(), await teaching.text()).toBe(200)

  for (const width of [800, 1600]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${STUDENT}/assessment/monthly-plan?term=2026-2`)
    const planner = page.getByTestId('monthly-planner').first()
    await expect(planner).toBeVisible({ timeout: 20_000 })
    // 10월(contract03 T03 = '10월 2주')
    await planner.getByTestId('planner-month-10').click()
    const total = Number(((await planner.getByTestId('planner-total').textContent()) ?? '').replace(/\D/g, ''))
    expect(total, '10월에 계획이 있어야 시험이 의미 있다').toBeGreaterThan(0)
    await planner.getByTestId('planner-view-list').click()
    await expect(planner.getByTestId('planner-list-item')).toHaveCount(total)
    await expect(planner.getByText('10월 계획이 없어요')).toHaveCount(0)
    await expect(planner.getByTestId('planner-list-group').filter({ hasText: '10월 2주' })).toHaveCount(1)
    // 달력 ↔ 목록 토글, 다른 달 갔다 오기 → 같은 개수
    await planner.getByRole('button', { name: '달력' }).click()
    await planner.getByTestId('planner-month-11').click()
    await planner.getByTestId('planner-view-list').click()
    const novTotal = Number(((await planner.getByTestId('planner-total').textContent()) ?? '').replace(/\D/g, ''))
    await expect(planner.getByTestId('planner-list-item')).toHaveCount(novTotal)
    await planner.getByTestId('planner-month-10').click()
    await expect(planner.getByTestId('planner-list-item')).toHaveCount(total)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, '가로 넘침 없음').toBeLessThanOrEqual(0)
    await page.screenshot({ path: `test-results/a28-37-week-list-${width}.png` })
  }
})

test('[A28-39·40] 분석 목록 주 CTA 하나: 분석 전 검토 시작 → 실제 분석 → 검토 화면, 확정 뒤 확정 결과', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const fileName = `e2e-a2839-contract03-${tag}.pdf`
  const created = await request.post(PLANS, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: uniquePdf(`${tag}-a2839`) }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '2' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const revisionPath = `${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}`
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/analysis?school=school_001&year=2026&plan=${plan.planId}`)
  const row = page.getByTestId('plan-row').filter({ hasText: fileName })
  const action = row.getByTestId('plan-primary-action')
  await expect(action).toHaveText('검토 시작', { timeout: 30_000 })
  await expect(action).toHaveAttribute('data-action', 'analyze-then-review')
  await expect(row.getByRole('button')).toHaveCount(2) // 주 CTA + 원문
  await page.screenshot({ path: 'test-results/a28-39-list-before.png' })
  // 두 번 눌러도 분석 요청은 하나(버튼이 '분석 중…'으로 잠긴다)
  const analysisCalls: string[] = []
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/revisions\/[^/]+\/analysis$/.test(new URL(req.url()).pathname)) analysisCalls.push(req.url())
  })
  await action.click()
  await action.click({ force: true }).catch(() => undefined)
  // 자동 분석 성공 → 검토 화면(1단계 분석 요약). 자동 승인 아님
  await expect(page).toHaveURL(new RegExp(`/assessment/evaluation-plans/${plan.planId}/revisions/${plan.documentRevisionId}`), { timeout: 60_000 })
  expect(analysisCalls.length).toBe(1)
  const after = await (await request.get(`${revisionPath}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })).json()
  expect(after.analysisStatus).toMatch(/REVIEW_REQUIRED|PARTIAL|COMPLETED/)
  const planNow = await (await request.get(`${PLANS}/${plan.planId}`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })).json()
  expect(planNow.revisions[0].reviewStatus).not.toBe('CONFIRMED')
  await page.screenshot({ path: 'test-results/a28-39-review-entry.png' })

  // 목록으로 돌아오면 다시 분석하지 않고 '검토 시작'(검토 화면)
  await page.goto(`${ADMIN}/assessment/analysis?school=school_001&year=2026&plan=${plan.planId}`)
  await expect(action).toHaveAttribute('data-action', 'review', { timeout: 30_000 })
  await expect(row.getByRole('button', { name: /AI 결과 보기|확정 결과|분석 시작/ })).toHaveCount(0)

  // 확정 → '확정 결과' 하나 → 결과 화면 머리에 '다시 분석'·'확정 내용 수정'
  await confirmEvaluation(request, { planId: plan.planId, revisionId: plan.documentRevisionId, analysisId: after.analysisId, fileName, bytes: Buffer.alloc(0) }, 'subj_02', [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }])
  await page.reload()
  await expect(action).toHaveText('확정 결과', { timeout: 30_000 })
  await action.click()
  await expect(page).toHaveURL(/\/result/)
  await expect(page.getByTestId('plan-result-edit-confirmed')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('plan-result-reanalyze')).toBeVisible()
  await page.screenshot({ path: 'test-results/a28-40-result-head.png' })
})

test('[A28-41] 학생 노트 첨부 실제 저장 → 새로고침 → 관리자 열람 → 학생 교체 뒤에도 요청 당시 파일 유지, 범위 밖 거절', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const assessmentId = await newAssessment(request, `E2E 첨부 ${tag}`)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: student,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: `첨부 노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `실험 기록 ${tag}` }, { blockId: 'img1', type: 'IMAGE', text: '', attrs: {} }] },
  })).json()
  const latestBlocks = async () => {
    const items = (await (await request.get(`${API}/api/student/assessment/notes`, { headers: student, params: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId } })).json()).items
    const detail = await (await request.get(`${API}/api/student/assessment/notes/${items[0].noteId}/revisions/${items[0].latestRevisionId ?? items[0].revisionId}`, { headers: student })).json()
    return { revisionId: (items[0].latestRevisionId ?? items[0].revisionId) as string, blocks: detail.blocks as { blockId: string; attrs?: { file?: { attachmentId?: string; name?: string } } }[] }
  }

  // 학생 화면: 이미지 블록에서 실제 파일 선택 → 서버 저장 → 노트 저장
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${assessmentId}`)
  const uploaded = page.waitForResponse((res) => res.url().includes('/api/student/assessment/note-attachments') && res.request().method() === 'POST')
  await page.getByTestId('note-file-input').first().setInputFiles({ name: `실험 사진 ${tag}.png`, mimeType: 'image/png', buffer: PNG })
  expect((await uploaded).status()).toBe(201)
  await expect(page.getByTestId('note-file-status').first()).toHaveText('서버에 저장됨', { timeout: 15_000 })
  await page.getByTestId('note-save-now').click()
  await expect.poll(async () => (await latestBlocks()).blocks.find((block) => block.blockId === 'img1')?.attrs?.file?.attachmentId ?? null, { timeout: 15_000 }).not.toBeNull()
  const first = await latestBlocks()
  const firstId = first.blocks.find((block) => block.blockId === 'img1')!.attrs!.file!.attachmentId as string

  // 새로고침 뒤 서버 이미지로 다시 그린다(브라우저 메모리 미리보기 아님)
  await page.reload()
  await expect(page.getByTestId('note-file-status').first()).toHaveText('서버에 저장됨', { timeout: 15_000 })
  const image = page.getByTestId('note-file').first().locator('img')
  await expect(image).toBeVisible()
  await expect.poll(async () => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1)
  const bytes = Buffer.from(await (await request.get(`${API}/api/student/assessment/note-attachments/${firstId}/file`, { headers: student })).body())
  expect(sha(bytes)).toBe(sha(PNG))
  await page.screenshot({ path: 'test-results/a28-41-student-note-file.png' })

  // 피드백 요청(질문 없이) → 학생이 사진을 바꿔 저장
  const created = await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: student, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, noteRevisionId: first.revisionId, artifactVersionIds: [] } })
  expect(created.status()).toBe(201)
  const requestId = (await created.json()).requestId as string
  const second = await (await request.post(`${API}/api/student/assessment/note-attachments`, { headers: student, multipart: { file: { name: `바꾼 사진 ${tag}.png`, mimeType: 'image/png', buffer: PNG2 } } })).json()
  const replaced = await request.put(`${API}/api/student/assessment/notes/${note.noteId}`, {
    headers: student,
    data: { expectedRevisionId: first.revisionId, title: `첨부 노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `실험 기록 ${tag}` }, { blockId: 'img1', type: 'IMAGE', text: '', attrs: { file: { name: second.fileName, size: second.sizeBytes, mimeType: second.contentType, attachmentId: second.attachmentId } } }] },
  })
  expect(replaced.status()).toBe(200)

  // 관리자 피드백 상세: 요청 당시 파일을 열고 내려받는다(바이트 = 처음 올린 파일)
  await page.goto(`${ADMIN}/assessment/feedback/${requestId}?devAdmin=adm_gangnam`)
  const card = page.getByTestId('admin-note-file').first()
  await expect(card).toHaveAttribute('data-stored', 'true', { timeout: 30_000 })
  await expect(page.getByText('Storage 연동')).toHaveCount(0)
  const download = page.waitForEvent('download')
  await card.getByTestId('admin-note-file-download').click()
  const saved = await download
  expect(sha(await readFile((await saved.path()) as string))).toBe(sha(PNG))
  expect(saved.suggestedFilename()).toBe(`실험 사진 ${tag}.png`)
  await page.screenshot({ path: 'test-results/a28-41-admin-feedback-file.png' })

  // (f) 범위 밖: 다른 지점 관리자 · 다른 학생 · 인증 없음
  expect((await request.get(`${API}/api/admin/assessment/note-attachments/${firstId}/file`, { headers: { 'X-Assessment-Admin-Id': 'adm_bundang' } })).status()).toBe(404)
  expect((await request.get(`${API}/api/student/assessment/note-attachments/${firstId}/file`, { headers: { 'X-Assessment-Student-Id': 'stu_002' } })).status()).toBe(404)
  expect((await request.get(`${API}/api/admin/assessment/note-attachments/${firstId}/file`)).status()).toBe(401)
})
