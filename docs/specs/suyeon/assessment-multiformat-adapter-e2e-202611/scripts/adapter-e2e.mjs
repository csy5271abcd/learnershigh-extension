// 계정 B HWP·HWPX 원본 + 계정 B multiformat_adapter 출력(experimental-import.json)을 수정 없이 실제 Backend·MySQL·Admin 화면에 연결하는 검증.
// 합성 자료만. 원본·JSON은 계정 B 폴더에서 읽기만 한다(복사·수정 없음). 부정 시험은 메모리 사본으로만 한다.
// 전제: Backend 18080(ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true, ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true, 빈 Schema),
//       Admin Vite 5174(http, adm_plan_operator, VITE_ASSESSMENT_DEV_MULTIFORMAT=true).
// usage: node adapter-e2e.mjs <chrome.exe> <B run 폴더> <schema> <out.json> <shot dir>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, runDir, schema, outPath, shotDir] = process.argv.slice(2)
const API = 'http://localhost:18080'
const ADMIN = 'http://localhost:5174'
const CASES = [
  { format: 'HWP', file: join(runDir, 'synthetic', 'synthetic-plan.hwp'), json: join(runDir, 'synthetic-results', 'SYNHWP.experimental-import.json'),
    sha: '581cc33d951d26b8ab81797fae46e8e8c54859a146b68ea870ef08e8629cde2b', mime: 'application/x-hwp', slot: '1-1' },
  { format: 'HWPX', file: join(runDir, 'synthetic', 'synthetic-plan.hwpx'), json: join(runDir, 'synthetic-results', 'SYNHWPX.experimental-import.json'),
    sha: '37fc6eb82d3a15c94bf2309cbc467cb4c6d768f9f8126d395b909d576c1b8b84', mime: 'application/hwp+zip', slot: '1-2' },
]
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 230) : ''}`)
}
const sql = (query) =>
  execFileSync('docker', ['exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r', '--default-character-set=utf8mb4', schema, '-e', query], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).map((line) => line.split('\t'))
const count = (table) => Number(sql(`SELECT COUNT(*) FROM ${table}`)[0][0])
const counts = () => ['assessment_evaluation_plan', 'assessment_plan_revision', 'assessment_plan_analysis_run', 'assessment_plan_review', 'assessment_plan_confirmed_value', 'assessment_school_assessment'].map(count).join(',')
async function api(method, path, headers, body) {
  const response = await fetch(API + path, { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const OP = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
// 직렬화 차이(키 순서·null 필드)만 무시하는 구조 비교
const canonical = (value) => (Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== null).map((key) => [key, canonical(value[key])])) : value)
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const calls = []
context.on('requestfinished', async (request) => {
  if (!/\/api\/admin\//.test(request.url())) return
  const response = await request.response()
  calls.push(`${request.method()} ${response?.status()} ${request.url().replace(/^https?:\/\/[^/]+/, '')}`)
})
const admin = await context.newPage()
const revisions = {}

for (const c of CASES) {
  const A = c.format
  const fileBytes = readFileSync(c.file)
  const jsonBytes = readFileSync(c.json)
  const jsonShaBefore = sha256(jsonBytes)
  const payload = JSON.parse(jsonBytes.toString('utf8'))
  check(A, '원본 파일 SHA-256 = 인계값, Payload source = {sha256, format}', sha256(fileBytes) === c.sha && payload.source.sha256 === c.sha && payload.source.format === A && !('pageCount' in payload.source),
    { size: fileBytes.length, source: payload.source })
  const magicOk = A === 'HWP' ? fileBytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) : fileBytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  check(A, `파일 서명(${A === 'HWP' ? 'OLE' : 'ZIP'})`, magicOk, null)

  // 1) 관리자 화면 업로드
  const [grade, semester] = c.slot.split('-')
  await admin.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=2026&slot=${c.slot}`)
  await admin.waitForTimeout(1500)
  await admin.getByRole('button', { name: '이 칸에 PDF 추가' }).click()
  const modal = admin.getByRole('dialog')
  await modal.getByLabel('평가계획서 PDF 파일').setInputFiles(c.file)
  const before = counts()
  await modal.getByRole('button', { name: /등록하고 분석/ }).click()
  await admin.waitForTimeout(2500)
  const rev = sql(`SELECT p.id, r.id, r.content_type, IFNULL(r.page_count,'NULL'), r.size_bytes, IFNULL(r.file_ref,'NULL') FROM assessment_evaluation_plan p JOIN assessment_plan_revision r ON r.plan_id=p.id WHERE r.sha256='${c.sha}' AND p.grade=${grade} AND p.semester=${semester}`)
  check(A, `화면 업로드 → 201 · DB content_type=${c.mime} · page_count NULL · 크기 · file_ref NULL`, calls.some((l) => l.startsWith('POST 201 /api/admin/assessment/evaluation-plans')) && rev.length === 1 && rev[0][2] === c.mime && rev[0][3] === 'NULL' && rev[0][4] === String(fileBytes.length) && rev[0][5] === 'NULL', rev[0]?.slice(2))
  const [planId, revisionId] = rev[0] ?? []
  revisions[A] = { planId, revisionId, payload, jsonBytes }
  const detail = await api('GET', `/api/admin/assessment/evaluation-plans/${planId}`, OP)
  const r0 = detail.body.revisions[0]
  check(A, `관리자 응답 documentFormat=${A} · pageCount null · checksum = 원본 SHA`, r0.documentFormat === A && r0.pageCount === null && r0.checksum === c.sha, { documentFormat: r0.documentFormat, pageCount: r0.pageCount })
  check(A, `문서 카드 "${A} · 실험" 배지`, (await admin.getByTestId('plan-format-badge').allInnerTexts()).some((t) => t.startsWith(`${A} ·`)), null)

  // 2) 계정 B Adapter JSON 원본 바이트 수신
  const base = `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}`
  const first = await api('POST', `${base}/analysis-imports`, OP, jsonBytes)
  check(A, '최초 수신 201 · REVIEW_REQUIRED · UNREVIEWED · 서버 경고 없음', first.status === 201 && first.body.analysisStatus === 'REVIEW_REQUIRED' && first.body.reviewStatus === 'UNREVIEWED' && (first.body.warnings ?? []).length === 0, first.status === 201 ? null : first.body)
  const analysisId = first.body?.analysisId
  const runRow = sql(`SELECT id, status, origin, analyzer_version, revision_id FROM assessment_plan_analysis_run WHERE revision_id='${revisionId}'`)
  check(A, 'analysisId = DB Run 1건(REVIEW_REQUIRED · EXTERNAL_IMPORT · multiformat-adapter 버전)', runRow.length === 1 && runRow[0][0] === analysisId && runRow[0][1] === 'REVIEW_REQUIRED' && runRow[0][2] === 'EXTERNAL_IMPORT' && runRow[0][3] === payload.analyzer.version, runRow[0])
  const second = await api('POST', `${base}/analysis-imports`, OP, jsonBytes)
  check(A, '같은 Payload 재전송 200 · 같은 analysisId · Run 1건 · Review 0건', second.status === 200 && second.body.analysisId === analysisId && count('assessment_plan_review') === 0 && sql(`SELECT COUNT(*) FROM assessment_plan_analysis_run WHERE revision_id='${revisionId}'`)[0][0] === '1', second.status)
  const stored = JSON.parse(sql(`SELECT result_json FROM assessment_plan_analysis_run WHERE id='${analysisId}'`)[0][0])
  check(A, 'DB 저장 JSON = Adapter subjects (구조 비교: 필드 추가·삭제·변조 없음)', same(stored, payload.subjects), null)
  const storedText = JSON.stringify(stored)
  check(A, `DB에 ${A}_TABLE_CELL Locator 보존 · 쪽 번호 값 없음`, storedText.includes(`"${A}_TABLE_CELL"`) && !/"pdfPageNumber":\d/.test(storedText) && !storedText.includes(A === 'HWP' ? 'HWPX_' : 'HWP_TABLE'), null)
  const analysis = await api('GET', `${base}/analysis`, OP)
  check(A, '관리자 분석 조회 subjects = Adapter subjects, reviewStatus UNREVIEWED, 확정값 없음', analysis.status === 200 && same(analysis.body.subjects, payload.subjects) && analysis.body.reviewStatus === 'UNREVIEWED' && analysis.body.confirmedFields.length === 0, analysis.status)
  check(A, '원본 JSON 파일 불변(SHA 전후 같음)', sha256(readFileSync(c.json)) === jsonShaBefore, jsonShaBefore.slice(0, 12))

  // 3) 관리자 검토 화면
  await admin.goto(`${ADMIN}${base.replace('/api/admin', '')}`)
  await admin.getByTestId('review-confirm-panel').waitFor()
  const text = await admin.locator('body').innerText()
  check(A, '후보 과목·평가 표시(가상과학탐구·W01·탐구 보고서·토론 활동)', ['가상과학탐구', 'W01', '탐구 보고서', '토론 활동'].every((w) => text.includes(w)), null)
  const details = await admin.locator('[data-testid=analysis-item-detail]').evaluateAll((rows) => rows.map((row) => ({ key: row.dataset.itemKey, cells: [...row.querySelectorAll('td')].map((td) => td.innerText) })))
  const p01 = details.find((d) => d.key === 'P01')
  const p02 = details.find((d) => d.key === 'P02')
  const expectP01 = payload.subjects[0].performanceEvaluation.items[0]
  check(A, '활동·제출물·조건 표시(P01 제출물·조건 2 / P02 제출물 없음 = "추출되지 않음 · 확인 필요")', p01 && p01.cells[2] === expectP01.submissions.join(', ') && expectP01.conditions.every((cond) => p01.cells[3].includes(cond)) && p02?.cells[2] === '추출되지 않음 · 확인 필요', details.map((d) => [d.key, d.cells[2]]))
  check(A, '채점기준 표시(요소·수준 점수)', expectP01.rubric.every((r) => text.includes(r.element)), expectP01.rubric.map((r) => r.element))
  const locatorText = (await admin.getByTestId('review-field-locators').allInnerTexts()).join('\n')
  check(A, '근거를 분석기가 기록한 문서 위치로 표시(구역·표·행·열·경로), 쪽 번호 아님', locatorText.includes('구역 0 · 표 ') && locatorText.includes('경로 p') && !text.includes('PDF 1쪽'), locatorText.split('\n')[0])
  check(A, `${A} 실험 표시 + 확정 불가 이유`, (await admin.getByTestId('review-format-experimental').isVisible()) && (await admin.getByTestId('review-blockers').innerText()).includes(`${A} 검토 확정은 아직 지원하지 않아요`), null)
  const other = CASES.find((x) => x.format !== A)
  await admin.getByTestId('review-local-pdf').setInputFiles(other.file)
  await admin.waitForTimeout(800)
  check(A, `다른 형식 원본(${other.format}) 선택 → 해시 불일치`, (await admin.getByTestId('review-hash-status').innerText()).startsWith('불일치'), null)
  await admin.getByTestId('review-local-pdf').setInputFiles(c.file)
  await admin.waitForTimeout(800)
  const hash = await admin.getByTestId('review-hash-status').innerText()
  check(A, '등록 원본 선택 → 해시 일치 · 원문 직접 보기 미지원 안내 · 미리보기 없음', hash.startsWith('일치') && hash.includes(`브라우저는 ${A}를 열지 못해요`) && (await admin.locator('iframe').count()) === 0, hash.slice(0, 60))
  await admin.locator('[data-testid=review-field-row][data-field-path="performanceEvaluation.weightPercent"]').getByRole('checkbox').check()
  await admin.getByTestId('review-subject-id-0').fill('subj_14')
  check(A, '해시 일치·필드·과목 ID가 있어도 확인 체크·확정 비활성, 화면 PUT 없음', (await admin.getByTestId('review-attest').isDisabled()) && (await admin.getByTestId('review-confirm').isDisabled()) && !calls.some((l) => l.startsWith('PUT')), null)
  await admin.screenshot({ path: `${shotDir}/${A.toLowerCase()}-review.png`, fullPage: true })

  // 4) 검토 확정 직접 호출 차단
  const forced = await api('PUT', `${base}/review`, OP, JSON.stringify({ analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: 'subj_14', confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null, pdfPageNumber: null }] }] }))
  check(A, '직접 PUT review → 400 revision.documentFormat: review_not_supported · Review 0 · UNREVIEWED', forced.status === 400 && JSON.stringify(forced.body.details) === JSON.stringify({ fields: [{ field: 'revision.documentFormat', reason: 'review_not_supported' }] }) && count('assessment_plan_review') === 0 && sql(`SELECT review_status FROM assessment_plan_revision WHERE id='${revisionId}'`)[0][0] === 'UNREVIEWED', forced.body?.details)

  // 5) 학생
  const plans = await api('GET', `/api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=${grade}&semester=${semester}`, { 'X-Assessment-Student-Id': 'stu_001' })
  const mine = plans.body?.items?.find((item) => item.planId === planId)
  check(A, '학생: 문서 UNREVIEWED, 후보·Locator 미노출', mine?.reviewStatus === 'UNREVIEWED' && !JSON.stringify(plans.body).includes('documentLocator') && !JSON.stringify(plans.body).includes('탐구 보고서'), mine ? { reviewStatus: mine.reviewStatus } : plans.status)
  if (semester === '1') {
    const ref = await api('POST', '/api/student/assessment/school-assessments', { 'X-Assessment-Student-Id': 'stu_001' },
      JSON.stringify({ title: '참조 시험', subjectId: 'subj_14', academicYear: 2026, semester: 1, evaluationItemRef: { documentRevisionId: revisionId, subjectId: 'subj_14', itemKey: 'P01' } }))
    check(A, '학생 공식 평가 항목 참조 → 400 not_confirmed · 저장 없음', ref.status === 400 && JSON.stringify(ref.body).includes('not_confirmed') && count('assessment_school_assessment') === 0, ref.status)
  }
  void before
}

