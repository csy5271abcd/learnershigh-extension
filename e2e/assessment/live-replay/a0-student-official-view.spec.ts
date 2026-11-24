import { expect, test, type Browser, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { uniquePdf } from '../support.ts'

// A27-UX 부록 O §38-16: 학생 개인 동명 학교 열람 선택. 시연 명단(합성 학생, 이 설정에서만 켬) · 일회용 DB · 가상 학교알리미.
// 다른 REPLAY 시험이 쓰지 않는 시연 학교(sch_demo_jinyang)만 쓰고, 끝나면 가상 학교알리미 Fixture 를 지운다.
// 학교 이름은 학적 그대로, 두 후보의 주소·문서는 가상 값(실제 학교 아님).

const STUDENT = 'http://localhost:5191'
const API = 'http://127.0.0.1:18090'
const STUB = 'http://127.0.0.1:18769'
const OFFICIAL = `${API}/api/student/assessment/evaluation-plans/official`
const SCHOOL = 'sch_demo_jinyang'
const S1 = 'stu_demo_029' // 1학년
const S2 = 'stu_demo_032' // 2학년

function sql(query: string): string[][] {
  const out = execFileSync('docker', ['exec', process.env.E2E_ASSESSMENT_DB_CONTAINER ?? '', 'mysql', '-ulhe2e', `-p${process.env.E2E_ASSESSMENT_DB_PASSWORD ?? ''}`,
    '--default-character-set=utf8mb4', 'lh_e2e_assessment', '-N', '-e', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}

const uuidOf = (seed: string) => {
  const hex = createHash('sha256').update(seed).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

async function openAs(browser: Browser, studentId: string) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
  const page = await context.newPage()
  await page.goto(`${STUDENT}/assessment?devStudent=${studentId}`)
  return { context, page }
}

async function pick(page: Page, sido: string) {
  await expect(page.getByTestId('official-ensure-status').first()).toHaveAttribute('data-state', 'SCHOOL_CONFIRMATION_REQUIRED', { timeout: 60_000 })
  await page.getByTestId('official-school-picker-open').first().click()
  const options = page.getByTestId('official-school-picker-option')
  await expect(options).toHaveCount(2, { timeout: 30_000 })
  await options.filter({ hasText: sido }).locator('input').check()
  await page.getByTestId('official-school-picker-confirm').click()
  await expect(page.getByTestId('official-school-picker')).toHaveCount(0)
}

test('[O-2] 학생 동명 학교: 학생마다 지역·주소를 골라 그 학교 공식 원본만 · 학적·관리자 매핑 불변 · 다른 학교 원본 404 · 재다운로드 0', async ({ browser, request }) => {
  const tag = Date.now().toString(36)
  const ctx = await (await request.get(`${API}/api/student/assessment/academic-context`, { headers: { 'X-Assessment-Student-Id': S1 }, params: { academicYear: '2026', semester: '2' } })).json()
  const name: string = ctx.school.name
  expect(ctx.school.schoolId).toBe(SCHOOL)
  const A = uuidOf(`view-A-${tag}`)
  const B = uuidOf(`view-B-${tag}`)
  const files = (who: string) => [1, 2].map((grade) => ({ name: `2026학년도 ${grade}학년 2학기 ${who}학교 E2E합성 ${tag}.pdf`, base64: uniquePdf(`${tag}-${who}${grade}`).toString('base64') }))
  const fixture = {
    schools: [
      { id: A, name, address: '가상특별시 가상구 가상로 1', years: { 2026: { echo: 2026, files: files('A') } } },
      { id: B, name, address: '가상광역시 시험구 시험로 2', years: { 2026: { echo: 2026, files: files('B') } } },
    ],
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  const mappingBefore = sql(`select count(*) from assessment_schoolinfo_school_mapping where school_id='${SCHOOL}'`)[0][0]
  try {
    // 학생 1(1학년) → 가상특별시
    const one = await openAs(browser, S1)
    await one.page.screenshot({ path: 'test-results/a27o-student-same-name-before-1600.png' })
    await pick(one.page, '가상특별시')
    await expect(one.page.getByTestId('official-view-selected').first()).toBeVisible({ timeout: 60_000 })
    await expect(one.page.getByText(/2026학년도 1학년 2학기 A학교/).first()).toBeVisible({ timeout: 60_000 })
    await one.page.screenshot({ path: 'test-results/a27o-student-same-name-after-1600.png' })
    for (const [w, h] of [[1920, 1080], [1366, 768], [800, 600]] as const) {
      await one.page.setViewportSize({ width: w, height: h })
      await noOverflow(one.page, `학생 1 ${w}`)
    }

    // 학생 2(2학년) — 학생 1 선택과 무관하게 아직 고르기 전 → 가상광역시
    const two = await openAs(browser, S2)
    await pick(two.page, '가상광역시')
    await expect(two.page.getByText(/2026학년도 2학년 2학기 B학교/).first()).toBeVisible({ timeout: 60_000 })
    await expect(two.page.getByText(/A학교/)).toHaveCount(0)

    // 서버 기준: 학생 1은 여전히 A, 학적 학교는 그대로, 관리자 공통 매핑 불변
    const h1 = { 'X-Assessment-Student-Id': S1 }
    const o1 = await (await request.get(OFFICIAL, { headers: h1, params: { academicYear: '2026', semester: '2' } })).json()
    expect(o1.schoolId).toBe(SCHOOL)
    expect(o1.documents.map((d: { fileName: string }) => d.fileName).join()).toContain('A학교')
    expect(o1.officialView).toMatchObject({ sido: '가상특별시', teacherConfirmed: false })
    expect(sql(`select count(*) from assessment_schoolinfo_school_mapping where school_id='${SCHOOL}'`)[0][0]).toBe(mappingBefore)
    // 다른 학교(B) 원본은 학생 1에게 404
    const o2 = await (await request.get(OFFICIAL, { headers: { 'X-Assessment-Student-Id': S2 }, params: { academicYear: '2026', semester: '2' } })).json()
    const bDoc = o2.documents[0].sourceDocumentId
    expect((await request.get(`${OFFICIAL}/files/${bDoc}`, { headers: h1, params: { academicYear: '2026', semester: '2' } })).status()).toBe(404)
    // 같은 학교 공유: A·B 학교 원본은 각각 한 번씩만 저장
    const stored = sql(`select count(*) from assessment_schoolinfo_source_file where school_id in ('si_${A}','si_${B}')`)[0][0]
    expect(Number(stored)).toBe(4)

    // 철회 → 다시 '학교 확인 필요', 원본 0
    await one.page.setViewportSize({ width: 1600, height: 900 })
    await one.page.getByTestId('official-school-picker-open').first().click()
    await one.page.getByTestId('official-school-picker-clear').click()
    await expect(one.page.getByTestId('official-ensure-status').first()).toHaveAttribute('data-state', 'SCHOOL_CONFIRMATION_REQUIRED', { timeout: 60_000 })
    const cleared = await (await request.get(OFFICIAL, { headers: h1, params: { academicYear: '2026', semester: '2' } })).json()
    expect(cleared.documents).toHaveLength(0)
    expect(sql(`select action from assessment_student_official_view_event where student_id='${S1}' order by occurred_at`).map((r) => r[0])).toEqual(['SELECT', 'CLEAR'])
    await one.context.close()
    await two.context.close()
  } finally {
    await request.delete(`${STUB}/__fixture`)
  }
})
