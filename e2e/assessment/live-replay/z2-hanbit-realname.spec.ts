import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// A27-UX 부록 L (2026-11-20) — REPLAY + 정확한 학교 이름 FIXTURE(합성 학생). z-student-official 뒤에 돈다(같은 일회용 DB).
// - 파주 한빛고 실측 상세·항목 HTML·원본을 **이름 치환 없이** 그대로 돌려준다(같은 이름 담양 한빛고 실측 상세도 후보로).
// - 학생: E2E 전용 추가 명단의 합성 학생 stu_demo_e2e_hanbit2(학교 sch_e2e_hanbit_paju '한빛고등학교', 2026 고2). 실존 학생 아님.
// - 관리자 '학생 화면 보기'(읽기 전용): 같은 원본 목록·자동 확보 POST 0·학교알리미 요청 0·DB 쓰기 0·담당 밖 404.
const STUDENT = 'http://localhost:5191'
const ADMIN = 'http://localhost:5192'
const API = 'http://127.0.0.1:18090'
const STUB = 'http://127.0.0.1:18769'
const MANIFEST = process.env.A27_LIVE_MANIFEST ?? ''
const SCHOOL = 'sch_e2e_hanbit_paju'
const KID = 'stu_demo_e2e_hanbit2'
const PAJU_ID = '4674a469-46ff-47af-b1ef-fdf2aa3e7f1f'
const report: Record<string, unknown> = {}

