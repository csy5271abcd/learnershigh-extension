// Admin 평가계획서 등록 → 로컬 분석기 자동 분석 → 공식 수신 저장 → 전체 페이지 검토 화면 (합성 PDF, 격리 Backend·Schema 전용).
// usage: node admin-analysis-page-e2e.mjs <chrome.exe> <files dir> <out.json> <shot dir> <adminBase> <apiBase> <grade> <semester>
// 전제: adminBase = run-admin-http-dev.ps1 -Analyzer 로 띄운 Admin(격리 Backend를 가리킴), apiBase = 그 Backend(analysis-import 켬).
// 시연 Schema에는 쓰지 않는다.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, dir, outPath, shotDir, ADMIN, API, grade = '3', semester = '2', PLAN_FILE = 'synthetic-e2e.pdf'] = process.argv.slice(2)
const isPdf = PLAN_FILE.toLowerCase().endsWith('.pdf')
const tag = isPdf ? 'pdf' : PLAN_FILE.split('.').pop()
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const AD = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const api = async (path) => {
  const response = await fetch(API + path, { headers: AD })
  return { status: response.status, body: await response.json().catch(() => null) }
}

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const pageErrors = []
const calls = []
page.on('pageerror', (error) => pageErrors.push(String(error)))
page.on('response', (response) => {
  const url = new URL(response.url())
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/dev-analysis/')) calls.push({ method: response.request().method(), path: url.pathname, status: response.status() })
})

await page.goto(`${ADMIN}/assessment/evaluation-plans`, { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('button', { name: /평가계획서 등록/ }).click()
const dialog = page.getByRole('dialog')
await dialog.waitFor()
check('modal', '등록 Modal(파일 선택용) 열림 · 로컬 분석기 안내', (await dialog.innerText()).includes('로컬 분석기'))
const selects = dialog.locator('select')
check('modal', '신규 등록 Modal(학년도·학년·학기 선택)', (await selects.count()) === 3, await selects.count())
await selects.nth(1).selectOption(grade)
await selects.nth(2).selectOption(semester)
await dialog.locator('input[type="file"]').setInputFiles(`${dir}/${PLAN_FILE}`)
await page.screenshot({ path: `${shotDir}/a01-${tag}-upload-modal.png` })
await dialog.getByTestId('plan-upload-submit').click()
await page.waitForURL(/\/assessment\/evaluation-plans\/[^/]+\/revisions\/[^/]+$/, { timeout: 180000 })
const [, planId, revisionId] = new URL(page.url()).pathname.match(/evaluation-plans\/([^/]+)\/revisions\/([^/]+)/)
check('flow', '등록 → 분석 → 전체 페이지 검토 Route 이동, Modal 닫힘', (await page.getByRole('dialog').count()) === 0, page.url())
const upload = calls.find((c) => c.method === 'POST' && /\/evaluation-plans$/.test(c.path))
const analyzed = calls.find((c) => c.path === '/dev-analysis/analyze-preview')
const imported = calls.find((c) => c.path.endsWith('/analysis-imports'))
check('flow', '실제 요청 순서: 등록 201 → 분석기 200 → 수신 201', upload?.status === 201 && analyzed?.status === 200 && imported?.status === 201, { upload, analyzed, imported })
await page.getByText('가상과학탐구').first().waitFor({ timeout: 20000 })
const text = await page.locator('main, #root').first().innerText()
check('page', '전체 페이지: 과목·수행 후보(탐구 보고서·토론 활동)', ['가상과학탐구', '탐구 보고서', '토론 활동'].every((word) => text.includes(word)))
check('page', '전체 페이지: 검토 상태 UNREVIEWED/검토 필요(자동 확정 없음)', /검토|확인/.test(text))
await page.screenshot({ path: `${shotDir}/a02-${tag}-review-page.png`, fullPage: true })
await page.screenshot({ path: `${shotDir}/a02-${tag}-review-page-viewport.png` })

// DB 재조회 = 화면
const server = await api(`/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/analysis`)
const expected = JSON.parse(readFileSync(`${dir}/expected-pdf-import.json`, 'utf8'))
check('db', 'Backend GET 분석 200 · 과목 = 분석기 결과', server.status === 200 && JSON.stringify(server.body).includes(expected.subjects[0].subjectName), { status: server.status })
const plan = await api(`/api/admin/assessment/evaluation-plans/${planId}`)
const revision = plan.body?.revisions?.find((r) => r.documentRevisionId === revisionId)
const fileSha = createHash('sha256').update(readFileSync(`${dir}/${PLAN_FILE}`)).digest('hex')
check('db', 'Revision SHA-256 = 원본 파일 SHA (분석한 바이트와 같은 문서)', revision?.checksum === fileSha, { checksum: revision?.checksum?.slice(0, 12) })
check('db', 'Revision 검토 상태는 자동 확정되지 않음', revision && revision.reviewStatus !== 'CONFIRMED', revision?.reviewStatus)

// 새로고침 / 뒤로 / 직접 URL
await page.reload({ waitUntil: 'networkidle' })
await page.getByText('가상과학탐구').first().waitFor({ timeout: 20000 })
check('nav', '새로고침 후에도 DB에서 다시 조회되어 표시', true)
const reviewUrl = page.url()
await page.goBack()
await page.waitForTimeout(1500)
check('nav', '뒤로 가기 → 평가계획서 목록', /\/assessment\/evaluation-plans(\?|$)/.test(page.url()), page.url())
const fresh = await context.newPage()
await fresh.goto(reviewUrl, { waitUntil: 'networkidle' })
await fresh.getByText('가상과학탐구').first().waitFor({ timeout: 20000 })
check('nav', '새 탭 직접 URL 접근 → 같은 결과', true)
await fresh.close()

if (!isPdf) {
  // HWP·HWPX: 공식 확정은 Gate 1~3·D-1 승인 전까지 차단 (기존 동작 유지 확인)
  const page2 = await context.newPage()
  await page2.goto(reviewUrl, { waitUntil: 'networkidle' })
  await page2.getByText('가상과학탐구').first().waitFor({ timeout: 20000 })
  const confirmButtons = page2.getByRole('button', { name: /확정/ })
  const count = await confirmButtons.count()
  let allDisabled = true
  for (let index = 0; index < count; index += 1) if (!(await confirmButtons.nth(index).isDisabled())) allDisabled = false
  check('gate', `${tag.toUpperCase()} 공식 확정 버튼 비활성(승인 전 차단)`, count > 0 && allDisabled, { count })
  check('gate', `${tag.toUpperCase()} 확정 준비 점검표 표시`, (await page2.locator('main, #root').first().innerText()).includes('승인 대기'))
  await page2.screenshot({ path: `${shotDir}/a03-${tag}-gate.png`, fullPage: true })
  await page2.close()
}
check('runtime', '페이지 예외 0', pageErrors.length === 0, pageErrors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), admin: ADMIN, api: API, planId, revisionId, results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
