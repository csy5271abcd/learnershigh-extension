// 데이터 기반 결과 문서 생성 (JSON → Markdown). 다시 실행해도 같은 입력이면 같은 문서.
// usage: node build-docs.mjs [--index <scratchpad text15/index.jsonl>]
//   --index: 15개교 평가계획서 추출 목록(파일명 포함, 저장소 밖). 주면 PDF-REFERENCE-INVENTORY.json을 다시 만든다(파일명은 옮기지 않음).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const D = resolve(HERE, '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, value, index, all) => (value.startsWith('--') ? [...acc, [value.slice(2), all[index + 1]]] : acc), []))
const J = (name) => JSON.parse(readFileSync(join(D, name), 'utf8'))
const roster = J('SYNTHETIC-STUDENTS.json')
const catalog = J('SUBJECT-CATALOG.json')
const manifest = J('SEED-MANIFEST.json')
const validation = J('DATA-VALIDATION.json')
const refs = J('ASSESSMENT-REFERENCE-SOURCES.json')
const write = (name, lines) => writeFileSync(join(D, name), lines.join('\n') + '\n', 'utf8')
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|')).join(' | ')} |`)]
const branchName = Object.fromEntries(roster.branches.map((b) => [b.branchId, b.name]))
const nameOf = new Map(catalog.slots.flatMap((s) => s.subjects.map((x) => [x.subjectId, x.name])))
const groupOf = new Map(catalog.slots.flatMap((s) => s.subjects.map((x) => [x.subjectId, x.subjectGroup])))
const SYN = '> 모든 학생·활동은 **합성 시연 데이터**다. 실제 학생·개인정보·학교생활기록부·공식 학교 일정이 아니다.'

