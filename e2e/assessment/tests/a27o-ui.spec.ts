import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API, PLANS, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { chooseSubject } from '../reviewUi.ts'
import { createHash } from 'node:crypto'

// A27-UX 부록 O (2026-11-21): §38-15 관리자 학교알리미 학교 검색·선택(평가계획서 0건 학교) · §39-13 검증 가능한 후보 한 번에 확정.
// 일회용 DB · 실제 Backend · 가상 학교알리미(127.0.0.1:18769, 학교·주소는 가상 값 — 실제 학교 아님).

const STUB = 'http://127.0.0.1:18769'
const ADMIN_HEADERS = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

const uuidOf = (seed: string) => {
  const hex = createHash('sha256').update(seed).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

test('[O-1] 학교 검색: 평가계획서 0건 학교를 찾아 고르면 그 학교 18구간 자동 확인 · 학년도 3개 · 학적 불변', async ({ page, request }) => {
  const tag = runTag()
  const id = uuidOf(`search-${tag}`)
  const fileName = `2026학년도 2학년 1학기 검색예시 평가계획 ${tag}.pdf`
  const fixture = {
    schools: [
      {
        id,
        name: '검색예시고등학교',
        address: '가상특별시 검색구 검색로 3',
        years: { 2026: { echo: 2026, files: [{ name: fileName, base64: uniquePdf(`${tag}-search`).toString('base64') }] } },
      },
    ],
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  try {
    await page.setViewportSize({ width: 1600, height: 900 })
    // 부록 P: 다른 시험의 school_001 자동 확인 기록을 건드리지 않게, 학적·매핑이 없는 시험 전용 학교 키로 연다(외부 조회 0)
    await page.goto(`${ADMIN}/assessment/evaluation-plans?school=e2e_o_isolated_${runTag()}`)
    await page.getByTestId('school-directory-open').click()
    await page.getByTestId('school-directory-query').fill('검색예시고')
    await page.getByTestId('school-directory-submit').click()
    const item = page.getByTestId('school-directory-item')
    await expect(item).toHaveCount(1)
    await expect(item).toContainText('검색예시고등학교')
    await expect(item).toContainText('가상특별시 검색구')
    await page.screenshot({ path: 'test-results/a27o-school-search-1600.png' })
    // A28-02: 선택은 대상 확인만 연다 — 확인 전 선택(수집) POST 0건
    const selectionPosts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/schools/directory/selection')) selectionPosts.push(req.url())
    })
    await item.getByTestId('school-directory-select').click()
    const confirmPanel = page.getByTestId('school-directory-confirm-panel')
    await expect(confirmPanel).toContainText('검색예시고등학교')
    await expect(confirmPanel).toContainText('가상특별시 검색구 검색로 3')
    await expect(confirmPanel).toContainText('18개 구간')
    await page.waitForTimeout(300)
    expect(selectionPosts, '대상 확인 전 수집 요청 없음').toHaveLength(0)
    await page.getByTestId('school-directory-confirm').click()

    await expect(page).toHaveURL(new RegExp(`school=si_${id}`))
    expect(selectionPosts).toHaveLength(1)
    // A28-02: 담당 학생이 없는 학교 → '외부 학교 평가계획서 조회' + 공식 이름·지역·주소
    await expect(page.getByTestId('plan-external-school')).toContainText('외부 학교 평가계획서 조회')
    await expect(page.getByTestId('plan-external-school-name')).toContainText('가상특별시 검색구 검색로 3', { timeout: 30_000 })
    const years = await page.getByTestId('filter-year').locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
    expect(years.slice(0, 3)).toEqual(['2026', '2025', '2024'])
    // 고른 학교의 공시 파일이 자동 확인으로 2026 고2 1학기 칸에 들어온다(버튼 없이)
    await expect(page.getByTestId('plan-slot-2-1')).toContainText(fileName.slice(0, 20), { timeout: 60_000 })
    await expect(page.getByTestId('filter-school').locator('option:checked')).toContainText('검색예시고등학교')
    await page.screenshot({ path: 'test-results/a27o-school-selected-1600.png' })
    // 등록 학교 목록: 학적 없이 공식 이름(SCHOOLINFO_MAPPING)으로 남는다
    const schools = await (await request.get(`${API}/api/admin/assessment/schools`, { headers: ADMIN_HEADERS })).json()
    const found = schools.items.find((school: { schoolId: string }) => school.schoolId === `si_${id}`)
    expect(found).toMatchObject({ name: '검색예시고등학교', nameSource: 'SCHOOLINFO_MAPPING' })
    for (const [width, height] of [[1366, 768], [1920, 1080], [800, 600]] as const) {
      await page.setViewportSize({ width, height })
      await noOverflow(page, `학교 검색 ${width}`)
    }
  } finally {
    await request.delete(`${STUB}/__fixture`)
  }
})

