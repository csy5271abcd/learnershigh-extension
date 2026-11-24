import { expect, type Page } from '@playwright/test'

// A27-UX 관리자 검토 화면 공용 조작 (Stub·Railway 합성·실제 분석기 E2E가 함께 쓴다). 포트·계정 상수는 두지 않는다.

/** 학업 과목 Searchable Select에서 과목을 고른다. 화면에는 과목명만 보이고, 시험은 내부 ID(data-subject-id)로 고른다 */
export async function chooseSubject(page: Page, testId: string, subjectId: string) {
  const root = page.getByTestId(testId)
  await root.locator('input').click()
  await root.locator(`[data-subject-id="${subjectId}"]`).click()
}

/**
 * 최종 확정 4단계(원본 대조 → 과목 연결 → 검토 결과 확인 → 확정)를 거쳐 확정한다.
 * 확정에 성공하면 읽기 전용 결과 조회 화면으로 이동하므로, 그 화면을 확인한 뒤 검토 화면으로 돌아온다(이후 시험이 검토 화면을 계속 쓴다).
 */
export async function confirmThroughSteps(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByTestId('review-local-pdf').setInputFiles(file)
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-confirm-next').click()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-attest').check()
  await page.getByTestId('review-confirm').click()
  await expect(page.getByTestId('plan-result')).toBeVisible({ timeout: 15_000 })
  await page.goBack()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  // 검토 화면은 1단계부터 다시 열린다. 확정 요약(review-confirmed)은 최종 확정 단계에 있으므로 그 단계를 연다
  await page.getByTestId('review-step-confirm-tab').click()
}

/**
 * A27-UX 관리자 추가 수정 [02]: 운영계획 단계에는 과목 연결 Dropdown이 없다. 과목 연결은 2단계 과목 확인에서 하고
 * (서버 초안 저장까지 기다린 뒤) 운영계획 단계로 간다.
 */
export async function linkSubjectThenTeaching(page: Page, index: number, subjectId: string) {
  await page.getByTestId('review-step-subjects-tab').click()
  await chooseSubject(page, `review-subject-select-${index}`, subjectId)
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByTestId(`teaching-plan-subject-link-${index}`)).toContainText('학업 과목', { timeout: 15_000 })
}

/** A27-UX [06]: 분석 결과 조회의 단일 과목 선택에서 n번째(0부터) 과목을 고른다 */
export async function pickResultSubject(page: Page, position: number) {
  await page.getByTestId('result-subject-trigger').click()
  await page.getByTestId('archive-subject').nth(position).click()
  await expect(page.getByTestId('result-subject-count')).toContainText(`과목 ${position + 1}/`)
}
