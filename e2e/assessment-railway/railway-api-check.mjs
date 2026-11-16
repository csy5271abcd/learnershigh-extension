// A19: 원격(Railway HTTPS) 분석기에 연결한 로컬 Backend(일회용 DB, 시연 명단 ON)로 합성 문서만 보내 학년별 확정·학생 공개를 실측한다.
// 원격 전송 보호: manifest.json(synthetic_grade_plans.py·SyntheticGradePlanPdf.java 생성)에 있고 SHA-256이 같은 'synthetic-a19-*' 파일만 올린다.
// 실제 학교 문서·기존 코퍼스(F0xxxx)는 받지 않는다. 원문 글자·토큰은 출력하지 않는다(수치·상태만).
// 사용: node railway-api-check.mjs <manifest.json> <demo-roster.json> <out.json>   (A19_API 기본 http://127.0.0.1:19194)
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = process.env.A19_API ?? 'http://127.0.0.1:19194'
const PLANS = `${API}/api/admin/assessment/evaluation-plans`
const STU = `${API}/api/student/assessment/evaluation-plans`
const op = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const rv = { 'X-Assessment-Admin-Id': 'adm_gangnam' }
const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const roster = JSON.parse(readFileSync(process.argv[3], 'utf8'))
if (manifest.synthetic !== true) throw new Error('manifest.synthetic !== true — 합성 문서 manifest만 받는다')

/** 원격 전송 전 확인: manifest 항목·파일 이름·SHA-256이 모두 맞을 때만 바이트를 돌려준다 */
function syntheticBytes(id) {
  const item = manifest.items.find((i) => i.id === id)
  if (!item || !/^synthetic-a19-g[123]\.(pdf|hwp|hwpx)$/.test(item.file)) throw new Error(`합성 manifest 밖 문서 거절: ${id}`)
  const bytes = readFileSync(join(manifest.dir, item.file))
  const sha = createHash('sha256').update(bytes).digest('hex')
  if (sha !== item.sha256) throw new Error(`SHA 불일치 — 전송 거절: ${id}`)
  return { item, bytes, sha }
}

const json = async (r) => { const t = await r.text(); try { return JSON.parse(t) } catch { return { raw: t.slice(0, 120) } } }
const call = async (url, init = {}) => { const r = await fetch(url, init); return { status: r.status, body: await json(r) } }
const put = (url, body) => call(url, { method: 'PUT', headers: { ...rv, 'content-type': 'application/json' }, body: JSON.stringify(body) })

const school = roster.students.find((s) => s.studentId === 'stu_demo_001').school.schoolId
const studentOf = (grade, sameSchool = true) => roster.students.find((s) => (sameSchool ? s.school.schoolId === school : s.school.schoolId !== school) && s.grade === grade).studentId
const students = { g1: studentOf(1), g2: studentOf(2), g3: studentOf(3), otherSchoolG3: studentOf(3, false) }
const out = { api: API, school, students, docs: {}, checks: {} }

async function register(id, grade, tag) {
  const { item, bytes, sha } = syntheticBytes(id)
  const ext = item.file.split('.').pop()
  const fileName = `${item.file.replace(/\.[^.]+$/, '')}-${tag}-${Date.now().toString(36)}.${ext}`
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: ext === 'pdf' ? 'application/pdf' : 'application/hwp+zip' }), fileName)
  for (const [k, v] of Object.entries({ schoolId: school, academicYear: '2026', grade: String(grade), semester: '1' })) form.append(k, v)
  const p = await call(PLANS, { method: 'POST', headers: op, body: form })
  const base = `${PLANS}/${p.body.planId}/revisions/${p.body.documentRevisionId}`
  const t0 = performance.now()
  const a = await call(`${base}/analysis`, { method: 'POST', headers: op })
  const backendMs = Math.round(performance.now() - t0)
  const slot = await call(`${PLANS}/${p.body.planId}/subjects`, { headers: op })
  const subjects = a.body.subjects ?? []
  const rubric = subjects.flatMap((s) => (s.performanceEvaluation?.items ?? []).flatMap((i) => i.rubric ?? []))
  const sources = subjects.flatMap((s) => (s.performanceEvaluation?.items ?? []).flatMap((i) => i.sources ?? []))
  // 원문 SHA·분석기 처리 결과의 DB 저장 대조는 실행자가 DB(assessment_plan_revision.sha256 · assessment_plan_analysis_run)에서 한다
  const d = { id, file: item.file, fileName, format: item.format, sha256: sha, planId: p.body.planId, slotGrade: grade,
    register: p.status, analysis: a.status, analysisStatus: a.body.analysisStatus ?? a.body.status, error: a.status >= 300 ? { code: a.body.code, details: a.body.details } : undefined,
    backendMs, analyzer: a.body.analyzer, profile: a.body.analyzer?.profile, subjects: subjects.length,
    grades: subjects.map((s) => (Array.isArray(s.grades) ? s.grades : null)),
    perfItems: subjects.reduce((n, s) => n + (s.performanceEvaluation?.items?.length ?? 0), 0),
    rubricCriteria: rubric.length, maxScore: rubric.filter((c) => c.maxScore != null).length, linkReview: rubric.filter((c) => c.linkReview != null).length,
    evidence: sources.length, evidenceKinds: [...new Set(sources.map((s) => (s.pdfPageNumber != null ? 'pdfPage' : s.locator ? 'locator' : Object.keys(s).join('+'))))],
    teachingRows: subjects.reduce((n, s) => n + (s.teachingPlan?.length ?? 0), 0),
    teachingPrecision: [...new Set(subjects.flatMap((s) => (s.teachingPlan ?? []).map((r) => r.schedule?.precision ?? null)))],
    weekLabelsKept: subjects.flatMap((s) => s.teachingPlan ?? []).filter((r) => r.weekLabel != null).length,
    issues: (a.body.issues ?? []).map((i) => i.code ?? i), warnings: (a.body.warnings ?? []).length,
    slot: { available: slot.body.available, source: slot.body.source, subjects: (slot.body.items ?? []).length } }
  out.docs[`${id}@g${grade}${tag ? '-' + tag : ''}`] = d
  return { ...d, planId: p.body.planId, revisionId: p.body.documentRevisionId, base, analysisId: a.body.analysisId, raw: subjects, slotItems: (slot.body.items ?? []).map((i) => i.subjectId) }
}

