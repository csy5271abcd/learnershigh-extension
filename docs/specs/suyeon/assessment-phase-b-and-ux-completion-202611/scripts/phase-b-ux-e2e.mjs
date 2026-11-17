// Phase B(HWPX 공식 검토)·학생 화면 보기·미리보기/비교·휴지통·과목별 추천 자료원 교차 E2E (합성 데이터, 격리 Backend·Schema 전용).
// usage: node phase-b-ux-e2e.mjs <chrome.exe> <out.json> <shot dir> <studentBase> <adminBase> <apiBase> <synthetic.hwpx> <draft-import.json>
// 전제: Backend = 격리 Schema + assessment.analysis-import.enabled=true + assessment.multiformat.experimental=true
//        + assessment.plan-review.structured-confirm-dev=true (통제된 합성 시험 전용, 기록은 MOCK_HEADER).
//        Student(http, stu_001, 2026-1)·Admin(http, adm_demo_gangnam)이 같은 Backend를 쓴다.
// 분석 결과는 계정 B 분석기 대신 저장소 Fixture(초안 수신 JSON)를 API로 수신한다(분석기 미실행 — 보고서에 명시).
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, STUDENT, ADMIN, API, HWPX_PATH, DRAFT_PATH] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const ST = { 'X-Assessment-Student-Id': 'stu_001', 'Content-Type': 'application/json' }
const AD = { 'X-Assessment-Admin-Id': 'adm_demo_gangnam' }
const ADJ = { ...AD, 'Content-Type': 'application/json' }
const api = async (path, headers = ST, init = {}) => {
  const response = await fetch(API + path, { headers, ...init })
  const type = response.headers.get('content-type') ?? ''
  return { status: response.status, headers: response.headers, body: type.includes('json') ? await response.json().catch(() => null) : Buffer.from(await response.arrayBuffer()) }
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const stamp = Date.now().toString(36)
// 브라우저 PDF 보기가 실제로 그리는 유효한 PDF(1쪽, 글자 + 색 막대, xref 정확)
function pdf(label) {
  const text = `Report ${label} ${stamp}`
  const content = `BT /F1 28 Tf 72 720 Td (${text}) Tj ET\n0.2 0.4 0.8 rg 72 600 ${label === 'v1' ? 200 : 420} 60 re f\n`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'))
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

// 실제로 그려지는 PNG(1600×900 단색 + 줄무늬) — 확대·스크롤 확인용
function png(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const at = y * (width * 3 + 1) + 1 + x * 3
      const stripe = Math.floor(x / 80) % 2 === 0
      raw[at] = stripe ? 40 : 220
      raw[at + 1] = 120
      raw[at + 2] = stripe ? 200 : 60
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const upload = async (artifactId, name, bytes, type) => {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  const response = await fetch(`${API}/api/student/assessment/artifacts/${artifactId}/versions`, { method: 'POST', headers: { 'X-Assessment-Student-Id': 'stu_001' }, body: form })
  return { status: response.status, body: await response.json() }
}

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', acceptDownloads: true })
const errors = []
const page = await context.newPage()
page.on('pageerror', (error) => errors.push('student: ' + String(error)))
page.on('dialog', (dialog) => dialog.accept())
const admin = await context.newPage()
admin.on('pageerror', (error) => errors.push('admin: ' + String(error)))
admin.on('dialog', (dialog) => dialog.accept())

// =============== E2E-02/03 HWPX 공식 검토 ===============
const hwpx = readFileSync(HWPX_PATH)
const form = new FormData()
form.append('file', new Blob([hwpx], { type: 'application/octet-stream' }), `합성평가계획서-${stamp}.hwpx`)
for (const [k, v] of Object.entries({ schoolId: 'school_001', academicYear: '2026', grade: '1', semester: '1' })) form.append(k, v)
const registered = await (await fetch(`${API}/api/admin/assessment/evaluation-plans`, { method: 'POST', headers: AD, body: form })).json()
check('hwpx', 'HWPX 등록 201 (형식 HWPX, 쪽 번호 없음)', registered.documentRevisionId && registered.planId, registered.documentRevisionId)
const base = `/api/admin/assessment/evaluation-plans/${registered.planId}/revisions/${registered.documentRevisionId}`
const imported = await api(`${base}/analysis-imports`, ADJ, { method: 'POST', body: readFileSync(DRAFT_PATH) })
const analysisId = imported.body?.analysisId
check('hwpx', '분석 후보 수신(저장소 Fixture) → REVIEW_REQUIRED·UNREVIEWED', imported.status === 201 && imported.body.reviewStatus === 'UNREVIEWED', imported.status)

// 보안(API): 위반 요청은 모두 400, 기록 없음
const cell = (row, col) => ({ kind: 'HWPX_TABLE_CELL', section: 0, path: `p3.c0.r${row}c${col}`, table: 1, row, col, rowSpan: 1, colSpan: 1 })
const review = (patch = {}, fields = [{ fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 25, documentLocator: cell(2, 4) }], subject = { analysisSubjectIndex: 0 }) => ({
  analysisId,
  decision: 'CONFIRM',
  sourceCheck: { method: 'LOCAL_FILE_EXTERNAL_VIEWER', localFileSha256: sha(hwpx), manualComparisonConfirmed: true },
  reviewedSubjects: [{ subjectId: 'subj_14', ...subject, confirmedFields: fields }],
  ...patch,
})
const reasons = async (body) => {
  const response = await api(`${base}/review`, ADJ, { method: 'PUT', body: JSON.stringify(body) })
  return { status: response.status, reasons: (response.body?.details?.fields ?? []).map((f) => `${f.field}:${f.reason}`) }
}
const cases = [
  ['원본 SHA 불일치', review({ sourceCheck: { method: 'LOCAL_FILE_EXTERNAL_VIEWER', localFileSha256: '0'.repeat(64), manualComparisonConfirmed: true } }), 'document_mismatch'],
  ['다른 Run(존재하지 않는 analysisId)', review({ analysisId: 'analysis_other' }), 'analysisId:unknown'],
  ['다른 과목 번호', review({}, undefined, { analysisSubjectIndex: 3 }), 'analysisSubjectIndex:unknown'],
  ['다른 평가 항목의 Locator', review({}, [{ fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 25, documentLocator: cell(2, 5) }]), 'evidence_not_in_analysis'],
  ['중복 fieldPath', review({}, [
    { fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 25, documentLocator: cell(2, 4) },
    { fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 30, documentLocator: cell(2, 4) },
  ]), 'duplicate'],
  ['비정규 색인 [00]', review({}, [{ fieldPath: 'performanceEvaluation.items[00].weightPercent', value: 25, documentLocator: cell(2, 4) }]), 'fieldPath:unknown'],
  ['근거 없는 필드(채점 요소)', review({}, [{ fieldPath: 'performanceEvaluation.items[0].rubric[0].element', value: 'x', documentLocator: cell(2, 4) }]), 'evidence_scope_unavailable'],
  ['수동 대조 확인 없음', review({ sourceCheck: { method: 'LOCAL_FILE_EXTERNAL_VIEWER', localFileSha256: sha(hwpx), manualComparisonConfirmed: false } }), 'manualComparisonConfirmed:required'],
]
for (const [name, body, expected] of cases) {
  const outcome = await reasons(body)
  check('security', `${name} → 400 ${expected}`, outcome.status === 400 && outcome.reasons.some((r) => r.includes(expected)), outcome)
}
const beforeUi = (await api(`/api/admin/assessment/evaluation-plans/${registered.planId}`, AD)).body
check('security', '거절 뒤 검토 기록 없음(UNREVIEWED)', beforeUi.revisions[0].reviewStatus === 'UNREVIEWED')

// 관리자 화면: 다른 파일 → 불일치·확정 불가, 원본 → 일치 → 필드·위치 선택 → 명시적 확인 → 확정
await admin.goto(`${ADMIN}/assessment/evaluation-plans/${registered.planId}/revisions/${registered.documentRevisionId}`, { waitUntil: 'networkidle', timeout: 60000 })
await admin.waitForTimeout(2000)
const fileInput = admin.getByTestId('review-local-pdf')
await fileInput.setInputFiles({ name: 'wrong.hwpx', mimeType: 'application/octet-stream', buffer: Buffer.from('PK not the same file') })
await admin.getByTestId('review-hash-status').filter({ hasText: '불일치' }).waitFor({ timeout: 10000 })
check('hwpx-ui', '다른 파일 선택 → SHA 불일치 표시, 확인 체크·확정 비활성', (await admin.getByTestId('review-attest').isDisabled()) && (await admin.getByTestId('review-confirm').isDisabled()))
await fileInput.setInputFiles({ name: 'original.hwpx', mimeType: 'application/octet-stream', buffer: hwpx })
await admin.getByTestId('review-hash-status').filter({ hasText: '일치:' }).waitFor({ timeout: 10000 })
check('hwpx-ui', '원본 선택 → 브라우저 SHA-256 = 등록 SHA (일치)', true)
await admin.getByTestId('review-subject-id-0').fill('subj_14')
const row = admin.locator('[data-testid="review-field-row"][data-field-path="performanceEvaluation.items[0].weightPercent"]')
await row.locator('input[type="checkbox"]').check()
const locatorChoices = await row.getByTestId('review-locator-choice').count()
check('hwpx-ui', '필드별 구조 Locator(구역·표·행·열) 선택지 표시', locatorChoices >= 1, locatorChoices)
await row.getByTestId('review-locator-choice').first().check()
await admin.getByTestId('review-attest').check()
await admin.screenshot({ path: `${shotDir}/b01-hwpx-review-before-confirm.png`, fullPage: true })
await admin.getByTestId('review-confirm').click()
await admin.getByTestId('review-source-record').waitFor({ timeout: 15000 })
await admin.screenshot({ path: `${shotDir}/b02-hwpx-review-record.png`, fullPage: true })
check('hwpx-ui', '확정 후 검토 기록 + "개발용 Mock 관리자 기록" 표시', await admin.getByTestId('review-source-mock').isVisible())
const after = (await api(`/api/admin/assessment/evaluation-plans/${registered.planId}`, AD)).body.revisions[0]
check('hwpx', '재조회: CONFIRMED + 필드 근거(documentLocator·analysisSubjectIndex, PDF 쪽 없음)',
  after.reviewStatus === 'CONFIRMED' && after.confirmedFields[0].documentLocator?.path === 'p3.c0.r2c4' && after.confirmedFields[0].analysisSubjectIndex === 0 && after.confirmedFields[0].pdfPageNumber === null,
  after.confirmedFields[0])
check('hwpx', '재조회: 검토 기록(SHA·수동 대조 확인·reviewerAuth=MOCK_HEADER)', after.sourceReview?.sourceCheckSha256 === sha(hwpx) && after.sourceReview.manualComparisonConfirmed === true && after.sourceReview.reviewerAuth === 'MOCK_HEADER', after.sourceReview)
const studentPlan = await api(`/api/student/assessment/evaluation-plans/${registered.planId}`)
check('hwpx', '학생: 확정 상태만(근거 위치·후보·검토 기록 없음)', studentPlan.status === 200 && studentPlan.body.reviewStatus === 'CONFIRMED' && !JSON.stringify(studentPlan.body).match(/documentLocator|sourceReview|subjects|MOCK_HEADER/), studentPlan.body)

// =============== 학생 기록 준비 (API) ===============
const created = await api('/api/student/assessment/school-assessments', ST, { method: 'POST', body: JSON.stringify({ title: `UX E2E 탐구 ${stamp}`, subjectId: 'subj_12', academicYear: 2026, semester: 1 }) })
const sa = created.body.assessmentId
const note = await api('/api/student/assessment/notes', ST, { method: 'POST', body: JSON.stringify({ sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: '탐구 과정', blocks: [{ blockId: 'b1', type: 'PARAGRAPH', text: `학생 노트 원문 ${stamp}` }] }) })
const r1 = note.body.revisionId
const report = (await api('/api/student/assessment/artifacts', ST, { method: 'POST', body: JSON.stringify({ sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: '탐구 보고서', kind: null }) })).body.artifactId
const v1Bytes = pdf('v1')
const v2Bytes = pdf('v2')
const v1 = (await upload(report, '탐구보고서_v1.pdf', v1Bytes, 'application/pdf')).body.versionId
const v2 = (await upload(report, '탐구보고서_v2.pdf', v2Bytes, 'application/pdf')).body.versionId
const photo = (await api('/api/student/assessment/artifacts', ST, { method: 'POST', body: JSON.stringify({ sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: '실험 사진', kind: null }) })).body.artifactId
const pngBytes = png(1600, 900)
const photoV1 = (await upload(photo, '실험사진.png', pngBytes, 'image/png')).body.versionId
const growth = await api('/api/student/assessment/growth-records', ST, { method: 'POST', body: JSON.stringify({ title: `UX 성장 기록 ${stamp}`, activityStartDate: '2026-03-02' }) })
const feedback = await api('/api/student/assessment/feedback-requests', ST, { method: 'POST', body: JSON.stringify({ sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, noteRevisionId: r1, artifactVersionIds: [v1] }) })
const requestId = feedback.body.requestId
await api(`/api/admin/assessment/feedback-requests/${requestId}/deliver`, ADJ, { method: 'POST', body: JSON.stringify({ overallComment: `요청 당시 v1 기준 의견 ${stamp}`, comments: [], recommendations: [] }) })
check('setup', '학생 수행평가·노트·PDF v1/v2·PNG·성장 기록·피드백(전달) 준비', sa && r1 && v1 && v2 && photoV1 && growth.status === 201 && feedback.status === 201)

// =============== E2E-06 PDF 미리보기 (Student UI) ===============
await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)
const reportCard = page.locator('li').filter({ hasText: '탐구 보고서' }).first()
await reportCard.getByTestId('artifact-preview').click()
await page.getByTestId('artifact-viewer').waitFor({ timeout: 15000 })
const pdfFrame = page.getByTestId('viewer-pdf')
await pdfFrame.waitFor({ timeout: 15000 })
const shownBytes = await page.evaluate(async () => {
  const src = document.querySelector('[data-testid="viewer-pdf"]').getAttribute('src')
  return Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer()))
})
check('preview', 'PDF 앱 안 미리보기(blob, 최신 v2) 바이트 SHA = 업로드 v2', sha(Buffer.from(shownBytes)) === sha(v2Bytes))
const previewResponse = await api(`/api/student/assessment/artifacts/${report}/versions/${v2}/preview`)
check('preview', '미리보기 응답: application/pdf · nosniff · no-store · inline', previewResponse.headers.get('content-type') === 'application/pdf' && previewResponse.headers.get('x-content-type-options') === 'nosniff' && previewResponse.headers.get('cache-control') === 'private, no-store' && (previewResponse.headers.get('content-disposition') ?? '').startsWith('inline'))
const download = await api(`/api/student/assessment/artifacts/${report}/versions/${v2}/file`)
check('preview', '다운로드 SHA = 업로드 v2', sha(download.body) === sha(v2Bytes))
await page.screenshot({ path: `${shotDir}/b03-pdf-preview.png` })

