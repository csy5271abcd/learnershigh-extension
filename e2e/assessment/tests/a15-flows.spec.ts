import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API, PLANS, STUDENT, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A15 0.3 선택 확장 필드(§39-12) 화면 E2E. 일회용 DB의 실제 Backend·Storage, 분석기는 Stub(합성 0.3 + 확장 필드, 파일명 *contract03ext*).
// 계정 B 실제 서비스는 아직 이 필드를 보내지 않는다 — 실제 B13 HTTP 검증은 A15 보고서의 별도 실행 결과.
const studentHeaders = { 'X-Assessment-Student-Id': 'stu_001' }

async function confirmOnScreen(page: Page, fileName: string, bytes: Buffer) {
  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('review-attest').check()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm').click()
}

test('요소 배점·연결 확인 필요·원문 학년이 Wizard에 보이고, 요소 배점은 확정 뒤 학생에게, 다른 학년 과목은 확정할 수 없다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-contract03ext-${tag}.pdf`
  const bytes = uniquePdf(tag)
  const doc = await registerAndAnalyze(request, 2026, fileName, bytes)

  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  // 과목 확인: 원문 학년, 문서 학년(1)과 다른 과목에는 확정 불가 안내
  await page.getByTestId('review-step-subjects-tab').click()
  const cards = page.getByTestId('review-subject-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0).getByTestId('review-subject-grades')).toHaveText('원문 1학년')
  await expect(cards.nth(0).getByTestId('review-subject-grade-conflict')).toHaveCount(0)
  await expect(cards.nth(1).getByTestId('review-subject-grades')).toHaveText('원문 2학년')
  await expect(cards.nth(1).getByTestId('review-subject-grade-conflict')).toContainText('확정할 수 없어요')
  await page.getByTestId('review-subject-select-0').selectOption('subj_02')

  // 수행평가 검토: 분석 후보의 요소 배점·연결 확인 필요 배지
  await page.getByTestId('review-step-performance-tab').click()
  // 목록 첫 항목은 과목 '평가 비율', 두 번째가 첫 수행평가(요소 배점·연결 확인 필요가 붙은 채점표)
  await expect(page.getByTestId('review-step-performance')).toContainText('원문 2학년')
  await page.getByTestId('performance-nav-item').nth(1).click()
  await expect(page.getByTestId('review-rubric-max-score').first()).toHaveText('요소 배점 75점')
  await expect(page.getByTestId('review-rubric-link-review').first()).toContainText('연결 확인 필요')
  await page.screenshot({ path: 'test-results/a15-wizard-rubric-ext-1536.png', fullPage: true })

  // 채점기준 보완: 후보의 요소 배점이 채워져 있고, 고쳐서 적용
  await page.getByTestId('rubric-edit-open').click()
  const editor = page.getByTestId('rubric-editor')
  await expect(editor.getByTestId('rubric-max-score').first()).toHaveValue('75')
  await editor.getByTestId('rubric-max-score').first().fill('80')
  await editor.getByTestId('rubric-page').fill('1')
  await editor.getByTestId('rubric-save').click()
  await expect(page.getByTestId('rubric-manual-table')).toContainText('요소 배점 80점')
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  await confirmOnScreen(page, fileName, bytes)
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 15_000 })

  // 학생: 확정 채점표의 요소 배점, 분석 후보 표시(연결 확인·학년)는 없음
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const plan = page.getByTestId('confirmed-plan').filter({ hasText: fileName })
  await expect(plan.getByTestId('confirmed-rubric-max-score').first()).toContainText('배점 80점')
  await page.screenshot({ path: 'test-results/a15-student-rubric-max-score-1536.png', fullPage: true })
  const student = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}`, { headers: studentHeaders })).text()
  expect(student).not.toContain('linkReview')
  expect(student).not.toContain('grades')

  // 원문 2학년 과목(과목 1)은 화면 밖 API로도 확정할 수 없다(운영계획 포함)
  const admin = { 'X-Assessment-Admin-Id': 'adm_gangnam' }
  await request.post(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review-draft/reopen`, { headers: admin })
  const evaluation = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review`, {
    headers: admin,
    data: { analysisId: doc.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: 'subj_02', analysisSubjectIndex: 1, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }] }] },
  })
  expect(evaluation.status()).toBe(400)
  expect(await evaluation.text()).toContain('grade_conflict')
  const teaching = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, {
    headers: admin,
    data: { analysisId: doc.analysisId, rows: [{ subjectIndex: 1, rowKey: 'T01', subjectId: 'subj_02', decision: 'CONFIRMED' }] },
  })
  expect(teaching.status()).toBe(400)
  expect(await teaching.text()).toContain('grade_conflict')
})
