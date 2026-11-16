// 1차 마감 핵심 화면 브라우저 검증 (합성 데이터, 로컬 전용 E2E Schema).
// 전제: Backend 18080(수신 기능 켬, 빈 Schema), Student Vite 5173(http, stu_001, 검증용 Proxy), Admin Vite 5174(http, adm_plan_operator).
// usage: node final-browser-e2e.mjs <chrome.exe> <out.json> <shot dir> <schema> <v21.1 pdf> <v21.1 json> <다른 합성 pdf>
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, schema, pdfPath, importPath, otherPdfPath] = process.argv.slice(2)
const API = 'http://localhost:18080'
const STUDENT = 'http://localhost:5173'
const ADMIN = 'http://localhost:5174'
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const sql = (query) =>
  execFileSync('docker', ['exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r', '--default-character-set=utf8mb4', schema, '-e', query], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
async function api(method, path, headers, body, raw) {
  const response = await fetch(API + path, { method, headers: { ...headers, ...(body || raw ? { 'Content-Type': 'application/json' } : {}) }, body: raw ?? (body ? JSON.stringify(body) : undefined) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ST1 = { 'X-Assessment-Student-Id': 'stu_001' }
const ST2 = { 'X-Assessment-Student-Id': 'stu_002' }
const OP = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const count = (table) => Number(sql(`SELECT COUNT(*) FROM ${table}`)[0][0])

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const calls = []
context.on('requestfinished', async (request) => {
  const url = request.url()
  if (!/\/api\/(student|admin)\//.test(url)) return
  const response = await request.response()
  calls.push(`${request.method()} ${response?.status()} ${url.replace(/^https?:\/\/[^/]+/, '')}`)
})
const page = await context.newPage()
const shot = (target, name) => target.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true })

// ================= P0-1 Student 수정 =================
const created = await api('POST', '/api/student/assessment/school-assessments', ST1, { title: '수정 시험 원본', subjectId: 'subj_11', academicYear: 2026, semester: 1, deadlineDate: '2026-11-20', description: '처음 설명' })
const id = created.body.assessmentId
await page.goto(`${STUDENT}/assessment/school-assessments/${encodeURIComponent(id)}`)
await page.getByTestId('edit-assessment-open').waitFor()
check('S-edit', 'HTTP 개발 표시(실제 저장·Mock 인증·Mock 학업 정보) 보임', await page.getByTestId('dev-http-notice').first().isVisible().catch(() => false) || (await page.goto(`${STUDENT}/assessment`), await page.waitForTimeout(1200), await page.getByTestId('dev-http-notice').first().isVisible()), null)
await page.goto(`${STUDENT}/assessment/school-assessments/${encodeURIComponent(id)}`)
await page.getByTestId('edit-assessment-open').click()
const dialog = page.getByRole('dialog')
const titleInput = dialog.getByLabel('수행평가 이름')
check('S-edit', '수정 화면 진입: 기존 제목·마감일 표시', (await titleInput.inputValue()) === '수정 시험 원본' && (await dialog.getByLabel('제출 마감일').inputValue()) === '2026-11-20', null)
check('S-edit', '바뀐 내용 없으면 저장 비활성', await dialog.getByTestId('edit-assessment-save').isDisabled(), null)
await titleInput.fill('')
check('S-edit', '제목 비우면 저장 비활성(필수값)', await dialog.getByTestId('edit-assessment-save').isDisabled(), null)

// 서버 오류(네트워크 끊김) → 오류 표시·입력 유지
await titleInput.fill('수정 시험 변경본')
await dialog.getByLabel('제출 마감일').fill('2026-12-05')
await dialog.getByLabel('설명 바꾸기').check()
await dialog.getByLabel('새 설명').fill('바꾼 설명')
await page.route('**/api/student/assessment/school-assessments/*', (route) => (route.request().method() === 'PATCH' ? route.abort('connectionrefused') : route.continue()))
await dialog.getByTestId('edit-assessment-save').click()
await page.waitForTimeout(800)
check('S-edit', '네트워크 실패: 오류 표시·Modal 유지·입력값 유지·DB 변경 없음', (await dialog.getByRole('alert').innerText()).includes('NETWORK_ERROR') && (await titleInput.inputValue()) === '수정 시험 변경본' && sql(`SELECT title FROM assessment_school_assessment WHERE id='${id}'`)[0][0] === '수정 시험 원본', await dialog.getByRole('alert').innerText())
await page.unrouteAll({ behavior: 'ignoreErrors' })
// 서버 400 (실제 서버 검증): 요청 제목을 공백으로 바꿔 보냄
await page.route('**/api/student/assessment/school-assessments/*', async (route) => {
  if (route.request().method() !== 'PATCH') return route.continue()
  return route.continue({ postData: JSON.stringify({ ...JSON.parse(route.request().postData()), title: '   ' }) })
})
await dialog.getByTestId('edit-assessment-save').click()
await page.waitForTimeout(800)
check('S-edit', '서버 400: 제목 필드 오류·입력 유지·DB 변경 없음', (await dialog.innerText()).includes('수행평가 이름을 입력해 주세요') && (await titleInput.inputValue()) === '수정 시험 변경본' && sql(`SELECT title FROM assessment_school_assessment WHERE id='${id}'`)[0][0] === '수정 시험 원본', calls.filter((line) => line.startsWith('PATCH')).slice(-1))
await page.unrouteAll({ behavior: 'ignoreErrors' })
// 401: 인증 Header 제거
await page.route('**/api/student/assessment/school-assessments/*', (route) => {
  if (route.request().method() !== 'PATCH') return route.continue()
  const headers = { ...route.request().headers() }
  delete headers['x-assessment-student-id']
  return route.continue({ headers })
})
await dialog.getByTestId('edit-assessment-save').click()
await page.waitForTimeout(800)
check('S-edit', '서버 401: 오류 표시·성공 표시 없음', (await dialog.getByRole('alert').innerText()).includes('UNAUTHORIZED') && sql(`SELECT title FROM assessment_school_assessment WHERE id='${id}'`)[0][0] === '수정 시험 원본', null)
await page.unrouteAll({ behavior: 'ignoreErrors' })
// 404: 다른 학생 기록으로 요청 주소를 바꿈 (서버가 존재를 숨기고 404)
const other = await api('POST', '/api/student/assessment/school-assessments', ST2, { title: '다른 학생 기록', subjectId: 'subj_11', academicYear: 2026, semester: 1 })
await page.route(`**/api/student/assessment/school-assessments/${id}`, (route) => {
  if (route.request().method() !== 'PATCH') return route.continue()
  return route.continue({ url: route.request().url().replace(id, other.body.assessmentId) })
})
await dialog.getByTestId('edit-assessment-save').click()
await page.waitForTimeout(800)
check('S-edit', '다른 학생 기록 수정 404: 오류 표시·두 기록 모두 변경 없음', (await dialog.getByRole('alert').innerText()).includes('ASSESSMENT_NOT_FOUND') && sql(`SELECT title FROM assessment_school_assessment WHERE id='${other.body.assessmentId}'`)[0][0] === '다른 학생 기록', null)
await page.unrouteAll({ behavior: 'ignoreErrors' })
// 성공 (중복 클릭 방지 포함)
const before = calls.filter((line) => line.startsWith('PATCH 200')).length
await dialog.getByTestId('edit-assessment-save').dblclick()
await page.waitForTimeout(1500)
const patches = calls.filter((line) => line.startsWith('PATCH 200')).length - before
const row = sql(`SELECT title, deadline_date, description, subject_id, status, IFNULL(eval_item_key,'NULL') FROM assessment_school_assessment WHERE id='${id}'`)[0]
check('S-edit', '저장 성공: PATCH 1회(중복 클릭 방지)', patches === 1, patches)
check('S-edit', 'DB 반영: 제목·마감일·설명 변경, 과목·상태·참조 그대로', row[0] === '수정 시험 변경본' && row[1] === '2026-12-05' && row[2] === '바꾼 설명' && row[3] === 'subj_11' && row[4] === 'BEFORE_START', row)
check('S-edit', '저장 후 상세 재조회(GET) 실행', calls.some((line) => line.startsWith(`GET 200 /api/student/assessment/school-assessments/${id}`)), null)
await page.reload()
await page.waitForTimeout(1500)
const detailText = await page.locator('body').innerText()
check('S-edit', '새로고침 후 변경값 유지(제목·12월 5일)', detailText.includes('수정 시험 변경본') && /12\. ?5|12월 5일/.test(detailText), null)
await shot(page, 'final-s-edit-saved')
// 마감일 null 처리, 설명은 건드리지 않으면 유지
await page.getByTestId('edit-assessment-open').click()
await dialog.getByRole('button', { name: '날짜 미정으로 바꾸기' }).click()
await dialog.getByTestId('edit-assessment-save').click()
await page.waitForTimeout(1500)
const row2 = sql(`SELECT IFNULL(deadline_date,'NULL'), description FROM assessment_school_assessment WHERE id='${id}'`)[0]
check('S-edit', '마감일 비우기 → DB NULL, 설명은 보내지 않아 유지', row2[0] === 'NULL' && row2[1] === '바꾼 설명', row2)
await page.reload()
await page.waitForTimeout(1200)
check('S-edit', '새로고침 후 "날짜 미정" 표시', (await page.locator('body').innerText()).includes('미정'), null)

// ================= P0-3 Admin PDF 등록·개정 =================
const admin = await context.newPage()
const asAdmin = async (adminId) => {
  await admin.unrouteAll({ behavior: 'ignoreErrors' })
  if (adminId) await admin.route('**/api/admin/**', (route) => route.continue({ headers: { ...route.request().headers(), 'x-assessment-admin-id': adminId } }))
}
const plansUrl = `${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026&slot=1-1`
await admin.goto(plansUrl)
await admin.waitForTimeout(1500)
const openUpload = async () => {
  await admin.getByRole('button', { name: '이 칸에 PDF 추가' }).click()
  return admin.getByRole('dialog')
}
const submitUpload = async (modal) => modal.getByRole('button', { name: /등록하고 분석|개정본 올리고 분석/ }).click()
const plansBefore = count('assessment_plan_revision')
// 오류 1: PDF가 아닌 파일
let modal = await openUpload()
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles({ name: 'not-a-pdf.txt', mimeType: 'text/plain', buffer: Buffer.from('plain text') })
await submitUpload(modal)
await admin.waitForTimeout(1000)
check('PDF', 'PDF 아닌 파일 → 415 파일 오류 표시·저장 없음', calls.some((line) => line.startsWith('POST 415 /api/admin/assessment/evaluation-plans')) && count('assessment_plan_revision') === plansBefore, (await modal.innerText()).match(/PDF[^\n]*/)?.[0])
// 오류 2: 빈 파일
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) })
await submitUpload(modal)
await admin.waitForTimeout(1000)
const emptyCall = calls.filter((line) => line.startsWith('POST') && line.includes('/evaluation-plans')).slice(-1)[0]
check('PDF', '빈 파일 → 서버 거절·저장 없음', /POST 4\d\d/.test(emptyCall ?? '') && count('assessment_plan_revision') === plansBefore, emptyCall)
// 오류 3: 손상 PDF
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nbroken content') })
await submitUpload(modal)
await admin.waitForTimeout(1000)
const brokenCall = calls.filter((line) => line.startsWith('POST') && line.includes('/evaluation-plans')).slice(-1)[0]
check('PDF', '손상 PDF → 422 오류 표시·저장 없음', brokenCall?.startsWith('POST 422') && count('assessment_plan_revision') === plansBefore, brokenCall)
// 오류 4: 크기 초과
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles({ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(21 * 1024 * 1024, 32)]) })
await submitUpload(modal)
await admin.waitForTimeout(2500)
const largeCall = calls.filter((line) => line.startsWith('POST') && line.includes('/evaluation-plans')).slice(-1)[0]
check('PDF', '20MB 초과 → 413 오류·저장 없음', largeCall?.startsWith('POST 413') && count('assessment_plan_revision') === plansBefore, largeCall)
await shot(admin, 'final-pdf-error')
// 오류 5: 권한 없는 관리자
await asAdmin('adm_gangnam')
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles(pdfPath)
await submitUpload(modal)
await admin.waitForTimeout(1200)
check('PDF', '운영 권한 없는 관리자 → 403 오류 표시·저장 없음', calls.some((line) => line.startsWith('POST 403 /api/admin/assessment/evaluation-plans')) && count('assessment_plan_revision') === plansBefore && (await modal.innerText()).includes('FORBIDDEN'), null)
// 오류 6: 네트워크 실패
await asAdmin(null)
await admin.route('**/api/admin/assessment/evaluation-plans', (route) => (route.request().method() === 'POST' ? route.abort('connectionrefused') : route.continue()))
await submitUpload(modal)
await admin.waitForTimeout(1000)
check('PDF', '네트워크 실패 → 오류 표시·성공 표시 없음·저장 없음', (await modal.innerText()).includes('NETWORK_ERROR') && count('assessment_plan_revision') === plansBefore, null)
await asAdmin(null)
// 성공: 등록 (중복 클릭 1회만)
const postsBefore = calls.filter((line) => line.startsWith('POST 201 /api/admin/assessment/evaluation-plans')).length
await modal.getByRole('button', { name: /등록하고 분석/ }).dblclick()
await admin.waitForTimeout(2500)
const created201 = calls.filter((line) => line.startsWith('POST 201 /api/admin/assessment/evaluation-plans')).length - postsBefore
check('PDF', '합성 PDF 등록 201 1회(중복 클릭 방지)', created201 === 1, created201)
const planRow = sql("SELECT p.id, r.id, r.sha256, r.page_count, IFNULL(r.file_ref,'NULL'), r.revision_number FROM assessment_evaluation_plan p JOIN assessment_plan_revision r ON r.plan_id=p.id WHERE p.school_id='school_001' AND p.academic_year=2026 AND p.grade=1 AND p.semester=1")
check('PDF', 'DB: Revision 1·SHA-256·쪽 수 2·file_ref NULL', planRow.length === 1 && planRow[0][2] === 'ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404' && planRow[0][3] === '2' && planRow[0][4] === 'NULL', planRow)
const [planId, rev1] = planRow[0] ?? []
const afterText = await admin.locator('body').innerText()
check('PDF', '목록 갱신 + 안내(원본 미보관·서버 분석 없음), 원본 PDF 버튼 비활성', afterText.includes('synthetic-e2e.pdf') && afterText.includes('원본 PDF를 보관하지 않') && (await admin.getByRole('button', { name: '원본 PDF' }).first().isDisabled()), null)
check('PDF', '업로드만으로 분석 시작처럼 표시하지 않음(분석 요청 버튼 그대로)', (await admin.getByRole('button', { name: '분석 요청' }).count()) > 0, null)
await shot(admin, 'final-pdf-uploaded')
// 개정본 추가
await admin.getByRole('button', { name: '개정본 추가' }).first().click()
modal = admin.getByRole('dialog')
await modal.getByLabel('평가계획서 PDF 파일').setInputFiles(pdfPath)
await submitUpload(modal)
await admin.waitForTimeout(2500)
const revs = sql(`SELECT id, revision_number, sha256 FROM assessment_plan_revision WHERE plan_id='${planId}' ORDER BY revision_number`)
check('PDF', '개정본 추가 → Revision 2, Revision 1 보존', revs.length === 2 && revs[0][0] === rev1 && revs[1][1] === '2', revs.map((r) => r.slice(0, 2)))
check('PDF', '화면 개정 이력에 v1·v2 표시', /v2/.test(await admin.locator('body').innerText()) && /v1/.test(await admin.locator('body').innerText()), null)
await shot(admin, 'final-pdf-revision')

