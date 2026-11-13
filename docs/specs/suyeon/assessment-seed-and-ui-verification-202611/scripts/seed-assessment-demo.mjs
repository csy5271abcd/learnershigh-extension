// [DEMO-1112] 합성 Assessment 데이터 등록 (개발 환경 전용, 기존 Backend API만 사용, 직접 SQL 없음).
// usage: node seed-assessment-demo.mjs --api http://localhost:18080 --student stu_001 --admin adm_demo_gangnam
//          --year 2026 --semester 1 --manifest <seed-manifest.json> --files <합성 파일 폴더>
//
// 원칙
// - 대상은 localhost/127.0.0.1 Backend만 허용한다. 인증은 기존 개발 Header(X-Assessment-Student-Id / X-Assessment-Admin-Id)이며 비밀번호·토큰을 쓰지 않는다.
// - 모든 데이터 제목에 [DEMO-1112]를 붙인다. 기존 데이터를 수정·삭제하지 않는다(삭제·복원 시험은 이 스크립트가 만든 자료 B에만 한다).
// - 재실행 안전: Manifest의 ID를 GET으로 다시 확인하고, 없으면 제목으로 기존 항목을 찾아 재사용한 뒤에만 새로 만든다.
//   "전부 지우고 다시 만들기" 옵션은 없다.
// - 실패하면 그 단계에서 멈추고, 완료한 단계·생성 ID를 Manifest에 남긴다(다시 실행하면 이어서 진행).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []),
)
const API = (args.api ?? 'http://localhost:18080').replace(/\/+$/, '')
const STUDENT = args.student ?? 'stu_001'
const ADMIN = args.admin ?? 'adm_demo_gangnam'
const YEAR = Number(args.year ?? 2026)
const SEMESTER = Number(args.semester ?? 1)
const MANIFEST = args.manifest
const FILES = args.files
const PREFIX = '[DEMO-1112]'

if (!MANIFEST || !FILES) {
  console.error('필수 인자: --manifest <json 경로> --files <합성 파일 폴더>')
  process.exit(2)
}
const host = new URL(API).hostname
if (host !== 'localhost' && host !== '127.0.0.1') {
  console.error(`개발 환경 전용: localhost/127.0.0.1 Backend만 허용해요 (받은 값: ${host})`)
  process.exit(2)
}

// ---------------- Manifest ----------------
const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
  : { prefix: PREFIX, target: {}, ids: {}, steps: {}, checks: [], history: [] }
manifest.target = { api: API, studentId: STUDENT, adminId: ADMIN, academicYear: YEAR, semester: SEMESTER }
const ids = manifest.ids
const run = { startedAt: new Date().toISOString(), created: [], reused: [], checks: [] }
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

