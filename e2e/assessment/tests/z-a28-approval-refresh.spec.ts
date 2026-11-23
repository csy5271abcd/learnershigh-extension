import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API, PLANS, runTag, uniquePdf } from '../support.ts'
import { chooseSubject } from '../reviewUi.ts'

// A28-22 (2026-11-22): 학교알리미 공식 원본(가상 학교알리미 18769 + 분석 Stub 'contract03' 운영계획 후보 있음)을 관리자 화면에서
// '최종 승인' 1회 → DB 운영계획 확정 N행(승인 응답 직후 첫 GET) → 미리 열어 둔 전체 현황·월별 운영계획 탭이 새로고침 없이 같은 N행 → 학생.
// 일회용 E2E DB(school_001). 실제 사용자 DB·학교알리미 접속 없음. z-a27-autosync 뒤에 돈다(같은 가상 학교 매핑을 쓴다).
const STUB = 'http://127.0.0.1:18769'
const H = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

/** 월별 운영계획 Planner 의 과목 필터 버튼 숫자 합 = 그 학기 확정 운영계획 행 수(빈 상태면 0) */
async function plannerRows(page: Page, scope: string): Promise<number> {
  const filter = page.locator(`${scope} [aria-label="과목 필터"]`).first()
  if (!(await filter.count())) return 0
  // 과목 버튼마다 마지막 칸(개수)만 더한다(과목 이름 끝 숫자 '통합과학2'의 2 를 세지 않음)
  const counts = await filter.locator('button').evaluateAll((buttons) => buttons.map((b) => Number(b.lastElementChild?.textContent?.trim() ?? '0')))
  return counts.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
}