// ================= v21.1 분석 수신 (분석기 JSON 원본, 서버 API) =================
const imported = await api('POST', `/api/admin/assessment/evaluation-plans/${planId}/revisions/${rev1}/analysis-imports`, OP, null, readFileSync(importPath))
check('AI', 'Revision 1에 v21.1 분석 수신 201·UNREVIEWED', imported.status === 201 && imported.body.reviewStatus === 'UNREVIEWED', imported.status)

// ================= P0-2 Admin 검토 확정 =================
await admin.goto(`${ADMIN}/assessment/evaluation-plans/${planId}/revisions/${rev1}`)
await admin.getByTestId('review-confirm-panel').waitFor()
const confirmButton = admin.getByTestId('review-confirm')
const blockers = await admin.getByTestId('review-blockers').innerText()
check('Review', '처음에는 확정 비활성 + 이유 표시(원본 대조·필드·확인 체크)', (await confirmButton.isDisabled()) && blockers.includes('원본 PDF 대조') && blockers.includes('필드') && blockers.includes('확인 체크'), blockers.split('\n').slice(0, 4))
check('Review', '페이지를 열어도 PUT 없음', !calls.some((line) => line.startsWith('PUT')), null)
await admin.getByTestId('review-local-pdf').setInputFiles(otherPdfPath)
await admin.waitForTimeout(800)
check('Review', '다른 PDF 선택 → 불일치·확인 체크 비활성', (await admin.getByTestId('review-hash-status').innerText()).startsWith('불일치') && (await admin.getByTestId('review-attest').isDisabled()), null)
await admin.getByTestId('review-local-pdf').setInputFiles(pdfPath)
await admin.waitForTimeout(800)
check('Review', '등록 원본 선택 → 일치·로컬 PDF 보기', (await admin.getByTestId('review-hash-status').innerText()).startsWith('일치') && (await admin.locator('iframe[title="원본 PDF (로컬 파일)"]').count()) === 1, null)
const row1 = admin.locator('[data-testid=review-field-row][data-field-path="performanceEvaluation.weightPercent"]')
await row1.getByRole('checkbox').check()
const row2b = admin.locator('[data-testid=review-field-row][data-field-path="writtenEvaluation.exams[0].maxScore"]')
await row2b.getByRole('checkbox').check() // AI 후보 null(원문에 시험 전체 만점 없음) → 빈 값 = 원문에 없음 확인
check('Review', '과목 ID 미입력이면 계속 비활성', (await confirmButton.isDisabled()) && (await admin.getByTestId('review-blockers').innerText()).includes('학업 과목 ID'), null)
await admin.getByTestId('review-subject-id-0').fill('subj_01') // 2학기 과목: 이 문서(1학년 1학기) 슬롯이 아니다
await admin.getByTestId('review-attest').check()
check('Review', '조건 충족 → 확정 버튼 활성', await confirmButton.isEnabled(), null)
await confirmButton.click()
await admin.waitForTimeout(1200)
check('Review', '슬롯 밖 과목 ID → 서버 400 subjectId unknown 표시·Review 0·UNREVIEWED', (await admin.getByTestId('review-error').innerText()).includes('reviewedSubjects[0].subjectId: unknown') && count('assessment_plan_review') === 0 && sql(`SELECT review_status FROM assessment_plan_revision WHERE id='${rev1}'`)[0][0] === 'UNREVIEWED', await admin.getByTestId('review-error').innerText())
await admin.getByTestId('review-subject-id-0').fill('subj_14')
const putBefore = calls.filter((line) => line.startsWith('PUT 200')).length
await confirmButton.dblclick()
await admin.waitForTimeout(2000)
check('Review', '[합성 시험] 확정 PUT 200 1회', calls.filter((line) => line.startsWith('PUT 200')).length - putBefore === 1, null)
const review = sql(`SELECT reviewed_by, analysis_id FROM assessment_plan_review WHERE revision_id='${rev1}'`)
const values = sql(`SELECT subject_id, field_path, IFNULL(value_json,'NULL'), IFNULL(pdf_page_number,'NULL') FROM assessment_plan_confirmed_value WHERE revision_id='${rev1}' ORDER BY field_path`)
check('Review', 'DB Review 1건(Mock 관리자 ID·수신 analysisId)', review.length === 1 && review[0][0] === 'adm_plan_operator' && review[0][1] === imported.body.analysisId, review)
check('Review', 'DB 확정값: 수행 비율 60(1쪽), 지필 만점 null=원문에 없음 확인(관리자가 본 쪽 1)', JSON.stringify(values) === JSON.stringify([['subj_14', 'performanceEvaluation.weightPercent', '60', '1'], ['subj_14', 'writtenEvaluation.exams[0].maxScore', 'NULL', '1']]), values)
check('Review', 'AI 후보 Run 그대로 REVIEW_REQUIRED', sql(`SELECT status FROM assessment_plan_analysis_run WHERE revision_id='${rev1}'`)[0][0] === 'REVIEW_REQUIRED', null)
const reviewedText = await admin.locator('body').innerText()
check('Review', '재조회 화면: 관리자 확인 완료·확정값 표시', reviewedText.includes('관리자 확인 완료') && (await admin.getByTestId('confirmed-fields').innerText()).includes('performanceEvaluation.weightPercent = 60'), null)
check('Review', '확정 뒤 추가 확정 차단(재검토 정책 미확정)', (await confirmButton.isDisabled()) && (await admin.getByTestId('review-blockers').innerText()).includes('재검토'), null)
await shot(admin, 'final-review-confirmed')
// Revision 2(분석 없음): 확정 차단
await admin.goto(`${ADMIN}/assessment/evaluation-plans/${planId}/revisions/${revs[1]?.[0]}`)
await admin.waitForTimeout(1500)
const rev2Text = await admin.locator('body').innerText()
check('Review', '분석 없는 Revision 2: 확정 영역 비활성·이유 표시', (await admin.getByTestId('review-confirm').isDisabled()) && rev2Text.includes('받은 분석 결과가 없어요'), null)

