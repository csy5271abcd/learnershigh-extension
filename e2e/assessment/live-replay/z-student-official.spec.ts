import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// A27-UX 부록 K (2026-11-20) — 학생 공식 원본 자동 연동 REPLAY E2E. a27-live-replay(관리자 수집) 뒤에 돈다(같은 일회용 DB).
// 실제 학교알리미 실측 HTML·원본(저장소 밖 manifest)을 가상 학교알리미가 돌려주고, 제품 Backend + 학생/관리자 화면으로 확인한다.
// - 시나리오 1(REPLAY, 실제 이름): 관리자가 이미 수집한 고양 가좌고(sch_demo_gajwa '가좌고등학교') 2학년 학생 → 외부 재수집 0, 화면 = DB, 원본 바이트 = 실측 SHA
// - 시나리오 2(REPLAY + FIXTURE): 학생이 먼저 들어오는 학교 — 파주 한빛고 실측 자료를 합성 학교 sch_demo_hanlim('한림고등학교')에 연결
//   (상세 HTML 학교 이름만 치환, 같은 이름 후보 제외). 실학교 이름 연결 PASS 로 세지 않는다.
// - 시나리오 3(경계): 다른 학교 원본 404 · 같은 이름 학교 확인 전 0건(FIXTURE 이름 치환) · 관리자 삭제 반영
const STUDENT = 'http://localhost:5191'
const ADMIN = 'http://localhost:5192'
const API = 'http://127.0.0.1:18090'
const STUB = 'http://127.0.0.1:18769'
const MANIFEST = process.env.A27_LIVE_MANIFEST ?? ''
const OFFICIAL = `${API}/api/student/assessment/evaluation-plans/official`
const report: Record<string, unknown> = {}

function sql(query: string): string[][] {
  const out = execFileSync('docker', ['exec', process.env.E2E_ASSESSMENT_DB_CONTAINER ?? '', 'mysql', '-ulhe2e', `-p${process.env.E2E_ASSESSMENT_DB_PASSWORD ?? ''}`,
    '--default-character-set=utf8mb4', 'lh_e2e_assessment', '-N', '-e', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}

/** 서버 공급자와 같은 조건으로 학생이 볼 원본(삭제 안 된 문서 + VERIFIED/UNCLASSIFIED + 그 칸) */
function visible(schoolId: string, year: number, grade: number, semester: number): { id: string; name: string; sha: string; format: string }[] {
  return sql(`select f.id, f.file_name, f.sha256, f.format from assessment_schoolinfo_slot_link l join assessment_schoolinfo_source_file f on f.id = l.source_file_id `
    + `join assessment_evaluation_plan p on p.id = l.plan_id where l.school_id='${schoolId}' and l.academic_year=${year} and l.grade=${grade} and l.semester=${semester} `
    + `and p.deleted_at is null and f.verification in ('VERIFIED','UNCLASSIFIED') and f.storage_key is not null group by f.id, f.file_name, f.sha256, f.format`)
    .map(([id, name, sha, format]) => ({ id, name, sha, format }))
}

async function stubLog(request: import('@playwright/test').APIRequestContext): Promise<string[]> {
  return (await request.get(`${STUB}/__log`)).json()
}

async function noOverflow(page: Page, name: string) {
  for (const [w, h] of [[800, 600], [1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `${name} ${w} 가로 넘침`).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width: 1600, height: 900 })
}

async function downloadSha(page: Page, button: import('@playwright/test').Locator): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()])
  const path = await download.path()
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

test.describe.configure({ mode: 'serial' })

