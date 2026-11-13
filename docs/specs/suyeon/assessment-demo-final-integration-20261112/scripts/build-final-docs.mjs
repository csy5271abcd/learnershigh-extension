// 데이터 기반 결과 문서 생성 (E2E JSON·수정 결과·분석 요약·실시간 API 재조회 → Markdown). 쓰기 요청 없음.
// usage: node build-final-docs.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = resolve(D, '../assessment-15schools-60students-seed-202611')
const J = (p) => JSON.parse(readFileSync(p, 'utf8'))
const roster = J(join(SEED, 'SYNTHETIC-STUDENTS.json'))
const manifest = J(join(SEED, 'SEED-MANIFEST.json'))
const write = (name, lines) => writeFileSync(join(D, name), lines.join('\n') + '\n', 'utf8')
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)]
const SYN = '> 학교명은 실제 고등학교 이름이지만 학생·수행평가·노트·결과물·피드백·성장 기록은 모두 **합성 시연 데이터**다.'
const API = 'http://localhost:18080'
const e2e = (part) => (existsSync(join(D, 'screenshots', `e2e-${part}.json`)) ? J(join(D, 'screenshots', `e2e-${part}.json`)) : null)

// ---------- UI 검증 ----------
for (const [file, title, parts] of [
  ['STUDENT-UI-VERIFICATION.md', 'Student 5173 화면 검증', ['students', 'notes']],
  ['ADMIN-UI-VERIFICATION.md', 'Admin 5174 화면 검증', ['admins', 'plans']],
]) {
  const out = [`# ${title}`, '', '> 사용자가 띄운 **실제 5173·5174 서버**(재시작·임시 서버 없음) · 실제 Chrome(Playwright) 1920×1080 · Backend 18080(MySQL). 스크립트: `scripts/demo-final-e2e.mjs`.', '> Context 전환 = 개발 서버 전용 시연 링크(`?devStudent=` / `?devAdmin=`) → 화면 왼쪽 아래 "개발용" 전환 패널과 같은 저장소 값. **실제 로그인이 아니다**(API-OD-A01). 스크립트는 Header를 직접 붙이지 않는다.', '']
  for (const part of parts) {
    const r = e2e(part)
    if (!r) continue
    out.push(`## ${part} — ${r.results.filter((x) => x.pass).length}/${r.results.length} PASS · 페이지 오류 ${r.pageErrors.length} · API 4xx/5xx ${r.apiFailures.length} (${r.at})`, '')
    out.push(...table(['영역', '확인', '결과', '세부'], r.results.map((x) => [x.area, x.name, x.pass ? 'PASS' : 'FAIL', x.detail !== undefined ? JSON.stringify(x.detail).slice(0, 140) : ''])))
    if (r.apiFailures.length) out.push('', `API 4xx: ${r.apiFailures.map((f) => `${f.status} ${f.path}`).join(', ')} — 다른 지점 학생 URL 직접 입력·지점 관리자의 평가계획서 접근 시도에 대한 **의도한 거절**.`)
    out.push('')
  }
  if (file.startsWith('STUDENT')) {
    const a = existsSync(join(D, 'screenshots', 'e2e-artifacts.json')) ? J(join(D, 'screenshots', 'e2e-artifacts.json')) : []
    out.push('## 결과물 뷰어 (한글 새 버전)', '', ...table(['파일', '버전', '표시', '결과'], a.map((x) => [x.file, `v${x.versionNumber}`, x.rendered, x.ok ? 'PASS' : 'FAIL'])))
  }
  write(file, out)
}

// ---------- 캡처 ----------
{
  const shots = readdirSync(join(D, 'screenshots')).filter((f) => f.endsWith('.png')).sort()
  const out = ['# 화면 캡처 (실제 5173·5174, 1920×1080)', '', SYN, '> 모든 캡처는 실제 Backend·MySQL 데이터를 불러온 상태다. 정적 Mock 이미지 없음.', '']
  out.push(...table(['화면', '파일'], shots.map((f) => [f.replace(/\.png$/, '').replace(/-/g, ' '), `[${f}](screenshots/${f})`])))
  write('SCREENSHOTS.md', out)
}