const reasons = (r) => [...new Set((r.body.details?.fields ?? []).map((f) => `${f.field}:${f.reason}`))]
const firstItem = (s) => (s.performanceEvaluation?.items ?? []).findIndex((i) => i.label && (i.sources ?? []).length)
const studentView = async (planId, sid, path = '') => {
  const r = await call(`${STU}/${planId}${path}`, { headers: { 'X-Assessment-Student-Id': sid } })
  return { status: r.status, leaks: /"(linkReview|grades|analysisSubjectIndex)"/.test(JSON.stringify(r.body)), body: r.body }
}

/** PDF 평가정보 확정: 첫 근거 있는 수행평가의 이름 + 요소 배점 있는 채점표(배점 그대로) */
async function confirmEvaluation(d, subjectIndex = 0) {
  const s = d.raw[subjectIndex]
  const n = firstItem(s)
  if (n < 0) {
    // 수행평가 항목이 추출되지 않은 문서(합성 PDF — 분석기 규칙 한계): 실제로 추출된 수행평가 반영 비율만 원문 쪽 근거와 함께 확정한다(값을 만들지 않음)
    const pe = s.performanceEvaluation
    const page = pe?.sources?.[0]?.pdfPageNumber
    if (pe?.weightPercent == null || page == null) return { status: 'SKIPPED_NO_EXTRACTED_VALUE' }
    const res = await put(`${d.base}/review`, { analysisId: d.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: d.slotItems[0], analysisSubjectIndex: subjectIndex,
      confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: pe.weightPercent, pdfPageNumber: page }] }] })
    const saved = await call(`${PLANS}/${d.planId}`, { headers: op })
    return { status: res.status, reasons: res.status >= 300 ? reasons(res) : undefined, fields: ['performanceEvaluation.weightPercent'], value: pe.weightPercent, page,
      persisted: (saved.body.revisions ?? []).flatMap((r) => r.confirmedFields ?? []).filter((f) => f.fieldPath === 'performanceEvaluation.weightPercent').map((f) => f.value) }
  }
  const item = s.performanceEvaluation.items[n]
  const page = item.sources[0].pdfPageNumber
  const fields = [{ fieldPath: `performanceEvaluation.items[${n}].label`, value: item.label, pdfPageNumber: page }]
  const ri = s.performanceEvaluation.items.findIndex((i) => (i.rubric ?? []).some((c) => c.maxScore != null))
  if (ri >= 0) {
    const r = s.performanceEvaluation.items[ri]
    const rubric = r.rubric.map((c) => ({ element: c.element, levels: (c.levels ?? []).map((l) => ({ description: l.description, score: l.score ?? null })), maxScore: c.maxScore ?? null }))
    fields.push({ fieldPath: `performanceEvaluation.items[${ri}].rubric`, value: rubric, pdfPageNumber: r.sources?.[0]?.pdfPageNumber ?? r.rubric.find((c) => c.sources?.length)?.sources[0].pdfPageNumber ?? page })
  }
  const res = await put(`${d.base}/review`, { analysisId: d.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: d.slotItems[0], analysisSubjectIndex: subjectIndex, confirmedFields: fields }] })
  return { status: res.status, reasons: res.status >= 300 ? reasons(res) : undefined, fields: fields.map((f) => f.fieldPath.replace(/\[\d+\]/, '[n]')),
    confirmedMaxScores: ri >= 0 ? fields[1].value.filter((c) => c.maxScore != null).length : 0 }
}

