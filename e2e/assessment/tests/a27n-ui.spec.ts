import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API, STUDENT, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A27-UX 부록 N (2026-11-21): 관리자 삭제 Toast 자동 닫힘(N5-1) · 학년도 최근 3개(N5-2) · 간편 검토 보기 필터(N5-3)
// · 학생 결과물↔탐구 노트 구분선 하나(N7) · Mock 자동 대체 없음(N2). 일회용 DB · 실제 Backend.

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('[N5-2·N5-1] 학년도 = 올해·작년·재작년 항상 · 학교 유지 · 삭제 성공 Toast 5초 뒤 자동 닫힘 · 실패면 성공 Toast 없음', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-a27n-delete-${tag}.pdf`
  await registerAndAnalyze(request, 2026, fileName, uniquePdf(`${tag}-n-delete`))
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })

  // N5-2: 등록 문서가 2026에만 있어도 2025·2024가 선택지에 있다(보조 이름 포함)
  const yearSelect = page.getByTestId('filter-year')
  const values = await yearSelect.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
  expect(values.slice(0, 3)).toEqual(['2026', '2025', '2024'])
  await expect(yearSelect.locator('option[value="2025"]')).toHaveText('2025학년도 (작년)')
  await expect(yearSelect.locator('option[value="2024"]')).toHaveText('2024학년도 (재작년)')
  await yearSelect.selectOption('2024')
  await expect(page).toHaveURL(/year=2024/)
  await expect(page).toHaveURL(/school=school_001/)
  await expect(page.getByTestId('plan-slot-1-1')).toBeVisible()
  await page.screenshot({ path: 'test-results/a27n-year-2024-1600.png' })
  // 학년도 선택은 주소(Query)를 바꾼다 — 새로고침해도 그 해가 유지된다
  await page.reload()
  await expect(yearSelect).toHaveValue('2024')
  await yearSelect.selectOption('2026')
  await expect(page).toHaveURL(/year=2026/)

  const moreButton = page.getByRole('button', { name: `${fileName} 더보기` })
  // 실패: 서버 오류면 성공 Toast 를 띄우지 않는다
  await page.route('**/api/admin/assessment/evaluation-plans/*', (route) =>
    route.request().method() === 'DELETE' ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR","message":"e2e"}' }) : route.continue(),
  )
  await moreButton.click()
  await page.getByTestId('plan-delete-open').click()
  await page.getByTestId('plan-delete-confirm').click()
  await expect(page.getByRole('dialog')).toContainText('삭제하지 못했어요')
  await expect(page.getByTestId('toast')).toHaveCount(0)
  await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
  await page.unroute('**/api/admin/assessment/evaluation-plans/*')

  // 성공: Toast 표시 → (마우스를 치운 채) 약 5초 뒤 자동으로 사라진다. 상태 조회로 화면이 다시 그려져도 타이머가 다시 시작되지 않는다
  await moreButton.click()
  await page.getByTestId('plan-delete-open').click()
  await page.getByTestId('plan-delete-confirm').click()
  const toast = page.getByTestId('toast')
  await expect(toast).toContainText(`${fileName} 문서를 삭제했어요`)
  const shownAt = Date.now()
  await page.mouse.move(5, 5)
  await expect(page.getByRole('status').filter({ has: toast })).toHaveAttribute('aria-live', 'polite')
  await page.screenshot({ path: 'test-results/a27n-delete-toast-1600.png' })
  await expect(toast).toHaveCount(0, { timeout: 9_000 })
  const elapsed = Date.now() - shownAt
  console.log(`[a27n] delete toast auto-dismiss ${elapsed}ms`)
  expect(elapsed).toBeGreaterThanOrEqual(4_000)
  await page.screenshot({ path: 'test-results/a27n-delete-toast-gone-1600.png' })
  await expect(page.getByText(fileName)).toHaveCount(0)
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '평가계획서 800')
})

test('[N5-3] 간편 검토: 후보는 모두 보이고 보기 필터는 결정을 만들지 않는다(검토 0 유지 · 저장 요청 0)', async ({ page, request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a27n-review-${tag}.pdf`, uniquePdf(`${tag}-n-review`))
  const writes: string[] = []
  page.on('request', (req) => {
    if (req.method() !== 'GET' && /\/api\/admin\/assessment\/evaluation-plans\/.+\/(review|review-draft)/.test(req.url())) writes.push(`${req.method()} ${req.url()}`)
  })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-performance-tab').click()
  const filter = page.getByTestId('review-filter')
  await expect(filter).toBeVisible()
  const allText = await page.getByTestId('review-filter-all').innerText()
  const total = Number(/(\d+)/.exec(allText)?.[1])
  expect(total).toBeGreaterThan(0)
  // A28-03: 결정 없는 후보 = 기본 승인 + 확인 필요(합 = 전체), 관리자 결정은 0
  const attention = Number(/(\d+)/.exec(await page.getByTestId('review-filter-attention').innerText())?.[1])
  await expect(page.getByTestId('review-filter-default')).toHaveText(`기본 승인 ${total - attention}`)
  await expect(page.getByTestId('review-filter-edited')).toHaveText('관리자 수정 0')
  await expect(page.getByTestId('review-filter-confirmed')).toHaveText('직접 확인 0')
  await expect(page.getByTestId('review-filter-all')).toHaveAttribute('aria-pressed', 'true')
  const before = await page.getByTestId('review-field-list').locator(':scope > li').count()
  await page.getByTestId('review-filter-attention').click()
  await expect(page.getByTestId('review-filter-attention')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('review-filter-hint')).toBeVisible()
  const after = await page.getByTestId('review-field-list').locator(':scope > li').count()
  expect(after).toBeLessThanOrEqual(before)
  await page.screenshot({ path: 'test-results/a27n-review-filter-1600.png' })
  // 지금 칸에 없으면 '다음 먼저 볼 칸으로'가 그 칸을 연다(선택만 바뀜, 결정 없음)
  const next = page.getByTestId('review-filter-next')
  if (await next.count()) {
    await next.click()
    await expect(page.getByTestId('review-field-attention').first()).toBeVisible()
  }
  await page.getByTestId('review-filter-all').click()
  // 필터 조작만으로 결정·저장·확정 요청이 생기지 않는다
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('review-filter-edited')).toHaveText('관리자 수정 0')
  await expect(page.getByTestId('review-filter-confirmed')).toHaveText('직접 확인 0')
  expect(writes, '보기 필터는 검토 초안·확정 요청을 만들지 않는다').toEqual([])
  await expect(page.getByRole('button', { name: /일괄|모두 확인|전체 승인/ })).toHaveCount(0)
})