test('[O-1] 학교 검색: 학교알리미 연결 실패는 빈 결과가 아니라 오류로 보인다', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  // 부록 P: 다른 시험의 school_001 자동 확인 기록을 건드리지 않게, 학적·매핑이 없는 시험 전용 학교 키로 연다(외부 조회 0)
    await page.goto(`${ADMIN}/assessment/evaluation-plans?school=e2e_o_isolated_${runTag()}`)
  await page.getByTestId('school-directory-open').click()
  await page.getByTestId('school-directory-query').fill('연결실패고')
  await page.getByTestId('school-directory-submit').click()
  await expect(page.getByTestId('school-directory-error')).toContainText('학교알리미에서 학교를 검색하지 못했어요', { timeout: 30_000 })
  await expect(page.getByTestId('school-directory-item')).toHaveCount(0)
})

test('[O-3] 한 번에 확정: 근거 없는 항목만 고치면 AI 후보를 기본 포함해 한 번에 확정 · 관리자 수정 보존 · 확정 전 학생 비공개', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-a27o-bulk-${tag}.pdf`
  const bytes = uniquePdf(`${tag}-bulk`)
  const doc = await registerAndAnalyze(request, 2026, fileName, bytes)
  const student = `${API}/api/student/assessment/evaluation-plans/${doc.planId}`
  const studentHeaders = { 'X-Assessment-Student-Id': 'stu_001' }
  expect((await request.get(student, { headers: studentHeaders })).status(), '확정 전 학생 비공개').toBe(404)

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-subjects-tab').click()
  await chooseSubject(page, 'review-subject-select-0', 'subj_02')
  await page.getByTestId('review-step-performance-tab').click()

  // 먼저 볼 항목(값·근거 없음)만 고친다 — 나머지는 AI 후보 기본 포함
  await page.getByTestId('review-filter-attention').click()
  for (let guard = 0; guard < 20; guard++) {
    const rows = page.getByTestId('review-field-list').locator(':scope > li').filter({ has: page.getByTestId('review-field-attention') })
    if ((await rows.count()) === 0) {
      const next = page.getByTestId('review-filter-next')
      if ((await next.count()) === 0) break
      await next.click()
      continue
    }
    // 편집을 열면 그 행의 '먼저 확인' 표시가 사라지므로, 행을 순번으로 고정해 둔다
    const all = page.getByTestId('review-field-list').locator(':scope > li')
    const index = await all.evaluateAll((items) => items.findIndex((item) => item.querySelector('[data-testid="review-field-attention"]') !== null))
    const row = all.nth(index)
    await row.getByTestId('review-field-edit').click()
    await row.getByTestId('review-field-input').fill('10')
    await row.getByTestId('review-field-page').fill('1')
    await row.getByTestId('review-field-apply').click()
  }
  await expect(page.getByTestId('review-filter-attention')).toHaveText('확인 필요 0')
  const edited = Number(/(\d+)/.exec(await page.getByTestId('review-filter-edited').innerText())?.[1])
  expect(edited).toBeGreaterThan(0)
  // 자동 저장(서버 초안) 끝날 때까지
  await expect(page.getByTestId('review-action-bar')).toContainText('서버에', { timeout: 15_000 })

  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-confirm-next').click()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-attest').check()
  const bulk = page.getByTestId('bulk-confirm')
  await expect(bulk).toBeVisible()
  await expect(page.getByTestId('bulk-confirm-blockers')).toHaveCount(0)
  // A28-03 최종 승인 요약(실제 초안·후보에서 센 값)
  const total = Number(await page.getByTestId('bulk-confirm-total').innerText())
  const defaulted = Number(await page.getByTestId('bulk-confirm-default').innerText())
  await expect(page.getByTestId('bulk-confirm-pending')).toHaveText('0')
  await expect(page.getByTestId('bulk-confirm')).toContainText('최종 승인')
  expect(defaulted, 'AI 후보 기본 포함').toBeGreaterThan(0)
  expect(total).toBe(defaulted + edited)
  await page.screenshot({ path: 'test-results/a27o-bulk-confirm-1600.png' })
  const confirmRequests: string[] = []
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().endsWith('/review')) confirmRequests.push(req.postData() ?? '')
  })
  await page.getByTestId('bulk-confirm-submit').click()
  await expect(page.getByTestId('plan-result')).toBeVisible({ timeout: 15_000 })
  expect(confirmRequests, '관리자 1회 동작 = 확정 요청 1건').toHaveLength(1)
  const sent = JSON.parse(confirmRequests[0])
  expect(sent.bulk).toBe(true)
  expect(typeof sent.expectedDraftVersion).toBe('number')
  // 관리자가 고친 값(10)이 AI 값으로 덮이지 않았다
  expect(JSON.stringify(sent)).toContain('"value":10')
  const published = await (await request.get(student, { headers: studentHeaders })).json()
  expect(published.confirmedFields.length, '확정 후 학생에게는 확정값만').toBe(total)
  // 같은 Revision 다시 한 번에 확정은 서버가 막는다(재검토 시작 전)
  const again = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review`, { headers: ADMIN_HEADERS, data: { ...sent } })
  expect(again.status()).toBe(409)

  // A28 §5 TEST-06: 결과 화면 '확정 내용 수정' → 확정값으로 채운 수정 초안 → 1개만 수정 → 재수정 중 학생은 이전 확정본 → 최종 승인 → 최신값 · 이력 보존
  await page.getByTestId('plan-result-edit-confirmed').click()
  await page.getByTestId('plan-result-edit-confirmed-start').click()
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('review-rereview-badge')).toBeVisible({ timeout: 15_000 })
  const during = await (await request.get(student, { headers: studentHeaders })).json()
  expect(during.confirmedFields, '재수정 중 학생 공개값 그대로').toEqual(published.confirmedFields)
  await page.getByTestId('review-step-performance-tab').click()
  const row = page.getByTestId('review-field').filter({ has: page.getByTestId('review-field-edit') }).first()
  const path = await row.getAttribute('data-field-path')
  await row.getByTestId('review-field-edit').click()
  const before = await page.getByTestId('review-field-input').inputValue()
  const after = before === '11' ? '12' : '11'
  await page.getByTestId('review-field-input').fill(after)
  await page.getByTestId('review-field-page').fill('1')
  await page.getByTestId('review-field-apply').click()
  await expect(page.getByTestId('review-draft-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })
  await page.getByTestId('review-step-confirm-tab').click()
  await page.getByTestId('review-local-pdf').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes })
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-confirm-next').click()
  if (await page.getByTestId('review-partial-ack').count()) await page.getByTestId('review-partial-ack').check()
  await page.getByTestId('review-confirm-next').click()
  await page.getByTestId('review-attest').check()
  await expect(page.getByTestId('bulk-confirm')).toContainText('수정 내용 최종 승인')
  await expect(page.getByTestId('bulk-confirm-blockers')).toHaveCount(0)
  await page.getByTestId('bulk-confirm-submit').click()
  await expect(page.getByTestId('plan-result')).toBeVisible({ timeout: 15_000 })
  const republished = await (await request.get(student, { headers: studentHeaders })).json()
  const changed = republished.confirmedFields.find((field: { fieldPath: string; subjectId: string }) => field.fieldPath === path && field.subjectId === 'subj_02')
  expect(String(changed?.value), '학생에게 최신 확정값').toBe(after)
  expect(republished.confirmedFields.length, '수정하지 않은 값 보존').toBe(published.confirmedFields.length)
  const history = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/reviews`, { headers: ADMIN_HEADERS })).json()
  expect(history.items, '이전 확정 기록 보존 + 새 기록').toHaveLength(2)
  const oldValue = published.confirmedFields.find((field: { fieldPath: string; subjectId: string }) => field.fieldPath === path && field.subjectId === 'subj_02')?.value
  const keptValue = history.items[1].confirmedFields.find((field: { fieldPath: string; subjectId: string }) => field.fieldPath === path && field.subjectId === 'subj_02')?.value
  expect(history.items[1].current).toBe(false)
  expect(String(keptValue), '과거 확정본은 당시 값 그대로').toBe(String(oldValue))
  expect(String(keptValue)).not.toBe(after)
  await page.goto(`${ADMIN}/assessment/analysis/${doc.planId}/revisions/${doc.revisionId}/result?view=history`)
  await expect(page.getByTestId('plan-result-history-row')).toHaveCount(2, { timeout: 15_000 })
  await page.getByTestId('plan-result-history-changes').first().locator('summary').click()
  await expect(page.getByTestId('plan-result-history-change').first()).toContainText(`→ ${after}`)
  await page.screenshot({ path: 'test-results/a28-reconfirm-history-1600.png' })
})
