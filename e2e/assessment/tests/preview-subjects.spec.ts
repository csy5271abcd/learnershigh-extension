import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, ADMIN_ID, API, PLANS, STUDENT_ID, runTag, uniquePdf } from '../support.ts'

// A10: HWP·HWPX 원문 구조 미리보기(PDF 변환 없음) + 다과목 PDF 확정값의 과목 연결.
// 문서·분석 결과는 모두 합성이다(2099학년도 가상 과목). HWPX 분석 결과는 계정 B 실제 HWPX 판독 Locator를 담은 수신 Fixture다.
// 다과목 PDF 분석 결과는 이 시험이 만든 합성 수신 JSON이다(실제 분석기 결과가 아니다).
const resources = new URL('../../../backend/src/test/resources/assessment/multiformat/', import.meta.url)
const hwpx = readFileSync(new URL('synthetic-plan.hwpx', resources))
const hwp = readFileSync(new URL('synthetic-plan.hwp', resources))
const hwpxImport = readFileSync(new URL('synthetic-plan.hwpx.draft-import.json', resources), 'utf8')
const admin = { 'X-Assessment-Admin-Id': ADMIN_ID }

async function register(request: APIRequestContext, fileName: string, bytes: Buffer) {
  const created = await request.post(PLANS, {
    headers: admin,
    multipart: { file: { name: fileName, mimeType: 'application/octet-stream', buffer: bytes }, schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '2' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  return { planId: plan.planId as string, revisionId: plan.documentRevisionId as string }
}

async function importAnalysis(request: APIRequestContext, doc: { planId: string; revisionId: string }, body: string) {
  const response = await request.post(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/analysis-imports`, { headers: { ...admin, 'Content-Type': 'application/json' }, data: body })
  expect(response.status()).toBe(201)
  return (await response.json()).analysisId as string
}

async function openArchiveDoc(page: import('@playwright/test').Page, fileName: string) {
  await page.goto(`${ADMIN}/assessment/evaluation-plans`)
  await page.getByTestId('open-plan-archive').click()
  await expect(page.getByTestId('plan-archive')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('archive-school').selectOption('school_001')
  await page.getByTestId('archive-years').getByTestId('archive-year-2026').click()
  await page.getByTestId('archive-docs').getByTestId('archive-doc').filter({ hasText: fileName }).click()
  await expect(page.getByTestId('archive-detail').getByRole('heading', { name: fileName })).toBeVisible()
}

test('HWP·HWPX 원문을 앱 안에서 직접 열고, 분석 근거 위치(칸)를 정확히 표시한다', async ({ page, request }) => {
  const tag = runTag()
  const hwpxName = `e2e-structure-hwpx-${tag}.hwpx`
  const hwpName = `e2e-structure-hwp-${tag}.hwp`
  const hwpxDoc = await register(request, hwpxName, hwpx)
  await importAnalysis(request, hwpxDoc, hwpxImport)
  await register(request, hwpName, hwp)

  // HWPX: 수행평가 근거 위치 → 구조 미리보기에서 그 칸만 강조
  await openArchiveDoc(page, hwpxName)
  await expect(page.getByTestId('archive-item-detail')).toContainText('탐구 보고서')
  await page.getByTestId('archive-item-detail').getByTestId('archive-locator-link').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByTestId('structure-viewer')).toBeVisible()
  await expect(dialog.getByTestId('archive-hwp-notice')).toContainText('PDF 변환 없음')
  const focused = dialog.locator('[data-focused="true"]')
  await expect(focused).toHaveCount(1)
  await expect(focused).toHaveText('탐구 보고서')
  await expect(dialog.getByTestId('structure-focus-missing')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/a10-hwpx-locator-1536.png' })
  await dialog.getByRole('button', { name: '닫기' }).last().click()

  // HWP: 분석 없이도 원문 보기 → 병합 칸이 있는 표와 찾기
  await openArchiveDoc(page, hwpName)
  await page.getByTestId('archive-open-original').click()
  const viewer = page.getByRole('dialog').getByTestId('structure-viewer')
  await expect(viewer).toBeVisible()
  await expect(viewer).toHaveAttribute('data-format', 'HWP')
  await expect(viewer.locator('td[colspan="2"]').first()).toContainText('지필평가')
  await viewer.getByTestId('structure-find').fill('40%')
  await expect(viewer.getByTestId('structure-find-count')).toContainText('1 /')
  await expect(viewer.locator('[data-match="current"]')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/a10-hwp-structure-1536.png' })
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `가로 넘침 @${width}`).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/a10-hwp-structure-${width}.png` })
  }

  // API: 원본은 그대로(내려받은 바이트 = 등록 바이트), 학생은 구조 API를 쓸 수 없다
  const hwpxFile = await request.get(`${PLANS}/${hwpxDoc.planId}/revisions/${hwpxDoc.revisionId}/file`, { headers: admin })
  expect(Buffer.compare(Buffer.from(await hwpxFile.body()), hwpx)).toBe(0)
  const asStudent = await request.get(`${PLANS}/${hwpxDoc.planId}/revisions/${hwpxDoc.revisionId}/structure`, { headers: { 'X-Assessment-Student-Id': STUDENT_ID } })
  expect(asStudent.status()).toBe(401)
})

