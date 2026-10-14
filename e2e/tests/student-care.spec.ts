import { expect, test } from '@playwright/test'
import {
  API,
  history,
  openPage,
  panel,
  resetBackend,
  row,
  selectStudent,
  setBackendDate,
  setStudyDataAvailable,
  studentList,
} from './support.ts'

// 학생 케어 E2E (docs/specs/wangyu/features/student-care.md §7, docs/design/student-care-ux.md).
// 기준일 2026-09-30, Mock Existing 시나리오 기준.

test.beforeEach(async ({ request }) => {
  await resetBackend(request)
})

test('특이사항 학생과 기록 부족을 기준일과 함께 보여준다', async ({ page }) => {
  await openPage(page)

  await expect(page.getByText('기준일 9월 30일')).toBeVisible()
  await expect(studentList(page).getByRole('button')).toHaveCount(7)
  const first = studentList(page).getByRole('button').first()
  await expect(first).toContainText('김서준')
  await expect(first).toContainText('연속 결석')
  await expect(first).toContainText('계획 미제출')
  await expect(first).toContainText('4일째 결석')
  await expect(studentList(page)).toContainText('기록 부족 · 장하준')
  await expect(page.getByText('학생을 선택하세요')).toBeVisible()

  await selectStudent(page, '윤서연')
  await expect(panel(page)).toContainText('수학 계획 미달성')
  await expect(panel(page)).toContainText('수학 계획 30% → 실제 12%')
  await expect(panel(page).getByRole('img', { name: /최근 7일/ })).toBeVisible()
  await expect(history(page)).toContainText('기록 없음')
})

test('상담 기록 → 계속 관리 → 점검일에 점검 → 관리 종료, 이력에 남는다', async ({ page, request }) => {
  await openPage(page)
  await selectStudent(page, '윤서연')
  const detail = panel(page)

  // 빠진 항목은 저장하지 않고 그 칸을 알려준다.
  await detail.getByRole('button', { name: '저장' }).click()
  await expect(detail.getByText('방식을 고르세요')).toBeVisible()
  await expect(detail.getByRole('radio', { name: '면담' })).toBeFocused()

  await detail.getByRole('radio', { name: '통화' }).check()
  await detail.getByLabel('내용').fill('시험 범위가 넓어 수학을 미루고 있다고 함. 30분씩 나눠 하기로')
  await detail.getByRole('radio', { name: '계속 관리' }).check()
  await expect(detail.getByRole('radio', { name: /1주/ })).toBeChecked()
  await detail.getByRole('button', { name: '저장' }).click()

  await expect(page.getByRole('status')).toHaveText('윤서연 · 계속 관리 · 다음 점검 10/7')
  await expect(row(page, '윤서연')).toContainText('다음 점검 10월 7일')
  await expect(studentList(page).getByRole('button').last()).toContainText('윤서연')
  await expect(history(page)).toContainText('상담 · 통화 — 시험 범위가 넓어 수학을 미루고 있다고 함')
  await expect(history(page)).toContainText('계속 관리 · 다음 점검 10월 7일')

  // 관리 중에는 결과 없이 상담 기록만 남긴다. 점검 버튼은 점검일 전에는 없다.
  await expect(detail.getByRole('radio', { name: '계속 관리' })).toHaveCount(0)
  await expect(detail.getByRole('button', { name: '관리 종료' })).toHaveCount(0)
  await detail.getByRole('radio', { name: '면담' }).check()
  await detail.getByLabel('내용').fill('수학 30분씩 3번 함')
  await detail.getByRole('button', { name: '저장' }).click()
  await expect(history(page).getByRole('listitem').first()).toContainText('상담 · 면담 — 수학 30분씩 3번 함')

  // 다음 점검일: 점검일이 된 학생이 맨 위에 표시된다.
  await setBackendDate(request, '2026-10-07')
  await page.reload()
  await expect(page.getByText('기준일 10월 7일')).toBeVisible()
  const due = studentList(page).getByRole('button').first()
  await expect(due).toContainText('윤서연')
  await expect(due).toContainText('점검일')
  await due.click()

  const check = detail.getByRole('region', { name: /점검/ })
  await expect(check.getByRole('row', { name: /수학 계획 미달성/ })).toContainText('12%')
  await expect(check.getByRole('row', { name: /수학 계획 미달성/ })).toContainText('24%')
  await expect(check.getByRole('row', { name: /수학 계획 미달성/ })).toContainText('좋아짐')

  await check.getByRole('button', { name: '계속 관리', exact: true }).click()
  await check.getByRole('radio', { name: /1주/ }).check()
  await check.getByRole('button', { name: '계속 관리 저장' }).click()
  await expect(page.getByRole('status')).toHaveText('윤서연 · 계속 관리 · 다음 점검 10/14')
  await expect(row(page, '윤서연')).toContainText('다음 점검 10월 14일')
  await expect(history(page)).toContainText('점검 · 좋아짐 — 수학 비중 12% → 24%')

  await setBackendDate(request, '2026-10-14')
  await page.reload()
  await selectStudent(page, '윤서연')
  await detail.getByRole('button', { name: '관리 종료' }).click()
  await expect(page.getByRole('status')).toHaveText('윤서연 · 관리 종료')
  await expect(row(page, '윤서연')).toHaveCount(0)
  await expect(history(page).getByRole('listitem').first()).toHaveText(/관리 종료/)
  await expect(history(page).getByRole('listitem')).toHaveCount(7)
})

