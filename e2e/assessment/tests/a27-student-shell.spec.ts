import { expect, test, type Page } from '@playwright/test'
import { STUDENT } from '../support.ts'

// A27-UX 부록 E (2026-11-19) S1 메뉴 전체 접기는 2026-11-21 고정 너비 Shell 로 복원했다(부록 M 요청). 부록 L (2026-11-20 사용자 요청): 홈 바탕은 흰색(S2, 이전 연회색 대체). 일회용 DB · 실제 Backend.

// 지시서의 '성장기록'은 실제 화면 이름 '성장 기록'(paths.ts growthSection)으로 확인한다
const MENUS = ['홈', '학교 수행평가', '학교 평가 정보', '월별 운영계획', '심화 탐구', '선생님 피드백', '자료함', '참고자료', '성장 기록', '보관함', '수행평가 꿀팁']

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Assessment 메뉴' })
const sidebarWidth = (page: Page) => page.locator('#assessment-sidebar').evaluate((el) => el.getBoundingClientRect().width)
const mainWidth = (page: Page) => page.locator('#assessment-sidebar').evaluate((el) => (el.nextElementSibling as HTMLElement).getBoundingClientRect().width)

// 2026-11-21 복원(부록 M 요청): 데스크톱 전체 접기(부록 E S1)를 없앴다 — 기존 고정 너비 Shell. 좁은 화면 Drawer 는 그대로.
test('[S1·복원] 데스크톱은 고정 너비 Shell: 접기 버튼 없음 · 11개 메뉴 글자 표시 · 같은 너비(1366·1600·1920) · 가로 넘침 없음', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment`)
  await expect(nav(page).getByRole('link', { name: '홈' }).first()).toBeVisible()
  await expect(page.getByTestId('assessment-sidebar-toggle')).toHaveCount(0)
  for (const name of MENUS) {
    const link = nav(page).getByRole('link', { name, exact: false }).first()
    await expect(link, name).toBeVisible()
    const labelWidth = await link.locator('span').first().evaluate((el) => el.getBoundingClientRect().width)
    expect(labelWidth, `${name} 글자가 보인다`).toBeGreaterThan(10)
  }
  const width1600 = await sidebarWidth(page)
  expect(width1600).toBeGreaterThan(150)
  await page.screenshot({ path: 'test-results/a27-shell-fixed-1600.png' })
  for (const [w, h] of [[1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h })
    expect(await sidebarWidth(page), `고정 너비 ${w}`).toBe(width1600)
    await noOverflow(page, `고정 Shell ${w}`)
  }
  // 메뉴 이동해도 같은 Shell
  await nav(page).getByRole('link', { name: '학교 수행평가', exact: false }).first().click()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  expect(await sidebarWidth(page)).toBe(width1600)
})

test('[S1·복원] 예전에 저장된 접힘 기억이 있어도 펼친 고정 Shell 로 보인다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lh.assessment.student.sidebarCollapsed', '1'))
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment`)
  await expect(nav(page).getByText('학교 수행평가')).toBeVisible()
  expect(await sidebarWidth(page)).toBeGreaterThan(150)
  await expect(page.getByTestId('assessment-sidebar-toggle')).toHaveCount(0)
})

test('[S1] 800px: Drawer · Esc·바깥 클릭으로 닫고 메뉴 버튼으로 Focus 복귀 · 접힘 기억은 적용하지 않음', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lh.assessment.student.sidebarCollapsed', '1'))
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto(`${STUDENT}/assessment`)
  await expect(page.getByTestId('assessment-sidebar-toggle')).toHaveCount(0)
  const open = page.getByRole('button', { name: 'Assessment 메뉴' })
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  // 넓은 화면 접힘 기억과 무관하게 글자가 보인다
  await expect(nav(page).getByText('학교 수행평가')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#assessment-sidebar') !== null)).toBe(true)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.screenshot({ path: 'test-results/a27-shell-drawer-800.png' })
  await page.keyboard.press('Escape')
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await expect(open).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await open.click()
  await page.mouse.click(780, 400)
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await noOverflow(page, 'Drawer 800')
})

