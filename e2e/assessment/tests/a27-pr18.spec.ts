import { expect, test, type Page } from '@playwright/test'
import { expectOfficialSlotMatchesServer, ADMIN, API, STUDENT, STUDENT_ID, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A27-UX 부록 D (2026-11-19): PR #18 통합 화면 E2E. 일회용 DB · 실제 Backend(loopback-stub 분석기) · 합성 문서만.
// 학교알리미 화면은 외부 학교알리미에 접속하지 않도록 이 화면이 부르는 두 API(§38-12) 응답만 브라우저에서 대역으로 준다.
// Backend의 실제 수집 규칙(학년도 지정 조회·분류·중복·권한·오류)은 SchoolInfoSyncApiTest·SchoolInfoImportApiTest(IT)가 검증한다.
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

// 부록 E(2026-11-19 사용자 지시): '학교알리미에서 불러오기' 주 버튼은 없어지고 최근 3개 학년도 자동 확인으로 바뀌었다.
// 이 시험은 화면 동작(자동 POST·폴링·학년도 필터 독립·칸 배지)을 고정된 응답으로 본다. 실제 Backend 수집은 z-a27-autosync·SchoolInfoSyncApiTest.
test('관리자 6칸: 불러오기 주 버튼 없이 학교 선택만으로 최근 3개 학년도 자동 확인 → 학년도 필터는 다시 보내지 않음 · 학생 공식 원본 비표시', async ({ page, request }) => {
  const years = [2026, 2025, 2024]
  const slotsOf = (done: boolean) =>
    years.flatMap((academicYear) =>
      [1, 2, 3].flatMap((grade) =>
        [1, 2].map((semester) => {
          if (!done) return { academicYear, grade, semester, status: 'FETCHING', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' }
          if (academicYear === 2026 && grade === 1) return { academicYear, grade, semester, status: 'REGISTERED', sourceFileCount: 2, registeredPlanCount: 2, analysisStatus: semester === 1 ? 'ANALYZING' : 'ANALYZED' }
          if (academicYear === 2024) return { academicYear, grade, semester, status: 'YEAR_MISMATCH', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' }
          if (academicYear === 2025) return { academicYear, grade, semester, status: 'NOT_PUBLISHED', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' }
          return { academicYear, grade, semester, status: 'NO_SOURCE_FOR_SLOT', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' }
        }),
      ),
    )
  const body = (done: boolean) => ({
    jobId: 'schoolinfo_sync_e2e', schoolId: 'school_001', requestedAcademicYears: years, state: done ? 'PARTIAL' : 'RUNNING',
    yearStatuses: done
      ? [{ academicYear: 2026, status: 'COMPLETED', resolvedSourceYear: 2026, checkedAt: null, message: null, elapsedMillis: 10 },
         { academicYear: 2025, status: 'NOT_PUBLISHED', resolvedSourceYear: null, checkedAt: null, message: null, elapsedMillis: 5 },
         { academicYear: 2024, status: 'YEAR_MISMATCH', resolvedSourceYear: 2026, checkedAt: null, message: null, elapsedMillis: 5 }]
      : years.map((academicYear) => ({ academicYear, status: 'FETCHING', resolvedSourceYear: null, checkedAt: null, message: null, elapsedMillis: null })),
    slotStatuses: slotsOf(done),
    counts: { expectedSlots: 18, verifiedSlots: done ? 2 : 0, uniqueSourceFiles: 3, registeredPlans: 2, slotLinks: 4, downloads: 3, reused: 0, analysisCompleted: 1 },
    unresolvedFiles: done ? [{ academicYear: 2024, fileName: '2026학년도 1학년 1학기 평가계획.pdf', sha256: 'x', status: 'YEAR_MISMATCH', reason: 'DISCLOSURE_YEAR_DIFFERS' }] : [],
  })
  const posts: unknown[] = []
  let polls = 0
  await page.route('**/api/admin/assessment/evaluation-plans/schoolinfo-sync', (route) => {
    posts.push(route.request().postDataJSON())
    return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify(body(false)) })
  })
  await page.route('**/api/admin/assessment/evaluation-plans/schoolinfo-sync/schoolinfo_sync_e2e', (route) => {
    polls += 1
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body(polls >= 2)) })
  })

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })
  // 주 버튼 없음 · 수동 등록은 그대로
  await expect(page.getByTestId('schoolinfo-open')).toHaveCount(0)
  await expect(page.getByTestId('plan-upload-open')).toBeVisible()
  const summary = page.getByTestId('schoolinfo-sync')
  await expect(summary).toHaveAttribute('data-state', 'RUNNING')
  await expect(page.getByTestId('schoolinfo-sync-retry')).toBeDisabled()
  await expect(summary).toHaveAttribute('data-state', 'PARTIAL', { timeout: 15_000 })
  // 개발 서버는 React StrictMode 라 첫 진입에 같은 명령이 최대 2번 나갈 수 있다(서버가 같은 작업으로 합친다 — SchoolInfoSyncApiTest)
  expect(posts.length).toBeGreaterThanOrEqual(1)
  expect(posts.length).toBeLessThanOrEqual(2)
  for (const post of posts) {
    expect(post).toEqual({ schoolId: 'school_001', requestedAcademicYears: [2026, 2025, 2024], grades: [1, 2, 3], semesters: [1, 2] })
  }
  const postsAfterEntry = posts.length
  await expect(page.getByTestId('schoolinfo-sync-year-2026')).toHaveText('2026: 확인 완료')
  await expect(page.getByTestId('schoolinfo-sync-year-2025')).toHaveText('2025: 공시 파일 없음')
  await expect(page.getByTestId('schoolinfo-sync-year-2024')).toHaveText('2024: 학년도 불일치')
  await expect(page.getByTestId('schoolinfo-sync-coverage')).toHaveText('18개 구간 중 원본 등록 2개')
  // 선택한 학년도 6칸에만 배지 — 수집과 분석을 나란히
  await expect(page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-sync')).toHaveText('학교알리미: 원본 등록 완료 2개 · 분석 중')
  await expect(page.getByTestId('plan-slot-2-2').getByTestId('plan-slot-sync')).toHaveText('학교알리미: 이 칸 공시 파일 없음')
  await page.getByTestId('schoolinfo-sync-unresolved-toggle').click()
  await expect(page.getByTestId('schoolinfo-sync-unresolved')).toContainText('다른 학년도 공시')
  await page.screenshot({ path: 'test-results/a27-autosync-summary-1600.png' })
  // 학년도 필터를 바꿔도 다시 보내지 않고 그 학년도 6칸 배지만 바뀐다
  const yearSelect = page.getByTestId('filter-year')
  if (await yearSelect.locator('option[value="2024"]').count()) {
    await yearSelect.selectOption('2024')
    await expect(page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-sync')).toHaveText('학교알리미: 학년도 불일치')
  }
  expect(posts.length, '학년도 필터는 다시 보내지 않는다').toBe(postsAfterEntry)
  await noOverflow(page, '자동 확인 요약 1600')
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '자동 확인 요약 800')
  // 학생 화면(부록 K): 공식 원본 = 학교알리미 수집 원본만, 화면 = 서버 §10-1-3 (관리자 직접 등록 문서는 공식 원본이 아님)
  await page.goto(`${STUDENT}/assessment`)
  await expectOfficialSlotMatchesServer(page, request)
})

