import { expect, test, type Page } from '@playwright/test'
import { chooseSubject, confirmThroughSteps } from '../reviewUi.ts'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { pickStudentSubject } from '../studentUi.ts'

// A12 관리자·학생 Assessment 실제 API 흐름. 일회용 DB의 실제 Backend·Storage를 쓴다(분석기만 Stub — 합성 결과).
// - 화면 조작: 채점기준 수동 보완·확정·재검토·재확정(A·B), 학생 수행평가 추가·상태 변경(C), 심화탐구 열람(F), 현황(G)
// - 노트 블록 편집기·파일 업로드·관리자 답변은 실제 HTTP API로 만들고(D·E) 학생·관리자 화면에서 다시 읽어 확인한다.
const admin = { 'X-Assessment-Admin-Id': ADMIN_ID }
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }

async function confirmOnScreen(page: Page, fileName: string, bytes: Buffer) {
  await page.getByTestId('review-step-confirm-tab').click()
  await confirmThroughSteps(page, { name: fileName, mimeType: 'application/pdf', buffer: bytes })
}

test('A·B: 채점기준 수동 보완 → 확정 → 학생 공개 → 재검토 → 재확정 → 학생 최신값, 이전 확정 이력 보존', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-rubric-${tag}.pdf`
  const bytes = uniquePdf(tag)
  const doc = await registerAndAnalyze(request, 2026, fileName, bytes)

  // 1차: 과목 연결 → 수행평가 1의 채점기준을 직접 입력(분석 후보와 별개) → 확정
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await chooseSubject(page, 'review-subject-select-0', 'subj_02')
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').nth(1).click()
  await page.getByTestId('rubric-edit-open').click()
  const editor = page.getByTestId('rubric-editor')
  await editor.getByTestId('rubric-element-input').first().fill(`관리자 보완 요소 ${tag}`)
  await editor.getByTestId('rubric-level-desc').first().fill('근거를 들어 설명함')
  await editor.getByTestId('rubric-level-score').first().fill('12')
  await editor.getByTestId('rubric-page').fill('1')
  await editor.getByTestId('rubric-save').click()
  await expect(page.getByTestId('rubric-manual-table')).toContainText(`관리자 보완 요소 ${tag}`)
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  // 새로고침해도 서버 초안에 남아 있다
  await page.reload()
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').nth(1).click()
  await expect(page.getByTestId('rubric-manual-table')).toContainText(`관리자 보완 요소 ${tag}`)
  await confirmOnScreen(page, fileName, bytes)
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 15_000 })

  // 학생: 확정된 채점기준
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const plan = page.getByTestId('confirmed-plan').filter({ hasText: fileName })
  await expect(plan.getByTestId('confirmed-rubric')).toContainText(`관리자 보완 요소 ${tag}`)
  await expect(plan.getByTestId('confirmed-rubric')).toContainText('12점')

  // 재검토 시작 → 재검토 중에도 학생은 1차 값 → 채점기준 수정 → 재확정
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await page.getByTestId('review-step-confirm-tab').click()
  await expect(page.getByTestId('review-history-item')).toHaveCount(1)
  await page.getByTestId('review-rereview-start').click()
  await page.getByTestId('review-rereview-confirm').click()
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').nth(1).click()
  await page.getByTestId('rubric-edit-open').click()
  await page.getByTestId('rubric-editor').getByTestId('rubric-element-input').first().fill(`재확정 요소 ${tag}`)
  await page.getByTestId('rubric-editor').getByTestId('rubric-save').click()
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  const during = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}`, { headers: studentHeaders })).text()
  expect(during).toContain(`관리자 보완 요소 ${tag}`)
  expect(during).not.toContain(`재확정 요소 ${tag}`)
  await confirmOnScreen(page, fileName, bytes)
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await page.getByTestId('review-step-confirm-tab').click()
  await expect(page.getByTestId('review-history-item')).toHaveCount(2)
  await expect(page.getByTestId('review-history-item').first()).toContainText('학생 공개 중')
  await page.screenshot({ path: 'test-results/a12-rereview-history-1536.png', fullPage: true })

  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const latest = page.getByTestId('confirmed-plan').filter({ hasText: fileName }).getByTestId('confirmed-rubric')
  await expect(latest).toContainText(`재확정 요소 ${tag}`)
  await expect(latest).not.toContainText(`관리자 보완 요소 ${tag}`)
  // 이전 기록은 관리자 이력에 그대로
  const history = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/reviews`, { headers: admin })).json()
  expect(JSON.stringify(history.items[1])).toContain(`관리자 보완 요소 ${tag}`)
  await page.screenshot({ path: 'test-results/a12-student-rubric-1536.png', fullPage: true })
})

test('C: 학생이 학교 수행평가를 추가하고 상태를 바꾸면 새로고침 뒤에도 DB 값이 유지된다', async ({ page, request }) => {
  const title = `E2E 수행평가 ${runTag()}`
  await page.goto(`${STUDENT}/assessment`)
  await page.getByRole('button', { name: '수행평가 추가' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/수행평가 이름|제목/).fill(title)
  // A27-UX 학생: 과목은 검색형 Dropdown
  await pickStudentSubject(dialog, '통합과학2')
  await dialog.getByRole('button', { name: /^(추가|등록|저장)/ }).last().click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })
  await page.goto(`${STUDENT}/assessment/school-assessments`)
  const status = page.getByLabel(`${title} 진행 상태`)
  await expect(status).toBeVisible({ timeout: 15_000 })
  await status.selectOption('IN_PROGRESS')
  await page.reload()
  await expect(page.getByLabel(`${title} 진행 상태`)).toHaveValue('IN_PROGRESS', { timeout: 15_000 })
  const list = await (await request.get(`${API}/api/student/assessment/school-assessments`, { headers: studentHeaders, params: { academicYear: '2026', semester: '2', page: '0', size: '100' } })).json()
  const saved = list.items.find((item: { title: string }) => item.title === title)
  expect(saved.status).toBe('IN_PROGRESS')
  expect(saved.subjectId).toBe('subj_02')
})

test('D·E: 수행평가 노트 저장·수정 이력, 결과 파일 v1·v2 독립 버전, 피드백 요청 Snapshot → 관리자 답변 → 학생 확인', async ({ page, request }) => {
  const tag = runTag()
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, {
    headers: studentHeaders,
    data: { title: `E2E 노트 수행평가 ${tag}`, subjectId: 'subj_02', academicYear: 2026, semester: 2 },
  })
  expect(created.status()).toBe(201)
  const assessmentId = (await created.json()).assessmentId as string
  const note = await request.post(`${API}/api/student/assessment/notes`, {
    headers: studentHeaders,
    data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: `탐구 과정 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `요청 당시 본문 ${tag}` }] },
  })
  expect(note.status()).toBe(201)
  const { noteId, revisionId: r1 } = await note.json()
  const updated = await request.put(`${API}/api/student/assessment/notes/${noteId}`, {
    headers: studentHeaders,
    data: { expectedRevisionId: r1, title: `탐구 과정 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `고친 본문 ${tag}` }] },
  })
  expect(updated.status()).toBe(200)
  const revisions = await (await request.get(`${API}/api/student/assessment/notes/${noteId}/revisions`, { headers: studentHeaders })).json()
  expect(revisions.items.length).toBe(2)
  const first = await (await request.get(`${API}/api/student/assessment/notes/${noteId}/revisions/${r1}`, { headers: studentHeaders })).text()
  expect(first).toContain(`요청 당시 본문 ${tag}`)

  const artifact = await (await request.post(`${API}/api/student/assessment/artifacts`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: `발표 자료 ${tag}`, kind: null } })).json()
  const upload = async (name: string, body: Buffer) => {
    const response = await request.post(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions`, { headers: studentHeaders, multipart: { file: { name, mimeType: 'application/pdf', buffer: body } } })
    expect(response.status()).toBe(201)
    return (await response.json()).versionId as string
  }
  const v1Bytes = uniquePdf(`${tag}-v1`)
  const v1 = await upload('발표_v1.pdf', v1Bytes)
  const other = await (await request.post(`${API}/api/student/assessment/artifacts`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: `참고 표 ${tag}`, kind: null } })).json()
  const otherVersion = await request.post(`${API}/api/student/assessment/artifacts/${other.artifactId}/versions`, { headers: studentHeaders, multipart: { file: { name: '표.pdf', mimeType: 'application/pdf', buffer: uniquePdf(`${tag}-o`) } } })
  expect((await otherVersion.json()).versionNumber).toBe(1) // 다른 결과물은 자기 v1부터
  const feedback = await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, noteRevisionId: r1, artifactVersionIds: [v1] } })
  expect(feedback.status()).toBe(201)
  const requestId = (await feedback.json()).requestId as string
  const v2 = await upload('발표_v2.pdf', uniquePdf(`${tag}-v2`)) // 요청 뒤 새 버전 — Snapshot은 v1 그대로
  const versions = await (await request.get(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions`, { headers: studentHeaders })).json()
  expect(versions.items.map((item: { versionNumber: number }) => item.versionNumber).sort()).toEqual([1, 2])
  const v1File = await request.get(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions/${v1}/file`, { headers: studentHeaders })
  expect(Buffer.compare(Buffer.from(await v1File.body()), v1Bytes)).toBe(0)

  // 관리자: 요청 당시 Snapshot(노트 r1·파일 v1) — 학생이 이후 고친 내용·v2가 섞이지 않는다
  const detail = await (await request.get(`${API}/api/admin/assessment/feedback-requests/${requestId}`, { headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' } })).json()
  expect(JSON.stringify(detail.snapshotRevision)).toContain(`요청 당시 본문 ${tag}`)
  expect(detail.snapshotVersions.map((item: { versionId: string }) => item.versionId)).toEqual([v1])
  expect(v2).not.toBe(v1)
  const reply = { overallComment: `근거를 한 가지 더 연결해 보세요 ${tag}`, comments: [], recommendations: [] }
  const delivered = await request.post(`${API}/api/admin/assessment/feedback-requests/${requestId}/deliver`, { headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' }, data: reply })
  expect(delivered.status()).toBe(200)

  // 학생 화면: 답변 확인 (새로 읽음)
  await page.goto(`${STUDENT}/assessment/feedback`)
  await expect(page.getByLabel('피드백 요청 목록')).toContainText(`근거를 한 가지 더 연결해 보세요 ${tag}`, { timeout: 15_000 })
  // 학교 수행평가 상태는 피드백 전달로 바뀌지 않는다
  const assessment = await (await request.get(`${API}/api/student/assessment/school-assessments/${assessmentId}`, { headers: studentHeaders })).json()
  expect(assessment.status).toBe('BEFORE_START')
})

test('F: 자율 심화탐구는 준비된 콘텐츠 열람만 — 서버 호출·탐구 만들기 없음', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (req) => {
    if (/\/api\/student\/assessment\/(enrichment|my-mock-exam)/.test(req.url())) calls.push(req.url())
  })
  await page.goto(`${STUDENT}/assessment/enrichment`)
  const list = page.getByLabel('탐구 라이브러리 목록')
  await expect(list).toBeVisible({ timeout: 15_000 })
  const chips = page.getByRole('group', { name: '교과' }).getByRole('button')
  expect(await chips.count()).toBeGreaterThan(1)
  await chips.nth(1).click()
  await list.getByRole('button').first().click()
  await expect(page.locator('article[aria-label$="미리보기"]')).toBeVisible()
  await expect(page.getByLabel('탐구 방법 예시').or(page.getByLabel('탐구 목표')).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /탐구 만들기|새 탐구|탐구 시작|심화 탐구로 시작/ })).toHaveCount(0)
  await page.goto(`${STUDENT}/assessment/enrichment/tasks/anything`)
  await expect(page).toHaveURL(/\/assessment\/enrichment$/)
  expect(calls).toEqual([])
  await page.screenshot({ path: 'test-results/a12-enrichment-library-1536.png', fullPage: true })
})

