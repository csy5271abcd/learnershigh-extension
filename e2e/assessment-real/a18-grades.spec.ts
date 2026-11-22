import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { chooseSubject, confirmThroughSteps, linkSubjectThenTeaching } from '../assessment/reviewUi.ts'

// A18: 실제 분석기(v21.10-b16-dev) 응답으로 1·2·3학년 개발용 시연 슬롯(api-contract §38-4)의 관리자 확정·학생 화면을 확인한다.
// Backend는 시연 명단 ON(ASSESSMENT_DEMO_ROSTER_ENABLED=true), 학생 Vite는 1학기 문맥(VITE_ASSESSMENT_DEV_CURRENT_TERM=2026-1)으로 실행해야 한다.
// 학생은 합성 시연 명단 학생이다(`?devStudent=`로 고름). 원문 글자는 단언 외에는 출력하지 않는다.
const API = process.env.ASSESSMENT_REAL_API!
const ADMIN = process.env.ASSESSMENT_REAL_ADMIN!
const STUDENT = process.env.ASSESSMENT_REAL_STUDENT!
const PROFILE = process.env.ASSESSMENT_REAL_EXPECT_PROFILE!
const DOCS: Record<string, string> = JSON.parse(readFileSync(process.env.ASSESSMENT_REAL_DOCS!, 'utf8'))
const PLANS = `${API}/api/admin/assessment/evaluation-plans`
const operator = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

type Roster = { students: { studentId: string; grade: number; school: { schoolId: string } }[] }
const roster: Roster = JSON.parse(readFileSync(new URL('../../backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json', import.meta.url), 'utf8'))
const SCHOOL = roster.students.find((s) => s.studentId === 'stu_demo_001')!.school.schoolId
const studentOf = (grade: number) => roster.students.find((s) => s.school.schoolId === SCHOOL && s.grade === grade)!.studentId

type Subject = { subjectName: string; grades?: number[]; performanceEvaluation?: { items?: { label: string; sources?: unknown[] }[] }; teachingPlan?: unknown[] }

