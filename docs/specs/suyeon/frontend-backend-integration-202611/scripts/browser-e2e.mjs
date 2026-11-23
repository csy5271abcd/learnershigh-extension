// Student·Admin Assessment 화면 × 실제 Backend(18080)·로컬 MySQL 브라우저 검증 (합성 데이터, 로컬 전용).
// 전제: Student Vite(5173, http 모드, stu_001), Admin Vite(5174, http 모드, adm_plan_operator), Backend(18080).
// usage: node browser-e2e.mjs <chrome.exe> <out.json> <screenshot dir>
import { writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir] = process.argv.slice(2)
const API = 'http://localhost:18080'
const STUDENT = 'http://localhost:5173'
const ADMIN = 'http://localhost:5174'
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
async function api(method, path, headers, body) {
  const response = await fetch(API + path, { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ST1 = { 'X-Assessment-Student-Id': 'stu_001' }
const ST2 = { 'X-Assessment-Student-Id': 'stu_002' }
const term = 'academicYear=2026&semester=1'
const serverList = async () => (await api('GET', `/api/student/assessment/school-assessments?${term}&page=0&size=100`, ST1)).body.items

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const calls = []
page.on('requestfinished', async (request) => {
  if (!request.url().includes('/api/')) return
  if (request.url().includes('/src/')) return
  const response = await request.response()
  calls.push(`${request.method()} ${response?.status()} ${request.url().replace(/^https?:\/\/[^/]+/, '')}`)
})
const shot = (name) => page.screenshot({ path: `${shotDir}/${name}.png` })

// ---------- Student ----------
await page.goto(`${STUDENT}/assessment/school-assessments`)
await page.getByRole('region', { name: '수행평가 목록' }).or(page.locator('section[aria-label="수행평가 목록"]')).waitFor()
await page.waitForTimeout(800)
const before = await serverList()
for (const item of before) check('S2', `목록에 서버 항목 표시: ${item.title}`, await page.getByText(item.title, { exact: true }).first().isVisible(), item.assessmentId)
check('S8', 'Mock 표시 배지 없음(http 모드)', !(await page.getByText('시연용 샘플 데이터').count()), null)

const title = `브라우저 등록 ${Date.now()}`
await page.getByRole('button', { name: '수행평가 추가' }).first().click()
const dialog = page.getByRole('dialog')
await dialog.getByLabel('수행평가 이름').fill(title)
await dialog.getByRole('radio', { name: '공통국어1' }).check({ force: true })
await dialog.locator('button[type=submit]').click()
await page.waitForTimeout(1500)
const created = (await serverList()).filter((item) => item.title === title)
check('S3', '화면 등록 → 서버에 1건 저장(마감일 null, BEFORE_START, subj_11)', created.length === 1 && created[0].deadlineDate === null && created[0].status === 'BEFORE_START' && created[0].subjectId === 'subj_11', created)
const createdId = created[0]?.assessmentId
await shot('s-after-create')

await page.goto(`${STUDENT}/assessment/school-assessments`)
await page.waitForTimeout(1500)
check('S3', '새로고침 후 같은 항목 표시', await page.getByText(title, { exact: true }).first().isVisible(), createdId)

await page.getByLabel(`${title} 진행 상태`).selectOption('IN_PROGRESS')
await page.waitForTimeout(1200)
const afterStatus = await api('GET', `/api/student/assessment/school-assessments/${createdId}`, ST1)
check('S6', '화면 상태 변경 → 서버 IN_PROGRESS', afterStatus.body.status === 'IN_PROGRESS', afterStatus.body.status)
const reverseDisabled = await page.getByLabel(`${title} 진행 상태`).locator('option[value="BEFORE_START"]').isDisabled()
check('S6', '역방향 선택지는 화면에서 비활성', reverseDisabled, null)
const reverse = await api('PATCH', `/api/student/assessment/school-assessments/${createdId}/status`, ST1, { status: 'BEFORE_START' })
check('S6', '역방향 서버 요청 409 INVALID_STATE_TRANSITION', reverse.status === 409 && reverse.body.code === 'INVALID_STATE_TRANSITION', reverse.status)

await page.getByRole('button', { name: /^진행 중/ }).click()
await page.waitForTimeout(800)
check('S2', '상태 필터 진행 중: 새 항목 보임', await page.getByText(title, { exact: true }).first().isVisible(), null)
await page.getByRole('button', { name: /^시작 전/ }).click()
await page.waitForTimeout(800)
check('S2', '상태 필터 시작 전: 새 항목 숨김', !(await page.getByText(title, { exact: true }).count()), null)
check('S2', '필터 요청이 서버 Query로 전달됨(status=BEFORE_START)', calls.some((line) => line.includes('status=BEFORE_START')), calls.filter((line) => line.includes('status=')).slice(-1))
await page.goto(`${STUDENT}/assessment/school-assessments`)
await page.waitForTimeout(1000)
await page.getByRole('link', { name: /과학탐구실험1/ }).first().click()
await page.waitForTimeout(1200)
check('S2', '과목(과학탐구실험1) 화면: 공통국어1 새 항목 숨김', !(await page.getByText(title, { exact: true }).count()), page.url())
check('S2', '과목 필터가 서버 Query로 전달됨(subjectId=subj_14)', calls.some((line) => line.includes('subjectId=subj_14')), null)

await page.goto(`${STUDENT}/assessment/school-assessments/${encodeURIComponent(createdId)}`)
await page.waitForTimeout(1500)
check('S4', '상세 화면: 서버 상세 GET 200 + 제목 표시', calls.some((line) => line.startsWith(`GET 200 /api/student/assessment/school-assessments/${createdId}`)) && (await page.getByText(title).first().isVisible()), null)
await shot('s-detail')

// S5 PATCH: 화면에 수정 UI 없음(평가 정보 수정 버튼은 안내만). Adapter는 서버로 확인.
const patch = await api('PATCH', `/api/student/assessment/school-assessments/${createdId}`, ST1, { deadlineDate: '2026-12-01' })
check('S5', '수정 API(서버 직접) 200, 마감일 반영', patch.status === 200 && patch.body.deadlineDate === '2026-12-01', patch.status)
await page.reload()
await page.waitForTimeout(1500)
check('S5', '수정 후 상세 재조회에 반영(12월 1일 표시)', (await page.locator('body').innerText()).includes('12월 1일') || (await page.locator('body').innerText()).includes('12. 1'), null)

// 오류: 404 (다른 학생 기록)
const other = await api('POST', '/api/student/assessment/school-assessments', ST2, { title: '다른 학생 기록', subjectId: 'subj_11', academicYear: 2026, semester: 1 })
await page.goto(`${STUDENT}/assessment/school-assessments/${encodeURIComponent(other.body.assessmentId)}`)
await page.waitForTimeout(1500)
const text404 = await page.locator('body').innerText()
check('E', '다른 학생 기록 404: 화면에 내용 미노출·오류 표시', !text404.includes('다른 학생 기록') && calls.some((line) => line.includes(`404 /api/student/assessment/school-assessments/${other.body.assessmentId}`)), text404.match(/(찾을 수 없|ASSESSMENT_NOT_FOUND)[^\n]*/)?.[0])
await shot('s-404')

// 오류: 400 (서버 검증) — 화면 요청 본문의 과목만 바꿔 실제 서버 400 확인
await page.goto(`${STUDENT}/assessment/school-assessments`)
await page.waitForTimeout(1000)
await page.route('**/api/student/assessment/school-assessments', async (route) => {
  if (route.request().method() !== 'POST') return route.continue()
  const body = JSON.parse(route.request().postData())
  return route.continue({ postData: JSON.stringify({ ...body, subjectId: 'subj_999' }) })
})
await page.getByRole('button', { name: '수행평가 추가' }).first().click()
await dialog.getByLabel('수행평가 이름').fill('검증 실패 시험')
await dialog.getByRole('radio', { name: '공통국어1' }).check({ force: true })
await dialog.locator('button[type=submit]').click()
await page.waitForTimeout(1200)
check('E', '서버 400 VALIDATION_ERROR: Modal 유지·오류 표시·저장 없음', (await dialog.isVisible()) && !(await serverList()).some((item) => item.title === '검증 실패 시험'), (await dialog.innerText()).match(/과목[^\n]*/)?.[0])
await shot('s-400')
await page.unrouteAll({ behavior: 'ignoreErrors' })

// 오류: 401 (인증 Header 제거 → 실제 서버 401), 연결 실패(abort) — 둘 다 Mock 성공값으로 바꾸지 않는다
for (const [name, handler] of [
  ['401 인증 없음', async (route) => { const headers = { ...route.request().headers() }; delete headers['x-assessment-student-id']; return route.continue({ headers }) }],
  ['서버 연결 실패', (route) => route.abort('connectionrefused')],
]) {
  const fresh = await context.newPage()
  await fresh.route('**/api/student/**', handler)
  await fresh.goto(`${STUDENT}/assessment/school-assessments`)
  await fresh.waitForTimeout(2000)
  const body = await fresh.locator('body').innerText()
  check('E', `${name}: 오류 표시, 서버/Mock 데이터 미표시`, !body.includes(title) && !body.includes('시연용') && /(불러오지 못했|연결하지 못했|UNAUTHORIZED|NETWORK_ERROR)/.test(body), body.match(/[^\n]*(불러오지 못했|연결하지 못했)[^\n]*/)?.[0])
  await fresh.screenshot({ path: `${shotDir}/s-${name.startsWith('401') ? '401' : 'network'}.png` })
  await fresh.close()
}

// S7 학생 평가계획서: PDF로 가져오기 Modal (목록 §10-1) — 후보 미노출
await page.goto(`${STUDENT}/assessment/school-assessments`)
await page.waitForTimeout(1000)
await page.getByRole('button', { name: 'PDF로 가져오기' }).first().click()
await page.waitForTimeout(1500)
const pdfText = await page.locator('body').innerText()
check('S7', '학생 평가계획서 목록 GET 200 (§10-1)', calls.some((line) => line.startsWith('GET 200 /api/student/assessment/evaluation-plans?')), null)
check('S7', '학생 화면에 AI 후보(가상과학탐구·채점 문장) 미노출', !pdfText.includes('가상과학탐구') && !pdfText.includes('변인'), null)
await shot('s-plans')

// ---------- Admin ----------
const admin = await context.newPage()
admin.on('requestfinished', async (request) => {
  if (!request.url().includes('/api/admin')) return
  const response = await request.response()
  calls.push(`${request.method()} ${response?.status()} ${request.url().replace(/^https?:\/\/[^/]+/, '')}`)
})
const asAdmin = async (target, adminId) => {
  await admin.unrouteAll({ behavior: 'ignoreErrors' })
  await admin.route('**/api/admin/**', (route) => route.continue({ headers: { ...route.request().headers(), 'x-assessment-admin-id': adminId } }))
  await admin.goto(target)
  await admin.waitForTimeout(2000)
}
await asAdmin(`${ADMIN}/assessment/students/stu_001?term=2026-1`, 'adm_gangnam')
const rows = await admin.locator('[data-testid=http-school-assessment]').evaluateAll((list) => list.map((li) => ({ id: li.dataset.assessmentId, status: li.dataset.status })))
const serverNow = await serverList()
check('A1', '관리자(강남) 화면 = 학생 서버 목록 (같은 ID·상태)', rows.length === serverNow.length && serverNow.every((item) => rows.some((row) => row.id === item.assessmentId && row.status === item.status)), rows)
check('A1', '관리자 화면에 학생 수정 UI 없음(읽기 전용)', !(await admin.locator('select[aria-label$="진행 상태"]').count()), null)
await admin.screenshot({ path: `${shotDir}/a-student.png` })
await asAdmin(`${ADMIN}/assessment/students/stu_001?term=2026-1`, 'adm_bundang')
const bundang = await admin.locator('body').innerText()
check('A1', '다른 지점 관리자(분당): 404 오류 표시, 기록 미노출', !bundang.includes(title) && calls.some((line) => line.startsWith('GET 404 /api/admin/assessment/students/stu_001')), bundang.match(/[^\n]*(찾을 수 없|불러오지 못했)[^\n]*/)?.[0])

await asAdmin(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026&slot=1-1`, 'adm_plan_operator')
check('A2', '평가계획서 목록에 서버 문서(synthetic-e2e.pdf)', await admin.getByText('synthetic-e2e.pdf').first().isVisible(), null)
check('A3', '원본 PDF 열기 비활성(원본 미보관)', await admin.getByRole('button', { name: '원본 PDF' }).first().isDisabled(), null)
await admin.screenshot({ path: `${shotDir}/a-plans.png` })
await admin.getByRole('button', { name: '분석 결과 열기' }).first().click()
await admin.waitForTimeout(2000)
const review = await admin.locator('body').innerText()
check('A4', '분석 조회 GET 200', calls.some((line) => /GET 200 \/api\/admin\/assessment\/evaluation-plans\/.+\/analysis$/.test(line)), null)
check('A4', '외부 분석기 후보 안내·분석기 버전 표시', (await admin.getByTestId('analysis-candidate-notice').isVisible()) && review.includes('v21.1/backend-adapter-0.2'), null)
check('A4', '후보 과목·수행 항목 표시(가상과학탐구·탐구 보고서·토론 활동)', ['가상과학탐구', '탐구 보고서', '토론 활동'].every((word) => review.includes(word)), null)
check('A4', '확인된 값(확정)과 후보 구분 표시', await admin.getByTestId('confirmed-fields').isVisible(), (await admin.getByTestId('confirmed-fields').innerText().catch(() => '')).slice(0, 120))
check('A5', '확정 버튼 비활성(자동·화면 확정 없음, C-7)', await admin.getByTestId('review-confirm-disabled').isDisabled(), null)
check('A5', '화면을 열어도 검토 PUT 호출 없음', !calls.some((line) => line.startsWith('PUT')), null)
await admin.screenshot({ path: `${shotDir}/a-review.png`, fullPage: true })

await browser.close()
const summary = { pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length, createdId }
console.log(JSON.stringify(summary))
writeFileSync(outPath, JSON.stringify({ summary, results, calls }, null, 1))
