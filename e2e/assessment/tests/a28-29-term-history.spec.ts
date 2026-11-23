import { expect, test, type Request } from '@playwright/test'
import { API, STUDENT, STUDENT_ID, runTag } from '../support.ts'

// A28-29: 학생 학기 선택 = 3개 학년도 × 1·2학기 후보 중 '학적이 있는 학기'. 학기를 고르면 그 학기 기록만 조회하고, 기록이 없으면 '없음'(새로 만들지 않음).
// 시연 원천(Mock Adapter)은 학생당 한 학년도뿐이라, 이 시험만 §9-1 학업 정보 응답을 가로채 '과거 학적이 있는 원천'을 흉내 낸다(일회용 E2E — DB·명단 변경 없음).
// 2024 고1(이전 학교 — 전학) 1·2학기, 2025 고2 2학기만(1학기 학적 없음 = 공백), 2026 고3 1·2학기 → 선택지 5개.
const BASE = `${API}/api/student/assessment`
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }

const prevSchool = { schoolId: 'sch_e2e_prev', name: 'E2E이전고등학교' }
const school = { schoolId: 'school_001', name: '예시고등학교' }
const history: Record<string, { school: typeof school; grade: number } | null> = {
  '2026-2': { school, grade: 3 },
  '2026-1': { school, grade: 3 },
  '2025-2': { school, grade: 2 },
  '2025-1': null,
  '2024-2': { school: prevSchool, grade: 1 },
  '2024-1': { school: prevSchool, grade: 1 },
}

test('[A28-29] 학기 선택: 학적 있는 과거 학기만 나오고, 고른 학기의 기록·평가 정보·운영계획만 조회한다(다른 학기 섞임·새 기록 0)', async ({ page, request }) => {
  const tag = runTag()
  // 2026-2 학기 개인 기록 하나(실제 Backend 일회용 DB)
  const created = await request.post(`${BASE}/school-assessments`, {
    headers: studentHeaders,
    data: { subjectId: 'subj_02', academicYear: 2026, semester: 2, title: `E2E 학기 이력 ${tag}` },
  })
  expect(created.status()).toBe(201)

  // §9-1-c 학적이 있는 학기 목록(원천이 과거 학적을 가진 경우를 흉내) — 2025 1학기는 학적 없음이라 목록에 없다
  await page.route('**/api/student/assessment/academic-terms', (route) =>
    route.fulfill({
      json: {
        currentTerm: { academicYear: 2026, semester: 2 },
        terms: Object.entries(history).filter(([, entry]) => entry).map(([key]) => ({ academicYear: Number(key.split('-')[0]), semester: Number(key.split('-')[1]) })),
      },
    }),
  )
  await page.route('**/api/student/assessment/academic-context**', async (route) => {
    const url = new URL(route.request().url())
    const key = `${url.searchParams.get('academicYear')}-${url.searchParams.get('semester')}`
    const entry = history[key]
    if (route.request().method() !== 'GET' || !(key in history)) return route.continue()
    if (!entry) {
      return route.fulfill({ status: 400, json: { code: 'VALIDATION_ERROR', message: '요청 값이 올바르지 않아요.', details: { fields: [{ field: 'semester', reason: 'unknown' }] } } })
    }
    const [academicYear, semester] = key.split('-').map(Number)
    return route.fulfill({
      json: {
        school: entry.school, academicYear, grade: entry.grade, semester,
        subjects: [{ subjectId: 'subj_02', name: '통합과학2' }], source: 'EXISTING_LEARNERSHIGH',
        schoolClassNumber: 1, schoolStudentNumber: 1, catalogSubjects: [],
      },
    })
  })
  const calls: string[] = []
  const writes: string[] = []
  page.on('request', (req: Request) => {
    const url = new URL(req.url())
    if (!url.pathname.startsWith('/api/student/assessment/')) return
    if (req.method() === 'GET') calls.push(`${url.pathname}?${url.searchParams.toString()}`)
    else writes.push(`${req.method()} ${url.pathname}`)
  })

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments?devStudent=${STUDENT_ID}`)
  // 목록이 길어 이 시험의 기록만 검색어로 좁힌다(학기를 바꿔도 검색어는 그대로)
  await page.getByPlaceholder(/수행평가 이름/).fill(tag)
  await expect(page.getByText(`E2E 학기 이력 ${tag}`)).toBeVisible({ timeout: 30_000 })

  // 선택지: 학적이 있는 5개 학기(2025 1학기 없음), 최신 먼저, '불러오지 못한 학기' 없음
  await page.getByRole('button', { name: /학기 선택 열기/ }).click()
  const options = page.getByRole('menuitemradio')
  await expect(options).toHaveText([
    /2026학년도 3학년 2학기/, /2026학년도 3학년 1학기/, /2025학년도 2학년 2학기/, /2024학년도 1학년 2학기/, /2024학년도 1학년 1학기/,
  ])
  await expect(page.getByRole('menu', { name: '학기 선택' })).not.toContainText('불러오지 못')
  await page.screenshot({ path: 'test-results/a28-29-term-menu.png' })

  // 2024 1학년 1학기(이전 학교): 그 학기 목록만 조회, 2026 기록은 보이지 않음, 없음 표시
  calls.length = 0
  await options.filter({ hasText: '2024학년도 1학년 1학기' }).click()
  await expect.poll(() => calls.some((call) => call.startsWith('/api/student/assessment/school-assessments?') && call.includes('academicYear=2024') && call.includes('semester=1'))).toBe(true)
  await expect(page.getByText(`E2E 학기 이력 ${tag}`)).toHaveCount(0)
  await expect(page.getByText(/수행평가가 없어요/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /학기 선택 열기/ })).toContainText('E2E이전고등학교')

  // 같은 학기 맥락으로 학교 평가 정보·월별 운영계획(그 학교·학년도·학년·학기 슬롯만)
  calls.length = 0
  await page.getByRole('link', { name: '학교 평가 정보' }).first().click()
  await expect.poll(() => calls.some((call) => call.startsWith('/api/student/assessment/evaluation-plans?') && call.includes('schoolId=sch_e2e_prev') && call.includes('academicYear=2024') && call.includes('grade=1') && call.includes('semester=1'))).toBe(true)
  calls.length = 0
  await page.getByRole('link', { name: '월별 운영계획' }).first().click()
  await expect.poll(() => calls.some((call) => call.includes('sch_e2e_prev') && call.includes('2024'))).toBe(true)
  expect(calls.filter((call) => call.includes('academicYear=2026'))).toHaveLength(0)

  // 다시 2026 3학년 2학기 → 그 기록이 다시 보인다
  await page.getByRole('link', { name: '학교 수행평가' }).first().click()
  await page.getByRole('button', { name: /학기 선택 열기/ }).click()
  await page.getByRole('menuitemradio').filter({ hasText: '2026학년도 3학년 2학기' }).click()
  await page.getByPlaceholder(/수행평가 이름/).fill(tag)
  await expect(page.getByText(`E2E 학기 이력 ${tag}`)).toBeVisible()

  // 학기 조회만으로 수행평가·노트·파일을 만들지 않는다
  expect(writes.filter((write) => /school-assessments|notes|resources|records/.test(write))).toEqual([])
})
