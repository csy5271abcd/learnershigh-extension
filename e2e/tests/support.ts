import { expect, type APIRequestContext, type Page } from '@playwright/test'

// Backend e2e Profile 전용 Endpoint (api-contract.md §65-11).
const API = process.env.E2E_API_URL ?? 'http://localhost:8080'

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

export function needsCheckList(page: Page) {
  return page.getByRole('region', { name: /확인할 변화/ })
}

export function inAdjustmentList(page: Page) {
  return page.getByRole('region', { name: /조정 진행 중/ })
}

export function detail(page: Page) {
  return page.locator('article.sc-detail')
}

export async function openBoard(page: Page) {
  await page.goto('/student-care')
  await expect(page.getByRole('heading', { name: /기준 · 러너스하이 강남점/ })).toBeVisible()
}

export async function selectStudent(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(detail(page).getByRole('heading', { level: 2, name: new RegExp(name) })).toBeVisible()
}
