import { expect, test } from '@playwright/test'
import { ADMIN, PLANS, ADMIN_ID, runTag, uniquePdf } from '../support.ts'

// 분석 실패 안내 (A7·A8): 분석기가 '평가항목 없음'(NO_ASSESSMENTS_EXTRACTED)을 보낸 경우.
// 이 E2E는 0.3 Gate ON 환경이라 B6 규칙대로 0.3 FAILED Run으로 저장되고, 관리자는 '찾지 못함'을 보며 확정할 수 없다.
// (0.2 경로의 422 PLAN_ANALYSIS_NO_RESULT는 Integration Test와 실제 분석기 v21.1 확인으로 따로 검증한다.)

test('평가항목을 찾지 못한 문서는 실패로 저장되고 관리자에게 안내되며 평가 정보로 확정할 수 없다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-noresult-${tag}.pdf`
  const created = await request.post(PLANS, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: uniquePdf(tag) }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '1' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()

  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  const row = page.getByTestId('plan-row').filter({ hasText: fileName })
  await expect(row).toBeVisible()
  await row.getByTestId('plan-analyze-button').click()
  await expect(page.getByText(/평가 정보를 찾지 못했어요/)).toBeVisible({ timeout: 15_000 })

  const analysis = await request.get(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })
  const body = await analysis.json()
  expect(body.analysisStatus).toBe('FAILED')
  expect(body.analyzer.contractVersion).toBe('0.3')
  // 실패 결과는 확정 대상이 아니다
  const confirm = await request.put(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/review`, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    data: { analysisId: body.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: 'subj_12', confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }] }] },
  })
  expect(confirm.status()).toBe(400)
})

// A18: 분석기 처리 시간 제한 초과(분석기 504 ANALYSIS_TIMEOUT → Backend 502 analyzer_error:analysis_timeout).
// 계약 불일치가 아니라 시간 초과로 안내하고, 분석 결과를 저장하지 않는다(다른 프로필로 대체 없음).
test('분석기 처리 시간이 넘으면 시간 초과로 안내하고 분석 결과를 저장하지 않는다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-analyzertimeout-${tag}.pdf`
  const created = await request.post(PLANS, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: uniquePdf(tag) }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '1' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()

  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  const row = page.getByTestId('plan-row').filter({ hasText: fileName })
  await expect(row).toBeVisible()
  await row.getByTestId('plan-analyze-button').click()
  await expect(page.getByText(/처리 시간 제한을 넘겨 분석을 멈췄어요/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/약속\(계약\)과 달라/)).toHaveCount(0)
  await expect(page.getByText(/analyzer_error:analysis_timeout/)).toBeVisible()

  const analysis = await request.get(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })
  const body = await analysis.json()
  expect(body.analysisId ?? null).toBeNull()
  expect(body.analysisStatus).toBe('NOT_REQUESTED')
})