function sql(query: string): string[][] {
  const out = execFileSync('docker', ['exec', process.env.E2E_ASSESSMENT_DB_CONTAINER ?? '', 'mysql', '-ulhe2e', `-p${process.env.E2E_ASSESSMENT_DB_PASSWORD ?? ''}`,
    '--default-character-set=utf8mb4', 'lh_e2e_assessment', '-N', '-e', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}
const one = (q: string) => Number(sql(q)[0]?.[0] ?? 0)
function visible(schoolId: string, year: number, grade: number, semester: number) {
  return sql(`select f.id, f.file_name, f.sha256 from assessment_schoolinfo_slot_link l join assessment_schoolinfo_source_file f on f.id = l.source_file_id `
    + `join assessment_evaluation_plan p on p.id = l.plan_id where l.school_id='${schoolId}' and l.academic_year=${year} and l.grade=${grade} and l.semester=${semester} `
    + `and p.deleted_at is null and f.verification in ('VERIFIED','UNCLASSIFIED') and f.storage_key is not null group by f.id, f.file_name, f.sha256`)
    .map(([id, name, sha]) => ({ id, name, sha }))
}
const stubLog = async (request: import('@playwright/test').APIRequestContext): Promise<string[]> => (await request.get(`${STUB}/__log`)).json()
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

test.describe.configure({ mode: 'serial' })

test('한빛고등학교(정확한 이름) 학생 먼저 → 같은 이름 학교라 확인 필요·0건 → 관리자가 파주 선택 → 학생 화면 저절로 갱신·본인 학년·학기 원본만', async ({ browser, request }) => {
  test.setTimeout(600_000)
  // manifest 의 한빛고 기본 이름 치환('한솔고등학교')을 끈다 — 실측 HTML 그대로
  expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: 'hanbit', nameOverride: null } } })).status()).toBe(204)
  expect(one(`select count(*) from assessment_schoolinfo_source_file where school_id='${SCHOOL}'`), '처음 수집 0').toBe(0)
  const studentCtx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const student = await studentCtx.newPage()
  await student.goto(`${STUDENT}/assessment?devStudent=${KID}`)
  await expect(student.getByText('한빛고등학교').first()).toBeVisible({ timeout: 60_000 })
  await expect(student.getByTestId('official-ensure-status')).toHaveAttribute('data-state', 'SCHOOL_CONFIRMATION_REQUIRED', { timeout: 120_000 })
  await expect(student.getByTestId('home-official-slot').first()).toContainText('학교 확인이 필요해요')
  expect(one(`select count(*) from assessment_schoolinfo_slot_link where school_id='${SCHOOL}'`), '학교 확인 전 등록 0').toBe(0)
  const before = await stubLog(request)
  expect(before.filter((l) => l.startsWith('item ') || l.startsWith('download ')), '학교 확인 전 항목·원본 요청 0').toEqual([])
  expect(before.some((l) => l.startsWith(`detail ${PAJU_ID}`)), '파주 한빛고 상세(실측 그대로)를 읽었다').toBe(true)
  await student.screenshot({ path: 'test-results/a27l-hanbit-student-confirm-1600.png', fullPage: true })

  // 관리자: 같은 이름 2곳(경기 파주·담양) 중 경기도 파주 선택
  const adminCtx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const admin = await adminCtx.newPage()
  await admin.goto(`${ADMIN}/assessment/evaluation-plans?school=${SCHOOL}&year=2026`)
  await expect(admin.getByTestId('schoolinfo-sync-selection')).toContainText('같은 이름의 학교가 여러 곳', { timeout: 120_000 })
  await admin.getByTestId('schoolinfo-select-open').click()
  const dialog = admin.getByTestId('schoolinfo-select-dialog')
  await expect(dialog).toContainText('이름이 같은 학교가 2곳')
  await admin.getByTestId('schoolinfo-select-region').selectOption('경기도')
  await admin.getByTestId('schoolinfo-select-candidates').getByRole('radio').check()
  await expect(admin.getByTestId('schoolinfo-select-summary')).toContainText('경기도 파주시 한빛로 36')
  await admin.screenshot({ path: 'test-results/a27l-hanbit-admin-select-1600.png' })
  await admin.getByTestId('schoolinfo-select-confirm').click()
  await expect(admin.getByTestId('schoolinfo-sync-selected')).toContainText('경기도 파주시 한빛로 36', { timeout: 120_000 })
  await expect(admin.getByTestId('schoolinfo-sync')).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 180_000 })
  expect(sql(`select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id='${SCHOOL}'`)[0]?.[0]).toBe(PAJU_ID)

  // 학생 화면: 다시 들어오지 않아도(15초 간격 확인) 본인 2026 고2 2학기 원본이 나타난다
  const mine = visible(SCHOOL, 2026, 2, 2)
  expect(mine.length).toBeGreaterThan(0)
  const slot = student.getByTestId('home-official-slot').first()
  await expect(slot.getByTestId('official-document'), '관리자 선택 뒤 학생 화면 자동 갱신').toHaveCount(mine.length, { timeout: 120_000 })
  for (const d of mine) await expect(slot).toContainText(d.name)
  await expect(student.getByTestId('home-official-slot').nth(1)).toContainText('해당 학년도 학적 정보 없음')
  await expect(student.getByTestId('home-official-slot').nth(2)).toContainText('해당 학년도 학적 정보 없음')
  const [download] = await Promise.all([student.waitForEvent('download'), slot.getByTestId('official-document-download').first().click()])
  expect(sha256(await download.path()), '내려받은 바이트 = 실측 원본').toBe(mine[0].sha)
  await student.screenshot({ path: 'test-results/a27l-hanbit-student-home-1600.png', fullPage: true })
  // 다른 학교(가좌고) 원본·같은 학교 다른 칸(고1) 원본 404
  const q = { academicYear: '2026', semester: '2' }
  const gajwa = visible('sch_demo_gajwa', 2026, 1, 2)
  if (gajwa.length) {
    expect((await request.get(`${API}/api/student/assessment/evaluation-plans/official/files/${gajwa[0].id}`, { headers: { 'X-Assessment-Student-Id': KID }, params: q })).status()).toBe(404)
  }
  const g1 = visible(SCHOOL, 2026, 1, 2)
  expect((await request.get(`${API}/api/student/assessment/evaluation-plans/official/files/${g1[0].id}`, { headers: { 'X-Assessment-Student-Id': KID }, params: q })).status()).toBe(404)
  const log = await stubLog(request)
  report.hanbit = {
    mappedSchoolinfoId: PAJU_ID, studentSlot: mine.map((d) => d.name), downloadedSha: mine[0].sha,
    sourceFiles: one(`select count(*) from assessment_schoolinfo_source_file where school_id='${SCHOOL}'`),
    distinctSha: one(`select count(distinct sha256) from assessment_schoolinfo_source_file where school_id='${SCHOOL}'`),
    slotLinks: one(`select count(*) from assessment_schoolinfo_slot_link where school_id='${SCHOOL}'`),
    confirmed: one(`select count(*) from assessment_plan_revision r join assessment_evaluation_plan p on p.id=r.plan_id where p.school_id='${SCHOOL}' and r.review_status='CONFIRMED'`),
    items: log.filter((l) => l.startsWith('item ')).length,
    damyangItems: log.filter((l) => l.includes('2cf7a711') && !l.startsWith('detail ')).length,
  }
  expect(report.hanbit).toMatchObject({ damyangItems: 0, confirmed: 0, items: 6 })
  expect((report.hanbit as { sourceFiles: number; distinctSha: number }).sourceFiles).toBe((report.hanbit as { distinctSha: number }).distinctSha)
  await studentCtx.close()
  await adminCtx.close()
})