// =============== E2E-08 버전 비교 ===============
await page.getByTestId('viewer-compare').selectOption(v1)
await page.getByTestId('viewer-diff-mode').waitFor({ timeout: 15000 })
const panes = await page.getByTestId('viewer-pane').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-version-id')))
check('compare', '좌(v1)·우(v2) 두 버전 나란히', panes[0] === v1 && panes[1] === v2, panes)
const diffText = await page.getByTestId('viewer-diff').innerText()
check('compare', '메타데이터 비교: 파일 이름·지문 다름, 내용 자동 비교 없음 안내', diffText.includes('탐구보고서_v1.pdf') && diffText.includes('탐구보고서_v2.pdf') && diffText.includes('지문 다름') && diffText.includes('자동 비교는 지원하지 않아요'))
await page.waitForTimeout(1500)
await page.screenshot({ path: `${shotDir}/b04-compare.png` })
const v1Again = await api(`/api/student/assessment/artifacts/${report}/versions/${v1}/file`)
check('compare', '비교 뒤 v1 원본 그대로(SHA)', sha(v1Again.body) === sha(v1Bytes))

// =============== E2E-07 이미지 미리보기 ===============
await page.goto(`${STUDENT}/assessment/artifacts/${photo}/viewer?v=${photoV1}`, { waitUntil: 'networkidle' })
await page.getByTestId('viewer-image').waitFor({ timeout: 15000 })
await page.waitForTimeout(800)
const natural = await page.getByTestId('viewer-image').evaluate((img) => img.naturalWidth)
const fits = await page.getByTestId('viewer-image-box').evaluate((box) => box.scrollWidth <= box.clientWidth + 1)
check('image', 'PNG 앱 안 표시(실제 그려짐) + 화면 맞춤', natural === 1600 && fits, { natural, fits })
for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '확대' }).click()
await page.waitForTimeout(500)
const zoomLabel = await page.getByTestId('viewer-zoom').innerText()
const scrolls = await page.getByTestId('viewer-image-box').evaluate((box) => {
  box.scrollLeft = 300
  return box.scrollWidth > box.clientWidth && box.scrollLeft > 0
})
check('image', '확대 200% → 가로 스크롤 가능', zoomLabel === '200%' && scrolls, zoomLabel)
await page.screenshot({ path: `${shotDir}/b05-image-zoom.png` })

