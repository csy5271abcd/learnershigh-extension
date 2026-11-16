// Student ↔ Admin 실데이터 교차 E2E (합성 데이터, 격리 Backend·Schema 전용, 로컬).
// usage: node cross-surface-e2e.mjs <chrome.exe> <out.json> <shot dir> <studentBase> <adminBase> <apiBase>
// 전제: Student(http, stu_001, 2026-1)·Admin(http, adm_demo_gangnam)·Backend가 같은 MySQL Schema를 쓴다.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, STUDENT, ADMIN, API] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const ST = { 'X-Assessment-Student-Id': 'stu_001', 'Content-Type': 'application/json' }
const AD = { 'X-Assessment-Admin-Id': 'adm_demo_gangnam' }
const api = async (path, headers = ST, init = {}) => {
  const response = await fetch(API + path, { headers, ...init })
  return { status: response.status, body: await response.json().catch(() => null) }
}
const stamp = Date.now().toString(36)
const title = `교차 E2E 수질 탐구 ${stamp}`
const pdf = (label) => Buffer.from(`%PDF-1.7\n% ${label} ${stamp}\n`, 'latin1')

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

// ---- 0. 학생 수행평가 (API로 준비, 화면은 상세부터) ----
const created = await api('/api/student/assessment/school-assessments', ST, { method: 'POST', body: JSON.stringify({ title, subjectId: 'subj_12', academicYear: 2026, semester: 1 }) })
const sa = created.body.assessmentId
check('setup', '수행평가 생성 201', created.status === 201, sa)

