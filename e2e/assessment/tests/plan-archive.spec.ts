import { expect, test } from '@playwright/test'
import { ADMIN, ADMIN_ID, PLANS, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A9 평가계획서 문서 상세(학년도별로 섞이지 않음): 과목 → 수행평가·채점기준 → 평가 구성 → 월별 운영계획.
// A27-UX 관리자 UI 개선([08]): '학년도별 열람' 화면은 제거됐다. 학년도 구분은 평가계획서 6칸의 학년도 Filter로, 문서 상세는
// 분석 결과 조회 화면(원문 고정 2패널)에서 연다. 상세 단언(과목·채점기준·확정/후보·운영계획 9행)은 그대로다.
// 분석 결과는 Stub(합성 0.3 Fixture / 0.2 Fixture를 0.3으로 감싼 것)이다. 실제 분석기 결과가 아니다.

test('학년도를 고르면 그 학년도 문서만 보이고, 결과 조회에서 과목별 수행평가·채점기준·월별 운영계획을 열람한다', async ({ page, request }) => {
  const tag = runTag()
  const file2026 = `e2e-archive-contract03-${tag}.pdf`
  const file2025 = `e2e-archive-legacy-${tag}.pdf`
  const doc2026 = await registerAndAnalyze(request, 2026, file2026, uniquePdf(`${tag}-2026`))
  const doc2025 = await registerAndAnalyze(request, 2025, file2025, uniquePdf(`${tag}-2025`))
  // 2026 문서만 평가 정보 확정 (수행 반영 60%) → 화면은 '확정', 2025 값은 '후보'
  await confirmEvaluation(request, doc2026, 'subj_02', [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }])

  // 1~3. 평가계획서 6칸: 학년도 Filter마다 그 학년도 문서만 (다른 학년도 섞이지 않음), '학년도별 열람' 진입은 없다
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('open-plan-archive')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('학년도별 열람')
  const slot = page.getByTestId('plan-slot-1-2')
  await expect(slot).toContainText(file2026)
  await expect(slot).not.toContainText(file2025)
  await page.getByTestId('filter-year').selectOption('2025')
  await expect(page.getByTestId('plan-slot-1-2')).toContainText(file2025)
  await expect(page.getByTestId('plan-slot-1-2')).not.toContainText(file2026)
  // 예전 '학년도별 열람' 주소는 6칸으로 열린다
  await page.goto(`${ADMIN}/assessment/evaluation-plans/archive?school=school_001`)
  await expect(page.getByTestId('plan-slots-page')).toBeVisible({ timeout: 30_000 })

  // 4~6. 2026 문서 결과 조회: 과목 → 수행평가 상세 → 채점기준
  await page.goto(`${ADMIN}/assessment/analysis/${doc2026.planId}/revisions/${doc2026.revisionId}/result`)
  const detail = page.getByTestId('archive-detail')
  await expect(detail).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('plan-result-head')).toContainText('2026학년도 고1 2학기')
  await expect(page.getByTestId('plan-result-head')).toContainText(file2026)
  // A27-UX [06]: 과목 칩 대신 단일 과목 선택 + '과목 n/전체'
  await expect(page.getByTestId('result-subject-count')).toHaveText('과목 1/1')
  await expect(page.getByTestId('result-subject-trigger')).toContainText('가상과학탐구')
  await expect(page.getByTestId('archive-item')).toHaveCount(2)
  const item = page.getByTestId('archive-item-detail')
  await expect(item).toContainText('탐구 보고서')
  await expect(item).toContainText('4월')
  await expect(item).toContainText('가상 하천의 수질을 측정하는 실험')
  const rubric = page.getByTestId('archive-rubric')
  await expect(rubric).toContainText('실험 설계')
  await expect(rubric).toContainText('변인 통제가 명확함')
  await expect(rubric).toContainText('50점')
  await expect(rubric).toContainText('보고서 작성')
  await page.getByTestId('archive-item').nth(1).click()
  await expect(item).toContainText('토론 활동')

  // 평가 구성: 관리자 확정값(60%)은 '확정', 미확정 값은 '후보'
  await page.getByTestId('archive-tab-overview').click()
  const overview = page.getByTestId('archive-overview')
  await expect(overview.locator('[data-state="confirmed"]')).toContainText('60%')
  await expect(overview).not.toContainText('증감')

  // 7. 월별 운영계획 (9행: 정밀도별, 시기를 정할 수 없는 계획도 누락 없음)
  await page.getByTestId('archive-tab-teaching').click()
  await expect(page.getByTestId('archive-teaching-row')).toHaveCount(9)
  await expect(page.getByTestId('archive-teaching')).toContainText('1. 물질의 규칙성')
  await expect(page.getByTestId('archive-teaching')).toContainText('시기를 정할 수 없는 계획')
  await page.setViewportSize({ width: 1536, height: 960 })
  await page.screenshot({ path: 'test-results/assessment-archive-2026-teaching-1536.png', fullPage: true })

  // 원문은 Modal이 아니라 왼쪽 고정 패널에 보인다
  await expect(page.getByTestId('review-source-pane')).toBeVisible()

  // 8~10. 2025 문서 → 그 학년도 정보만, 2026 확정값이 섞이지 않음
  await page.goto(`${ADMIN}/assessment/analysis/${doc2025.planId}/revisions/${doc2025.revisionId}/result`)
  await expect(page.getByTestId('archive-detail')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('plan-result-head')).toContainText('2025학년도')
  await expect(page.getByTestId('plan-result-head')).toContainText(file2025)
  await page.getByTestId('archive-tab-overview').click()
  await expect(page.getByTestId('archive-overview').locator('[data-state="confirmed"]')).toHaveCount(0)
  await page.getByTestId('archive-tab-teaching').click()
  await expect(page.getByTestId('archive-no-teaching')).toBeVisible()

  // 태블릿·좁은 폭에서도 가로 넘침 없이 열람
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `가로 넘침 @${width}`).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/assessment-archive-2025-${width}.png`, fullPage: true })
  }

  // 11. 제거된 비교 화면·API 진입 불가
  await page.goto(`${ADMIN}/assessment/evaluation-plans/comparison?school=school_001`)
  await expect(page.locator('body')).not.toContainText('학년도 비교')
  const compare = await request.get(`${PLANS}/comparison`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID }, params: { schoolId: 'school_001', grade: '1', semester: '2', years: '2025,2026' } })
  expect(compare.status()).toBe(404)
})