test('[S2·부록 L] 홈 바탕 흰색(화면 끝까지·4해상도) · 카드는 흰색 + 테두리 · 목록 화면 바탕은 그대로', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment`)
  const home = page.locator('main').filter({ has: page.getByTestId('home-kpis') })
  await expect(home).toBeVisible()
  const bg = await home.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg, '홈 바탕 흰색(부록 L)').toBe('rgb(255, 255, 255)')
  // 주요 영역(요약·바로가기·3개년·달력·다가오는 일정·피드백·최근 기록·메모)은 흰 카드 그대로
  const surfaceOf = (testId: string) =>
    page.getByTestId(testId).first().evaluate((el) => {
      let node: HTMLElement | null = el as HTMLElement
      while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement
      return node ? getComputedStyle(node).backgroundColor : null
    })
  for (const id of ['home-kpis', 'home-official-plans', 'home-calendar', 'home-upcoming', 'home-recent', 'home-memo']) {
    expect(await surfaceOf(id), `${id} 흰 카드`).toBe('rgb(255, 255, 255)')
  }
  // 흰 바탕에서도 카드 윤곽: 홈 카드 8종 모두 1px 이상 테두리(투명 아님)
  const outline = (el: Element) => {
    let node: HTMLElement | null = el as HTMLElement
    while (node && !(parseFloat(getComputedStyle(node).borderTopWidth) > 0 && getComputedStyle(node).borderTopColor !== 'rgba(0, 0, 0, 0)')) node = node.parentElement
    return node ? `${getComputedStyle(node).borderTopWidth} ${getComputedStyle(node).borderTopColor}` : null
  }
  for (const id of ['home-kpis', 'home-official-plans', 'home-calendar', 'home-upcoming', 'home-recent', 'home-memo']) {
    expect(await page.getByTestId(id).first().evaluate(outline), `${id} 테두리`).toMatch(/^1px rgb\(/)
  }
  expect(await page.locator('section[aria-labelledby="home-quick"]').evaluate(outline), '바로가기 테두리').toMatch(/^1px rgb\(/)
  const quick = await page.locator('section[aria-labelledby="home-quick"]').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(quick, '바로가기 흰 카드').toBe('rgb(255, 255, 255)')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const bottom = await home.evaluate((el) => el.getBoundingClientRect().bottom - window.innerHeight)
  expect(bottom, '흰 바탕이 화면 아래까지 이어진다(회색 띠 없음)').toBeGreaterThanOrEqual(-1)
  // 바탕 바로 위 부모들도 회색이 아니다(덮이지 않은 회색 캔버스 없음)
  const parents = await home.evaluate((el) => {
    const out: string[] = []
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) out.push(getComputedStyle(node).backgroundColor)
    return out
  })
  expect(parents.filter((c) => c === 'rgb(243, 244, 247)'), '부모 회색 없음').toEqual([])
  await page.screenshot({ path: 'test-results/a27l-home-white-1600.png', fullPage: true })
  for (const [w, h] of [[1920, 1080], [1366, 768], [800, 600]] as const) {
    await page.setViewportSize({ width: w, height: h })
    expect(await home.evaluate((el) => getComputedStyle(el).backgroundColor), `홈 흰색 ${w}`).toBe('rgb(255, 255, 255)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `가로 넘침 ${w}`).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/a27l-home-white-${w}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1600, height: 900 })
  // 2026-11-21: 데스크톱 접기 버튼이 없다(고정 Shell 복원) — 홈 흰색은 그대로
  await expect(page.getByTestId('assessment-sidebar-toggle')).toHaveCount(0)
  // 다른 학생 화면은 바꾸지 않는다
  await nav(page).getByRole('link', { name: '학교 수행평가', exact: false }).first().click()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  const listBg = await page.locator('#assessment-sidebar').evaluate((el) => {
    const main = el.nextElementSibling as HTMLElement
    const first = main.querySelector('main, div') as HTMLElement
    return getComputedStyle(first).backgroundColor
  })
  expect(listBg).not.toBe('rgb(243, 244, 247)')
})