test('시나리오 1: 관리자가 수집한 고양 가좌고 — 2학년 학생 홈·학교 평가 정보·수행평가 상세에 본인 학년·학기 원본 자동 표시, 외부 재수집 0, 바이트 = 실측', async ({ page, request }) => {
  test.setTimeout(600_000)
  expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: 'gajwa' } } })).status()).toBe(204)
  const expected = visible('sch_demo_gajwa', 2026, 2, 2)
  expect(expected.length, '관리자 수집으로 2026 고2 2학기 원본이 있다').toBeGreaterThan(0)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment?devStudent=stu_demo_038`)
  const card = page.getByTestId('home-official-plans')
  await expect(card).toBeVisible({ timeout: 60_000 })
  const slot2026 = page.getByTestId('home-official-slot').first()
  await expect(slot2026).toContainText('2026학년도 · 고2 · 2학기', { timeout: 60_000 })
  await expect(slot2026.getByTestId('official-document')).toHaveCount(expected.length, { timeout: 60_000 })
  for (const doc of expected) await expect(slot2026).toContainText(doc.name)
  await expect(page.getByTestId('home-official-slot').nth(1)).toContainText('해당 학년도 학적 정보 없음')
  await expect(page.getByTestId('home-official-slot').nth(2)).toContainText('해당 학년도 학적 정보 없음')
  const log = await stubLog(request)
  expect(log.filter((l) => l.startsWith('item ') || l.startsWith('download ')), '관리자 수집 기록 재사용 — 외부(가상) 항목·원본 요청 0').toEqual([])
  await page.screenshot({ path: 'test-results/a27k-student-home-gajwa-1600.png', fullPage: true })
  await noOverflow(page, '학생 홈')

  // 학교 평가 정보: 원본 Section(검증 원본) + 확정 평가 정보(확정 0 → 빈 상태) 분리
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  const sources = page.getByTestId('official-sources')
  await expect(sources.getByTestId('official-document')).toHaveCount(expected.length, { timeout: 60_000 })
  await expect(page.getByText('아직 확정된 평가계획서가 없어요')).toBeVisible()
  const first = sources.getByTestId('official-document').first()
  const name = (await first.locator('span').nth(0).textContent())?.trim() ?? ''
  const sha = await downloadSha(page, first.getByTestId('official-document-download'))
  expect(sha, '내려받은 바이트 = 실측 원본 SHA').toBe(expected.find((d) => name.includes(d.name) || d.name.includes(name))?.sha ?? expected[0].sha)
  await page.screenshot({ path: 'test-results/a27k-student-plans-gajwa-1600.png', fullPage: true })
  await noOverflow(page, '학교 평가 정보')

  // 수행평가 상세 '평가계획서 원본': 같은 학년·학기 원본 전체(과목별로 단정하지 않음)
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, {
    headers: { 'X-Assessment-Student-Id': 'stu_demo_038' },
    data: { title: '부록K 원본 확인 과제', newSubjectName: '부록K국어', academicYear: 2026, semester: 2 },
  })
  expect(created.status()).toBe(201)
  const assessmentId = (await created.json()).assessmentId as string
  await page.goto(`${STUDENT}/assessment/school-assessments/${assessmentId}`)
  const detail = page.getByTestId('detail-official-source')
  await expect(detail.getByTestId('official-document')).toHaveCount(expected.length, { timeout: 60_000 })
  await expect(detail.getByTestId('official-scope')).toContainText('공개 원본 전체')
  await page.screenshot({ path: 'test-results/a27k-student-detail-gajwa-1600.png', fullPage: true })

  // 4월 보완 원본(부록 K LIVE): 2025 고3-1 의 3학년 계획서, 2024 고1-1 의 1학년 계획서가 관리자 칸에 공동교육과정과 함께 연결
  const k2 = visible('sch_demo_gajwa', 2025, 3, 1).map((d) => d.name)
  const k3 = visible('sch_demo_gajwa', 2024, 1, 1).map((d) => d.name)
  expect(k2.some((n) => n.includes('1학기 3학년')), '2025 고3-1 본 계획서').toBe(true)
  expect(k3.some((n) => n.includes('1학기 1학년')), '2024 고1-1 본 계획서').toBe(true)
  const k1 = sql(`select verification, coalesce(json_unquote(json_extract(evidence_json,'$.reason')),''), coalesce(json_unquote(json_extract(evidence_json,'$.bodyGrades')),'') from assessment_schoolinfo_source_file where school_id='sch_demo_gajwa' and file_name like '2026학년도 1학기 소인수교과%'`)
  report.kA1 = k1
  report.kA2 = k2
  report.kA3 = k3
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=sch_demo_gajwa&year=2025`)
  await expect(page.getByTestId('plan-slot-3-1').getByTestId('plan-slot-doc').filter({ hasText: '1학기 3학년' })).toHaveCount(1, { timeout: 60_000 })
  await page.screenshot({ path: 'test-results/a27k-admin-2025-gajwa-1600.png', fullPage: true })
  report.scenario1 = { expected: expected.map((d) => d.name), downloadedSha: sha }
})