test('G: 관리자 현황 수치는 실제 DB 집계와 같다', async ({ page, request }) => {
  const overview = await (await request.get(`${API}/api/admin/assessment/overview`, { headers: admin, params: { academicYear: '2026', semester: '2' } })).json()
  const plans = await (await request.get(`${PLANS}`, { headers: admin, params: { schoolId: 'school_001', academicYear: '2026' } })).json()
  expect(overview.evaluationPlans.documents).toBeGreaterThanOrEqual(plans.items.length)
  const confirmed = plans.items.filter((item: { reviewStatus: string }) => item.reviewStatus === 'CONFIRMED').length
  expect(overview.evaluationPlans.evaluationConfirmed).toBeGreaterThanOrEqual(confirmed)
  expect(overview.kpi.enrichmentTasks).toBe(0)
  // A27 전체 현황 Dashboard는 학교·학년 Filter(기본 = 첫 학교 · 고1)로 같은 API를 부른다. 같은 조건의 API 값과 화면 수치를 맞춘다
  const screenOverview = await (await request.get(`${API}/api/admin/assessment/overview`, { headers: admin, params: { schoolId: 'school_001', grade: '1', academicYear: '2026', semester: '2' } })).json()
  await page.goto(`${ADMIN}/assessment?school=school_001&year=2026&grade=1&semester=2`)
  const kpis = page.getByTestId('overview-kpis')
  await expect(kpis).toContainText(`${screenOverview.evaluationPlans.documents}개 문서`, { timeout: 30_000 })
  await expect(kpis).toContainText(`${screenOverview.kpi.feedbackPending}건 답변 대기`)
  await expect(page.getByTestId('overview-recent')).toBeVisible()
  await page.screenshot({ path: 'test-results/a12-admin-overview-1536.png', fullPage: true })
})
