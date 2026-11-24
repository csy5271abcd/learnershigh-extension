import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// A27-UX 부록 J (2026-11-20) — REPLAY E2E. 실제 학교알리미 실측 HTML·원본(저장소 밖 manifest)을 가상 학교알리미(127.0.0.1:18769)가 그대로 돌려주고,
// 제품 Backend(일회용 MySQL) + 관리자 화면으로 '학교 선택 → 최근 3개 학년도 자동 수집 → 18칸 연결 → 재확인 중복 0 → 관리자 삭제 보호'를 확인한다.
// 실제 학교알리미 접속 없음. 결과(일회용 DB 건수·화면 건수)는 manifest 옆 live-replay-report-*.json 에 남긴다.
const ADMIN = 'http://localhost:5192'
const API = 'http://127.0.0.1:18090/api/admin/assessment'
const STUB = 'http://127.0.0.1:18769'
const HEADERS = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const MANIFEST = process.env.A27_LIVE_MANIFEST ?? ''
const YEARS = [2026, 2025, 2024]

type Group = { key: 'gajwa' | 'hanbit'; schoolId: string; realId: string; region: string; address: string; otherId: string }
const GROUPS: Group[] = [
  { key: 'gajwa', schoolId: 'sch_demo_gajwa', realId: '159bfc38-e79f-4b65-8b71-4d86557aa6f6', region: '경기도', address: '경기도 고양시 일산서구 가좌1로 43', otherId: 'dc84a61c-705a-44dc-bff1-592efdf7118b' },
  { key: 'hanbit', schoolId: 'sch_demo_hansol', realId: '4674a469-46ff-47af-b1ef-fdf2aa3e7f1f', region: '경기도', address: '경기도 파주시 한빛로 36', otherId: '2cf7a711-9977-4141-9a52-c8a538590761' },
]

function sql(query: string): string[][] {
  const out = execFileSync('docker', ['exec', process.env.E2E_ASSESSMENT_DB_CONTAINER ?? '', 'mysql', '-ulhe2e', `-p${process.env.E2E_ASSESSMENT_DB_PASSWORD ?? ''}`,
    '--default-character-set=utf8mb4', 'lh_e2e_assessment', '-N', '-e', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}

function snapshot(schoolId: string) {
  const one = (q: string) => Number(sql(q)[0]?.[0] ?? 0)
  return {
    sourceFiles: one(`select count(*) from assessment_schoolinfo_source_file where school_id='${schoolId}'`),
    byVerification: Object.fromEntries(sql(`select verification, count(*) from assessment_schoolinfo_source_file where school_id='${schoolId}' group by verification`).map(([v, c]) => [v, Number(c)])),
    distinctSha: one(`select count(distinct sha256) from assessment_schoolinfo_source_file where school_id='${schoolId}'`),
    otherSchoolinfoIds: one(`select count(*) from assessment_schoolinfo_source_file where school_id='${schoolId}' and schoolinfo_school_id is not null and schoolinfo_school_id <> (select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id='${schoolId}')`),
    slotLinks: one(`select count(*) from assessment_schoolinfo_slot_link where school_id='${schoolId}'`),
    revisions: one(`select count(*) from assessment_plan_revision r join assessment_evaluation_plan p on p.id = r.plan_id where p.school_id='${schoolId}'`),
    plans: one(`select count(*) from assessment_evaluation_plan where school_id='${schoolId}'`),
    deletedPlans: one(`select count(*) from assessment_evaluation_plan where school_id='${schoolId}' and deleted_at is not null`),
    confirmed: one(`select count(*) from assessment_plan_revision r join assessment_evaluation_plan p on p.id = r.plan_id where p.school_id='${schoolId}' and r.review_status='CONFIRMED'`),
    linksBySlot: Object.fromEntries(sql(`select concat(l.academic_year,'-',l.grade,'-',l.semester), count(*) from assessment_schoolinfo_slot_link l join assessment_evaluation_plan p on p.id = l.plan_id where l.school_id='${schoolId}' and p.deleted_at is null group by l.academic_year, l.grade, l.semester`).map(([k, c]) => [k, Number(c)])),
    files: sql(`select requested_year, attachment_seq, verification, coalesce(json_unquote(json_extract(evidence_json,'$.reason')),''), sha256, file_name from assessment_schoolinfo_source_file where school_id='${schoolId}' order by requested_year desc, attachment_seq`),
  }
}

async function waitDone(page: Page) {
  await expect(page.getByTestId('schoolinfo-sync')).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 180_000 })
}

