import { expect, test } from '@playwright/test'
import { expectOfficialSlotMatchesServer, ADMIN, API, STUDENT, STUDENT_ID, confirmEvaluation, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'
import { pickStudentSubject } from '../studentUi.ts'

// A27-UX 관리자·학생 재설계 흐름 (일회용 DB · 실제 Backend · 분석기 Stub 합성 결과).
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }
const devText = /개발 서버|개발용 Mock|Mock 인증|adm_demo|stu_demo|adm_plan_operator|stu_001|실제 LearnersHigh 연동 전/

test('관리자: 상단 탭 8개 순서 · 개발 문구 없음 · 전체 현황 Dashboard', async ({ page }) => {
  await page.goto(`${ADMIN}/assessment`)
  const tabs = page.getByRole('navigation', { name: 'Assessment 관리 메뉴' }).getByRole('button')
  await expect(tabs).toHaveText(['전체 현황', '학생 Assessment', '피드백 관리', '평가계획서', '분석', '월별 운영계획', '심화 콘텐츠', '관리자 참고자료실'].map((label) => new RegExp(`^${label}`)))
  await expect(page.getByTestId('overview-kpis')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('overview-calendar')).toBeVisible()
  await expect(page.getByTestId('overview-recent')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(devText)
  await expect(page.getByTestId('dev-context-switcher')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a27-admin-overview-1600.png', fullPage: true })
})

test('관리자: 평가계획서 6칸 → 분석하기 → 분석 탭(문서 선택) · 확정 결과 조회는 읽기 전용 · 새로고침 유지', async ({ page, request }) => {
  const tag = runTag()
  const doc = await registerAndAnalyze(request, 2026, `e2e-a27-${tag}.pdf`, uniquePdf(tag))

  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 15_000 })
  for (const grade of [1, 2, 3]) for (const semester of [1, 2]) await expect(page.getByTestId(`plan-slot-${grade}-${semester}`)).toBeVisible()
  const card = page.getByTestId('plan-slot-1-2').getByTestId('plan-slot-doc').filter({ hasText: doc.fileName })
  await expect(card).toBeVisible()
  await expect(card.getByTestId('plan-slot-stage')).toContainText('AI 결과')
  // 계정 B: 칸 안에서 원본 바로 보기 · 개정 이력 상세
  await card.getByTestId('plan-slot-open').click()
  await expect(page.getByTestId('plan-slot-preview')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('plan-slot-preview')).toHaveCount(0)
  await card.getByTestId('plan-slot-history-toggle').click()
  await expect(card.getByTestId('plan-slot-history-row')).toHaveCount(1)
  await expect(card.getByTestId('plan-slot-history-row').first()).toContainText('v1')
  await card.getByTestId('plan-slot-analyze').click()
  await expect(page).toHaveURL(/\/assessment\/analysis\?.*plan=/)
  const row = page.getByTestId('plan-row').filter({ hasText: doc.fileName })
  await expect(row).toHaveAttribute('data-selected', 'true')
  // 이미 분석된 문서는 '분석 시작'이 아니라 검토·결과 보기만 보인다(분석기 중복 호출 방지)
  await expect(row.getByTestId('plan-analyze-button')).toHaveCount(0)

  // AI 결과 · 미확정 조회
  await row.getByTestId('plan-open-result').click()
  await expect(page.getByTestId('plan-result-stage')).toContainText('AI 결과')
  await expect(page.getByTestId('plan-result-review')).toBeVisible()
  // 계정 B: 왼쪽 원문 고정 2패널 + 검토 진행률(초안 없음 = 결정 0개)
  await expect(page.getByTestId('review-source-pane')).toBeVisible()
  await expect(page.getByTestId('plan-result-panel')).toBeVisible()
  await expect(page.getByTestId('plan-result-decided')).toHaveText('0개')

  // 확정 뒤: 같은 주소가 확정 결과를 읽기 전용으로 보여 준다
  await confirmEvaluation(request, doc, 'subj_02', [{ fieldPath: 'performanceEvaluation.weightPercent', value: 60, pdfPageNumber: 1 }])
  await page.reload()
  await expect(page.getByTestId('plan-result-stage')).toContainText('확정 완료', { timeout: 15_000 })
  await expect(page.getByTestId('plan-result-review')).toHaveCount(0)
  await expect(page.getByTestId('plan-result-panel').locator('input:not([type=hidden]), textarea, [type=checkbox]')).toHaveCount(0)
  await expect(page.getByTestId('review-source-pane')).toBeVisible()
  // 계정 B: AI 후보 ↔ 관리자 검토값 ↔ 최종 확정값 비교 · 새로고침 뒤 같은 보기 유지
  await page.getByTestId('plan-result-compare-tab').click()
  const compared = page.getByTestId('plan-result-compare-row').filter({ hasText: '수행평가 반영 비율' }).first()
  await expect(compared).toContainText('60')
  await page.reload()
  await expect(page.getByTestId('plan-result-compare')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('plan-result-compare-filter-unreviewed').click()
  await expect(page.getByTestId('plan-result-compare-row').filter({ hasText: '수행평가 반영 비율' })).toHaveCount(0)
  await page.getByTestId('plan-result-history-tab').click()
  await expect(page.getByTestId('plan-result-history-row').first()).toContainText('학생 공개 중')
  await expect(page.locator('body')).not.toContainText(/subj_02/)
  // 확정 이력은 내부 관리자 계정 ID 대신 '관리자'로 보인다
  await expect(page.getByTestId('plan-result-history-row').first()).toContainText('관리자')
  await expect(page.locator('body')).not.toContainText(/\badm_[a-z0-9_]+/)
  // 캡처는 원문 PDF·운영계획 읽기가 끝난 뒤에
  await expect(page.getByText('PDF를 불러오는 중')).toHaveCount(0, { timeout: 15_000 })
  await page.screenshot({ path: 'test-results/a27-admin-result-1600.png', fullPage: true })
})

test('학생: AI 도우미 없음 · 공식 원본 3개년(확인되지 않음) · 개인 수행평가 상세 입력 · 되돌리기 · 자료 찾기', async ({ page, request }) => {
  await page.goto(`${STUDENT}/assessment`)
  await expect(page.getByTestId('home-official-plans')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('home-official-slot')).toHaveCount(3)
  // A27-UX 부록 K: 공식 원본 칸 = 서버 §10-1-3(학교알리미 수집 원본)
  await expectOfficialSlotMatchesServer(page, request)
  await expect(page.locator('body')).not.toContainText(/AI 도우미|주제명 추천/)
  await expect(page.locator('body')).not.toContainText(devText)

  const title = `E2E A27 ${runTag()}`
  await page.getByRole('button', { name: '수행평가 추가' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/수행평가 이름/).fill(title)
  await pickStudentSubject(dialog, '통합과학2')
  await dialog.locator('label').filter({ hasText: '보고서' }).first().click()
  await dialog.getByTestId('field-evaluation-date').fill('2026-12-10')
  await dialog.getByTestId('field-deadline-date').fill('2026-12-08')
  await dialog.getByTestId('field-weight').fill('101')
  await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled()
  await dialog.getByTestId('field-weight').fill('0')
  // A27-UX 학생: 제출물은 독립 Section의 선택 목록 + 기타 직접 입력
  await dialog.getByTestId('field-submission-choice').selectOption('기타')
  await dialog.getByTestId('field-submission-custom').fill('보고서 1부')
  await dialog.getByTestId('field-memo').fill('개인 메모')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })

  const list = await (await request.get(`${API}/api/student/assessment/school-assessments`, { headers: studentHeaders, params: { academicYear: '2026', semester: '2', page: '0', size: '100' } })).json()
  const created = list.items.find((item: { title: string }) => item.title === title)
  expect(created).toMatchObject({ assessmentType: 'REPORT', evaluationDate: '2026-12-10', deadlineDate: '2026-12-08', weightPercent: 0, submissions: '보고서 1부', personalMemo: '개인 메모' })

  await page.goto(`${STUDENT}/assessment/school-assessments/${created.assessmentId}`)
  await expect(page.getByText('보고서 1부')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#detail-side-panel')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/정보 출처|담당 선생님|주제명 추천/)
  const status = page.getByLabel(`${title} 진행 상태`)
  await status.selectOption('COMPLETED')
  await expect(status).toHaveValue('COMPLETED', { timeout: 15_000 })
  await status.selectOption('IN_PROGRESS')
  await page.reload()
  await expect(page.getByLabel(`${title} 진행 상태`)).toHaveValue('IN_PROGRESS', { timeout: 15_000 })

  await page.getByTestId('open-find-resources').click()
  await expect(page.getByTestId('find-resources-modal')).toBeVisible()
  // 계정 B: 자료 유형 필터 · 이 수행평가 노트에 연결된 자료
  await expect(page.getByTestId('resource-type-filter')).toBeVisible()
  await expect(page.getByTestId('resource-linked')).toContainText('연결된 자료 0개', { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await page.getByTestId('open-feedback').click()
  await expect(page.getByTestId('feedback-modal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('detail-criteria')).toBeVisible()
  await page.screenshot({ path: 'test-results/a27-student-detail-1600.png', fullPage: true })
})

test('학생: 탐구노트 인라인 서식(굵게·링크) → 저장 → 새로고침 뒤 같은 서식 · 되돌리기', async ({ page, request }) => {
  const tag = runTag()
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, { headers: studentHeaders, data: { title: `E2E 서식 ${tag}`, subjectId: 'subj_02', academicYear: 2026, semester: 2 } })
  expect(created.status()).toBe(201)
  const assessmentId = (await created.json()).assessmentId as string
  const notes = async () => (await (await request.get(`${API}/api/student/assessment/notes`, { headers: studentHeaders, params: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId } })).json()).items
  await page.goto(`${STUDENT}/assessment/school-assessments/${assessmentId}`)
  await page.getByPlaceholder('노트 제목').fill(`서식 노트 ${tag}`)
  const body = page.getByLabel('노트 본문').locator('textarea').first()
  await body.fill('굵은 글과 자료 링크')
  await body.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 2))
  await page.keyboard.press('Control+b')
  // 되돌리기·다시 하기에도 서식이 따라간다
  await page.getByTestId('note-undo').click()
  await page.getByTestId('note-redo').click()
  await body.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(6, 11)
  })
  await page.getByTestId('note-format-link').click()
  await page.getByTestId('note-link-input').fill('https://example.org/source')
  await page.getByTestId('note-link-save').click()
  await page.getByPlaceholder('노트 제목').click()
  const rich = page.getByTestId('note-rich-block').first()
  await expect(rich.locator('strong')).toHaveText('굵은')
  await expect(rich.locator('[data-inline-link]')).toHaveText('자료 링크')
  await page.getByTestId('note-save-now').click()
  await expect.poll(async () => JSON.stringify((await notes())[0]?.blocks ?? []), { timeout: 15_000 }).toContain('"marks"')
  const saved = (await notes())[0].blocks[0]
  expect(saved.text).toBe('굵은 글과 자료 링크')
  expect(saved.attrs.marks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'bold', start: 0, end: 2 }), expect.objectContaining({ type: 'link', start: 6, end: 11, href: 'https://example.org/source' })]))
  await page.reload()
  await expect(page.getByTestId('note-rich-block').first().locator('strong')).toHaveText('굵은', { timeout: 15_000 })
  await page.screenshot({ path: 'test-results/a27-student-note-format-1600.png', fullPage: true })
})