// ================= 학생 공개 상태 / 참조 =================
const plans = await api('GET', '/api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=1&semester=1', ST1)
const mine = plans.body.items.find((item) => item.planId === planId)
check('Student', '학생: 문서의 최신 Revision(v2, 분석·검토 없음) UNREVIEWED로 표시, 후보 미노출', mine?.documentRevisionId === revs[1]?.[0] && mine?.reviewStatus === 'UNREVIEWED' && !JSON.stringify(plans.body).includes('가상과학탐구'), mine)
const refP99 = await api('POST', '/api/student/assessment/school-assessments', ST1, { title: 'P99', subjectId: 'subj_14', academicYear: 2026, semester: 1, evaluationItemRef: { documentRevisionId: rev1, subjectId: 'subj_14', itemKey: 'P99' } })
const refW01 = await api('POST', '/api/student/assessment/school-assessments', ST1, { title: 'W01', subjectId: 'subj_14', academicYear: 2026, semester: 1, evaluationItemRef: { documentRevisionId: rev1, subjectId: 'subj_14', itemKey: 'W01' } })
const refP01 = await api('POST', '/api/student/assessment/school-assessments', ST1, { title: '탐구 보고서', subjectId: 'subj_14', academicYear: 2026, semester: 1, evaluationItemRef: { documentRevisionId: rev1, subjectId: 'subj_14', itemKey: 'P01' } })
check('Student', 'P99 400 unknown / W01 400 not_allowed / P01 201', refP99.status === 400 && refW01.status === 400 && refW01.body.details.fields[0].reason === 'not_allowed' && refP01.status === 201, [refP99.status, refW01.status, refP01.status])

await browser.close()
const summary = { pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length, planId, rev1, assessmentId: id }
console.log(JSON.stringify(summary))
writeFileSync(outPath, JSON.stringify({ summary, results, calls }, null, 1))