test('문제없음은 바로 관리 종료되고 쉬는 기간에는 목록에 다시 오르지 않는다', async ({ page, request }) => {
  await openPage(page)
  await selectStudent(page, '김서준')
  const detail = panel(page)

  await detail.getByRole('radio', { name: '문자' }).check()
  await detail.getByLabel('내용').fill('가족 여행')
  await detail.getByRole('radio', { name: '문제없음' }).check()
  await expect(detail.getByRole('group', { name: '다음 점검일' })).toHaveCount(0)
  await detail.getByRole('button', { name: '저장' }).click()

  await expect(page.getByRole('status')).toHaveText('김서준 · 문제없음 · 관리 종료')
  await expect(row(page, '김서준')).toHaveCount(0)
  await expect(detail.getByRole('heading', { name: '상담 기록' })).toHaveCount(0)
  await expect(history(page)).toContainText('상담 · 문자 — 가족 여행')
  await expect(history(page)).toContainText('문제없음 · 관리 종료')

  await setBackendDate(request, '2026-10-02')
  await page.reload()
  await expect(row(page, '최학생')).toBeVisible()
  await expect(row(page, '김서준')).toHaveCount(0)
})

test('특이사항 기준을 바꾸면 목록에 반영되고 범위 밖 값은 저장하지 않는다', async ({ page }) => {
  await openPage(page)
  await page.getByRole('button', { name: '특이사항 기준' }).click()
  const dialog = page.getByRole('dialog', { name: '특이사항 기준' })
  const absence = dialog.getByLabel('연속 결석')
  await expect(absence).toHaveValue('3')

  await absence.fill('15')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(absence).toHaveAttribute('aria-invalid', 'true')
  await expect(absence).toBeFocused()
  await expect(row(page, '김서준')).toContainText('연속 결석')

  await absence.fill('5')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('status')).toHaveText('특이사항 기준 저장')
  await expect(row(page, '김서준')).not.toContainText('연속 결석')
  await expect(row(page, '김서준')).toContainText('계획 미제출')
  await expect(page.getByRole('button', { name: '특이사항 기준' })).toBeFocused()
})

test('기존 학습 기록 연동 실패는 빈 목록이 아니라 오류로 보여준다', async ({ page, request }) => {
  await setStudyDataAvailable(request, false)
  try {
    await page.goto('/')
    const list = studentList(page)
    await expect(list.getByRole('alert')).toContainText('불러오지 못했습니다')
    await expect(list).not.toContainText('특이사항 없음')
    await expect(list.getByRole('button', { name: /^김서준/ })).toHaveCount(0)

    await setStudyDataAvailable(request, true)
    await list.getByRole('button', { name: '다시 시도' }).click()
    await expect(row(page, '김서준')).toBeVisible()
  } finally {
    await setStudyDataAvailable(request, true)
  }
})

test('지점을 바꾸면 그 지점 학생만 보이고 선택이 풀린다', async ({ page }) => {
  await openPage(page)
  await selectStudent(page, '윤서연')

  await page.getByLabel('지점').selectOption({ label: '러너스하이 분당점' })
  await expect(row(page, '서지우')).toBeVisible()
  await expect(row(page, '윤서연')).toHaveCount(0)
  await expect(page.getByText('학생을 선택하세요')).toBeVisible()
  await expect(studentList(page)).not.toContainText('기록 부족')
})

test('저장을 연달아 눌러도 관리는 하나만 생긴다', async ({ page, request }) => {
  await openPage(page)
  await selectStudent(page, '최학생')
  const detail = panel(page)
  await detail.getByRole('radio', { name: '면담' }).check()
  await detail.getByRole('radio', { name: '계속 관리' }).check()
  await detail.getByRole('button', { name: '저장' }).dblclick()

  await expect(page.getByRole('status')).toHaveText('최학생 · 계속 관리 · 다음 점검 10/7')
  await expect(detail.getByRole('alert')).toHaveCount(0)
  const response = await request.get(`${API}/api/admin/student-care/students/stu_002/history?branchId=br_gangnam`)
  const body = (await response.json()) as { items: { type: string }[] }
  expect(body.items.map((item) => item.type)).toEqual(['ADJUSTMENT_STARTED', 'REASON_CONFIRMED'])
})