// =============== E2E-05 관리자 학생 화면 보기 ===============
await admin.goto(`${ADMIN}/assessment/students/stu_001/view?path=${encodeURIComponent(`/assessment/school-assessments/${sa}`)}`, { waitUntil: 'networkidle', timeout: 60000 })
await admin.getByTestId('readonly-banner').waitFor({ timeout: 20000 })
const frame = admin.frameLocator('iframe[title*="읽기 전용"]')
await frame.getByText(`UX E2E 탐구 ${stamp}`).first().waitFor({ timeout: 20000 })
const frameText = await frame.locator('body').innerText()
check('student-view', '관리자 학생 화면 보기: 같은 수행평가·노트 원문·결과물 표시', frameText.includes(`UX E2E 탐구 ${stamp}`) && frameText.includes('탐구 보고서') && frameText.includes('실험 사진'))
const writeButtons = await frame.locator('button:not([disabled])', { hasText: /결과 파일 등록|새 버전|휴지통|피드백 요청|안내문 사진/ }).count()
const editDisabled = await frame.getByTestId('edit-assessment-open').isDisabled()
check('student-view', '쓰기 컨트롤 없음(등록·새 버전·휴지통) + 평가 정보 수정 비활성', writeButtons === 0 && editDisabled, { writeButtons, editDisabled })
await admin.screenshot({ path: `${shotDir}/b06-admin-student-view.png` })
await admin.goto(`${ADMIN}/assessment/students/stu_001/view?path=${encodeURIComponent('/assessment/growth')}`, { waitUntil: 'networkidle' })
await admin.getByTestId('readonly-banner').waitFor({ timeout: 20000 })
await admin.frameLocator('iframe[title*="읽기 전용"]').getByText(`UX 성장 기록 ${stamp}`).first().waitFor({ timeout: 20000 })
check('student-view', '관리자 학생 화면 보기: 같은 성장 기록 표시', true)
const other = await api('/api/admin/assessment/students/stu_001/student-view/school-assessments?academicYear=2026&semester=1', { 'X-Assessment-Admin-Id': 'adm_bundang' })
check('student-view', '다른 지점 관리자 student-view 404', other.status === 404, other.status)
const studentHeader = await api('/api/admin/assessment/students/stu_001/student-view/school-assessments?academicYear=2026&semester=1', { 'X-Assessment-Student-Id': 'stu_001' })
check('student-view', '학생 Header로는 관리자 읽기 경로 불가(401/403)', [401, 403].includes(studentHeader.status), studentHeader.status)

