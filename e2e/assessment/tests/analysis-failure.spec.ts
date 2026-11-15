import { expect, test } from '@playwright/test'
import { ADMIN, PLANS, ADMIN_ID, runTag, uniquePdf } from '../support.ts'

// 분석 실패 안내 (A7): 분석기가 '평가항목 없음'(NO_ASSESSMENTS_EXTRACTED)을 보내면 장애·계약 오류가 아니라 문서 쪽 사유로 안내하고
// 결과를 저장하지 않는다. Stub 응답 모양은 실제 분석기 v21.1(2026-11-15 확인)과 같다.

test('평가항목을 찾지 못한 문서는 원인을 단정하지 않는 안내를 보여 주고 분석 결과를 저장하지 않는다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-noresult-${tag}.pdf`
  const created = await request.post(PLANS, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: uniquePdf(tag) }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '1' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()

  const direct = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })
  expect(direct.status()).toBe(422)
  expect((await direct.json()).code).toBe('PLAN_ANALYSIS_NO_RESULT')

  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  const row = page.getByTestId('plan-row').filter({ hasText: fileName })
  await expect(row).toBeVisible()
  await row.getByTestId('plan-analyze-button').click()
  await expect(page.getByText(/문서에서 평가항목을 찾지 못했어요/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/평가계획서여도 찾지 못할 수 있어요/)).toBeVisible()

  const analysis = await request.get(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })
  expect((await analysis.json()).analysisStatus).toBe('NOT_REQUESTED')
})
