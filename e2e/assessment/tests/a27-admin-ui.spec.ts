import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API, STUDENT_ID, registerAndAnalyze, runTag, uniquePdf } from '../support.ts'

// A27-UX 관리자 Assessment UI 개선 (참고 이미지 04~17). 일회용 DB · 실제 Backend · 분석기 Stub 합성 결과.
// 화면 캡처는 test-results/a27-admin-*.png (보고서 Before/After 비교용).
const studentHeaders = { 'X-Assessment-Student-Id': STUDENT_ID }
const adminIdText = /\badm_[a-z0-9_]+/
const internalCode = /ROWS_WITHOUT_TIME|§12 계약|학교 Master|teachingPlan\)/

async function newAssessment(request: APIRequestContext, title: string) {
  const created = await request.post(`${API}/api/student/assessment/school-assessments`, {
    headers: studentHeaders,
    data: { title, subjectId: 'subj_02', academicYear: 2026, semester: 2, assessmentType: 'REPORT', evaluationDate: '2026-12-10', weightPercent: 20, submissions: '보고서 1부' },
  })
  expect(created.status()).toBe(201)
  return (await created.json()).assessmentId as string
}

const noOverflow = async (page: Page, name: string) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('[04] 전체 현황: 탭과 필터가 겹치지 않고, KPI 아이콘·보조 패널·담당 학생·최근 활동이 함께 보인다', async ({ page }) => {
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`${ADMIN}/assessment`)
    await expect(page.getByTestId('overview-kpis')).toBeVisible({ timeout: 15_000 })
    const tabs = await page.getByRole('navigation', { name: 'Assessment 관리 메뉴' }).boundingBox()
    const filters = await page.getByTestId('school-year-filters').boundingBox()
    expect(tabs && filters, '탭·필터 위치').toBeTruthy()
    // 탭 아래 경계와 필터 위 경계 사이에 여백이 있다(밀착·겹침 없음)
    expect(filters!.y - (tabs!.y + tabs!.height), `탭-필터 간격 @${width}`).toBeGreaterThanOrEqual(16)
    await expect(page.getByTestId('overview-kpis').locator('[data-tone]')).toHaveCount(4)
    await expect(page.getByRole('region', { name: '바로가기' })).toBeVisible()
    await expect(page.getByTestId('overview-recent')).toBeVisible()
    await expect(page.getByRole('region', { name: '담당 학생 현황' })).toBeVisible()
    await expect(page.getByTestId('overview-calendar')).toBeVisible()
    await noOverflow(page, `overview@${width}`)
    await page.screenshot({ path: `test-results/a27-admin-ui-overview-${width}.png`, fullPage: true })
  }
  // 필터를 바꾸면 Calendar 제목도 그 학년·학기로 바뀐다(이전 학교·학년 계획이 남지 않음)
  await page.getByTestId('overview-grade').selectOption('2')
  await expect(page.getByTestId('overview-calendar')).toContainText('고2')
})

test('[05] 학생 Assessment 기록 도구: 담당 선생님·정보 출처·연결된 심화 탐구가 없고, 학생이 넣은 값이 보인다', async ({ page, request }) => {
  const tag = runTag()
  const assessmentId = await newAssessment(request, `E2E 기록도구 ${tag}`)
  await page.goto(`${ADMIN}/assessment/students/${STUDENT_ID}/school/${assessmentId}?devAdmin=adm_gangnam`)
  // 기본 탭은 '학생 화면'(학생 화면 그대로 보기). 관리자 기록 도구 탭으로 옮긴다
  await page.getByRole('tab', { name: '관리자 기록 도구' }).or(page.getByRole('button', { name: '관리자 기록 도구' })).first().click({ timeout: 30_000 })
  const meta = page.getByTestId('assessment-meta')
  await expect(meta).toBeVisible({ timeout: 30_000 })
  await expect(meta).not.toContainText(/담당 선생님|정보 출처|연결된 심화 탐구/)
  await expect(page.locator('body')).not.toContainText(internalCode)
  await expect(meta).toContainText('보고서')
  await expect(meta).toContainText('20% (학생 입력)')
  await expect(meta).toContainText('보고서 1부')
  await page.screenshot({ path: 'test-results/a27-admin-ui-record-1600.png', fullPage: true })
})