// 관리자 기록 도구: 앱 안 미리보기
const adminPreview = await api(`/api/admin/assessment/artifacts/${report}/versions/${v1}/preview`, AD)
check('preview', '관리자(담당) 미리보기 200 = v1 바이트, 다른 지점 404', adminPreview.status === 200 && sha(adminPreview.body) === sha(v1Bytes) && (await api(`/api/admin/assessment/artifacts/${report}/versions/${v1}/preview`, { 'X-Assessment-Admin-Id': 'adm_bundang' })).status === 404)

// =============== E2E-09/10 휴지통·복원 + Snapshot 보호 ===============
await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.locator('li').filter({ hasText: '탐구 보고서' }).first().getByTestId('artifact-trash').click()
await page.waitForTimeout(2000)
const listed = (await api(`/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`)).body.items.map((a) => a.artifactId)
check('trash', '결과물 휴지통 → 활성 목록에서 빠짐', !listed.includes(report) && listed.includes(photo))
const adminSnapshot = (await api(`/api/admin/assessment/feedback-requests/${requestId}`, AD)).body
const adminSnapFile = await api(`/api/admin/assessment/artifacts/${report}/versions/${v1}/file`, AD)
check('snapshot', '휴지통 이동 뒤에도 요청 당시 Snapshot(r1·v1)·관리자 답변·파일 보존',
  adminSnapshot.snapshotRevision?.revisionId === r1 && adminSnapshot.snapshotVersions?.[0]?.versionId === v1 && sha(adminSnapFile.body) === sha(v1Bytes) && JSON.stringify(adminSnapshot).includes(`요청 당시 v1 기준 의견 ${stamp}`))
