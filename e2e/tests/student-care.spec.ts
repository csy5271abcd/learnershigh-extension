import { expect, test } from '@playwright/test'
import {
  detail,
  inAdjustmentList,
  needsCheckList,
  openBoard,
  resetBackend,
  selectStudent,
  setBackendDate,
  setStudyDataAvailable,
} from './support.ts'

// 학생 케어 E2E (docs/specs/wangyu/features/student-care.md §9).
// 기준일 2026-09-30, Mock Existing 시나리오(MockStudyScenarios) 기준.

test.beforeEach(async ({ request }) => {
  await resetBackend(request)
})

test('케어 보드는 달라진 학생과 판단 보류를 기준일과 함께 보여준다', async ({ page }) => {
  await openBoard(page)

  await expect(page.getByRole('heading', { name: '9월 30일 기준 · 러너스하이 강남점' })).toBeVisible()
  await expect(page.getByRole('list', { name: '판단 보류' })).toContainText('장하준 최근 7일 유효 학습일 2일')

  const needsCheck = needsCheckList(page)
  await expect(needsCheck.getByRole('button')).toHaveCount(7)
  const first = needsCheck.getByRole('button').first()
  await expect(first).toContainText('김서준')
  await expect(first).toContainText('연속 미입실')
  await expect(first).toContainText('계획 미제출 반복')
  await expect(first).toContainText('4일째 입실 기록 없음')
  await expect(inAdjustmentList(page)).toContainText('진행 중인 조정이 없습니다')
})