test("관리자 '학생 화면 보기'(읽기 전용): 학생과 같은 원본 목록·내려받기 · 자동 확보 POST 0 · 학교알리미 요청 0 · DB 쓰기 0 · 담당 밖 404", async ({ browser, request }) => {
  test.setTimeout(600_000)
  expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: 'hanbit', nameOverride: null } } })).status()).toBe(204)
  const counts = () => [one(`select count(*) from assessment_schoolinfo_source_file`), one(`select count(*) from assessment_schoolinfo_slot_link`),
    one(`select count(*) from assessment_plan_revision`), one(`select count(*) from assessment_schoolinfo_sync_year`)]
  const before = counts()
  const mine = visible(SCHOOL, 2026, 2, 2)
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const page = await ctx.newPage()
  const posts: string[] = []
  page.on('request', (r) => {
    if (r.method() !== 'GET' && r.url().includes('/api/')) posts.push(`${r.method()} ${r.url()}`)
  })
  await page.goto(`${ADMIN}/assessment/students/${KID}/view?devAdmin=adm_demo_c01`)
  const frame = page.frameLocator('iframe').first()
  const slot = frame.getByTestId('home-official-slot').first()
  await expect(slot.getByTestId('official-document'), '학생 화면 보기에서도 같은 원본').toHaveCount(mine.length, { timeout: 120_000 })
  for (const d of mine) await expect(slot).toContainText(d.name)
  await expect(frame.getByTestId('official-ensure-status')).toHaveCount(0)
  const [download] = await Promise.all([page.waitForEvent('download'), slot.getByTestId('official-document-download').first().click()])
  expect(sha256(await download.path())).toBe(mine[0].sha)
  await page.screenshot({ path: 'test-results/a27l-admin-student-view-1600.png', fullPage: true })
  await page.reload()
  await expect(page.frameLocator('iframe').first().getByTestId('home-official-slot').first().getByTestId('official-document')).toHaveCount(mine.length, { timeout: 120_000 })
  expect(posts.filter((p) => p.includes('/official/ensure')), '자동 확보 POST 0').toEqual([])
  expect(posts.filter((p) => p.includes('/api/student/')), '학생 API 쓰기 0').toEqual([])
  expect((await stubLog(request)).filter((l) => /^(search|detail|item|download)/.test(l)), '학교알리미 요청 0').toEqual([])
  expect(counts(), 'DB 쓰기 0').toEqual(before)
  // 담당 지점 밖 관리자는 그 학생 공식 원본 404 (목록·파일)
  const view = `${API}/api/admin/assessment/students/${KID}/student-view/evaluation-plans/official`
  const q = { academicYear: '2026', semester: '2' }
  expect((await request.get(view, { headers: { 'X-Assessment-Admin-Id': 'adm_demo_a01' }, params: q })).status()).toBe(404)
  expect((await request.get(`${view}/files/${mine[0].id}`, { headers: { 'X-Assessment-Admin-Id': 'adm_demo_a01' }, params: q })).status()).toBe(404)
  expect((await request.get(view, { headers: { 'X-Assessment-Admin-Id': 'adm_demo_c01' }, params: q })).status()).toBe(200)
  report.adminView = { documents: mine.length, ensurePosts: 0, schoolinfoRequests: 0, dbBefore: before, dbAfter: counts() }
  writeFileSync(join(dirname(MANIFEST), 'hanbit-realname-report.json'), JSON.stringify(report, null, 1), 'utf8')
  await ctx.close()
  await request.delete(`${STUB}/__fixture`)
})
