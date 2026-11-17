// Student 평가계획서 분석 결과 "전체 페이지" × 계정 B 실제 분석기 브라우저 검증 (합성 문서만, 로컬 전용, 쓰기 없음).
// usage: node student-analysis-page-e2e.mjs <chrome.exe> <files dir> <out.json> <shot dir> [base=http://localhost:5173]
// files dir: synthetic-e2e.pdf, synthetic-plan.hwp, synthetic-plan.hwpx, expected-pdf-import.json, corrupt.pdf
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, dir, outPath, shotDir, BASE = 'http://localhost:5173'] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const analyze = []
const writes = []
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))
page.on('response', async (response) => {
  const url = new URL(response.url())
  if (url.pathname === '/dev-analysis/analyze-preview') {
    let body = null
    try { body = await response.json() } catch { /* not json */ }
    analyze.push({ status: response.status(), body })
  }
  if (url.pathname.startsWith('/api/') && response.request().method() !== 'GET') writes.push(url.pathname)
})

const dialog = () => page.getByRole('dialog')
async function openImport() {
  await page.goto(`${BASE}/assessment/school-assessments`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByRole('button', { name: '평가계획서 가져오기' }).click()
  await dialog().waitFor()
  await dialog().locator('[data-testid="analysis-preview-banner"]').getByText(/연결됨/).waitFor({ timeout: 15000 })
}
async function analyzeFile(name) {
  await dialog().locator('input[type="file"]').setInputFiles(`${dir}/${name}`)
  await page.waitForTimeout(300)
  await dialog().getByRole('button', { name: /분석 시작|다시 분석/ }).click()
}

// 1. PDF → 전체 페이지
await openImport()
check('modal', 'Modal 제목 "평가계획서 가져오기" · 결과 영역 없음', (await dialog().locator('h2').first().innerText()) === '평가계획서 가져오기' && (await dialog().locator('[data-testid="analysis-preview-result"]').count()) === 0)
await page.screenshot({ path: `${shotDir}/s01-modal.png` })
await analyzeFile('synthetic-e2e.pdf')
await page.waitForURL(/\/assessment\/school-assessments\/analysis-preview\//, { timeout: 170000 })
await page.locator('[data-testid="analysis-preview-page"] h1').waitFor()
const pdf = analyze.at(-1)
check('pdf', '성공 시 Modal 닫힘 + 전체 페이지 이동', (await page.getByRole('dialog').count()) === 0, page.url())
check('pdf', '실제 분석 200 · v21.1 DEFAULT · payload = 계정 B 저장 산출물', pdf?.status === 200 && pdf.body?.analyzerVersion === 'v21.1' && pdf.body?.analyzerChannel === 'DEFAULT'
  && JSON.stringify(pdf.body?.backendImport?.payload) === JSON.stringify(JSON.parse(readFileSync(`${dir}/expected-pdf-import.json`, 'utf8'))))
const info = await page.locator('[data-testid="preview-doc-info"]').innerText()
check('pdf', '문서 정보: 파일명·PDF·2쪽·v21.1·SHA 일치', info.includes('synthetic-e2e.pdf') && info.includes('PDF') && info.includes('2쪽') && info.includes('v21.1') && (await page.locator('[data-testid="preview-sha-state"]').getAttribute('data-state')) === '일치', info.slice(0, 300))
check('pdf', '문서 정보: SHA = 원본 파일 SHA', pdf?.body?.source?.sha256 === sha(`${dir}/synthetic-e2e.pdf`))
const summary = await page.locator('[data-testid="preview-summary"]').innerText()
check('pdf', '평가 요약: 과목1·지필1·수행2', /1\s*과목/.test(summary) && /1\s*지필평가/.test(summary) && /2\s*수행평가/.test(summary), summary.replace(/\n/g, ' '))
const body = await page.locator('main').innerText()
check('pdf', '후보 배지 "자동 분석 후보 · 관리자 확인 전"', body.includes('자동 분석 후보 · 관리자 확인 전'))
check('pdf', '과목 탭·지필 표·수행 상세(탐구 보고서·토론 활동)', body.includes('가상과학탐구') && (await page.locator('[data-testid="preview-written-table"]').count()) === 1 && body.includes('탐구 보고서') && body.includes('토론 활동'))
check('pdf', '채점 요소·배점 표(실험 설계 50점)', body.includes('실험 설계') && body.includes('50점'))
check('pdf', '운영계획: 미추출/분석기 미지원 구분', body.includes('성취기준') && body.includes('분석기 미지원') && body.includes('교수·학습 운영표'))
check('pdf', '원문 근거: PDF 쪽', /PDF \d+쪽/.test(body))
const expected = JSON.parse(readFileSync(`${dir}/expected-pdf-import.json`, 'utf8'))
const firstItem = expected.subjects[0].performanceEvaluation.items[0]
check('pdf', '화면 값 = 분석 값(수행 1번 반영·만점·시기)', body.includes(`반영 ${firstItem.weightPercent}% · 만점 ${firstItem.maxScore}점 · 시기 ${firstItem.timing}`), firstItem)
await page.getByRole('button', { name: /근거 \d+건/ }).first().click()
check('pdf', '근거 펼치기(인용 문자열)', (await page.locator('main').innerText()).includes(firstItem.sources[0].extractedText))
await page.screenshot({ path: `${shotDir}/s02-pdf-page.png`, fullPage: true })
await page.screenshot({ path: `${shotDir}/s02-pdf-page-viewport.png` })

// 뒤로 가기 / 새로고침 / 직접 URL
const resultUrl = page.url()
await page.goBack()
await page.waitForURL(/\/assessment\/school-assessments$/, { timeout: 10000 }).catch(() => {})
check('nav', '뒤로 가기 → 학교 수행평가 목록', new URL(page.url()).pathname === '/assessment/school-assessments', page.url())
await page.goForward()
await page.locator('[data-testid="analysis-preview-page"]').waitFor()
check('nav', '앞으로 가기 → 같은 탭 메모리 결과 다시 표시', (await page.locator('[data-testid="preview-file-name"]').count()) === 1)
await page.reload({ waitUntil: 'networkidle' })
await page.locator('[data-testid="analysis-preview-page"]').waitFor()
check('nav', '새로고침 → "다시 불러올 수 없어요"(저장 안 됨 안내, 가짜 결과 없음)', (await page.locator('[data-testid="analysis-preview-missing"]').count()) === 1 && (await page.locator('[data-testid="preview-summary"]').count()) === 0)
await page.screenshot({ path: `${shotDir}/s03-refresh.png` })
await page.goto(resultUrl.replace(/analysis-preview\/[^/?]+/, 'analysis-preview/unknown-id'), { waitUntil: 'networkidle' })
check('nav', '직접 URL(없는 ID) → 같은 안내', (await page.locator('[data-testid="analysis-preview-missing"]').count()) === 1)

// 2. HWP·HWPX → 전체 페이지
for (const [name, format] of [['synthetic-plan.hwp', 'HWP'], ['synthetic-plan.hwpx', 'HWPX']]) {
  await openImport()
  await analyzeFile(name)
  await page.waitForURL(/analysis-preview\//, { timeout: 170000 })
  await page.locator('[data-testid="preview-doc-info"]').waitFor()
  const r = analyze.at(-1)
  const text = await page.locator('main').innerText()
  const docInfo = await page.locator('[data-testid="preview-doc-info"]').innerText()
  check(format.toLowerCase(), `${format} 실제 분석 200 → 전체 페이지`, r?.status === 200 && r.body?.source?.detectedFormat === format && docInfo.includes(format))
  check(format.toLowerCase(), `${format} SHA 일치 · 쪽 번호 대신 구역 표시`, (await page.locator('[data-testid="preview-sha-state"]').getAttribute('data-state')) === '일치' && docInfo.includes('구역') && !/PDF \d+쪽/.test(text))
  check(format.toLowerCase(), `${format} 실험 Adapter 안내 · 표 위치 근거`, text.includes('실험용 다중 형식 Adapter') && /구역 \d+ · 표 \d+ · \d+행 \d+열/.test(text))
  check(format.toLowerCase(), `${format} 수행 상세 표시`, text.includes('탐구 보고서'))
  await page.screenshot({ path: `${shotDir}/s04-${format.toLowerCase()}-page.png`, fullPage: true })
}

// 3. 실패는 Modal 안에서 재시도 (결과 페이지로 가지 않음)
await openImport()
await analyzeFile('corrupt.pdf')
await dialog().locator('[data-testid="analysis-preview-failure"]').waitFor({ timeout: 60000 })
check('failure', '손상 PDF → Modal에 "원문 추출 실패", 페이지 이동 없음', (await dialog().locator('[data-testid="analysis-preview-failure"]').getAttribute('data-kind')) === 'EXTRACTION' && new URL(page.url()).pathname === '/assessment/school-assessments')
// 4. 학교 공통 평가계획서(공식) 화면 전환
await dialog().getByTestId('use-official-plans').click()
check('official', '공식 평가계획서 화면으로 전환(기존 Modal)', (await dialog().locator('h2').first().innerText()).includes('평가계획 PDF 가져오기'))
await page.keyboard.press('Escape')

check('safety', 'Backend 쓰기 요청 0건(저장·확정 없음)', writes.length === 0, writes)
check('safety', '브라우저 저장소에 분석 결과 없음', await page.evaluate(() => !JSON.stringify({ ...localStorage, ...sessionStorage }).includes('backendImport')))
check('runtime', '페이지 예외 0', pageErrors.length === 0, pageErrors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