test('시나리오 2: 학생이 관리자보다 먼저 — 버튼 없이 자동 수집, 두 탭 동시 진입도 작업 1개, HWPX 원본 내려받기', async ({ browser, request }) => {
  test.setTimeout(600_000)
  expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: 'hanbit', nameOverride: '한림고등학교', solo: true } } })).status()).toBe(204)
  expect(Number(sql(`select count(*) from assessment_schoolinfo_source_file where school_id='sch_demo_hanlim'`)[0][0]), '처음에는 수집 0').toBe(0)
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const [a, b] = [await context.newPage(), await context.newPage()]
  const ensures: number[] = []
  a.on('response', (r) => {
    if (r.url().endsWith('/official/ensure')) ensures.push(r.status())
  })
  await Promise.all([a.goto(`${STUDENT}/assessment?devStudent=stu_demo_026`), b.goto(`${STUDENT}/assessment?devStudent=stu_demo_026`)])
  const slot = a.getByTestId('home-official-slot').first()
  await expect(slot.getByTestId('official-document'), '자동 수집 뒤 목록이 저절로 갱신').toHaveCount(1, { timeout: 180_000 })
  await expect(slot).toContainText('2학년 2학기')
  await expect(slot).toContainText('HWPX')
  // A28-06: HWPX 도 앱 안 '원본 보기'(서버 변환 미리보기). 이 일회용 E2E Backend 는 변환기를 끈다(ASSESSMENT_PREVIEW_CONVERTER=none)
  // → 원인 안내 + 원본 내려받기 버튼, 미확정 분석 정보 노출 없음
  await slot.getByTestId('official-document-open').first().click()
  await expect(a.getByTestId('official-viewer')).toHaveAttribute('data-format', 'HWPX')
  await expect(a.getByTestId('official-viewer-converted')).toContainText('미리보기용 PDF')
  await expect(a.getByTestId('official-viewer-error')).toContainText('내려받아', { timeout: 30_000 })
  await expect(a.getByTestId('official-viewer-download')).toBeVisible()
  await a.getByTestId('official-viewer-close').click()
  await expect(a.getByTestId('official-viewer')).toHaveCount(0)
  const log = await stubLog(request)
  const searches = log.filter((l) => l.startsWith('search SEARCH_MODE=') && !l.endsWith('=3'))
  expect(searches.length, '두 탭이 동시에 들어와도 학교 검색 1회 = 작업 1개').toBe(1)
  expect(log.filter((l) => l.startsWith('item ')).length, '3개 학년도 × 4월·9월').toBe(6)
  const rows = sql(`select count(*), count(distinct sha256) from assessment_schoolinfo_source_file where school_id='sch_demo_hanlim'`)[0]
  expect(rows[0]).toBe(rows[1])
  const expected = visible('sch_demo_hanlim', 2026, 2, 2)
  const sha = await downloadSha(a, slot.getByTestId('official-document-download').first())
  expect(sha).toBe(expected[0].sha)
  expect(Number(sql(`select count(*) from assessment_plan_revision r join assessment_evaluation_plan p on p.id=r.plan_id where p.school_id='sch_demo_hanlim' and r.review_status='CONFIRMED'`)[0][0]), '자동 확정 0').toBe(0)
  await a.screenshot({ path: 'test-results/a27k-student-first-hanlim-1600.png', fullPage: true })
  report.scenario2 = { ensureStatuses: ensures, searches: searches.length, items: log.filter((l) => l.startsWith('item ')).length, sourceFiles: Number(rows[0]), doc: expected[0].name }
  await context.close()
})

