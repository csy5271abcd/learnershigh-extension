// [DEMO-1112] 합성 데이터의 Student·Admin 화면 검증 (읽기 위주, 실제 Chrome, 1920×1080).
// usage: node seed-ui-verification-e2e.mjs <chrome.exe> <seed-manifest.json> <out.json> <shot dir> <studentBase> <adminBase>
// 쓰기: 없음. 화면 이동·새로고침·미리보기만 한다(학생 화면 보기의 쓰기 버튼 부재도 확인).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, manifestPath, outPath, shotDir, STUDENT, ADMIN] = process.argv.slice(2)
const { ids, files } = JSON.parse(readFileSync(manifestPath, 'utf8'))
mkdirSync(shotDir, { recursive: true })
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const T = {
  A: '[DEMO-1112] 과학 실험 보고서 작성',
  B: '[DEMO-1112] 문학 작품 분석 발표',
  C: '[DEMO-1112] 영어 주제 탐구 발표',
  D: '[DEMO-1112] 수학 실생활 활용 보고서',
  note: '[DEMO-1112] 온도 변화에 따른 물질의 용해도 탐구',
  report: '[DEMO-1112] 과학탐구 보고서',
  graph: '[DEMO-1112] 용해도 실험 그래프',
  growth: '[DEMO-1112] 용해도 실험을 통해 배운 탐구 설계',
  resA: '[DEMO-1112] 과학탐구 참고자료',
  resB: '[DEMO-1112] 발표 자료 구성 참고',
  adminA: '[DEMO-1112] 과학탐구 학습 자료',
  adminB: '[DEMO-1112] 보고서 작성 참고자료',
  finalReply: '물의 양, 용질의 종류, 실험 시간을 일정하게 유지하는 방법을 추가해 보세요.',
  draft: '탐구 목적과 가설이 명확하게 작성되었습니다.',
}

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const errors = []
const apiFailures = []
const writes = []
const watch = (page, label) => {
  page.on('pageerror', (error) => errors.push(`${label}: ${String(error).slice(0, 200)}`))
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/') && response.status() >= 400) apiFailures.push({ label, status: response.status(), path: url.pathname, at: page.url() })
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push({ label, method: request.method(), path: url.pathname })
  })
}
const student = await context.newPage()
watch(student, 'student')
const admin = await context.newPage()
watch(admin, 'admin')