test('최종 승인 1회로 평가 정보 + 월별 운영계획이 함께 저장되고, 이미 열린 관리자 전체 현황·월별 운영계획 탭이 새로고침 없이 같은 행을 보인다', async ({ page, context, request }) => {
  test.setTimeout(240_000)
  const tag = runTag()
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
  const fileName = `${y}학년도 1학년 2학기 contract03 교수학습 평가계획 ${tag}.pdf`
  const fixture = {
    schoolName: '예시고등학교',
    years: { [y]: { echo: y, files: [{ name: fileName, base64: uniquePdf(`${tag}-a28-22`).toString('base64') }] }, [y - 1]: { echo: y - 1, files: [] }, [y - 2]: { echo: y - 2, files: [] } },
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  try {
    // 1) 학교알리미 원본 수집(관리자 '다시 확인'과 같은 force) → 1학년 2학기 칸에 공식 원본 등록 + 분석
    const started = await (await request.post(`${PLANS}/schoolinfo-sync`, { headers: H, data: { schoolId: 'school_001', requestedAcademicYears: [y, y - 1, y - 2], grades: [1, 2, 3], semesters: [1, 2], force: true } })).json()
    await expect.poll(async () => (await (await request.get(`${PLANS}/schoolinfo-sync/${started.jobId}`, { headers: H })).json()).state, { timeout: 90_000 }).not.toMatch(/RUNNING|PENDING|QUEUED/)
    const findDoc = async () => {
      const items = (await (await request.get(PLANS, { headers: H, params: { schoolId: 'school_001', academicYear: String(y) } })).json()).items as { planId: string; grade: number; semester: number; revisions: { documentRevisionId: string; fileName: string; analysisStatus?: string }[] }[]
      for (const plan of items) for (const rev of plan.revisions) if (rev.fileName === fileName) return { plan, rev }
      return null
    }
    await expect.poll(async () => Boolean(await findDoc()), { timeout: 30_000 }).toBe(true)
    let doc = (await findDoc())!
    expect([doc.plan.grade, doc.plan.semester]).toEqual([1, 2])
    if (!doc.rev.analysisStatus || doc.rev.analysisStatus === 'NOT_REQUESTED') {
      expect((await request.post(`${PLANS}/${doc.plan.planId}/revisions/${doc.rev.documentRevisionId}/analysis`, { headers: H })).status()).toBe(201)
    }
    await expect.poll(async () => (await findDoc())?.rev.analysisStatus, { timeout: 60_000 }).toMatch(/REVIEW_REQUIRED|PARTIAL/)
    doc = (await findDoc())!
    const reviewPath = `${PLANS}/${doc.plan.planId}/revisions/${doc.rev.documentRevisionId}`
    const before = await (await request.get(`${reviewPath}/teaching-plan-review`, { headers: H })).json()
    expect(before.review, '승인 전 운영계획 확정 없음').toBeNull()
    expect(before.candidateRowCount, '운영계획 후보가 있는 문서').toBeGreaterThan(0)

    // 2) 같은 학교·학년도·학년·학기의 전체 현황·월별 운영계획을 미리 열어 둔다(다른 탭)
    const ctx = `school=school_001&year=${y}&grade=1&semester=2`
    const overview = await context.newPage()
    await overview.setViewportSize({ width: 1600, height: 900 })
    await overview.goto(`${ADMIN}/assessment?${ctx}`)
    await expect(overview.getByTestId('overview-calendar')).toBeVisible({ timeout: 30_000 })
    const monthly = await context.newPage()
    await monthly.setViewportSize({ width: 1600, height: 900 })
    await monthly.goto(`${ADMIN}/assessment/monthly-plan?${ctx}`)
    await expect(monthly.getByTestId('monthly-plan-tab')).toBeVisible({ timeout: 30_000 })
    await expect(monthly.locator('[data-testid="monthly-plan-tab"] [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 })
    await monthly.waitForLoadState('networkidle')
    const monthlyBefore = await plannerRows(monthly, '[data-testid="monthly-plan-tab"]')
    const overviewBefore = await plannerRows(overview, '[data-testid="overview-calendar"]')
    expect(overviewBefore).toBe(monthlyBefore)

    // 3) 검토 화면에서 '최종 승인'(실제 클릭)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.plan.planId}/revisions/${doc.rev.documentRevisionId}`)
    // 분석 과목명('가상과학탐구')이 슬롯 학업 과목명과 달라 기본 연결되지 않는다 → 관리자가 '과목 확인'에서 연결(서버 초안 저장)
    await page.getByTestId('review-step-subjects-tab').click()
    await chooseSubject(page, 'review-subject-select-0', 'subj_02')
    await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
    await page.getByTestId('review-step-confirm-tab').click()
    const panel = page.getByTestId('final-approval')
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('final-approval-teaching')).toHaveAttribute('data-state', 'open', { timeout: 30_000 })
    const teachingText = await page.getByTestId('final-approval-teaching').innerText()
    const expected = Number(teachingText.match(/승인 (\d+)행/)?.[1] ?? 0)
    expect(expected, `운영계획 승인 예정 행(${teachingText})`).toBeGreaterThan(0)
    await page.getByTestId('final-approval-open').click()
    const put = page.waitForResponse((r) => r.url().endsWith(`/revisions/${doc.rev.documentRevisionId}/review`) && r.request().method() === 'PUT')
    const t0 = Date.now()
    await page.getByTestId('final-approval-submit').click()
    const response = await put
    const tResponse = Date.now()
    expect(response.status()).toBe(200)
    const sent = response.request().postDataJSON()
    expect(sent.sourceCheck).toEqual({ method: 'SERVER_STORED_ORIGINAL' })
    expect(sent.teachingPlan.rows.filter((r: { decision: string }) => r.decision !== 'EXCLUDED')).toHaveLength(expected)

    // 4) 승인 응답 직후 첫 GET 에 확정 행(DB commit 후)
    const after = await (await request.get(`${reviewPath}/teaching-plan-review`, { headers: H })).json()
    const tGet = Date.now()
    const published = after.review.rows.filter((r: { decision: string }) => r.decision !== 'EXCLUDED').length
    expect(published).toBe(expected)

    // 5) 미리 열어 둔 두 탭이 새로고침 없이 같은 행 수로(목표 2초)
    await expect.poll(() => plannerRows(monthly, '[data-testid="monthly-plan-tab"]'), { timeout: 5_000, intervals: [100, 200, 300] }).toBe(monthlyBefore + expected)
    const tMonthly = Date.now()
    await expect.poll(() => plannerRows(overview, '[data-testid="overview-calendar"]'), { timeout: 5_000, intervals: [100, 200, 300] }).toBe(overviewBefore + expected)
    const tOverview = Date.now()
    console.log(`[a28-22] rows=${expected} response=${tResponse - t0}ms firstGET=${tGet - tResponse}ms monthlyTab=${tMonthly - tResponse}ms overviewTab=${tOverview - tResponse}ms`)
    expect(tMonthly - tResponse, '이미 열린 월별 운영계획 탭 반영(ms)').toBeLessThan(2_000)

    // 6) 크게 보기(같은 Context 유지) → 같은 수
    await overview.getByTestId('overview-open-monthly').click()
    await expect.poll(() => plannerRows(overview, '[data-testid="monthly-plan-tab"]'), { timeout: 15_000 }).toBe(monthlyBefore + expected)

    // 7) 학생(같은 슬롯 학적 stu_001): 그 문서의 운영계획 행 · 학교 확정 수행평가 자동 등록(목록 조회 시)
    const student = { 'X-Assessment-Student-Id': 'stu_001' }
    const studentPlan = await (await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.plan.planId}/teaching-plan`, { headers: student })).json()
    expect(JSON.stringify(studentPlan)).toContain(after.review.rows.find((r: { decision: string }) => r.decision !== 'EXCLUDED').rowKey)
    const list = await (await request.get(`${API}/api/student/assessment/school-assessments`, { headers: student, params: { academicYear: String(y), semester: '2', size: '100' } })).json()
    expect(list.items.some((item: { official?: { planId: string } | null }) => item.official?.planId === doc.plan.planId)).toBe(true)
    await overview.close()
    await monthly.close()
  } finally {
    await request.delete(`${STUB}/__fixture`)
  }
})