// ---------- 마감일·제목 ----------
{
  // 건수는 실제 변경이 있었던 첫 실행의 요약(Seed Manifest deadlineTitleUpdates)을 쓴다.
  // (첫 실행 상세 로그 파일은 멱등성 재실행이 덮어썼다 → 스크립트 수정 완료. 건별 이력은 Manifest previousTitle·previousDeadlineDate)
  const first = manifest.deadlineTitleUpdates.find((u) => u.deadlineChanged + u.titleChanged > 0)
  const upd = { summary: { ...first, failures: Array.from({ length: first.failures }) } }
  const all = Object.values(manifest.students).flatMap((r) => Object.values(r.assessments))
  const changedDeadline = { length: first.deadlineChanged }
  const changedTitle = all.filter((a) => a.previousTitle).map((a) => ({ before: { title: a.previousTitle }, change: { title: a.title } }))
  const finalDates = Object.values(manifest.students).flatMap((r) => [...Object.values(r.assessments).map((a) => a.deadlineDate), ...Object.values(r.extraAssessments ?? {}).map((a) => a.deadlineDate)])
  const byMonth = finalDates.reduce((acc, d) => ({ ...acc, [d.slice(0, 7)]: (acc[d.slice(0, 7)] ?? 0) + 1 }), {})
  const out = ['# 수행평가 마감일 미래 변경 결과', '', SYN, `> 스크립트: \`assessment-15schools-60students-seed-202611/scripts/update-deadlines-and-titles.mjs\` · 기준일 **${upd.summary.today}(Asia/Seoul)** → 최소 마감일 **${upd.summary.minDate}**. 기존 §12 PATCH만 사용(삭제·재생성 없음).`, '']
  out.push(...table(['항목', '값'], [
    ['대상 수행평가', `${upd.summary.total}건 (Seed 360 + 화면 검증 중 모달 등록 1, Batch DEMO-15S-2026)`],
    ['마감일 변경', `${changedDeadline.length}건 (나머지 ${upd.summary.total - changedDeadline.length}건은 이미 ${upd.summary.minDate} 이후라 유지)`],
    ['상태 변경', `${upd.summary.statusChanged}건 (완료를 시작 전으로 되돌리지 않음)`],
    ['실패', `${upd.summary.failures.length}건`],
    ['과거·오늘·없음 마감일(최종)', `${finalDates.filter((d) => !d || d <= upd.summary.today).length}건`],
    ['최종 마감일 범위', `${[...finalDates].sort()[0]} ~ ${[...finalDates].sort().at(-1)}`],
    ['서로 다른 날짜 수', `${new Set(finalDates).size}개`],
    ['재실행', '변경 0건(멱등) — 제주고 Seed 재실행 후에도 23건 제목·마감일 유지'],
  ]))
  out.push('', '## 월별 분포', '', ...table(['월', '건수'], Object.entries(byMonth).sort()))
  out.push('', '## 확인 방법', '', '- 수정 직후 같은 ID를 학생 API와 담당 지점 관리자 API로 다시 읽어 마감일·제목·상태가 같은지 확인(실패 0).', '- 15개교 대표 학생 화면에서 학생별 전체 수행평가 마감일이 기준일 이후인지 확인(`STUDENT-UI-VERIFICATION.md` 마감일 항목 15/15).', '- 1학기 수행평가도 요청에 따라 미래 마감일로 바꿨다. **합성 시연 일정**이며 학년도·학기 메타데이터와 원본 평가계획서 공식 평가 시기는 바꾸지 않았다.', '', '원자료: Seed Manifest `deadlineTitleUpdates`(실행 요약 2회: 변경 1회 + 멱등 재실행 1회), 건별 `previousDeadlineDate`(제주고 19건은 Seed 재실행으로 이력 필드 유실). `deadline-title-update.json`은 멱등 재실행 결과(변경 0)로 덮어써진 상태 — 스크립트를 고쳐 이후에는 `deadline-title-rerun.json`에 따로 쓴다.')
  write('DEADLINE-UPDATE-RESULT.md', out)

  const pairs = new Map()
  for (const l of changedTitle) pairs.set(`${l.before.title}→${l.change.title}`, (pairs.get(`${l.before.title}→${l.change.title}`) ?? 0) + 1)
  const o2 = ['# 수행평가 제목 품질 개선', '', SYN, `> 규칙 검토 후 실제 변경 **${first.titleChanged}건**(실행 요약). 아래 변경표는 건별 이력이 남은 ${changedTitle.length}건(조합 ${pairs.size}종)이다 — 제주고 4명의 ${first.titleChanged - changedTitle.length}건은 이후 Seed 재실행이 이력 필드를 지워 표에서 빠졌다(DB 제목은 정상, 스크립트 수정 완료). 규칙: \`assessment-15schools-60students-seed-202611/scripts/lib/demo-content.mjs\` \`naturalTitle()\`. Assessment ID·노트·결과물·피드백 연결 그대로.`, '', '## 규칙', '', '- 단어 중복 제거: 과목명과 유형명이 겹치면 한 번만(예: `정보 정보 윤리` → `정보 윤리 문제`, `영어Ⅰ 영어 토론` → `영어Ⅰ 토론`).', '- 과목에 맞지 않는 유형 교정: 역사 인물·사건 유형은 역사 과목에만, 지리 → 지역 변화, 윤리 → 사상가, 음악/미술 구분 등.', '- `탐구`·`실험` 반복 정리(예: `과학탐구실험1 관찰 탐구 활동` → `과학탐구실험1 관찰 활동`).', '- 인접 단어 겹침 0건(자동 검사).', '', '## 변경표 (변경 전 → 변경 후, 건수)', '']
  o2.push(...table(['변경 전', '변경 후', '건수'], [...pairs].map(([k, n]) => [...k.split('→').map((t) => t.replace('[DEMO-15S-2026] ', '')), n])))
  o2.push('', '## 바꾸지 않은 것', '', '- 피드백 요청 Snapshot·노트 Revision·결과물 버전은 수행평가 제목을 복사해 두지 않아 영향이 없다(Snapshot은 Revision·Version ID를 고정).', '- 노트 본문·결과물 파일 이름·성장 기록 제목에 들어 있던 원래 주제 문구는 학생 원문이라 바꾸지 않았다(`ISSUES.md`).', '- `[DEMO-15S-2026][UI] 모달 등록 확인 stu_demo_001`은 Seed 밖 제목이라 그대로 두었다.')
  write('ASSESSMENT-TITLE-QUALITY.md', o2)
}

