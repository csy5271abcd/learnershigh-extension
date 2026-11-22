import { expect, test } from '@playwright/test'
import { ADMIN, STUDENT, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// 운영계획 (A7): 합성 analysis-import-0.3 Fixture(Stub) → 후보 조회 → 행 수정·제외 → 운영계획 초안(평가 확정 뒤에도) 저장·복원
// → 운영계획 확정 → 학생 Monthly Planner. 실제 분석기 0.3 출력이 아니다.

test('평가 정보를 먼저 확정한 뒤에도 운영계획 초안이 서버에 저장·복원되고, 확정 후에만 학생 Planner에 보인다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-contract03-${tag}.pdf`
  const doc = await registerAndAnalyze(request, 2026, fileName, uniquePdf(tag))
  // 평가 정보 먼저 확정 (학생에게 문서 공개)
  await confirmEvaluation(request, doc, 'subj_02', [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }])

  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  const rows = page.getByTestId('teaching-plan-row')
  await expect(rows).toHaveCount(9)
  await expect(page.getByTestId('teaching-plan-rows')).toContainText('학기 9주차')

  // 운영계획 과목 연결 + 행 결정 (평가 정보 확정 뒤)
  // A27-UX [02]: 운영계획 단계에 과목 Dropdown이 없다. 평가 정보가 이미 확정(과목 1개)이라 그 연결을 그대로 쓴다(A10 규칙)
  await expect(page.getByTestId('teaching-plan-subject-link-0')).toContainText('학업 과목')
  await expect(page.getByTestId('teaching-plan-subject-link-0')).not.toContainText('미연결')
  await rows.nth(0).getByRole('button', { name: '확인' }).click()
  await rows.nth(7).getByRole('button', { name: '제외' }).click()
  await rows.nth(2).getByRole('button', { name: '수정' }).click()
  await page.getByTestId('teaching-plan-editor').getByLabel('단원').fill(`E2E 수정 단원 ${tag}`)
  await page.getByTestId('teaching-plan-editor').getByRole('button', { name: '수정값 저장' }).click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })

  // 확정 전: 학생 Planner에 이 문서의 운영계획이 없다 (초안 비공개)
  const student = await page.context().newPage()
  await student.goto(`${STUDENT}/assessment/monthly-plan`)
  await expect(student.getByTestId('student-monthly-plan')).toBeVisible()
  await expect(student.getByRole('region', { name: `${fileName} 운영계획` })).toHaveCount(0)
  await expect(student.locator('main')).not.toContainText(`E2E 수정 단원 ${tag}`)

  // 새로고침(다른 세션과 같음) → 서버 초안에서 복원
  await page.reload()
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(rows.nth(0)).toHaveAttribute('data-decision', 'confirmed')
  await expect(rows.nth(2)).toHaveAttribute('data-decision', 'edited')
  await expect(rows.nth(7)).toHaveAttribute('data-decision', 'absent')

  // 운영계획 확정
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 15_000 })
  await expect(rows.nth(7)).toHaveAttribute('data-decision', 'EXCLUDED')
  await page.screenshot({ path: 'test-results/assessment-teaching-confirmed-1536.png', fullPage: true })

  // 학생 Planner: 확정 행만 (수정값 반영, 제외 행·후보 없음)
  await student.reload()
  const section = student.getByRole('region', { name: `${fileName} 운영계획` })
  await expect(section).toBeVisible()
  await section.getByTestId('planner-month-10').click()
  // A26: 'n월 m주' 계획은 그 달 달력 m번째 줄 날짜에 임시 배치(표시용) → 10월 달력 칸의 일정으로 보인다
  const event = section.getByTestId('planner-event').filter({ hasText: `E2E 수정 단원 ${tag}` })
  await expect(event).toHaveCount(1)
  await expect(event).toHaveAttribute('data-date', /^2026-10-/)
  await expect(event).toHaveAttribute('data-tentative', 'true')
  await expect(section.getByTestId('planner-grid-note')).toContainText('임시로')
  // 일정 상세 모달: 원문 시기 + 달력 표시 날짜(임시 배치 안내), ESC로 닫힌다
  await event.click()
  const detail = student.getByTestId('planner-detail')
  await expect(detail).toBeVisible()
  await expect(detail.getByTestId('planner-detail-when')).toContainText('10월')
  await expect(detail.getByTestId('planner-detail-tentative')).toContainText('임시 배치')
  await student.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(section).not.toContainText('2차 지필평가')
  await expect(section).not.toContainText('후보')
})
