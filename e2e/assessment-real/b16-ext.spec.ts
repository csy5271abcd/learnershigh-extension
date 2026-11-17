import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// A17: 실제 분석기(B16 v21.10-b16-dev) 응답으로 관리자 Wizard·채점기준 수정·확정·학생 화면을 확인한다.
// 합성 Fixture가 아니다. 원문 글자는 단언 메시지·화면 캡처 외에는 출력하지 않는다(값 비교만).
const API = process.env.ASSESSMENT_REAL_API!
const ADMIN = process.env.ASSESSMENT_REAL_ADMIN!
const STUDENT = process.env.ASSESSMENT_REAL_STUDENT!
const PROFILE = process.env.ASSESSMENT_REAL_EXPECT_PROFILE!
const DOCS: Record<string, string> = JSON.parse(readFileSync(process.env.ASSESSMENT_REAL_DOCS!, 'utf8'))
const PLANS = `${API}/api/admin/assessment/evaluation-plans`
const operator = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const reviewer = { 'X-Assessment-Admin-Id': 'adm_gangnam' }
const studentHeaders = { 'X-Assessment-Student-Id': 'stu_001' }

type Criterion = { element: string; maxScore?: number; linkReview?: string; levels?: { score: number | null }[]; sources?: { pdfPageNumber?: number }[] }
type Item = { label: string; rubric?: Criterion[]; sources?: { pdfPageNumber?: number }[] }
type Subject = { subjectName: string; grades?: number[]; performanceEvaluation?: { items?: Item[] } }

async function registerAndAnalyze(request: APIRequestContext, id: string) {
  const path = DOCS[id]
  const bytes = readFileSync(path)
  const fileName = `real-${id}-${Date.now().toString(36)}${path.slice(path.lastIndexOf('.'))}`
  const created = await request.post(PLANS, {
    headers: operator,
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: bytes }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '2' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const run = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: operator, timeout: 300_000 })
  expect(run.status(), 'real analyzer HTTP → Backend 저장').toBe(201)
  const analysis = await run.json()
  expect(analysis.analyzer.profile).toBe(PROFILE)
  return { planId: plan.planId as string, revisionId: plan.documentRevisionId as string, analysisId: analysis.analysisId as string, subjects: analysis.subjects as Subject[], fileName, bytes }
}

async function openWizard(page: Page, planId: string, revisionId: string) {
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${planId}/revisions/${revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 60_000 })
}

/** 수행평가 목록에서 조건에 맞는 첫 항목을 연다(목록 순서 = 과목별 '평가 비율' + 수행평가). */
async function openItemWith(page: Page, testId: string) {
  const nav = page.getByTestId('performance-nav-item')
  const count = await nav.count()
  for (let i = 0; i < count; i++) {
    await nav.nth(i).click()
    if (await page.getByTestId(testId).count()) return i
  }
  throw new Error(`${testId}가 있는 수행평가를 찾지 못했어요`)
}

