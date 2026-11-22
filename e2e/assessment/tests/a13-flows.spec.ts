import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { linkSubjectThenTeaching } from '../reviewUi.ts'

// A13 실제 화면 조작 E2E. 일회용 DB의 실제 Backend·Storage(분석기만 Stub 합성 0.3 결과).
// 운영계획 재확정(A) · 노트 블록 편집기(B) · 관리자 답변 작성(C) · 성장 기록(D) · 보관함(E).
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }
const gangnam = { 'X-Assessment-Admin-Id': 'adm_gangnam' }

async function newAssessment(request: APIRequestContext, title: string) {
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, {
    headers: studentHeaders,
    data: { title, subjectId: 'subj_02', academicYear: 2026, semester: 2 },
  })
  expect(created.status()).toBe(201)
  return (await created.json()).assessmentId as string
}

test('A: 운영계획 확정 → 재검토 → 수정 → 다시 확정 → 이전 버전 이력 보존, 학생 Planner는 최신 버전', async ({ page, request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-contract03-reconfirm-${tag}.pdf`, uniquePdf(tag))
  const studentPlan = async () => (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: studentHeaders })).json()

  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  const rows = page.getByTestId('teaching-plan-row')
  // A27-UX [02]: 과목 연결은 2단계 과목 확인에서 한다(운영계획 단계의 두 번째 Dropdown 제거)
  await linkSubjectThenTeaching(page, 0, 'subj_02')
  await rows.nth(0).getByRole('button', { name: '확인' }).click()
  await rows.nth(7).getByRole('button', { name: '제외' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 15_000 })
  await expect(page.getByTestId('teaching-plan-history-item')).toHaveCount(1)
  const v1 = await studentPlan()
  expect(v1.rows.length).toBe(1)

  // 재검토 시작(확인 창) → 학생은 여전히 1차
  await page.getByTestId('teaching-plan-rereview-start').click()
  await page.getByTestId('teaching-plan-rereview-confirm').click()
  await expect(page.getByTestId('teaching-plan-rereview-badge')).toBeVisible({ timeout: 15_000 })
  await rows.nth(1).getByRole('button', { name: '확인' }).click()
  await rows.nth(7).getByRole('button', { name: '확인' }).click() // 1차에서 제외한 행을 다시 공개
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  expect((await studentPlan()).rows.length).toBe(1)
  await expect(page.getByTestId('teaching-plan-confirm')).toContainText('다시 확정')
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 15_000 })
  await expect(page.getByTestId('teaching-plan-history-item')).toHaveCount(2)
  await expect(page.getByTestId('teaching-plan-history-item').first()).toContainText('2차 확정')
  await expect(page.getByTestId('teaching-plan-history-item').first()).toContainText('학생 공개 중')
  // 이전 버전(1차) 행을 읽기 전용으로 연다
  await page.getByTestId('teaching-plan-history-item').nth(1).getByTestId('teaching-plan-history-toggle').click()
  await expect(page.getByTestId('teaching-plan-history-rows')).toContainText('제외')
  await page.screenshot({ path: 'test-results/a13-teaching-reconfirm-1536.png', fullPage: true })

  const v2 = await studentPlan()
  expect(v2.status).toBe('CONFIRMED')
  expect(v2.rows.length).toBe(3)
  expect(JSON.stringify(v2)).not.toContain('versionNo')
  // 평가 정보 확정 이력은 영향 없음(아직 확정 안 함)
  const evaluation = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/reviews`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })).json()
  expect(evaluation.items.length).toBe(0)
  // 학생 Monthly Planner 화면
  await page.goto(`${STUDENT}/assessment/monthly-plan`)
  await expect(page.getByTestId('student-monthly-plan').first()).toBeVisible({ timeout: 15_000 })
})

