import { expect, test, type Page } from '@playwright/test'
import { ADMIN, STUDENT, runTag, uniquePdf } from '../support.ts'

// 평가계획서 기본 흐름 + 검토 Stepper (A7). Stub 분석기(0.2 합성 결과) 기준 — 실제 분석기 검증을 대신하지 않는다.

/** Stepper 안 색이 무채색인지(파랑·초록 없음): R·G·B 차이가 작아야 한다 */
async function stepperColors(page: Page) {
  return page.locator('nav[aria-label="검토 단계"]').evaluate((nav) => {
    const colors: string[] = []
    for (const element of [nav, ...Array.from(nav.querySelectorAll('*'))]) {
      const style = getComputedStyle(element)
      colors.push(style.color, style.backgroundColor, style.borderTopColor)
    }
    return colors
  })
}

function isNeutral(color: string) {
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? []
  if (parts.length < 3) return true
  if (parts.length === 4 && parts[3] === 0) return true
  const [r, g, b] = parts
  return Math.max(r, g, b) - Math.min(r, g, b) <= 12
}

test('업로드 → 검토(과목 선택·수행평가 확인) → 초안 저장·복원 → 확정 → 학생 확정값·근거 쪽 이동', async ({ page }) => {
  const tag = runTag()
  const fileName = `e2e-evaluation-${tag}.pdf`
  const bytes = uniquePdf(tag)

  // 1) 업로드 (등록 후 서버 분석 → 검토 Workspace로 이동)
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  await page.getByTestId('plan-upload-open').click()
  await page.getByTestId('plan-upload-dialog').locator('input[type="file"]').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('plan-upload-submit').click()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('review-analysis-status')).toBeVisible()

  // 2) Stepper: 5단계, 현재 = 1단계, 무채색, 페이지 가로 넘침 없음
  const steps = page.locator('nav[aria-label="검토 단계"] button')
  await expect(steps).toHaveCount(5)
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
  await expect(steps.nth(0)).toHaveCSS('background-color', 'rgb(241, 242, 244)')
  expect((await stepperColors(page)).filter((color) => !isNeutral(color))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  // 3) 다음 → 과목 확인: 학업 과목 목록에서 선택 (직접 입력 아님)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step')
  await page.getByTestId('review-subject-select-0').selectOption('subj_02')

  // 4) 수행평가 검토: 후보가 있는 값 확인
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step')
  const confirmButtons = page.locator('[data-testid="review-field-confirm"]:not([disabled])')
  await confirmButtons.first().click()
  await expect(page.getByTestId('review-field-state').first()).toContainText('확인함')
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })

  // 5) 새로고침해도 서버 초안에서 복원
  await page.reload()
  await expect(page.getByTestId('review-workspace')).toBeVisible()
  await page.getByTestId('review-step-performance-tab').click()
  await expect(page.getByTestId('review-field-state').first()).toContainText('확인함')
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-select-0')).toHaveValue('subj_02')

  // 6) 최종 확정: 원본 SHA 대조 + 대조 확인
  await page.getByTestId('review-go-confirm').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('review-attest').check()
  await page.getByTestId('review-confirm').click()
  await expect(page.getByTestId('review-confirmed')).toBeVisible({ timeout: 15_000 })
  // 완료 단계는 체크 아이콘(진회색 원), 현재 단계는 번호
  await expect(steps.nth(4)).toHaveAttribute('aria-current', 'step')
  await expect(steps.nth(1).locator('svg')).toHaveCount(1)
  await expect(steps.nth(1).locator('span').first()).toHaveCSS('background-color', 'rgb(64, 64, 64)')
  expect((await stepperColors(page)).filter((color) => !isNeutral(color))).toEqual([])
  await page.screenshot({ path: 'test-results/assessment-stepper-done-1536.png' })

  // 7) 학생: 확정값만 보이고, 근거 쪽으로 원문 Viewer가 열린다
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const section = page.getByRole('region', { name: fileName })
  await expect(section).toBeVisible()
  await expect(section.locator('[data-state="value"]').first()).toBeVisible()
  await expect(section).not.toContainText('후보')
  await section.getByRole('link', { name: /원문 \d+쪽에서 확인/ }).first().click()
  await expect(page).toHaveURL(/\/original\?page=\d+/)
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test(`Stepper ${viewport.width}px: 모든 단계 접근·페이지 가로 넘침 없음·현재 단계 보임`, async ({ page, request }) => {
    const tag = runTag()
    const { registerAndAnalyze } = await import('../support.ts')
    const doc = await registerAndAnalyze(request, 2026, `e2e-stepper-${tag}.pdf`, uniquePdf(tag))
    await page.setViewportSize(viewport)
    await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
    await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
    const steps = page.locator('nav[aria-label="검토 단계"] button')
    await steps.nth(4).click()
    await expect(steps.nth(4)).toHaveAttribute('aria-current', 'step')
    await expect(steps.nth(4)).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `test-results/assessment-stepper-${viewport.width}.png` })
  })
}