await page.goto(`${STUDENT}/assessment/archive?tab=trash`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const trashText = await page.locator('main').innerText()
check('trash', '보관함 휴지통: 유형·제목·삭제 시각·원래 소속 표시', trashText.includes('탐구 보고서') && trashText.includes(`수행평가 'UX E2E 탐구 ${stamp}'의 결과물`) && trashText.includes('삭제'))
await page.screenshot({ path: `${shotDir}/b07-trash.png` })
await page.locator('li').filter({ hasText: '탐구 보고서' }).getByTestId('trash-restore').click()
await page.waitForTimeout(2000)
const restoredVersions = (await api(`/api/student/assessment/artifacts/${report}/versions`)).body.items.map((v) => v.versionId)
check('trash', '복원 → 같은 ID·v1·v2 그대로 목록 복귀', restoredVersions.join() === [v1, v2].join() && (await api(`/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`)).body.items.some((a) => a.artifactId === report))
const replyAfter = (await api(`/api/student/assessment/feedback-requests/${requestId}/reply`)).body
check('snapshot', '학생: 전달된 피드백 그대로', replyAfter.status === 'DELIVERED' && JSON.stringify(replyAfter).includes(`요청 당시 v1 기준 의견 ${stamp}`))

// =============== E2E-11 과목별 추천 자료원 → 내 자료함 저장 ===============
await page.goto(`${STUDENT}/assessment/resources`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const subjectOptions = await page.locator('#reco-subject option').allInnerTexts()
const science = subjectOptions.find((name) => /과학/.test(name)) ?? subjectOptions[1]
await page.locator('#reco-subject').selectOption({ label: science })
await page.getByTestId('reco-basis').waitFor({ timeout: 10000 })
const chips = await page.locator('ul[aria-label="추천 자료원"] button').allInnerTexts()
check('reco', `과목(${science}) 선택 → 정적 추천 자료원 표시(503 아님)`, chips.length > 0, chips.slice(0, 4))
await page.locator('ul[aria-label="추천 자료원"] button').first().click()
const link = await page.getByTestId('reco-link').getAttribute('href')
check('reco', '실제 출처 링크(https) 표시', /^https:\/\//.test(link ?? ''), link)
await page.getByTestId('reco-add').click()
const addDialog = page.getByRole('dialog')
await addDialog.getByLabel(/자료명/).fill(`추천 자료원에서 찾은 기사 ${stamp}`)
await addDialog.locator('input[type="url"]').fill('https://example.org/found-article')
await page.locator('button[type="submit"][form="add-resource-form"]').click()
await page.waitForTimeout(2500)
const mine = (await api('/api/student/assessment/resources?page=0&size=50')).body.items
check('reco', '내 자료함 저장 → MySQL 재조회', mine.some((r) => r.title === `추천 자료원에서 찾은 기사 ${stamp}`))
await page.screenshot({ path: `${shotDir}/b08-reco.png` })

// =============== E2E-12 관리자 추천 자료 등록·공개 → 학생 ===============
await admin.goto(`${ADMIN}/assessment/references`, { waitUntil: 'networkidle' })
await admin.waitForTimeout(2000)
await admin.locator('button[aria-label$="에서 찾은 자료 저장"]').first().click()
await admin.locator('#scrap-title').fill(`관리자 추천 자료 ${stamp}`)
await admin.getByRole('button', { name: '내 스크랩에 저장' }).click()
await admin.waitForTimeout(2000)
await admin.getByRole('button', { name: /내 스크랩/ }).first().click()
await admin.waitForTimeout(1500)
await admin.locator('tr').filter({ hasText: `관리자 추천 자료 ${stamp}` }).getByTestId('scrap-publish').click()
await admin.waitForTimeout(2000)
await page.goto(`${STUDENT}/assessment/resources`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
check('publish', '관리자 추천 자료 등록·공개 → 학생 자료함 "선생님이 공개한 자료"', (await page.locator('main').innerText()).includes(`관리자 추천 자료 ${stamp}`))
// 관리자 휴지통 → 학생 목록에서 빠짐 → 복원
const scrapId = (await api('/api/admin/assessment/reference-library?page=0&size=50', AD)).body.items.find((s) => s.title === `관리자 추천 자료 ${stamp}`)?.scrapId
await api(`/api/admin/assessment/reference-library/${scrapId}`, AD, { method: 'DELETE' })
const hidden = !(await api('/api/student/assessment/shared-resources')).body.items.some((s) => s.title === `관리자 추천 자료 ${stamp}`)
await admin.reload({ waitUntil: 'networkidle' })
await admin.waitForTimeout(1500)
await admin.getByRole('button', { name: /내 스크랩/ }).first().click()
await admin.waitForTimeout(1000)
await admin.getByTestId('scrap-trash').locator('summary').click()
await admin.getByTestId('scrap-trash-item').filter({ hasText: `관리자 추천 자료 ${stamp}` }).getByTestId('scrap-restore').click()
await admin.waitForTimeout(2000)
const back = (await api('/api/student/assessment/shared-resources')).body.items.some((s) => s.title === `관리자 추천 자료 ${stamp}`)
check('publish', '관리자 자료 휴지통 → 학생 공개 목록에서 빠짐 → 화면에서 복원 → 다시 표시', hidden && back, { hidden, back })
await admin.screenshot({ path: `${shotDir}/b09-admin-scrap-trash.png` })

check('runtime', '페이지 예외 0', errors.length === 0, errors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), stamp, results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