const text = async (page) => page.locator('body').innerText()
const open = async (page, url, mustSee, wait = 1200) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (mustSee) await page.getByText(mustSee, { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(wait)
  return text(page)
}
/** 관리자 화면 안의 학생 화면 iframe(student-preview.html) */
const previewFrame = (page) => page.frames().find((item) => item !== page.mainFrame() && item.url().includes('student-preview'))
const frameText = async (page, mustSee) => {
  const frame = previewFrame(page)
  if (!frame) return ''
  if (mustSee) await frame.getByText(mustSee).first().waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  return frame.locator('body').innerText()
}
/** 활성 상태 쓰기 컨트롤 수 (읽기 전용 보기에서는 0이어야 한다) */
const enabledWriteControls = async (frame) =>
  frame.evaluate(() => {
    const writeButton = /^(새 버전|휴지통|결과물 등록|선생님께 피드백 요청|저장|평가 정보 수정|수정$|삭제|파일 올리기|자료 추가)/
    const isVersionPicker = (element) => [...(element.options ?? [])].every((option) => /^v\d/.test(option.text.trim()))
    return [...document.querySelectorAll('button, select, input, textarea, [contenteditable="true"]')]
      .filter((element) => element.offsetParent !== null && !element.disabled && !element.readOnly && element.getAttribute('aria-disabled') !== 'true')
      .filter((element) => {
        if (element.tagName === 'BUTTON') return writeButton.test((element.innerText || element.getAttribute('aria-label') || '').trim())
        if (element.tagName === 'SELECT') return !isVersionPicker(element)
        if (element.tagName === 'INPUT') return !['search', 'checkbox', 'radio', 'hidden'].includes(element.type)
        return true
      })
      .map((element) => `${element.tagName}[${element.type ?? ''}]:${(element.innerText || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.className || '').toString().trim().slice(0, 40)}`)
  })
const shot = (page, name, fullPage = false) => page.screenshot({ path: `${shotDir}/${name}.png`, fullPage })
/** 같은 화면을 새로고침해 값이 그대로인지 */
const reloadKeeps = async (page, expected) => {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText(expected[0], { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(900)
  const body = await text(page)
  return expected.every((value) => body.includes(value))
}

// ================= Student 5173 =================
let body = await open(student, `${STUDENT}/assessment`, T.A)
check('student', '홈: 진행 중 수행평가 표시', body.includes(T.A) || body.includes(T.C), body.slice(0, 160))
await shot(student, 's01-home')

body = await open(student, `${STUDENT}/assessment/school-assessments`, T.A)
const listOk = [T.A, T.B, T.C, T.D].every((title) => body.includes(title))
check('student', '수행평가 목록: 4건 제목', listOk)
check('student', '수행평가 목록: 상태 표기(진행 중·시작 전/예정·완료)', /진행 중/.test(body) && /(시작 전|예정)/.test(body) && /완료/.test(body))
await shot(student, 's02-school-assessments', true)
check('student', '목록 새로고침 유지', await reloadKeeps(student, [T.A, T.B, T.C, T.D]))

body = await open(student, `${STUDENT}/assessment/school-assessments/${ids.assessmentA}`, T.A, 1800)
check('student', '상세 A: 제목·노트 v2 본문·결과물 2개', body.includes(T.A) && body.includes('개선 방향') && body.includes(T.report) && body.includes(T.graph), body.slice(0, 160))
await shot(student, 's03-detail-A', true)
check('student', '상세 새로고침 유지', await reloadKeeps(student, [T.A, '개선 방향']))

body = await open(student, `${STUDENT}/assessment/school-assessments/${ids.assessmentA}?history=1`, T.A, 1800)
check('student', '노트 수정 이력: 2개 Revision', /(v2|2번째|버전 2|#2)/.test(body) && /(v1|1번째|버전 1|#1)/.test(body), body.match(/.{0,30}(v1|v2).{0,30}/g)?.slice(0, 4))
await shot(student, 's04-note-history')

body = await open(student, `${STUDENT}/assessment/school-assessments/${ids.assessmentA}?panel=feedback`, T.A, 1800)
check('student', '피드백: 최종 답변 표시, 초안 비노출', body.includes(T.finalReply) && !body.includes(T.draft))
await shot(student, 's05-feedback')
check('student', '피드백 새로고침 유지', await reloadKeeps(student, [T.finalReply]))

// 결과물 Viewer: PDF v2 → 실제 그려짐(blob 크기 = 업로드 크기), 비교 v1↔v2, PNG 확대
await open(student, `${STUDENT}/assessment/artifacts/${ids.artifactReport}/viewer?v=${ids.reportVersionV2}`, T.report, 2500)
const pdfState = await student.evaluate(async () => {
  const frame = document.querySelector('iframe, embed, object')
  const src = frame?.getAttribute('src') ?? frame?.getAttribute('data') ?? ''
  if (!src.startsWith('blob:')) return { src: src.slice(0, 40) }
  const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer())
  return { src: 'blob', size: bytes.length, head: String.fromCharCode(...bytes.slice(0, 5)) }
})
check('student', 'PDF 미리보기 v2: 실제 PDF blob(크기 = 업로드)', pdfState.size === files.pdfV2.sizeBytes && pdfState.head === '%PDF-', pdfState)
await shot(student, 's06-pdf-preview')
await open(student, `${STUDENT}/assessment/artifacts/${ids.artifactReport}/viewer?v=${ids.reportVersionV2}&compare=${ids.reportVersionV1}`, T.report, 2500)
body = await text(student)
const frames = await student.locator('iframe, embed, object').count()
check('student', '버전 비교 v1↔v2: 좌우 2개 + 파일 정보', frames >= 2 && body.includes('v1') && body.includes('v2'), { frames })
await shot(student, 's07-compare')
await open(student, `${STUDENT}/assessment/artifacts/${ids.artifactGraph}/viewer?v=${ids.graphVersionV1}`, T.graph, 2000)
const image = await student.evaluate(() => {
  const img = [...document.querySelectorAll('img')].find((element) => element.src.startsWith('blob:'))
  return img ? { w: img.naturalWidth, h: img.naturalHeight, complete: img.complete } : null
})
check('student', 'PNG 미리보기: 실제 그려짐(960×600)', image?.w === 960 && image?.h === 600, image)
await shot(student, 's08-image-preview')

body = await open(student, `${STUDENT}/assessment/growth`, T.growth)
check('student', '성장 기록 목록', body.includes(T.growth))
body = await open(student, `${STUDENT}/assessment/growth/${ids.growthRecordId}`, T.growth, 1500)
const relatedHref = await student.getByRole('link', { name: '관련 활동 보기' }).first().getAttribute('href').catch(() => null)
check('student', '성장 기록 상세: 동기·역할·후속 활동·연결 결과물 + 관련 수행평가 A 링크', body.includes('용해도 개념을 직접 확인') && body.includes('실험 방법 설계') && body.includes('다른 용질') && body.includes(T.report) && (relatedHref ?? '').includes(ids.assessmentA), relatedHref)
await shot(student, 's09-growth', true)
check('student', '성장 기록 새로고침 유지', await reloadKeeps(student, [T.growth, '다른 용질']))

body = await open(student, `${STUDENT}/assessment/resources`, T.resA, 1500)
check('student', '자료함: 개인 자료 2건 + 선생님 공개 자료 A, 비공개 B 없음', body.includes(T.resA) && body.includes(T.resB) && body.includes(T.adminA) && !body.includes(T.adminB))
await shot(student, 's10-resources', true)

body = await open(student, `${STUDENT}/assessment/archive?tab=favorites`, T.A, 1500)
check('student', '보관함 중요: 수행평가 A·C', body.includes(T.A) && body.includes(T.C) && !body.includes(T.B))
await shot(student, 's11-favorites')
body = await open(student, `${STUDENT}/assessment/archive?tab=trash`, undefined, 1500)
check('student', '휴지통: 복원된 자료 B 없음', !body.includes(T.resB))
await shot(student, 's12-trash')

body = await open(student, `${STUDENT}/assessment/resources`, T.resA, 1200)
check('student', '추천 자료원·자료함 화면 열림', body.length > 100)
body = await open(student, `${STUDENT}/assessment/enrichment`, undefined, 1000)
check('student', '심화 탐구(정적) 열림', /탐구/.test(body) && !/ASSESSMENT_API_NOT_CONNECTED/.test(body))
body = await open(student, `${STUDENT}/assessment/enrichment/mock-exams`, undefined, 1000)
check('student', '모의고사 지문 열림', /모의고사/.test(body))
body = await open(student, `${STUDENT}/assessment/enrichment/universities`, undefined, 1000)
check('student', '대학별 자료 열림', /대학/.test(body))

// ================= Admin 5174 =================
body = await open(admin, `${ADMIN}/assessment/students`, '김서준', 1500)
check('admin', '학생 목록: 김서준(stu_001)', body.includes('김서준'))
body = await open(admin, `${ADMIN}/assessment/students/stu_001`, T.A, 1800)
check('admin', '학생 상세: 수행평가 4건 같은 제목', [T.A, T.B, T.C, T.D].every((title) => body.includes(title)))
await shot(admin, 'a01-student-detail', true)

body = await open(admin, `${ADMIN}/assessment/students/stu_001/school/${ids.assessmentA}`, T.A, 2500)
let inner = await frameText(admin, T.report)
check('admin', '기록 열람 A: 학생 화면(iframe)에 노트 v2·결과물 2개 + 읽기 전용 표시', inner.includes('개선 방향') && inner.includes(T.report) && inner.includes(T.graph) && /읽기 전용/.test(body), inner.length)
let controls = previewFrame(admin) ? await enabledWriteControls(previewFrame(admin)) : ['no-frame']
check('admin', '기록 열람: 활성 쓰기 컨트롤 0', controls.length === 0, controls)
await shot(admin, 'a02-record-A')
await admin.reload({ waitUntil: 'domcontentloaded' })
await admin.waitForTimeout(2500)
inner = await frameText(admin, T.report)
check('admin', '기록 열람 새로고침 유지', inner.includes(T.A) && inner.includes('개선 방향'))

body = await open(admin, `${ADMIN}/assessment/feedback`, T.A, 1500)
check('admin', '피드백 관리: 요청 A(전달 완료)', body.includes(T.A) || body.includes('김서준'))
await shot(admin, 'a03-feedback-list')
body = await open(admin, `${ADMIN}/assessment/feedback/${ids.feedbackRequestId}`, T.A, 2500)
check('admin', '피드백 상세: 전달한 최종 의견 + 요청 당시 노트 v2', body.includes(T.finalReply) && body.includes('개선 방향'))
await shot(admin, 'a04-feedback-detail', true)

// 학생 화면 보기 (관리자 읽기 전용 경로)
await admin.goto(`${ADMIN}/assessment/students/stu_001/view?path=${encodeURIComponent(`/assessment/school-assessments/${ids.assessmentA}`)}`, { waitUntil: 'domcontentloaded' })
await admin.waitForTimeout(4000)
const viewText = await frameText(admin, T.report)
const viewControls = previewFrame(admin) ? await enabledWriteControls(previewFrame(admin)) : ['no-frame']
check('admin', '학생 화면 보기: 같은 A 상세(노트 v2·결과물)', viewText.includes(T.A) && viewText.includes('개선 방향') && viewText.includes(T.report), viewText.length)
check('admin', '학생 화면 보기: 활성 쓰기 컨트롤 0', viewControls.length === 0, viewControls)
await shot(admin, 'a05-student-view')

body = await open(admin, `${ADMIN}/assessment/students/stu_001/growth`, undefined, 200).then(() => open(admin, `${ADMIN}/assessment/students/stu_001`, T.A, 1500))
const growthTab = admin.getByRole('tab', { name: /성장 기록/ }).or(admin.getByRole('button', { name: /성장 기록/ })).first()
if (await growthTab.count()) {
  await growthTab.click()
  await admin.waitForTimeout(1200)
}
body = await text(admin)
check('admin', '학생 상세: 성장 기록 같은 제목', body.includes(T.growth))
await shot(admin, 'a06-student-growth')

await open(admin, `${ADMIN}/assessment/references`, undefined, 800)
await admin.getByRole('button', { name: '내 스크랩' }).first().click()
await admin.waitForTimeout(1500)
body = await text(admin)
check('admin', '참고자료실 내 스크랩: 자료 A(공개)·B(비공개)', body.includes(T.adminA) && body.includes(T.adminB))
await shot(admin, 'a07-references-scraps', true)
check('admin', '참고자료실 새로고침 후 다시 탭 이동해도 유지', await (async () => {
  await admin.reload({ waitUntil: 'domcontentloaded' })
  await admin.waitForTimeout(800)
  await admin.getByRole('button', { name: '내 스크랩' }).first().click()
  await admin.waitForTimeout(1500)
  const after = await text(admin)
  return after.includes(T.adminA) && after.includes(T.adminB)
})())

body = await open(admin, `${ADMIN}/assessment/evaluation-plans`, undefined, 1500)
check('admin', '학교별 평가계획서 화면 열림(오류 아님)', /평가계획서/.test(body) && !/불러오지 못했/.test(body), body.slice(0, 100))
await shot(admin, 'a08-plans')

const studentWrites = writes
check('page', '검증 중 쓰기 요청 0', studentWrites.length === 0, studentWrites)
check('page', 'API 4xx/5xx 0', apiFailures.length === 0, apiFailures)
check('page', '페이지 예외 0', errors.length === 0, errors)
writeFileSync(outPath, JSON.stringify({ results, apiFailures, writes, errors }, null, 2))
await browser.close()
const failed = results.filter((item) => !item.pass)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