test('[06][07] 피드백 작성: 의견 버튼은 블록 세로 가운데, 심화 Task·모의고사 소재 추천 영역이 없다', async ({ page, request }) => {
  const tag = runTag()
  const assessmentId = await newAssessment(request, `E2E 피드백 UI ${tag}`)
  const note = await (await request.post(`${API}/api/student/assessment/notes`, {
    headers: studentHeaders,
    data: {
      sourceType: 'SCHOOL_ASSESSMENT',
      sourceId: assessmentId,
      title: `노트 ${tag}`,
      blocks: [
        { blockId: 'h1', type: 'HEADING', text: `실험 주제 ${tag}`, attrs: { level: 1 } },
        { blockId: 'p1', type: 'PARAGRAPH', text: `여러 줄 문단 ${tag} `.repeat(30) },
      ],
    },
  })).json()
  const created = await request.post(`${API}/api/student/assessment/feedback-requests`, { headers: studentHeaders, data: { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, noteRevisionId: note.revisionId, artifactVersionIds: [] } })
  expect(created.status()).toBe(201)
  const requestId = (await created.json()).requestId as string
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/feedback/${requestId}?devAdmin=adm_gangnam`)
  await expect(page.getByText(`실험 주제 ${tag}`).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('body')).not.toContainText(/심화 탐구 Task 추천|모의고사 탐구 소재 추천/)
  for (const label of [`실험 주제 ${tag}`, `여러 줄 문단 ${tag}`]) {
    const block = page.locator('[data-commentable="true"]').filter({ hasText: label }).first()
    await block.hover()
    const button = block.getByRole('button', { name: /이 블록에 의견 달기/ })
    await expect(button).toBeVisible()
    const blockBox = (await block.boundingBox())!
    const buttonBox = (await button.boundingBox())!
    const centerGap = Math.abs(blockBox.y + blockBox.height / 2 - (buttonBox.y + buttonBox.height / 2))
    expect(centerGap, `${label} 의견 버튼 세로 가운데`).toBeLessThanOrEqual(2)
    expect(blockBox.x + blockBox.width - (buttonBox.x + buttonBox.width), '오른쪽 여백').toBeGreaterThanOrEqual(8)
  }
  // 키보드로도 의견 버튼에 닿는다
  await page.locator('[data-commentable="true"]').first().getByRole('button', { name: /이 블록에 의견 달기/ }).focus()
  await expect(page.locator('[data-commentable="true"]').first().getByRole('button', { name: /이 블록에 의견 달기/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/a27-admin-ui-feedback-1600.png', fullPage: true })
})

test('[09][10][11][12][13][14][15][16] 분석 목록 → 검토 1·3·4·5단계 → 결과 조회', async ({ page, request }) => {
  const tag = runTag()
  const fileName = `e2e-admin-ui-contract03-${tag}.pdf` // contract03 = 운영계획 행이 있는 0.3 Stub Fixture
  const doc = await registerAndAnalyze(request, 2026, fileName, uniquePdf(tag))
  await page.setViewportSize({ width: 1600, height: 900 })

  // [09] A28-39·40: 분석된 미확정 문서의 주 CTA는 '검토 시작' 하나('AI 결과 보기'·'분석 시작' 없음), 개발 문구 없음, 등록일 한 줄
  await page.goto(`${ADMIN}/assessment/analysis?school=school_001&year=2026&plan=${doc.planId}`)
  const row = page.locator('tr').filter({ hasText: fileName })
  await expect(row.getByTestId('plan-primary-action')).toHaveText('검토 시작', { timeout: 30_000 })
  await expect(row.getByTestId('plan-primary-action')).toHaveCount(1)
  await expect(row.getByRole('button', { name: /AI 결과 보기|분석 시작|확정 결과/ })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(internalCode)
  const date = row.locator('td[data-col="date"]')
  // 등록일 글자가 '2026. 11. / 12.'로 꺾이지 않는다 (칸 높이는 다른 열 때문에 크다 — 글자 줄 수만 본다)
  const dateLines = await date.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
  })
  expect(dateLines, '등록일 한 줄').toBe(1)
  await page.screenshot({ path: 'test-results/a27-admin-ui-analysis-1600.png', fullPage: true })

  // [10] 과목 확인하기 = 중립 outline(채움 아님)
  await page.goto(`${ADMIN}/assessment/evaluation-plans/${doc.planId}/revisions/${doc.revisionId}`)
  await expect(page.getByTestId('review-workspace')).toBeVisible({ timeout: 30_000 })
  const start = page.getByTestId('overview-start')
  const startBg = await start.evaluate((element) => getComputedStyle(element).backgroundColor)
  const ink = await page.evaluate(() => getComputedStyle(document.querySelector('.lh-assessment')!).getPropertyValue('--as-color-ink').trim())
  expect(startBg).not.toBe('rgb(29, 31, 35)')
  expect(ink).not.toBe('')
  await page.screenshot({ path: 'test-results/a27-admin-ui-review1-1600.png' })

  // [11] 수행평가 검토: 필드 행 버튼 높이가 같고 근거는 둘째 줄
  await page.getByTestId('review-step-performance-tab').click()
  const field = page.locator('[data-layout="field"]').first()
  await expect(field).toBeVisible({ timeout: 15_000 })
  const heights = await field.locator('button').evaluateAll((buttons) => buttons.filter((button) => (button as HTMLElement).closest('[class*="rowActions"]')).map((button) => Math.round(button.getBoundingClientRect().height)))
  expect(new Set(heights).size, '버튼 높이 일관').toBeLessThanOrEqual(1)
  await expect(page.locator('body')).not.toContainText(adminIdText)
  await page.screenshot({ path: 'test-results/a27-admin-ui-review3-1600.png' })

  // [12][13][14] 월별 운영계획: 영어 라벨·왼쪽 여백, 상세는 고른 과목 하나만
  await page.getByTestId('review-step-teaching-tab').click()
  await expect(page.getByTestId('teaching-plan-rows')).toBeVisible({ timeout: 15_000 })
  const unplaced = page.getByTestId('planner-unplaced')
  if (await unplaced.count()) {
    await expect(unplaced).toContainText('Plans Without a Fixed Month')
    await expect(unplaced).toHaveAttribute('data-inset', 'true')
  }
  await expect(page.getByTestId('teaching-plan-detail-subject')).toBeVisible()
  await expect(page.getByTestId('teaching-plan-rows').locator('section[aria-label$="운영계획"]')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText(internalCode)
  await page.screenshot({ path: 'test-results/a27-admin-ui-review4-1600.png', fullPage: true })

  // [15] 최종 확정 안 세부 Stepper (원본 대조 → 과목 연결 → 검토 결과 확인 → 최종 확정)
  await page.getByTestId('review-step-confirm-tab').click()
  const stepper = page.getByTestId('review-confirm-stepper')
  await expect(stepper).toBeVisible()
  await expect(stepper.getByTestId('review-confirm-step')).toHaveText([/원본 문서 대조/, /학업 과목 연결/, /검토 결과 확인/, /최종 승인/])
  await expect(stepper.getByTestId('review-confirm-step').first()).toHaveAttribute('aria-current', 'step')
  await stepper.getByTestId('review-confirm-step').nth(3).click()
  await expect(page.getByTestId('review-confirm-substep')).toHaveText('4 / 4')
  // 조건이 갖춰지지 않으면 확정 버튼이 꺼져 있고 남은 이유가 보인다.
  // A28-03: '최종 승인'(기본 승인 포함)도 같은 서버 조건 — 원문 대조·확인 전에는 꺼져 있고 이유를 보인다(조건 완화 없음)
  await expect(page.getByTestId('review-confirm')).toBeDisabled()
  await expect(page.getByTestId('bulk-confirm-submit')).toBeDisabled()
  await expect(page.getByTestId('bulk-confirm-blockers')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/모두 확인|전체 확인/)
  await page.screenshot({ path: 'test-results/a27-admin-ui-review5-1600.png' })

  // [16] AI 결과 보기: 2패널, 단계 배지, 과목 띠(n/전체), 확정 전 값은 '후보'
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`${ADMIN}/assessment/analysis/${doc.planId}/revisions/${doc.revisionId}/result`)
    await expect(page.getByTestId('archive-detail')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('review-source-pane')).toBeVisible()
    await expect(page.getByTestId('plan-result-stage').locator('b')).toHaveAttribute('data-stage', /ANALYZED|REVIEWING|REVIEW_DONE/)
    // A27-UX 추가 수정 [06]: '과목 n/전체'는 상세 위 단일 과목 선택으로 옮겼다
    await expect(page.getByTestId('result-subject-count')).toHaveText(/과목 1\/\d+/)
    await expect(page.getByTestId('archive-detail').locator('[data-state="confirmed"]')).toHaveCount(0)
    await noOverflow(page, `result@${width}`)
    await page.screenshot({ path: `test-results/a27-admin-ui-result-${width}.png` })
  }
})

test('[17] 관리자 참고자료실: 영상·사진을 올리고 새로고침 뒤에도 보이며, 미리보기·내려받기·휴지통', async ({ page }) => {
  const tag = runTag()
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/references?tab=scraps&devAdmin=adm_gangnam`)
  await page.getByTestId('scrap-upload-open').click()
  const dialog = page.getByRole('dialog', { name: '자료 업로드' })
  await expect(dialog).toBeVisible()
  // 허용하지 않는 형식은 화면에서 먼저 막는다
  await dialog.getByTestId('scrap-upload-input').setInputFiles({ name: 'run.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') })
  await expect(dialog.getByTestId('scrap-upload-error')).toBeVisible()
  // MP4(ISO BMFF ftyp 서명)
  const mp4 = Buffer.from([0, 0, 0, 0x18, ...Buffer.from('ftypisom'), 0, 0, 2, 0, ...Buffer.from('isommp41')])
  await dialog.getByTestId('scrap-upload-input').setInputFiles({ name: `실험영상-${tag}.mp4`, mimeType: 'video/mp4', buffer: mp4 })
  await expect(dialog.getByLabel('자료 제목')).toHaveValue(`실험영상-${tag}`)
  await expect(dialog.getByLabel('종류')).toHaveValue('VIDEO')
  await page.screenshot({ path: 'test-results/a27-admin-ui-upload-modal-1600.png' })
  await dialog.getByRole('button', { name: '올리고 스크랩에 저장' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })
  const videoRow = page.locator('tr').filter({ hasText: `실험영상-${tag}` })
  await expect(videoRow.getByTestId('scrap-file')).toContainText('영상')
  // 링크 없는 업로드 스크랩은 학생에게 공개하지 않는다(관리자 전용 표시)
  await expect(videoRow.getByTestId('scrap-publish-unavailable')).toBeVisible()
  await expect(videoRow.getByRole('button', { name: '학생에게 공개' })).toHaveCount(0)

  // PNG 사진: 썸네일
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
  await page.getByTestId('scrap-upload-open').click()
  await page.getByRole('dialog', { name: '자료 업로드' }).getByTestId('scrap-upload-input').setInputFiles({ name: `도표-${tag}.png`, mimeType: 'image/png', buffer: png })
  await page.getByRole('dialog', { name: '자료 업로드' }).getByRole('button', { name: '올리고 스크랩에 저장' }).click()
  const imageRow = page.locator('tr').filter({ hasText: `도표-${tag}` })
  await expect(imageRow.getByTestId('scrap-file')).toContainText('사진', { timeout: 15_000 })
  await expect(imageRow.getByTestId('scrap-file').locator('img')).toHaveCount(1)

  // 새로고침 뒤에도 유지
  await page.reload()
  await expect(page.locator('tr').filter({ hasText: `실험영상-${tag}` }).getByTestId('scrap-file')).toBeVisible({ timeout: 15_000 })

  // 미리보기(영상 재생 요소)·내려받기(원본 바이트)
  await page.locator('tr').filter({ hasText: `실험영상-${tag}` }).getByTestId('scrap-file-preview').click()
  await expect(page.getByTestId('scrap-preview-video')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).last().click()
  const download = page.waitForEvent('download')
  await page.locator('tr').filter({ hasText: `실험영상-${tag}` }).getByTestId('scrap-file-download').click()
  const file = await download
  expect(file.suggestedFilename()).toBe(`실험영상-${tag}.mp4`)
  await page.screenshot({ path: 'test-results/a27-admin-ui-references-1600.png', fullPage: true })

  // 휴지통으로 보내면 목록에서 빠진다
  for (const name of [`실험영상-${tag}`, `도표-${tag}`]) {
    await page.locator('tr').filter({ hasText: name }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '스크랩을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.locator('tr').filter({ hasText: name })).toHaveCount(0, { timeout: 15_000 })
  }
})

test('[08] 평가계획서: 학년도별 열람 없음 · 등록 버튼은 중립 outline · 6칸 유지', async ({ page }) => {
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026`)
    await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('open-plan-archive')).toHaveCount(0)
    for (const grade of [1, 2, 3]) for (const semester of [1, 2]) await expect(page.getByTestId(`plan-slot-${grade}-${semester}`)).toBeVisible()
    const upload = page.getByTestId('plan-upload-open')
    const bg = await upload.evaluate((element) => getComputedStyle(element).backgroundColor)
    const border = await upload.evaluate((element) => getComputedStyle(element).borderTopWidth)
    expect(bg, '등록 버튼은 채움 아님').not.toBe('rgb(33, 108, 248)')
    expect(border).toBe('1px')
    await noOverflow(page, `plans@${width}`)
    await page.screenshot({ path: `test-results/a27-admin-ui-plans-${width}.png` })
  }
})
