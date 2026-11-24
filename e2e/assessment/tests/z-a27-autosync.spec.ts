import { expect, test, type Page } from '@playwright/test'
import { expectOfficialSlotMatchesServer, ADMIN, PLANS, STUDENT, blankPdf, runTag, uniquePdf } from '../support.ts'

// A27-UX 부록 E (2026-11-19): 학교알리미 최근 3개 학년도 자동 확인 — 실제 Backend(SchoolInfoClient·분류·등록·분석) + 가상 학교알리미(127.0.0.1:18769).
// 실제 학교알리미 접속 없음(실서비스 연도 조회 검증은 NOT RUN). 이 파일은 school_001 에 문서를 등록하므로 다른 시험 뒤(z-)에 돈다.
// 기준 학년도는 Backend 시계(이 E2E 는 실제 시계 KST)가 정한다 → 화면도 같은 3개 학년도를 보낸다.
const STUB = 'http://127.0.0.1:18769'
const ADMIN_HEADERS = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('학교만 고르면 3개 학년도를 따로 확인해 맞는 학년도 6칸에만 등록 · 다른 학년도 공시는 0건 · 다시 들어와도 중복 없음 · 학생 비공개', async ({ page, request }) => {
  const tag = runTag()
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
  const file = (name: string) => ({ name, base64: uniquePdf(`${tag}-${name}`).toString('base64') })
  const fixture = {
    schoolName: '예시고등학교',
    years: {
      [y]: { echo: y, files: [file(`${y}학년도 1학년 1학기 전과목 평가계획 ${tag}.pdf`), file(`${y}학년도 2학년 1·2학기 과학과 평가계획 ${tag}.pdf`)] },
      [y - 1]: { echo: y - 1, files: [file(`${y - 1}학년도 1,2,3학년 2학기 평가계획(전학년) ${tag}.pdf`), file(`평가계획 안내 ${tag}.pdf`)] },
      // 학교알리미가 요청과 다른(올해) 공시를 돌려준다 → 등록 0건이어야 한다
      [y - 2]: { echo: y, files: [file(`${y}학년도 1학년 1학기 평가계획 ${tag}.pdf`)] },
    },
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  const before2 = await request.get(PLANS, { headers: ADMIN_HEADERS, params: { schoolId: 'school_001', academicYear: String(y - 2) } })
  const olderBefore = ((await before2.json()).items as { revisions: { fileName: string }[] }[]).length

  const posts: unknown[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/schoolinfo-sync')) posts.push(r.postDataJSON())
  })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y}`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })
  const summary = page.getByTestId('schoolinfo-sync')
  await expect(summary).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 90_000 })
  expect(posts[0]).toEqual({ schoolId: 'school_001', requestedAcademicYears: [y, y - 1, y - 2], grades: [1, 2, 3], semesters: [1, 2] })

  // 학년도마다 따로 조회했다
  const log: string[] = await (await request.get(`${STUB}/__log`)).json()
  for (const year of [y, y - 1, y - 2]) {
    expect(log.filter((line) => line.startsWith(`/ei/pp/Pneipp_b06_s0p.do JG_YEAR=${year}`)), `${year} 조회`).toHaveLength(1)
  }
  await expect(page.getByTestId(`schoolinfo-sync-year-${y}`)).toHaveText(`${y}: 확인 완료`)
  await expect(page.getByTestId(`schoolinfo-sync-year-${y - 1}`)).toHaveText(`${y - 1}: 일부 확인`)
  await expect(page.getByTestId(`schoolinfo-sync-year-${y - 2}`)).toHaveText(`${y - 2}: 학년도 불일치`)
  await expect(summary).toHaveAttribute('data-state', 'PARTIAL')
  await expect(page.getByTestId('schoolinfo-sync-coverage')).toHaveText('18개 구간 중 원본 등록 6개')

  // 올해 6칸: 1-1(전과목), 2-1·2-2(양 학기 과학과) 등록 · 나머지는 '이 칸 공시 파일 없음'(오류 아님)
  await expect(page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-sync')).toContainText('원본 등록 완료 1개')
  await expect(page.getByTestId('plan-slot-2-1').getByTestId('plan-slot-sync')).toContainText('원본 등록 완료 1개')
  await expect(page.getByTestId('plan-slot-2-2').getByTestId('plan-slot-sync')).toContainText('원본 등록 완료 1개')
  await expect(page.getByTestId('plan-slot-3-1').getByTestId('plan-slot-sync')).toHaveText('학교알리미: 이 칸 공시 파일 없음')
  const doc = page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-doc').filter({ hasText: tag })
  await expect(doc).toHaveCount(1, { timeout: 15_000 })
  await expect(doc.getByTestId('plan-slot-source')).toHaveText('학교알리미 수집')
  await page.screenshot({ path: 'test-results/a27-autosync-real-1600.png', fullPage: true })
  await page.setViewportSize({ width: 1366, height: 768 })
  await noOverflow(page, '자동 확인 1366')
  await page.screenshot({ path: 'test-results/a27-autosync-real-1366.png' })
  await page.setViewportSize({ width: 1920, height: 1080 })
  await noOverflow(page, '자동 확인 1920')
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '자동 확인 800')
  await page.setViewportSize({ width: 1600, height: 900 })

  // 분류 확인 필요 원본은 숨기지 않고 따로 보인다
  await page.getByTestId('schoolinfo-sync-unresolved-toggle').click()
  await expect(page.getByTestId('schoolinfo-sync-unresolved')).toContainText(`평가계획 안내 ${tag}.pdf`)
  await expect(page.getByTestId('schoolinfo-sync-unresolved')).toContainText('다른 학년도 공시')

  // 다시 들어와도(새로고침·탭 왕복) 확인 기록이 유효하면 외부 요청·새 등록 없음 — 지난 학년도 6칸으로 바로 열어 본다
  const logLength = log.length
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y - 1}`)
  await expect(page.getByTestId('schoolinfo-sync')).toHaveAttribute('data-state', 'PARTIAL', { timeout: 30_000 })
  // 전 학년 합본은 지난 학년도 2학기 세 칸 모두에(원본 하나)
  for (const grade of [1, 2, 3]) {
    await expect(page.getByTestId(`plan-slot-${grade}-2`).getByTestId('plan-slot-doc').filter({ hasText: tag })).toHaveCount(1, { timeout: 15_000 })
  }
  await expect(page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-sync')).toHaveText('학교알리미: 출처 확인 필요')
  const after: string[] = await (await request.get(`${STUB}/__log`)).json()
  expect(after.length, '확인 기록이 유효하면 외부 요청 없음').toBe(logLength)
  await page.screenshot({ path: 'test-results/a27-autosync-real-previous-year-1600.png' })

  // 전전 학년도: 학교알리미가 올해 공시를 돌려줬으므로 등록 0건
  const older = await request.get(PLANS, { headers: ADMIN_HEADERS, params: { schoolId: 'school_001', academicYear: String(y - 2) } })
  const olderItems = (await older.json()).items as { revisions: { fileName: string }[] }[]
  expect(olderItems.length).toBe(olderBefore)
  expect(olderItems.flatMap((p) => p.revisions.map((r) => r.fileName)).filter((name) => name.includes(tag))).toEqual([])

  // 다시 올해로 돌아와도 같은 문서 하나(중복 등록 없음)
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y}`)
  await expect(page.getByTestId('plan-slot-1-1').getByTestId('plan-slot-doc').filter({ hasText: tag })).toHaveCount(1, { timeout: 15_000 })

  // 학생(부록 K): 1학년 2학기 학생 — 올해 2학기 칸 원본 없음.
  // A28-01(2026-11-22 사용자 지시): 지난 학년도는 학적이 없어도 현재 학교의 같은 학년·학기 공개 원본(전학년 2학기)을 보인다.
  // 학적 칸이 아니라 '재학 기록 아님'으로 구분하고, '학적 정보 없음'은 따로 알린다(contextFound=false 유지)
  await page.goto(`${STUDENT}/assessment`)
  await expectOfficialSlotMatchesServer(page, request)
  await expect(page.getByTestId('home-official-slot').first()).not.toContainText(tag)
  await expect(page.getByTestId('home-official-slot').nth(1)).toContainText('해당 학년도 학적 정보 없음')
  await expect(page.getByTestId('home-official-slot').nth(1)).toHaveAttribute('data-basis', 'SCHOOL_PUBLIC')
  await expect(page.getByTestId('home-official-slot').nth(1).getByTestId('home-official-public')).toContainText('재학 기록 아님')
  await expect(page.getByTestId('home-official-slot').nth(1).getByTestId('official-document')).toHaveCount(1)
  await expect(page.getByTestId('home-official-slot').nth(1)).toContainText(`${y - 1}학년도 1,2,3학년 2학기 평가계획(전학년) ${tag}`)
  await expect(page.getByTestId('home-official-slot').nth(2)).not.toContainText(tag)
  // 분석 결과·평가 정보는 관리자 확정 전 비공개 그대로(확정 평가 정보에 이 문서 없음)
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  await expect(page.getByTestId('official-sources')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('confirmed-plan').filter({ hasText: tag })).toHaveCount(0)

  await request.delete(`${STUB}/__fixture`)
})

// A27-UX 부록 F: 동명 학교(가상 학교 2곳, 가상 주소) → 관리자가 지역·주소로 고름 → 고른 학교 원본만 등록 → 미분류 원본을 관리자가 학년·학기로 분류
test('동명 학교는 지역·주소로 골라야 수집되고, 고른 학교 원본만 등록된다 · 미분류 원본을 관리자가 학년·학기 칸에 분류한다', async ({ page, request }) => {
  const tag = runTag()
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
  const file = (name: string) => ({ name, base64: uniquePdf(`${tag}-${name}`).toString('base64') })
  const fixture = {
    schools: [
      { id: '0b9c5a4e-aaaa-4222-8333-00000000000a', name: '예시고등학교', address: '가상특별시 가상구 가상로 1', years: { [y]: { echo: y, files: [file(`${y}학년도 3학년 2학기 A학교 ${tag}.pdf`)] } } },
      {
        id: '0b9c5a4e-bbbb-4222-8333-00000000000b', name: '예시고등학교', address: '가상광역시 시험구 시험로 2',
        years: { [y]: { echo: y, files: [file(`${y}학년도 3학년 2학기 B학교 ${tag}.pdf`)] }, [y - 1]: { echo: y - 1, files: [{ name: `${y - 1}학년도 교과별 평가계획(통합) B학교 ${tag}.pdf`, base64: blankPdf(tag).toString('base64') }] } },
      },
    ],
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y}`)
  const summary = page.getByTestId('schoolinfo-sync')
  await expect(summary).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 60_000 })
  // 관리자가 '다시 확인'을 직접 누르면 확인 기록과 무관하게 다시 확인한다 → 동명 학교라 선택 필요
  await page.getByTestId('schoolinfo-sync-retry').click()
  await expect(page.getByTestId('schoolinfo-sync-selection')).toContainText('같은 이름의 학교가 여러 곳', { timeout: 60_000 })
  await expect(page.getByTestId(`schoolinfo-sync-year-${y}`)).toHaveText(`${y}: 학교 식별 필요`)
  const log1: string[] = await (await request.get(`${STUB}/__log`)).json()
  expect(log1.filter((l) => l.startsWith('/ei/pp/')), '고르기 전에는 어느 학교 평가계획도 받지 않는다').toEqual([])

  await page.getByTestId('schoolinfo-select-open').click()
  const dialog = page.getByTestId('schoolinfo-select-dialog')
  await expect(dialog).toContainText('이름이 같은 학교가 2곳')
  const region = page.getByTestId('schoolinfo-select-region')
  await expect(region.locator('option')).toHaveText(['전체 2곳', '가상광역시', '가상특별시'])
  await expect(page.getByTestId('schoolinfo-select-confirm')).toBeDisabled()
  await region.selectOption('가상광역시')
  await expect(page.getByTestId('schoolinfo-select-candidates').getByRole('radio')).toHaveCount(1)
  await page.getByTestId('schoolinfo-select-candidates').getByRole('radio').check()
  await expect(page.getByTestId('schoolinfo-select-summary')).toContainText('가상광역시 시험구 시험로 2')
  await page.screenshot({ path: 'test-results/a27-schoolinfo-select-1600.png' })
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '학교 선택 800')
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.getByTestId('schoolinfo-select-confirm').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('schoolinfo-sync-selected')).toContainText('가상광역시 시험구 시험로 2', { timeout: 60_000 })
  await expect(summary).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 60_000 })
  await expect(page.getByTestId('plan-slot-3-2').getByTestId('plan-slot-doc').filter({ hasText: `B학교 ${tag}` })).toHaveCount(1, { timeout: 15_000 })
  await expect(page.locator('body')).not.toContainText(`A학교 ${tag}`)

  // 미분류 원본(학년·학기 표기 없음)을 관리자가 고1·고2 × 1학기로 분류
  await page.getByTestId('schoolinfo-classify-open').click()
  const classify = page.getByTestId('schoolinfo-classify-dialog')
  const card = classify.getByTestId('schoolinfo-classify-card').filter({ hasText: `B학교 ${tag}` })
  await expect(card).toHaveCount(1, { timeout: 15_000 })
  await expect(card.getByTestId('classify-save')).toBeDisabled()
  await card.getByTestId('classify-grade-1').check()
  await card.getByTestId('classify-grade-2').check()
  await card.getByTestId('classify-semester-1').check()
  await card.getByTestId('classify-note').fill('목차 1쪽 1학기(가상)')
  await expect(card.getByTestId('classify-preview')).toHaveText(`연결될 칸: ${y - 1}학년도 고1 1학기, 고2 1학기`)
  await page.screenshot({ path: 'test-results/a27-schoolinfo-classify-1600.png' })
  await card.getByTestId('classify-save').click()
  const saved = classify.getByTestId('schoolinfo-classify-card').filter({ hasText: `B학교 ${tag}` })
  await expect(saved.getByTestId('classify-history')).toContainText('분류 이력 1회', { timeout: 15_000 })
  await expect(saved.getByTestId('classify-grade-1')).toBeDisabled()
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '원본 분류 800')
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.keyboard.press('Escape')
  await expect(classify).toBeHidden()

  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y - 1}`)
  for (const grade of [1, 2]) {
    await expect(page.getByTestId(`plan-slot-${grade}-1`).getByTestId('plan-slot-doc').filter({ hasText: `B학교 ${tag}` })).toHaveCount(1, { timeout: 15_000 })
  }
  await expect(page.getByTestId('plan-slot-3-1').getByTestId('plan-slot-doc').filter({ hasText: `B학교 ${tag}` })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a27-schoolinfo-classified-slots-1600.png' })

  // 학생(부록 K): B학교 원본은 3학년 2학기·1·2학년 1학기 칸 — 1학년 2학기 학생 칸에는 없다. 학교를 다시 고른 뒤 이전 학교 원본도 섞이지 않는다
  await page.goto(`${STUDENT}/assessment`)
  await expectOfficialSlotMatchesServer(page, request)
  await expect(page.locator('body')).not.toContainText(tag)
  await request.delete(`${STUB}/__fixture`)
})