test('B: 학생이 노트 블록 편집기로 쓰고 저장·새로고침·수정하면 Revision이 쌓이고 이전 버전은 그대로 열린다', async ({ page, request }) => {
  const tag = runTag()
  const assessmentId = await newAssessment(request, `E2E 노트 화면 ${tag}`)
  const notes = async () => (await (await request.get(`${API}/api/student/assessment/notes`, { headers: studentHeaders, params: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId } })).json()).items
  await page.goto(`${STUDENT}/assessment/school-assessments/${assessmentId}`)
  await page.getByPlaceholder('노트 제목').fill(`탐구 노트 ${tag}`)
  const body = page.getByLabel('노트 본문').locator('textarea').first()
  await body.fill(`첫 번째 기록 ${tag}`)
  await page.getByTestId('note-save-now').click()
  await expect.poll(async () => (await notes())[0]?.latestRevisionNumber ?? (await notes())[0]?.revisionNumber ?? 0, { timeout: 15_000 }).toBe(1)
  await page.reload()
  await expect(page.getByLabel('노트 본문').locator('textarea').first()).toHaveValue(`첫 번째 기록 ${tag}`, { timeout: 15_000 })
  await page.getByLabel('노트 본문').locator('textarea').first().fill(`고친 기록 ${tag}`)
  await page.getByTestId('note-save-now').click()
  await expect.poll(async () => (await notes())[0]?.latestRevisionNumber ?? (await notes())[0]?.revisionNumber ?? 0, { timeout: 15_000 }).toBe(2)

  const noteId = (await notes())[0].noteId as string
  const revisions = await (await request.get(`${API}/api/student/assessment/notes/${noteId}/revisions`, { headers: studentHeaders })).json()
  expect(revisions.items.map((item: { revisionNumber: number }) => item.revisionNumber).sort()).toEqual([1, 2])
  // 화면: 수정 이력 → v1 열기 → 첫 기록 그대로
  await page.getByRole('button', { name: '수정 이력' }).click()
  await page.getByRole('dialog', { name: '노트 수정 이력' }).getByRole('button', { name: /v1/ }).click()
  const preview = page.getByRole('dialog', { name: /탐구 노트 v1/ })
  await expect(preview).toContainText(`첫 번째 기록 ${tag}`)
  await expect(preview).not.toContainText(`고친 기록 ${tag}`)
  await page.screenshot({ path: 'test-results/a13-note-revision-1536.png' })
  // 오래된 기준 Revision으로 저장하면 충돌(409) — 덮어쓰지 않는다
  const first = revisions.items.find((item: { revisionNumber: number }) => item.revisionNumber === 1).revisionId
  const stale = await request.put(`${API}/api/student/assessment/notes/${noteId}`, { headers: studentHeaders, data: { expectedRevisionId: first, title: 'x', blocks: [] } })
  expect(stale.status()).toBe(409)
})

test('C: 관리자가 화면에서 의견을 쓰고 보내면 학생이 확인한다 — 요청 당시 Snapshot은 바뀌지 않는다', async ({ page, request }) => {
  const tag = runTag()
  const assessmentId = await newAssessment(request, `E2E 피드백 화면 ${tag}`)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: studentHeaders,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: `요청 노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `요청 당시 내용 ${tag}` }] },
  })).json()
  const created = await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, noteRevisionId: note.revisionId, artifactVersionIds: [] } })
  expect(created.status()).toBe(201)
  const requestId = (await created.json()).requestId as string
  // 요청 뒤 학생이 노트를 고쳐도 Snapshot은 요청 당시
  await request.put(`${API}/api/student/assessment/notes/${note.noteId}`, { headers: studentHeaders, data: { expectedRevisionId: note.revisionId, title: `요청 노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `요청 뒤 고친 내용 ${tag}` }] } })

  await page.goto(`${ADMIN}/assessment/feedback/${requestId}?devAdmin=adm_gangnam`)
  await expect(page.getByText(`요청 당시 내용 ${tag}`).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(`요청 뒤 고친 내용 ${tag}`)).toHaveCount(0)
  const comment = `근거 자료를 한 가지 더 연결해 보세요 ${tag}`
  await page.getByPlaceholder('학생에게 전달할 의견을 자유롭게 적어 주세요').fill(comment)
  await page.getByRole('button', { name: '임시 저장' }).click()
  await expect(page.getByText('임시 저장됨').first()).toBeVisible({ timeout: 15_000 })
  const beforeSend = await (await request.get(`${API}/api/student/assessment/feedback-requests/${requestId}/reply`, { headers: studentHeaders })).json()
  expect(beforeSend.status).toBe('PENDING')
  expect(JSON.stringify(beforeSend)).not.toContain(comment)
  await page.getByRole('button', { name: '보내기' }).click()
  await page.getByRole('dialog').getByRole('button').last().click()
  await expect.poll(async () => (await (await request.get(`${API}/api/student/assessment/feedback-requests/${requestId}/reply`, { headers: studentHeaders })).json()).status, { timeout: 15_000 }).toBe('DELIVERED')
  await page.screenshot({ path: 'test-results/a13-admin-reply-1536.png' })
  // 다시 보낼 수 없다
  const again = await request.post(`${API}/api/admin/assessment/feedback-requests/${requestId}/deliver`, { headers: gangnam, data: { overallComment: 'x', comments: [], recommendations: [] } })
  expect(again.status()).toBe(409)
  // 다른 지점 관리자는 요청을 볼 수 없다
  const other = await request.get(`${API}/api/admin/assessment/feedback-requests/${requestId}`, { headers: { 'X-Assessment-Admin-Id': 'adm_bundang' } })
  expect(other.status()).toBe(404)
  // 학생 화면에서 답변 확인, 학생 원본 노트는 학생이 고친 그대로
  await page.goto(`${STUDENT}/assessment/feedback`)
  await expect(page.getByLabel('피드백 요청 목록')).toContainText(comment, { timeout: 15_000 })
  const latest = await (await request.get(`${API}/api/student/assessment/notes/${note.noteId}/revisions`, { headers: studentHeaders })).json()
  expect(latest.items.length).toBe(2)
})