// ---------------- HTTP ----------------
const ST = { 'X-Assessment-Student-Id': STUDENT }
const AD = { 'X-Assessment-Admin-Id': ADMIN }
async function call(method, path, headers, body) {
  const init = { method, headers: { ...headers } }
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const response = await fetch(API + path, init)
  const type = response.headers.get('content-type') ?? ''
  const data = response.status === 204 ? null : type.includes('json') ? await response.json().catch(() => null) : Buffer.from(await response.arrayBuffer())
  return { status: response.status, data }
}
async function must(method, path, headers, body, expected = [200, 201, 204]) {
  const result = await call(method, path, headers, body)
  if (!expected.includes(result.status)) {
    const detail = result.data && !Buffer.isBuffer(result.data) ? JSON.stringify(result.data).slice(0, 400) : ''
    throw new Error(`${method} ${path} → ${result.status} ${detail}`)
  }
  return result.data
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const check = (name, ok, detail) => {
  run.checks.push({ name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const created = (key, id) => {
  run.created.push(key)
  ids[key] = id
  save()
  console.log(`  + 생성 ${key} = ${id}`)
}
const reused = (key, id) => {
  run.reused.push(key)
  ids[key] = id
  save()
  console.log(`  = 재사용 ${key} = ${id}`)
}
async function step(name, body) {
  console.log(`\n## ${name}`)
  try {
    await body()
    manifest.steps[name] = { status: 'done', at: new Date().toISOString() }
    save()
  } catch (error) {
    manifest.steps[name] = { status: 'failed', at: new Date().toISOString(), error: String(error.message ?? error).slice(0, 500) }
    run.finishedAt = new Date().toISOString()
    run.result = `failed at ${name}`
    manifest.history.push(run)
    save()
    console.error(`\n중단: ${name} 단계 실패 → ${error.message ?? error}`)
    console.error(`완료 단계: ${Object.entries(manifest.steps).filter(([, value]) => value.status === 'done').map(([key]) => key).join(', ') || '없음'}`)
    console.error('다시 실행하면 Manifest의 ID를 확인한 뒤 이어서 진행해요.')
    process.exit(1)
  }
}

// ---------------- 합성 파일 (결정적 바이트 → 재실행해도 같은 SHA) ----------------
function pdf(lines, barWidth) {
  const text = lines.map((line, i) => `BT /F1 ${i === 0 ? 22 : 13} Tf 72 ${720 - i * 26} Td (${line.replace(/[()\\]/g, '')}) Tj ET`).join('\n')
  const content = `${text}\n0.15 0.45 0.75 rg 72 360 ${barWidth} 40 re f\n0.85 0.35 0.2 rg 72 300 ${Math.round(barWidth * 0.6)} 40 re f\n`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'))
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

/** 합성 그래프 PNG(960×600): 축·격자·온도별 막대·추세선. 실제 측정값이 아니다. */
function graphPng() {
  const width = 960
  const height = 600
  const pixels = Buffer.alloc(width * height * 3, 255)
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const at = (y * width + x) * 3
    pixels[at] = r
    pixels[at + 1] = g
    pixels[at + 2] = b
  }
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, color)
  }
  const left = 90
  const bottom = 520
  const top = 60
  const right = 900
  for (let y = top; y <= bottom; y += 46) rect(left, y, right, y + 1, [225, 230, 236])
  rect(left, top, left + 3, bottom, [60, 64, 72])
  rect(left, bottom, right, bottom + 3, [60, 64, 72])
  const values = [36, 52, 70, 92, 118] // 합성 예시 (20·30·40·50·60℃)
  const points = []
  values.forEach((value, i) => {
    const x = left + 70 + i * 160
    const h = Math.round((value / 130) * (bottom - top))
    rect(x - 36, bottom - h, x + 36, bottom, [92, 140, 220])
    points.push([x, bottom - h])
  })
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    for (let t = 0; t <= 1; t += 0.002) {
      const x = Math.round(x0 + (x1 - x0) * t)
      const y = Math.round(y0 + (y1 - y0) * t)
      rect(x - 2, y - 2, x + 3, y + 3, [226, 92, 60])
    }
  }
  points.forEach(([x, y]) => rect(x - 7, y - 7, x + 8, y + 8, [180, 50, 30]))
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0
    pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3)
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync(FILES, { recursive: true })
const files = {
  pdfV1: { name: `${PREFIX} 과학탐구 보고서 v1.pdf`, type: 'application/pdf', bytes: pdf(['DEMO-1112 Science Inquiry Report v1', 'Synthetic sample - not a real measurement', 'Purpose: solubility vs water temperature', 'Hypothesis: higher temperature, more solute dissolves', 'Method: 4 steps (see note revision v1)'], 220) },
  pdfV2: { name: `${PREFIX} 과학탐구 보고서 v2.pdf`, type: 'application/pdf', bytes: pdf(['DEMO-1112 Science Inquiry Report v2', 'Synthetic sample - not a real measurement', 'Purpose: solubility vs water temperature', 'Result (synthetic): dissolved amount rises with temperature', 'Error source: temperature was not kept constant', 'Improvement: temperature control, more repeated trials'], 420) },
  png: { name: `${PREFIX} 용해도 실험 그래프.png`, type: 'image/png', bytes: graphPng() },
}
for (const [key, file] of Object.entries(files)) {
  writeFileSync(join(FILES, `${key}${key === 'png' ? '.png' : '.pdf'}`), file.bytes)
  file.sha256 = sha(file.bytes)
}
manifest.files = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { name: file.name, sha256: file.sha256, sizeBytes: file.bytes.length }]))
save()

