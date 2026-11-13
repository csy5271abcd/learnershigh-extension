// 15개교·60명 합성 학생 수행평가·탐구 노트·결과물·피드백·성장 기록 Seed (실제 Backend API → MySQL).
// usage:
//   node seed-student-activities.mjs [--api http://localhost:18080] [--school unjeong[,sehwa]] [--dry-run]
// 전제: Backend가 learnershigh.integration.mode=mock + ASSESSMENT_DEMO_ROSTER_ENABLED=true 로 실행 중이어야 한다.
// 원칙:
//  - localhost Backend만 허용. 인증은 기존 개발용 Mock Header(X-Assessment-Student-Id / X-Assessment-Admin-Id)만 쓴다. 비밀번호·토큰 없음.
//  - 학생 Header는 그 학생 본인 자료를 만들 때만 쓴다. 관리자 Header는 그 학생 지점의 담당 관리자만 쓴다(다른 지점 관리자 사용 금지).
//  - 서버 검증(수강 과목·상태 전이·Snapshot)을 우회하지 않는다. 실패하면 멈추고, 다시 실행하면 Manifest ID로 이어서 진행한다.
//  - 중복 방지: Manifest의 ID → 없으면 서버 목록에서 seed tag(설명·본문에 넣은 고유 Key)로 찾는다. 제목만으로 판단하지 않는다.
//  - DB 초기화·삭제·기존 데이터 수정 없음. 모든 내용은 합성 시연 데이터다(공식 학교 일정·생활기록부 아님).
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { futureDeadline, naturalTitle, seoulToday } from './lib/demo-content.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const MANIFEST = join(DOC_DIR, 'SEED-MANIFEST.json')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, value, index, all) => (value.startsWith('--') ? [...acc, [value.slice(2), all[index + 1]?.startsWith('--') || all[index + 1] === undefined ? true : all[index + 1]]] : acc), []))
const API = String(args.api ?? 'http://localhost:18080').replace(/\/+$/, '')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) throw new Error('localhost Backend만 허용해요.')
const DRY = Boolean(args['dry-run'])
const ONLY = args.school ? new Set(String(args.school).split(',')) : null
const PREFIX = '[DEMO-15S-2026]'
const YEAR = 2026

const roster = JSON.parse(readFileSync(join(DOC_DIR, 'SYNTHETIC-STUDENTS.json'), 'utf8'))
const catalog = JSON.parse(readFileSync(join(DOC_DIR, 'SUBJECT-CATALOG.json'), 'utf8'))
const refSources = existsSync(join(DOC_DIR, 'ASSESSMENT-REFERENCE-SOURCES.json')) ? JSON.parse(readFileSync(join(DOC_DIR, 'ASSESSMENT-REFERENCE-SOURCES.json'), 'utf8')) : { templates: {} }
const subjectGroupOf = new Map(catalog.slots.flatMap((slot) => slot.subjects.map((s) => [s.subjectId, s.subjectGroup])))
const subjectNameOf = new Map(catalog.slots.flatMap((slot) => slot.subjects.map((s) => [s.subjectId, s.name])))

// ---------------- Manifest ----------------
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { batch: 'DEMO-15S-2026', prefix: PREFIX, students: {}, runs: [] }
const run = { startedAt: new Date().toISOString(), api: API, only: ONLY ? [...ONLY] : null, created: {}, reused: {}, checks: [] }
const save = () => !DRY && writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
const bump = (bucket, kind) => (run[bucket][kind] = (run[bucket][kind] ?? 0) + 1)
const check = (name, ok, detail) => {
  run.checks.push({ name, pass: Boolean(ok), detail })
  if (!ok) console.log(`FAIL ${name} ${detail !== undefined ? JSON.stringify(detail).slice(0, 300) : ''}`)
}

// ---------------- HTTP ----------------
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
  if (DRY && method !== 'GET') return {}
  const result = await call(method, path, headers, body)
  if (!expected.includes(result.status)) {
    const detail = result.data && !Buffer.isBuffer(result.data) ? JSON.stringify(result.data).slice(0, 400) : ''
    throw new Error(`${method} ${path} → ${result.status} ${detail}`)
  }
  return result.data
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hash = (text) => {
  let h = 0x811c9dc5
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return h
}