/** 한 PDF에 과목 3개(이름이 비슷한 통합과학2·통합사회2 포함), 과목마다 수행평가 수·채점기준이 다르다 */
function multiSubjectAnalysis(sha: string, pageCount: number) {
  const subject = (name: string, items: number, rubric: string) => ({
    subjectName: name,
    pageRange: { from: 1, to: pageCount },
    writtenEvaluation: { weightPercent: 60, sources: [{ pdfPageNumber: 1 }], exams: [] },
    performanceEvaluation: {
      weightPercent: 40,
      sources: [{ pdfPageNumber: 1 }],
      items: Array.from({ length: items }, (_, i) => ({
        itemKey: `performance_${String(i + 1).padStart(2, '0')}`,
        label: `${name} 수행 ${i + 1}`,
        timing: `${9 + i}월`,
        weightPercent: 10,
        maxScore: 20 + i,
        rubric: [{ element: `${rubric} ${i + 1}`, levels: [{ description: `${name} 기준`, score: 10 }], sources: [{ pdfPageNumber: 1 }] }],
        sources: [{ pdfPageNumber: 1 }],
      })),
    },
    sources: [{ pdfPageNumber: 1 }],
  })
  return JSON.stringify({
    analyzer: { name: 'curriculum-analysis', version: 'v20-e2e' },
    source: { sha256: sha, pageCount },
    status: 'REVIEW_REQUIRED',
    subjects: [subject('통합과학2', 2, '탐구 설계'), subject('통합사회2', 1, '자료 해석'), subject('과학탐구실험2', 3, '실험 안전')],
    warnings: [],
  })
}

test('다과목 PDF: 확정한 과목에만 확정값이 붙고, 새로고침·초안 종료 뒤에도 연결이 유지되며 학생에게 분석 번호는 나가지 않는다', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-multisubject-${tag}.pdf`
  const bytes = uniquePdf(`${tag}-multi`)
  const doc = await register(request, fileName, bytes)
  const detail = await (await request.get(`${PLANS}/${doc.planId}`, { headers: admin })).json()
  const revision = detail.revisions[0]
  const analysisId = await importAnalysis(request, doc, multiSubjectAnalysis(revision.sha256 ?? revision.file.checksum, revision.pageCount ?? revision.file.pageCount))

  // 관리자 확정: 분석 과목 2(과학탐구실험2) → subj_04, 분석 과목 0(통합과학2) → subj_02. 분석 과목 1(통합사회2)은 확정하지 않는다
  const confirm = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review`, {
    headers: admin,
    data: {
      analysisId,
      decision: 'CONFIRM',
      reviewedSubjects: [
        { subjectId: 'subj_04', analysisSubjectIndex: 2, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 35, pdfPageNumber: 1 }] },
        { subjectId: 'subj_02', analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: 45, pdfPageNumber: 1 }] },
      ],
    },
  })
  expect(confirm.status()).toBe(200)

  await openArchiveDoc(page, fileName)
  const subjects = page.getByTestId('archive-subject')
  await expect(subjects).toHaveCount(3)
  const overviewConfirmed = async (index: number) => {
    await subjects.nth(index).click()
    await page.getByTestId('archive-tab-overview').click()
    return page.getByTestId('archive-overview').locator('[data-state="confirmed"]')
  }
  await expect(await overviewConfirmed(0)).toContainText('45%')
  await expect(await overviewConfirmed(1)).toHaveCount(0) // 확정하지 않은 과목은 후보
  await expect(await overviewConfirmed(2)).toContainText('35%')
  // 과목별 수행평가 수가 섞이지 않는다
  await page.getByTestId('archive-tab-performance').click()
  await expect(page.getByTestId('archive-item')).toHaveCount(3)
  await expect(page.getByTestId('archive-rubric')).toContainText('실험 안전 1')

  // 새로고침해도 같은 과목·같은 확정값
  await page.reload()
  await page.getByTestId('archive-tab-overview').click()
  await expect(page.getByTestId('archive-overview').locator('[data-state="confirmed"]')).toContainText('35%')
  await page.screenshot({ path: 'test-results/a10-multisubject-1536.png', fullPage: true })

  // 학생: 자기 과목 확정값만, 관리자용 분석 과목 번호는 없다
  const student = await request.get(`${API}/api/student/assessment/evaluation-plans/${doc.planId}`, { headers: { 'X-Assessment-Student-Id': STUDENT_ID } })
  expect(student.status()).toBe(200)
  const text = await student.text()
  expect(text).not.toContain('analysisSubjectIndex')
  expect(JSON.parse(text).confirmedFields.map((field: { subjectId: string }) => field.subjectId).sort()).toEqual(['subj_02', 'subj_04'])
})

