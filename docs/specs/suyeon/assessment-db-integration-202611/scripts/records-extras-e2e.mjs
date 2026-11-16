// 성장 기록·중요 표시·관리자 공개 자료 → 학생 조회 (실제 UI + 같은 DB, 합성 데이터, 격리 환경).
// usage: node records-extras-e2e.mjs <chrome.exe> <out.json> <shot dir> <studentBase> <adminBase> <apiBase>
import { writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, STUDENT, ADMIN, API] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const ST = { 'X-Assessment-Student-Id': 'stu_001', 'Content-Type': 'application/json' }
const api = async (path, headers = ST, init = {}) => {
  const response = await fetch(API + path, { headers, ...init })
  return { status: response.status, body: await response.json().catch(() => null) }
}
const stamp = Date.now().toString(36)
const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

const sa = (await api('/api/student/assessment/school-assessments', ST, { method: 'POST', body: JSON.stringify({ title: `성장 E2E ${stamp}`, subjectId: 'subj_13', academicYear: 2026, semester: 1 }) })).body.assessmentId

// ---- E2E-05 성장 기록 (화면 작성 → 저장 → 새로고침) ----
await page.goto(`${STUDENT}/assessment/growth/new`, { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('form', { name: '성장 기록' }).waitFor({ timeout: 15000 })
const form = page.getByRole('form', { name: '성장 기록' })
await form.locator('input').first().fill(`토론 준비 성장 기록 ${stamp}`)
const textareas = form.locator('textarea')
await textareas.first().fill(`사회 문제에 관심이 생겼다 ${stamp}`)
await page.screenshot({ path: `${shotDir}/g01-growth-form.png` })
await form.getByRole('button', { name: /저장/ }).last().click()
await page.waitForTimeout(2500)
const records = (await api('/api/student/assessment/growth-records?page=0&size=50')).body.items
const record = records.find((r) => r.title === `토론 준비 성장 기록 ${stamp}`)
check('growth', '화면 작성 → POST → DB 저장', Boolean(record), records.map((r) => r.title).slice(0, 3))
if (record) {
  await page.goto(`${STUDENT}/assessment/growth/${record.recordId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const values = await page.locator('input, textarea').evaluateAll((elements) => elements.map((element) => element.value))
  const shown = values.join(' ') + (await page.locator('main').innerText())
  check('growth', '새로고침(직접 URL) 후 저장값 표시', shown.includes(`사회 문제에 관심이 생겼다 ${stamp}`))
  const adminView = await api('/api/admin/assessment/students/stu_001/growth-records', { 'X-Assessment-Admin-Id': 'adm_demo_gangnam' })
  check('growth', '관리자(담당 지점)가 같은 성장 기록 조회', adminView.body.items.some((r) => r.recordId === record.recordId))
}
await page.goto(`${STUDENT}/assessment/growth`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
check('growth', '성장 기록 목록 화면에 표시', (await page.locator('main').innerText()).includes(`토론 준비 성장 기록 ${stamp}`))
await page.screenshot({ path: `${shotDir}/g02-growth-list.png` })

// ---- E2E-06 중요 표시 ----
await page.goto(`${STUDENT}/assessment/school-assessments`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.locator(`button[aria-label="성장 E2E ${stamp} 즐겨찾기"]`).first().click({ force: true })
await page.waitForTimeout(1500)
const favorites = (await api('/api/student/assessment/archive?tab=favorites&page=0&size=50')).body.items
check('favorite', '목록 별표 → PUT → DB 중요 표시', favorites.some((item) => item.sourceId === sa))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.goto(`${STUDENT}/assessment/archive?tab=favorites`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
check('favorite', '보관함 중요 탭에 표시(새로고침 후 유지)', (await page.locator('main').innerText()).includes(`성장 E2E ${stamp}`))
await page.screenshot({ path: `${shotDir}/g03-favorites.png` })

// ---- E2E-06 학생 자료 등록 (API) / E2E-08 관리자 공개 → 학생 조회 (관리자 UI) ----
const resource = await api('/api/student/assessment/resources', ST, { method: 'POST', body: JSON.stringify({ type: 'ARTICLE', title: `내 자료 ${stamp}`, sourceUrl: 'https://example.org/mine', tags: ['합성'] }) })
check('resource', '학생 개인 자료 등록 201', resource.status === 201)
const scrap = await api('/api/admin/assessment/reference-library', { 'X-Assessment-Admin-Id': 'adm_demo_gangnam', 'Content-Type': 'application/json' },
  { method: 'POST', body: JSON.stringify({ type: 'ARTICLE', title: `선생님 공개 자료 ${stamp}`, sourceUrl: 'https://example.org/shared', sourceName: '예시 출처', memo: '탐구 출발점으로 읽어 보세요', tags: [], subjectIds: [] }) })
const admin = await context.newPage()
admin.on('pageerror', (error) => errors.push('admin: ' + String(error)))
admin.on('dialog', (dialog) => dialog.accept())
await admin.goto(`${ADMIN}/assessment/references`, { waitUntil: 'networkidle', timeout: 60000 })
await admin.waitForTimeout(2000)
await admin.getByRole('button', { name: /내 스크랩/ }).first().click()
await admin.waitForTimeout(1500)
const row = admin.locator('tr').filter({ hasText: `선생님 공개 자료 ${stamp}` })
await row.getByTestId('scrap-publish').click()
await admin.waitForTimeout(2000)
await admin.screenshot({ path: `${shotDir}/g04-admin-publish.png` })
const publishedNow = (await api(`/api/admin/assessment/reference-library/${scrap.body.scrapId}`, { 'X-Assessment-Admin-Id': 'adm_demo_gangnam' })).body.published
check('resource', '관리자 화면에서 공개 → DB PUBLISHED', publishedNow === true)
await page.goto(`${STUDENT}/assessment/resources`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const libraryText = await page.locator('main').innerText()
check('resource', '학생 자료함: 내 자료 + 선생님이 공개한 자료 표시', libraryText.includes(`내 자료 ${stamp}`) && libraryText.includes(`선생님 공개 자료 ${stamp}`))
await page.screenshot({ path: `${shotDir}/g05-student-library.png`, fullPage: true })
const otherStudentList = (await api('/api/student/assessment/resources?page=0&size=50', { 'X-Assessment-Student-Id': 'stu_002' })).body.items
check('resource', '다른 학생에게 내 개인 자료는 안 보임', !otherStudentList.some((r) => r.title === `내 자료 ${stamp}`))

check('runtime', '페이지 예외 0', errors.length === 0, errors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
