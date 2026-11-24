import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API, PLANS, STUDENT, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { linkSubjectThenTeaching } from '../reviewUi.ts'

// A14 운영계획 관리자 직접 추가 행 — 실제 화면 조작 E2E. 일회용 DB의 실제 Backend·Storage(분석기만 Stub 합성 0.3 결과: 과목 1개·후보 9행).
// A: 최초 확정 전 새 행 추가 · B: 재검토 중 추가 행 수정 + 새 행 · C: 추가 행 제외 → 복원 · D: 잘못된 입력·권한·충돌.
const studentHeaders = { 'X-Assessment-Student-Id': 'stu_001' }
const operator = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

type StudentRow = { rowKey: string; unit: string | null; month: number | null; weekFrom: number | null; pdfPageNumber: number | null }
const studentRows = async (request: APIRequestContext, planId: string): Promise<StudentRow[]> =>
  (await (await request.get(`${API}/api/student/assessment/evaluation-plans/${planId}/teaching-plan`, { headers: studentHeaders })).json()).rows

async function openTeachingStep(page: Page, planId: string, revisionId: string) {
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${planId}/revisions/${revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByTestId('teaching-plan-row').first()).toBeVisible({ timeout: 15_000 })
}

async function fillManual(page: Page, values: { month?: string; week?: string; unit: string; content?: string; page?: string; precision?: string }) {
  const form = page.getByTestId('teaching-plan-manual-form')
  if (values.precision) await form.getByTestId('manual-precision').selectOption(values.precision)
  if (values.month) await form.getByTestId('manual-month-from').selectOption(values.month)
  if (values.week) await form.getByTestId('manual-week-from').fill(values.week)
  await form.getByTestId('manual-unit').fill(values.unit)
  if (values.content !== undefined) await form.getByTestId('manual-content').fill(values.content)
  if (values.page !== undefined) await form.getByTestId('manual-page').fill(values.page)
}

const savedDraft = (page: Page) => expect(page.getByTestId('teaching-plan-status')).toContainText('서버에 임시 저장됨', { timeout: 15_000 })

