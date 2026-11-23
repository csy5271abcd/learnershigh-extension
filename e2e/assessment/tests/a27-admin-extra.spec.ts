import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, ADMIN_ID, PLANS, runTag, uniquePdf } from '../support.ts'
import { pickResultSubject } from '../reviewUi.ts'

// A27-UX 관리자 추가 수정(이미지 01~06). 일회용 DB · 실제 Backend · 합성 문서만(실제 학교 문서·외부 전송 없음).
// 합성 Fixture contract03-ext/subject-table-grades: 원문 1학년 과목 2개 + 원문 2학년 과목 1개 → 1학년 2학기 슬롯에 올려
// "1학년 문서에 2학년 과목 포함"을 재현한다. 캡처: test-results/a27-extra-*.png
const fixture = readFileSync(new URL('../../../backend/src/test/resources/assessment/contract03-ext/subject-table-grades.ext.json', import.meta.url), 'utf8')
const admin = { 'X-Assessment-Admin-Id': ADMIN_ID }

async function registerMixedGrades(request: APIRequestContext, tag: string) {
  const bytes = uniquePdf(`${tag}-mixed`)
  const created = await request.post(PLANS, {
    headers: admin,
    multipart: { file: { name: `e2e-mixed-grades-${tag}.pdf`, mimeType: 'application/pdf', buffer: bytes }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '2' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const sha = createHash('sha256').update(bytes).digest('hex')
  const body = fixture.replace('1111111111111111111111111111111111111111111111111111111111111111', sha).replace('"format": "PDF",', '').replace('"format":"PDF",', '')
  const imported = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis-imports`, { headers: { ...admin, 'Content-Type': 'application/json' }, data: body })
  expect(imported.status()).toBe(201)
  return { planId: plan.planId as string, revisionId: plan.documentRevisionId as string, fileName: `e2e-mixed-grades-${tag}.pdf` }
}

const noOverflow = async (page: Page, name: string) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('[01] 다른 학년 과목 제외 → 서버 저장 → 새로고침 유지 → 확정 대상·진행률에서 빠짐 → 되돌리기', async ({ page, request }) => {
  const doc = await registerMixedGrades(request, runTag())
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  const cards = page.getByTestId('review-subject-card')
  await expect(cards).toHaveCount(3)
  // 원문 2학년 과목(#2): 학년 충돌 안내 + 제외 버튼 (다른 과목으로 연결하라고 하지 않는다)
  await expect(cards.nth(2).getByTestId('review-subject-grade-conflict')).toContainText('제외하거나 원문 학년을 다시 확인')
  const before = await page.getByTestId('review-progress-count').textContent()
  await page.getByTestId('review-subject-exclude-2').click()
  const dialog = page.getByTestId('review-subject-exclude-dialog')
  await expect(dialog).toContainText('삭제가 아니에요')
  await expect(dialog.getByRole('radio', { name: '다른 학년 과목' })).toBeChecked()
  await dialog.getByTestId('review-subject-exclude-note').fill('원문 2학년 과목')
  await page.screenshot({ path: 'test-results/a27-extra-exclude-dialog-1600.png' })
  await page.getByTestId('review-subject-exclude-confirm').click()
  await expect(cards.nth(2).getByTestId('review-subject-excluded')).toContainText('제외됨 · 다른 학년 과목 · 원문 2학년 과목')
  await expect(page.getByTestId('review-subject-scope')).toContainText('검토 대상 2과목 · 제외 1과목')
  await expect(page.getByTestId('review-progress-excluded')).toContainText('제외 1과목')
  // 검토 대상 수가 줄었다(제외 건을 검토 완료로 세지 않는다)
  expect(await page.getByTestId('review-progress-count').textContent()).not.toBe(before)
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  // 서버 초안에 저장됐다
  const draft = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review-draft`, { headers: admin })).json()
  expect(draft.draft.subjectExclusions).toEqual([{ subjectIndex: 2, reason: 'OTHER_GRADE', note: '원문 2학년 과목' }])
  // 새로고침 뒤에도 유지
  await page.reload()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await expect(page.getByTestId('review-subject-card').nth(2).getByTestId('review-subject-excluded')).toBeVisible()
  await page.screenshot({ path: 'test-results/a27-extra-subjects-excluded-1600.png', fullPage: true })
  // 최종 확정 단계: 제외한 과목 수를 따로 보인다
  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-confirm-step').nth(2).click()
  await expect(page.getByTestId('review-confirm-excluded')).toContainText('1')
  // 되돌리기 → 다시 검토 대상
  await page.getByTestId('review-step-subjects-tab').click()
  await page.getByTestId('review-subject-restore-2').click()
  await expect(page.getByTestId('review-subject-card').nth(2).getByTestId('review-subject-excluded')).toHaveCount(0)
  await expect(page.getByTestId('review-progress-excluded')).toHaveCount(0)
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  const restored = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review-draft`, { headers: admin })).json()
  expect(restored.draft.subjectExclusions).toEqual([])
})

test('[03] 과목 검색: 학교 과목만 고를 수 있고, 학교 과목에 없는 범용 후보는 보이지만 연결되지 않는다(출처 문구 없음)', async ({ page, request }) => {
  const doc = await registerMixedGrades(request, runTag())
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  const select = page.getByTestId('review-subject-select-0')
  await select.locator('input').click()
  await expect(select.getByTestId('subject-option').first()).toBeVisible()
  const unavailable = select.getByTestId('subject-candidate-unavailable')
  expect(await unavailable.count(), '1학년 범용 후보 중 학교 과목에 없는 것').toBeGreaterThan(0)
  await expect(select).not.toContainText(/고등학교|운정|출처|개설 과목|평가계획서 기반/)
  await page.screenshot({ path: 'test-results/a27-extra-subject-dropdown-1600.png' })
  // 연결할 수 없는 후보는 비활성(aria-disabled)이고, 강제로 눌러도 선택되지 않는다
  await expect(unavailable.first()).toHaveAttribute('aria-disabled', 'true')
  await unavailable.first().click({ force: true })
  await expect(select.locator('input')).toHaveAttribute('data-unlinked', 'true')
  // 검색 별칭(띄어쓰기)
  await select.locator('input').fill('공통 국어')
  await expect(select.getByTestId('subject-option').or(select.getByTestId('subject-candidate-unavailable')).first()).toContainText('공통국어')
  await page.keyboard.press('Escape')
})

test('[02][05][06] 운영계획 두 번째 Dropdown 없음 · 결과 조회 분할선 드래그·키보드 · 단일 과목 선택 동기화', async ({ page, request }) => {
  const doc = await registerMixedGrades(request, runTag())
  // [02] 운영계획 단계: 과목 제목 옆 Dropdown 없음, 연결은 텍스트 + 과목 확인으로 이동
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.locator('[data-testid^="teaching-plan-subject-"] select, select[data-testid^="teaching-plan-subject-"]')).toHaveCount(0)
  if (await page.getByTestId('teaching-plan-detail-subject').count()) {
    await expect(page.getByTestId('teaching-plan-detail-subject')).toBeVisible()
    await expect(page.getByTestId('teaching-plan-rows').locator('section[aria-label$="운영계획"]')).toHaveCount(1)
    await page.getByTestId('teaching-plan-go-subjects').first().click()
    await expect(page.getByTestId('review-step-subjects')).toBeVisible()
  }

  // [05] 결과 조회 분할선
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`${ADMIN}/assessment/analysis/${doc.planId}/revisions/${doc.revisionId}/result`)
    await expect(page.getByTestId('archive-detail')).toBeVisible({ timeout: 30_000 })
    await noOverflow(page, `result@${width}`)
    await page.screenshot({ path: `test-results/a27-extra-result-${width}.png` })
  }
  await page.setViewportSize({ width: 1600, height: 900 })
  const pane = page.getByTestId('review-source-pane')
  const splitter = page.getByTestId('plan-result-splitter')
  await expect(splitter).toHaveAttribute('aria-valuenow', /\d+/)
  const start = (await pane.boundingBox())!.width
  const box = (await splitter.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 200, { steps: 8 })
  await page.mouse.up()
  const dragged = (await pane.boundingBox())!.width
  expect(dragged, '드래그로 원문 폭이 넓어진다').toBeGreaterThan(start + 80)
  await splitter.focus()
  const valueBefore = Number(await splitter.getAttribute('aria-valuenow'))
  await page.keyboard.press('ArrowLeft')
  await expect(splitter).toHaveAttribute('aria-valuenow', String(Math.max(30, valueBefore - 5)))
  await page.keyboard.press('End')
  await expect(splitter).toHaveAttribute('aria-valuenow', '70')
  await noOverflow(page, 'result@1600 70%')
  // 결과 영역은 최소 폭을 남긴다
  expect((await page.getByTestId('plan-result-panel').boundingBox())!.width).toBeGreaterThanOrEqual(370)
  // 새로고침 뒤 폭 유지(이 브라우저)
  await page.reload()
  await expect(page.getByTestId('plan-result-splitter')).toHaveAttribute('aria-valuenow', '70', { timeout: 30_000 })
  await page.getByTestId('plan-result-splitter').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')

  // [06] 단일 과목 선택: '과목 n/전체', 검색, 하위 탭 동기화
  await expect(page.getByTestId('result-subject-count')).toHaveText('과목 1/3')
  await expect(page.getByTestId('archive-subjects')).toHaveCount(0) // 칩 띠 없음
  await page.getByTestId('archive-tab-teaching').click()
  await pickResultSubject(page, 2)
  await expect(page.getByTestId('result-subject-trigger')).toContainText('원문 2학년')
  // 하위 탭(월별 운영계획)은 그대로 유지
  await expect(page.getByTestId('archive-tab-teaching')).toHaveAttribute('aria-selected', 'true')
  // 검색 + Enter
  await page.getByTestId('result-subject-trigger').click()
  const firstName = (await page.getByTestId('archive-subject').first().textContent())!.replace(/^1/, '').trim().slice(0, 2)
  await page.getByTestId('result-subject-search').fill(firstName)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('result-subject-count')).toContainText('과목 1/3')
  // 검토 비교·확정 이력도 같은 과목을 따른다(새로고침 유지)
  await pickResultSubject(page, 1)
  await page.getByTestId('plan-result-compare-tab').click()
  await page.reload()
  await expect(page.getByTestId('result-subject-count')).toHaveText('과목 2/3', { timeout: 30_000 })
  const subjectName = (await page.getByTestId('result-subject-trigger').locator('span').first().textContent())!.trim()
  const rows = page.getByTestId('plan-result-compare-row')
  if (await rows.count()) await expect(rows.first()).toContainText(/./)
  await page.getByTestId('plan-result-history-tab').click()
  await expect(page.getByTestId('plan-result-history')).toBeVisible()
  expect(subjectName.length).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/a27-extra-result-subject-1600.png' })
})