test('학생 Home: 내가 등록한 수행평가(날짜 있음)와 학교 공개 수행평가(날짜 미정)를 함께 보여 준다', async ({ page, request }) => {
  const tag = runTag()
  // 화면의 D-day는 브라우저 지역 날짜 기준이다. UTC(toISOString)로 만들면 한국 시각 0~9시에 하루 어긋난다
  const inDays = (days: number) => {
    const date = new Date(Date.now() + days * 86_400_000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, { headers: studentHeaders, data: { title: `E2E 일정 ${tag}`, subjectId: 'subj_02', academicYear: 2026, semester: 2, deadlineDate: inDays(5), evaluationDate: inDays(3) } })
  expect(created.status()).toBe(201)
  const doc = await registerAndAnalyze(request, 2026, `e2e-a27-home-${tag}.pdf`, uniquePdf(tag))
  await confirmEvaluation(request, doc, 'subj_02', [{ fieldPath: 'performanceEvaluation.items[0].label', value: `E2E 공식 ${tag}`, pdfPageNumber: 1 }])
  await page.goto(`${STUDENT}/assessment`)
  await expect(page.getByTestId('home-upcoming-row').filter({ hasText: `E2E 일정 ${tag}` })).toContainText('D-3', { timeout: 15_000 })
  await expect(page.getByTestId('home-upcoming-official')).toContainText(`E2E 공식 ${tag}`, { timeout: 15_000 })
  await expect(page.getByTestId('home-upcoming-official-row').filter({ hasText: `E2E 공식 ${tag}` })).toContainText('미정')
})

test('학생: 자료함 GIF 첨부 → 새로고침 뒤에도 유지 · 내려받기 · 빼기', async ({ page }) => {
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x3b])
  await page.goto(`${STUDENT}/assessment/resources`)
  await page.getByRole('button', { name: /자료 추가/ }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('label').filter({ hasText: '이미지' }).click()
  await dialog.getByTestId('resource-file-input').setInputFiles({ name: '움직이는 그래프.gif', mimeType: 'image/gif', buffer: gif })
  await expect(dialog.getByTestId('resource-file-selected')).toContainText('움직이는 그래프.gif')
  await dialog.getByTestId('resource-save').click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByTestId('resource-file')).toContainText('움직이는 그래프.gif', { timeout: 15_000 })
  await page.reload()
  await expect(page.getByTestId('resource-file')).toContainText('움직이는 그래프.gif', { timeout: 15_000 })
  const download = page.waitForEvent('download')
  await page.getByTestId('resource-file-download').click()
  expect((await download).suggestedFilename()).toContain('.gif')
  page.once('dialog', (confirmDialog) => confirmDialog.accept())
  await page.getByTestId('resource-file-remove').click()
  await expect(page.getByTestId('resource-file')).toContainText('첨부 파일 없음', { timeout: 15_000 })
})