test('[N7] 학생 상세: 결과물과 탐구 노트 사이 선은 하나(1px) · 800·1366·1600·1920', async ({ page, request }) => {
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, {
    headers: { 'X-Assessment-Student-Id': STUDENT_ID },
    data: { subjectId: 'subj_02', academicYear: 2026, semester: 2, title: `E2E 구분선 ${runTag()}` },
  })
  expect(created.status()).toBe(201)
  const item = (await created.json()) as { assessmentId: string }
  for (const [width, height] of [[800, 600], [1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`${STUDENT}/assessment/school-assessments/${item.assessmentId}`)
    await expect(page.getByTestId('detail-note').locator('h2').first()).toBeVisible({ timeout: 15_000 })
    // 결과물 Section 의 위쪽 선 ~ 탐구 노트 제목 사이에서 실제로 보이는 가로선(border) 수를 센다
    const lines = await page.evaluate(() => {
      const artifacts = document.querySelector('[data-testid="detail-artifacts"]') as HTMLElement
      const note = document.querySelector('[data-testid="detail-note"]') as HTMLElement
      const heading = note.querySelector('h2') as HTMLElement
      const from = artifacts.getBoundingClientRect().top + 2
      const to = heading.getBoundingClientRect().top
      const found: number[] = []
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="detail-artifacts"], [data-testid="detail-artifacts"] *, [data-testid="detail-note"], [data-testid="detail-note"] *'))) {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        if (rect.width < 200) continue
        if (style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) > 0 && style.borderLeftStyle === 'none' && rect.top > from && rect.top < to) found.push(Math.round(rect.top))
        if (style.borderBottomStyle !== 'none' && parseFloat(style.borderBottomWidth) > 0 && style.borderLeftStyle === 'none' && rect.bottom > from && rect.bottom < to) found.push(Math.round(rect.bottom))
      }
      return { found, noteBorder: getComputedStyle(note).borderTopWidth }
    })
    expect(lines.found, `${width}: 결과물↔탐구 노트 사이 가로선`).toHaveLength(1)
    expect(lines.noteBorder).toBe('1px')
    await noOverflow(page, `상세 ${width}`)
    if (width === 1600) {
      await page.getByTestId('detail-note').scrollIntoViewIfNeeded()
      await page.screenshot({ path: 'test-results/a27n-detail-divider-1600.png' })
    }
  }
})

test('[N2] Backend 오류여도 Mock 으로 바꾸지 않는다: 관리자·학생 모두 오류 표시 · 시연 배지 없음', async ({ page }) => {
  await page.route('**/api/admin/assessment/schools**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR","message":"e2e"}' }))
  const adminCalls: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/admin/assessment/')) adminCalls.push(req.url())
  })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans`)
  await expect.poll(() => adminCalls.length).toBeGreaterThan(0)
  await page.waitForTimeout(1500)
  await expect(page.getByText('시연 데이터')).toHaveCount(0)
  await expect(page.getByText('가좌고등학교')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a27n-admin-backend-error-1600.png' })

  await page.route('**/api/student/assessment/academic-context**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR","message":"e2e"}' }))
  await page.goto(`${STUDENT}/assessment`)
  await expect(page.getByText(/불러오지 못했어요/).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('시연 데이터')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a27n-student-backend-error-1600.png' })
})
