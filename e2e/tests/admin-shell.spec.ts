import { expect, test } from '@playwright/test'
import { resetBackend } from './support.ts'

// 관리자 Extension Shell (2026-11-16, A22): 기본 화면 = 학생 케어, 실제 기능 메뉴 3개, 제거한 구형 화면 주소는 '페이지 없음'.
test.beforeEach(async ({ page, request }) => {
  await resetBackend(request)
  await page.route('https://**', (route) => route.abort())
})

test('기본 주소(/)는 학생 케어로 열리고 주소도 /student-care로 바뀐다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page).toHaveURL(/\/student-care$/)
  await expect(page.getByRole('heading', { level: 1, name: '학생 케어' }).first()).toBeVisible()
  const menu = page.getByRole('navigation', { name: 'Admin 메뉴' })
  await expect(menu.getByRole('button', { name: '학생 케어', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-care-theme]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('메뉴는 학생 케어 · 학부모 리포트(학생 케어 소속) · Assessment 관리 셋뿐이고, 전환해도 오류가 없다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/student-care')
  const menu = page.getByRole('navigation', { name: 'Admin 메뉴' })
  await expect(menu.getByRole('button')).toHaveText(['학생 케어', /^학부모 리포트\s*학생 케어$/, /^Assessment 관리\s*NEW$/])
  for (const text of ['Today Board', 'Feedback Dashboard', 'Connection 검토', 'Interview 관리', 'Operations', 'Mentor', '학원관리', '문자관리', '콘솔 이용 매뉴얼', '문자잔고']) {
    await expect(page.getByText(text, { exact: false })).toHaveCount(0)
  }
  await menu.getByRole('button', { name: /Assessment 관리/ }).click()
  await expect(page).toHaveURL(/\/assessment$/)
  await expect(page.locator('#admin-main')).toHaveAttribute('data-surface', 'canvas')
  await expect(page.locator('[data-care-theme]')).toHaveCount(0)
  await menu.getByRole('button', { name: /학부모 리포트/ }).click()
  await expect(page).toHaveURL(/\/parent-report$/)
  await menu.getByRole('button', { name: '학생 케어', exact: true }).click()
  await expect(page).toHaveURL(/\/student-care$/)
  await expect(page.locator('[data-care-theme]')).toHaveCount(1)
  expect(errors).toEqual([])
})

for (const path of ['/feedback', '/feedback/fb_1', '/today', '/students/stu_001', '/tasks/t1', '/activities/a1', '/connections', '/interview', '/operations', '/mentor-content', '/mentors/m1']) {
  test(`제거한 구형 화면 주소 ${path}는 '페이지 없음'이고 학생 케어로 돌아갈 수 있다`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: '페이지 없음' })).toBeVisible()
    await page.getByRole('button', { name: '학생 케어로 가기' }).click()
    await expect(page).toHaveURL(/\/student-care$/)
  })
}