test('검토 Wizard: HWPX 필드 근거 버튼 → 원문 구조의 그 칸 강조, 근거 없는 채점기준은 이유 표시, 구간·확대·구역/표 탐색', async ({ page, request }) => {
  const tag = runTag()
  const doc = await register(request, `e2e-wizard-hwpx-${tag}.hwpx`, hwpx)
  await importAnalysis(request, doc, hwpxImport)

  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('review-step-performance-tab').click()
  // 수행평가 1 선택 → 수행평가명 필드의 HWPX 위치 버튼
  await page.getByTestId('performance-nav-item').filter({ hasText: '탐구 보고서' }).first().click()
  const labelField = page.getByTestId('review-field').filter({ has: page.getByTestId('evidence-locator') }).first()
  await labelField.getByTestId('evidence-locator').first().click()
  const source = page.getByTestId('review-source-pane')
  const viewer = source.getByTestId('structure-viewer')
  await expect(viewer).toBeVisible()
  await expect(viewer.locator('[data-focused="true"]')).toHaveCount(1)
  await expect(viewer.getByTestId('structure-focus-missing')).toHaveCount(0)
  // 다른 필드의 근거로 바꾸면 강조도 옮겨 간다(항상 한 곳)
  const buttons = page.getByTestId('review-step-performance').getByTestId('evidence-locator')
  const total = await buttons.count()
  expect(total).toBeGreaterThan(1)
  for (let i = 0; i < total; i++) {
    await buttons.nth(i).click()
    await expect(viewer.locator('[data-focused="true"]')).toHaveCount(1)
  }
  // 이 Fixture의 채점기준에는 원문 위치가 없다 → 가짜 위치 대신 '근거 없음'
  await expect(page.getByTestId('review-rubric').getByTestId('evidence-none').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/a11-wizard-hwpx-locator-1536.png' })

  // 확대·축소·초기화
  await expect(viewer.getByTestId('structure-zoom-level')).toHaveText('100%')
  await viewer.getByTestId('structure-zoom-in').click()
  await viewer.getByTestId('structure-zoom-in').click()
  await expect(viewer.getByTestId('structure-zoom-level')).toHaveText('120%')
  await viewer.getByTestId('structure-zoom-reset').click()
  await expect(viewer.getByTestId('structure-zoom-level')).toHaveText('100%')
  // 구간 이동(인쇄 쪽이 아닌 구조 구간) + 키보드
  await expect(viewer.getByTestId('structure-seg-label')).toContainText('구간 ')
  await viewer.getByTestId('structure-seg-next').click()
  await expect(viewer.getByTestId('structure-seg-label')).toContainText('구간 2 /')
  await viewer.locator('[role="document"]').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(viewer.getByTestId('structure-seg-label')).toContainText('구간 3 /')
  await page.keyboard.press('+')
  await expect(viewer.getByTestId('structure-zoom-level')).toHaveText('110%')
  await page.keyboard.press('0')
  await expect(viewer.getByTestId('structure-zoom-level')).toHaveText('100%')
  // 표 목록으로 이동
  const outline = viewer.getByTestId('structure-outline')
  const tableOption = await outline.locator('optgroup[label="표"] option').nth(1).getAttribute('value')
  await outline.selectOption(tableOption!)
  await expect(viewer.getByTestId('structure-seg-label')).not.toContainText('구간 3 /')
  // 찾기 이전·다음
  await viewer.getByTestId('structure-find').fill('평가')
  await expect(viewer.getByTestId('structure-find-count')).toContainText('1 /')
  await viewer.getByTestId('structure-find-next').click()
  await expect(viewer.getByTestId('structure-find-count')).toContainText('2 /')
  await viewer.getByTestId('structure-find-prev').click()
  await expect(viewer.getByTestId('structure-find-count')).toContainText('1 /')
  await page.screenshot({ path: 'test-results/a11-wizard-structure-nav-1536.png' })
})
