// 평가계획서 분석 미리보기 × 계정 B 로컬 분석기 실제 연결 브라우저 검증 (합성 문서만, 로컬 전용).
// usage: node analysis-preview-e2e.mjs <chrome.exe> <files dir> <out.json> <screenshot dir> [previewBase=http://localhost:5176] [deadAnalyzerBase=http://localhost:5177] [defaultBase=http://localhost:5173]
// files dir: synthetic-e2e.pdf, synthetic-plan.hwp, synthetic-plan.hwpx, expected-pdf-import.json(계정 B 저장 산출물 사본),
//            fake.pdf, renamed-hwpx.pdf, corrupt.pdf, too-large.pdf, plain-zip.hwpx
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, dir, outPath, shotDir, PREVIEW = 'http://localhost:5176', DEAD = 'http://localhost:5177', DEFAULT = 'http://localhost:5173'] = process.argv.slice(2)
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const analyzeResponses = []
const apiWrites = []
page.on('response', async (response) => {
  const url = new URL(response.url())
  if (url.pathname === '/dev-analysis/analyze-preview') {
    let body = null
    try { body = await response.json() } catch { /* not json */ }
    analyzeResponses.push({ status: response.status(), body })
  }
  const method = response.request().method()
  if (url.pathname.startsWith('/api/') && method !== 'GET') apiWrites.push({ method, path: url.pathname, status: response.status() })
})
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))

async function openModal(base) {
  await page.goto(`${base}/assessment/school-assessments`, { waitUntil: 'networkidle', timeout: 60000 })
  const button = page.getByRole('button', { name: /평가계획서 분석하기|PDF로 가져오기/ })
  await button.waitFor({ timeout: 30000 })
  const label = (await button.innerText()).trim()
  await button.click()
  await page.getByRole('dialog').waitFor({ timeout: 10000 })
  return label
}
const dialog = () => page.getByRole('dialog')
const pick = async (name) => {
  await dialog().locator('input[type="file"]').setInputFiles(`${dir}/${name}`)
  await page.waitForTimeout(400)
}
async function analyzeAndWait() {
  const before = analyzeResponses.length
  await dialog().getByRole('button', { name: /분석 시작|다시 분석/ }).click()
  await dialog().locator('[data-testid="analysis-preview-result"], [data-testid="analysis-preview-failure"]').first().waitFor({ timeout: 170000 })
  return analyzeResponses[before]
}

// ---- 0. 기본 시연 서버(Flag OFF): 기존 Modal 유지 ----
{
  const label = await openModal(DEFAULT)
  const title = await dialog().locator('h2').first().innerText()
  check('flag-off', '기본 시연(5173) 버튼·Modal은 기존 그대로', label === 'PDF로 가져오기' && title.includes('평가계획 PDF 가져오기'), { label, title })
  check('flag-off', '분석 미리보기 배너 없음', (await page.locator('[data-testid="analysis-preview-banner"]').count()) === 0)
  const devAnalysis = await page.evaluate(() => fetch('/dev-analysis/health').then((r) => r.status + ' ' + (r.headers.get('content-type') ?? '')))
  check('flag-off', '기본 서버에는 /dev-analysis Proxy 없음(JSON 응답 아님)', !devAnalysis.includes('application/json'), devAnalysis)
}

