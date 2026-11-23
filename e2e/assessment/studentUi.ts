import { expect, type Locator } from '@playwright/test'

/**
 * A27-UX 학생(2026-11-19): 수행평가 추가 Modal의 과목은 검색형 Dropdown이다(과목 칩 목록 없음).
 * 이름을 입력하고 같은 이름 후보를 누른다. kind: 'enrolled' = 내 수강 과목, 'candidate' = 학년 과목 후보, 'typed' = 직접 입력.
 */
export async function pickStudentSubject(dialog: Locator, name: string, kind: 'enrolled' | 'candidate' | 'typed' = 'enrolled') {
  const input = dialog.getByTestId('subject-picker-input')
  await input.click()
  await input.fill(name)
  const option = dialog.getByTestId(`subject-option-${kind}`).filter({ hasText: name }).first()
  await expect(option).toBeVisible()
  await option.click()
  await expect(input).toHaveValue(name)
}
