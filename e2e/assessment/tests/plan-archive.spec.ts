import { expect, test } from '@playwright/test'
import { ADMIN, ADMIN_ID, PLANS, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A9 학년도별 평가계획서 열람: 학교 → 학년도 → 문서 → 과목 → 수행평가·채점기준 → 월별 운영계획 → 다른 학년도.
// 분석 결과는 Stub(합성 0.3 Fixture / 0.2 Fixture를 0.3으로 감싼 것)이다. 실제 분석기 결과가 아니다.
// 학년도 2026(다른 spec 문서와 함께 있음 — 파일 이름으로 고른다)과 2025를 쓴다. 과목 연결은 각 학년도 슬롯 과목(subj_*)이다.

test('학년도를 고르면 그 학년도 문서만 보이고, 과목별 수행평가·채점기준·월별 운영계획을 열람한다', async ({ page, request }) => {
  const tag = runTag()
  const file2026 = `e2e-archive-contract03-${tag}.pdf`
  const file2025 = `e2e-archive-legacy-${tag}.pdf`
  const doc2026 = await registerAndAnalyze(request, 2026, file2026, uniquePdf(`${tag}-2026`))
  await registerAndAnalyze(request, 2025, file2025, uniquePdf(`${tag}-2025`))
  // 2026 문서만 평가 정보 확정 (수행 반영 60%) → 화면은 '확정', 2025 값은 '후보'
  await confirmEvaluation(request, doc2026, 'subj_02', [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }])

  // 1. 학교 선택 (목록 화면의 '학년도별 열람' 진입)
  await page.goto(`${ADMIN}/assessment/evaluation-plans`)
  await page.getByTestId('open-plan-archive').click()
  await expect(page.getByTestId('plan-archive')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('archive-school').selectOption('school_001')

  // 2. 학년도 선택: 실제 등록된 학년도만, 최신순
  const years = page.getByTestId('archive-years')
  await expect(years.getByTestId('archive-year-2026')).toBeVisible()
  await expect(years.getByTestId('archive-year-2025')).toBeVisible()
  await expect(years.getByTestId('archive-year-2021')).toHaveCount(0)
  await years.getByTestId('archive-year-2026').click()

  // 3. 문서 목록: 2026 문서만 (2025 문서 섞이지 않음)
  const docs = page.getByTestId('archive-docs')
  await expect(docs).toContainText(file2026)
  await expect(docs).not.toContainText(file2025)
  await docs.getByTestId('archive-doc').filter({ hasText: file2026 }).click()
  const detail = page.getByTestId('archive-detail')
  await expect(detail).toContainText('2026학년도 · 1학년 2학기 · PDF')
  await expect(detail.getByRole('heading', { name: file2026 })).toBeVisible()

  // 4~6. 과목 → 수행평가 상세 → 채점기준
  await expect(page.getByTestId('archive-subject')).toHaveCount(1)
  await expect(page.getByTestId('archive-subject').first()).toHaveText('가상과학탐구')
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

  // 원문 보기 (PDF 미리보기)
  await page.getByTestId('archive-open-original').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).last().click()

  // 8~10. 다른 학년도 → 그 학년도 정보로 바뀌고 섞이지 않음
  await years.getByTestId('archive-year-2025').click()
  await expect(docs).toContainText(file2025)
  await expect(docs).not.toContainText(file2026)
  await expect(detail).toContainText('2025학년도')
  await expect(detail.getByRole('heading', { name: file2025 })).toBeVisible()
  await page.getByTestId('archive-tab-overview').click()
  await expect(page.getByTestId('archive-overview').locator('[data-state="confirmed"]')).toHaveCount(0)
  await page.getByTestId('archive-tab-teaching').click()
  await expect(page.getByTestId('archive-no-teaching')).toBeVisible()

  // 태블릿·모바일 폭에서도 가로 넘침 없이 열람
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `가로 넘침 @${width}`).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/assessment-archive-2025-${width}.png`, fullPage: true })
  }

  // 11. 제거된 비교 화면·API 진입 불가
  await page.goto(`${ADMIN}/assessment/evaluation-plans/comparison?school=school_001`)
  await expect(page.getByTestId('plan-archive')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('학년도 비교')
  const compare = await request.get(`${PLANS}/comparison`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID }, params: { schoolId: 'school_001', grade: '1', semester: '2', years: '2025,2026' } })
  expect(compare.status()).toBe(404)
})