test('관리자 검토: 상세 채점기준은 요소별 목록(좁은 칸에서도 읽힘) · 일괄 승인 버튼 없음', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-contract03ext-pr18-${tag}.pdf`
  const doc = await registerAndAnalyze(request, 2026, fileName, uniquePdf(`${tag}-pr18`))
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-performance-tab').click()
  await page.getByTestId('performance-nav-item').nth(1).click()
  const rubric = page.getByTestId('review-rubric')
  await expect(rubric).toBeVisible()
  await expect(rubric.locator('table')).toHaveCount(0)
  await expect(rubric.locator('section').first()).toBeVisible()
  await expect(page.getByTestId('review-rubric-max-score').first()).toHaveText('요소 배점 75점')
  // A27 원칙: 후보 '그대로 일괄 확인' 버튼은 넣지 않았다
  await expect(page.getByTestId('review-bulk-confirm')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/그대로 확인|모두 확인/)
  await noOverflow(page, 'review@1366')
  await page.screenshot({ path: 'test-results/a27-pr18-rubric-list-1366.png' })
})

test('학생 평가 기준: 같은 이름 공개 항목이 여러 개면 자동 연결하지 않고 확인 필요로 보인다', async ({ page, request }) => {
  const tag = runTag()
  const label = `E2E 동명 항목 ${tag}`
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, { headers: studentHeaders, data: { title: label, subjectId: 'subj_02', academicYear: 2026, semester: 2 } })
  expect(created.status()).toBe(201)
  const item = await created.json()
  const doc = await registerAndAnalyze(request, 2026, `e2e-pr18-dup-${tag}.pdf`, uniquePdf(`${tag}-dup`))
  await confirmEvaluation(request, doc, 'subj_02', [
    { fieldPath: 'performanceEvaluation.items[0].label', value: label, pdfPageNumber: 1 },
    { fieldPath: 'performanceEvaluation.items[1].label', value: label, pdfPageNumber: 1 },
  ])
  await page.goto(`${STUDENT}/assessment/school-assessments/${item.assessmentId}`)
  await expect(page.getByTestId('criteria-ambiguous')).toContainText('자동으로 연결하지 않았어요', { timeout: 15_000 })
  await expect(page.getByTestId('criteria-found')).not.toContainText('이 수행평가와 이름이 같은 공개 항목')
})
