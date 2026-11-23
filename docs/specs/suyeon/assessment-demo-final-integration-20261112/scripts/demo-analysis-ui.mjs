// 평가계획서 분석 시연 화면 검사 (실제 브라우저). 재시작 전 임시 포트 예행 연습과 재시작 후 5173·5174 최종 확인에 같이 쓴다.
// usage: node demo-analysis-ui.mjs <chrome.exe> student <baseUrl> <outDir>   — 학생 "평가계획서 분석하기" 미리보기(저장 없음): 실제 PDF·HWP
//        node demo-analysis-ui.mjs <chrome.exe> admin   <baseUrl> <outDir>   — 관리자 등록 → 자동 분석 → 검토(시연 DB 기록 1건): 합성 PDF
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, mode, BASE, outDir] = process.argv.slice(2)
const REF = 'C:/learnershigh-extension/references/curriculum-plan/'
const DOCS = {
  pdf: REF + 'general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu/2026/first-grade/second-semester/2026학년도 충무고 2학기 1학년 전과목 교수학습 및 평가계획.pdf',
  hwp: REF + 'general-high-school/incheon/gajwa/2026/first-semester/(가좌고등학교-3690 (첨부)) 2026학년도 1학기 수학과 교수학습 및 평가 운영 계획.hwp',
  synthetic: 'C:/Users/choi suyeon/LearnersHigh-local/curriculum-analysis/runs/v21-pdf-quality-backend-bridge-20261109/e2e/synthetic-e2e.pdf',
}
mkdirSync(outDir, { recursive: true })
const results = []
const check = (name, ok, detail) => {
  results.push({ name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
const port = new URL(BASE).port
const body = () => page.locator('body').innerText()

if (mode === 'student') {
  for (const [tag, file, expect] of [
    ['pdf', DOCS.pdf, ['체육2', '윗몸일으키기', '맨몸 크로스핏', '30', '70']],
    ['hwp', DOCS.hwp, ['공통수학1', '실생활 속 사례 분석', '문제 해결 포트폴리오', '경제수학', '경제기사 스크랩']],
  ]) {
    await page.goto(`${BASE}/assessment/school-assessments?devStudent=stu_demo_041`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: /평가계획서 분석하기|평가계획서 가져오기|PDF로 가져오기/ }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 10000 })
    const banner = await page.locator('[data-testid="analysis-preview-banner"]').innerText().catch(() => '')
    check(`${tag}: 분석기 연결 표시`, /연결됨/.test(banner), banner.slice(0, 80))
    await dialog.locator('input[type="file"]').setInputFiles(file)
    await page.waitForTimeout(800)
    await dialog.getByRole('button', { name: /분석 시작/ }).click()
    await page.waitForURL(/analysis-preview\//, { timeout: 150000 }).catch(() => {})
    await page.waitForTimeout(2500)
    // 과목은 탭으로 나뉜다 → 시연에서 보여줄 과목 탭을 차례로 눌러 내용을 모은다
    let text = await body()
    for (const subject of tag === 'pdf' ? ['체육2'] : ['공통수학1', '경제수학']) {
      await page.getByRole('tab', { name: subject, exact: true }).or(page.getByRole('button', { name: subject, exact: true })).first().click().catch(() => {})
      await page.waitForTimeout(800)
      text += ' ' + (await body())
      await page.screenshot({ path: join(outDir, `analysis-${port}-student-${tag}-${subject}.png`), fullPage: true })
    }
    check(`${tag}: 결과 페이지 이동`, /analysis-preview\//.test(page.url()), page.url())
    check(`${tag}: 과목·수행평가·비율 표시`, expect.every((t) => text.includes(t)), expect.filter((t) => !text.includes(t)))
    check(`${tag}: '자동 분석 후보 · 관리자 확인 전' + LLM 호출 없음 안내`, text.includes('관리자 확인 전') && /AI·LLM 호출 없음|LLM/.test(text))
    check(`${tag}: 근거 위치 표시(${tag === 'pdf' ? '쪽' : '구역·표'})`, tag === 'pdf' ? /\d+\s*쪽|p\.\s?\d/.test(text) : /구역|표\s*\d/.test(text))
    await page.screenshot({ path: join(outDir, `analysis-${port}-student-${tag}.png`) })
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(outDir, `analysis-${port}-student-${tag}-2.png`) })
  }
} else {
  await page.goto(`${BASE}/assessment/evaluation-plans?devAdmin=adm_demo_gangnam`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: /평가계획서 등록/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ timeout: 10000 })
  check('admin: 등록 Modal · 로컬 분석기 안내', (await dialog.innerText()).includes('로컬 분석기'))
  const selects = dialog.locator('select')
  await selects.nth(1).selectOption('2')
  await selects.nth(2).selectOption('1')
  await dialog.locator('input[type="file"]').setInputFiles(DOCS.synthetic)
  await dialog.getByTestId('plan-upload-submit').click()
  await page.waitForURL(/\/assessment\/evaluation-plans\/[^/]+\/revisions\/[^/]+$/, { timeout: 180000 }).catch(() => {})
  await page.waitForTimeout(4000)
  const text = await body()
  check('admin: 등록 → 자동 분석 → 검토 화면 이동', /evaluation-plans\/[^/]+\/revisions\//.test(page.url()), page.url())
  check('admin: 과목·수행평가 표시', ['가상과학탐구', '탐구 보고서', '토론 활동'].every((t) => text.includes(t)))
  check('admin: 검토 전(자동 확정 없음)', text.includes('관리자가 확인한 값 (0)'))
  await page.screenshot({ path: join(outDir, `analysis-${port}-admin-review.png`) })
}
writeFileSync(join(outDir, `analysis-ui-${mode}-${port}.json`), JSON.stringify({ at: new Date().toISOString(), base: BASE, results, pageErrors: errors }, null, 2) + '\n')
const failed = results.filter((r) => !r.pass).length
console.log(`== ${mode}@${port}: ${results.length - failed}/${results.length} PASS · pageErrors ${errors.length}`)
await browser.close()
