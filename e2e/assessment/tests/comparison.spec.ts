import { expect, test } from '@playwright/test'
import { ADMIN, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// 학년도별 비교 (A7): 학년도마다 따로 등록·분석(Stub 0.2)·확정 → 비교 화면. 확정값만 비교하고 미확정 문서는 제외한다.
// 같은 슬롯에 이전 실행 문서가 남아 있을 수 있어 plans 매개변수로 이번 실행 문서를 고른다.

test('세 학년도 확정값 비교: 비율 변화·항목 추가·명칭 변경 가능성·누락·이름이 비슷한 다른 과목·미확정 제외·원문 근거 이동', async ({ page, request }) => {
  const tag = runTag()
  const field = (fieldPath: string, value: string | number, pdfPageNumber = 1) => ({ fieldPath, value, pdfPageNumber })
  const y2024 = await registerAndAnalyze(request, 2024, `e2e-cmp-2024-${tag}.pdf`, uniquePdf(`2024-${tag}`))
  await confirmEvaluation(request, y2024, 'subj24_02', [
    field('performanceEvaluation.weightPercent', 50),
    field('performanceEvaluation.items[0].label', '탐구 보고서'),
    field('performanceEvaluation.items[0].weightPercent', 25),
    field('performanceEvaluation.items[1].label', '토론 활동', 2),
  ])
  const y2025 = await registerAndAnalyze(request, 2025, `e2e-cmp-2025-${tag}.pdf`, uniquePdf(`2025-${tag}`))
  await confirmEvaluation(request, y2025, 'subj_02', [
    field('performanceEvaluation.weightPercent', 60),
    field('performanceEvaluation.items[0].label', '탐구 보고서'),
    field('performanceEvaluation.items[0].weightPercent', 30),
    field('performanceEvaluation.items[1].label', '발표 활동', 2),
  ])
  // 2026은 분석만 하고 확정하지 않는다 → 비교에서 제외되어야 한다
  const y2026 = await registerAndAnalyze(request, 2026, `e2e-cmp-2026-${tag}.pdf`, uniquePdf(`2026-${tag}`))

  const params = new URLSearchParams({ school: 'school_001', grade: '1', semester: '2', years: '2023,2024,2025,2026' })
  for (const value of ['2024:subj24_02', '2025:subj_02', '2026:subj_02']) params.append('subject', value)
  for (const value of [`2024:${y2024.planId}`, `2025:${y2025.planId}`, `2026:${y2026.planId}`]) params.append('plan', value)
  await page.goto(`${ADMIN}/assessment/evaluation-plans/comparison?${params}`)
  await expect(page.getByTestId('compare-table')).toBeVisible({ timeout: 20_000 })

  await expect(page.getByTestId('compare-column-2023')).toHaveAttribute('data-status', 'NO_PLAN')
  await expect(page.getByTestId('compare-column-2024')).toHaveAttribute('data-status', 'CONFIRMED')
  await expect(page.getByTestId('compare-column-2025')).toHaveAttribute('data-status', 'CONFIRMED')
  // 2026: 같은 슬롯에 이전 실행의 확정 문서가 있을 수 있지만, 이번 실행 문서는 미확정 → 확정 문서로 대체하지 않는다
  await expect(page.getByTestId('compare-column-2026')).not.toHaveAttribute('data-status', 'CONFIRMED')

  const performance = page.locator('[data-testid="compare-row"][data-key="performanceEvaluation.weightPercent"]')
  await expect(performance).toHaveAttribute('data-status', 'CHANGED')
  await expect(page.locator('[data-testid="compare-row"][data-key="performanceEvaluation.rubric"]')).toHaveAttribute('data-status', 'NOT_COMPARABLE')
  await expect(page.locator('[data-testid="compare-item"][data-label="탐구 보고서"]')).toHaveAttribute('data-status', 'CHANGED')
  await expect(page.locator('[data-testid="compare-item"][data-label="토론 활동"]')).toHaveAttribute('data-status', 'POSSIBLE_RENAME')
  await expect(page.locator('[data-testid="compare-item"][data-label="발표 활동"]')).toHaveAttribute('data-status', 'POSSIBLE_RENAME')
  await expect(page.getByTestId('compare-summary')).toContainText('비교에서 빠진 학년도')

  // 이름이 비슷한 2024 '통합과학'(subj24_02)은 2026 '통합과학2'(subj_02)와 자동으로 같은 과목이 되지 않는다
  await expect(page.getByTestId('compare-subject-2024').locator('option', { hasText: 'subj_02' })).toHaveCount(0)

  await page.screenshot({ path: 'test-results/assessment-comparison-1536.png', fullPage: true })

  // 원문 근거 이동: 2025 값의 근거 쪽 → 검토 Workspace PDF Viewer의 그 쪽
  await page.getByTestId('compare-column-2025')
  await performance.locator('td').nth(2).getByTestId('compare-source').click()
  await expect(page).toHaveURL(new RegExp(`/evaluation-plans/${y2025.planId}/revisions/${y2025.revisionId}\\?page=1`))
  await expect(page.getByTestId('review-workspace')).toBeVisible()
})