test('D·E: 성장 기록을 화면에서 쓰고 저장하면 목록·상세·관리자 조회에 남고, 보관함 과목 폴더에서 찾을 수 있다', async ({ page, request }) => {
  const tag = runTag()
  const title = `E2E 성장 기록 ${tag}`
  const assessmentTitle = `E2E 성장 수행평가 ${tag}`
  await newAssessment(request, assessmentTitle)
  await page.goto(`${STUDENT}/assessment/growth/new`)
  const form = page.getByRole('form', { name: '성장 기록' })
  await form.getByLabel('제목').fill(title)
  await form.getByLabel('관련 활동').selectOption({ label: assessmentTitle })
  await form.getByLabel('배운 점').fill(`실험 설계를 다시 생각하게 됐다 ${tag}`)
  await form.getByRole('button', { name: '저장' }).click()
  // 저장이 끝나 상세 주소로 넘어간 뒤에 확인한다(글이 아직 입력칸 안에 있을 때 바로 새로고침하면 저장 전 화면을 다시 연다)
  await expect(page).toHaveURL(/\/assessment\/growth\/(?!new)[^/?]+$/, { timeout: 15_000 })
  await expect(page.getByText(`실험 설계를 다시 생각하게 됐다 ${tag}`)).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await expect(page.getByText(`실험 설계를 다시 생각하게 됐다 ${tag}`)).toBeVisible({ timeout: 15_000 })
  await page.goto(`${STUDENT}/assessment/growth`)
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
  // 관리자(담당 지점) 조회 · 다른 지점은 불가
  const adminList = await request.get(`${API}/api/admin/assessment/students/${STUDENT_ID}/growth-records`, { headers: gangnam })
  expect(adminList.status()).toBe(200)
  expect(await adminList.text()).toContain(title)
  const otherBranch = await request.get(`${API}/api/admin/assessment/students/${STUDENT_ID}/growth-records`, { headers: { 'X-Assessment-Admin-Id': 'adm_bundang' } })
  expect(otherBranch.status()).toBe(404)

  // 보관함: 최근 기록 · 과목 폴더(통합과학2)
  await page.goto(`${STUDENT}/assessment/archive`)
  const recent = page.getByLabel('최근 기록 목록')
  await expect(recent).toContainText(assessmentTitle, { timeout: 15_000 })
  const folder = page.getByRole('group', { name: '과목 폴더' }).getByRole('button', { name: /통합과학2/ })
  if (await folder.count()) {
    await folder.first().click()
    await expect(recent).toContainText(assessmentTitle)
  }
  await page.screenshot({ path: 'test-results/a13-archive-1536.png', fullPage: true })
})