async function registerAndAnalyze(request: APIRequestContext, id: string, grade: number) {
  const path = DOCS[id]
  const ext = path.slice(path.lastIndexOf('.'))
  const fileName = `real-a18-${id}-g${grade}-${Date.now().toString(36)}${ext}`
  const created = await request.post(PLANS, {
    headers: operator,
    multipart: { file: { name: fileName, mimeType: ext === '.pdf' ? 'application/pdf' : 'application/hwp+zip', buffer: readFileSync(path) },
      schoolId: SCHOOL, academicYear: '2026', grade: String(grade), semester: '1' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const run = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: operator, timeout: 300_000 })
  expect(run.status()).toBe(201)
  const analysis = await run.json()
  expect(analysis.analyzer.profile).toBe(PROFILE)
  const slot = await (await request.get(`${PLANS}/${plan.planId}/subjects`, { headers: operator })).json()
  expect(slot.available, `${SCHOOL} ${grade}학년 1학기 시연 슬롯`).toBe(true)
  expect(slot.source).toBe('DEV_DEMO_CATALOG')
  return { planId: plan.planId as string, revisionId: plan.documentRevisionId as string, subjects: analysis.subjects as Subject[], slotSubject: slot.items[0].subjectId as string, fileName, bytes: readFileSync(path) }
}

async function asStudent(browser: Browser, studentId: string, path: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
  const page = await context.newPage()
  await page.goto(`${STUDENT}${path}${path.includes('?') ? '&' : '?'}devStudent=${studentId}`)
  return page
}

async function openWizard(page: Page, doc: { planId: string; revisionId: string }) {
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
}

test('F02099 HWPX(원문 3학년): 3학년 슬롯에서 운영계획 24행 확정 → 3학년 학생 Planner에만 보인다', async ({ page, request, browser }) => {
  const doc = await registerAndAnalyze(request, 'F02099', 3)
  expect(doc.subjects[0].grades).toEqual([3])
  const rowsCount = (doc.subjects[0].teachingPlan ?? []).length
  expect(rowsCount).toBe(24)

  await openWizard(page, doc)
  await page.getByTestId('review-step-teaching-tab').click()
  const section = page.getByRole('region', { name: `${doc.subjects[0].subjectName} 운영계획` })
  await expect(section).toContainText('원문 3학년')
  await linkSubjectThenTeaching(page, 0, doc.slotSubject) // A27-UX [02]: 과목 연결은 2단계에서
  const rows = page.getByTestId('teaching-plan-row')
  await expect(rows).toHaveCount(rowsCount)
  for (let i = 0; i < rowsCount; i++) await rows.nth(i).getByRole('button', { name: '확인' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 20_000 })
  await page.screenshot({ path: 'test-results/a18-real-hwpx-grade3-teaching-confirmed.png', fullPage: true })

  const g3 = await asStudent(browser, studentOf(3), '/assessment/monthly-plan')
  await expect(g3.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
  await expect(g3.getByRole('region', { name: `${doc.fileName} 운영계획` })).toBeVisible({ timeout: 30_000 })
  await g3.screenshot({ path: 'test-results/a18-real-student-grade3-planner.png', fullPage: true })
  for (const grade of [1, 2]) {
    const other = await asStudent(browser, studentOf(grade), '/assessment/monthly-plan')
    await expect(other.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
    await other.waitForLoadState('networkidle')
    await expect(other.getByRole('region', { name: `${doc.fileName} 운영계획` })).toHaveCount(0)
  }
})

test('F02099 HWPX(원문 3학년): 1학년 슬롯에서는 운영계획 확정이 학년 충돌로 막히고 학생에게 보이지 않는다', async ({ page, request, browser }) => {
  const doc = await registerAndAnalyze(request, 'F02099', 1)
  await openWizard(page, doc)
  await page.getByTestId('review-step-teaching-tab').click()
  await linkSubjectThenTeaching(page, 0, doc.slotSubject) // A27-UX [02]: 과목 연결은 2단계에서
  await page.getByTestId('teaching-plan-row').nth(0).getByRole('button', { name: '확인' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByText('원문상 이 문서 학년이 아닌 과목의 행이 있어요')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('teaching-plan-status')).not.toContainText('확정됨')
  const g1 = await asStudent(browser, studentOf(1), '/assessment/monthly-plan')
  await expect(g1.getByTestId('student-monthly-plan')).toBeVisible({ timeout: 30_000 })
  await g1.waitForLoadState('networkidle')
  await expect(g1.getByRole('region', { name: `${doc.fileName} 운영계획` })).toHaveCount(0)
})

test('F01664(1·2·3학년 혼합): 2학년 슬롯 Wizard는 다른 학년 과목에 확정 불가 안내, 2학년 과목을 화면에서 확정 → 2학년 학생에게만', async ({ page, request, browser }) => {
  const doc = await registerAndAnalyze(request, 'F01664', 2)
  expect(doc.subjects).toHaveLength(40)
  const others = doc.subjects.filter((s) => Array.isArray(s.grades) && !s.grades.includes(2)).length
  const target = doc.subjects.findIndex((s) => s.grades?.includes(2) && (s.performanceEvaluation?.items ?? []).some((i) => i.label && (i.sources ?? []).length))
  expect(target).toBeGreaterThanOrEqual(0)

  await openWizard(page, doc)
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-card')).toHaveCount(40)
  await expect(page.getByTestId('review-subject-grade-conflict')).toHaveCount(others)
  await expect(page.getByTestId('review-subject-card').nth(target).getByTestId('review-subject-grade-conflict')).toHaveCount(0)
  await expect(page.getByTestId('review-subject-card').nth(target).getByTestId('review-subject-grades')).toHaveText('원문 2학년')
  await chooseSubject(page, `review-subject-select-${target}`, doc.slotSubject)
  await page.screenshot({ path: 'test-results/a18-real-wizard-grade2-subjects.png', fullPage: true })

  // 수행평가 검토: 그 2학년 과목의 첫 수행평가에서 한 값을 확인
  await page.getByTestId('review-step-performance-tab').click()
  const group = page.locator('nav[aria-label="수행평가 목록"] > div').filter({ hasText: `${doc.subjects[target].subjectName} · 원문 2학년` })
  await group.getByTestId('performance-nav-item').filter({ hasNotText: '평가 비율' }).first().click()
  await page.getByTestId('review-field').getByRole('button', { name: '확인' }).first().click()
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })

  await page.getByTestId('review-step-confirm-tab').click()
  await confirmThroughSteps(page, { name: doc.fileName, mimeType: 'application/pdf', buffer: doc.bytes })
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 30_000 })

  const g2 = await asStudent(browser, studentOf(2), '/assessment/evaluation-plans')
  await expect(g2.getByTestId('confirmed-plan').filter({ hasText: doc.fileName })).toBeVisible({ timeout: 30_000 })
  await g2.screenshot({ path: 'test-results/a18-real-student-grade2-plan.png', fullPage: true })
  for (const grade of [1, 3]) {
    const other = await asStudent(browser, studentOf(grade), '/assessment/evaluation-plans')
    // 그 학년 학생도 자기 학년 확정 문서(다른 검증에서 확정)는 보이는 상태에서 비교한다 — 로딩 전 '없음'으로 통과하지 않게
    await other.waitForLoadState('networkidle')
    await expect(other.getByTestId('confirmed-plan').first()).toBeVisible({ timeout: 30_000 })
    await expect(other.getByTestId('confirmed-plan').filter({ hasText: doc.fileName })).toHaveCount(0)
  }
})