// A27-UX 계정 B 2차: 관리자 참고자료실 스크랩 Modal — 작은 화면에서도 Modal이 화면 밖으로 나가지 않고, 관련 심화 Task 입력 없음
for (const [width, height] of [[1366, 768], [1920, 1080], [800, 600]] as const) {
  test(`관리자 참고자료실 Modal ${width}x${height}: Modal이 화면 안에 들어옴 · 가로 넘침 없음 · 심화 Task 입력 없음`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto(`${ADMIN}/assessment/references`)
    await page.getByRole('button', { name: '링크 직접 저장' }).click()
    const dialog = page.getByRole('dialog', { name: '링크 직접 저장' })
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText(/심화 Task|관련 Task/)
    const box = await dialog.boundingBox()
    expect(box, 'Modal 위치').not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, '가로 넘침').toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/a27-admin-scrap-modal-${width}.png` })
  })
}

// PART 22 해상도별 확인: 가로 스크롤 없음 + 화면 캡처(보고서 Before/After용)
for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
  test(`해상도 ${width}x${height}: 관리자·학생 주요 화면 가로 넘침 없음`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const pages = [
      ['admin-overview', `${ADMIN}/assessment`],
      ['admin-plans', `${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`],
      ['admin-analysis', `${ADMIN}/assessment/analysis?school=school_001&year=2026`],
      ['admin-monthly', `${ADMIN}/assessment/monthly-plan?school=school_001&year=2026&grade=1&semester=2`],
      ['student-home', `${STUDENT}/assessment`],
      ['student-references', `${STUDENT}/assessment/reference-links`],
      ['student-enrichment', `${STUDENT}/assessment/enrichment`],
      ['student-mock-exams', `${STUDENT}/assessment/enrichment/mock-exams`],
      ['student-universities', `${STUDENT}/assessment/enrichment/universities`],
    ] as const
    for (const [name, url] of pages) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
      await page.screenshot({ path: `test-results/a27-${name}-${width}.png`, fullPage: true })
    }
  })
}

// A27-UX 심화 콘텐츠 상세: 모의고사 자료·대학별 자료 첫 항목 상세도 가로 넘침 없이 열린다 (색상 정리 화면 캡처)
test('학생 심화 콘텐츠 상세(모의고사·대학별 자료) 1600: 가로 넘침 없음 · 개발 문구 없음', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  for (const [name, list, pattern] of [
    ['student-mock-exam-detail', `${STUDENT}/assessment/enrichment/mock-exams`, /\/enrichment\/mock-exams\/[^/?#]+/],
    ['student-university-detail', `${STUDENT}/assessment/enrichment/universities`, /\/enrichment\/universities\/[^/?#]+/],
  ] as const) {
    await page.goto(list)
    await page.waitForLoadState('networkidle')
    const hrefs = await page.locator('main a[href]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''))
    const target = hrefs.find((href) => pattern.test(href))
    expect(target, `${name}: 목록에 상세 링크가 있어야 한다`).toBeTruthy()
    await page.goto(new URL(target!, list).toString())
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(devText)
    await expect(page.locator('body')).not.toContainText(/ASSESSMENT_[A-Z_]+|개발 PC|개발 환경 폴더/)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/a27-${name}-1600.png`, fullPage: true })
  }
})
