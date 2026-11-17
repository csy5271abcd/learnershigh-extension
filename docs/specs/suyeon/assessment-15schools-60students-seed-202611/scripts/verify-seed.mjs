// 15개교·60명 Seed 검증 (실제 Backend API 재조회). 데이터를 만들지 않는다.
// 거절이 기대되는 쓰기 시도만 한다(다른 지점 관리자의 초안 저장, 미수강 과목 등록) — 서버가 거절하면 아무것도 생기지 않는다.
// usage: node verify-seed.mjs [--api http://localhost:18080]
// 출력: ../DATA-VALIDATION.json (검사 결과·집계), 표준 출력 요약. 실패가 있으면 종료 코드 2.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, value, index, all) => (value.startsWith('--') ? [...acc, [value.slice(2), all[index + 1]]] : acc), []))
const API = String(args.api ?? 'http://localhost:18080').replace(/\/+$/, '')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) throw new Error('localhost Backend만 허용해요.')
const roster = JSON.parse(readFileSync(join(DOC_DIR, 'SYNTHETIC-STUDENTS.json'), 'utf8'))
const catalog = JSON.parse(readFileSync(join(DOC_DIR, 'SUBJECT-CATALOG.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(join(DOC_DIR, 'SEED-MANIFEST.json'), 'utf8'))
const legacy = JSON.parse(readFileSync(resolve(DOC_DIR, '../assessment-seed-and-ui-verification-202611/seed-manifest.json'), 'utf8'))
const YEAR = 2026
const results = []
const check = (section, name, ok, detail) => {
  results.push({ section, name, pass: Boolean(ok), detail })
  if (!ok) console.log(`FAIL [${section}] ${name} ${detail !== undefined ? JSON.stringify(detail).slice(0, 300) : ''}`)
}
async function call(method, path, headers, body) {
  const init = { method, headers: { ...headers } }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const response = await fetch(API + path, init)
  const type = response.headers.get('content-type') ?? ''
  const data = type.includes('json') ? await response.json().catch(() => null) : null
  return { status: response.status, data }
}
const ST = (id) => ({ 'X-Assessment-Student-Id': id })
const AD = (id) => ({ 'X-Assessment-Admin-Id': id })
const ADMINS = { adm_demo_a01: 'br_demo_a', adm_demo_a02: 'br_demo_a', adm_demo_b01: 'br_demo_b', adm_demo_c01: 'br_demo_c' }
const byBranch = (b) => roster.students.filter((s) => s.branchId === b)

// ---- A. 관리자 4명 × 담당 학생 ----
const adminViews = {}
for (const [adminId, branchId] of Object.entries(ADMINS)) {
  for (const semester of [1, 2]) {
    const r = await call('GET', `/api/admin/assessment/students?academicYear=${YEAR}&semester=${semester}`, AD(adminId))
    const ids = (r.data?.items ?? []).map((i) => i.student.studentId).sort()
    const expected = byBranch(branchId).map((s) => s.studentId).sort()
    check('관리자 범위', `${adminId} ${semester}학기 목록 = ${branchId} 학생 20명`, r.status === 200 && JSON.stringify(ids) === JSON.stringify(expected), { status: r.status, count: ids.length })
    if (semester === 2) adminViews[adminId] = r.data.items
  }
}
check('관리자 범위', 'A01·A02 같은 학생·같은 활동 집계', JSON.stringify(adminViews.adm_demo_a01) === JSON.stringify(adminViews.adm_demo_a02))
for (const legacyAdmin of ['adm_demo_gangnam', 'adm_gangnam', 'adm_bundang']) {
  const r = await call('GET', `/api/admin/assessment/students?academicYear=${YEAR}&semester=2`, AD(legacyAdmin))
  check('기존 관리자 보존', `${legacyAdmin} 목록에 시연 학생 없음`, r.status === 200 && !(r.data.items ?? []).some((i) => i.student.studentId.startsWith('stu_demo_')), { count: r.data?.items?.length })
}
check('관리자 범위', '전 지점 계정 없음(adm_demo_all → 401)', (await call('GET', `/api/admin/assessment/students?academicYear=${YEAR}&semester=2`, AD('adm_demo_all'))).status === 401)

// ---- B. 지점 간 접근 차단 (읽기 + 거절 기대 쓰기) ----
const crossCases = []
for (const [adminId, branchId] of Object.entries(ADMINS)) {
  const others = roster.students.filter((s) => s.branchId !== branchId)
  const targets = [others.find((s) => s.branchId !== branchId && manifest.students[s.studentId]?.feedback), others.find((s) => s.grade === 3)].filter(Boolean)
  targets.push({ studentId: 'stu_001' }) // 기존 강남 지점 학생
  for (const target of targets) {
    const rec = manifest.students[target.studentId]
    const assessmentId = rec ? Object.values(rec.assessments)[0].assessmentId : legacy.ids.assessmentA
    const paths = [
      `/api/admin/assessment/students/${target.studentId}?academicYear=${YEAR}`,
      `/api/admin/assessment/students/${target.studentId}/school-assessments?academicYear=${YEAR}&semester=1`,
      `/api/admin/assessment/students/${target.studentId}/school-assessments/${assessmentId}`,
      `/api/admin/assessment/students/${target.studentId}/growth-records`,
      `/api/admin/assessment/students/${target.studentId}/student-view/academic-context?academicYear=${YEAR}&semester=1`,
      `/api/admin/assessment/students/${target.studentId}/student-view/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${rec?.note?.assessmentId ?? assessmentId}`,
    ]
    if (rec?.feedback) paths.push(`/api/admin/assessment/feedback-requests/${rec.feedback.requestId}`)
    for (const path of paths) {
      const r = await call('GET', path, AD(adminId))
      crossCases.push({ adminId, target: target.studentId, path: path.replace(/\?.*/, ''), status: r.status })
      check('지점 간 차단', `${adminId} → ${target.studentId} ${path.split('/').slice(4, 7).join('/')}`, r.status === 404 || r.status === 403, r.status)
    }
    if (rec?.feedback) {
      const write = await call('PUT', `/api/admin/assessment/feedback-requests/${rec.feedback.requestId}/reply-draft`, AD(adminId), { overallComment: '권한 검사용 (저장되면 안 됨)', comments: [], recommendations: [] })
      crossCases.push({ adminId, target: target.studentId, path: 'PUT reply-draft', status: write.status })
      check('지점 간 차단', `${adminId} → ${target.studentId} 다른 지점 피드백 초안 저장 거절`, write.status === 404 || write.status === 403, write.status)
    }
  }
  const feedbackList = await call('GET', '/api/admin/assessment/feedback-requests?size=100', AD(adminId))
  const listed = (feedbackList.data?.items ?? []).map((i) => i.student?.studentId)
  check('지점 간 차단', `${adminId} 피드백 목록 = 담당 지점 학생만`, feedbackList.status === 200 && listed.length > 0 && listed.every((id) => byBranch(branchId).some((s) => s.studentId === id)), { count: listed.length })
}
// 학생 간 차단
const s1 = roster.students[0].studentId
const s2 = roster.students[25].studentId
const otherAssessment = Object.values(manifest.students[s2].assessments)[0].assessmentId
check('학생 간 차단', `${s1}가 ${s2}의 수행평가 조회 거절`, [403, 404].includes((await call('GET', `/api/student/assessment/school-assessments/${otherAssessment}`, ST(s1))).status))

// ---- C. 학년·학기 카탈로그 (학교별 차이 없음) ----
for (const grade of [1, 2, 3]) {
  const sameGrade = roster.students.filter((s) => s.grade === grade)
  const pick = [sameGrade[0], sameGrade.find((s) => s.school.schoolId !== sameGrade[0].school.schoolId && s.branchId !== sameGrade[0].branchId)]
  for (const semester of [1, 2]) {
    const slot = catalog.slots.find((s) => s.grade === grade && s.semester === semester)
    const lists = []
    for (const student of pick) {
      const ctx = (await call('GET', `/api/student/assessment/academic-context?academicYear=${YEAR}&semester=${semester}`, ST(student.studentId))).data
      lists.push(ctx.catalogSubjects.map((c) => c.subjectId))
      check('카탈로그', `${grade}학년 ${semester}학기 ${student.school.name} 후보 = 카탈로그 ${slot.subjects.length}개`, JSON.stringify(ctx.catalogSubjects.map((c) => c.name)) === JSON.stringify(slot.subjects.map((s) => s.name)))
      check('카탈로그', `${grade}학년 ${semester}학기 ${student.school.name} enrolled = 수강 과목`, JSON.stringify(ctx.catalogSubjects.filter((c) => c.enrolled).map((c) => c.subjectId).sort()) === JSON.stringify([...student.subjectIds[semester]].sort()))
    }
    check('카탈로그', `${grade}학년 ${semester}학기 서로 다른 학교·지점 학생의 후보 동일(학교별 필터 없음)`, JSON.stringify(lists[0]) === JSON.stringify(lists[1]))
  }
}
// 미수강 후보로 등록 → 기존 서버 검증으로 거절
{
  const student = roster.students.find((s) => s.grade === 2)
  const ctx = (await call('GET', `/api/student/assessment/academic-context?academicYear=${YEAR}&semester=1`, ST(student.studentId))).data
  const notEnrolled = ctx.catalogSubjects.find((c) => !c.enrolled)
  const r = await call('POST', '/api/student/assessment/school-assessments', ST(student.studentId), { title: '[VERIFY] 미수강 과목 등록 거절 확인', subjectId: notEnrolled.subjectId, academicYear: YEAR, semester: 1, deadlineDate: null, description: null, status: 'BEFORE_START', evaluationItemRef: null })
  check('카탈로그', `미수강 후보(${notEnrolled.name}) 등록 거절 400 subjectId`, r.status === 400 && JSON.stringify(r.data).includes('subjectId'), r.status)
}

// ---- D. 데이터 정합성·집계 (Admin API 재조회) ----
const counts = { students: 0, assessments: 0, bySemester: { 1: 0, 2: 0 }, byStatus: {}, notes: 0, noteRevisionV2: 0, artifactStudents: 0, artifactVersions: 0, feedback: 0, delivered: 0, pending: 0, draftSaved: 0, growth: 0, favorites: 0 }
const perSchool = {}
const perGrade = {}
const subjectCountsPerTerm = []
for (const student of roster.students) {
  const rec = manifest.students[student.studentId]
  const admin = Object.keys(ADMINS).find((a) => ADMINS[a] === student.branchId)
  counts.students++
  perSchool[student.school.name] = (perSchool[student.school.name] ?? 0) + 1
  perGrade[student.grade] = (perGrade[student.grade] ?? 0) + 1
  const detail = (await call('GET', `/api/admin/assessment/students/${student.studentId}?academicYear=${YEAR}`, AD(admin))).data
  check('정합성', `${student.studentId} 관리자 상세 학교·학년·반·번호`, detail.academicContexts.length === 2 && detail.academicContexts.every((c) => c.school.schoolId === student.school.schoolId && c.grade === student.grade && c.schoolClassNumber === student.schoolClassNumber && c.schoolStudentNumber === student.schoolStudentNumber))
  for (const semester of [1, 2]) {
    subjectCountsPerTerm.push(student.subjectIds[semester].length)
    const list = (await call('GET', `/api/admin/assessment/students/${student.studentId}/school-assessments?academicYear=${YEAR}&semester=${semester}&size=100`, AD(admin))).data
    // Seed 건 = '[DEMO-15S-2026] ' 접두사. 화면 검증에서 모달로 만든 '[DEMO-15S-2026][UI]' 건은 따로 센다.
    const seeded = (list.items ?? []).filter((i) => i.title.startsWith('[DEMO-15S-2026] '))
    counts.uiCreated = (counts.uiCreated ?? 0) + (list.items ?? []).filter((i) => i.title.startsWith('[DEMO-15S-2026][UI]')).length
    counts.assessments += seeded.length
    counts.bySemester[semester] += seeded.length
    for (const item of seeded) {
      counts.byStatus[item.status] = (counts.byStatus[item.status] ?? 0) + 1
      check('정합성', `${student.studentId} ${item.assessmentId} 과목 = 해당 학기 수강 과목`, student.subjectIds[semester].includes(item.subjectId))
    }
    check('정합성', `${student.studentId} ${semester}학기 수행평가 2~4건`, seeded.length >= 2 && seeded.length <= 4, seeded.length)
  }
  const notes = (await call('GET', `/api/admin/assessment/students/${student.studentId}/student-view/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${rec.note.assessmentId}`, AD(admin))).data
  counts.notes += (notes.items ?? []).length
  const revs = (await call('GET', `/api/admin/assessment/students/${student.studentId}/student-view/notes/${rec.note.noteId}/revisions`, AD(admin))).data
  if ((revs.items ?? []).length >= 2) counts.noteRevisionV2++
  if (rec.artifacts?.length) {
    counts.artifactStudents++
    for (const artifact of rec.artifacts) {
      const versions = (await call('GET', `/api/admin/assessment/students/${student.studentId}/student-view/artifacts/${artifact.artifactId}/versions`, AD(admin))).data
      counts.artifactVersions += (versions.items ?? []).length
      // Seed 버전은 그대로 남아 있어야 한다(덮어쓰기 없음). 이후 추가된 버전(시연 결과물 한글 정식본 등)은 따로 센다.
      const ids = new Set((versions.items ?? []).map((v) => v.versionId))
      check('정합성', `${student.studentId} Seed 결과물 버전 보존`, artifact.versions.every((v) => ids.has(v.versionId)))
      counts.addedVersions = (counts.addedVersions ?? 0) + Math.max(0, (versions.items ?? []).length - artifact.versions.length)
    }
  }
  if (rec.feedback) {
    const fb = (await call('GET', `/api/admin/assessment/feedback-requests/${rec.feedback.requestId}`, AD(admin))).data
    counts.feedback++
    if (fb.status === 'DELIVERED') counts.delivered++
    else counts.pending++
    if (fb.status !== 'DELIVERED' && fb.draftSaved) counts.draftSaved++
    check('정합성', `${student.studentId} 피드백 Snapshot = 노트 최신 Revision`, fb.snapshotRevision?.revisionId === rec.note.revisions.at(-1).revisionId && fb.student?.studentId === student.studentId)
    const studentReply = (await call('GET', `/api/student/assessment/feedback-requests/${rec.feedback.requestId}/reply`, ST(student.studentId))).data
    if (fb.status !== 'DELIVERED') check('정합성', `${student.studentId} 미전달 초안 학생 비노출`, studentReply.reply === null)
  }
  const growth = (await call('GET', `/api/admin/assessment/students/${student.studentId}/growth-records`, AD(admin))).data
  const g = (growth.items ?? []).filter((i) => i.title.startsWith('[DEMO-15S-2026]'))
  counts.growth += g.length
  check('정합성', `${student.studentId} 성장 기록 ↔ 노트의 수행평가`, g.length === 1 && g[0].recordId === rec.growth.recordId)
  if (rec.favoriteAssessmentId) counts.favorites++
}

// ---- E. 기존 데이터 보존 (이전 시연 Seed: stu_001 / adm_demo_gangnam) ----
for (const key of ['assessmentA', 'assessmentB', 'assessmentC', 'assessmentD']) {
  const r = await call('GET', `/api/student/assessment/school-assessments/${legacy.ids[key]}`, ST('stu_001'))
  check('기존 데이터 보존', `stu_001 ${key} 존재`, r.status === 200)
}
check('기존 데이터 보존', 'stu_001 피드백 요청 존재', (await call('GET', `/api/student/assessment/feedback-requests/${legacy.ids.feedbackRequestId}`, ST('stu_001'))).status === 200)
check('기존 데이터 보존', 'stu_001 성장 기록 존재', (await call('GET', `/api/student/assessment/growth-records/${legacy.ids.growthRecordId}`, ST('stu_001'))).status === 200)
const legacyCtx = (await call('GET', `/api/student/assessment/academic-context?academicYear=${YEAR}&semester=2`, ST('stu_001'))).data
check('기존 데이터 보존', 'stu_001 수강 과목 subj_01~04 그대로', JSON.stringify(legacyCtx.subjects.map((s) => s.subjectId)) === '["subj_01","subj_02","subj_03","subj_04"]')

const failed = results.filter((r) => !r.pass)
const summary = {
  verifiedAt: new Date().toISOString(), api: API, total: results.length, passed: results.length - failed.length, failed: failed.length,
  counts, perSchool, perGrade,
  subjectsPerStudentTerm: { min: Math.min(...subjectCountsPerTerm), max: Math.max(...subjectCountsPerTerm), avg: +(subjectCountsPerTerm.reduce((a, b) => a + b, 0) / subjectCountsPerTerm.length).toFixed(2) },
  crossBranchCases: crossCases,
}
writeFileSync(join(DOC_DIR, 'DATA-VALIDATION.json'), JSON.stringify({ summary, failures: failed, results }, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ ...summary, crossBranchCases: crossCases.length }, null, 2))
if (failed.length) process.exit(2)