test('A·B·C: 새 행 추가 → 새로고침 유지 → 확정 → 재검토 수정·추가 → 재확정 → 제외 → 복원, 학생은 확정본만·이력은 버전별 보존', async ({ page, request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-contract03-manual-${tag}.pdf`, uniquePdf(tag))
  const unit1 = `세포 분열 ${tag}`
  await openTeachingStep(page, doc.planId, doc.revisionId)
  const rows = page.getByTestId('teaching-plan-row')
  // A27-UX [02]: 과목 연결은 2단계 과목 확인에서 한다
  await linkSubjectThenTeaching(page, 0, 'subj_02')
  await rows.nth(0).getByRole('button', { name: '확인' }).click()
  await rows.nth(1).getByRole('button', { name: '확인' }).click()
  await savedDraft(page)

  // A — 최초 확정 전 새 행 추가 (분석 결과에 없던 행)
  await page.getByTestId('teaching-plan-manual-add-0').click()
  await fillManual(page, { month: '10', week: '3', unit: unit1, content: '관리자가 원문에서 확인한 누락 행', page: '1' })
  await page.getByTestId('manual-save').click()
  const manual = page.getByTestId('teaching-plan-manual-row')
  await expect(manual).toHaveCount(1, { timeout: 15_000 })
  await expect(manual.first()).toContainText('관리자 추가')
  await expect(manual.first()).toContainText(unit1)
  await expect(manual.first()).toContainText('관리자 확인 1쪽')
  // 초안 단계: 학생에게 없음
  expect((await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: studentHeaders })).status()).toBe(404)
  // 새로고침 뒤에도 후보 결정 2행 + 추가 행 1행
  await page.reload()
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByTestId('teaching-plan-manual-row')).toHaveCount(1, { timeout: 15_000 })
  await expect(page.getByTestId('teaching-plan-row').nth(0)).toHaveAttribute('data-decision', 'confirmed')
  await expect(page.getByTestId('teaching-plan-row').nth(1)).toHaveAttribute('data-decision', 'confirmed')
  // A28-31: 후보 9행 기본 포함 + 관리자 추가 1행
  await expect(page.getByTestId('teaching-plan-confirm')).toContainText('공개 10행')
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-status')).toContainText('확정됨', { timeout: 15_000 })
  const v1 = await studentRows(request, doc.planId)
  expect(v1.length).toBe(10)
  const m1 = v1.find((row) => row.unit === unit1)
  expect(m1?.rowKey).toMatch(/^manual_/)
  expect(m1).toMatchObject({ month: 10, weekFrom: 3, pdfPageNumber: 1 })
  await page.screenshot({ path: 'test-results/a14-manual-confirmed-1536.png', fullPage: true })

  // B — 재검토: 기존 추가 행 수정 + 새 행 추가 → 2차
  await page.getByTestId('teaching-plan-rereview-start').click()
  await page.getByTestId('teaching-plan-rereview-confirm').click()
  await expect(page.getByTestId('teaching-plan-rereview-badge')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('teaching-plan-manual-row').first().getByRole('button', { name: '수정' }).click()
  await page.getByTestId('manual-unit').fill(`${unit1} 수정`)
  await page.getByTestId('manual-save').click()
  await expect(page.getByTestId('teaching-plan-manual-row').first()).toContainText(`${unit1} 수정`, { timeout: 15_000 })
  await page.getByTestId('teaching-plan-manual-add-0').click()
  await fillManual(page, { precision: 'MONTH', month: '11', unit: `생식세포 ${tag}` })
  await page.getByTestId('manual-save').click()
  await expect(page.getByTestId('teaching-plan-manual-row')).toHaveCount(2, { timeout: 15_000 })
  expect((await studentRows(request, doc.planId)).map((row) => row.unit)).toContain(unit1) // 재검토 중 학생은 1차 그대로
  await expect(page.getByTestId('teaching-plan-confirm')).toContainText('다시 승인')
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-history-item')).toHaveCount(2, { timeout: 15_000 })
  const v2 = await studentRows(request, doc.planId)
  expect(v2.map((row) => row.unit)).toEqual(expect.arrayContaining([`${unit1} 수정`, `생식세포 ${tag}`]))
  expect(v2.map((row) => row.unit)).not.toContain(unit1)
  expect(v2.find((row) => row.unit === `${unit1} 수정`)?.rowKey).toBe(m1?.rowKey) // 같은 행 키로 추적
  // 1차 이력은 원래 값 그대로
  await page.getByTestId('teaching-plan-history-item').nth(1).getByTestId('teaching-plan-history-toggle').click()
  const v1Rows = page.getByTestId('teaching-plan-history-rows')
  await expect(v1Rows).toContainText('관리자 추가')
  await expect(v1Rows).toContainText(unit1)
  await expect(v1Rows).not.toContainText(`${unit1} 수정`)

  // C — 추가 행 제외 → 3차(학생 미공개) → 복원 → 4차(학생 공개)
  await page.getByTestId('teaching-plan-rereview-start').click()
  await page.getByTestId('teaching-plan-rereview-confirm').click()
  await expect(page.getByTestId('teaching-plan-rereview-badge')).toBeVisible({ timeout: 15_000 })
  const second = page.getByTestId('teaching-plan-manual-row').filter({ hasText: `생식세포 ${tag}` })
  await second.getByTestId('teaching-plan-manual-toggle').click()
  await expect(second).toHaveAttribute('data-status', 'EXCLUDED', { timeout: 15_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-history-item')).toHaveCount(3, { timeout: 15_000 })
  expect((await studentRows(request, doc.planId)).map((row) => row.unit)).not.toContain(`생식세포 ${tag}`)
  await page.getByTestId('teaching-plan-rereview-start').click()
  await page.getByTestId('teaching-plan-rereview-confirm').click()
  await expect(page.getByTestId('teaching-plan-rereview-badge')).toBeVisible({ timeout: 15_000 })
  const restored = page.getByTestId('teaching-plan-manual-row').filter({ hasText: `생식세포 ${tag}` })
  await expect(restored).toHaveAttribute('data-status', 'EXCLUDED')
  await restored.getByTestId('teaching-plan-manual-toggle').click()
  await expect(restored).toHaveAttribute('data-status', 'INCLUDED', { timeout: 15_000 })
  await page.getByTestId('teaching-plan-confirm').click()
  await expect(page.getByTestId('teaching-plan-history-item')).toHaveCount(4, { timeout: 15_000 })
  const v4 = await studentRows(request, doc.planId)
  expect(v4.map((row) => row.unit)).toEqual(expect.arrayContaining([`${unit1} 수정`, `생식세포 ${tag}`]))
  expect(JSON.stringify(v4)).not.toContain('MANUAL')
  expect(JSON.stringify(v4)).not.toContain('versionNo')
  await page.screenshot({ path: 'test-results/a14-manual-history-1536.png', fullPage: true })

  // 관리자 이력: 버전별 추가 행 결정 (4: 공개, 3: 제외, 2: 공개, 1: 없음)
  const history = await (await request.get(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-reviews`, { headers: operator })).json()
  const decisionOf = (version: number) => history.items.find((item: { versionNo: number }) => item.versionNo === version).rows.find((row: { row: { unit: string } }) => row.row.unit === `생식세포 ${tag}`)?.decision
  expect([decisionOf(4), decisionOf(3), decisionOf(2), decisionOf(1)]).toEqual(['CONFIRMED', 'EXCLUDED', 'CONFIRMED', undefined])

  // 학생 Monthly Planner 화면
  await page.goto(`${STUDENT}/assessment/monthly-plan`)
  await expect(page.getByTestId('student-monthly-plan').first()).toBeVisible({ timeout: 15_000 })
})