// ---- 1. Flag ON(5176) ----
{
  const label = await openModal(PREVIEW)
  const title = await dialog().locator('h2').first().innerText()
  check('ui', '버튼·제목 "평가계획서 분석하기"', label === '평가계획서 분석하기' && title === '평가계획서 분석하기', { label, title })
  await page.locator('[data-testid="analysis-preview-banner"]').getByText(/연결됨|연결 안 됨/).waitFor({ timeout: 10000 })
  const banner = await page.locator('[data-testid="analysis-preview-banner"]').innerText()
  check('ui', '분석기 연결 상태 표시(연결됨·v21.1 기본)', banner.includes('연결됨') && banner.includes('v21.1'), banner)
  check('ui', '파일 선택 전 분석 시작 비활성', await dialog().getByRole('button', { name: '분석 시작' }).isDisabled())
  const accept = await dialog().locator('input[type="file"]').getAttribute('accept')
  check('ui', '파일 입력이 pdf·hwp·hwpx 허용', accept.includes('.hwp') && accept.includes('.hwpx') && accept.includes('.pdf'), accept)
  await page.screenshot({ path: `${shotDir}/preview-01-empty.png` })

  // 클라이언트 검증 (전송 전 차단)
  const sentBefore = analyzeResponses.length
  await pick('fake.pdf')
  check('validate', '내용이 PDF 아님(.pdf 텍스트) → 전송 전 차단', (await dialog().getByRole('alert').innerText()).includes('파일 내용이 PDF·HWP·HWPX가 아니에요'))
  await pick('renamed-hwpx.pdf')
  check('validate', '확장자·내용 불일치(HWPX→.pdf) → 차단', (await dialog().getByRole('alert').innerText()).includes('파일 내용(HWPX)'))
  await pick('too-large.pdf')
  check('validate', '20MB 초과 → 차단', (await dialog().getByRole('alert').innerText()).includes('20MB'))
  check('validate', '차단된 파일은 분석기로 보내지 않음', analyzeResponses.length === sentBefore, analyzeResponses.length - sentBefore)

  // PDF 실제 분석
  await pick('synthetic-e2e.pdf')
  const fileCard = await page.locator('[data-testid="analysis-preview-file"]').innerText()
  check('pdf', '선택 파일명·형식·크기·내용 확인 표시', fileCard.includes('synthetic-e2e.pdf') && fileCard.includes('PDF') && fileCard.includes('내용 확인: PDF'), fileCard)
  await dialog().getByRole('button', { name: '분석 시작' }).click()
  const busy = await dialog().getByRole('status').filter({ hasText: '분석 중' }).waitFor({ timeout: 3000 }).then(() => true, () => false)
  check('pdf', '분석 중 상태 표시', busy)
  await dialog().locator('[data-testid="analysis-preview-result"], [data-testid="analysis-preview-failure"]').first().waitFor({ timeout: 170000 })
  const pdf = analyzeResponses.at(-1)
  const expected = JSON.parse(readFileSync(`${dir}/expected-pdf-import.json`, 'utf8'))
  check('pdf', '실제 HTTP 200 · status OK_REVIEW_REQUIRED', pdf?.status === 200 && pdf.body?.status === 'OK_REVIEW_REQUIRED', { http: pdf?.status, status: pdf?.body?.status })
  check('pdf', '분석기가 받은 바이트 SHA = 원본 파일 SHA', pdf?.body?.source?.sha256 === sha(`${dir}/synthetic-e2e.pdf`))
  check('pdf', '기본 분석기 v21.1 · DEFAULT 채널(v21.2 자동 전환 없음)', pdf?.body?.analyzerVersion === 'v21.1' && pdf?.body?.analyzerChannel === 'DEFAULT', { v: pdf?.body?.analyzerVersion, c: pdf?.body?.analyzerChannel })
  check('pdf', 'payload = 계정 B 저장 산출물(analysis-import.json)과 동일', JSON.stringify(pdf?.body?.backendImport?.payload) === JSON.stringify(expected))
  check('pdf', '검토 상태 DRAFT_UNREVIEWED · LLM 호출 없음', pdf?.body?.reviewState?.status === 'DRAFT_UNREVIEWED' && pdf?.body?.analysisMode?.llmCalls === false)
  check('pdf', '원문 전체(analysis) 미요청', pdf?.body?.analysis === undefined)
  const resultText = await page.locator('[data-testid="analysis-preview-result"]').innerText()
  check('pdf', '화면: "자동 분석 후보 · 관리자 확인 전" 표시', resultText.includes('자동 분석 후보 · 관리자 확인 전'))
  check('pdf', '화면: 과목·수행평가 후보·PDF 쪽 근거 표시', resultText.includes('가상과학탐구') && resultText.includes('탐구 보고서') && /근거 PDF \d+쪽/.test(resultText), resultText.slice(0, 300))
  check('pdf', '화면: 저장되지 않음 안내', resultText.includes('저장되지 않았어요'))
  await page.locator('[data-testid="analysis-preview-result"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shotDir}/preview-02-pdf-result.png` })

  // HWP·HWPX 실제 분석
  for (const [name, format] of [['synthetic-plan.hwp', 'HWP'], ['synthetic-plan.hwpx', 'HWPX']]) {
    await pick(name)
    const response = await analyzeAndWait()
    const body = response?.body
    const payload = body?.backendImport?.payload
    const hasPdfPage = JSON.stringify(payload ?? {}).includes('pdfPageNumber')
    check(format.toLowerCase(), `${format} 실제 HTTP 200 · 형식 ${format}`, response?.status === 200 && body?.source?.detectedFormat === format, { http: response?.status, fmt: body?.source?.detectedFormat, status: body?.status })
    check(format.toLowerCase(), `${format} SHA 일치`, body?.source?.sha256 === sha(`${dir}/${name}`))
    check(format.toLowerCase(), `${format} 실험 Adapter(EXPERIMENTAL_MULTIFORMAT)·가짜 쪽 번호 없음`, body?.backendImport?.variant === 'EXPERIMENTAL_MULTIFORMAT' && !hasPdfPage, body?.backendImport?.adapter)
    const text = await page.locator('[data-testid="analysis-preview-result"]').innerText()
    check(format.toLowerCase(), `${format} 화면: 실험 안내·표 위치 근거 표시`, text.includes('실험용 다중 형식') && /근거 구역 \d+ · 표 \d+/.test(text), text.slice(0, 200))
    await page.locator('[data-testid="analysis-preview-result"]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${shotDir}/preview-03-${format.toLowerCase()}-result.png` })
  }

  // 서버 판정 실패
  await pick('corrupt.pdf')
  let response = await analyzeAndWait()
  let failure = page.locator('[data-testid="analysis-preview-failure"]')
  check('failure', '손상 PDF → 422 "원문 추출 실패"', response?.status === 422 && (await failure.getAttribute('data-kind')) === 'EXTRACTION' && (await failure.innerText()).includes('원문 추출 실패'), { http: response?.status, code: response?.body?.errors?.[0]?.code })
  await page.screenshot({ path: `${shotDir}/preview-04-corrupt.png` })
  await pick('plain-zip.hwpx')
  response = await analyzeAndWait()
  failure = page.locator('[data-testid="analysis-preview-failure"]')
  const kind = await failure.getAttribute('data-kind')
  check('failure', 'HWPX 아닌 ZIP → 415 "지원하지 않는 문서" 또는 422 "원문 추출 실패"', (response?.status === 415 && kind === 'UNSUPPORTED') || (response?.status === 422 && kind === 'EXTRACTION'), { http: response?.status, code: response?.body?.errors?.[0]?.code, kind })
  await page.screenshot({ path: `${shotDir}/preview-05-zip.png` })
}

// ---- 2. 분석기 연결 실패 (5177: 분석기 주소가 빈 포트) ----
{
  await openModal(DEAD)
  await page.locator('[data-testid="analysis-preview-banner"]').getByText(/연결 안 됨/).waitFor({ timeout: 15000 })
  check('connection', '연결 안 됨 배너', true)
  await pick('synthetic-e2e.pdf')
  await dialog().getByRole('button', { name: '분석 시작' }).click()
  const failure = page.locator('[data-testid="analysis-preview-failure"]')
  await failure.waitFor({ timeout: 60000 })
  check('connection', '분석기 꺼짐 → "분석기 연결 실패"(가짜 결과 없음)', (await failure.getAttribute('data-kind')) === 'CONNECTION' && (await page.locator('[data-testid="analysis-preview-result"]').count()) === 0, await failure.innerText())
  await page.screenshot({ path: `${shotDir}/preview-06-connection.png` })
}

check('safety', '분석 중 Backend 쓰기 요청 없음(저장·확정 없음)', apiWrites.length === 0, apiWrites)
check('runtime', '페이지 예외 없음', pageErrors.length === 0, pageErrors)
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
