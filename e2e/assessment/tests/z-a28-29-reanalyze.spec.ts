import { expect, test } from '@playwright/test'
import { ADMIN, API, PLANS, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A28-29: 평가 정보만 확정된 문서도 관리자 분석 목록·결과 화면에서 '다시 분석'(확인 창) → 운영계획 후보 수 확인 →
// 승인 전 학생 미공개 → '월별 운영계획 승인' 진입 → '월별 운영계획 최종 승인' → 관리자·학생 반영. 평가 정보 확정값은 그대로.
// 일회용 DB · 가상 학교알리미 Stub(18769, 보라고처럼 학교알리미 공식 원본 — 최종 승인 1회는 서버 원본 검증 문서만) ·
// Stub 분석기(*contract03* = 합성 0.3, 운영계획 후보 포함) · 합성 문서만. z-a27-autosync 뒤에 돈다(같은 가상 학교 매핑).
const STUB = 'http://127.0.0.1:18769'
const H = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const student = { 'X-Assessment-Student-Id': 'stu_001' }

test('[A28-29] 확정 문서 다시 분석: 확인 창 → 후보 수 → 학생 미공개 → 월별 운영계획 최종 승인 → 반영, 평가 확정값 불변', async ({ page, request }) => {
  test.setTimeout(240_000)
  const tag = runTag()
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
  const fileName = `${y}학년도 1학년 2학기 contract03 교수학습 평가계획 a2829 ${tag}.pdf`
  const fixture = {
    schoolName: '예시고등학교',
    years: { [y]: { echo: y, files: [{ name: fileName, base64: uniquePdf(`${tag}-a2829`).toString('base64') }] }, [y - 1]: { echo: y - 1, files: [] }, [y - 2]: { echo: y - 2, files: [] } },
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  const started = await (await request.post(`${PLANS}/schoolinfo-sync`, { headers: H, data: { schoolId: 'school_001', requestedAcademicYears: [y, y - 1, y - 2], grades: [1, 2, 3], semesters: [1, 2], force: true } })).json()
  await expect.poll(async () => (await (await request.get(`${PLANS}/schoolinfo-sync/${started.jobId}`, { headers: H })).json()).state, { timeout: 90_000 }).not.toMatch(/RUNNING|PENDING|QUEUED/)
  const findDoc = async () => {
    const items = (await (await request.get(PLANS, { headers: H, params: { schoolId: 'school_001', academicYear: String(y) } })).json()).items as { planId: string; revisions: { documentRevisionId: string; fileName: string; analysisStatus?: string }[] }[]
    for (const plan of items) for (const rev of plan.revisions) if (rev.fileName === fileName) return { planId: plan.planId, revisionId: rev.documentRevisionId, analysisStatus: rev.analysisStatus }
    return null
  }
  await expect.poll(async () => Boolean(await findDoc()), { timeout: 30_000 }).toBe(true)
  let found = (await findDoc())!
  if (!found.analysisStatus || found.analysisStatus === 'NOT_REQUESTED') {
    expect((await request.post(`${PLANS}/${found.planId}/revisions/${found.revisionId}/analysis`, { headers: H })).status()).toBe(201)
  }
  await expect.poll(async () => (await findDoc())?.analysisStatus, { timeout: 60_000 }).toMatch(/REVIEW_REQUIRED|PARTIAL/)
  found = (await findDoc())!
  const revisionPath = `${PLANS}/${found.planId}/revisions/${found.revisionId}`
  const analysisId = (await (await request.get(`${revisionPath}/analysis`, { headers: H })).json()).analysisId
  const doc = { planId: found.planId, revisionId: found.revisionId }
  // 평가 정보만 확정(운영계획 미확정) — 보라고 문서와 같은 상태
  const confirmed = await request.put(`${revisionPath}/review`, {
    headers: H,
    data: { analysisId, decision: 'CONFIRM', sourceCheck: { method: 'SERVER_STORED_ORIGINAL' }, reviewedSubjects: [{ subjectId: 'subj_02', analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }] }] },
  })
  expect(confirmed.status(), await confirmed.text()).toBe(200)
  const confirmedFields = async () => {
    const plan = await (await request.get(`${PLANS}/${doc.planId}`, { headers: H })).json()
    return JSON.stringify(plan.revisions.find((r: { documentRevisionId: string }) => r.documentRevisionId === doc.revisionId).confirmedFields)
  }
  const fieldsBefore = await confirmedFields()
  const teachingBefore = await (await request.get(`${revisionPath}/teaching-plan-review`, { headers: H })).json()
  expect(teachingBefore.review).toBeNull()

  // 1) 분석 목록(A28-30·A28-40): 확정 문서 행의 주 CTA는 '확정 결과' 하나 — 행별 '다시 분석'·'분석' 열 없음
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/analysis?school=school_001&year=${y}&grade=1&semester=2`)
  const row = page.getByTestId('plan-row').filter({ hasText: fileName })
  await expect(row).toBeVisible({ timeout: 30_000 })
  await expect(row.getByTestId('plan-primary-action')).toHaveText('확정 결과')
  await expect(page.getByTestId('plan-reanalyze-button')).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: '분석', exact: true })).toHaveCount(0)
  await expect(row.getByTestId('plan-row-stage')).toContainText('확정')
  await page.screenshot({ path: 'test-results/a28-29-analysis-row.png' })

  // 2) 결과 화면 머리 '다시 분석' → 확인 창 → 실행 → 결과(후보 수)
  await row.getByTestId('plan-primary-action').click()
  await page.getByTestId('plan-result-reanalyze').click()
  const dialog = page.getByTestId('reanalyze-dialog')
  await expect(dialog).toContainText('새 분석 결과를 생성합니다. 기존 확정 내용은 변경되지 않습니다.')
  await page.getByTestId('reanalyze-confirm').click()
  await expect(dialog).toHaveAttribute('data-phase', 'done', { timeout: 120_000 })
  const candidatesText = await page.getByTestId('reanalyze-candidates').innerText()
  const candidates = Number(candidatesText.match(/(\d+)행/)?.[1] ?? 0)
  expect(candidates, candidatesText).toBeGreaterThan(0)
  expect(await confirmedFields(), '평가 정보 확정값 그대로').toBe(fieldsBefore)
  // 승인 전: 학생에게 운영계획 없음
  const studentBefore = await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: student })
  expect(JSON.stringify(await studentBefore.json().catch(() => ({})))).not.toContain('"rowKey"')
  await page.screenshot({ path: 'test-results/a28-29-reanalyze-done.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  // 3) 결과 화면 머리: '월별 운영계획 승인 · 후보 N행'과 '다시 분석'이 같은 보조 버튼 스타일(A28-36 [05])
  await page.goto(`${ADMIN}/assessment/analysis/${doc.planId}/revisions/${doc.revisionId}/result`)
  const approve = page.getByTestId('plan-result-teaching-approve')
  await expect(approve).toContainText(`후보 ${candidates}행`, { timeout: 30_000 })
  const reanalyze = page.getByTestId('plan-result-reanalyze')
  const style = (l: typeof approve) => l.evaluate((el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.borderTopWidth, c.borderTopColor, c.height, c.fontSize].join('|') })
  expect(await style(approve)).toBe(await style(reanalyze))
  // A28-36 [06~08]: '다시 분석' → 같은 결과 · 후보 N행 → '검토하기' 하나로 최종 확정 단계에 바로(단계 탭을 거치지 않음)
  await reanalyze.click()
  await page.getByTestId('reanalyze-confirm').click()
  await expect(page.getByTestId('reanalyze-dialog')).toHaveAttribute('data-phase', 'done', { timeout: 120_000 })
  await expect(page.getByTestId('reanalyze-result')).toContainText('이전 분석과 같은 결과')
  await expect(page.getByTestId('reanalyze-open-review')).toHaveText('검토하기')
  await page.getByTestId('reanalyze-open-review').click()
  await expect(page).toHaveURL(/step=confirm/)
  await expect(page.getByTestId('final-approval-teaching-only')).toBeVisible({ timeout: 30_000 })
  expect(await confirmedFields(), '재분석·검토 진입만으로는 확정값 그대로').toBe(fieldsBefore)
  await page.getByTestId('final-approval-open').click()
  const put = page.waitForResponse((r) => r.url().endsWith(`/revisions/${doc.revisionId}/teaching-plan-review`) && r.request().method() === 'PUT')
  await page.getByTestId('final-approval-submit').click()
  expect((await put).status()).toBe(200)

  // 4) 반영: 관리자 확정 행 · 학생 운영계획 · 평가 확정값 그대로 · 결과 화면 승인 버튼 사라짐
  const after = await (await request.get(`${revisionPath}/teaching-plan-review`, { headers: H })).json()
  const published = after.review.rows.filter((r: { decision: string }) => r.decision !== 'EXCLUDED')
  expect(published.length).toBeGreaterThan(0)
  const studentAfter = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: student })).json()
  expect(JSON.stringify(studentAfter)).toContain(published[0].rowKey)
  expect(await confirmedFields()).toBe(fieldsBefore)
  await page.goto(`${ADMIN}/assessment/analysis/${doc.planId}/revisions/${doc.revisionId}/result`)
  await expect(page.getByTestId('plan-result-head')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('plan-result-teaching-approve')).toHaveCount(0)
  // 승인할 것이 없으면 다시 분석 뒤 '검토하기' 없이 닫기만(같은 결과 재승인 경로 없음)
  await page.getByTestId('plan-result-reanalyze').click()
  await page.getByTestId('reanalyze-confirm').click()
  await expect(page.getByTestId('reanalyze-dialog')).toHaveAttribute('data-phase', 'done', { timeout: 120_000 })
  await expect(page.getByTestId('reanalyze-result')).toContainText('승인할 변경 없음')
  await expect(page.getByTestId('reanalyze-open-review')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await request.delete(`${STUB}/__fixture`)
})

test('[A28-29] 다시 분석: 같은 결과 재요청은 새 Run 없이 200 · 없는 문서 404 · 인증 없으면 401 (동시 실행 409 는 IT PlanServerAnalysisApiTest)', async ({ request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a2829-dup-${tag}.pdf`, uniquePdf(`${tag}-dup`))
  const url = `${PLANS}/${doc.planId}/revisions/${doc.revisionId}/analysis`
  // 같은 결과 재요청은 새 Run 없이 200
  expect((await request.post(url, { headers: H })).status()).toBe(200)
  expect((await request.post(`${PLANS}/plan_missing/revisions/rev_missing/analysis`, { headers: H })).status()).toBe(404)
  expect((await request.post(url)).status()).toBe(401)
})