async function confirmTeaching(d) {
  const rows = d.raw[0]?.teachingPlan ?? []
  if (!rows.length) return { status: 'SKIPPED_NO_ROWS' }
  const r = await put(`${d.base}/teaching-plan-review`, { analysisId: d.analysisId, rows: rows.map((x) => ({ subjectIndex: 0, rowKey: x.rowKey, subjectId: d.slotItems[0], decision: 'CONFIRMED' })) })
  return { status: r.status, reasons: r.status >= 300 ? reasons(r) : undefined, confirmedRows: r.body.review?.rows?.length }
}

const visibility = async (planId, path) => {
  const v = {}
  for (const [who, sid] of Object.entries(students)) {
    const s = await studentView(planId, sid, path)
    v[who] = { status: s.status, leaks: s.leaks, rows: s.body.rows?.length, confirmedFields: s.body.confirmedFields?.length,
      maxScores: (s.body.confirmedFields ?? []).filter((f) => f.fieldPath.endsWith('.rubric')).flatMap((f) => f.value).filter((c) => c.maxScore != null).length }
  }
  return v
}

// 1) 1학년 PDF → 1학년 슬롯: 평가정보(이름 + 요소 배점 채점표) 확정 → 1학년 학생만
{
  const d = await register('SYN-G1-PDF', 1, 'g1slot')
  out.checks.g1Pdf = { confirm: await confirmEvaluation(d), students: await visibility(d.planId, '') }
}
// 2) 2학년 PDF → 2학년 슬롯: 확정 → 2학년 학생만
{
  const d = await register('SYN-G2-PDF', 2, 'g2slot')
  out.checks.g2Pdf = { confirm: await confirmEvaluation(d), students: await visibility(d.planId, '') }
}
// 3) 1학년 PDF → 2학년 슬롯: 원문 학년 충돌
{
  const d = await register('SYN-G1-PDF', 2, 'conflict')
  out.checks.g1PdfInG2Slot = { confirm: await confirmEvaluation(d), students: await visibility(d.planId, '') }
}
// 4) 3학년 HWPX → 3학년 슬롯: 운영계획 확정 → 3학년 학생 Planner만 / 평가정보 공식 확정은 보호 유지
{
  const d = await register('SYN-G3-HWPX', 3, 'g3slot')
  const ev = await put(`${d.base}/review`, { analysisId: d.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: d.slotItems[0], analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null }] }] })
  out.checks.g3Hwpx = { teaching: await confirmTeaching(d), evaluationConfirm: { status: ev.status, reasons: reasons(ev) }, planner: await visibility(d.planId, '/teaching-plan') }
}
// 5) 3학년 HWPX → 1학년 슬롯: 운영계획 학년 충돌
{
  const d = await register('SYN-G3-HWPX', 1, 'conflict')
  out.checks.g3HwpxInG1Slot = { teaching: await confirmTeaching(d), planner: await visibility(d.planId, '/teaching-plan') }
}
// 6) 2학년 HWP → 2학년 슬롯: 분석·원문 구조 위치 / 평가정보 공식 확정 보호 유지
{
  const d = await register('SYN-G2-HWP', 2, 'g2slot')
  const ev = await put(`${d.base}/review`, { analysisId: d.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId: d.slotItems[0], analysisSubjectIndex: 0, confirmedFields: [{ fieldPath: 'performanceEvaluation.weightPercent', value: null }] }] })
  out.checks.g2Hwp = { evaluationConfirm: { status: ev.status, reasons: reasons(ev) }, students: await visibility(d.planId, '') }
}
// 7) 3학년 PDF → 3학년 슬롯: 평가정보 + 운영계획 모두 확정 → 3학년 학생만
{
  const d = await register('SYN-G3-PDF', 3, 'g3slot')
  out.checks.g3Pdf = { confirm: await confirmEvaluation(d), teaching: await confirmTeaching(d), students: await visibility(d.planId, ''), planner: await visibility(d.planId, '/teaching-plan') }
}
// 학생 목록: 자기 학교·학년·1학기만, 남의 학년 Query 거절, 2학기 0건
out.checks.studentLists = {}
for (const [who, sid] of Object.entries(students)) {
  const st = roster.students.find((s) => s.studentId === sid)
  const own = await call(`${STU}?schoolId=${st.school.schoolId}&academicYear=2026&grade=${st.grade}&semester=1`, { headers: { 'X-Assessment-Student-Id': sid } })
  const sem2 = await call(`${STU}?schoolId=${st.school.schoolId}&academicYear=2026&grade=${st.grade}&semester=2`, { headers: { 'X-Assessment-Student-Id': sid } })
  const otherGrade = st.grade === 3 ? 1 : st.grade + 1
  const foreign = await call(`${STU}?schoolId=${school}&academicYear=2026&grade=${otherGrade}&semester=1`, { headers: { 'X-Assessment-Student-Id': sid } })
  out.checks.studentLists[who] = { grade: st.grade, sameSchool: st.school.schoolId === school, ownSemester1: own.status, items: own.body.items?.length, semester2Items: sem2.body.items?.length, otherGradeQuery: foreign.status }
}
writeFileSync(process.argv[4], JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1))
