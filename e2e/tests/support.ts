import { expect, type APIRequestContext, type Page } from '@playwright/test'

// Backend e2e Profile 전용 Endpoint (api-contract.md §65 E2E 전용).
export const API = process.env.E2E_API_URL ?? 'http://localhost:8080'

export const ANCHOR = '2026-09-30'

export async function resetBackend(request: APIRequestContext) {
  const response = await request.post(`${API}/api/test/reset`)
  expect(response.status()).toBe(204)
}

export async function setBackendDate(request: APIRequestContext, date: string) {
  const response = await request.put(`${API}/api/test/clock`, { data: { date } })
  expect(response.ok()).toBeTruthy()
}

export async function setStudyDataAvailable(request: APIRequestContext, available: boolean) {
  const response = await request.put(`${API}/api/test/integration`, { data: { studyDataAvailable: available } })
  expect(response.status()).toBe(204)
}

/** 왼쪽 특이사항 학생 목록. */
export function studentList(page: Page) {
  return page.getByRole('region', { name: /특이사항 학생/ })
}

/** 오른쪽 선택한 학생. */
export function panel(page: Page) {
  return page.locator('article.sc-detail')
}

export function row(page: Page, name: string) {
  return studentList(page).getByRole('button', { name: new RegExp(`^${name}`) })
}

// 학생 케어는 Admin Shell 안의 /student-care Route로 연결된다. (frontend/admin App.tsx, '/'는 Feedback Dashboard)
export const STUDENT_CARE_PATH = '/student-care'

export async function openPage(page: Page) {
  await page.goto(STUDENT_CARE_PATH)
  await expect(studentList(page).getByRole('button').first()).toBeVisible()
}

export async function selectStudent(page: Page, name: string) {
  await row(page, name).click()
  await expect(panel(page).getByRole('heading', { level: 2, name })).toBeVisible()
}

export function history(page: Page) {
  return page.getByRole('region', { name: '이력' })
}