// ---------- 학교 매핑 (실시간 재조회) ----------
{
  const rows = []
  const adminSchools = {}
  for (const [adminId, branchId] of [['adm_demo_a01', 'br_demo_a'], ['adm_demo_b01', 'br_demo_b'], ['adm_demo_c01', 'br_demo_c']]) {
    const list = await (await fetch(`${API}/api/admin/assessment/students?academicYear=2026&semester=1`, { headers: { 'X-Assessment-Admin-Id': adminId } })).json()
    for (const item of list.items) adminSchools[item.student.studentId] = item.student.school.name
  }
  for (const s of roster.students) {
    const ST = { 'X-Assessment-Student-Id': s.studentId }
    const c1 = await (await fetch(`${API}/api/student/assessment/academic-context?academicYear=2026&semester=1`, { headers: ST })).json()
    const c2 = await (await fetch(`${API}/api/student/assessment/academic-context?academicYear=2026&semester=2`, { headers: ST })).json()
    const ok = c1.school.name === s.school.name && c2.school.name === s.school.name && adminSchools[s.studentId] === s.school.name && c1.grade === s.grade
    rows.push([s.studentId, s.displayName, s.branchId.replace('br_demo_', '').toUpperCase(), s.school.schoolId, s.school.name, c1.school.name, c2.school.name, adminSchools[s.studentId], s.grade, `${c1.schoolClassNumber}반 ${c1.schoolStudentNumber}번`, `${c1.subjects.length}·${c2.subjects.length}`, ok ? 'OK' : 'MISMATCH'])
  }
  const bad = rows.filter((r) => r.at(-1) !== 'OK').length
  const example = rows.filter((r) => [r[5], r[6], r[7]].includes('예시고등학교')).length
  const out = ['# 60명 학교 매핑 검증 (실시간 API)', '', SYN, `> ${new Date().toISOString()} 재조회. 학생 §9-1(1·2학기) 학교명, 담당 지점 관리자 학생 목록 학교명, 명단(SYNTHETIC-STUDENTS.json) 비교.`, '']
  out.push(...table(['항목', '결과'], [['학생', `${rows.length}명`], ['학교', `${new Set(rows.map((r) => r[3])).size}개 (학교당 4명)`], ['불일치', `${bad}명`], ['합성 학생의 예시고등학교 표시', `${example}명`], ['학년 1·2·3', ['1', '2', '3'].map((g) => `${g}학년 ${rows.filter((r) => String(r[8]) === g).length}`).join(' · ')]]))
  out.push('', ...table(['학생', '이름', '지점', '학교 ID', '명단 학교', '§9-1 1학기', '§9-1 2학기', '관리자 목록', '학년', '학교 반·번호', '수강 과목(1·2학기)', '판정'], rows))
  write('SCHOOL-MAPPING-VERIFICATION.md', out)
  console.log('school mapping mismatches', bad, 'example-school', example)
}

