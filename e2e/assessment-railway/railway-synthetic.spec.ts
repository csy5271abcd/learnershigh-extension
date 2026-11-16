import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'

// A19: 원격(Railway HTTPS) 분석기 → 로컬 Backend(일회용 DB, 시연 명단 ON) → 관리자·학생 React 실제 화면.
// 합성 문서(manifest synthetic=true, SHA-256 일치)만 올린다 — 실제 학교 문서·코퍼스는 이 시험에 없다.
// 학생 Vite는 1학기 문맥(VITE_ASSESSMENT_DEV_CURRENT_TERM=2026-1), 학생은 `?devStudent=`로 고르는 합성 시연 명단 학생이다.
const API = process.env.ASSESSMENT_RAILWAY_API!
const ADMIN = process.env.ASSESSMENT_RAILWAY_ADMIN!
const STUDENT = process.env.ASSESSMENT_RAILWAY_STUDENT!
const PROFILE = process.env.ASSESSMENT_RAILWAY_EXPECT_PROFILE!
const manifest: { synthetic: boolean; dir: string; items: { id: string; file: string; sha256: string; grade: number }[] } = JSON.parse(readFileSync(process.env.ASSESSMENT_RAILWAY_FIXTURES!, 'utf8'))
const PLANS = `${API}/api/admin/assessment/evaluation-plans`
const operator = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

type Roster = { students: { studentId: string; grade: number; school: { schoolId: string } }[] }
const roster: Roster = JSON.parse(readFileSync(new URL('../../backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json', import.meta.url), 'utf8'))
const SCHOOL = roster.students.find((s) => s.studentId === 'stu_demo_001')!.school.schoolId
const studentOf = (grade: number, sameSchool = true) => roster.students.find((s) => (sameSchool ? s.school.schoolId === SCHOOL : s.school.schoolId !== SCHOOL) && s.grade === grade)!.studentId

/** 원격 전송 전 보호: manifest 항목·이름 규칙·SHA-256이 맞는 합성 문서만 */
function synthetic(id: string) {
  expect(manifest.synthetic).toBe(true)
  const item = manifest.items.find((i) => i.id === id)!
  expect(item.file).toMatch(/^synthetic-a19-g[123]\.(pdf|hwp|hwpx)$/)
  const bytes = readFileSync(join(manifest.dir, item.file))
  expect(createHash('sha256').update(bytes).digest('hex'), `${id} SHA-256`).toBe(item.sha256)
  const ext = item.file.slice(item.file.lastIndexOf('.'))
  return { item, bytes, ext, mimeType: ext === '.pdf' ? 'application/pdf' : 'application/hwp+zip' }
}

const uniqueName = (id: string, tag: string) => `${synthetic(id).item.file.replace(/\.[^.]+$/, '')}-${tag}-${Date.now().toString(36)}${synthetic(id).ext}`

async function registerAndAnalyze(request: APIRequestContext, id: string, grade: number, tag: string) {
  const { bytes, mimeType } = synthetic(id)
  const fileName = uniqueName(id, tag)
  const created = await request.post(PLANS, { headers: operator, multipart: { file: { name: fileName, mimeType, buffer: bytes }, schoolId: SCHOOL, academicYear: '2026', grade: String(grade), semester: '1' } })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const run = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: operator, timeout: 200_000 })
  expect(run.status(), '원격 분석 → Backend 저장').toBe(201)
  const analysis = await run.json()
  expect(analysis.analyzer.profile).toBe(PROFILE)
  return { planId: plan.planId as string, revisionId: plan.documentRevisionId as string, analysisId: analysis.analysisId as string, subjects: analysis.subjects, fileName, bytes }
}

async function slotSubject(request: APIRequestContext, planId: string) {
  const slot = await (await request.get(`${PLANS}/${planId}/subjects`, { headers: operator })).json()
  expect(slot.available).toBe(true)
  expect(slot.source).toBe('DEV_DEMO_CATALOG')
  return slot.items[0].subjectId as string
}

async function asStudent(browser: Browser, studentId: string, path: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
  const page = await context.newPage()
  await page.goto(`${STUDENT}${path}${path.includes('?') ? '&' : '?'}devStudent=${studentId}`)
  return page
}

/** 학생 평가 정보 화면이 다 읽힌 뒤(빈 상태 포함) 그 문서가 없는지 — 로딩 중 '없음'으로 통과하지 않게 */
async function expectPlanHidden(browser: Browser, studentId: string, fileName: string) {
  const page = await asStudent(browser, studentId, '/assessment/evaluation-plans')
  await expect(page.getByTestId('confirmed-evaluation-info')).toBeVisible({ timeout: 30_000 })
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('confirmed-plan').filter({ hasText: fileName })).toHaveCount(0)
  await page.context().close()
}