// ---- 1. 노트 v1(템플릿) → v2(입력) ----
await page.goto(`${STUDENT}/assessment/school-assessments/${sa}`, { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('button', { name: '실험 보고서' }).click()
await page.getByText('저장됨 · v1').waitFor({ timeout: 15000 })
check('note', '템플릿 노트 생성 → 저장됨 v1 (POST /notes)', true)
const editable = page.locator('[contenteditable="true"], textarea').nth(1)
await editable.click()
await page.keyboard.type(`측정 지점 3곳 ${stamp}`)
await page.getByText('저장됨 · v2').waitFor({ timeout: 15000 })
let notes = (await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`)).body
const noteId = notes.items[0].noteId
const revisions = (await api(`/api/student/assessment/notes/${noteId}/revisions`)).body.items
check('note', '입력 자동 저장 → v2, DB Revision 2개', revisions.length === 2 && JSON.stringify(notes.items[0].blocks).includes(stamp), revisions.map((r) => r.revisionNumber))
const r1 = (await api(`/api/student/assessment/notes/${noteId}/revisions/${revisions[0].revisionId}`)).body
check('note', '과거 r1 본문은 그대로 (입력 문구 없음)', !JSON.stringify(r1.blocks).includes(stamp))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const noteValues = await page.locator('textarea').evaluateAll((elements) => elements.map((element) => element.value))
check('note', '새로고침 후 노트 내용 유지', noteValues.some((value) => value.includes(`측정 지점 3곳 ${stamp}`)))
await page.screenshot({ path: `${shotDir}/c01-student-note.png` })

// ---- 2. 결과물 v1 → v2 → 다운로드 ----
await page.getByRole('button', { name: '결과 파일 등록' }).click()
let dialog = page.getByRole('dialog')
await dialog.getByLabel(/결과물 이름/).fill('탐구 보고서')
await dialog.locator('input[type="file"]').setInputFiles({ name: '수질_탐구보고서_v1.pdf', mimeType: 'application/pdf', buffer: pdf('v1') })
await dialog.getByRole('button', { name: '올리기' }).click()
await dialog.waitFor({ state: 'detached', timeout: 15000 })
await page.getByRole('button', { name: '새 버전' }).first().click()
dialog = page.getByRole('dialog')
await dialog.locator('input[type="file"]').setInputFiles({ name: '수질_탐구보고서_v2.pdf', mimeType: 'application/pdf', buffer: pdf('v2') })
await dialog.getByRole('button', { name: '올리기' }).click()
await dialog.waitFor({ state: 'detached', timeout: 15000 })
await page.getByText('수질_탐구보고서_v2.pdf').first().waitFor({ timeout: 15000 })
const artifacts = (await api(`/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`)).body.items
const versions = (await api(`/api/student/assessment/artifacts/${artifacts[0].artifactId}/versions`)).body.items
check('artifact', '결과물 1개, 버전 v1·v2 독립 보존', artifacts.length === 1 && versions.map((v) => v.versionNumber).join() === '1,2', versions.map((v) => v.file.fileName))
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '탐구 보고서 내려받기' }).click()])
const downloaded = readFileSync(await download.path())
check('artifact', '내려받은 파일 = 업로드한 v2 바이트', createHash('sha256').update(downloaded).digest('hex') === createHash('sha256').update(pdf('v2')).digest('hex'), download.suggestedFilename())
await page.screenshot({ path: `${shotDir}/c02-student-artifacts.png` })

// ---- 3. 피드백 요청 ----
await page.getByRole('button', { name: '선생님께 피드백 요청' }).first().click()
await page.waitForTimeout(800)
const sendButtons = page.getByRole('button', { name: '선생님께 피드백 요청' })
await sendButtons.last().click()
await page.waitForTimeout(2500)
let requests = (await api('/api/student/assessment/feedback-requests?page=0&size=50')).body.items
const request = requests.find((r) => r.snapshot.noteRevisionId === revisions[1].revisionId)
check('feedback', '학생 피드백 요청 → DB PENDING, Snapshot = 노트 r2 + 결과물 v2', request?.status === 'PENDING' && request.snapshot.artifactVersionIds[0] === versions[1].versionId, request?.snapshot)
await page.screenshot({ path: `${shotDir}/c03-student-requested.png` })
// "요청을 보냈어요" 확인 Modal 닫기
if (await page.getByRole('dialog').count()) {
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

// 요청 뒤 학생이 노트를 고쳐도 Snapshot 불변
await editable.click()
await page.keyboard.type(' 요청 후 수정')
await page.getByText('저장됨 · v3').waitFor({ timeout: 15000 })

// ---- 4. 관리자: 대기열 → 요청 당시 노트·파일 → 초안 → 전달 ----
const admin = await context.newPage()
admin.on('pageerror', (error) => errors.push('admin: ' + String(error)))
await admin.goto(`${ADMIN}/assessment/feedback`, { waitUntil: 'networkidle', timeout: 60000 })
await admin.getByText(title).first().waitFor({ timeout: 20000 })
check('admin', '관리자 피드백 대기열에 같은 요청(같은 제목) 표시', true)
await admin.screenshot({ path: `${shotDir}/c04-admin-queue.png` })
await admin.getByText(title).first().click()
await admin.waitForTimeout(2500)
const detailText = await admin.locator('main, #root').first().innerText()
check('admin', '요청 당시 노트(r2) 표시, 요청 후 입력(v3)은 없음', detailText.includes(`측정 지점 3곳 ${stamp}`) && !detailText.includes('요청 후 수정'))
check('admin', '요청 당시 결과물 v2 파일 표시', detailText.includes('수질_탐구보고서_v2.pdf'))
await admin.getByPlaceholder('학생에게 전달할 의견을 자유롭게 적어 주세요').fill(`측정 지점을 고른 이유를 노트에 적어 주세요 ${stamp}`)
await admin.getByRole('button', { name: '임시 저장' }).click()
await admin.waitForTimeout(1500)
let reply = (await api(`/api/student/assessment/feedback-requests/${request.requestId}/reply`)).body
check('admin', '초안 저장 후 학생에게는 아직 안 보임 (reply = null, PENDING)', reply.status === 'PENDING' && reply.reply === null)
await admin.getByRole('button', { name: '보내기' }).first().click()
await admin.getByRole('dialog').getByRole('button', { name: '보내기' }).click()
await admin.waitForTimeout(2500)
reply = (await api(`/api/student/assessment/feedback-requests/${request.requestId}/reply`)).body
check('admin', '전달 → DB DELIVERED, 학생 응답에 의견 포함', reply.status === 'DELIVERED' && reply.reply?.overallComment.includes(stamp))
await admin.screenshot({ path: `${shotDir}/c05-admin-delivered.png` })
const saStatus = (await api(`/api/student/assessment/school-assessments/${sa}`)).body.status
check('admin', '전달이 수행평가 상태를 바꾸지 않음', saStatus === 'BEFORE_START', saStatus)

// ---- 5. 학생: 피드백 확인 ----
await page.goto(`${STUDENT}/assessment/feedback`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const feedbackPage = await page.locator('main').innerText()
check('student', '학생 피드백 목록에 답변 완료 표시', feedbackPage.includes(title) || feedbackPage.includes('답변'), feedbackPage.slice(0, 200))
await page.goto(`${STUDENT}/assessment/school-assessments/${sa}?panel=feedback`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
check('student', '상세 피드백 패널에 관리자 의견 표시', (await page.locator('main').innerText()).includes(`측정 지점을 고른 이유를 노트에 적어 주세요 ${stamp}`))
await page.screenshot({ path: `${shotDir}/c06-student-feedback.png` })

// ---- 6. 관리자 학생 기록: 같은 노트·파일 ----
await admin.goto(`${ADMIN}/assessment/students/stu_001`, { waitUntil: 'networkidle' })
await admin.waitForTimeout(2000)
await admin.getByText(title).first().click()
await admin.waitForTimeout(1500)
await admin.getByRole('tab', { name: '관리자 기록 도구' }).click().catch(() => admin.getByText('관리자 기록 도구').click())
await admin.waitForTimeout(2500)
const recordText = await admin.locator('main, #root').first().innerText()
check('admin-record', '관리자 학생 기록: 같은 수행평가·최신 노트(v3)·결과물 버전', recordText.includes(title) && recordText.includes('요청 후 수정') && recordText.includes('수질_탐구보고서_v1.pdf'), recordText.slice(0, 160))
await admin.screenshot({ path: `${shotDir}/c07-admin-record.png`, fullPage: true })

// ---- 7. 권한 ----
const otherStudent = await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, { 'X-Assessment-Student-Id': 'stu_002' })
const otherAdmin = await api(`/api/admin/assessment/feedback-requests/${request.requestId}`, { 'X-Assessment-Admin-Id': 'adm_bundang' })
check('security', '다른 학생 404 · 다른 지점 관리자 404', otherStudent.status === 404 && otherAdmin.status === 404, [otherStudent.status, otherAdmin.status])

check('runtime', '페이지 예외 0', errors.length === 0, errors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), sa, results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