test('신호 → 사유 확인 → 약속 → 재점검 → 종결, 과정이 학생 기록에 남는다', async ({ page, request }) => {
  await openBoard(page)
  await selectStudent(page, '윤서연')

  const panel = detail(page)
  await expect(panel).toContainText('계획한 수학 비중 30% → 최근 12% (전체 학습량은 평소 수준)')
  await expect(panel.getByRole('img', { name: /최근 7일 학습/ })).toBeVisible()
  await expect(panel).toContainText('의도한 시험 대비인지, 수학 항목이 너무 커서 미루고 있는지')

  await panel.getByRole('button', { name: /조정 필요/ }).click()
  await expect(panel.getByRole('button', { name: /조정 필요/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByLabel('목표 한 가지')).toHaveValue('수학 비중을 계획한 30% 가까이')
  await expect(panel.getByLabel('행동')).toHaveValue('큰 수학 항목을 30분씩 4회로 나누기')
  await expect(panel.getByLabel('부담 한도')).toHaveValue('주 2시간 추가까지')
  await expect(panel.getByLabel('재점검일')).toHaveValue('7')

  const start = panel.getByRole('button', { name: '조정 시작' })
  await expect(start).toBeDisabled()
  await expect(panel).toContainText('학생과 합의한 뒤 시작할 수 있습니다')

  await panel.getByLabel('사유 메모 (선택)').fill('시험 범위가 넓어 수학을 미루고 있다고 함')
  await panel.getByLabel('학생과 합의함').check()
  await start.click()

  await expect(page.getByRole('status').filter({ hasText: '윤서연: 조정을 시작했습니다' })).toBeVisible()
  await expect(needsCheckList(page).getByRole('button')).toHaveCount(6)
  await expect(inAdjustmentList(page).getByRole('button', { name: /^윤서연/ })).toContainText('재점검 10월 7일')
  await expect(panel).toContainText('조정 진행 중')
  await expect(panel).toContainText('조정 시작 — 큰 수학 항목을 30분씩 4회로 나누기 (재점검 10월 7일)')
  await expect(panel).toContainText('재점검일(10월 7일)에 같은 기준으로 다시 비교합니다')
  await expect(panel.getByRole('button', { name: '종결', exact: true })).toHaveCount(0)

  await panel.getByLabel('구분').selectOption('CALL')
  await panel.getByLabel('메모', { exact: true }).fill('어머니와 통화. 시험 끝나면 수학 시간을 늘리기로 함')
  await panel.getByRole('button', { name: '메모 남기기' }).click()
  await expect(panel.getByRole('list', { name: '이 건의 기록' })).toContainText('어머니와 통화')

  // 재점검일이 되면 같은 기준으로 다시 비교한다.
  await setBackendDate(request, '2026-10-07')
  await page.reload()
  await expect(page.getByRole('heading', { name: '10월 7일 기준 · 러너스하이 강남점' })).toBeVisible()
  const due = inAdjustmentList(page).getByRole('button', { name: /^윤서연/ })
  await expect(due).toContainText('재점검')
  await due.click()

  const recheck = detail(page).getByRole('region', { name: '재점검 · 같은 기준으로 다시 비교' })
  await expect(recheck).toContainText('과목 배분 차이')
  await expect(recheck).toContainText('12% → 24%')
  await expect(recheck).toContainText('기준 30%')
  await expect(recheck).toContainText('변화 관찰')
  await expect(recheck).toContainText('판정이 아니라 비교 결과입니다')

  await recheck.getByRole('button', { name: '종결', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '윤서연: 종결했습니다' })).toBeVisible()
  await expect(inAdjustmentList(page)).toContainText('진행 중인 조정이 없습니다')

  await detail(page).getByRole('button', { name: '학생 기록 보기' }).click()
  const timeline = page.getByRole('list', { name: '케어 기록' })
  await expect(page.getByRole('heading', { name: /윤서연/ })).toBeVisible()
  await expect(timeline.getByRole('listitem')).toHaveCount(5)
  await expect(timeline.getByRole('listitem').first()).toContainText('재점검 후 선생님이 종결')
  await expect(timeline).toContainText('재점검 — 변화 관찰: 수학 비중 12% → 24%')
  await expect(timeline).toContainText('어머니와 통화')
  await expect(timeline.getByRole('listitem').last()).toContainText(
    '사유 확인: 조정 필요 — 시험 범위가 넓어 수학을 미루고 있다고 함',
  )
})

test('예상된 변화는 기록만 남기고 종결하며 쉬는 기간 동안 다시 올리지 않는다', async ({ page }) => {
  await openBoard(page)
  await selectStudent(page, '김서준')

  const panel = detail(page)
  await expect(panel).toContainText('마지막 입실 9월 26일')
  await panel.getByRole('button', { name: /예상된 변화/ }).click()
  await panel.getByLabel('사유 메모 (선택)').fill('가족 여행으로 결석, 다음 주 복귀')
  await panel.getByRole('button', { name: '기록하고 종결' }).click()

  await expect(page.getByRole('status').filter({ hasText: '김서준: 종결했습니다' })).toBeVisible()
  await expect(needsCheckList(page).getByRole('button', { name: /^김서준/ })).toHaveCount(0)
  await expect(panel).toContainText('지금 올라온 신호가 없습니다')

  await page.getByRole('tab', { name: '학생 기록' }).click()
  const timeline = page.getByRole('list', { name: '케어 기록' })
  await expect(timeline.getByRole('listitem').first()).toContainText('기록만 남기고 종결')
  await expect(timeline).toContainText('사유 확인: 예상된 변화 — 가족 여행으로 결석, 다음 주 복귀')
})

test('변화가 없으면 같은 약속으로 계속하거나 약속을 고친다', async ({ page, request }) => {
  await openBoard(page)
  await selectStudent(page, '오시윤')
  const panel = detail(page)
  await panel.getByRole('button', { name: /조정 필요/ }).click()
  await panel.getByLabel('학생과 합의함').check()
  await panel.getByRole('button', { name: '조정 시작' }).click()
  await expect(inAdjustmentList(page).getByRole('button', { name: /^오시윤/ })).toBeVisible()

  await setBackendDate(request, '2026-10-07')
  await page.reload()
  await inAdjustmentList(page).getByRole('button', { name: /^오시윤/ }).click()
  const recheck = detail(page).getByRole('region', { name: '재점검 · 같은 기준으로 다시 비교' })
  await expect(recheck).toContainText('변화 없음')

  await recheck.getByRole('button', { name: '같은 약속으로 계속' }).click()
  await recheck.getByLabel('다음 재점검일').selectOption('7')
  await recheck.getByRole('button', { name: '계속하기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '오시윤: 결정을 저장했습니다' })).toBeVisible()
  await expect(detail(page)).toContainText('같은 약속으로 계속 (다음 재점검 10월 14일)')
  await expect(detail(page)).toContainText('재점검일(10월 14일)에 같은 기준으로 다시 비교합니다')

  await setBackendDate(request, '2026-10-14')
  await page.reload()
  await inAdjustmentList(page).getByRole('button', { name: /^오시윤/ }).click()
  const second = detail(page).getByRole('region', { name: '재점검 · 같은 기준으로 다시 비교' })
  await second.getByRole('button', { name: '약속 수정' }).click()
  await second.getByLabel('목표 한 가지').fill('주간 학습량 15시간 이상')
  await second.getByLabel('행동').fill('주말 오전 2시간을 고정 학습 시간으로 잡기')
  await second.getByLabel('학생과 합의함').check()
  await second.getByRole('button', { name: '새 약속으로 시작' }).click()

  await expect(detail(page).getByRole('region', { name: '조정 약속' })).toContainText('주간 학습량 15시간 이상')
  await expect(detail(page)).toContainText('약속 수정 — 주말 오전 2시간을 고정 학습 시간으로 잡기 (재점검 10월 21일)')
})

test('기준값을 바꾸면 보드에 바로 반영되고, 범위를 벗어나면 저장하지 않는다', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('tab', { name: '기준값' }).click()

  const absence = page.getByLabel('연속 미입실')
  await expect(absence).toHaveValue('3')
  await absence.fill('1')
  await page.getByRole('button', { name: '기준값 저장' }).click()
  await expect(page.getByRole('alert')).toContainText('기준값 범위를 확인해주세요')
  await expect(absence).toHaveAttribute('aria-invalid', 'true')

  await absence.fill('5')
  await page.getByRole('button', { name: '기준값 저장' }).click()
  await expect(page.getByRole('status').filter({ hasText: '저장했습니다' })).toBeVisible()

  await page.getByRole('tab', { name: '케어 보드' }).click()
  const kim = needsCheckList(page).getByRole('button', { name: /^김서준/ })
  await expect(kim).toBeVisible()
  await expect(kim).not.toContainText('연속 미입실')
})

test('기존 학습 기록 연동이 실패하면 빈 보드가 아니라 오류와 다시 시도를 보여준다', async ({ page, request }) => {
  await setStudyDataAvailable(request, false)
  await page.goto('/student-care')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('학습 기록을 불러오지 못했습니다')
  await expect(page.getByText('평소와 달라진 학생이 없습니다')).toHaveCount(0)

  await setStudyDataAvailable(request, true)
  await alert.getByRole('button', { name: '다시 시도' }).click()
  await expect(needsCheckList(page).getByRole('button')).toHaveCount(7)
})

test('지점을 바꾸면 그 지점 기준으로 보드와 요약을 다시 불러온다', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('navigation', { name: '지점' }).getByRole('button', { name: /러너스하이 분당점/ }).click()

  await expect(page.getByRole('heading', { name: '9월 30일 기준 · 러너스하이 분당점' })).toBeVisible()
  await expect(needsCheckList(page).getByRole('button')).toHaveCount(1)
  await expect(needsCheckList(page)).toContainText('서지우')

  await page.getByRole('tab', { name: '지점 요약' }).click()
  const tiles = page.getByRole('region', { name: /지점 요약/ })
  await expect(tiles).toContainText('확인할 변화1명')
  await expect(tiles).toContainText('학습량 감소')
})

test('학생을 고르지 않으면 학생 기록 탭이 안내를 보여준다', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('tab', { name: '학생 기록' }).click()
  await expect(page.getByText('케어 보드에서 카드를 고르면 그 학생의 기록이 보입니다.')).toBeVisible()
})

test('탭은 키보드 방향키로 옮길 수 있다', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('tab', { name: '케어 보드' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: '학생 기록' })).toBeFocused()
  await expect(page.getByRole('tab', { name: '학생 기록' })).toHaveAttribute('aria-selected', 'true')
})
