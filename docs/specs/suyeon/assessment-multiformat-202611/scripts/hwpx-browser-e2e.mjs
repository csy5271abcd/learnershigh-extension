// HWPX 다중 형식 실험 브라우저·HTTP·MySQL 검증 (합성 데이터, 로컬 전용 E2E Schema).
// 전제: Backend 18080(ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true, ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true, 빈 Schema),
//       Admin Vite 5174(http, adm_plan_operator, VITE_ASSESSMENT_DEV_MULTIFORMAT=true).
// usage: node hwpx-browser-e2e.mjs <chrome.exe> <out.json> <shot dir> <schema> <synthetic.hwpx> <draft-import.json> <other.pdf>
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir, schema, hwpxPath, draftPath, otherPdfPath] = process.argv.slice(2)
const API = 'http://localhost:18080'
const ADMIN = 'http://localhost:5174'
const HWPX_SHA = '19cd28b637611e1e72f40ad823c2842122ddf9bcff77833100ddd712ec81beaf'
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const sql = (query) =>
  execFileSync('docker', ['exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r', '--default-character-set=utf8mb4', schema, '-e', query], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).map((line) => line.split('\t'))
const count = (table) => Number(sql(`SELECT COUNT(*) FROM ${table}`)[0][0])
async function api(method, path, headers, raw) {
  const response = await fetch(API + path, { method, headers: { ...headers, ...(raw ? { 'Content-Type': 'application/json' } : {}) }, body: raw })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const OP = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const calls = []
context.on('requestfinished', async (request) => {
  if (!/\/api\/admin\//.test(request.url())) return
  const response = await request.response()
  calls.push(`${request.method()} ${response?.status()} ${request.url().replace(/^https?:\/\/[^/]+/, '')}`)
})
const admin = await context.newPage()

// 1) 화면에서 HWPX 업로드
await admin.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026&slot=1-1`)
await admin.waitForTimeout(1500)
await admin.getByRole('button', { name: '이 칸에 PDF 추가' }).click()
let modal = admin.getByRole('dialog')
const fileInput = modal.getByLabel('평가계획서 PDF 파일')
check('UI', '개발 Flag에서 파일 선택이 .hwp·.hwpx를 허용', (await fileInput.getAttribute('accept')).includes('.hwpx'), await fileInput.getAttribute('accept'))
// 잘못된 HWP(암호 문서 서명) → 415 encrypted, 저장 없음
const locked = Buffer.alloc(2048)
Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(locked, 0)
Buffer.from('HWP Document File', 'ascii').copy(locked, 1024)
locked.writeUInt32LE(0x05000300, 1056)
locked.writeUInt32LE(0x2, 1060)
await fileInput.setInputFiles({ name: 'locked.hwp', mimeType: 'application/octet-stream', buffer: locked })
await modal.getByRole('button', { name: /등록하고 분석/ }).click()
await admin.waitForTimeout(1200)
check('UI', '암호 HWP(서명 합성 바이트) → 415·저장 없음', calls.some((line) => line.startsWith('POST 415 /api/admin/assessment/evaluation-plans')) && count('assessment_plan_revision') === 0, calls.filter((l) => l.startsWith('POST')).slice(-1))
// PDF 바이트를 .hwpx 이름으로 → 실제 형식 PDF로 저장되는지는 서버 테스트로 확인. 여기서는 합성 HWPX 업로드
await fileInput.setInputFiles(hwpxPath)
await modal.getByRole('button', { name: /등록하고 분석/ }).click()
await admin.waitForTimeout(2500)
const row = sql("SELECT p.id, r.id, r.content_type, IFNULL(r.page_count,'NULL'), r.sha256, IFNULL(r.file_ref,'NULL') FROM assessment_evaluation_plan p JOIN assessment_plan_revision r ON r.plan_id=p.id")
check('HTTP', '합성 HWPX 등록 201 → DB content_type application/hwp+zip · page_count NULL · SHA-256 · file_ref NULL', row.length === 1 && row[0][2] === 'application/hwp+zip' && row[0][3] === 'NULL' && row[0][4] === HWPX_SHA && row[0][5] === 'NULL', row[0]?.slice(2))
const [planId, revisionId] = row[0] ?? []
check('UI', '문서 카드에 "HWPX · 실험" 표시', await admin.getByTestId('plan-format-badge').first().isVisible(), await admin.getByTestId('plan-format-badge').first().innerText().catch(() => null))
await admin.screenshot({ path: `${shotDir}/hwpx-plan-card.png`, fullPage: true })

// 2) 초안 수신 (계정 A 임시 변환기 결과, 계정 B Adapter 출력 아님)
const draft = readFileSync(draftPath, 'utf8')
const imported = await api('POST', `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/analysis-imports`, OP, draft)
check('HTTP', 'HWPX 초안 수신 201 · REVIEW_REQUIRED · UNREVIEWED', imported.status === 201 && imported.body.analysisStatus === 'REVIEW_REQUIRED' && imported.body.reviewStatus === 'UNREVIEWED', imported.status)
const again = await api('POST', `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/analysis-imports`, OP, draft)
check('HTTP', '같은 요청 재전송 200 · Run 1건 · Review 0건', again.status === 200 && count('assessment_plan_analysis_run') === 1 && count('assessment_plan_review') === 0, again.status)
const stored = sql('SELECT result_json FROM assessment_plan_analysis_run')[0][0]
// 키 순서·null 필드 직렬화 차이를 무시하고 비교한다
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== null).map((key) => [key, canonical(value[key])])) : value
check('DB', 'DB 후보에 HWPX documentLocator 저장·쪽 번호 값 없음', stored.includes('"documentLocator"') && stored.includes('HWPX_TABLE_CELL') && !/"pdfPageNumber"\s*:\s*\d/.test(stored), null)
check('DB', 'DB 후보 subjects = 보낸 초안 subjects (null 제외 비교)', JSON.stringify(canonical(JSON.parse(stored))) === JSON.stringify(canonical(JSON.parse(draft).subjects)), null)
const pdfOnHwpx = await api('POST', `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/analysis-imports`, OP,
  JSON.stringify({ ...JSON.parse(draft), source: { sha256: HWPX_SHA, pageCount: 2 } }))
check('HTTP', 'HWPX Revision에 PDF 형식 결과(format 생략·pageCount) → 400 format_mismatch·저장 없음', pdfOnHwpx.status === 400 && JSON.stringify(pdfOnHwpx.body).includes('format_mismatch') && count('assessment_plan_analysis_run') === 1, pdfOnHwpx.body?.details)

// 3) 관리자 검토 화면
await admin.goto(`${ADMIN}/assessment/evaluation-plans/${planId}/revisions/${revisionId}`)
await admin.getByTestId('review-confirm-panel').waitFor()
const reviewText = await admin.locator('body').innerText()
check('UI', '후보 과목·항목 표시(과학·탐구 보고서·발표 활동)', ['과학', '탐구 보고서', '발표 활동'].every((word) => reviewText.includes(word)), null)
check('UI', 'HWPX 실험 표시 + 확정 불가 이유', (await admin.getByTestId('review-format-experimental').isVisible()) && (await admin.getByTestId('review-blockers').innerText()).includes('HWPX 검토 확정은 아직 지원하지 않아요'), null)
check('UI', '근거는 쪽 번호가 아니라 HWPX 위치(구역·표·행·열)로 표시', (await admin.getByTestId('review-field-locators').first().innerText()).includes('구역 0') && !reviewText.includes('PDF 1쪽'), await admin.getByTestId('review-field-locators').first().innerText())
await admin.getByTestId('review-local-pdf').setInputFiles(otherPdfPath)
await admin.waitForTimeout(800)
check('UI', '다른 파일 → 불일치', (await admin.getByTestId('review-hash-status').innerText()).startsWith('불일치'), null)
await admin.getByTestId('review-local-pdf').setInputFiles(hwpxPath)
await admin.waitForTimeout(800)
const hashText = await admin.getByTestId('review-hash-status').innerText()
check('UI', '등록 HWPX 선택 → 해시 일치 표시, 브라우저 보기 없음', hashText.startsWith('일치') && hashText.includes('확정하지 않아요') && (await admin.locator('iframe').count()) === 0, hashText.slice(0, 80))
await admin.locator('[data-testid=review-field-row][data-field-path="performanceEvaluation.weightPercent"]').getByRole('checkbox').check()
await admin.getByTestId('review-subject-id-0').fill('subj_14')
check('UI', '해시 일치·필드·과목 ID가 있어도 확인 체크·확정 버튼 비활성', (await admin.getByTestId('review-attest').isDisabled()) && (await admin.getByTestId('review-confirm').isDisabled()), null)
check('UI', '화면에서 PUT review 없음', !calls.some((line) => line.startsWith('PUT')), null)
await admin.screenshot({ path: `${shotDir}/hwpx-review.png`, fullPage: true })
// 서버도 막는다 (화면 우회 요청)
const forced = await api('PUT', `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/review`, OP,
  JSON.stringify({ analysisId: imported.body.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: 'subj_14', confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null, pdfPageNumber: null }] }] }))
check('HTTP', '서버 직접 PUT review → 400 review_not_supported · Review 0 · UNREVIEWED', forced.status === 400 && JSON.stringify(forced.body).includes('review_not_supported') && count('assessment_plan_review') === 0 && sql(`SELECT review_status FROM assessment_plan_revision WHERE id='${revisionId}'`)[0][0] === 'UNREVIEWED', forced.body?.details)

// 4) 학생
const studentPlans = await api('GET', '/api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=1&semester=1', { 'X-Assessment-Student-Id': 'stu_001' })
check('HTTP', '학생: 문서 UNREVIEWED, 후보·위치 미노출', studentPlans.status === 200 && studentPlans.body.items[0]?.reviewStatus === 'UNREVIEWED' && !JSON.stringify(studentPlans.body).includes('documentLocator'), studentPlans.body.items[0])

await browser.close()
const summary = { pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length, planId, revisionId }
console.log(JSON.stringify(summary))
writeFileSync(outPath, JSON.stringify({ summary, results, calls }, null, 1))