test('시나리오 3: 경계 — 다른 학교 원본 404, 같은 이름 학교는 학교 확인 전 0건, 관리자 삭제는 학생에게서도 사라짐', async ({ page, request }) => {
  test.setTimeout(600_000)
  const gajwa = visible('sch_demo_gajwa', 2026, 2, 2)
  const hanlim = visible('sch_demo_hanlim', 2026, 2, 2)
  const q = { academicYear: '2026', semester: '2' }
  expect((await request.get(`${OFFICIAL}/files/${hanlim[0].id}`, { headers: { 'X-Assessment-Student-Id': 'stu_demo_038' }, params: q })).status()).toBe(404)
  expect((await request.get(`${OFFICIAL}/files/${gajwa[0].id}`, { headers: { 'X-Assessment-Student-Id': 'stu_demo_026' }, params: q })).status()).toBe(404)
  expect((await request.get(`${OFFICIAL}/files/${gajwa[0].id}`, { params: q })).status()).toBe(401)
  // 다른 학년(같은 학교 고1 학생)은 고2 원본 404
  expect((await request.get(`${OFFICIAL}/files/${gajwa[0].id}`, { headers: { 'X-Assessment-Student-Id': 'stu_demo_037' }, params: q })).status()).toBe(404)

  // 같은 이름 학교(가좌고 2곳 실측 상세 · 합성 학교 이름 '대신고등학교'로 치환) → 학생은 학교 확인 필요, 등록 0
  expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: 'gajwa', nameOverride: '대신고등학교' } } })).status()).toBe(204)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment?devStudent=stu_demo_022`)
  await expect(page.getByTestId('official-ensure-status')).toHaveAttribute('data-state', 'SCHOOL_CONFIRMATION_REQUIRED', { timeout: 120_000 })
  await expect(page.getByTestId('home-official-slot').first()).toContainText('학교 확인이 필요해요')
  await expect(page.locator('body')).not.toContainText('장고개로')
  expect(Number(sql(`select count(*) from assessment_schoolinfo_slot_link where school_id='sch_demo_daeshin'`)[0][0])).toBe(0)
  expect((await stubLog(request)).filter((l) => l.startsWith('item ') || l.startsWith('download ')), '학교 확인 전 항목·원본 요청 0').toEqual([])
  await page.screenshot({ path: 'test-results/a27k-student-school-confirm-1600.png', fullPage: true })

  // 관리자 삭제(§38-9) → 학생 목록에서 사라짐
  const target = sql(`select l.plan_id from assessment_schoolinfo_slot_link l where l.school_id='sch_demo_gajwa' and l.source_file_id='${gajwa[0].id}' and l.academic_year=2026 and l.grade=2 and l.semester=2`)[0][0]
  const del = await request.delete(`${API}/api/admin/assessment/evaluation-plans/${target}`, { headers: { 'X-Assessment-Admin-Id': 'adm_plan_operator' }, params: { schoolId: 'sch_demo_gajwa', confirmPublished: 'false' } })
  expect(del.status()).toBe(200)
  const after = await (await request.get(OFFICIAL, { headers: { 'X-Assessment-Student-Id': 'stu_demo_038' }, params: q })).json()
  expect(after.documents.map((d: { sourceDocumentId: string }) => d.sourceDocumentId)).not.toContain(gajwa[0].id)
  expect((await request.get(`${OFFICIAL}/files/${gajwa[0].id}`, { headers: { 'X-Assessment-Student-Id': 'stu_demo_038' }, params: q })).status()).toBe(404)
  report.scenario3 = { deleted: gajwa[0].name, remaining: after.documents.length }

  // 학교별 집계(일회용 DB)
  report.counts = Object.fromEntries(['sch_demo_gajwa', 'sch_demo_hansol', 'sch_demo_hanlim', 'sch_demo_daeshin'].map((s) => [s, sql(
    `select (select count(*) from assessment_schoolinfo_source_file where school_id='${s}'), (select count(distinct sha256) from assessment_schoolinfo_source_file where school_id='${s}'), `
    + `(select count(*) from assessment_schoolinfo_slot_link where school_id='${s}'), (select count(*) from assessment_schoolinfo_source_file where school_id='${s}' and verification='VERIFIED'), `
    + `(select count(*) from assessment_schoolinfo_source_file where school_id='${s}' and verification='UNCLASSIFIED')`)[0]]))
  writeFileSync(join(dirname(MANIFEST), 'student-official-report.json'), JSON.stringify(report, null, 1), 'utf8')
  await request.delete(`${STUB}/__fixture`)
})