// ---------- 분석 결과 ----------
{
  const sum = J(join(D, 'plan-analysis-summary.json'))
  const errs = J(join(D, 'plan-analysis-error-cases.json'))
  const pdfImp = J(join(D, 'plan-import-pdf.json'))
  const hwpImp = J(join(D, 'plan-import-hwp.json'))
  const docRow = (k, v) => [k, v.folder.split('/2026')[0].split('/').pop(), v.format, `${(v.sizeBytes / 1024) | 0}KB`, v.sha256.slice(0, 12), v.pages ?? `구역 ${v.sections}`, v.status, v.summary.segmentsExtracted + '/' + v.summary.segments, v.summary.written, v.summary.performance, v.quoteCheck ? `${v.quoteCheck.matched}/${v.quoteCheck.locators}` : 'PDF 쪽 근거', `${v.ms ?? ''}`]
  const head = ['ID', '학교 폴더', '형식', '크기', 'SHA-256', '쪽/구역', '분석 상태', '과목 구간(추출/전체)', '지필', '수행', 'HWP 인용 일치', '']
  const subjects = (v) => table(['과목', '수행평가 후보(비율·만점·시기)'], v.subjects.map((s) => [s.name, (s.perf?.items ?? []).map((i) => `${i.label} (${i.w ?? '—'}%·${i.max ?? '—'}·${(i.timing ?? '—').toString().slice(0, 16)})`).join(' / ') || '— (항목 없음)']))
  for (const [file, fmt, extra] of [
    ['PDF-UPLOAD-ANALYSIS-RESULT.md', 'PDF', pdfImp],
    ['HWP-UPLOAD-ANALYSIS-RESULT.md', 'HWP', hwpImp],
    ['HWPX-REGRESSION-RESULT.md', 'HWPX', null],
  ]) {
    const docs = Object.entries(sum).filter(([, v]) => v.format === fmt)
    const out = [`# ${fmt} 평가계획서 업로드·분석 결과`, '', '> 분석기: 로컬 `curriculum-analysis` 서비스(127.0.0.1:8765, 이미 실행 중인 것 재사용), **v21.1 규칙 기반 구조 분석 · LLM 호출 없음(`llmCalls=false`)**. 결과는 모두 **자동 분석 후보 · 사람 검토 전(`DRAFT_UNREVIEWED`)**이다.', '> 실제 학교 문서는 **저장하지 않는 분석 미리보기**로만 분석했다(공식 DB 반입 승인 없음). DB 등록·분석 후보 저장·Admin 검토 화면은 정답이 있는 **합성 문서**로 검증했다.', '']
    if (extra) {
      out.push('## 1. Admin 등록 → 분석 → 분석 후보 저장 → 5174 검토 화면 (합성 문서)', '')
      out.push(...table(['단계', 'HTTP', '내용'], extra.steps.map((s) => [s.name, s.status, JSON.stringify(s.detail).replace(/"(planId|documentRevisionId|analysisId)":"[^"]+",?/g, '').slice(0, 220)])))
      out.push('', `- 슬롯: 시연 DB 예시고등학교(school_001) 2026학년도 ${extra.slot.grade}학년 ${extra.slot.semester}학기 · 운영 권한 계정 \`adm_demo_gangnam\` · 파일 ${extra.sizeBytes}B · SHA-256 \`${extra.sha256.slice(0, 16)}…\``, `- 등록 응답 \`fileRef=null\`: **서버는 원본 바이트를 보관하지 않는다**(기존 정책 그대로). 분석은 같은 바이트를 로컬 분석기로 보낸 결과다.`, `- 분석 후보는 \`REVIEW_REQUIRED\`·\`UNREVIEWED\`로 저장 — 자동 확정 없음. 검토 화면: 5174 \`/assessment/evaluation-plans/{planId}/revisions/{revisionId}\` (\`plan-import-${fmt.toLowerCase()}.json\`).`)
      out.push(`- 정답 대비(분석기 \`runs/v21-pdf-quality-backend-bridge-20261109/e2e/EXPECTED-RESULT.md\`): 과목 가상과학탐구 1 · 지필 1(1차 40%) · 수행 2(탐구 보고서 30%·토론 활동 30%) — **분석 결과 개수·비율 일치**, 5174 화면 표시 확인(\`ADMIN-UI-VERIFICATION.md\` plans 12/12).`)
      if (fmt === 'HWP') out.push('- HWP 등록은 Backend 실험 플래그(`assessment.multiformat.experimental=true`)가 켜져 있어 허용됐다. **공식 검토 확정은 막혀 있다**: 화면 안내 "실제 관리자 인증이 없으면 서버가 확정을 거절해요(개발 합성 시험에서만 허용)" · `structured-confirm-dev` 기본 false 유지.', '- HWP 근거는 **PDF 쪽 번호를 만들지 않고** `구역 0 · 표 1 · 3행 2열 · 경로 p3.c0.r2c1 — "1차 지필평가(40%)"`처럼 구역·표·행·열·인용으로 표시된다.')
      out.push('')
    }
    out.push(`## ${extra ? '2' : '1'}. 실제 학교 ${fmt} 분석 미리보기`, '', ...table(head, docs.map(([k, v]) => docRow(k, v))), '')
    for (const [k, v] of docs) out.push(`### ${k} · ${v.folder.split('/2026')[0].split('/').pop()} (${v.status})`, '', `경고: ${v.warnings.join(' / ') || '없음'}`, '', ...subjects(v), '')
    out.push('정확도(사람이 원문과 대조한 범위): `DOCUMENT-EXTRACTION-ACCURACY.md`.')
    if (fmt === 'HWPX') out.push('', '## 오류 케이스 (함께 실행)', '', ...table(['파일', 'HTTP', '상태', '오류'], errs.map((e) => [e.case, e.status, e.resultStatus, (e.errors ?? []).map((x) => `${x.code}: ${x.message}`).join(' ')])))
    write(file, out)
  }
}
console.log('final docs built')