// ---------------- 데이터 정의 ----------------
const heading = (blockId, text) => ({ blockId, type: 'HEADING', text, attrs: { level: 2 } })
const para = (blockId, text) => ({ blockId, type: 'PARAGRAPH', text })
const noteTitle = `${PREFIX} 온도 변화에 따른 물질의 용해도 탐구`
const noteV1 = [
  heading('demo-h1', '탐구 목적'),
  para('demo-p1', '물의 온도에 따른 물질의 용해도 변화를 확인한다.'),
  heading('demo-h2', '가설'),
  para('demo-p2', '물의 온도가 상승하면 일정한 물질의 용해량이 증가할 것으로 예상한다.'),
  heading('demo-h3', '탐구 과정'),
  para('demo-p3', '1. 서로 다른 온도의 물을 준비한다.'),
  para('demo-p4', '2. 동일한 용질을 조금씩 첨가한다.'),
  para('demo-p5', '3. 용해 가능한 양을 기록한다.'),
  para('demo-p6', '4. 온도별 결과를 비교한다.'),
]
const noteV2 = [
  ...noteV1,
  heading('demo-h4', '실험 결과'),
  para('demo-p7', '합성 실험 예시에서는 온도가 높아질수록 용해량이 증가하는 경향을 보였다. (가상의 탐구 과정이며 실제 측정 결과가 아님)'),
  heading('demo-h5', '오차 원인'),
  para('demo-p8', '실험 중 온도가 일정하게 유지되지 않았을 가능성이 있다.'),
  heading('demo-h6', '개선 방향'),
  para('demo-p9', '온도 조절 장치를 사용하고 반복 측정 횟수를 늘린다.'),
]
const draftText = '탐구 목적과 가설이 명확하게 작성되었습니다. 실험 과정에서 통제 변인을 좀 더 구체적으로 정리하면 좋겠습니다.'
const finalText = '물의 양, 용질의 종류, 실험 시간을 일정하게 유지하는 방법을 추가해 보세요. 결과를 표와 그래프로 정리하면 결론의 설득력이 높아질 것입니다.'

// ---------------- 실행 ----------------
let subjects = []
const assessmentPlan = [
  { key: 'assessmentA', title: `${PREFIX} 과학 실험 보고서 작성`, want: ['통합과학', '과학탐구실험', '과학'], status: 'IN_PROGRESS', deadlineDate: '2026-11-27', description: '온도에 따른 용해도 탐구 실험 보고서 (합성 시연 데이터)' },
  { key: 'assessmentB', title: `${PREFIX} 문학 작품 분석 발표`, want: ['국어', '공통국어', '문학'], status: 'BEFORE_START', deadlineDate: '2026-12-04', description: '문학 작품 한 편을 골라 분석하고 발표 (합성 시연 데이터)' },
  { key: 'assessmentC', title: `${PREFIX} 영어 주제 탐구 발표`, want: ['영어', '공통영어', '통합사회'] /* 학업 Context에 영어 없음 → 통합사회1로 대체 */, status: 'IN_PROGRESS', deadlineDate: '2026-11-20', description: '관심 주제를 영어로 조사해 발표 (합성 시연 데이터)' },
  { key: 'assessmentD', title: `${PREFIX} 수학 실생활 활용 보고서`, want: ['수학', '공통수학', '과학탐구실험'] /* 학업 Context에 수학 없음 → 과학탐구실험1로 대체 */, status: 'COMPLETED', deadlineDate: '2026-10-30', description: '생활 속 수학 개념 활용 사례 보고서 (합성 시연 데이터)' },
]

await step('0-health', async () => {
  const context = await must('GET', `/api/student/assessment/academic-context?academicYear=${YEAR}&semester=${SEMESTER}`, ST)
  subjects = context.subjects
  manifest.academicContext = { school: context.school, grade: context.grade, subjects: context.subjects, source: context.source }
  check('학업 Context 조회', subjects.length > 0, { school: context.school?.name, subjects: subjects.map((subject) => subject.name) })
  const students = await must('GET', `/api/admin/assessment/students?academicYear=${YEAR}&semester=${SEMESTER}`, AD)
  check('관리자 담당 학생 목록에 학생 포함', (students.items ?? []).some((item) => (item.student?.studentId ?? item.studentId) === STUDENT), (students.items ?? []).length)
})

const pickSubject = (want) => {
  for (const name of want) {
    const exact = subjects.find((subject) => subject.name.replace(/\d+$/, '') === name)
    if (exact) return exact
  }
  for (const name of want) {
    const partial = subjects.find((subject) => subject.name.includes(name))
    if (partial) return partial
  }
  return null
}