// 6) 오류·보안 (메모리 사본만 변형. 원본 파일은 건드리지 않음)
for (const c of CASES) {
  const A = c.format
  const { planId, revisionId, payload, jsonBytes } = revisions[A]
  const base = `/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}`
  const copy = () => JSON.parse(jsonBytes.toString('utf8'))
  const firstSource = (p) => p.subjects[0].performanceEvaluation.items[0].sources[0]
  const otherKind = A === 'HWP' ? 'HWPX_TABLE_CELL' : 'HWP_TABLE_CELL'
  const negatives = [
    ['SHA-256 불일치', (p) => { p.source.sha256 = '0'.repeat(64) }, 'source.sha256', 'document_mismatch'],
    ['형식 불일치(format=PDF)', (p) => { p.source.format = 'PDF' }, 'source.format', 'format_mismatch'],
    ['pdfPageNumber 포함', (p) => { firstSource(p).pdfPageNumber = 1 }, 'subjects[0].performanceEvaluation.items[0].sources[0].pdfPageNumber', 'not_allowed'],
    ['pageCount 포함', (p) => { p.source.pageCount = 2 }, 'source.pageCount', 'not_allowed'],
    ['pageRange 포함', (p) => { p.subjects[0].pageRange = { from: 1, to: 2 } }, 'subjects[0].pageRange', 'not_allowed'],
    [`Locator 종류 교차(${otherKind})`, (p) => { firstSource(p).documentLocator.kind = otherKind }, 'subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.kind', 'format_mismatch'],
    ['표 칸 행 누락', (p) => { delete firstSource(p).documentLocator.row }, 'subjects[0].performanceEvaluation.items[0].sources[0].documentLocator', 'cell_position_required'],
    ['표 칸 좌표 ≠ path 마지막 r행c열', (p) => { firstSource(p).documentLocator.row += 7 }, 'subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.path', 'path_mismatch'],
    ['Locator 경로 형식 오류', (p) => { firstSource(p).documentLocator.path = '../p3' }, 'subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.path', 'format'],
    ['itemKey 중복', (p) => { p.subjects[0].performanceEvaluation.items[1].itemKey = 'P01' }, 'subjects[0].performanceEvaluation.items[1].itemKey', 'duplicate'],
    ['숫자 근거 누락', (p) => { p.subjects[0].performanceEvaluation.items[1].sources = [] }, 'subjects[0].performanceEvaluation.items[1].sources', 'evidence_required'],
    ['알 수 없는 필드(documentLocator.id)', (p) => { firstSource(p).documentLocator.id = 'SYN#s0.p3' }, 'subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.id', 'unknown_field'],
    ['내부 분석 필드(confidence)', (p) => { p.subjects[0].performanceEvaluation.items[0].confidence = 0.9 }, 'subjects[0].performanceEvaluation.items[0].confidence', 'unknown_field'],
    ['자동 확정 상태(status=CONFIRMED)', (p) => { p.status = 'CONFIRMED' }, 'status', 'format'],
  ]
  for (const [name, mutate, field, reason] of negatives) {
    const p = copy()
    mutate(p)
    const b4 = counts()
    const r = await api('POST', `${base}/analysis-imports`, OP, JSON.stringify(p))
    const fields = r.body?.details?.fields ?? []
    check(`${A}-E`, `${name} → 400 ${field}: ${reason} · 저장 없음`, r.status === 400 && fields.some((f) => f.field === field && f.reason === reason) && counts() === b4, fields.slice(0, 3))
  }
  const otherCase = CASES.find((x) => x.format !== A)
  const toOther = await api('POST', `/api/admin/assessment/evaluation-plans/${revisions[otherCase.format].planId}/revisions/${revisions[otherCase.format].revisionId}/analysis-imports`, OP, jsonBytes)
  const otherFields = toOther.body?.details?.fields ?? []
  check(`${A}-E`, `다른 형식 Revision(${otherCase.format})으로 전송 → 400 format_mismatch + document_mismatch`, toOther.status === 400 && otherFields.some((f) => f.reason === 'format_mismatch') && otherFields.some((f) => f.reason === 'document_mismatch'), otherFields)
  for (const [name, headers, expected] of [['인증 없음', {}, 401], ['학생 Header', { 'X-Assessment-Student-Id': 'stu_001' }, 401], ['운영 권한 없는 관리자', { 'X-Assessment-Admin-Id': 'adm_gangnam' }, 404]]) {
    const b4 = counts()
    const r = await api('POST', `${base}/analysis-imports`, headers, jsonBytes)
    check(`${A}-E`, `${name} → ${expected} · 저장 없음`, r.status === expected && counts() === b4, r.status)
  }
  check(`${A}-E`, '부정 시험 뒤에도 Run 1건(중복 없음)', sql(`SELECT COUNT(*) FROM assessment_plan_analysis_run WHERE revision_id='${revisionId}'`)[0][0] === '1', null)
  void payload
}

await browser.close()
const summary = { pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length, revisions: Object.fromEntries(Object.entries(revisions).map(([k, v]) => [k, { planId: v.planId, revisionId: v.revisionId }])) }
console.log(JSON.stringify(summary))
writeFileSync(outPath, JSON.stringify({ summary, results, calls }, null, 1))
