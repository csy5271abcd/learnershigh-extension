// 운정고 김민서(stu_demo_001) 최종 시연 실제 브라우저 검증 (5173·5174·18080·8765). 브라우저 1개, 순차.
// 쓰기: 과학탐구실험2 노트에 문장 1개 추가 → '지금 저장'(새 Revision) 1회만(재실행 시 건너뜀). 그 밖은 읽기.
// usage: node kimminseo-demo-e2e.mjs <chrome.exe> <outDir>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const [chrome, outDir] = process.argv.slice(2)
const E = JSON.parse(readFileSync(join(outDir, 'kimminseo-enrichment.json'), 'utf8'))
const SID = 'stu_demo_001', ADM = 'adm_demo_a01'
const ST = { 'X-Assessment-Student-Id': SID }, AD = { 'X-Assessment-Admin-Id': ADM }
const UNJEONG_PDF = 'C:/learnershigh-extension/references/curriculum-plan/general-high-school/gyeong-gi/unjeong/2026/first-grade/second-semester/2026학년도 2학기 1학년 교과(목)별 교수학습및 평가운영계획서_운정고.pdf'
const SAVE_LINE = '다음 실험에서는 단열재 두께를 같게 맞추고 뚜껑 유무도 비교해 볼 계획이다.'
const api = async (path, headers) => (await fetch('http://localhost:18080' + path, { headers })).json()
const results = []
const check = (name, ok, detail) => { results.push({ name, pass: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`) }
const browser = await chromium.launch({ executablePath: chrome })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', acceptDownloads: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
const body = () => page.locator('body').innerText()
const shot = (n) => page.screenshot({ path: join(outDir, `${n}.png`) })
const go = async (url, wait = 3500) => { await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(wait) }
const noteValues = () => page.evaluate(() => [...document.querySelectorAll('[aria-label="노트 본문"] textarea, input[placeholder="노트 제목"]')].map((e) => e.value).join(' '))
const KH = E.koreanHistory, SX = E.science

// ---- Student ----
await go(`http://localhost:5173/assessment?devStudent=${SID}`, 4500)
let t = await body()
check('학생: 전환 패널 김민서 · 운정고등학교', t.includes('시연 학생: 김민서 · 운정고등학교'))
check('학생: 1학년 2학기 표시', t.includes('1학년 2학기'))
await shot('kms-student-home')
await go(`http://localhost:5173/assessment/school-assessments?devStudent=${SID}`, 4000)
t = await body()
check('학생: 수행평가 목록에 한국사2·과학탐구실험2', t.includes('한국사2 역사 인물·사건 탐구 보고서') && t.includes('과학탐구실험2 설계 및 결과 보고서'))
check('학생: 마감일 미래(2026-12-21 한국사2)', KH.deadline >= '2026-11-12' && SX.deadline >= '2026-11-12', [KH.deadline, SX.deadline])
await shot('kms-student-assessments')

await go(`http://localhost:5173/assessment/school-assessments/${KH.assessmentId}?devStudent=${SID}`, 4500)
t = await body()
const kv = await noteValues()
check(`학생: 한국사2 노트 v${KH.note.revisionNumber} 보강 본문`, t.includes(`v${KH.note.revisionNumber}`) && kv.includes('조미 수호 통상 조약') && kv.includes('방곡령'))
check('학생: 한국사2 결과물 PDF v5·연표 PNG 표시', t.includes(KH.pdf.fileName) && t.includes(KH.png.fileName))
await shot('kms-student-kh-note')
for (const f of [KH.pdf, KH.png]) {
  await go(`http://localhost:5173/assessment/artifacts/${f.artifactId}/viewer?v=${f.versionId}`, 4500)
  const shown = await page.evaluate(() => document.querySelectorAll('canvas, iframe, embed, object').length + [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length)
  check(`학생: 뷰어 ${f.fileName} ${f.version} 미리보기`, shown > 0 && (await body()).includes(f.fileName), shown)
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.getByRole('button', { name: /내려받기/ }).or(page.getByRole('link', { name: /내려받기/ })).first().click().catch(() => {})])
  check(`학생: ${f.fileName} 내려받기`, Boolean(dl) && dl.suggestedFilename().length > 0, dl?.suggestedFilename())
  await shot(`kms-student-viewer-${f.fileName.endsWith('.png') ? 'kh-png' : 'kh-pdf'}`)
}

// 과학탐구실험2: 노트 보기 + '지금 저장' → 새 Revision → 새로고침 유지
await go(`http://localhost:5173/assessment/school-assessments/${SX.assessmentId}?devStudent=${SID}`, 4500)
const noteBefore = (await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${SX.assessmentId}`, ST)).items[0]
check('학생: 과학탐구실험2 노트·결과물 표시', (await noteValues()).includes('단열재') && (await body()).includes(SX.pdf.fileName) && (await body()).includes(SX.png.fileName))
if (!JSON.stringify(noteBefore.blocks).includes(SAVE_LINE)) {
  await page.locator('[aria-label="노트 본문"] textarea').nth(-2).click()
  await page.keyboard.press('End')
  await page.keyboard.type(` ${SAVE_LINE}`)
  await page.waitForTimeout(300)
  await page.getByTestId('note-save-now').click()
  await page.getByText(/자동 저장됨 · v\d+/).first().waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2500)
}
const noteAfter = (await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${SX.assessmentId}`, ST)).items[0]
check(`학생: '지금 저장' → Backend 새 Revision (v${noteBefore.revisionNumber} → v${noteAfter.revisionNumber})`, JSON.stringify(noteAfter.blocks).includes(SAVE_LINE) && noteAfter.revisionNumber >= 2)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
check('학생: 새로고침 후 유지', (await noteValues()).includes(SAVE_LINE))
await shot('kms-student-sx-note-saved')
await go(`http://localhost:5173/assessment/artifacts/${SX.png.artifactId}/viewer?v=${SX.png.versionId}`, 4000)
check('학생: 과학탐구실험2 그래프 PNG 미리보기', await page.evaluate(() => [...document.images].some((i) => i.complete && i.naturalWidth > 1000)))
await shot('kms-student-viewer-sx-png')

// ---- Admin a01 ----
await go(`http://localhost:5174/assessment/students?devAdmin=${ADM}`, 4000)
t = await body()
const adminList = await api('/api/admin/assessment/students?academicYear=2026&semester=2', AD)
check('관리자: A지점 학생 20명·김민서 표시', adminList.items.length === 20 && t.includes('김민서'), adminList.items.length)
await page.getByRole('searchbox', { name: '학생 검색' }).or(page.getByPlaceholder('학생명 검색')).first().fill('김민서')
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
t = await body()
check('관리자: "김민서" 검색 결과', t.includes('김민서') && !t.includes('이준호'))
await shot('kms-admin-search')
await go(`http://localhost:5174/assessment/students/${SID}?devAdmin=${ADM}`, 4000)
t = await body()
check('관리자: 학생 상세 운정고등학교·1학년·한국사2', t.includes('운정고등학교') && t.includes('1학년') && t.includes('한국사2'))
await shot('kms-admin-detail')
for (const [tab, needle] of [['피드백 이력', '답변'], ['성장 기록', '']]) {
  await page.getByRole('tab', { name: new RegExp(tab) }).first().click().catch(() => {})
  await page.waitForTimeout(2000)
  const tt = await body()
  check(`관리자: ${tab} 탭 표시`, !tt.includes('불러오지 못') && (!needle || tt.includes(needle)))
  await shot(`kms-admin-${tab === '성장 기록' ? 'growth' : 'feedback'}`)
}
for (const [label, A, needles] of [['한국사2', KH, ['조미 수호 통상 조약', '방곡령']], ['과학탐구실험2', SX, ['단열재', SAVE_LINE]]]) {
  await go(`http://localhost:5174/assessment/students/${SID}/school/${A.assessmentId}?devAdmin=${ADM}`, 3500)
  await page.getByRole('tab', { name: '관리자 기록 도구' }).or(page.getByRole('button', { name: '관리자 기록 도구' })).first().click().catch(() => {})
  await page.waitForTimeout(3000)
  t = await body()
  check(`관리자: ${label} 최신 노트 본문(읽기 전용)`, needles.every((n) => t.includes(n)))
  check(`관리자: ${label} 결과물 ${A.pdf.fileName}·${A.png.fileName}`, t.includes(A.pdf.fileName) && t.includes(A.png.fileName))
  await shot(`kms-admin-record-${label === '한국사2' ? 'kh' : 'sx'}`)
}
// 같은 ID 교차 확인 (Admin API)
const aNotes = await api(`/api/admin/assessment/students/${SID}/student-view/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${KH.assessmentId}`, AD)
const aArts = await api(`/api/admin/assessment/students/${SID}/student-view/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${KH.assessmentId}`, AD)
check('교차: 같은 Note ID·최신 Revision', aNotes.items?.some((n) => n.noteId === KH.note.noteId && n.revisionId === KH.note.revisionId), aNotes.items?.map((n) => [n.noteId, n.revisionNumber]))
check('교차: 같은 Artifact ID (PDF·PNG)', [KH.pdf.artifactId, KH.png.artifactId].every((id) => aArts.items?.some((a) => a.artifactId === id)), aArts.items?.map((a) => a.artifactId))

// ---- 운정고 평가계획서 자동 분석 (a01) ----
await go(`http://localhost:5174/assessment/evaluation-plans?devAdmin=${ADM}`, 4000)
await page.locator('ul[aria-label="학교 목록"] li', { hasText: '운정고등학교' }).getByRole('button').click()
await page.waitForTimeout(1500)
await page.getByLabel('분석 학년', { exact: true }).selectOption('1')
await page.getByLabel('분석 학기', { exact: true }).selectOption('2')
await page.getByTestId('plan-preview-file').setInputFiles(UNJEONG_PDF)
const started = Date.now()
await page.getByTestId('plan-preview-start').click()
await page.getByTestId('plan-preview-result').or(page.getByTestId('plan-preview-error')).first().waitFor({ timeout: 150000 })
const ms = Date.now() - started
const result = page.getByTestId('plan-preview-result')
check(`운정고 PDF 분석 결과 표시 (${Math.round(ms / 1000)}초)`, await result.isVisible())
const tabs = await result.getByRole('tab').allInnerTexts()
check('운정고: 과목 탭(한국사2·과학탐구실험2·인간과 철학 포함)', ['한국사2', '과학탐구실험2', '인간과 철학'].every((x) => tabs.includes(x)), tabs)
await result.getByRole('tab', { name: '인간과 철학', exact: true }).click()
await page.waitForTimeout(400)
let panel = await result.locator('#preview-subject-panel').innerText()
check('운정고 인간과 철학: 50%·8월 4주~10월 1주 / 50%·10월 3주~11월 4주 · PDF 236쪽', ['철학적 글쓰기를 통한 철학함의 본질 탐구하기', '철학적 독서를 통한 인문학적 실천 토론하기', '50%', '8월 4주~10월 1주', '10월 3주~11월 4주', 'PDF 236쪽'].every((n) => panel.includes(n)))
await result.getByRole('button', { name: /근거/ }).first().click().catch(() => {})
await page.waitForTimeout(300)
await result.locator('#preview-subject-panel').scrollIntoViewIfNeeded()
await shot('kms-unjeong-plan-philosophy')
await result.getByRole('tab', { name: '과학탐구실험2', exact: true }).click()
await page.waitForTimeout(400)
panel = await result.locator('#preview-subject-panel').innerText()
check('운정고 과학탐구실험2: 학교 주변 생물 탐구하기 30%·9월 1,2주 / 전류와 전압 측정 원리 탐구하기 30%·10월 4,5주', ['학교 주변 생물 탐구하기', '전류와 전압 측정 원리 탐구하기', '30%', '9월 1,2주', '10월 4,5주'].every((n) => panel.includes(n)))
await shot('kms-unjeong-plan-science')
check('운정고: 후보 안내·저장 안 함·공식 확정 제한', (await page.getByTestId('plan-analysis-preview').innerText()).includes('공식 확정'))

writeFileSync(join(outDir, 'kimminseo-e2e.json'), JSON.stringify({ at: new Date().toISOString(), unjeongAnalysisMs: ms, results, pageErrors: errors }, null, 2) + '\n')
console.log(`== kimminseo demo: ${results.filter((x) => x.pass).length}/${results.length} PASS · pageErrors ${errors.length}`)
await browser.close()