/** PDF 화면 확정: 과목 선택 → 실제로 추출된 '평가 비율' 값 확인 → 원본 대조 → 확정 */
async function confirmPdfInWizard(page: Page, fileName: string, bytes: Buffer, subjectId: string) {
  await page.getByTestId('review-step-subjects-tab').click()
  await page.getByTestId('review-subject-select-0').selectOption(subjectId)
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').filter({ hasText: '평가 비율' }).first().click()
  // 원격 분석이 실제로 값을 준 항목(수행평가 반영비율)만 확인할 수 있다 — 값 없는 항목(지필평가 반영비율 등)의 확인 버튼은 비활성
  await page.locator('[data-testid="review-field-confirm"]:not([disabled])').first().click()
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })
  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('review-attest').check()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm').click()
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 30_000 })
}

test('1학년 합성 PDF: 관리자 화면 업로드 → 분석 진행 표시 → 원격 결과 → 원문 1학년 → 확정 → 새로고침 유지 → 1학년 학생만', async ({ page, request, browser }) => {
  const { bytes } = synthetic('SYN-G1-PDF')
  const fileName = uniqueName('SYN-G1-PDF', 'ui')
  // 진행 표시를 확실히 보려고 브라우저→Backend 분석 요청만 1.5초 늦춘다(원격 분석기·Backend 설정은 그대로)
  let delayed = 0
  await page.route((url) => url.pathname.endsWith('/analysis'), async (route) => {
    if (route.request().method() === 'POST') {
      delayed++
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    await route.continue()
  })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=${SCHOOL}&year=2026&grade=1&semester=1`)
  await page.getByTestId('plan-upload-open').click()
  await page.getByTestId('plan-upload-dialog').locator('input[type="file"]').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('plan-upload-submit').click()
  // 진행 표시: 서버 분석(원격) 동안 진행 막대 + 제출 버튼 aria-busy. (A19 관찰: 서버 분석 경로는 문구가 '올리는 중…'으로 남는다 — 보고서 참고)
  await expect(page.getByTestId('plan-upload-dialog').getByRole('progressbar')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('plan-upload-submit')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 200_000 })
  expect(delayed, '브라우저가 등록 뒤 분석을 요청했다').toBe(1)
  await page.unrouteAll()
  const [, planId, revisionId] = new URL(page.url()).pathname.match(/evaluation-plans\/([^/]+)\/revisions\/([^/?]+)/) ?? []
  const analysis = await (await request.get(`${PLANS}/${planId}/revisions/${revisionId}/analysis`, { headers: operator })).json()
  expect(analysis.analyzer.profile).toBe(PROFILE)
  const detail = await (await request.get(`${PLANS}/${planId}`, { headers: operator })).json()
  expect(detail.grade).toBe(1)
  expect(detail.semester).toBe(1)

  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-card')).toHaveCount(1)
  await expect(page.getByTestId('review-subject-grades')).toHaveText('원문 1학년')
  await expect(page.getByTestId('review-subject-grade-conflict')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a19-railway-wizard-g1-subjects.png', fullPage: true })

  await confirmPdfInWizard(page, fileName, bytes, await slotSubject(request, planId))
  await page.reload()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-confirm-tab').click()
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 30_000 })

  const g1 = await asStudent(browser, studentOf(1), '/assessment/evaluation-plans')
  const mine = g1.getByTestId('confirmed-plan').filter({ hasText: fileName })
  await expect(mine).toBeVisible({ timeout: 30_000 })
  await expect(mine.locator('[data-state="value"]').first()).toBeVisible()
  await g1.reload()
  await expect(g1.getByTestId('confirmed-plan').filter({ hasText: fileName })).toBeVisible({ timeout: 30_000 })
  await g1.screenshot({ path: 'test-results/a19-railway-student-g1-plan.png', fullPage: true })
  for (const sid of [studentOf(2), studentOf(3), studentOf(1, false)]) await expectPlanHidden(browser, sid, fileName)
})

test('2학년 합성 PDF: 2학년 슬롯 화면 확정 → 2학년 학생만 / 1학년 PDF를 2학년 슬롯에 두면 학년 충돌 안내', async ({ page, request, browser }) => {
  const own = await registerAndAnalyze(request, 'SYN-G2-PDF', 2, 'ui')
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${own.planId}/revisions/${own.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-grades')).toHaveText('원문 2학년')
  await expect(page.getByTestId('review-subject-grade-conflict')).toHaveCount(0)
  await confirmPdfInWizard(page, own.fileName, own.bytes, await slotSubject(request, own.planId))
  const g2 = await asStudent(browser, studentOf(2), '/assessment/evaluation-plans')
  await expect(g2.getByTestId('confirmed-plan').filter({ hasText: own.fileName })).toBeVisible({ timeout: 30_000 })
  await g2.screenshot({ path: 'test-results/a19-railway-student-g2-plan.png', fullPage: true })
  for (const sid of [studentOf(1), studentOf(3)]) await expectPlanHidden(browser, sid, own.fileName)

  const wrong = await registerAndAnalyze(request, 'SYN-G1-PDF', 2, 'conflict-ui')
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${wrong.planId}/revisions/${wrong.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-grades')).toHaveText('원문 1학년')
  await expect(page.getByTestId('review-subject-grade-conflict')).toContainText('확정할 수 없어요')
  await page.screenshot({ path: 'test-results/a19-railway-wizard-g2-grade-conflict.png', fullPage: true })
  const blocked = await request.put(`${PLANS}/${wrong.planId}/revisions/${wrong.revisionId}/review`, {
    headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' },
    data: { analysisId: wrong.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: await slotSubject(request, wrong.planId), analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }] }] },
  })
  expect(blocked.status()).toBe(400)
  expect(await blocked.text()).toContain('grade_conflict')
  await expectPlanHidden(browser, studentOf(2), wrong.fileName)
})

test('3학년 합성 HWPX: 채점기준·구조 위치 표시 → 운영계획 확정 → 새로고침 유지 → 3학년 학생 Monthly Planner만', async ({ page, request, browser }) => {
  const doc = await registerAndAnalyze(request, 'SYN-G3-HWPX', 3, 'ui')
  const rowsCount = (doc.subjects[0].teachingPlan ?? []).length
  expect(rowsCount).toBeGreaterThan(0)
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-grades')).toHaveText('원문 3학년')
  // 수행평가: 원격 분석 채점기준 후보 표(HWPX는 읽기 전용 — 공식 평가정보 확정은 실제 인증 전까지 보호)
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').filter({ hasNotText: '평가 비율' }).first().click()
  await expect(page.getByTestId('review-rubric')).toBeVisible()
  await page.screenshot({ path: 'test-results/a19-railway-wizard-g3-hwpx-rubric.png', fullPage: true })

  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByRole('region', { name: `${doc.subjects[0].subjectName} 운영계획` })).toContainText('원문 3학년')
  await page.getByTestId('teaching-plan-subject-0').selectOption(await slotSubject(request, doc.planId))
  const rows = page.getByTestId('teaching-plan-row')
  await expect(rows).toHaveCount(rowsCount)
  for (let i = 0; i < rowsCount; i++) await rows.nth(i).getByRole('button', { name: '확인' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 20_000 })
  await page.reload()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 20_000 })
  await page.screenshot({ path: 'test-results/a19-railway-wizard-g3-teaching-confirmed.png', fullPage: true })

  const g3 = await asStudent(browser, studentOf(3), '/assessment/monthly-plan')
  await expect(g3.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
  await expect(g3.getByRole('region', { name: `${doc.fileName} 운영계획` })).toBeVisible({ timeout: 30_000 })
  await g3.reload()
  await expect(g3.getByRole('region', { name: `${doc.fileName} 운영계획` })).toBeVisible({ timeout: 30_000 })
  await g3.screenshot({ path: 'test-results/a19-railway-student-g3-planner.png', fullPage: true })
  for (const sid of [studentOf(1), studentOf(2), studentOf(3, false)]) {
    const other = await asStudent(browser, sid, '/assessment/monthly-plan')
    await expect(other.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
    await other.waitForLoadState('networkidle')
    await expect(other.getByRole('region', { name: `${doc.fileName} 운영계획` })).toHaveCount(0)
    await other.context().close()
  }
})

test('3학년 합성 HWPX를 1학년 슬롯에 두면 운영계획 확정이 학년 충돌로 막히고 / 2학년 합성 HWP 평가정보 공식 확정은 인증 보호', async ({ page, request, browser }) => {
  const doc = await registerAndAnalyze(request, 'SYN-G3-HWPX', 1, 'conflict-ui')
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  await page.getByTestId('teaching-plan-subject-0').selectOption(await slotSubject(request, doc.planId))
  await page.getByTestId('teaching-plan-row').nth(0).getByRole('button', { name: '확인' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByText('원문상 이 문서 학년이 아닌 과목의 행이 있어요')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('teaching-plan-status')).not.toContainText('확정됨')
  const g1 = await asStudent(browser, studentOf(1), '/assessment/monthly-plan')
  await expect(g1.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
  await g1.waitForLoadState('networkidle')
  await expect(g1.getByRole('region', { name: `${doc.fileName} 운영계획` })).toHaveCount(0)

  const hwp = await registerAndAnalyze(request, 'SYN-G2-HWP', 2, 'ui')
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${hwp.planId}/revisions/${hwp.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-grades')).toHaveText('원문 2학년')
  const blocked = await request.put(`${PLANS}/${hwp.planId}/revisions/${hwp.revisionId}/review`, {
    headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' },
    data: { analysisId: hwp.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: await slotSubject(request, hwp.planId), analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null }] }] },
  })
  expect(blocked.status()).toBe(400)
  expect(await blocked.text()).toContain('verified_auth_required')
  await expectPlanHidden(browser, studentOf(2), hwp.fileName)
})