test('F02455 실제 B16: 요소 배점·연결 확인 필요·원문 학년 표시 → 배점 수정·비우기 → 확정 → 학생은 확정 배점만', async ({ page, request }) => {
  const doc = await registerAndAnalyze(request, 'F02455')
  // 실제 응답의 첫 '요소 배점' 항목 (과목·수행 번호)
  const target = doc.subjects.flatMap((s, si) => (s.performanceEvaluation?.items ?? []).map((item, ii) => ({ s, si, item, ii })))
    .find(({ item }) => (item.rubric ?? []).length >= 2 && item.rubric!.some((c) => c.maxScore != null))!
  expect(target, '실제 응답에 maxScore가 있는 채점표').toBeTruthy()
  const firstScored = target.item.rubric!.findIndex((c) => c.maxScore != null)
  const candidate = target.item.rubric![firstScored].maxScore!
  expect(target.item.rubric!.every((c) => c.maxScore == null || (c.maxScore >= 0 && c.maxScore <= 1000))).toBe(true)

  await openWizard(page, doc.planId, doc.revisionId)
  // 과목: 원문 학년(문서 학년 1과 같음 → 충돌 안내 없음)
  await page.getByTestId('review-step-subjects-tab').click()
  const cards = page.getByTestId('review-subject-card')
  await expect(cards).toHaveCount(doc.subjects.length)
  await expect(cards.nth(target.si).getByTestId('review-subject-grades')).toHaveText(`원문 ${target.s.grades!.join('·')}학년`)
  await expect(page.getByTestId('review-subject-grade-conflict')).toHaveCount(0)
  const slot = (await (await request.get(`${PLANS}/${doc.planId}/subjects`, { headers: operator })).json()).items
  await page.getByTestId(`review-subject-select-${target.si}`).selectOption(slot[0].subjectId)

  // 수행평가: 연결 확인 필요 배지(실제 linkReview)
  await page.getByTestId('review-step-performance-tab').click()
  await openItemWith(page, 'review-rubric-link-review')
  await expect(page.getByTestId('review-rubric-link-review').first()).toContainText('연결 확인 필요')
  await page.screenshot({ path: 'test-results/a17-real-wizard-link-review.png', fullPage: true })

  // 요소 배점 항목으로 이동: 후보 배점 표시
  const nav = page.getByTestId('performance-nav-item')
  const navIndex = await (async () => {
    for (let i = 0; i < (await nav.count()); i++) {
      await nav.nth(i).click()
      const scores = page.getByTestId('review-rubric-max-score')
      if ((await scores.count()) && (await scores.first().textContent()) === `요소 배점 ${candidate}점`) return i
    }
    return -1
  })()
  expect(navIndex, '후보 요소 배점이 Wizard에 보인다').toBeGreaterThanOrEqual(0)
  await page.screenshot({ path: 'test-results/a17-real-wizard-max-score.png', fullPage: true })

  // 채점기준 보완: 후보 배점이 미리 채워짐 → 첫 배점 수정, 다른 요소 배점은 비움(0과 다름)
  await page.getByTestId('rubric-edit-open').click()
  const editor = page.getByTestId('rubric-editor')
  const inputs = editor.getByTestId('rubric-max-score')
  await expect(inputs.nth(firstScored)).toHaveValue(String(candidate))
  const edited = candidate + 1
  const cleared = firstScored === 0 ? 1 : 0
  await inputs.nth(firstScored).fill(String(edited))
  await inputs.nth(cleared).fill('')
  const page1 = target.item.sources?.[0]?.pdfPageNumber ?? target.item.rubric![firstScored].sources?.[0]?.pdfPageNumber ?? 1
  await editor.getByTestId('rubric-page').fill(String(page1))
  await editor.getByTestId('rubric-save').click()
  await expect(page.getByTestId('rubric-manual-table')).toContainText(`요소 배점 ${edited}점`)
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 20_000 })

  // 확정 (원문 대조 첨부 + 부분 분석 확인)
  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: doc.fileName, mimeType: 'application/pdf', buffer: doc.bytes })
  await page.getByTestId('review-attest').check()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm').click()
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 30_000 })

  // 저장값: 확정 채점표에 수정 배점·비운 배점(null), 연결 확인 표시는 확정값에 없음
  const detail = await (await request.get(`${PLANS}/${doc.planId}`, { headers: operator })).json()
  const rubricField = detail.revisions.flatMap((r: { confirmedFields: { fieldPath: string; value: Criterion[] }[] }) => r.confirmedFields)
    .find((f: { fieldPath: string }) => f.fieldPath === `performanceEvaluation.items[${target.ii}].rubric`)
  expect(rubricField, '확정 채점표 저장').toBeTruthy()
  expect(rubricField.value[firstScored].maxScore).toBe(edited)
  expect(rubricField.value[cleared].maxScore ?? null).toBeNull()
  expect(JSON.stringify(rubricField.value)).not.toContain('linkReview')

  // 학생: 확정 배점만, 분석 후보 메타데이터(linkReview·grades) 없음
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const plan = page.getByTestId('confirmed-plan').filter({ hasText: doc.fileName })
  await expect(plan.getByTestId('confirmed-rubric-max-score').first()).toContainText(`배점 ${edited}점`)
  await page.screenshot({ path: 'test-results/a17-real-student-max-score.png', fullPage: true })
  const student = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}`, { headers: studentHeaders })).text()
  expect(student).not.toContain('linkReview')
  expect(student).not.toContain('"grades"')
})

test('F01664 실제 B16: 40과목 원문 학년 표시, 문서 학년과 다른 과목은 Wizard 안내 + 서버 확정 거절', async ({ page, request }) => {
  const doc = await registerAndAnalyze(request, 'F01664')
  expect(doc.subjects).toHaveLength(40)
  const conflicts = doc.subjects.map((s, i) => (Array.isArray(s.grades) && !s.grades.includes(1) ? i : -1)).filter((i) => i >= 0)
  expect(conflicts.length, '실제 응답에 문서 학년(1)과 다른 원문 학년 과목').toBeGreaterThan(0)

  await openWizard(page, doc.planId, doc.revisionId)
  await page.getByTestId('review-step-subjects-tab').click()
  const cards = page.getByTestId('review-subject-card')
  await expect(cards).toHaveCount(40)
  await expect(page.getByTestId('review-subject-grades')).toHaveCount(doc.subjects.filter((s) => Array.isArray(s.grades)).length)
  await expect(page.getByTestId('review-subject-grade-conflict')).toHaveCount(conflicts.length)
  await expect(cards.nth(conflicts[0]).getByTestId('review-subject-grade-conflict')).toContainText('확정할 수 없어요')
  await page.screenshot({ path: 'test-results/a17-real-wizard-grades-40.png', fullPage: true })

  const slot = (await (await request.get(`${PLANS}/${doc.planId}/subjects`, { headers: operator })).json()).items
  const blocked = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review`, {
    headers: reviewer,
    data: { analysisId: doc.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: slot[0].subjectId, analysisSubjectIndex: conflicts[0], confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null, pdfPageNumber: 1 }] }] },
  })
  expect(blocked.status()).toBe(400)
  expect(await blocked.text()).toContain('grade_conflict')
})
