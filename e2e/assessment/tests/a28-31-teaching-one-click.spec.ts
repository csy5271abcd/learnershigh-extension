import { expect, test } from '@playwright/test'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { linkSubjectThenTeaching } from '../reviewUi.ts'

// A28-31 월별 운영계획 원클릭 승인: 행마다 '확인'을 누르지 않아도(0회) 원문 근거가 있는 후보 전부가 기본 포함되고,
// '최종 승인' 한 번에 확정된다. 이력·응답은 'AI 기본값 채택'으로 기록(개별 검토로 꾸미지 않음). 중복 클릭은 확정 1건.
// 일회용 DB · Stub 분석기(contract03 합성 0.3: 1과목 9행, 모두 원문 쪽 근거) · 합성 문서만.
const admin = { 'X-Assessment-Admin-Id': ADMIN_ID }

test('[A28-31] 0회 행 클릭 → 1회 승인 → 9행 확정 · AI 기본값 채택 기록 · 중복 클릭 1건', async ({ page, request }) => {
  test.setTimeout(120_000)
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a2831-contract03-${tag}.pdf`, uniquePdf(`${tag}-a2831`))
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await linkSubjectThenTeaching(page, 0, 'subj_02')
  // 행 결정 없이 바로: 자동 포함 9 · 확인 0 · 수정 0 · 제외 0
  await expect(page.getByTestId('teaching-plan-approval-counts')).toContainText('후보 9행 · 자동 포함 9 · 확인 0 · 수정 0 · 제외 0')
  const confirm = page.getByTestId('teaching-plan-confirm')
  await expect(confirm).toContainText('월별 운영계획 최종 승인 (공개 9행)')
  await expect(confirm).toBeEnabled()
  await page.screenshot({ path: 'test-results/a28-31-one-click-before.png' })
  const puts: number[] = []
  page.on('response', (r) => r.url().endsWith(`/revisions/${doc.revisionId}/teaching-plan-review`) && r.request().method() === 'PUT' && puts.push(r.status()))
  await confirm.dblclick()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 15_000 })
  await expect(page.getByTestId('teaching-plan-status')).toContainText('AI 기본값 채택 9행 · 관리자 결정 0행')
  expect(puts.filter((status) => status === 200)).toHaveLength(1)

  const review = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, { headers: admin })).json()
  expect(review.review.rows).toHaveLength(9)
  expect(review.review.rows.every((row: { decisionBasis: string }) => row.decisionBasis === 'AI_DEFAULT')).toBe(true)
  const history = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-reviews`, { headers: admin })).json()
  expect(history.items).toHaveLength(1)
  const studentPlan = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: { 'X-Assessment-Student-Id': STUDENT_ID } })).json()
  expect(studentPlan.rows).toHaveLength(9)
  expect(JSON.stringify(studentPlan)).not.toContain('decisionBasis')
  await page.screenshot({ path: 'test-results/a28-31-one-click-after.png', fullPage: true })
})