test('D: 빈 필수값·범위 밖 쪽은 화면에서 막고, 서버도 잘못된 입력·오래된 초안 version·인증 없음을 거절하며 값을 바꾸지 않는다', async ({ page, request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-contract03-manual-invalid-${tag}.pdf`, uniquePdf(tag))
  await openTeachingStep(page, doc.planId, doc.revisionId)
  await page.getByTestId('teaching-plan-manual-add-0').click()
  // 빈 필수값 — 저장 요청 없이 안내
  await page.getByTestId('manual-save').click()
  const form = page.getByTestId('teaching-plan-manual-form')
  await expect(form).toContainText('단원·학습 내용·특별 일정 중 하나는 적어 주세요.')
  await expect(form).toContainText('이 시기 단위에는 시작 월이 필요해요.')
  // 문서 쪽 수(2) 밖 · 주차 거꾸로
  await fillManual(page, { month: '9', week: '4', unit: `누락 단원 ${tag}`, page: '9' })
  await form.getByTestId('manual-week-to').fill('2')
  await page.getByTestId('manual-save').click()
  await expect(form).toContainText('원문 쪽은 1~2 사이로 적어 주세요.')
  await expect(form).toContainText('끝 주차가 시작 주차보다 앞설 수 없어요.')
  await expect(page.getByTestId('teaching-plan-manual-row')).toHaveCount(0)
  // 고친 뒤 저장 — 입력값은 그대로 남아 있었다
  await expect(form.getByTestId('manual-unit')).toHaveValue(`누락 단원 ${tag}`)
  await form.getByTestId('manual-page').fill('2')
  await form.getByTestId('manual-week-to').fill('')
  await page.getByTestId('manual-save').click()
  await expect(page.getByTestId('teaching-plan-manual-row')).toHaveCount(1, { timeout: 15_000 })

  // 서버 검증 (화면 우회)
  const draftPath = `${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-draft`
  const draft = await (await request.get(draftPath, { headers: operator })).json()
  const version = draft.draft.version as number
  const rowKey = draft.draft.manualRows[0].rowKey as string
  const body = (row: Record<string, unknown>, baseVersion: number | null = version) => ({ analysisId: doc.analysisId, baseVersion, row: { subjectIndex: 0, status: 'INCLUDED', unit: 'x', schedule: { precision: 'MONTH', monthFrom: 9 }, ...row } })
  expect((await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ unit: '', content: '' }) })).status()).toBe(400)
  expect((await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ schedule: { precision: 'MONTH', monthFrom: 13 } }) })).status()).toBe(400)
  expect((await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ schedule: { precision: 'TERM_WEEK', weekFrom: 30 } }) })).status()).toBe(400)
  expect((await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ subjectIndex: 3 }) })).status()).toBe(400)
  expect((await request.put(`${draftPath}/manual-rows/${rowKey}`, { headers: operator, data: body({ unit: '덮어쓰기' }, version + 5) })).status()).toBe(409)
  expect((await request.put(`${draftPath}/manual-rows/manual_ffffffffffffffff`, { headers: operator, data: body({}) })).status()).toBe(404)
  expect((await request.post(`${draftPath}/manual-rows`, { data: body({}) })).status()).toBe(401)
  // 같은 생성 요청 두 번(중복 클릭) → 두 번째 409
  const first = await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ unit: `중복 ${tag}` }) })
  expect(first.status()).toBe(200)
  expect((await request.post(`${draftPath}/manual-rows`, { headers: operator, data: body({ unit: `중복 ${tag}` }) })).status()).toBe(409)
  const after = await (await request.get(draftPath, { headers: operator })).json()
  expect(after.draft.manualRows.map((row: { unit: string }) => row.unit)).toEqual([`누락 단원 ${tag}`, `중복 ${tag}`])
  // 학생에게는 확정 전이라 보이지 않는다
  expect((await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}/teaching-plan`, { headers: studentHeaders })).status()).toBe(404)
})
