// 심화 탐구 정적 참고자료 × Student http 모드 브라우저 검증 (로컬 전용, 쓰기 없음).
// usage: node enrichment-static-e2e.mjs <chrome.exe> <studentBaseUrl> <up|down> <out.json> <screenshot dir>
//   up   = Backend(18080) 실행 중인 Student http 개발 서버 (예: http://localhost:5173)
//   down = Backend가 없는 주소를 Proxy 대상으로 띄운 Student http 개발 서버 (예: http://localhost:5183)
import { writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, BASE, mode, outPath, shotDir] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const apiCalls = []
page.on('response', (response) => {
  const url = new URL(response.url())
  if (url.pathname.startsWith('/api/')) apiCalls.push({ path: url.pathname, status: response.status() })
})
const consoleErrors = []
page.on('pageerror', (error) => consoleErrors.push(String(error)))

const text = async () => (await page.locator('main').first().innerText().catch(() => '')) ?? ''
const notConnected = async () => (await page.content()).includes('서버 연결 전')
const shot = (name) => page.screenshot({ path: `${shotDir}/${mode}-${name}.png`, fullPage: false })
const settle = () => page.waitForTimeout(600)

// ---- 탐구 라이브러리 ----
await page.goto(`${BASE}/assessment/enrichment`, { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('heading', { name: '심화 탐구' }).waitFor({ timeout: 30000 })
await settle()
const rows = page.locator('section[aria-label="탐구 라이브러리 목록"] li')
check('library', '목록 표시', (await rows.count()) > 0, await rows.count())
check('library', '연결 전 오류 없음', !(await notConnected()))
const tabs = await page.locator('nav[aria-label="심화 탐구 메뉴"] a').allInnerTexts()
check('library', '탭 3개(내 탐구 없음)', tabs.length === 3 && !tabs.some((t) => t.includes('내 탐구')), tabs)
check('library', '직접 만들기 없음', (await page.getByRole('button', { name: /직접 만들기/ }).count()) === 0)
check('library', '탐구 시작 버튼 없음', (await page.getByRole('button', { name: /탐구 시작/ }).count()) === 0)
await shot('library')
const secondTitle = (await rows.nth(1).locator('span').first().innerText()).split('\n')[0]
await rows.nth(1).getByRole('button').click()
await settle()
const previewTitle = await page.locator('article[aria-label$="미리보기"] h2').innerText()
check('library', '선택 카드와 미리보기 일치', previewTitle === secondTitle, { secondTitle, previewTitle })
check('library', '선택이 URL에 남음', page.url().includes('selected='), page.url())
const chips = page.locator('div[aria-label="교과"] button')
const chipCount = await chips.count()
await chips.nth(1).click()
await settle()
const chipName = await chips.nth(1).innerText()
const metas = await page.locator('section[aria-label="탐구 라이브러리 목록"] li span span:nth-child(2)').allInnerTexts()
check('library', '교과 필터 동작', chipCount > 1 && metas.length > 0 && metas.every((m) => m === chipName), { chipName, metas })
await page.goto(`${BASE}/assessment/enrichment?q=${encodeURIComponent('존재하지않는검색어xyz')}`, { waitUntil: 'networkidle' })
await settle()
check('library', '검색 결과 없음 = Empty(오류 아님)', (await text()).includes('조건에 맞는 탐구 주제가 없어요') && !(await notConnected()))

// ---- 모의고사 지문 ----
await page.goto(`${BASE}/assessment/enrichment/mock-exams`, { waitUntil: 'networkidle' })
await page.locator('p[role="status"]').first().waitFor({ timeout: 15000 })
const countLine = await page.locator('p[role="status"]').first().innerText()
check('mock', '60개 소재 로딩', countLine.startsWith('60개'), countLine)
check('mock', '연결 전 오류 없음', !(await notConnected()))
const subjectTabs = await page.locator('div[aria-label="과목"] button').allInnerTexts()
check('mock', '과목 탭 건수(영어 30·국어 30)', subjectTabs.join('|').replace(/\s+/g, '').includes('30'), subjectTabs)
check('mock', '내 지문 등록 없음', (await page.getByRole('button', { name: /내 지문 등록/ }).count()) === 0)
check('mock', '내가 등록한 지문 영역 없음', !(await text()).includes('내가 등록한 지문'))
check('mock', '심화 탐구 시작 버튼 없음', (await page.getByRole('button', { name: /탐구 시작/ }).count()) === 0)
await shot('mock-list')
const engTab = page.locator('div[aria-label="과목"] button').filter({ hasText: '영어' })
await engTab.click()
await settle()
const engLine = await page.locator('p[role="status"]').first().innerText()
check('mock', '영어 필터 30개', engLine.startsWith('30개'), engLine)
await page.locator('input[type="search"]').fill('확률')
await page.waitForTimeout(900)
const searchLine = (await page.locator('p[role="status"]').first().innerText().catch(() => '')) || (await text()).slice(0, 80)
check('mock', '검색 반영(URL q)', page.url().includes('q='), { url: page.url(), searchLine })
await page.goto(`${BASE}/assessment/enrichment/mock-exams/EN-01`, { waitUntil: 'networkidle' })
await page.locator('h2').first().waitFor({ timeout: 15000 })
await settle()
const detail = await text()
check('mock', '상세 열람', detail.includes('EN-01') && !(await notConnected()))
check('mock', '원문 영역 표시(로컬 원문 있음 또는 원문 미포함 안내)', detail.includes('원문 지문'))
check('mock', '상세에 탐구 시작 없음', (await page.getByRole('button', { name: /탐구 시작/ }).count()) === 0)
await shot('mock-detail')
await page.reload({ waitUntil: 'networkidle' })
await page.locator('h2').first().waitFor({ timeout: 15000 })
check('mock', '새로고침 후 상세 유지', (await text()).includes('EN-01'))
await page.goto(`${BASE}/assessment/enrichment/mock-exams/NOPE-99`, { waitUntil: 'networkidle' })
await settle()
check('mock', '없는 ID = 찾을 수 없음', (await text()).includes('찾을 수 없어요'))

// ---- 대학별 자료 ----
await page.goto(`${BASE}/assessment/enrichment/universities`, { waitUntil: 'networkidle' })
await page.locator('ul[aria-label="대학별 PDF 자료"] li').first().waitFor({ timeout: 15000 })
const uniRows = await page.locator('ul[aria-label="대학별 PDF 자료"] > li').count()
check('university', '자료 목록 표시', uniRows > 0, uniRows)
check('university', '연결 전 오류 없음', !(await notConnected()))
check('university', '탐구 시작 버튼 없음', (await page.getByRole('button', { name: /탐구 시작/ }).count()) === 0)
await shot('university-list')
await page.locator('input[type="search"]').fill('KAIST')
await page.waitForTimeout(900)
const kaistRows = await page.locator('ul[aria-label="대학별 PDF 자료"] > li').allInnerTexts()
check('university', '검색 동작', kaistRows.length > 0 && kaistRows.length < uniRows, kaistRows.length)
await page.goto(`${BASE}/assessment/enrichment/universities/snu-2026-oral?page=2`, { waitUntil: 'networkidle' })
await page.locator('#exam-doc-title').waitFor({ timeout: 20000 })
const canvas = await page.locator('section[aria-label="PDF 원문"] canvas').first().waitFor({ timeout: 30000 }).then(() => true, () => false)
check('university', 'PDF 원문 렌더링(canvas)', canvas)
check('university', '현재 쪽 URL 유지', (await text()).includes('PDF 2쪽'))
check('university', '노트에 추가·탐구 시작 없음', (await page.getByRole('button', { name: /노트에 추가|탐구 시작/ }).count()) === 0)
await page.waitForTimeout(1200)
await shot('university-pdf')
await page.goto(`${BASE}/assessment/enrichment/universities/not-a-doc`, { waitUntil: 'networkidle' })
await settle()
check('university', '없는 문서 = 찾을 수 없음', (await page.content()).includes('자료를 찾을 수 없어요'))

// ---- 참고자료 ----
await page.goto(`${BASE}/assessment/reference-links`, { waitUntil: 'networkidle' })
await settle()
check('reference', '참고자료 카탈로그 표시(연결 전 오류 없음)', !(await notConnected()) && (await page.locator('a[href^="http"]').count()) > 0)
await shot('reference-links')

// ---- 폐기 Route ----
await page.goto(`${BASE}/assessment/enrichment/my`, { waitUntil: 'networkidle' })
await settle()
check('removed', '/enrichment/my → 목록 Redirect', new URL(page.url()).pathname === '/assessment/enrichment', page.url())
await page.goto(`${BASE}/assessment/enrichment/tasks/task_001`, { waitUntil: 'networkidle' })
await settle()
check('removed', '/enrichment/tasks/:id → 목록 Redirect', new URL(page.url()).pathname === '/assessment/enrichment', page.url())

const enrichmentApiCalls = apiCalls.filter((c) => /enrichment|mock-exam|university|reference/.test(c.path))
check('static', '심화 탐구 화면이 /api 심화 요청을 하지 않음', enrichmentApiCalls.length === 0, enrichmentApiCalls)

// ---- 학교 수행평가 (실제 http API 유지) ----
apiCalls.length = 0
await page.goto(`${BASE}/assessment/school-assessments`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const listCalls = apiCalls.filter((c) => c.path.includes('/school-assessments'))
const body = await page.content()
if (mode === 'up') {
  check('http', '수행평가 목록 실제 API 200', listCalls.some((c) => c.status === 200), listCalls)
} else {
  // 학업 정보(academic-context)가 먼저 실패하면 목록 요청 전에 멈춘다. 이 화면의 실제 /api 요청 전부가 5xx인지 본다.
  check('http', '수행평가 화면 실제 API 실패(5xx)', apiCalls.length > 0 && apiCalls.every((c) => c.status >= 500), apiCalls)
  check('http', '실패를 오류로 표시(빈 목록·Mock 아님)', /불러오지 못했어요/.test(body) && !body.includes('시연용 샘플 데이터'))
}
await shot('school-assessments')

check('runtime', '페이지 예외 없음', consoleErrors.length === 0, consoleErrors)
writeFileSync(outPath, JSON.stringify({ base: BASE, mode, at: new Date().toISOString(), results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