await step('1-school-assessments', async () => {
  const list = await must('GET', `/api/student/assessment/school-assessments?academicYear=${YEAR}&semester=${SEMESTER}&query=${encodeURIComponent(PREFIX)}&size=100`, ST)
  manifest.subjectChoices = {}
  for (const plan of assessmentPlan) {
    const subject = pickSubject(plan.want)
    if (!subject) throw new Error(`학업 Context에 ${plan.want.join('/')} 과목이 없어요. 과목을 임의로 만들지 않아요.`)
    manifest.subjectChoices[plan.key] = { requested: plan.want[0], used: subject }
    if (ids[plan.key]) {
      const existing = await call('GET', `/api/student/assessment/school-assessments/${ids[plan.key]}`, ST)
      if (existing.status === 200) {
        reused(plan.key, ids[plan.key])
        continue
      }
    }
    const byTitle = (list.items ?? []).find((item) => item.title === plan.title)
    if (byTitle) {
      reused(plan.key, byTitle.assessmentId)
      continue
    }
    const body = { title: plan.title, subjectId: subject.subjectId, academicYear: YEAR, semester: SEMESTER, deadlineDate: plan.deadlineDate, description: plan.description, status: plan.status }
    const result = await must('POST', '/api/student/assessment/school-assessments', ST, body)
    created(plan.key, result.assessmentId)
  }
  for (const plan of assessmentPlan) {
    const detail = await must('GET', `/api/student/assessment/school-assessments/${ids[plan.key]}`, ST)
    check(`수행평가 ${plan.key.slice(-1)} 재조회: 제목·상태`, detail.title === plan.title && detail.status === plan.status, { status: detail.status, subjectId: detail.subjectId })
  }
})

await step('2-note-revisions', async () => {
  const sa = ids.assessmentA
  const notes = (await must('GET', `/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, ST)).items ?? []
  let note = notes.find((item) => item.noteId === ids.noteId) ?? notes.find((item) => item.title === noteTitle)
  if (note) reused('noteId', note.noteId)
  else {
    const result = await must('POST', '/api/student/assessment/notes', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: noteTitle, blocks: noteV1 })
    created('noteId', result.noteId)
    note = { noteId: result.noteId, revisionId: result.revisionId, revisionNumber: result.revisionNumber }
  }
  let revisions = (await must('GET', `/api/student/assessment/notes/${ids.noteId}/revisions`, ST)).items ?? []
  const latestOf = (items) => items.reduce((best, item) => (!best || item.revisionNumber > best.revisionNumber ? item : best), null)
  if (!ids.noteRevisionV1) ids.noteRevisionV1 = revisions.find((item) => item.revisionNumber === 1)?.revisionId ?? null
  if (revisions.length < 2) {
    const latest = latestOf(revisions)
    const result = await must('PUT', `/api/student/assessment/notes/${ids.noteId}`, ST, { expectedRevisionId: latest.revisionId, title: noteTitle, blocks: noteV2 })
    created('noteRevisionV2', result.revisionId)
    revisions = (await must('GET', `/api/student/assessment/notes/${ids.noteId}/revisions`, ST)).items ?? []
  } else if (!ids.noteRevisionV2) reused('noteRevisionV2', revisions.find((item) => item.revisionNumber === 2)?.revisionId)
  save()
  const v1 = await must('GET', `/api/student/assessment/notes/${ids.noteId}/revisions/${ids.noteRevisionV1}`, ST)
  const v1Text = JSON.stringify(v1.blocks ?? v1.revision?.blocks ?? v1)
  check('Revision v1 불변(결과·오차 내용 없음)', v1Text.includes('용해 가능한 양을 기록한다') && !v1Text.includes('오차 원인'))
  const current = (await must('GET', `/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, ST)).items.find((item) => item.noteId === ids.noteId)
  check('최신 노트 = v2(오차 원인·개선 방향 포함)', current.revisionId === ids.noteRevisionV2 && JSON.stringify(current.blocks).includes('개선 방향'), { revisionNumber: current.revisionNumber, revisions: revisions.length })
})

