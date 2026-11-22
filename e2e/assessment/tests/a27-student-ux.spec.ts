import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { expectOfficialSlotMatchesServer, ADMIN_ID, API, PLANS, STUDENT, STUDENT_ID, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { pickStudentSubject } from '../studentUi.ts'

// A27-UX 학생 화면 개선 (2026-11-19, 참고 이미지 01~12). 일회용 DB(tmpfs MySQL) · 실제 Backend · Stub 분석기 · 합성 문서만.
// 캡처: test-results/a27-student-*.png
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }
const admin = { 'X-Assessment-Admin-Id': ADMIN_ID }
const BASE = `${API}/api/student/assessment`
const devText = /개발 서버|개발용 Mock|Mock 인증|adm_demo|stu_demo|adm_plan_operator|stu_001|실제 LearnersHigh 연동 전/
const sizes = [
  [1366, 768],
  [1600, 900],
  [1920, 1080],
  [800, 600],
] as const

/** 브라우저 지역 날짜(YYYY-MM-DD) — 화면 D-day와 같은 기준 */
const inDays = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function createAssessment(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post(`${BASE}/school-assessments`, { headers: studentHeaders, data: { subjectId: 'subj_02', academicYear: 2026, semester: 2, ...data } })
  expect(response.status()).toBe(201)
  return (await response.json()) as { assessmentId: string; subjectId: string; title: string }
}

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('[01~04] 홈: KPI · 바로가기(PDF 없음) · 3개년 공식 원본 · 월간 달력(정확한 날짜 + 주차 기준 임시) · 피드백 · 최근 기록 · 메모 영속', async ({ page, request }) => {
  const tag = runTag()
  const evaluationDay = inDays(2)
  const deadlineDay = inDays(4)
  await createAssessment(request, { title: `E2E 홈 일정 ${tag}`, evaluationDate: evaluationDay, deadlineDate: deadlineDay })
  // 학교 운영계획: 관리자가 '10월 2주' 행(T03)과 9월 날짜 행(T01)을 확정·공개
  const doc = await registerAndAnalyze(request, 2026, `e2e-a27s-contract03-${tag}.pdf`, uniquePdf(`${tag}-plan`))
  const teaching = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/teaching-plan-review`, {
    headers: admin,
    data: { analysisId: doc.analysisId, rows: ['T01', 'T03'].map((rowKey) => ({ subjectIndex: 0, rowKey, subjectId: 'subj_02', decision: 'CONFIRMED' })) },
  })
  expect(teaching.status()).toBe(200)

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment`)
  await expect(page.getByTestId('home-kpis')).toBeVisible({ timeout: 15_000 })
  for (const id of ['kpi-in-progress', 'kpi-urgent', 'kpi-feedback', 'kpi-completed']) await expect(page.getByTestId(id)).toContainText(/\d+(개|건)/, { timeout: 15_000 })
  // 바로가기: 기존 아이콘 그림(svg) 그대로, 학생 PDF 가져오기 없음
  const quick = page.getByRole('list', { name: '바로가기' })
  await expect(quick.getByRole('listitem')).toHaveCount(5)
  await expect(quick.locator('svg')).toHaveCount(5)
  await expect(page.locator('body')).not.toContainText(/PDF 가져오기|PDF로 가져오기|평가계획서 가져오기|AI 도우미/)
  await expect(page.locator('body')).not.toContainText(devText)
  // 공식 원본 3개년(부록 K): 올해 칸 = 서버 §10-1-3, 학적 정보가 없는 해는 따로 구분
  await expect(page.getByTestId('home-official-slot')).toHaveCount(3)
  await expectOfficialSlotMatchesServer(page, request)
  await expect(page.getByTestId('home-official-no-context').first()).toContainText('해당 학년도 학적 정보 없음')
  // A28-01: 학적이 없는 해도 현재 학교의 공개 원본 칸(basis=SCHOOL_PUBLIC)이고 '재학 기록 아님'으로 구분 · 학년·학기 선택
  await expect(page.getByTestId('home-official-slot').nth(1)).toHaveAttribute('data-basis', 'SCHOOL_PUBLIC')
  await expect(page.getByTestId('home-official-slot').nth(1).getByTestId('home-official-public')).toContainText('재학 기록 아님')
  await expect(page.getByTestId('home-official-grade')).toHaveValue('1')
  await page.getByTestId('home-official-grade').selectOption('2')
  await expect(page.getByTestId('home-official-slot').first()).toContainText('고2', { timeout: 15_000 })
  await expect(page.getByTestId('home-official-slot').first().getByTestId('home-official-public')).toContainText('같은 학교 다른 학년')
  await page.getByTestId('home-official-reset').click()
  await expect(page.getByTestId('home-official-slot').first()).toContainText('고1')

  // 달력: 내 평가일·마감은 정확한 날짜 칸
  const calendar = page.getByTestId('home-calendar')
  const evalCell = calendar.locator(`[data-date="${evaluationDay}"]`)
  if ((await evalCell.count()) === 0) await calendar.getByRole('button', { name: '다음 달' }).click()
  await expect(calendar.locator(`[data-date="${evaluationDay}"]`)).toContainText(`E2E 홈 일정 ${tag}`, { timeout: 15_000 })
  await expect(calendar.locator(`[data-date="${evaluationDay}"] [data-kind="evaluation"]`)).toHaveCount(1)
  await expect(calendar.locator(`[data-date="${deadlineDay}"] [data-kind="deadline"]`).filter({ hasText: `E2E 홈 일정 ${tag}` })).toHaveCount(1)
  // 날짜를 누르면 그날 상세
  await calendar.locator(`[data-date="${evaluationDay}"]`).click()
  await expect(page.getByTestId('home-calendar-day-detail')).toContainText(`E2E 홈 일정 ${tag}`)
  await expect(page.getByTestId('home-calendar-day-detail')).toContainText('평가일')
  await page.keyboard.press('Escape')
  // A28-26: 홈 달력에는 '잠정'(주차 임시 배치)이 없다 — '10월 2주' 계획(T03)은 홈 날짜 칸·날짜 미정에 두지 않는다(월별 운영계획 화면에는 그대로)
  await page.goto(`${STUDENT}/assessment`)
  const cal = page.getByTestId('home-calendar')
  await expect(cal).toBeVisible({ timeout: 15_000 })
  for (let guard = 0; guard < 6 && !(await cal.getByRole('heading').textContent())?.includes('10월'); guard++) {
    const prev = cal.getByRole('button', { name: '이전 달' })
    if (await prev.isDisabled()) break
    await prev.click()
  }
  await expect(cal.getByRole('heading')).toContainText('10월')
  await expect(cal.locator('[data-kind="tentative"], [data-tone="tentative"]')).toHaveCount(0)
  await expect(cal).not.toContainText('3. 역학 시스템')
  await expect(cal).not.toContainText('잠정')

  // 다가오는 수행평가: 정확한 날짜만 D-day
  await expect(page.getByTestId('home-upcoming-row').filter({ hasText: `E2E 홈 일정 ${tag}` })).toContainText('D-2')
  // A28-14: 홈의 피드백 요청 현황 카드는 뺐다(답변 대기 수는 KPI 에 그대로)
  await expect(page.getByTestId('home-feedback')).toHaveCount(0)
  await expect(page.getByTestId('kpi-feedback')).toContainText('건')
  await expect(page.getByTestId('home-recent')).toBeVisible()

  // 메모: 저장 → 새로고침 뒤 유지 → 지우기
  const memoText = `이번 주 준비물 ${tag}\n실험 보고서 양식`
  await page.getByTestId('home-memo-edit').click()
  await page.getByTestId('home-memo-input').fill(memoText)
  await page.getByTestId('home-memo-save').click()
  await expect(page.getByTestId('home-memo-body')).toContainText(`이번 주 준비물 ${tag}`, { timeout: 15_000 })
  await page.reload()
  await expect(page.getByTestId('home-memo-body')).toContainText(`이번 주 준비물 ${tag}`, { timeout: 15_000 })
  const memo = await (await request.get(`${BASE}/home-memo`, { headers: studentHeaders })).json()
  expect(memo.body).toBe(memoText)
  // 다른 학생에게는 보이지 않는다
  const other = await (await request.get(`${BASE}/home-memo`, { headers: { 'X-Assessment-Student-Id': 'stu_002' } })).json()
  expect(other.body ?? null).not.toBe(memoText)

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await page.goto(`${STUDENT}/assessment`)
    await expect(page.getByTestId('home-calendar')).toBeVisible({ timeout: 15_000 })
    await noOverflow(page, `home@${width}`)
    await page.screenshot({ path: `test-results/a27-student-home-${width}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.getByTestId('home-memo-clear').click()
  await expect(page.getByTestId('home-memo-edit')).toBeVisible({ timeout: 15_000 })
})

test('[05~08] 목록 8열·기록 수 20(버전 번호 아님)·피드백 수 · 추가 Modal(사이드바에 없는 과목 자동 등록·기타 유형·제출물)', async ({ page, request }) => {
  const tag = runTag()
  // 기록 수 Fixture: 노트 저장 20번(Revision 20개) + 피드백 요청 1건
  const recorded = await createAssessment(request, { title: `E2E 기록 ${tag}`, evaluationDate: inDays(6), deadlineDate: inDays(9), weightPercent: 20, assessmentType: 'REPORT' })
  const created = await (await request.post(`${BASE}/notes`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: recorded.assessmentId, title: `노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: '1' }] } })).json()
  let revisionId = created.revisionId as string
  for (let index = 2; index <= 20; index++) {
    const saved = await request.put(`${BASE}/notes/${created.noteId}`, { headers: studentHeaders, data: { expectedRevisionId: revisionId, title: `노트 ${tag}`, blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: String(index) }] } })
    expect(saved.status()).toBe(200)
    revisionId = (await saved.json()).revisionId
  }
  const revisions = await (await request.get(`${BASE}/notes/${created.noteId}/revisions`, { headers: studentHeaders })).json()
  expect(revisions.items).toHaveLength(20)
  expect((await request.post(`${BASE}/feedback-requests`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: recorded.assessmentId, noteRevisionId: revisionId, artifactVersionIds: [] } })).status()).toBe(201)

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments?q=${encodeURIComponent(`E2E 기록 ${tag}`)}`)
  const row = page.getByTestId('assessment-row').filter({ hasText: `E2E 기록 ${tag}` })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await expect(row.getByTestId('row-record-count')).toHaveText('20', { timeout: 15_000 })
  await expect(row.getByTestId('row-feedback-count')).toHaveText('1')
  // 숫자가 한 줄(줄바꿈 없음) — 이미지 05의 '2/0' 문제
  const box = await row.getByTestId('row-record-count').boundingBox()
  expect(box!.height).toBeLessThan(30)
  await expect(row.getByTestId('row-type')).toHaveText('보고서')
  await expect(row.getByTestId('row-weight')).toHaveText('20%')
  // 열 머리 8개 + 제거된 것
  for (const head of ['수행평가', '평가일', '제출 마감', '평가 유형', '반영 비율', '진행 상태', '기록 수', '피드백 수']) await expect(page.locator('main')).toContainText(head)
  await expect(page.locator('main')).not.toContainText(/정보 출처|정보 추천|PDF로 가져오기/)
  // 상세 노트 버전과 같은 값
  await row.getByRole('link', { name: `E2E 기록 ${tag}`, exact: true }).click()
  await expect(page.locator('#note-heading')).toContainText('v20', { timeout: 15_000 })
  // '수행평가 추가'는 중립 outline (파란 채움 아님)
  await page.goto(`${STUDENT}/assessment/school-assessments`)
  const addButton = page.getByTestId('list-add-assessment')
  await expect(addButton).toBeVisible({ timeout: 15_000 })
  const background = await addButton.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).not.toMatch(/rgb\((4[0-9]|5[0-9]|6[0-9]), (1[0-2][0-9]), (2[2-5][0-9])\)/)
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await page.goto(`${STUDENT}/assessment/school-assessments`)
    await expect(page.getByTestId('assessment-row').first()).toBeVisible({ timeout: 15_000 })
    await noOverflow(page, `list@${width}`)
    await page.screenshot({ path: `test-results/a27-student-list-${width}.png` })
  }

  // 추가 Modal: 사이드바에 없는 학년 과목 후보 → 저장 → 내 과목으로 자동 등록
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments`)
  await page.getByTestId('list-add-assessment').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.screenshot({ path: 'test-results/a27-student-modal-top-1600.png' })
  await dialog.getByLabel(/수행평가 이름/).fill(`E2E 새 과목 ${tag}`)
  const input = dialog.getByTestId('subject-picker-input')
  await input.click()
  await expect(dialog.getByTestId('subject-option-enrolled').first()).toBeVisible()
  await expect(dialog.getByRole('listbox')).not.toContainText(/고등학교|운정|출처|개설 과목|평가계획서 기반/)
  await input.fill('한국사')
  const candidate = dialog.getByTestId('subject-option-candidate').first()
  await expect(candidate).toBeVisible()
  const subjectName = (await candidate.textContent())!.trim()
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue(subjectName)
  await expect(dialog.getByTestId('subject-picker-new-note')).toContainText('내 과목 목록에도 추가')
  // 평가 유형 기타 + 직접 입력, 평가일·마감 서로 다른 날, 비율 범위 오류
  await dialog.locator('label').filter({ hasText: '기타' }).first().click()
  await dialog.getByTestId('field-type-label').fill('모의 면접')
  await dialog.getByTestId('field-evaluation-date').fill(inDays(10))
  await dialog.getByTestId('field-deadline-date').fill(inDays(8))
  await dialog.getByTestId('field-weight').fill('101')
  await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled()
  await dialog.getByTestId('field-weight').fill('100')
  await dialog.getByTestId('field-evaluation-date').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/a27-student-modal-middle-1600.png' })
  await dialog.getByTestId('field-submission-choice').selectOption('기타')
  await dialog.getByTestId('field-submission-custom').fill('포스터와 발표 영상')
  await dialog.getByTestId('field-memo').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/a27-student-modal-bottom-1600.png' })
  for (const [width, height] of [[800, 600]] as const) {
    await page.setViewportSize({ width, height })
    await noOverflow(page, `modal@${width}`)
    await page.screenshot({ path: `test-results/a27-student-modal-${width}.png` })
    await page.setViewportSize({ width: 1600, height: 900 })
  }
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })

  const list = await (await request.get(`${BASE}/school-assessments`, { headers: studentHeaders, params: { academicYear: '2026', semester: '2', query: `E2E 새 과목 ${tag}`, page: '0', size: '20' } })).json()
  const saved = list.items[0]
  expect(saved).toMatchObject({ assessmentType: 'OTHER', assessmentTypeLabel: '모의 면접', weightPercent: 100, submissions: '포스터와 발표 영상', evaluationDate: inDays(10), deadlineDate: inDays(8) })
  const context = await (await request.get(`${BASE}/academic-context`, { headers: studentHeaders, params: { academicYear: '2026', semester: '2' } })).json()
  const added = context.subjects.filter((subject: { name: string }) => subject.name === subjectName)
  expect(added).toHaveLength(1)
  expect(added[0]).toMatchObject({ subjectId: saved.subjectId, addedByStudent: true })
  // 사이드바·목록·상세 같은 과목 이름, 새로고침 뒤에도
  await page.reload()
  await expect(page.getByRole('navigation').getByText(subjectName, { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${saved.assessmentId}`)
  await expect(page.getByTestId('meta-type')).toContainText('모의 면접', { timeout: 15_000 })
  await expect(page.locator('main')).toContainText(subjectName)
  // 같은 이름으로 한 번 더 → 과목은 하나만
  await page.goto(`${STUDENT}/assessment/school-assessments`)
  await page.getByTestId('list-add-assessment').click()
  const again = page.getByRole('dialog')
  await again.getByLabel(/수행평가 이름/).fill(`E2E 새 과목2 ${tag}`)
  await pickStudentSubject(again, subjectName, 'enrolled')
  await again.getByRole('button', { name: '저장' }).click()
  await expect(again).toHaveCount(0, { timeout: 15_000 })
  const after = await (await request.get(`${BASE}/academic-context`, { headers: studentHeaders, params: { academicYear: '2026', semester: '2' } })).json()
  expect(after.subjects.filter((subject: { name: string }) => subject.name === subjectName)).toHaveLength(1)
  // 학교 공통 과목 후보(공식) 목록은 늘지 않는다
  expect(after.catalogSubjects.length).toBe(context.catalogSubjects.length)
})

test('[09] 상세 메타 인라인 편집: 추가·수정·취소·새로고침 유지·서버 실패 원복', async ({ page, request }) => {
  const tag = runTag()
  const item = await createAssessment(request, { title: `E2E 인라인 ${tag}` })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${item.assessmentId}`)
  await expect(page.getByTestId('meta-type-trigger')).toContainText('평가 유형 추가', { timeout: 15_000 })
  await page.screenshot({ path: 'test-results/a27-student-detail-meta-empty-1600.png' })

  // 평가 유형: 기타 + 직접 입력(Enter)
  await page.getByTestId('meta-type-trigger').click()
  await page.getByTestId('inline-type-select').selectOption('OTHER')
  await page.getByTestId('inline-type-label').fill('구술 평가')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-type-trigger')).toHaveText('구술 평가', { timeout: 15_000 })
  // 평가일 / 제출 마감 (서로 다른 날)
  await page.getByTestId('meta-evaluation-date-trigger').click()
  await page.getByTestId('inline-evaluationDate').fill('2026-12-03')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-evaluation-date-trigger')).toContainText('12. 3. (목)', { timeout: 15_000 })
  await page.getByTestId('meta-deadline-trigger').click()
  await page.getByTestId('inline-deadlineDate').fill('2026-12-05')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-deadline-trigger')).toContainText('12. 5. (토)', { timeout: 15_000 })
  // 반영 비율: 선택 → 직접 입력 범위 오류 → 0
  await page.getByTestId('meta-weight-trigger').click()
  await page.getByTestId('inline-weight-select').selectOption('30')
  await expect(page.getByTestId('meta-weight-trigger')).toHaveText('30%', { timeout: 15_000 })
  await page.getByTestId('meta-weight-trigger').click()
  await page.getByTestId('inline-weight-select').selectOption('custom')
  await page.getByTestId('inline-weight-custom').fill('101')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-weight')).toContainText('0~100 사이')
  await page.getByTestId('inline-weight-custom').fill('0')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-weight-trigger')).toHaveText('0%', { timeout: 15_000 })
  // 제출물: 기타 직접 입력
  await page.getByTestId('meta-submissions-trigger').click()
  await page.getByTestId('inline-submission-select').selectOption('기타')
  await page.getByTestId('inline-submission-custom').fill('실험 영상 3분')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('meta-submissions-trigger')).toHaveText('실험 영상 3분', { timeout: 15_000 })
  // Esc 취소는 값을 바꾸지 않는다
  await page.getByTestId('meta-submissions-trigger').click()
  await page.getByTestId('inline-submission-select').selectOption('기타')
  await page.getByTestId('inline-submission-custom').fill('취소될 값')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('meta-submissions-trigger')).toHaveText('실험 영상 3분')

  // 새로고침 뒤에도 같은 값, 서버에도 같은 값
  await page.reload()
  await expect(page.getByTestId('meta-type-trigger')).toHaveText('구술 평가', { timeout: 15_000 })
  await expect(page.getByTestId('meta-weight-trigger')).toHaveText('0%')
  const saved = await (await request.get(`${BASE}/school-assessments/${item.assessmentId}`, { headers: studentHeaders })).json()
  expect(saved).toMatchObject({ assessmentType: 'OTHER', assessmentTypeLabel: '구술 평가', evaluationDate: '2026-12-03', deadlineDate: '2026-12-05', weightPercent: 0, submissions: '실험 영상 3분' })

  // 서버 실패: 값은 되돌아가고 이유·다시 시도
  await page.route('**/api/student/assessment/school-assessments/*', (route) =>
    route.request().method() === 'PATCH' ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL_ERROR', message: '일시적인 오류', details: {} }) }) : route.continue(),
  )
  await page.getByTestId('meta-weight-trigger').click()
  await page.getByTestId('inline-weight-select').selectOption('50')
  await expect(page.getByTestId('meta-weight-error')).toContainText('저장하지 못했어요', { timeout: 15_000 })
  await expect(page.getByTestId('meta-weight-trigger')).toHaveText('0%')
  await page.unroute('**/api/student/assessment/school-assessments/*')
  await page.getByTestId('meta-weight-error').getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByTestId('meta-weight-trigger')).toHaveText('50%', { timeout: 15_000 })
  // 날짜 지우기
  await page.getByTestId('meta-deadline-trigger').click()
  await page.getByTestId('inline-deadlineDate-clear').click()
  await expect(page.getByTestId('meta-deadline-trigger')).toContainText('제출 마감 추가', { timeout: 15_000 })
})