for (const g of GROUPS) {
  test(`REPLAY ${g.key}: 학교 선택 → 3개 학년도 자동 수집 → 18칸 → 재확인 중복 0 → 관리자 삭제 보호`, async ({ page, request }) => {
    test.setTimeout(900_000)
    expect(MANIFEST, 'A27_LIVE_MANIFEST').not.toBe('')
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
    expect((await request.put(`${STUB}/__fixture`, { data: { replay: { manifest: MANIFEST, group: g.key } } })).status()).toBe(204)
    const jobs: Record<string, unknown>[] = []
    page.on('response', async (r) => {
      if (r.request().method() === 'GET' && /\/schoolinfo-sync\/[^/?]+$/.test(r.url()) && r.ok()) {
        try {
          jobs.push(await r.json())
        } catch {
          // 본문 없음
        }
      }
    })
    const report: Record<string, unknown> = { group: g.key, schoolId: g.schoolId }

    // 1) 화면 진입만으로 자동 확인 시작(별도 '불러오기' 버튼 없음) → 같은 이름 2곳 → 선택 전 수집 0
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto(`${ADMIN}/assessment/evaluation-plans?school=${g.schoolId}&year=2026`)
    await expect(page.getByTestId('schoolinfo-sync-selection')).toContainText('같은 이름의 학교가 여러 곳', { timeout: 120_000 })
    const before: string[] = await (await request.get(`${STUB}/__log`)).json()
    expect(before.filter((l) => l.startsWith('item ') || l.startsWith('download ')), '고르기 전 항목·원본 요청 0').toEqual([])
    await page.getByTestId('schoolinfo-select-open').click()
    const dialog = page.getByTestId('schoolinfo-select-dialog')
    await expect(dialog).toContainText('이름이 같은 학교가 2곳')
    await page.getByTestId('schoolinfo-select-region').selectOption(g.region)
    await page.getByTestId('schoolinfo-select-candidates').getByRole('radio').check()
    await expect(page.getByTestId('schoolinfo-select-summary')).toContainText(g.address)
    await page.screenshot({ path: `test-results/a27j-${g.key}-select.png` })
    await page.getByTestId('schoolinfo-select-confirm').click()
    await expect(page.getByTestId('schoolinfo-sync-selected')).toContainText(g.address, { timeout: 120_000 })
    await waitDone(page)
    const first = jobs.filter((j) => j.state !== 'RUNNING').at(-1) as Record<string, unknown>
    report.firstJob = { state: first.state, yearStatuses: first.yearStatuses, counts: first.counts, slotStatuses: first.slotStatuses, unresolved: first.unresolvedFiles }
    expect((first.slotStatuses as unknown[]).length, '18칸').toBe(18)
    expect(sql(`select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id='${g.schoolId}'`)[0]?.[0]).toBe(g.realId)
    const log1: string[] = await (await request.get(`${STUB}/__log`)).json()
    expect(log1.filter((l) => l.includes(g.otherId) && !l.startsWith('detail ')), '다른 같은 이름 학교의 항목·원본 요청 0').toEqual([])
    report.stubLog = log1.filter((l) => /^(item|download|detail|search)/.test(l))

    const s1 = snapshot(g.schoolId)
    report.afterFirst = s1
    expect(s1.otherSchoolinfoIds, '다른 학교 원본 0').toBe(0)
    expect(s1.distinctSha, '같은 SHA 원본 중복 0').toBe(s1.sourceFiles)
    expect(s1.confirmed, '자동 확정 0').toBe(0)
    // 저장된 원본은 모두 manifest(실측) 의 SHA 중 하나
    const known = new Set(Object.values(manifest.files as Record<string, { sha256: string }>).map((f) => f.sha256))
    expect(s1.files.filter((f) => !known.has(f[4])).map((f) => f[5]), '실측에 없는 바이트 저장 0').toEqual([])

    // 2) 3개 학년도 × 6칸 화면 = 일회용 DB 연결 수
    const ui: Record<string, number> = {}
    for (const y of YEARS) {
      await page.goto(`${ADMIN}/assessment/evaluation-plans?school=${g.schoolId}&year=${y}`)
      await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 60_000 })
      await waitDone(page)
      for (const grade of [1, 2, 3]) {
        for (const sem of [1, 2]) {
          const key = `${y}-${grade}-${sem}`
          await expect(page.getByTestId(`plan-slot-${grade}-${sem}`).getByTestId('plan-slot-doc'), key).toHaveCount(s1.linksBySlot[key] ?? 0, { timeout: 30_000 })
          ui[key] = s1.linksBySlot[key] ?? 0
        }
      }
      await page.screenshot({ path: `test-results/a27j-${g.key}-${y}-1600.png`, fullPage: true })
    }
    report.uiDocsBySlot = ui

    // 3) '다시 확인'(force) 2회 → 원본·연결·Revision 증가 0
    const forced = []
    for (let i = 0; i < 2; i++) {
      await page.getByTestId('schoolinfo-sync-retry').click()
      await page.waitForTimeout(1500)
      await waitDone(page)
      const s = snapshot(g.schoolId)
      forced.push({ sourceFiles: s.sourceFiles, slotLinks: s.slotLinks, revisions: s.revisions, plans: s.plans })
      expect([s.sourceFiles, s.slotLinks, s.revisions, s.plans], `force ${i + 1}`).toEqual([s1.sourceFiles, s1.slotLinks, s1.revisions, s1.plans])
    }
    report.forced = forced

    // 4) 관리자 삭제(§38-9) → 다시 확인해도 되살리지 않는다(REMOVED_BY_ADMIN). 다른 원본은 그대로
    const target = sql(`select l.plan_id, concat(l.academic_year,'-',l.grade,'-',l.semester), f.file_name from assessment_schoolinfo_slot_link l join assessment_schoolinfo_source_file f on f.id=l.source_file_id where l.school_id='${g.schoolId}' order by l.academic_year desc, l.grade, l.semester limit 1`)[0]
    const del = await request.delete(`${API}/evaluation-plans/${target[0]}`, { headers: HEADERS, params: { schoolId: g.schoolId, confirmPublished: 'false' } })
    expect(del.status(), '관리자 삭제').toBe(200)
    await page.getByTestId('schoolinfo-sync-retry').click()
    await page.waitForTimeout(1500)
    await waitDone(page)
    const s2 = snapshot(g.schoolId)
    report.afterDelete = { deletedSlot: target[1], deletedFile: target[2], sourceFiles: s2.sourceFiles, slotLinks: s2.slotLinks, revisions: s2.revisions, plans: s2.plans, deletedPlans: s2.deletedPlans, linksBySlot: s2.linksBySlot }
    expect(s2.deletedPlans).toBe(1)
    expect([s2.sourceFiles, s2.slotLinks, s2.revisions, s2.plans], '삭제 뒤 재확인: 새 문서·Revision 0').toEqual([s1.sourceFiles, s1.slotLinks, s1.revisions, s1.plans])
    expect(s2.linksBySlot[target[1]] ?? 0).toBe((s1.linksBySlot[target[1]] ?? 0) - 1)
    const [ty, tg, ts] = target[1].split('-')
    await page.goto(`${ADMIN}/assessment/evaluation-plans?school=${g.schoolId}&year=${ty}`)
    await expect(page.getByTestId(`plan-slot-${tg}-${ts}`).getByTestId('plan-slot-doc')).toHaveCount(s2.linksBySlot[target[1]] ?? 0, { timeout: 60_000 })
    const last = jobs.filter((j) => j.state !== 'RUNNING').at(-1) as Record<string, unknown>
    report.lastJobSlotStatuses = last.slotStatuses
    expect(s2.confirmed, '자동 확정 0').toBe(0)
    for (const [w, h] of [[800, 600], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width: w, height: h })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `가로 넘침 ${w}`).toBeLessThanOrEqual(1)
    }
    writeFileSync(join(dirname(MANIFEST), `live-replay-report-${g.key}.json`), JSON.stringify(report, null, 1), 'utf8')
    await request.delete(`${STUB}/__fixture`)
  })
}
