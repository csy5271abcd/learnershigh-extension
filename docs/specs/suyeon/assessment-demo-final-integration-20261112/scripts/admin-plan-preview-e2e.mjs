// 관리자 4명 × PDF·HWP 평가계획서 자동 분석 미리보기 실제 브라우저 E2E (실제 5174 · 로컬 분석기 8765). 쓰기 없음(분석 결과 저장 안 함).
// 사용: node admin-plan-preview-e2e.mjs <chrome.exe> <outDir>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const [chrome, outDir] = process.argv.slice(2)
const REF = 'C:/learnershigh-extension/references/curriculum-plan/general-high-school'
const PDF = `${REF}/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu/2026/first-grade/second-semester/2026학년도 충무고 2학기 1학년 전과목 교수학습 및 평가계획.pdf`
const HWP = `${REF}/incheon/gajwa/2026/first-semester/(가좌고등학교-3690 (첨부)) 2026학년도 1학기 수학과 교수학습 및 평가 운영 계획.hwp`
const roster = JSON.parse(readFileSync('../assessment-15schools-60students-seed-202611/SYNTHETIC-STUDENTS.json', 'utf8'))
const admins = [
  ['adm_demo_a01', 'br_demo_a', '운정고등학교'],
  ['adm_demo_a02', 'br_demo_a', '문현고등학교'],
  ['adm_demo_b01', 'br_demo_b', '가좌고등학교'],
  ['adm_demo_c01', 'br_demo_c', '충무고등학교'],
]
const results = []
const check = (name, ok, detail) => { results.push({ name, pass: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 180) : ''}`) }
const browser = await chromium.launch({ executablePath: chrome })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await ctx.newPage()
const errors = []
const calls = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
page.on('response', (r) => { if (r.url().includes('/dev-analysis/analyze-preview')) calls.push({ status: r.status(), at: Date.now() }) })
const body = () => page.locator('body').innerText()
const summary = []

async function analyze(adminId, kind, file, expect) {
  const before = calls.length
  await page.getByTestId('plan-preview-file').setInputFiles(file)
  await page.getByTestId('plan-preview-start').click()
  await page.getByTestId('plan-preview-result').or(page.getByTestId('plan-preview-error')).first().waitFor({ timeout: 90000 })
  const call = calls.slice(before)
  const result = page.getByTestId('plan-preview-result')
  const ok = await result.isVisible()
  check(`${adminId} ${kind}: 분석 API 호출·결과 표시`, ok && call.some((c) => c.status === 200), call.map((c) => c.status))
  if (!ok) { check(`${adminId} ${kind}: 오류`, false, await page.getByTestId('plan-preview-error').innerText().catch(() => '')); return { analysis: false, evidence: false } }
  const tabs = await result.getByRole('tab').allInnerTexts()
  check(`${adminId} ${kind}: 과목 탭 ${expect.tabs.join('·')}`, expect.tabs.every((t) => tabs.includes(t)), tabs.slice(0, 12))
  let valuesOk = true
  for (const [tab, needles] of expect.values) {
    await result.getByRole('tab', { name: tab, exact: true }).click()
    await page.waitForTimeout(300)
    const panel = await result.locator('#preview-subject-panel').innerText()
    const hit = needles.every((n) => panel.includes(n))
    valuesOk &&= hit
    check(`${adminId} ${kind}: ${tab} 수행평가·반영비율·시기 ${needles.join(', ')}`, hit)
  }
  const text = await result.innerText()
  const banner = text.includes('자동 분석 후보 · 관리자 확인 전') && text.includes('LLM 호출 없음')
  const evidence = text.includes(expect.evidence) && text.includes('원문 근거')
  const warnings = text.includes('분석 경고')
  check(`${adminId} ${kind}: 후보 안내·원문 근거(${expect.evidence})·분석 경고 표시`, banner && evidence && warnings)
  await page.screenshot({ path: join(outDir, `plan-preview-${adminId}-${kind.toLowerCase()}.png`), fullPage: false })
  return { analysis: valuesOk, evidence: evidence && banner && warnings }
}

for (const [adminId, branchId, target] of admins) {
  const expected = [...new Set(roster.students.filter((s) => s.branchId === branchId).map((s) => s.school.name))].sort()
  await page.goto(`http://localhost:5174/assessment/evaluation-plans?devAdmin=${adminId}`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('plan-analysis-preview').waitFor({ timeout: 20000 }).catch(() => {})
  const listed = (await page.locator('ul[aria-label="학교 목록"] li').allInnerTexts()).map((t) => t.split('\n')[0].trim()).sort()
  const t = await body()
  check(`${adminId}: 담당 학교 5개 = ${expected.join('·')}`, JSON.stringify(listed) === JSON.stringify(expected), listed)
  check(`${adminId}: FORBIDDEN·권한 없음·학교 없음 문구 없음`, !t.includes('FORBIDDEN') && !t.includes('볼 수 있는 권한이 없어요') && !t.includes('담당 학생의 학교가 없어요'))
  await page.locator('ul[aria-label="학교 목록"] li', { hasText: target }).getByRole('button').click()
  await page.waitForTimeout(1500)
  const panelText = await page.getByTestId('plan-analysis-preview').innerText().catch(() => '')
  check(`${adminId}: ${target} 선택 · 자동 분석 사용 가능 / 공식 확정 제한 / 분석기 연결`, panelText.includes(target) && panelText.includes('자동 분석 — 사용 가능') && panelText.includes('공식 확정') && /로컬 분석기 연결됨/.test(panelText))
  await page.getByLabel('분석 학년', { exact: true }).selectOption('1')
  await page.getByLabel('분석 학기', { exact: true }).selectOption('2')
  const pdf = await analyze(adminId, 'PDF', PDF, { tabs: ['체육2'], values: [['체육2', ['30%', '70%', '9~10월', '11월']]], evidence: 'PDF ' })
  const hwp = await analyze(adminId, 'HWP', HWP, { tabs: ['공통수학1', '경제수학'], values: [['공통수학1', ['20%', '6월']], ['경제수학', ['40%', '16%', '30%', '14%']]], evidence: '구역' })
  summary.push({ adminId, schools: listed.length, pdf: pdf.analysis, hwp: hwp.analysis, evidence: pdf.evidence && hwp.evidence })
}

// 기존 gangnam 관리자: 운영 학교(예시고) 공식 화면 유지, 미리보기 패널 아님
await page.goto('http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_gangnam', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const g = await body()
const gPreview = await page.getByTestId('plan-analysis-preview').isVisible().catch(() => false)
check('adm_demo_gangnam: 예시고 공식 평가계획서 화면(등록 버튼·학년 칸·등록 문서) 유지', g.includes('예시고등학교') && g.includes('평가계획서 등록') && /PDF \d+개/.test(g) && g.includes('1학기') && !g.includes('FORBIDDEN') && !gPreview)
await page.screenshot({ path: join(outDir, 'plan-gangnam-official.png') })

writeFileSync(join(outDir, 'e2e-admin-plan-preview.json'), JSON.stringify({ at: new Date().toISOString(), summary, results, analyzerCalls: calls, pageErrors: errors }, null, 2) + '\n')
console.log(JSON.stringify(summary))
console.log(`== admin plan preview: ${results.filter((x) => x.pass).length}/${results.length} PASS · analyzer calls ${calls.length} (${calls.filter((c) => c.status === 200).length}×200) · pageErrors ${errors.length}`)
await browser.close()
