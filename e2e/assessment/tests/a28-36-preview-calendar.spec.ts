import { expect, test, type Locator } from '@playwright/test'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A28-36 [03] 관리자 '학생 화면 보기'(읽기 전용) 홈 달력 = 실제 학생 홈 달력. 학교 운영계획·학생 개인 배치가 같은 날짜로 보이고,
// 오류 문구가 없으며, 미리보기에서 쓰기 요청은 0건. 일회용 DB · Stub 분석기(contract03 합성 0.3: T03 = 10월 2주, T05 = 11월) · 합성 문서만.
const student = { 'X-Assessment-Student-Id': STUDENT_ID }
const PLACEMENTS = `${API}/api/student/assessment/calendar-placements`

async function goMonth(calendar: Locator, month: number) {
  const order = [8, 9, 10, 11, 12, 1]
  for (let guard = 0; guard < 8; guard++) {
    const heading = (await calendar.getByRole('heading').first().textContent()) ?? ''
    const current = Number(heading.match(/(\d+)월/)?.[1])
    if (current === month) return
    await calendar.getByRole('button', { name: order.indexOf(current) > order.indexOf(month) ? '이전 달' : '다음 달' }).click()
  }
  throw new Error(`${month}월로 가지 못함`)
}

test('[A28-36] 학생 화면 보기 홈 달력은 학생 화면과 같은 운영계획·개인 배치를 보이고 쓰기 0건', async ({ page, browser, request }) => {
  test.setTimeout(150_000)
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a2836-contract03-${tag}.pdf`, uniquePdf(`${tag}-a2836`))
  const teaching = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    data: { analysisId: doc.analysisId, rows: ['T01', 'T03', 'T05'].map((rowKey) => ({ subjectIndex: 0, rowKey, subjectId: 'subj_02', decision: 'CONFIRMED' })) },
  })
  expect(teaching.status(), await teaching.text()).toBe(200)
  // 학생 본인이 11월 행을 옮겨 둔 상태(개인 배치)
  const key = `${doc.planId}|subj_02|T05`
  expect((await request.delete(PLACEMENTS, { headers: student, params: { academicYear: '2026', semester: '2' } })).status()).toBe(204)
  expect((await request.put(PLACEMENTS, { headers: student, data: { academicYear: 2026, semester: 2, sourceKey: key, displayDate: '2026-11-18', rangeFrom: '2026-11-01', rangeTo: '2026-11-30' } })).status()).toBe(200)

  // 1) 실제 학생 홈
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment?term=2026-2`)
  const mine = page.getByTestId('home-calendar')
  await expect(mine).toBeVisible({ timeout: 20_000 })
  await goMonth(mine, 11)
  await expect(mine.locator(`[data-tentative-keys~="${key}"]`)).toHaveAttribute('data-date', '2026-11-18', { timeout: 15_000 })
  const mineSummary = await mine.getByTestId('home-calendar-summary').innerText()

  // 2) 관리자 학생 화면 보기(읽기 전용, iframe)
  const adminContext = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const admin = await adminContext.newPage()
  const writes: string[] = []
  const failures: string[] = []
  admin.on('request', (r) => r.url().includes('/api/') && r.method() !== 'GET' && writes.push(`${r.method()} ${new URL(r.url()).pathname}`))
  admin.on('response', (r) => r.url().includes('/student-view/') && r.status() >= 400 && failures.push(`${r.status()} ${new URL(r.url()).pathname}`))
  // 담당 지점 관리자(강남). 담당 밖 관리자는 404 — 서버 시험 StudentCalendarPlacementApiTest·TeachingPlanReviewApiTest
  await admin.goto(`${ADMIN}/assessment/students/${STUDENT_ID}/view?devAdmin=adm_gangnam`)
  const frame = admin.frameLocator('iframe')
  const preview = frame.getByTestId('home-calendar')
  await expect(preview).toBeVisible({ timeout: 30_000 })
  await goMonth(preview, 11)
  // 같은 운영계획·같은 개인 배치 날짜, 운영계획 오류 문구 없음
  await expect(preview.locator(`[data-tentative-keys~="${key}"]`)).toHaveAttribute('data-date', '2026-11-18', { timeout: 15_000 })
  const norm = (text: string) => text.replace(/\s+/g, ' ').trim()
  expect(norm(await preview.getByTestId('home-calendar-summary').innerText()), '요약 수치(내 일정·운영계획·날짜 미정)').toBe(norm(mineSummary))
  await expect(preview).not.toContainText('학교 운영계획을 불러오지 못했어요')
  await expect(preview).not.toContainText('내 배치를 불러오지 못해')
  // 읽기 전용: 옮기기·초기화 조작 없음
  await expect(preview.getByTestId('home-calendar-placement-reset')).toHaveCount(0)
  await preview.locator(`[data-tentative-keys~="${key}"]`).click()
  await expect(frame.getByTestId('home-calendar-day-detail')).toBeVisible()
  await expect(frame.getByTestId('home-calendar-placement-select')).toHaveCount(0)
  await admin.screenshot({ path: 'test-results/a28-36-preview-calendar-1600.png' })
  expect(writes, '미리보기 쓰기 요청').toEqual([])
  expect(failures, '미리보기 조회 실패').toEqual([])
  await adminContext.close()
})