await step('3-artifacts', async () => {
  const sa = ids.assessmentA
  const artifacts = (await must('GET', `/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, ST)).items ?? []
  const ensureArtifact = async (key, title) => {
    const found = artifacts.find((item) => item.artifactId === ids[key]) ?? artifacts.find((item) => item.title === title)
    if (found) reused(key, found.artifactId)
    else created(key, (await must('POST', '/api/student/assessment/artifacts', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title, kind: null })).artifactId)
  }
  const ensureVersions = async (artifactKey, wanted) => {
    let versions = (await must('GET', `/api/student/assessment/artifacts/${ids[artifactKey]}/versions`, ST)).items ?? []
    for (const [index, entry] of wanted.entries()) {
      const existing = versions.find((version) => version.file?.fileName === entry.file.name)
      if (existing) {
        reused(entry.key, existing.versionId)
        continue
      }
      if (versions.length > index) throw new Error(`${artifactKey}에 예상하지 않은 버전이 있어요(${versions.map((version) => version.file?.fileName).join(', ')}). 덮어쓰지 않고 멈춰요.`)
      const form = new FormData()
      form.append('file', new Blob([entry.file.bytes], { type: entry.file.type }), entry.file.name)
      form.append('changeNote', entry.changeNote)
      const latest = versions.at(-1)
      if (latest) form.append('expectedLatestVersionId', latest.versionId)
      const result = await must('POST', `/api/student/assessment/artifacts/${ids[artifactKey]}/versions`, ST, form)
      created(entry.key, result.versionId)
      versions = (await must('GET', `/api/student/assessment/artifacts/${ids[artifactKey]}/versions`, ST)).items ?? []
    }
  }
  await ensureArtifact('artifactReport', `${PREFIX} 과학탐구 보고서`)
  await ensureVersions('artifactReport', [
    { key: 'reportVersionV1', file: files.pdfV1, changeNote: `${PREFIX} 탐구 목적·가설·과정 초안` },
    { key: 'reportVersionV2', file: files.pdfV2, changeNote: `${PREFIX} 실험 결과·오차 원인·개선 방향 추가` },
  ])
  await ensureArtifact('artifactGraph', `${PREFIX} 용해도 실험 그래프`)
  await ensureVersions('artifactGraph', [{ key: 'graphVersionV1', file: files.png, changeNote: `${PREFIX} 합성 그래프 (실제 측정값 아님)` }])
  for (const [label, artifactKey, versionKey, file] of [
    ['PDF v1', 'artifactReport', 'reportVersionV1', files.pdfV1],
    ['PDF v2', 'artifactReport', 'reportVersionV2', files.pdfV2],
    ['PNG', 'artifactGraph', 'graphVersionV1', files.png],
  ]) {
    const download = await must('GET', `/api/student/assessment/artifacts/${ids[artifactKey]}/versions/${ids[versionKey]}/file`, ST)
    const preview = await must('GET', `/api/student/assessment/artifacts/${ids[artifactKey]}/versions/${ids[versionKey]}/preview`, ST)
    check(`${label} 저장 파일 SHA-256 = 업로드 원본 (다운로드·미리보기)`, sha(download) === file.sha256 && sha(preview) === file.sha256, file.sha256.slice(0, 16))
  }
  const compare = await must('GET', `/api/student/assessment/artifacts/${ids.artifactReport}/compare?fromVersionId=${ids.reportVersionV1}&toVersionId=${ids.reportVersionV2}`, ST)
  check('v1·v2 비교 응답', Boolean(compare), Object.keys(compare ?? {}))
})

await step('4-feedback', async () => {
  const sa = ids.assessmentA
  const requests = (await must('GET', `/api/student/assessment/feedback-requests?size=100`, ST)).items ?? []
  const existing = requests.find((item) => item.requestId === ids.feedbackRequestId) ?? requests.find((item) => item.snapshot?.noteRevisionId === ids.noteRevisionV2 && item.snapshot?.artifactVersionIds?.includes(ids.reportVersionV2))
  if (existing) reused('feedbackRequestId', existing.requestId)
  else {
    const result = await must('POST', '/api/student/assessment/feedback-requests', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, noteRevisionId: ids.noteRevisionV2, artifactVersionIds: [ids.reportVersionV2] })
    created('feedbackRequestId', result.requestId)
  }
  const rid = ids.feedbackRequestId
  const requested = await must('GET', `/api/student/assessment/feedback-requests/${rid}`, ST)
  check('Snapshot 고정 = NoteRevision v2 + PDF v2', requested.snapshot.locked && requested.snapshot.noteRevisionId === ids.noteRevisionV2 && requested.snapshot.artifactVersionIds.join() === ids.reportVersionV2, requested.snapshot)
  manifest.snapshotAtRequest = requested.snapshot
  if (requested.status !== 'DELIVERED') {
    await must('PUT', `/api/admin/assessment/feedback-requests/${rid}/reply-draft`, AD, { overallComment: draftText, comments: [], recommendations: [] })
    const studentView = await must('GET', `/api/student/assessment/feedback-requests/${rid}/reply`, ST)
    check('관리자 초안은 학생에게 보이지 않음(reply = null)', studentView.reply === null, studentView.status)
    await must('POST', `/api/admin/assessment/feedback-requests/${rid}/deliver`, AD, { overallComment: finalText, comments: [], recommendations: [] })
    run.created.push('feedbackDelivered')
  } else run.reused.push('feedbackDelivered')
  const reply = await must('GET', `/api/student/assessment/feedback-requests/${rid}/reply`, ST)
  check('학생: 최종 피드백 표시(DELIVERED)', reply.status === 'DELIVERED' && reply.reply?.overallComment === finalText, reply.status)
  const adminDetail = await must('GET', `/api/admin/assessment/feedback-requests/${rid}`, AD)
  check('관리자 요청 상세: DELIVERED·요청 당시 v2 Snapshot', adminDetail.status === 'DELIVERED' && adminDetail.snapshotRevision?.revisionId === ids.noteRevisionV2 && adminDetail.snapshotVersions?.[0]?.versionId === ids.reportVersionV2, { status: adminDetail.status, rev: adminDetail.snapshotRevision?.revisionNumber })
  const assessment = await must('GET', `/api/student/assessment/school-assessments/${sa}`, ST)
  check('피드백 전달 후에도 수행평가 상태 그대로(IN_PROGRESS)', assessment.status === 'IN_PROGRESS', assessment.status)
})

await step('5-growth-record', async () => {
  const title = `${PREFIX} 용해도 실험을 통해 배운 탐구 설계`
  const list = (await must('GET', `/api/student/assessment/growth-records?query=${encodeURIComponent(PREFIX)}&size=100`, ST)).items ?? []
  const found = list.find((item) => item.recordId === ids.growthRecordId) ?? list.find((item) => item.title === title)
  if (found) reused('growthRecordId', found.recordId)
  else {
    const subject = manifest.subjectChoices.assessmentA.used
    const result = await must('POST', '/api/student/assessment/growth-records', ST, {
      title,
      subjectId: subject.subjectId,
      activityStartDate: '2026-11-02',
      motivation: '과학 수업에서 배운 용해도 개념을 직접 확인하고 싶었다.',
      role: '실험 방법 설계와 결과 기록을 맡았다.',
      process: '온도에 따른 용해량의 변화를 비교하고 결과를 정리했다.',
      difficulty: '실험 중 물의 온도를 일정하게 유지하기 어려웠다.',
      solution: '온도 유지의 어려움을 확인하고 통제 변인 관리의 필요성을 이해했다.',
      reflection: '실험 결과뿐 아니라 실험 조건과 재현 가능성이 중요하다는 점을 배웠다.',
      followUp: '다른 용질의 온도별 용해도 변화를 비교할 계획이다.',
      relatedSourceType: 'SCHOOL_ASSESSMENT',
      relatedSourceId: ids.assessmentA,
      artifactIds: [ids.artifactReport],
    })
    created('growthRecordId', result.recordId)
  }
  const record = await must('GET', `/api/student/assessment/growth-records/${ids.growthRecordId}`, ST)
  check('성장 기록 재조회: 관련 수행평가 A 연결', record.relatedSourceId === ids.assessmentA && record.followUp?.includes('다른 용질'), record.relatedSourceId)
  const adminList = (await must('GET', `/api/admin/assessment/students/${STUDENT}/growth-records`, AD)).items ?? []
  check('관리자: 같은 성장 기록 ID', adminList.some((item) => item.recordId === ids.growthRecordId))
})

const studentResources = [
  { key: 'resourceA', title: `${PREFIX} 과학탐구 참고자료`, type: 'LINK', sourceName: 'ScienceON', sourceUrl: 'https://scienceon.kisti.re.kr/', memo: '용해도와 실험 설계의 기본 개념을 정리한 참고자료.', tags: ['DEMO-1112', '과학탐구'] },
  { key: 'resourceB', title: `${PREFIX} 발표 자료 구성 참고`, type: 'LINK', sourceName: 'RISS 학술연구정보서비스', sourceUrl: 'https://www.riss.kr/', memo: '발표 구성과 참고문헌 표기 방법을 확인하기 위한 자료.', tags: ['DEMO-1112', '발표'] },
]

await step('6-student-resources', async () => {
  const list = (await must('GET', `/api/student/assessment/resources?query=${encodeURIComponent(PREFIX)}&size=100`, ST)).items ?? []
  for (const resource of studentResources) {
    const found = list.find((item) => item.resourceId === ids[resource.key]) ?? list.find((item) => item.title === resource.title)
    if (found) {
      reused(resource.key, found.resourceId)
      continue
    }
    // 이전 실행에서 휴지통에 남았다면(삭제·복원 중단) 새로 만들지 않고 복원한다
    if (ids[resource.key]) {
      const trash = (await must('GET', '/api/student/assessment/archive?tab=trash&size=100', ST)).items ?? []
      if (trash.some((item) => item.sourceId === ids[resource.key])) {
        await must('POST', '/api/student/assessment/archive/restore', ST, { sourceType: 'RESOURCE', sourceId: ids[resource.key] })
        reused(resource.key, ids[resource.key])
        continue
      }
    }
    const { key, ...body } = resource
    created(key, (await must('POST', '/api/student/assessment/resources', ST, { ...body, subjectIds: [manifest.subjectChoices.assessmentA.used.subjectId] })).resourceId)
  }
})

await step('7-favorites', async () => {
  // 계약(§30 PUT archive/favorites)은 SCHOOL_ASSESSMENT만 받는다(StudentRecordAccess.ownedAssessment). 자료 중요 표시는 계약에 없어 수행평가 A·C에 한다.
  for (const key of ['assessmentA', 'assessmentC']) {
    await must('PUT', '/api/student/assessment/archive/favorites', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: ids[key], favorite: true })
  }
  ids.favorites = [`SCHOOL_ASSESSMENT:${ids.assessmentA}`, `SCHOOL_ASSESSMENT:${ids.assessmentC}`]
  save()
  const favorites = (await must('GET', '/api/student/assessment/archive?tab=favorites&size=100', ST)).items ?? []
  check('중요 표시 2건 = 보관함 중요 탭', [ids.assessmentA, ids.assessmentC].every((id) => favorites.some((item) => item.sourceId === id && item.favorite)), favorites.length)
})

const adminScraps = [
  { key: 'adminResourceA', title: `${PREFIX} 과학탐구 학습 자료`, published: true, type: 'LINK', sourceName: '사이언스올 ScienceAll', sourceUrl: 'https://www.scienceall.com/', referenceSourceId: 'ref_13', memo: '과학탐구 주제 탐색과 실험 아이디어를 찾을 때 참고하는 공식 과학 콘텐츠 포털.', tags: ['DEMO-1112', '과학탐구'] },
  { key: 'adminResourceB', title: `${PREFIX} 보고서 작성 참고자료`, published: false, type: 'LINK', sourceName: '국립중앙도서관', sourceUrl: 'https://www.nl.go.kr/', referenceSourceId: 'ref_02', memo: '보고서 참고문헌 확인용 (관리자 비공개).', tags: ['DEMO-1112', '보고서'] },
]

await step('8-admin-resources', async () => {
  const list = (await must('GET', `/api/admin/assessment/reference-library?query=${encodeURIComponent(PREFIX)}&size=100`, AD)).items ?? []
  for (const scrap of adminScraps) {
    const found = list.find((item) => item.scrapId === ids[scrap.key]) ?? list.find((item) => item.title === scrap.title)
    if (found) reused(scrap.key, found.scrapId)
    else {
      const { key, published, ...body } = scrap
      created(key, (await must('POST', '/api/admin/assessment/reference-library', AD, { ...body, subjectIds: [] })).scrapId)
    }
    const current = await must('GET', `/api/admin/assessment/reference-library/${ids[scrap.key]}`, AD)
    if (current.published !== scrap.published) await must('PUT', `/api/admin/assessment/reference-library/${ids[scrap.key]}/visibility`, AD, { published: scrap.published })
  }
  const shared = (await must('GET', '/api/student/assessment/shared-resources', ST)).items ?? []
  check('학생 공개 자료: A 보임', shared.some((item) => item.title === adminScraps[0].title))
  check('학생 공개 자료: 비공개 B 안 보임', !shared.some((item) => item.title === adminScraps[1].title))
})

await step('9-trash-restore', async () => {
  const id = ids.resourceB
  ids.trashRestoreTarget = `RESOURCE:${id}`
  save()
  const before = (await must('GET', `/api/student/assessment/resources?size=100&query=${encodeURIComponent(PREFIX)}`, ST)).items ?? []
  check('삭제 전: 자료 B 활성 목록', before.some((item) => item.resourceId === id))
  await must('DELETE', `/api/student/assessment/resources/${id}`, ST)
  const afterDelete = (await must('GET', `/api/student/assessment/resources?size=100&query=${encodeURIComponent(PREFIX)}`, ST)).items ?? []
  const trash = (await must('GET', '/api/student/assessment/archive?tab=trash&size=100', ST)).items ?? []
  check('삭제 후: 활성 목록에서 빠짐', !afterDelete.some((item) => item.resourceId === id))
  check('삭제 후: 휴지통 표시(원래 소속·삭제 시각)', trash.some((item) => item.sourceId === id && item.deletedAt), trash.find((item) => item.sourceId === id))
  await must('POST', '/api/student/assessment/archive/restore', ST, { sourceType: 'RESOURCE', sourceId: id })
  const afterRestore = (await must('GET', `/api/student/assessment/resources?size=100&query=${encodeURIComponent(PREFIX)}`, ST)).items ?? []
  check('복원 후: 같은 ID로 목록 재표시', afterRestore.some((item) => item.resourceId === id))
  // 다른 기록이 훼손되지 않았는지
  const revisions = (await must('GET', `/api/student/assessment/notes/${ids.noteId}/revisions`, ST)).items ?? []
  const versions = (await must('GET', `/api/student/assessment/artifacts/${ids.artifactReport}/versions`, ST)).items ?? []
  const request = await must('GET', `/api/student/assessment/feedback-requests/${ids.feedbackRequestId}`, ST)
  check('NoteRevision·ArtifactVersion·Snapshot 그대로', revisions.length >= 2 && versions.map((version) => version.versionId).join() === [ids.reportVersionV1, ids.reportVersionV2].join() && JSON.stringify(request.snapshot) === JSON.stringify(manifest.snapshotAtRequest))
})

await step('10-admin-view', async () => {
  const base = `/api/admin/assessment/students/${STUDENT}/student-view`
  const list = (await must('GET', `${base}/school-assessments?academicYear=${YEAR}&semester=${SEMESTER}&query=${encodeURIComponent(PREFIX)}&size=100`, AD)).items ?? []
  check('관리자 학생 화면 보기: 수행평가 4건 같은 ID', assessmentPlan.every((plan) => list.some((item) => item.assessmentId === ids[plan.key])), list.length)
  const other = await call('GET', `${base}/school-assessments?academicYear=${YEAR}&semester=${SEMESTER}`, { 'X-Assessment-Admin-Id': 'adm_bundang' })
  check('다른 지점 관리자 차단(404/403)', other.status === 404 || other.status === 403, other.status)
  const preview = await must('GET', `/api/admin/assessment/artifacts/${ids.artifactReport}/versions/${ids.reportVersionV2}/preview`, AD)
  check('관리자 미리보기 = 학생 업로드 v2 바이트', sha(preview) === files.pdfV2.sha256)
  const write = await call('POST', `${base}/school-assessments`, AD, { title: 'x' })
  check('학생 화면 보기 경로 쓰기 거절', write.status >= 400, write.status)
})

run.finishedAt = new Date().toISOString()
run.result = run.checks.every((item) => item.pass) ? 'ok' : 'checks-failed'
manifest.history.push(run)
manifest.lastRun = { at: run.finishedAt, result: run.result, created: run.created.length, reused: run.reused.length, checks: `${run.checks.filter((item) => item.pass).length}/${run.checks.length}` }
save()
console.log(`\n완료: 생성 ${run.created.length} · 재사용 ${run.reused.length} · 확인 ${manifest.lastRun.checks} → ${MANIFEST}`)
process.exit(run.result === 'ok' ? 0 : 1)