// ---------------- 합성 파일 (결정적 바이트, 작은 크기) ----------------
function pdf(lines, barWidth) {
  const text = lines.map((line, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 60 ${740 - i * 24} Td (${line.replace(/[()\\]/g, '').replace(/[^\x20-\x7e]/g, '')}) Tj ET`).join('\n')
  const content = `${text}\n0.15 0.45 0.75 rg 60 380 ${barWidth} 30 re f\n0.85 0.35 0.2 rg 60 330 ${Math.round(barWidth * 0.6)} 30 re f\n`
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
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function png(values, color) {
  const width = 480
  const height = 300
  const pixels = Buffer.alloc(width * height * 3, 255)
  const rect = (x0, y0, x1, y1, [r, g, b]) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) {
        const at = (y * width + x) * 3
        pixels[at] = r
        pixels[at + 1] = g
        pixels[at + 2] = b
      }
  }
  for (let y = 30; y <= 260; y += 23) rect(50, y, 450, y + 1, [225, 230, 236])
  rect(50, 30, 52, 262, [60, 64, 72])
  rect(50, 260, 450, 262, [60, 64, 72])
  values.forEach((value, i) => {
    const x = 80 + i * 70
    const h = Math.round((value / 100) * 220)
    rect(x, 260 - h, x + 40, 260, color)
  })
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3)
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

// ---------------- 수행평가 유형 (15개교 평가계획서 참고 유형, 일정·상태·내용은 합성) ----------------
// key는 ASSESSMENT-REFERENCE-SOURCES.json의 근거와 연결된다.
const TEMPLATES = {
  국어: [
    { key: 'kor-critique', title: '문학 작품 비평문 쓰기', type: '논술·비평문', topic: '현대시 한 편의 화자와 정서 분석' },
    { key: 'kor-reading', title: '주제 탐구 독서 및 서평 쓰기', type: '독서·서평', topic: '과학 교양서 한 권을 읽고 쟁점 정리' },
    { key: 'kor-debate', title: '토론 및 논증하는 글쓰기', type: '토론·논술', topic: '청소년 SNS 사용 시간 규제 찬반' },
    { key: 'kor-media', title: '매체 자료 분석 발표', type: '발표', topic: '뉴스 기사와 카드뉴스의 표현 방식 비교' },
  ],
  수학: [
    { key: 'math-process', title: '문제 해결 과정 서술 평가', type: '서술·논술', topic: '수열의 규칙을 찾아 일반항으로 설명하기' },
    { key: 'math-model', title: '실생활 수학 모델링 보고서', type: '탐구 보고서', topic: '통학 시간과 교통수단 선택의 최적화' },
    { key: 'math-stats', title: '통계 자료 분석 보고서', type: '탐구 보고서', topic: '학급 수면 시간 설문 자료의 분포 분석' },
    { key: 'math-concept', title: '수학 개념 탐구 발표', type: '발표', topic: '로그의 실생활 활용(소리 크기·지진 규모)' },
  ],
  영어: [
    { key: 'eng-speech', title: '영어 주제 발표', type: '말하기·발표', topic: 'Introducing a local food culture' },
    { key: 'eng-essay', title: '영어 에세이 쓰기', type: '쓰기', topic: 'My opinion on remote learning' },
    { key: 'eng-reading', title: '영어 원서 읽기 활동', type: '읽기', topic: '영어 단편소설 한 편 요약과 감상' },
    { key: 'eng-debate', title: '영어 토론', type: '토론', topic: 'Should schools ban smartphones?' },
  ],
  사회: [
    { key: 'soc-issue', title: '사회 문제 조사 보고서', type: '조사·보고서', topic: '지역 인구 감소와 대중교통 문제' },
    { key: 'soc-debate', title: '시사 쟁점 토론', type: '토론', topic: '플랫폼 노동자의 권리 보호' },
    { key: 'soc-data', title: '통계 자료 분석 및 정책 비교', type: '자료 분석', topic: '청년 주거 정책 두 가지 비교' },
    { key: 'soc-history', title: '역사 인물·사건 탐구 보고서', type: '탐구 보고서', topic: '근대 개항기 인물의 선택과 영향' },
  ],
  과학: [
    { key: 'sci-design', title: '실험 설계 및 실험 보고서', type: '실험·보고서', topic: '온도에 따른 효소 반응 속도 비교' },
    { key: 'sci-inquiry', title: '주제 탐구 보고서', type: '탐구 보고서', topic: '미세플라스틱이 수생 생물에 미치는 영향' },
    { key: 'sci-analysis', title: '실험 결과 분석 및 발표', type: '발표', topic: '빗면에서 물체의 가속도 측정' },
    { key: 'sci-observe', title: '관찰 탐구 활동', type: '관찰·탐구', topic: '세포의 삼투 현상 관찰' },
  ],
  정보: [
    { key: 'info-program', title: '프로그래밍 프로젝트', type: '프로젝트', topic: '급식 메뉴 추천 프로그램 만들기' },
    { key: 'info-data', title: '데이터 분석 프로젝트', type: '프로젝트', topic: '공공데이터로 본 우리 지역 미세먼지' },
    { key: 'info-ethics', title: '정보 윤리 탐구 발표', type: '발표', topic: '생성형 AI 사용의 저작권 문제' },
  ],
  체육: [
    { key: 'pe-skill', title: '실기 평가', type: '실기', topic: '농구 레이업과 패스 기능' },
    { key: 'pe-plan', title: '건강 체력 관리 계획서', type: '보고서', topic: '4주 체력 향상 계획과 기록' },
  ],
  예술: [
    { key: 'art-make', title: '작품 제작', type: '작품 제작', topic: '일상의 사물을 주제로 한 콜라주' },
    { key: 'art-critique', title: '감상 및 비평문 쓰기', type: '감상·비평', topic: '미술관 작품 한 점 감상 비평' },
    { key: 'art-perform', title: '연주·창작 프로젝트', type: '실기·창작', topic: '모둠 합주 편곡' },
  ],
  '기술·가정': [{ key: 'tech-project', title: '생활 문제 해결 프로젝트', type: '프로젝트', topic: '1인 가구 에너지 절약 방법 설계' }],
  제2외국어: [
    { key: 'lang-speak', title: '회화 말하기 평가', type: '말하기', topic: '자기소개와 취미 말하기' },
    { key: 'lang-culture', title: '문화 탐구 발표', type: '발표', topic: '명절 문화 비교' },
  ],
  교양: [
    { key: 'gen-career', title: '진로 탐색 보고서', type: '보고서', topic: '관심 직업의 하루와 필요 역량' },
    { key: 'gen-essay', title: '논술문 작성', type: '논술', topic: '공정함의 기준에 대한 논술' },
    { key: 'gen-psych', title: '심리 탐구 보고서', type: '탐구 보고서', topic: '시험 불안을 줄이는 방법 탐구' },
  ],
}
const FEEDBACK_TEXT = {
  국어: ['작품 분석에 구체적인 근거(구절)를 추가해 보세요.', '주장과 근거의 연결이 분명합니다. 반론에 대한 재반박 문단을 한 개 더 넣어 보세요.'],
  수학: ['계산 결과뿐 아니라 문제 해결 과정을 단계별로 설명해 보세요.', '모델의 가정을 먼저 밝히고, 가정이 바뀌면 결과가 어떻게 달라지는지 덧붙여 보세요.'],
  영어: ['발표의 결론 부분에서 자신의 의견을 더 분명하게 제시해 보세요.', '문단마다 주제문을 먼저 쓰면 글의 흐름이 더 잘 보여요.'],
  사회: ['자료의 출처와 조사 시점을 함께 적어 주세요. 두 정책의 비교 기준을 표로 정리하면 좋겠습니다.', '사례가 구체적입니다. 다른 관점의 근거도 한 가지 소개해 보세요.'],
  과학: ['실험 변인을 더 명확하게 작성하면 좋겠습니다. 통제 변인을 따로 정리해 보세요.', '결과 그래프에 단위와 반복 횟수를 표시하면 결론의 설득력이 높아집니다.'],
  정보: ['프로그램의 입력과 출력 예시를 표로 정리해 보세요.', '데이터 정제 과정을 단계별로 기록하면 재현하기 쉬워요.'],
  체육: ['기록 변화를 주차별로 정리하고, 다음 목표를 구체적으로 세워 보세요.'],
  예술: ['작품 의도와 표현 방법의 연결을 한 문장으로 설명해 보세요.'],
  '기술·가정': ['해결 방법별 비용과 효과를 비교하면 설계 근거가 더 분명해져요.'],
  제2외국어: ['자주 쓰는 표현 외에 새로 배운 표현을 두 가지 더 활용해 보세요.'],
  교양: ['자료 조사 결과와 나의 생각을 구분해 쓰면 좋겠습니다.'],
}
const DRAFT_TEXT = '전체 흐름을 확인했습니다. 근거 보완이 필요한 부분을 정리하고 있어요. (관리자 초안 · 학생 비공개)'

const termDate = (semester, k, h) => {
  // 1학기 3~7월, 2학기 9~12월 범위의 합성 날짜 (공식 학교 일정 아님)
  const months = semester === 1 ? [4, 5, 6, 7] : [9, 10, 11, 12]
  const month = months[(k + h) % months.length]
  const day = 3 + ((h >>> 3) % 24)
  return `${YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
// 진행 상태 (서버 Enum BEFORE_START / IN_PROGRESS / COMPLETED). 기준일 2026-11-12 기준으로 자연스럽게 배정.
const statusFor = (semester, deadline, h) => {
  if (semester === 1) return h % 7 === 0 ? 'IN_PROGRESS' : 'COMPLETED'
  if (deadline < '2026-11-01') return h % 5 === 0 ? 'IN_PROGRESS' : 'COMPLETED'
  if (deadline < '2026-12-01') return ['IN_PROGRESS', 'IN_PROGRESS', 'BEFORE_START', 'COMPLETED'][h % 4]
  return h % 3 === 0 ? 'IN_PROGRESS' : 'BEFORE_START'
}

// 학생별 계획 (결정적)
function planFor(student, index) {
  const plan = { assessments: [], wantsArtifact: [0, 1, 3].includes(index % 5), wantsV2: index % 2 === 0, favorite: index % 3 === 0 }
  for (const semester of [1, 2]) {
    const subjectIds = student.subjectIds[semester]
    const count = 2 + ((index + semester) % 3) // 2·3·4건, 평균 3건
    const used = new Set()
    for (let k = 0; k < count; k++) {
      const h = hash(`${student.studentId}|${semester}|${k}`)
      let subjectId = subjectIds[(h + k * 3) % subjectIds.length]
      for (let step = 0; used.has(subjectId) && step < subjectIds.length; step++) subjectId = subjectIds[(subjectIds.indexOf(subjectId) + 1) % subjectIds.length]
      used.add(subjectId)
      const group = subjectGroupOf.get(subjectId) ?? '교양'
      const templates = TEMPLATES[group] ?? TEMPLATES.교양
      const template = templates[(h >>> 5) % templates.length]
      // 상태는 원래 합성 일정(termDate) 기준으로 정해 두고(기존 데이터와 같게), 새로 만들 때의 마감일은 실행일 다음 날 이후로 한다(2026-11-12 요청).
      const syntheticTermDate = termDate(semester, k, h)
      const seedKey = `DEMO-15S-2026:${student.studentId}:${YEAR}-${semester}:${subjectId}:${template.key}`
      const deadlineDate = futureDeadline(seedKey, seoulToday())
      plan.assessments.push({
        key: `s${semester}k${k}`, seedKey, semester, subjectId, subjectName: subjectNameOf.get(subjectId), group, template,
        title: `${PREFIX} ${naturalTitle(subjectNameOf.get(subjectId), template.key)}`,
        deadlineDate, status: statusFor(semester, syntheticTermDate, h),
      })
    }
  }
  return plan
}
function describe(item) {
  const ref = refSources.templates?.[item.template.key]
  const refText = ref?.evidence?.length ? ` 평가 유형 참고: ${ref.evidence.slice(0, 2).map((e) => `${e.school} ${e.grade ?? '?'}학년 ${e.semester}학기 계획서 p.${e.page}`).join(', ')}.` : ''
  return `합성 시연 데이터입니다. 공식 학교 일정·평가 공지가 아니에요. 유형: ${item.template.type}. 주제: ${item.template.topic}.${refText} [seed:${item.seedKey}]`
}

const heading = (id, text) => ({ blockId: id, type: 'HEADING', text, attrs: { level: 2 } })
const para = (id, text) => ({ blockId: id, type: 'PARAGRAPH', text })
function noteBlocks(student, item, version) {
  const t = item.template
  const v1 = [
    heading('d-h1', '탐구 동기'), para('d-p1', `${item.subjectName} 수업에서 '${t.topic}'에 관심이 생겼다.`),
    heading('d-h2', '주제와 목표'), para('d-p2', `주제: ${t.topic}. 목표: ${t.type} 형식으로 내 생각과 근거를 정리한다.`),
    heading('d-h3', '활동 계획'), para('d-p3', '1. 자료 조사  2. 핵심 개념 정리  3. 초안 작성  4. 친구 의견 받기'),
    heading('d-h4', '참고자료'), para('d-p4', '교과서 해당 단원, 학교 도서관 자료, 공공기관 공개 자료(합성 예시)'),
  ]
  if (version === 1) return v1
  return [
    ...v1,
    heading('d-h5', '활동 과정과 결과'), para('d-p5', `조사한 내용을 바탕으로 ${t.type} 초안을 완성했다. (합성 시연 기록이며 실제 결과가 아님)`),
    heading('d-h6', '어려웠던 점'), para('d-p6', '근거 자료를 고르는 기준을 정하는 것이 어려웠다.'),
    heading('d-h7', '개선 방향'), para('d-p7', '자료의 출처와 시점을 함께 기록하고, 반대 관점의 근거도 확인한다.'),
    heading('d-h8', '배운 점'), para('d-p8', `${item.subjectName}에서 배운 개념을 실제 문제에 적용해 볼 수 있었다.`),
  ]
}

const branchAdmins = { br_demo_a: ['adm_demo_a01', 'adm_demo_a02'], br_demo_b: ['adm_demo_b01'], br_demo_c: ['adm_demo_c01'] }

async function seedStudent(student, index) {
  const sid = student.studentId
  const ST = { 'X-Assessment-Student-Id': sid }
  const admins = branchAdmins[student.branchId]
  const AD = { 'X-Assessment-Admin-Id': admins[index % admins.length] }
  const rec = (manifest.students[sid] ??= { studentId: sid, branchId: student.branchId, school: student.school.name, grade: student.grade, assessments: {} })
  rec.admin = AD['X-Assessment-Admin-Id']
  const plan = planFor(student, index)

  // 0. 학업 Context (명단 → 서버 원천 일치)
  for (const semester of [1, 2]) {
    const ctx = await must('GET', `/api/student/assessment/academic-context?academicYear=${YEAR}&semester=${semester}`, ST)
    check(`${sid} ${semester}학기 Context 학교·학년·반번호`, ctx.school?.schoolId === student.school.schoolId && ctx.grade === student.grade && ctx.schoolClassNumber === student.schoolClassNumber && ctx.schoolStudentNumber === student.schoolStudentNumber, { school: ctx.school, grade: ctx.grade })
    check(`${sid} ${semester}학기 수강 과목 = 명단`, JSON.stringify(ctx.subjects?.map((s) => s.subjectId)) === JSON.stringify(student.subjectIds[semester]))
    check(`${sid} ${semester}학기 catalogSubjects enrolled 일치`, (ctx.catalogSubjects ?? []).filter((c) => c.enrolled).length === student.subjectIds[semester].length && (ctx.catalogSubjects ?? []).length > student.subjectIds[semester].length)
  }

  // 1. 수행평가
  const existingBy = {}
  for (const semester of [1, 2]) {
    const list = await must('GET', `/api/student/assessment/school-assessments?academicYear=${YEAR}&semester=${semester}&query=${encodeURIComponent(PREFIX)}&size=100`, ST)
    for (const item of list.items ?? []) {
      const tag = /\[seed:([^\]]+)\]/.exec(item.description ?? '')?.[1]
      if (tag) existingBy[tag] = item
    }
  }
  for (const item of plan.assessments) {
    const known = rec.assessments[item.key]
    let id = known?.assessmentId
    if (id) {
      const got = await call('GET', `/api/student/assessment/school-assessments/${id}`, ST)
      if (got.status !== 200) id = null
    }
    if (!id && existingBy[item.seedKey]) id = existingBy[item.seedKey].assessmentId
    if (id) bump('reused', 'assessment')
    else {
      const body = { title: item.title, subjectId: item.subjectId, academicYear: YEAR, semester: item.semester, deadlineDate: item.deadlineDate, description: describe(item), status: item.status, evaluationItemRef: null }
      id = (await must('POST', '/api/student/assessment/school-assessments', ST, body)).assessmentId
      bump('created', 'assessment')
    }
    // 기존 기록의 이력 필드(previousTitle·previousDeadlineDate 등)를 지우지 않도록 합친다.
    rec.assessments[item.key] = { ...rec.assessments[item.key], assessmentId: id, seedKey: item.seedKey, semester: item.semester, subjectId: item.subjectId, subjectName: item.subjectName, title: item.title, status: item.status, deadlineDate: item.deadlineDate, templateKey: item.template.key }
    save()
  }
  // 재조회 검증: 상세(§12)로 제목·과목·상태, 학기는 학기별 목록(§12 GET ?semester=)에 들어 있는지로 확인한다 (상세 응답에는 학기 필드가 없다).
  const termIds = {}
  for (const semester of [1, 2]) {
    const list = await must('GET', `/api/student/assessment/school-assessments?academicYear=${YEAR}&semester=${semester}&query=${encodeURIComponent(PREFIX)}&size=100`, ST)
    termIds[semester] = new Set((list.items ?? []).map((i) => i.assessmentId))
  }
  for (const item of plan.assessments) {
    const id = rec.assessments[item.key].assessmentId
    const detail = await must('GET', `/api/student/assessment/school-assessments/${id}`, ST)
    // 마감일은 서버 값을 기록한다(수정 스크립트로 바꾼 날짜를 재실행이 되돌리지 않게).
    rec.assessments[item.key].deadlineDate = detail.deadlineDate
    check(`${sid} ${item.key} 재조회 제목·과목·상태`, detail.title === item.title && detail.subjectId === item.subjectId && detail.status === item.status, { status: detail.status })
    check(`${sid} ${item.key} 학기 목록 소속`, termIds[item.semester].has(id) && !termIds[3 - item.semester].has(id))
  }

  // 2. 탐구 노트 (학생당 1건, 2학기 진행/완료 과제 우선)
  const target = plan.assessments.find((a) => a.semester === 2 && a.status !== 'BEFORE_START') ?? plan.assessments.find((a) => a.status !== 'BEFORE_START') ?? plan.assessments[0]
  const sa = rec.assessments[target.key].assessmentId
  const noteTitle = `${PREFIX} ${target.subjectName} ${target.template.topic} 탐구 노트`
  const notes = (await must('GET', `/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, ST)).items ?? []
  let noteId = rec.note?.noteId && notes.some((n) => n.noteId === rec.note.noteId) ? rec.note.noteId : notes.find((n) => n.title === noteTitle)?.noteId
  if (noteId) bump('reused', 'note')
  else {
    noteId = (await must('POST', '/api/student/assessment/notes', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title: noteTitle, blocks: noteBlocks(student, target, 1) })).noteId
    bump('created', 'note')
  }
  rec.note = { noteId, assessmentKey: target.key, assessmentId: sa, title: noteTitle }
  save()
  let revisions = (await must('GET', `/api/student/assessment/notes/${noteId}/revisions`, ST)).items ?? []
  const needV2 = plan.wantsV2 || plan.wantsArtifact
  if (needV2 && revisions.length < 2) {
    const latest = revisions.reduce((best, r) => (!best || r.revisionNumber > best.revisionNumber ? r : best), null)
    await must('PUT', `/api/student/assessment/notes/${noteId}`, ST, { expectedRevisionId: latest.revisionId, title: noteTitle, blocks: noteBlocks(student, target, 2) })
    bump('created', 'noteRevision')
    revisions = (await must('GET', `/api/student/assessment/notes/${noteId}/revisions`, ST)).items ?? []
  } else bump('reused', 'noteRevision')
  rec.note.revisions = revisions.map((r) => ({ revisionId: r.revisionId, revisionNumber: r.revisionNumber })).sort((a, b) => a.revisionNumber - b.revisionNumber)
  save()
  if (rec.note.revisions.length >= 2) {
    const v1 = await must('GET', `/api/student/assessment/notes/${noteId}/revisions/${rec.note.revisions[0].revisionId}`, ST)
    check(`${sid} NoteRevision v1 불변`, !JSON.stringify(v1).includes('배운 점') && JSON.stringify(v1).includes('활동 계획'))
  }
  const latestRevisionId = rec.note.revisions.at(-1).revisionId

  // 3. 결과물 (PDF v1·v2, 과학 계열은 PNG 그래프)
  let reportVersionId = null
  if (plan.wantsArtifact) {
    const artifacts = (await must('GET', `/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${sa}`, ST)).items ?? []
    const ensureArtifact = async (title) => {
      const found = artifacts.find((a) => a.title === title)
      if (found) {
        bump('reused', 'artifact')
        return found.artifactId
      }
      bump('created', 'artifact')
      return (await must('POST', '/api/student/assessment/artifacts', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, title, kind: null })).artifactId
    }
    const ensureVersions = async (artifactId, entries) => {
      let versions = (await must('GET', `/api/student/assessment/artifacts/${artifactId}/versions`, ST)).items ?? []
      for (const [index2, entry] of entries.entries()) {
        const existing = versions.find((v) => v.file?.fileName === entry.name)
        if (existing) {
          bump('reused', 'artifactVersion')
          entry.versionId = existing.versionId
          continue
        }
        if (versions.length > index2) throw new Error(`${sid} 결과물에 예상하지 않은 버전이 있어요. 덮어쓰지 않고 멈춰요.`)
        const form = new FormData()
        form.append('file', new Blob([entry.bytes], { type: entry.type }), entry.name)
        form.append('changeNote', entry.changeNote)
        const latest = versions.at(-1)
        if (latest) form.append('expectedLatestVersionId', latest.versionId)
        entry.versionId = (await must('POST', `/api/student/assessment/artifacts/${artifactId}/versions`, ST, form)).versionId
        bump('created', 'artifactVersion')
        versions = (await must('GET', `/api/student/assessment/artifacts/${artifactId}/versions`, ST)).items ?? []
      }
      return entries
    }
    const h = hash(sid)
    const slug = sid.replace('stu_', '')
    const reportTitle = `${PREFIX} ${target.subjectName} ${target.template.type} 결과물`
    const reportId = await ensureArtifact(reportTitle)
    const entries = [{ name: `${PREFIX} ${slug} report v1.pdf`, type: 'application/pdf', changeNote: '초안: 주제·목표·계획', bytes: pdf([`DEMO-15S-2026 ${slug} report v1`, 'Synthetic demo artifact - not a real student submission', `Grade ${student.grade} / semester ${target.semester}`, 'Draft: topic, goal, plan'], 160 + (h % 120)) }]
    if (plan.wantsV2) entries.push({ name: `${PREFIX} ${slug} report v2.pdf`, type: 'application/pdf', changeNote: '보완: 결과·어려웠던 점·개선 방향', bytes: pdf([`DEMO-15S-2026 ${slug} report v2`, 'Synthetic demo artifact - not a real student submission', `Grade ${student.grade} / semester ${target.semester}`, 'Added: result, difficulty, improvement'], 260 + (h % 140)) })
    await ensureVersions(reportId, entries)
    rec.artifacts = [{ artifactId: reportId, title: reportTitle, versions: entries.map((e) => ({ versionId: e.versionId, fileName: e.name, sha256: sha(e.bytes), sizeBytes: e.bytes.length })) }]
    if (target.group === '과학' || target.group === '수학') {
      const graphTitle = `${PREFIX} ${target.subjectName} 결과 그래프`
      const graphId = await ensureArtifact(graphTitle)
      const values = [20, 35, 50, 65, 80].map((v, i) => Math.min(95, v + ((h >>> i) % 12)))
      const graph = [{ name: `${PREFIX} ${slug} graph.png`, type: 'image/png', changeNote: '합성 그래프 (실제 측정값 아님)', bytes: png(values, [92, 140, 220]) }]
      await ensureVersions(graphId, graph)
      rec.artifacts.push({ artifactId: graphId, title: graphTitle, versions: graph.map((e) => ({ versionId: e.versionId, fileName: e.name, sha256: sha(e.bytes), sizeBytes: e.bytes.length })) })
    }
    save()
    // 다운로드 SHA-256 일치
    for (const artifact of rec.artifacts)
      for (const version of artifact.versions) {
        const download = await must('GET', `/api/student/assessment/artifacts/${artifact.artifactId}/versions/${version.versionId}/file`, ST)
        check(`${sid} 파일 SHA-256 ${version.fileName}`, Buffer.isBuffer(download) && sha(download) === version.sha256)
      }
    reportVersionId = rec.artifacts[0].versions.at(-1).versionId
  }

  // 4. 피드백 요청 (결과물 보유 학생) → 상태 A 대기 / B 초안 / C 전달
  if (plan.wantsArtifact) {
    const mode = ['DELIVERED', 'DELIVERED', 'DRAFT', 'DELIVERED', 'PENDING', 'DELIVERED'][index % 6]
    const requests = (await must('GET', '/api/student/assessment/feedback-requests?size=100', ST)).items ?? []
    let rid = rec.feedback?.requestId && requests.some((r) => r.requestId === rec.feedback.requestId) ? rec.feedback.requestId : requests.find((r) => r.snapshot?.noteRevisionId === latestRevisionId)?.requestId
    if (rid) bump('reused', 'feedbackRequest')
    else {
      rid = (await must('POST', '/api/student/assessment/feedback-requests', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: sa, noteRevisionId: latestRevisionId, artifactVersionIds: [reportVersionId] })).requestId
      bump('created', 'feedbackRequest')
    }
    rec.feedback = { requestId: rid, plannedState: mode, admin: AD['X-Assessment-Admin-Id'] }
    save()
    const requested = await must('GET', `/api/student/assessment/feedback-requests/${rid}`, ST)
    check(`${sid} Snapshot 고정(최신 Revision + 선택 버전)`, requested.snapshot?.locked && requested.snapshot.noteRevisionId === latestRevisionId && requested.snapshot.artifactVersionIds?.join() === reportVersionId)
    const texts = FEEDBACK_TEXT[target.group] ?? FEEDBACK_TEXT.교양
    const finalText = texts[index % texts.length]
    if (mode !== 'PENDING' && requested.status !== 'DELIVERED') {
      const adminDetail = await must('GET', `/api/admin/assessment/feedback-requests/${rid}`, AD)
      if (!adminDetail.draft && !adminDetail.reply) {
        await must('PUT', `/api/admin/assessment/feedback-requests/${rid}/reply-draft`, AD, { overallComment: DRAFT_TEXT, comments: [], recommendations: [] })
        bump('created', 'feedbackDraft')
      }
      const studentView = await must('GET', `/api/student/assessment/feedback-requests/${rid}/reply`, ST)
      check(`${sid} 관리자 초안 학생 비노출`, studentView.reply === null)
      if (mode === 'DELIVERED') {
        await must('POST', `/api/admin/assessment/feedback-requests/${rid}/deliver`, AD, { overallComment: finalText, comments: [], recommendations: [] })
        bump('created', 'feedbackDelivered')
      }
    } else if (requested.status === 'DELIVERED') bump('reused', 'feedbackDelivered')
    const reply = await must('GET', `/api/student/assessment/feedback-requests/${rid}/reply`, ST)
    rec.feedback.status = reply.status
    if (mode === 'DELIVERED') check(`${sid} 학생 전달 결과 조회`, reply.status === 'DELIVERED' && reply.reply?.overallComment === finalText, reply.status)
    else check(`${sid} 미전달 상태 학생 reply 없음`, reply.reply === null, reply.status)
    save()
  }

  // 5. 성장 기록 (학생당 1건)
  const growthTitle = `${PREFIX} ${target.subjectName} ${target.template.type} 활동 성찰`
  const growthList = (await must('GET', `/api/student/assessment/growth-records?query=${encodeURIComponent(PREFIX)}&size=100`, ST)).items ?? []
  let recordId = rec.growth?.recordId && growthList.some((g) => g.recordId === rec.growth.recordId) ? rec.growth.recordId : growthList.find((g) => g.title === growthTitle && g.relatedSourceId === sa)?.recordId
  if (recordId) bump('reused', 'growthRecord')
  else {
    recordId = (await must('POST', '/api/student/assessment/growth-records', ST, {
      title: growthTitle,
      subjectId: target.subjectId,
      activityStartDate: termDate(target.semester, 0, hash(sid + 'g')),
      motivation: `${target.subjectName} 수업에서 '${target.template.topic}'를 더 알아보고 싶었다.`,
      role: `${target.template.type} 준비 과정에서 자료 조사와 정리를 맡았다.`,
      process: '자료를 조사해 노트에 정리하고 초안을 수정하며 결과물을 완성했다.',
      difficulty: '근거 자료를 고르고 내 생각과 구분해 정리하기 어려웠다.',
      solution: '출처와 시점을 기록하고 친구·선생님 의견을 받아 보완했다.',
      reflection: '결과뿐 아니라 과정을 기록하는 것이 다음 활동에 도움이 된다는 것을 배웠다. (합성 시연 기록 · 학교생활기록부 아님)',
      followUp: '관련 주제를 다른 과목과 연결해 후속 탐구를 해 보고 싶다.',
      relatedSourceType: 'SCHOOL_ASSESSMENT',
      relatedSourceId: sa,
      artifactIds: (rec.artifacts ?? []).map((a) => a.artifactId),
    })).recordId
    bump('created', 'growthRecord')
  }
  rec.growth = { recordId, title: growthTitle, relatedAssessmentId: sa }
  save()

  // 6. 중요 표시 (수행평가 즐겨찾기, 계약 범위)
  if (plan.favorite) {
    const favId = rec.assessments[plan.assessments.at(-1).key].assessmentId
    await must('PUT', '/api/student/assessment/archive/favorites', ST, { sourceType: 'SCHOOL_ASSESSMENT', sourceId: favId, favorite: true })
    rec.favoriteAssessmentId = favId
    bump('reused', 'favoritePutIdempotent')
    save()
  }

  // 7. 관리자 열람 (담당 지점 관리자)
  const adminList = (await must('GET', `/api/admin/assessment/students/${sid}/growth-records`, AD)).items ?? []
  check(`${sid} 관리자(담당 지점) 같은 성장 기록 ID`, adminList.some((g) => g.recordId === recordId))
}

// ---------------- 실행 ----------------
const students = roster.students.filter((s) => !ONLY || ONLY.has(s._doc.schoolKey))
console.log(`대상 학생 ${students.length}명 · API ${API}${DRY ? ' · DRY RUN' : ''}`)
for (const [index, student] of roster.students.entries()) {
  if (ONLY && !ONLY.has(student._doc.schoolKey)) continue
  try {
    await seedStudent(student, index)
    process.stdout.write(`${student.studentId}(${student.school.name} ${student.grade}학년) 완료\n`)
  } catch (error) {
    run.finishedAt = new Date().toISOString()
    run.result = `failed at ${student.studentId}: ${String(error.message ?? error).slice(0, 400)}`
    manifest.runs.push(run)
    save()
    console.error(`\n중단: ${student.studentId} → ${error.message ?? error}`)
    console.error('다시 실행하면 Manifest의 ID를 확인한 뒤 이어서 진행해요.')
    process.exit(1)
  }
}
run.finishedAt = new Date().toISOString()
run.result = 'ok'
const failed = run.checks.filter((c) => !c.pass)
run.checkSummary = { total: run.checks.length, failed: failed.length }
manifest.runs.push({ ...run, checks: failed })
save()
console.log('\ncreated', JSON.stringify(run.created))
console.log('reused', JSON.stringify(run.reused))
console.log(`checks ${run.checks.length - failed.length}/${run.checks.length} PASS`)
if (failed.length) process.exit(2)