test('[10·11] 상세 5 Section: 안내문 서버 저장 · 공식 원본 · 확정 공개 기준만(AI 후보·분석 요청 없음) · 결과물 · 탐구 노트', async ({ page, request }) => {
  const tag = runTag()
  const label = `E2E 공개 기준 ${tag}`
  const item = await createAssessment(request, { title: label })
  const doc = await registerAndAnalyze(request, 2026, `e2e-a27s-criteria-${tag}.pdf`, uniquePdf(`${tag}-criteria`))
  await confirmEvaluation(request, doc, 'subj_02', [
    { fieldPath: 'performanceEvaluation.weightPercent', value: 40, pdfPageNumber: 1 },
    { fieldPath: 'performanceEvaluation.items[0].label', value: label, pdfPageNumber: 1 },
    { fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 15, pdfPageNumber: 1 },
  ])
  const analysisCalls: string[] = []
  page.on('request', (req) => {
    if (/\/api\/student\/assessment\/evaluation-plans\/[^/]+\/(analysis|analyses)|plan-analysis|\/analysis$/.test(req.url())) analysisCalls.push(req.url())
  })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/school-assessments/${item.assessmentId}`)
  // 다섯 Section 순서와 같은 제목 크기
  const sections = ['detail-notice', 'detail-official-source', 'detail-criteria', 'detail-artifacts', 'detail-note']
  for (const id of sections) await expect(page.getByTestId(id)).toBeVisible({ timeout: 15_000 })
  const sizesOf = await Promise.all(sections.map((id) => page.getByTestId(id).locator('h2').first().evaluate((element) => `${getComputedStyle(element).fontSize}/${getComputedStyle(element).fontWeight}`)))
  expect(new Set(sizesOf).size, `Section 제목 크기·굵기 ${sizesOf.join(', ')}`).toBe(1)
  const tops = await Promise.all(sections.map(async (id) => (await page.getByTestId(id).boundingBox())!.y))
  expect([...tops].sort((a, b) => a - b)).toEqual(tops)

  // 평가 기준: 관리자 확정·공개 값, 같은 이름 항목
  await expect(page.getByTestId('criteria-found')).toContainText('이 수행평가와 이름이 같은 공개 항목', { timeout: 15_000 })
  await expect(page.getByTestId('criteria-found')).toContainText(label)
  await expect(page.getByTestId('criteria-found')).toContainText('15%')
  await expect(page.locator('main')).not.toContainText(/후보 · 확인 필요|AI 쉬운 설명|평가계획서 분석 값/)
  expect(analysisCalls, '학생 화면은 AI 분석을 읽거나 요청하지 않는다').toEqual([])
  // 공식 원본(부록 K): 학교알리미 수집 원본만 — 관리자 직접 등록 문서는 들어오지 않는다
  await expect(page.getByTestId('detail-official-source')).not.toContainText('공식 원본이 아직 확인되지 않았어요', { timeout: 30_000 })
  await expect(page.getByTestId('detail-official-source')).not.toContainText(doc.fileName)

  // 안내문: PDF·PNG 올리기 → 새로고침 유지 → 형식 거절 → 빼기
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex')
  await page.getByTestId('notice-input').setInputFiles({ name: '안내문 1쪽.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByTestId('notice-card')).toHaveCount(1, { timeout: 15_000 })
  await page.getByTestId('notice-input').setInputFiles({ name: '안내문.pdf', mimeType: 'application/pdf', buffer: uniquePdf(`${tag}-notice`) })
  await expect(page.getByTestId('notice-card')).toHaveCount(2, { timeout: 15_000 })
  await page.getByTestId('notice-input').setInputFiles({ name: 'run.exe', mimeType: 'application/octet-stream', buffer: Buffer.from([77, 90, 0, 0]) })
  await expect(page.getByTestId('detail-notice').getByRole('alert')).toContainText('올리지 못했어요', { timeout: 15_000 })
  await page.reload()
  await expect(page.getByTestId('notice-card')).toHaveCount(2, { timeout: 15_000 })
  await expect(page.getByTestId('detail-notice')).not.toContainText('새로고침하면 사라져요')
  await page.screenshot({ path: 'test-results/a27-student-detail-top-1600.png' })
  await page.getByTestId('detail-criteria').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/a27-student-detail-middle-1600.png' })
  await page.getByTestId('detail-note').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/a27-student-detail-bottom-1600.png' })
  await page.getByTestId('notice-card').first().getByRole('button', { name: /빼기/ }).click()
  await expect(page.getByTestId('notice-card')).toHaveCount(1, { timeout: 15_000 })
  const files = await (await request.get(`${BASE}/school-assessments/${item.assessmentId}/notice-files`, { headers: studentHeaders })).json()
  expect(files.items).toHaveLength(1)
  // 다른 학생은 이 안내문을 볼 수 없다
  expect((await request.get(`${BASE}/school-assessments/${item.assessmentId}/notice-files`, { headers: { 'X-Assessment-Student-Id': 'stu_002' } })).status()).toBe(404)

  // 탐구 노트: 한글 입력(조합 없는 insertText) 저장 유지 · 기존 편집기 그대로
  await page.getByPlaceholder('노트 제목').fill(`한글 노트 ${tag}`)
  const body = page.getByLabel('노트 본문').locator('textarea').first()
  await body.click()
  await page.keyboard.insertText('가설: 산성비는 식물 생장을 늦춘다')
  await page.getByTestId('note-save-now').click()
  await expect.poll(async () => JSON.stringify((await (await request.get(`${BASE}/notes`, { headers: studentHeaders, params: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: item.assessmentId } })).json()).items), { timeout: 15_000 }).toContain('가설: 산성비는 식물 생장을 늦춘다')

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await page.reload()
    await expect(page.getByTestId('detail-note')).toBeVisible({ timeout: 15_000 })
    await noOverflow(page, `detail@${width}`)
    await page.screenshot({ path: `test-results/a27-student-detail-${width}.png`, fullPage: true })
  }
})

test('[12] 참고자료: 공식 사이트 열기·찾은 자료 등록은 같은 중립 outline, 검은 채움 없음', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${STUDENT}/assessment/reference-links`)
  const card = page.getByTestId('reference-source-card').first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  const open = card.getByTestId('reference-open-site')
  const add = card.getByTestId('reference-add-found')
  await expect(open).toHaveAttribute('href', /^https?:\/\//)
  await expect(open).toHaveAttribute('target', '_blank')
  const style = (locator: typeof open) => locator.evaluate((element) => {
    const css = getComputedStyle(element)
    return { background: css.backgroundColor, border: css.borderTopColor, height: Math.round(element.getBoundingClientRect().height) }
  })
  const [openStyle, addStyle] = await Promise.all([style(open), style(add)])
  expect(openStyle).toEqual(addStyle)
  expect(openStyle.background).not.toBe('rgb(25, 31, 40)')
  // 선택된 필터는 검정 채움이 아니다
  const pressed = page.locator('button[aria-pressed="true"]').first()
  expect(await pressed.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgb(25, 31, 40)')
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await page.goto(`${STUDENT}/assessment/reference-links`)
    await expect(page.getByTestId('reference-source-card').first()).toBeVisible({ timeout: 15_000 })
    await noOverflow(page, `references@${width}`)
    await page.getByTestId('reference-source-card').first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/a27-student-references-${width}.png` })
  }
})
