// Admin 심화 탐구 정적 콘텐츠 E2E (읽기 전용, 쓰기 없음).
// usage: node admin-enrichment-static-e2e.mjs <chrome.exe> <out.json> <shot dir> <studentBase> <adminBase> <backend: on|off>
//  - off: Backend가 꺼진 상태. 정적 심화 탐구는 열리고, 수행평가·참고자료실(HTTP)은 연결 오류를 보여야 한다(Mock 대체 금지).
//  - on : Backend 실행 중. 정적 심화 탐구 + 관리자 참고자료실 실제 목록(DB)이 함께 동작해야 한다.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, STUDENT, ADMIN, backendMode] = process.argv.slice(2)
mkdirSync(shotDir, { recursive: true })
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 240) : ''}`)
}

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const errors = []
const consoleErrors = []
const apiRequests = []
const admin = await context.newPage()
admin.on('pageerror', (error) => errors.push('admin: ' + String(error)))
admin.on('console', (message) => message.type() === 'error' && consoleErrors.push('admin: ' + message.text().slice(0, 200)))
admin.on('request', (request) => {
  const url = new URL(request.url())
  if (url.pathname.startsWith('/api/')) apiRequests.push({ method: request.method(), path: url.pathname, view: admin.url() })
})
const student = await context.newPage()
student.on('pageerror', (error) => errors.push('student: ' + String(error)))

const shot = async (page, name) => page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: false })
const go = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)
}

// ---------- 1) 같은 원천: 두 개발 서버에서 콘텐츠 모듈을 직접 읽어 비교 ----------
const pick = `(m) => ({
  catalog: m.listCatalogContent({}).map((i) => [i.catalogTaskId, i.title, i.subjectLabel, i.goal]),
  mock: m.listMockExamContent({}).map((i) => [i.materialId, i.subjectId, i.idea.topicTitle, i.research?.examTitle ?? null, Boolean(i.research?.passage)]),
  universities: m.listUniversityExamContent().map((d) => [d.documentId, d.title, d.university, d.sha256, d.pageCount]),
  sources: m.getReferenceCatalogContent().sources.map((s) => [s.sourceId, s.name, s.url, s.category]),
})`
await go(student, `${STUDENT}/assessment/enrichment`)
const studentData = await student.evaluate(async (fn) => {
  const m = await import('/src/features/assessment/content/enrichmentContent.ts')
  return new Function('return ' + fn)()(m)
}, pick)
await go(admin, `${ADMIN}/assessment/content/tasks`)
const adminData = await admin.evaluate(async (fn) => {
  const m = await import('/src/features/assessment/api/canonicalSource.ts')
  return new Function('return ' + fn)()(m)
}, pick)
const counts = (data) => ({ catalog: data.catalog.length, mock: data.mock.length, eng: data.mock.filter((i) => i[1] === 'mock_eng').length, kor: data.mock.filter((i) => i[1] === 'mock_kor').length, universities: data.universities.length, sources: data.sources.length })
check('same-source', 'Student 콘텐츠 수', true, counts(studentData))
check('same-source', 'Admin 콘텐츠 수 = Student', JSON.stringify(counts(adminData)) === JSON.stringify(counts(studentData)), counts(adminData))
for (const key of ['catalog', 'mock', 'universities', 'sources']) {
  check('same-source', `${key}: ID·제목·과목·링크 완전 일치`, JSON.stringify(adminData[key]) === JSON.stringify(studentData[key]), adminData[key].length)
}
check('counts', '모의고사 60 = 영어 30 + 국어 30', counts(adminData).mock === 60 && counts(adminData).eng === 30 && counts(adminData).kor === 30, counts(adminData))
check('counts', '대학별 자료 27', counts(adminData).universities === 27, counts(adminData).universities)

// ---------- 2) Admin 화면: 라이브러리 ----------
const enrichmentApi = () => apiRequests.filter((request) => /enrichment|catalog|mock-exam|universit|reference-catalog/i.test(request.path))
await go(admin, `${ADMIN}/assessment/content/tasks`)
await admin.getByTestId('static-library').waitFor({ timeout: 15000 })
const libraryRows = await admin.locator('[data-testid="static-library"] tbody tr').count()
check('library', '탐구 라이브러리 목록 = 정적 콘텐츠 수', libraryRows === adminData.catalog.length, libraryRows)
check('library', '정적 안내 표시·503 오류 없음', (await admin.getByTestId('static-content-notice').count()) === 1 && !(await admin.getByText('ASSESSMENT_API_NOT_CONNECTED').count()))
check('library', '이전 Task 생성·공개 버튼 없음', (await admin.getByRole('button', { name: /새 Task|공개하기|비공개로 전환|학생용 공개|새 탐구 소재 등록|자료 등록|AI 문항 분석/ }).count()) === 0)
await shot(admin, 'a01-admin-library')
const firstSubject = adminData.catalog[0][2]
await admin.getByRole('group', { name: '교과' }).getByRole('button', { name: new RegExp(`^${firstSubject} `) }).click()
await admin.waitForTimeout(300)
const filtered = await admin.locator('[data-testid="static-library"] tbody tr').count()
check('library', `교과 필터(${firstSubject}) = 콘텐츠 기준 건수`, filtered === adminData.catalog.filter((i) => i[2] === firstSubject).length && admin.url().includes('subject='), filtered)
const keyword = adminData.catalog[1][1].split(' ')[0]
await go(admin, `${ADMIN}/assessment/content/tasks`)
await admin.getByRole('searchbox').or(admin.locator('[data-testid="static-library"] input')).first().fill(keyword)
await admin.keyboard.press('Enter')
await admin.waitForTimeout(300)
const searched = await admin.locator('[data-testid="static-library"] tbody tr').count()
check('library', `검색(${keyword}) 결과 ≥1·URL 반영`, searched >= 1 && admin.url().includes('q='), searched)
await admin.locator('[data-testid="static-library"] tbody tr').first().locator('button').first().click()
await admin.getByTestId('static-library-detail').waitFor({ timeout: 10000 })
const detailId = await admin.getByTestId('static-library-detail').getAttribute('data-content-id')
check('library', '상세: 목표·방법·출처 + 수정 버튼 없음', Boolean(detailId) && (await admin.getByText('탐구 목표').count()) > 0 && (await admin.getByRole('button', { name: /^수정$|저장|공개/ }).count()) === 0, detailId)
await shot(admin, 'a02-admin-library-detail')
await go(admin, `${ADMIN}/assessment/content/tasks/new`)
check('retired', '이전 Task 만들기 주소 → 읽기 전용 안내', (await admin.getByTestId('retired-content-action').count()) === 1)
await go(admin, `${ADMIN}/assessment/content/tasks/no_such_content`)
check('retired', '없는 콘텐츠 ID → 찾을 수 없음(다른 콘텐츠 표시 안 함)', (await admin.getByTestId('static-not-found').count()) === 1)

// ---------- 3) 모의고사 ----------
await go(admin, `${ADMIN}/assessment/content/mock-exams`)
await admin.getByTestId('static-mock-exams').waitFor({ timeout: 15000 })
const mockCards = await admin.locator('[data-material-id]').count()
check('mock', '모의고사 카드 60', mockCards === 60, mockCards)
await shot(admin, 'a03-admin-mock-exams')
for (const [subjectId, label] of [['mock_eng', '영어'], ['mock_kor', '국어']]) {
  await go(admin, `${ADMIN}/assessment/content/mock-exams?subject=${subjectId}`)
  const n = await admin.locator('[data-material-id]').count()
  check('mock', `${label} 30`, n === 30, n)
}
const mockKeyword = adminData.mock[0][2].split(' ')[0]
await go(admin, `${ADMIN}/assessment/content/mock-exams?q=${encodeURIComponent(mockKeyword)}`)
check('mock', `검색(${mockKeyword}) ≥1`, (await admin.locator('[data-material-id]').count()) >= 1)
const withPassage = adminData.mock.find((i) => i[4])
const withoutPassage = adminData.mock.find((i) => !i[4])
if (withoutPassage) {
  await go(admin, `${ADMIN}/assessment/content/mock-exams/${withoutPassage[0]}`)
  check('mock', '원문 없는 지문 → "원문 미포함" 안내', (await admin.getByTestId('passage-empty').count()) === 1, withoutPassage[0])
} else check('mock', '원문 미포함 지문 없음(이 환경은 60개 모두 원문 로컬 파일 있음) → 안내 시험 대상 없음', true, 'all-have-passage')
if (withPassage) {
  await go(admin, `${ADMIN}/assessment/content/mock-exams/${withPassage[0]}`)
  check('mock', '원문 있는 지문 → 원문 표시', (await admin.getByTestId('passage-view').count()) === 1, withPassage[0])
}
await shot(admin, 'a04-admin-mock-detail')
await go(admin, `${ADMIN}/assessment/content/mock-exams/${adminData.mock[0][0]}/edit`)
check('retired', '이전 지문 편집 주소 → 읽기 전용 안내', (await admin.getByTestId('retired-content-action').count()) === 1)

// ---------- 4) 대학별 자료 ----------
await go(admin, `${ADMIN}/assessment/content/universities`)
await admin.getByTestId('static-universities').waitFor({ timeout: 15000 })
const docRows = await admin.locator('[data-document-id]').count()
check('university', '대학별 자료 27', docRows === 27, docRows)
await shot(admin, 'a05-admin-universities')
const firstUniversity = adminData.universities[0][2]
await admin.getByRole('group', { name: '대학' }).getByRole('button', { name: new RegExp(`^${firstUniversity} `) }).click()
await admin.waitForTimeout(300)
check('university', `대학 필터(${firstUniversity})`, (await admin.locator('[data-document-id]').count()) === adminData.universities.filter((d) => d[2] === firstUniversity).length)
const doc = adminData.universities[0]
await go(admin, `${ADMIN}/assessment/content/universities/${doc[0]}`)
await admin.getByTestId('static-university-detail').waitFor({ timeout: 10000 })
await admin.waitForTimeout(2500)
const pdfFrame = await admin.evaluate(() => {
  const canvas = document.querySelector('canvas')
  const iframe = document.querySelector('iframe, embed, object')
  return { canvas: canvas ? { w: canvas.width, h: canvas.height } : null, iframe: iframe ? iframe.getAttribute('src') ?? iframe.getAttribute('data') : null, text: document.body.innerText.includes('열지 못') }
})
const pdfResponse = await admin.request.get(`${ADMIN}/__dev/university-exams/files/${encodeURIComponent(doc[0])}.pdf`)
check('university', 'PDF 원문(개발 서버 경로) 200 + 화면 Viewer', pdfResponse.status() === 200 && (pdfFrame.canvas || pdfFrame.iframe), { status: pdfResponse.status(), ...pdfFrame })
await shot(admin, 'a06-admin-university-pdf')
await go(admin, `${ADMIN}/assessment/content/universities/ai-analysis`)
check('retired', '이전 AI 분석 주소 → 읽기 전용 안내', (await admin.getByTestId('retired-content-action').count()) === 1)

// ---------- 5) 참고자료원 ----------
await go(admin, `${ADMIN}/assessment/content/sources`)
await admin.getByTestId('static-sources').waitFor({ timeout: 10000 })
const sourceRows = await admin.locator('[data-source-id]').count()
check('sources', '참고자료원 = 정적 카탈로그 수', sourceRows === adminData.sources.length, sourceRows)
const links = await admin.locator('[data-source-id] a').evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')))
check('sources', '링크 = 카탈로그 URL', JSON.stringify(links) === JSON.stringify(adminData.sources.map((s) => s[2])))
await shot(admin, 'a07-admin-sources')

check('network', '심화 탐구 화면에서 Enrichment Backend 요청 0', enrichmentApi().length === 0, enrichmentApi())

// ---------- 6) Student 화면 (같은 콘텐츠) ----------
await go(student, `${STUDENT}/assessment/enrichment`)
check('student', 'Student 탐구 라이브러리 열림', (await student.getByRole('heading', { name: studentData.catalog[0][1] }).count()) > 0 || (await student.getByText(studentData.catalog[0][1]).count()) > 0)
await go(student, `${STUDENT}/assessment/enrichment/mock-exams/${adminData.mock[0][0]}`)
check('student', 'Student 모의고사 상세 = 같은 ID 콘텐츠', (await student.getByText(adminData.mock[0][2]).count()) > 0, adminData.mock[0][0])
await go(student, `${STUDENT}/assessment/enrichment/universities`)
check('student', 'Student 대학별 자료 열림', (await student.getByText(adminData.universities[0][1]).count()) > 0)
await shot(student, 's01-student-universities')

// ---------- 7) 실데이터 화면: Backend 상태 ----------
await go(admin, `${ADMIN}/assessment/references`)
await admin.waitForTimeout(800)
// 기본 탭 "추천 사이트"는 정적 카탈로그, DB 기능은 "내 스크랩" 탭(실제 Resource API)
await admin.getByRole('button', { name: '내 스크랩' }).or(admin.getByRole('tab', { name: '내 스크랩' })).first().click()
await admin.waitForTimeout(1500)
const refText = await admin.locator('body').innerText()
const refBody = refText.slice(refText.indexOf('추천 사이트'))
if (backendMode === 'off') {
  check('backend-off', '관리자 참고자료실 "내 스크랩"(DB 기능) 화면 유지 + 연결 오류 표시(Mock 대체 없음)', /불러오지 못했|오류/.test(refBody) && !refBody.includes('[DEMO-1112]'), refBody.slice(0, 200))
  await go(admin, `${ADMIN}/assessment/students`)
  await admin.waitForTimeout(1500)
  const studentsText = await admin.locator('body').innerText()
  check('backend-off', 'Admin 학생 목록: 연결 오류(Mock 학생 대체 없음)', /불러오지 못했|연결|오류/.test(studentsText), studentsText.slice(0, 120))
  await go(student, `${STUDENT}/assessment/school-assessments`)
  await student.waitForTimeout(1500)
  const saText = await student.locator('body').innerText()
  check('backend-off', 'Student 수행평가: 연결 오류(Mock 대체 없음)', /불러오지 못했|연결|오류|다시 시도/.test(saText), saText.slice(0, 120))
  await shot(student, 's02-student-backend-off')
} else {
  check('backend-on', '관리자 참고자료실 "내 스크랩" 실제 DB 목록([DEMO-1112] 자료 A·B) + 직접 저장 버튼 유지', refBody.includes('[DEMO-1112] 과학탐구 학습 자료') && refBody.includes('[DEMO-1112] 보고서 작성 참고자료') && (await admin.getByRole('button', { name: /링크 직접 저장/ }).count()) > 0, refBody.slice(0, 200))
}
await shot(admin, `a08-admin-references-${backendMode}`)

// ---------- 8) Shell·Student Care 회귀(표시만) ----------
await go(admin, `${ADMIN}/`)
await admin.waitForTimeout(800)
const shellText = await admin.locator('body').innerText()
check('shell', 'Admin Shell 렌더링(흰 화면 아님)·학생 케어 메뉴 유지', shellText.length > 50 && /학생 케어|Student Care/.test(shellText), shellText.slice(0, 80))

check('page', '페이지 예외 0', errors.length === 0, errors)
writeFileSync(outPath, JSON.stringify({ backendMode, results, consoleErrors, apiRequests, counts: counts(adminData) }, null, 2))
await browser.close()
const failed = results.filter((item) => !item.pass)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
