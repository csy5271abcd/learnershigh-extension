import { expect, test, type Locator, type Page } from '@playwright/test'
import { ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A28-32·33·34 학생 홈 달력: 유형 배지 pill · 'n월'·'n월 m주' 개인 임시 배치(범위 안 이동·저장·새로고침 유지·실패 되돌림·초기화) ·
// 학기 주소 유지(?term=). 일회용 DB · Stub 분석기(contract03 합성 0.3: T03 = 10월 2주, T05 = 11월) · 합성 문서만.
// 다른 시험의 문서도 같은 학기에 보이므로, 이 문서의 행은 저장 키(planId|subjectId|rowKey)로 찾는다.
const PATH = `${API}/api/student/assessment/calendar-placements`
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
/** 화면은 Vite 개발 서버 origin 을 거쳐 호출한다 — 경로로 맞춘다 */
const UI_PATH = /\/api\/student\/assessment\/calendar-placements(\?|$)/

async function goMonth(calendar: Locator, month: number) {
  for (let guard = 0; guard < 8; guard++) {
    const heading = (await calendar.getByRole('heading').first().textContent()) ?? ''
    const current = Number(heading.match(/(\d+)월/)?.[1])
    if (current === month) return
    const order = [8, 9, 10, 11, 12, 1]
    await calendar.getByRole('button', { name: order.indexOf(current) > order.indexOf(month) ? '이전 달' : '다음 달' }).click()
  }
  throw new Error(`${month}월로 가지 못함`)
}

const cellOf = (page: Page, key: string) => page.getByTestId('home-calendar').locator(`[data-tentative-keys~="${key}"]`)

test('[A28-32·33·34] 임시 배치: 범위 안 이동 → 저장 → 새로고침 유지 · 끌어 옮기기 · 범위 밖 거절 · 실패 되돌림 · 초기화 · pill · 학기 주소', async ({ page, request }) => {
  test.setTimeout(180_000)
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a2833-contract03-${tag}.pdf`, uniquePdf(`${tag}-a2833`))
  const rowKeys = ['T01', 'T02', 'T03', 'T05', 'T06', 'T09']
  const teaching = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    data: { analysisId: doc.analysisId, rows: rowKeys.map((rowKey) => ({ subjectIndex: 0, rowKey, subjectId: 'subj_02', decision: 'CONFIRMED' })) },
  })
  expect(teaching.status(), await teaching.text()).toBe(200)
  expect((await request.delete(PATH, { headers: student, params: { academicYear: '2026', semester: '2' } })).status()).toBe(204)
  const key = `${doc.planId}|subj_02|T05`

  // A28-34: 학기를 주소에 남긴다
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment?term=2026-2`)
  const calendar = page.getByTestId('home-calendar')
  await expect(calendar).toBeVisible({ timeout: 20_000 })
  await goMonth(calendar, 11)
  await expect(cellOf(page, key)).toHaveCount(1, { timeout: 15_000 })
  const before = (await cellOf(page, key).getAttribute('data-date')) as string
  expect(before).toMatch(/^2026-11-/)

  // 상세: 원문 시기 · 날짜 미정(A28-36: '임시 배치'·점선 없음), 유형 배지는 작은 pill(A28-32)
  await expect(calendar).not.toContainText('임시')
  await expect(calendar.locator(`[data-testid="home-calendar-tentative"]`).first()).toHaveCSS('outline-style', 'none')
  await cellOf(page, key).click()
  const item = page.getByTestId('home-calendar-day-detail').locator(`li[data-source-key="${key}"]`)
  await expect(item).toContainText('원문: 11월 · 날짜 미정')
  await expect(item).not.toContainText('임시')
  const badge = item.locator('[data-tone="plan"]').first()
  const box = await badge.boundingBox()
  expect(box?.width ?? 999, '유형 배지는 글자 폭 pill').toBeLessThan(60)
  expect(await badge.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('4px')
  await page.screenshot({ path: 'test-results/a28-33-detail-pill.png' })

  // 키보드·터치 대안: 범위 안 날짜 선택 → 낙관적 반영 + 서버 저장
  const select = item.getByTestId('home-calendar-placement-select')
  // A28-50: 관리자 화면 dropdown(review.select)과 같은 모양 — 높이 40 · 둥근 10 · 연한 테두리
  const look = await select.evaluate((el) => { const c = getComputedStyle(el); return { radius: c.borderTopLeftRadius, height: c.height, border: c.borderTopColor, size: c.fontSize } })
  expect(look).toEqual({ radius: '10px', height: '40px', border: 'rgb(234, 235, 239)', size: '14px' })
  const options = await select.locator('option').evaluateAll((list) => list.map((option) => (option as HTMLOptionElement).value))
  expect(options.every((iso) => iso.startsWith('2026-11-'))).toBe(true)
  const target = options.find((iso) => iso !== before) as string
  const saved = page.waitForResponse((r) => UI_PATH.test(r.url()) && r.request().method() === 'PUT')
  await select.selectOption(target)
  expect((await saved).status()).toBe(200)
  await page.keyboard.press('Escape')
  await expect(cellOf(page, key)).toHaveAttribute('data-date', target)

  // 새로고침·직접 링크: 학기 주소 유지 + 배치 유지(서버 값)
  await page.reload()
  expect(new URL(page.url()).searchParams.get('term')).toBe('2026-2')
  await expect(calendar).toBeVisible({ timeout: 20_000 })
  await goMonth(calendar, 11)
  await expect(cellOf(page, key)).toHaveAttribute('data-date', target, { timeout: 15_000 })
  const server = await (await request.get(PATH, { headers: student, params: { academicYear: '2026', semester: '2' } })).json()
  expect(server.items.find((row: { sourceKey: string }) => row.sourceKey === key)?.displayDate).toBe(target)
  // 다른 학생에게는 없다 · 공식 운영계획(학생 조회)은 그대로(월 단위)
  const other = await (await request.get(PATH, { headers: { 'X-Assessment-Student-Id': 'stu_002' }, params: { academicYear: '2026', semester: '2' } })).json()
  expect(other.items.some((row: { sourceKey: string }) => row.sourceKey === key)).toBe(false)
  const official = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: student })).json()
  expect(JSON.stringify(official)).not.toContain(target)

  // 저장 실패 → 되돌림 + 알림
  await page.route(UI_PATH, (route) => (route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{"code":"INTERNAL_ERROR","message":"x","details":{}}' }) : route.continue()))
  await cellOf(page, key).click()
  const failing = page.getByTestId('home-calendar-day-detail').locator(`li[data-source-key="${key}"]`).getByTestId('home-calendar-placement-select')
  const third = options.find((iso) => iso !== before && iso !== target) as string
  await failing.selectOption(third)
  await expect(page.getByTestId('home-calendar-placement-error')).toContainText('되돌렸어요', { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(cellOf(page, key)).toHaveAttribute('data-date', target)
  await page.unroute(UI_PATH)

  // 끌어 옮기기: 10월 2주 행(T03) — 범위(달력 2번째 줄) 안은 옮겨지고, 범위 밖에 놓으면 그대로
  await goMonth(calendar, 10)
  const weekKey = `${doc.planId}|subj_02|T03`
  await expect(cellOf(page, weekKey)).toHaveCount(1, { timeout: 15_000 })
  const weekFrom = (await cellOf(page, weekKey).getAttribute('data-date')) as string
  const chip = calendar.locator(`[data-testid="home-calendar-tentative"][data-source-key="${weekKey}"]`)
  if (await chip.count()) {
    const outside = calendar.locator('[data-date="2026-10-28"]')
    await chip.dragTo(outside)
    await expect(cellOf(page, weekKey)).toHaveAttribute('data-date', weekFrom)
    const inside = weekFrom === '2026-10-09' ? '2026-10-08' : '2026-10-09'
    const dragged = page.waitForResponse((r) => UI_PATH.test(r.url()) && r.request().method() === 'PUT')
    await chip.dragTo(calendar.locator(`[data-date="${inside}"]`))
    expect((await dragged).status()).toBe(200)
    await expect(cellOf(page, weekKey)).toHaveAttribute('data-date', inside)
  } else {
    test.info().annotations.push({ type: 'note', description: '10월 2주 칸에 다른 문서 일정이 많아 끌기 대상이 3개 밖 — 끌기 확인 생략(키보드 대안은 위에서 확인)' })
  }
  await page.screenshot({ path: 'test-results/a28-33-calendar-october.png' })

  // 배치 초기화 → 서버 0건 · 기본 날짜로
  const reset = page.waitForResponse((r) => UI_PATH.test(r.url()) && r.request().method() === 'DELETE')
  await page.getByTestId('home-calendar-placement-reset').click()
  expect((await reset).status()).toBe(204)
  await goMonth(calendar, 11)
  await expect(cellOf(page, key)).toHaveAttribute('data-date', before)
  expect((await (await request.get(PATH, { headers: student, params: { academicYear: '2026', semester: '2' } })).json()).items).toHaveLength(0)

  // 학적 없는 학기 주소는 쓰지 않는다(현재 학기 + 알림)
  await page.goto(`${STUDENT}/assessment?term=2099-1`)
  await expect(page.getByTestId('term-param-rejected')).toBeVisible({ timeout: 20_000 })
})