// ---------- PDF-REFERENCE-INVENTORY ----------
if (args.index) {
  const rows = readFileSync(args.index, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const inv = rows.map((r) => ({ schoolId: r.schoolId, school: r.school, branch: r.branch, folder: r.rel.split('/').slice(0, -1).join('/'), grade: r.grade, semester: r.semester, format: r.magic, sha256: r.sha256, chars: r.chars, pagesOrSections: r.pages, extractionError: r.error }))
  writeFileSync(join(D, 'PDF-REFERENCE-INVENTORY.json'), JSON.stringify({ note: '파일명은 교사명 포함 가능성 때문에 옮기지 않는다. 폴더 + SHA-256으로 식별한다. pagesOrSections: PDF는 물리 쪽, HWP·HWPX는 구역(섹션) 수.', files: inv }, null, 2) + '\n', 'utf8')
}
const inventory = J('PDF-REFERENCE-INVENTORY.json').files
const schools = roster.schools

{
  const out = ['# 15개교 평가계획서 참고자료 목록', '', '> 조사일 2026-11-12. `references/curriculum-plan/` **읽기 전용**. 파일명은 교사명이 들어 있을 수 있어 옮기지 않고 폴더·SHA-256(앞 12자리)으로 식별한다.', '> 추출: PDF `pdftotext -layout`, HWP 표준 라이브러리 OLE 파서(기존 분석기 `docmodel.hwp5` 읽기 전용 import), HWPX ZIP XML. 추출 텍스트는 저장소 밖(Scratchpad)에만 두었다.', '', '## 1. 학교별 요약', '']
  out.push(...table(['#', '학교', '지점', '유형', '폴더', '파일', 'PDF', 'HWP', 'HWPX', '학년 폴더', '추출 오류'], schools.map((s, i) => {
    const f = inventory.filter((x) => x.schoolId === s.key)
    const c = (fmt) => f.filter((x) => x.format === fmt).length
    return [i + 1, s.name, s.branchId.replace('br_demo_', '').toUpperCase(), s.schoolType === 'GENERAL' ? '일반고' : '자사고', '`' + f[0]?.folder.split('/2026')[0] + '/2026`', f.length, c('PDF'), c('HWP'), c('HWPX'), f.some((x) => x.grade) ? '있음' : '없음(학기·교과별)', f.filter((x) => x.extractionError).length]
  })))
  out.push('', `합계: 파일 ${inventory.length}개, 추출 오류 ${inventory.filter((x) => x.extractionError).length}개.`, '', '## 2. 학교 × 학년·학기 범위 (논리적 90조합 중 확보 범위)', '', '학년 폴더가 없는 학교(대신·가좌·한솔)는 한 파일에 여러 학년이 들어 있어 "학기만 확인"으로 적는다(학년은 본문에서 판정).', '')
  const cell = (s, g, sem) => {
    const f = inventory.filter((x) => x.schoolId === s.key && x.semester === sem)
    if (f.some((x) => x.grade === g)) return 'O'
    return f.length && f.every((x) => !x.grade) ? '학기만' : '-'
  }
  out.push(...table(['학교', '1-1', '1-2', '2-1', '2-2', '3-1', '3-2'], schools.map((s) => [s.name, cell(s, 1, 1), cell(s, 1, 2), cell(s, 2, 1), cell(s, 2, 2), cell(s, 3, 1), cell(s, 3, 2)])))
  out.push('', '## 3. 파일 목록 (폴더 · 형식 · 쪽/구역 · SHA-256 앞 12자리)', '')
  for (const s of schools) {
    out.push(`### ${s.name}`, '')
    out.push(...table(['폴더(학교 2026 아래)', '학년', '학기', '형식', '쪽/구역', '글자 수', 'SHA-256'], inventory.filter((x) => x.schoolId === s.key).map((x) => [x.folder.split('/2026')[1] || '/', x.grade ?? '본문', x.semester, x.format, x.pagesOrSections, x.chars, x.sha256.slice(0, 12)])))
    out.push('')
  }
  write('PDF-REFERENCE-INVENTORY.md', out)
}

// ---------- SCHOOL-INVENTORY ----------
{
  const out = ['# 학교 목록 (15개교 시연 대상)', '', '> 15개교는 60개교 평가계획서 조사 코퍼스(`assessment-technical-research-20261112/SCHOOL-INVENTORY.md`) 중 시연용으로 고른 일부다. 60개교 전체 데이터와 혼동하지 않는다.', '> **학교 = 학생 소속 정보**, **지점 = 학원 관리 권한 단위**다. 시연에서는 지점마다 5개교 학생을 배정했을 뿐 학교와 지점은 같은 개념이 아니다.', '> 지역은 폴더 묶음 이름(예: `jeonbug·jeonnam·gyeongbug·gyeongnam·jeju`)만 있어 시·도를 확정하지 않았다.', '']
  out.push(...table(['#', '학교', '시연 학교 ID', '유형', '원본 폴더', '시연 지점', '합성 학생'], schools.map((s, i) => {
    const f = inventory.find((x) => x.schoolId === s.key)
    return [i + 1, s.name, '`' + s.schoolId + '`', s.schoolType === 'GENERAL' ? '일반고' : '자사고', '`' + f.folder.split('/2026')[0] + '`', branchName[s.branchId], roster.students.filter((x) => x.school.schoolId === s.schoolId).length]
  })))
  out.push('', '- 시연 학교 ID(`sch_demo_*`)는 개발용 명단 안에서만 쓰는 ID다. 기존 Mock 학교(`school_001` 예시고등학교)는 바꾸지 않았다.', '- 평가계획서 공식 데이터 등록(Plan 운영)은 이번 범위가 아니다. 시연 학교에는 평가계획서 운영 권한·슬롯이 없다(`findSlot`은 기존 `school_001`만).')
  write('SCHOOL-INVENTORY.md', out)
}

// ---------- STUDENT-DISTRIBUTION / SYNTHETIC-STUDENTS / ENROLLMENT ----------
{
  const out = ['# 학생 분포', '', SYN, '', '## 1. 지점 × 학년', '']
  out.push(...table(['지점', 'ID', '1학년', '2학년', '3학년', '합계', '관리자'], roster.branches.map((b) => {
    const st = roster.students.filter((s) => s.branchId === b.branchId)
    return [b.name, '`' + b.branchId + '`', ...[1, 2, 3].map((g) => st.filter((s) => s.grade === g).length), st.length, roster.admins.filter((a) => a.branchIds.includes(b.branchId)).map((a) => '`' + a.adminId + '`').join(', ')]
  })))
  const tot = [1, 2, 3].map((g) => roster.students.filter((s) => s.grade === g).length)
  out.push(`| **합계** | | ${tot.join(' | ')} | ${roster.students.length} | |`, '', '## 2. 학교 × 학년', '')
  out.push(...table(['학교', '지점', '1학년', '2학년', '3학년', '합계'], schools.map((sc) => {
    const st = roster.students.filter((s) => s.school.schoolId === sc.schoolId)
    return [sc.name, sc.branchId.replace('br_demo_', '').toUpperCase(), ...[1, 2, 3].map((g) => st.filter((s) => s.grade === g).length), st.length]
  })))
  out.push('', '배정 규칙: 학교마다 1·2·3학년 1명 + 추가 1명. 추가 학생 학년은 학교 순서대로 1→2→3 순환(각 학년 5명) → 학년별 20명.', '', '## 3. 수강 패턴(프로필) 분포', '')
  const prof = {}
  for (const s of roster.students) prof[`${s.grade}|${s._doc.profile}`] = (prof[`${s.grade}|${s._doc.profile}`] ?? 0) + 1
  out.push(...table(['학년', '패턴', '학생 수'], Object.entries(prof).sort().map(([k, v]) => [...k.split('|'), v])))
  out.push('', `서로 다른 (1학기, 2학기) 수강 과목 조합: ${new Set(roster.students.map((s) => JSON.stringify(s.subjectIds))).size}개 / 60명. 같은 학교·학년 안에서 같은 패턴을 받은 학생은 없다.`)
  write('STUDENT-DISTRIBUTION.md', out)

  const o2 = ['# 합성 학생 60명', '', SYN, '> 표시 이름은 `시연학생001`~`060`. 주민등록번호·전화번호·주소·이메일은 만들지 않았다. 학원 반(`academyClassName`)과 학교 반·번호는 다른 값이다.', '> 원천: `SYNTHETIC-STUDENTS.json`(생성 Key 포함), Backend 명단 `backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json`.', '']
  o2.push(...table(['ID', '이름', '지점', '학교', '유형', '학년', '학교 반·번호', '학원 반', '패턴', '1학기 과목', '2학기 과목', '생성 Key'], roster.students.map((s) => [s.studentId, s.displayName, s.branchId.replace('br_demo_', '').toUpperCase(), s.school.name, s._doc.schoolType === 'GENERAL' ? '일반' : '자사', s.grade, `${s.schoolClassNumber}반 ${s.schoolStudentNumber}번`, s.academyClassName, s._doc.profile, s.subjectIds[1].length, s.subjectIds[2].length, '`' + s._doc.seedKey + '`'])))
  write('SYNTHETIC-STUDENTS.md', o2)

  const o3 = ['# 학생별 학기 수강 과목', '', SYN, '> 과목 ID는 `SUBJECT-CATALOG.json`의 학년·학기 슬롯 ID다. 모든 과목은 해당 학년·학기 카탈로그에 있음을 Backend가 시작 시 검사한다(없으면 시작 중단).', '']
  o3.push(...table(['학생', '학교', '학년', '1학기 수강 과목', '2학기 수강 과목'], roster.students.map((s) => [s.studentId, s.school.name, s.grade, s.subjectIds[1].map((id) => nameOf.get(id)).join(', '), s.subjectIds[2].map((id) => nameOf.get(id)).join(', ')])))
  const counts = roster.students.flatMap((s) => [s.subjectIds[1].length, s.subjectIds[2].length])
  o3.push('', `학생·학기별 수강 과목 수: 최소 ${Math.min(...counts)} · 최대 ${Math.max(...counts)} · 평균 ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2)} (120개 학생·학기 Context).`, '', '## 과목별 수강 학생 수', '')
  const by = {}
  for (const s of roster.students) for (const sem of [1, 2]) for (const id of s.subjectIds[sem]) by[`${s.grade}-${sem}|${nameOf.get(id)}`] = (by[`${s.grade}-${sem}|${nameOf.get(id)}`] ?? 0) + 1
  o3.push(...table(['학년-학기', '과목', '수강 학생'], Object.entries(by).sort().map(([k, v]) => [...k.split('|'), v])))
  write('SUBJECT-ENROLLMENT-MATRIX.md', o3)
}

// ---------- CATALOG ----------
{
  const out = ['# 학년·학기별 공통 과목 카탈로그 (2026학년도)', '', '> **학교별 카탈로그가 아니다.** 15개교 평가계획서에서 확인한 과목을 학년·학기별로 모은 참고 후보이며, 공식 개설 과목·필수 과목 목록이 아니다. 2·3학년 선택과목은 학교·학생마다 다르다.', '> 교육과정: 2026학년도 1·2학년 = **2022 개정**, 3학년 = **2015 개정**. 과목명을 하나로 통일하지 않았다(예: 2학년 `사회와 문화` / 3학년 `사회·문화`).', '> 기준(basis): `PDF_OBSERVED_2PLUS` = 2개교 이상 해당 학년·학기 문서에서 3회 이상 출현 / `PDF_OBSERVED_1_PLUS_CURRICULUM` = 1개교 출현 + 교육과정 일반선택 / `CURRICULUM_STANDARD` = 교육과정 기준 보완.', '> 기존 Mock ID `subj_01~04`(1학년 2학기)·`subj_11~14`(1학년 1학기)는 그대로 재사용했다(기존 데이터 보존). 원천: `SUBJECT-CATALOG.json` → Backend `subject-catalog-2026.json`.', '']
  for (const slot of catalog.slots) {
    out.push(`## ${slot.grade}학년 ${slot.semester}학기 (${slot.curriculumVersion} 개정, ${slot.subjects.length}과목)`, '')
    out.push(...table(['ID', '과목', '교과군', '기준', '확인 학교(출현 수)'], slot.subjects.map((s) => ['`' + s.subjectId + '`', s.name, s.subjectGroup, s.basis, s.observedIn.map((o) => `${o.school}(${o.mentions})`).join(', ')])))
    out.push('')
  }
  out.push('## 집계 방법과 한계', '', '- 과목 사전(2022·2015 개정 과목명, 로마숫자·숫자 표기 정규화)으로 문서 텍스트를 매칭하고, 짧은 일반어(정보·경제·문학 등)는 과목 머리 문맥(과목명·학년·학기 근처)에서만 셌다.', '- 학년 폴더가 없는 문서는 매칭 위치 앞의 가장 가까운 `N학년` 표기로 학년을 정했다. 오판 가능성이 있다.', '- 출현 수는 "문서에 과목명이 등장"한 횟수이며 그 학교가 해당 학기에 과목을 개설했다는 공식 확인이 아니다(사람 검토 전).')
  write('GRADE-SEMESTER-SUBJECT-CATALOG.md', out)
}

// ---------- REFERENCE SOURCES ----------
{
  const out = ['# 수행평가 유형 참고 근거', '', '> 합성 수행평가의 **유형**(예: 실험 설계·보고서, 영어 에세이)을 15개교 평가계획서에서 키워드로 찾은 근거다. 학생에게 배정한 날짜·상태·주제·내용은 **합성**이며 원본 학교의 공식 평가 일정이 아니다.', '> 쪽은 추출 텍스트의 페이지(PDF 물리 쪽 / HWP·HWPX 구역 순번)다. 인쇄 쪽이 아니다. 키워드 출현 근거이며 그 쪽이 해당 유형의 공식 평가 항목이라는 사람 검토는 하지 않았다.', '']
  out.push(...table(['유형 Key', '교과군', '키워드', '확인 학교 수', '대표 근거(학교 학년-학기 쪽 · 형식 · SHA-256 · 매칭 주변)'], Object.entries(refs.templates).map(([k, v]) => [k, v.subjectGroup, v.keywords.join('/'), v.schoolsMatched, v.evidence.slice(0, 2).map((e) => `${e.school} ${e.grade ?? '?'}-${e.semester} p.${e.page} · ${e.format} · ${e.sha256Prefix} · «${e.snippet}»`).join('<br>')])))
  out.push('', '## Seed 수행평가 ↔ 유형 사용 수', '')
  const use = {}
  for (const r of Object.values(manifest.students)) for (const a of Object.values(r.assessments)) use[a.templateKey] = (use[a.templateKey] ?? 0) + 1
  out.push(...table(['유형 Key', '수행평가 수'], Object.entries(use).sort((a, b) => b[1] - a[1])))
  write('ASSESSMENT-REFERENCE-SOURCES.md', out)
}

// ---------- SEED-MANIFEST.md / ACTIVITY ----------
{
  const out = ['# Seed Manifest (실제 생성 ID)', '', SYN, '> 원천: `SEED-MANIFEST.json`. 비밀번호·토큰 없음. Prefix: 학생 `DEMO-STUDENT-2026`(명단 Key) / 수행평가 제목 `[DEMO-15S-2026]` / 설명 끝 `[seed:<Key>]`.', '']
  out.push(...table(['학생', '학교', '학년', '수행평가(1·2학기)', '노트 ID', 'Revision', '결과물(버전)', '피드백 ID · 상태', '성장 기록 ID', '중요 표시'], roster.students.map((s) => {
    const r = manifest.students[s.studentId]
    const as = Object.values(r.assessments)
    return [s.studentId, s.school.name, s.grade, `${as.filter((a) => a.semester === 1).length}·${as.filter((a) => a.semester === 2).length}`, '`' + r.note.noteId + '`', `v${r.note.revisions.length}`, (r.artifacts ?? []).map((a) => `${a.title.replace('[DEMO-15S-2026] ', '')}(${a.versions.length})`).join(', ') || '-', r.feedback ? `\`${r.feedback.requestId}\` · ${r.feedback.status}${r.feedback.plannedState === 'DRAFT' ? '(초안)' : ''}` : '-', '`' + r.growth.recordId + '`', r.favoriteAssessmentId ? 'O' : '']
  })))
  out.push('', '## 실행 이력', '')
  out.push(...table(['시작', '대상', '결과', '생성', '재사용', '검사'], manifest.runs.map((r) => [r.startedAt, r.only ? r.only.join(',') : '전체', r.result, JSON.stringify(r.created), JSON.stringify(r.reused), r.checkSummary ? `${r.checkSummary.total - r.checkSummary.failed}/${r.checkSummary.total}` : '-'])))
  write('SEED-MANIFEST.md', out)

  const c = validation.summary.counts
  const all = Object.values(manifest.students).flatMap((r) => Object.values(r.assessments))
  const tally = (f) => all.reduce((acc, a) => ({ ...acc, [f(a)]: (acc[f(a)] ?? 0) + 1 }), {})
  const o = ['# 활동 분포', '', SYN, '> 수치는 `verify-seed.mjs`가 **Admin API로 다시 조회한 값**이다(Manifest 계산값 아님).', '']
  o.push(...table(['항목', '수'], [['합성 학생', c.students], ['학생·학기 Context', c.students * 2], ['수행평가(Seed)', c.assessments], ['· 1학기 / 2학기', `${c.bySemester[1]} / ${c.bySemester[2]}`], ['· 완료 / 진행 중 / 시작 전', `${c.byStatus.COMPLETED} / ${c.byStatus.IN_PROGRESS} / ${c.byStatus.BEFORE_START}`], ['탐구 노트', c.notes], ['노트 Revision v2 보유 학생', c.noteRevisionV2], ['결과물 보유 학생', c.artifactStudents], ['결과물 버전(ArtifactVersion)', c.artifactVersions], ['피드백 요청', c.feedback], ['· 전달 완료', c.delivered], ['· 미전달(관리자 초안 저장)', c.draftSaved], ['· 미전달(요청만)', c.pending - c.draftSaved], ['성장 기록', c.growth], ['중요 표시(수행평가)', c.favorites], ['화면 검증 중 모달로 등록(Seed 외)', c.uiCreated ?? 0]]))
  o.push('', '## 교과군별 수행평가', '', ...table(['교과군', '수'], Object.entries(tally((a) => groupOf.get(a.subjectId))).sort((a, b) => b[1] - a[1])))
  o.push('', '## 유형별 수행평가', '', ...table(['유형 Key', '수'], Object.entries(tally((a) => a.templateKey)).sort((a, b) => b[1] - a[1])))
  o.push('', '## 마감 월(합성 일정)', '', ...table(['월', '수'], Object.entries(tally((a) => a.deadlineDate.slice(0, 7))).sort()))
  const fb = Object.values(manifest.students).filter((r) => r.feedback)
  o.push('', '## 지점별 피드백', '', ...table(['지점', '요청', '전달', '미전달', '처리 관리자'], roster.branches.map((b) => {
    const list = fb.filter((r) => r.branchId === b.branchId)
    return [b.name, list.length, list.filter((r) => r.feedback.status === 'DELIVERED').length, list.filter((r) => r.feedback.status !== 'DELIVERED').length, [...new Set(list.map((r) => r.feedback.admin))].join(', ')]
  })))
  o.push('', '날짜 규칙: 1학기 4~7월, 2학기 9~12월 범위의 합성 날짜. 상태는 기준일 2026-11-12에 맞춰 1학기 대부분 완료, 2학기는 마감에 따라 완료·진행 중·시작 전을 섞었다.')
  write('ACTIVITY-DISTRIBUTION.md', o)
}

// ---------- DATA-VALIDATION ----------
{
  const s = validation.summary
  const sections = {}
  for (const r of validation.results) {
    sections[r.section] ??= [0, 0]
    sections[r.section][0]++
    if (r.pass) sections[r.section][1]++
  }
  const out = ['# 데이터 정합성 검증', '', `> \`scripts/verify-seed.mjs\` 실행 ${s.verifiedAt} · API \`${s.api}\` · **${s.passed}/${s.total} PASS**. 원자료: \`DATA-VALIDATION.json\`.`, '> 데이터를 만들지 않는다. 거절을 기대하는 쓰기 2종(다른 지점 피드백 초안 저장, 미수강 과목 등록)만 시도했고 모두 거절됐다.', '']
  out.push(...table(['영역', '통과/전체'], Object.entries(sections).map(([k, [t, p]]) => [k, `${p}/${t}`])))
  out.push('', '## 확인 내용', '', '- **관리자 범위**: 관리자 4명 × 2학기 목록 = 담당 지점 20명과 정확히 일치. A01·A02 목록·활동 집계 동일. `adm_demo_all` 같은 전 지점 계정은 401. 기존 `adm_demo_gangnam`·`adm_gangnam`·`adm_bundang` 목록에 시연 학생 없음.', '- **지점 간 차단**: 관리자마다 다른 지점 학생 2명 + 기존 강남 학생(stu_001)에 대해 학생 상세·학기 수행평가·수행평가 단건·성장 기록·학생 화면 보기(학업 Context·노트)·피드백 상세를 조회 → 모두 404. 다른 지점 피드백 초안 저장 → 404(저장 안 됨). 피드백 목록은 담당 지점 학생만.', '- **학생 간 차단**: 학생이 다른 학생 수행평가 ID로 조회 → 404.', '- **카탈로그**: 학년별로 서로 다른 학교·지점 학생 2명의 `catalogSubjects`가 같은 학년·학기에서 완전히 같다(학교별 필터 없음). `enrolled=true` = 학생 수강 과목. 미수강 후보로 등록 → 400 `subjectId`.', '- **정합성**: 60명 관리자 상세의 학교·학년·반·번호 = 명단. 모든 수행평가 과목 = 그 학기 수강 과목, 학기당 2~4건. 결과물 버전 수 = Manifest. 피드백 Snapshot = 요청 당시 노트 최신 Revision. 미전달 요청의 관리자 초안은 학생 응답에 없음(`reply=null`). 성장 기록 = 노트의 수행평가에 연결.', '- **기존 데이터 보존**: 이전 시연 Seed(`stu_001`)의 수행평가 4건·피드백·성장 기록 존재, `stu_001` 수강 과목 `subj_01~04` 그대로.', '', '## 수량', '')
  out.push(...table(['항목', '값'], [['학교별 학생', Object.entries(s.perSchool).map(([k, v]) => `${k} ${v}`).join(', ')], ['학년별 학생', Object.entries(s.perGrade).map(([k, v]) => `${k}학년 ${v}`).join(', ')], ['학생·학기 수강 과목 수', `최소 ${s.subjectsPerStudentTerm.min} · 최대 ${s.subjectsPerStudentTerm.max} · 평균 ${s.subjectsPerStudentTerm.avg}`], ['지점 간 접근 시도', `${s.crossBranchCases.length}건 (모두 404)`]]))
  out.push('', '## 지점 간 접근 시도 상세', '')
  out.push(...table(['관리자', '대상 학생', '경로', 'HTTP'], s.crossBranchCases.map((x) => [x.adminId, x.target, '`' + x.path + '`', x.status])))
  write('DATA-VALIDATION.md', out)
}

// ---------- UI VERIFICATION + SCREENSHOTS ----------
for (const [mode, file, title] of [['student', 'STUDENT-UI-VERIFICATION.md', 'Student 화면 검증'], ['admin', 'ADMIN-UI-VERIFICATION.md', 'Admin 화면 검증']]) {
  const dir = join(D, 'screenshots', mode)
  const reports = existsSync(dir) ? readdirSync(dir).filter((f) => f.startsWith(`ui-${mode}-`) && f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : []
  const out = [`# ${title}`, '', '> `scripts/ui-verify-e2e.mjs` · 실제 Chrome(Playwright) 1920×1080 · Backend 8080(실제 MySQL). 검증용 개발 서버를 계정 Context마다 **별도 포트**로 하나씩 띄워 검증하고 바로 종료했다(사용자 5173/5174는 그대로).', '> 개발용 인증 Context = Vite 실행 시 `VITE_ASSESSMENT_DEV_' + (mode === 'admin' ? 'ADMIN' : 'STUDENT') + '_ID`. 스크립트는 Header를 직접 붙이거나 바꾸지 않는다. **실제 로그인·로그아웃이 아니다**(API-OD-A01).', '']
  out.push(...table(['계정', '서버', '결과', '페이지 오류', 'API 4xx/5xx', '쓰기 요청', '실행'], reports.map((r) => [r.actorId, r.base, `${r.results.filter((x) => x.pass).length}/${r.results.length}`, r.pageErrors.length, r.apiFailures.map((f) => `${f.status} ${f.path}`).join('<br>') || 0, r.writes.length, r.at])))
  for (const r of reports) {
    out.push('', `## ${r.actorId}`, '')
    out.push(...table(['영역', '확인', '결과', '세부'], r.results.map((x) => [x.area, x.name, x.pass ? 'PASS' : 'FAIL', x.detail !== undefined ? JSON.stringify(x.detail).slice(0, 120) : ''])))
  }
  if (mode === 'admin') out.push('', 'API 4xx 2건은 모두 **다른 지점 학생 URL을 직접 입력**했을 때 의도한 404다(데이터 미노출).')
  if (mode === 'student') out.push('', '`stu_demo_001`의 쓰기 1건은 첫 실행에서 모달로 수행평가 `[DEMO-15S-2026][UI] 모달 등록 확인 stu_demo_001`을 등록한 것이다. 이후 실행은 이미 있어 다시 만들지 않았다(쓰기 0).')
  write(file, out)
}
{
  const out = ['# 화면 캡처', '', '> 1920×1080 실제 Chrome. 모든 학생·활동은 합성 시연 데이터.', '']
  for (const mode of ['admin', 'student']) {
    const dir = join(D, 'screenshots', mode)
    if (!existsSync(dir)) continue
    out.push(`## ${mode === 'admin' ? 'Admin' : 'Student'}`, '')
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) out.push(`- [\`${f}\`](screenshots/${mode}/${f})`)
    out.push('')
  }
  write('SCREENSHOTS.md', out)
}
console.log('docs built')
