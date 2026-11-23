// 시연 수행평가(DEMO-15S-2026) 마감일을 실행일(Asia/Seoul) 다음 날 이후로, 어색한 제목을 자연스럽게 바꾼다.
// usage: node update-deadlines-and-titles.mjs [--api http://localhost:18080] [--dry-run]
// 원칙:
//  - 기존 §12 PATCH(title·deadlineDate)만 사용. 삭제·재생성 없음 → Assessment ID·노트·파일·피드백 연결 그대로.
//  - 진행 상태는 바꾸지 않는다(완료 수행평가를 시작 전으로 되돌리지 않음).
//  - 이미 내일 이후인 마감일은 그대로 둔다(재실행 안전). 마감일 없음·오늘·과거만 미래로 바꾼다.
//  - 학생 Header는 그 학생 본인에게만 쓴다. 관리자는 담당 지점 관리자로 같은 값을 다시 읽는다.
//  - Seed Manifest에 없는 '[DEMO-15S-2026]' 수행평가(화면 검증 중 모달로 만든 건 등)도 학생 목록에서 찾아 같은 규칙으로 처리한다.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { futureDeadline, naturalTitle, seoulToday } from './lib/demo-content.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const MANIFEST = join(DOC_DIR, 'SEED-MANIFEST.json')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, value, index, all) => (value.startsWith('--') ? [...acc, [value.slice(2), all[index + 1]?.startsWith('--') || all[index + 1] === undefined ? true : all[index + 1]]] : acc), []))
const API = String(args.api ?? 'http://localhost:18080').replace(/\/+$/, '')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) throw new Error('localhost Backend만 허용해요.')
const DRY = Boolean(args['dry-run'])
const PREFIX = '[DEMO-15S-2026]'
const roster = JSON.parse(readFileSync(join(DOC_DIR, 'SYNTHETIC-STUDENTS.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const today = seoulToday()
const tomorrow = new Date(`${today}T00:00:00Z`)
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
const minDate = tomorrow.toISOString().slice(0, 10)
const branchAdmin = { br_demo_a: 'adm_demo_a01', br_demo_b: 'adm_demo_b01', br_demo_c: 'adm_demo_c01' }

async function call(method, path, headers, body) {
  const init = { method, headers: { ...headers } }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const response = await fetch(API + path, init)
  const data = (response.headers.get('content-type') ?? '').includes('json') ? await response.json().catch(() => null) : null
  if (response.status >= 400) throw new Error(`${method} ${path} → ${response.status} ${JSON.stringify(data).slice(0, 300)}`)
  return data
}

const summary = { runAt: new Date().toISOString(), today, minDate, api: API, dryRun: DRY, total: 0, deadlineChanged: 0, titleChanged: 0, statusChanged: 0, extraFound: 0, failures: [] }
const log = []
for (const student of roster.students) {
  const sid = student.studentId
  const ST = { 'X-Assessment-Student-Id': sid }
  const AD = { 'X-Assessment-Admin-Id': branchAdmin[student.branchId] }
  const rec = manifest.students[sid]
  const known = new Map(Object.entries(rec.assessments).map(([key, a]) => [a.assessmentId, { key, ...a }]))
  // 학생 목록에서 같은 Batch 수행평가 전체(Manifest 밖 포함)를 찾는다
  const targets = []
  for (const semester of [1, 2]) {
    const list = await call('GET', `/api/student/assessment/school-assessments?academicYear=2026&semester=${semester}&query=${encodeURIComponent(PREFIX)}&size=100`, ST)
    for (const item of list.items ?? []) if (item.title.startsWith(PREFIX)) targets.push({ ...item, semester })
  }
  for (const item of targets) {
    summary.total++
    const meta = known.get(item.assessmentId)
    if (!meta) summary.extraFound++
    const before = await call('GET', `/api/student/assessment/school-assessments/${item.assessmentId}`, ST)
    const body = {}
    // 제목: Seed 수행평가만 규칙으로 바꾼다([UI] 등 Seed 밖 제목은 그대로).
    if (meta && before.title.startsWith(`${PREFIX} `)) {
      const next = `${PREFIX} ${naturalTitle(meta.subjectName, meta.templateKey)}`
      if (next !== before.title) body.title = next
    }
    if (!before.deadlineDate || before.deadlineDate < minDate) body.deadlineDate = futureDeadline(meta?.seedKey ?? `${sid}:${item.assessmentId}`, today)
    let after = before
    if (Object.keys(body).length && !DRY) {
      try {
        after = await call('PATCH', `/api/student/assessment/school-assessments/${item.assessmentId}`, ST, body)
      } catch (error) {
        summary.failures.push({ sid, assessmentId: item.assessmentId, error: String(error.message).slice(0, 300) })
        continue
      }
    }
    if (body.title) summary.titleChanged++
    if (body.deadlineDate) summary.deadlineChanged++
    if (!DRY) {
      const reread = await call('GET', `/api/student/assessment/school-assessments/${item.assessmentId}`, ST)
      const adminView = await call('GET', `/api/admin/assessment/students/${sid}/school-assessments/${item.assessmentId}`, AD)
      if (reread.status !== before.status) summary.statusChanged++
      const ok = reread.deadlineDate >= minDate && reread.title === after.title && adminView.assessment.deadlineDate === reread.deadlineDate && adminView.assessment.title === reread.title && adminView.assessment.status === reread.status
      if (!ok) summary.failures.push({ sid, assessmentId: item.assessmentId, reread: { deadline: reread.deadlineDate, title: reread.title }, admin: { deadline: adminView.assessment.deadlineDate } })
      if (meta) Object.assign(rec.assessments[meta.key], { title: reread.title, deadlineDate: reread.deadlineDate, previousTitle: body.title ? before.title : rec.assessments[meta.key].previousTitle, previousDeadlineDate: body.deadlineDate ? before.deadlineDate : rec.assessments[meta.key].previousDeadlineDate })
      else (rec.extraAssessments ??= {})[item.assessmentId] = { title: reread.title, semester: item.semester, deadlineDate: reread.deadlineDate, previousDeadlineDate: body.deadlineDate ? before.deadlineDate : undefined, note: 'Seed 밖 [DEMO-15S-2026] 수행평가(화면 검증 중 모달 등록 등)' }
    }
    log.push({ sid, assessmentId: item.assessmentId, before: { title: before.title, deadline: before.deadlineDate, status: before.status }, change: body })
  }
  if (!DRY) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  process.stdout.write('.')
}
manifest.deadlineTitleUpdates = [...(manifest.deadlineTitleUpdates ?? []), { ...summary, failures: summary.failures.length }]
if (!DRY) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
// 실제 변경이 있었던 실행만 deadline-title-update.json에 남기고, 변경 0건 재실행은 별도 파일에 쓴다(첫 기록을 덮어쓰지 않게).
const changed = summary.deadlineChanged + summary.titleChanged > 0
const outName = DRY ? 'deadline-title-dryrun.json' : changed ? 'deadline-title-update.json' : 'deadline-title-rerun.json'
writeFileSync(join(DOC_DIR, '..', 'assessment-demo-final-integration-20261112', outName), JSON.stringify({ summary, log }, null, 2) + '\n', 'utf8')
console.log('\n' + JSON.stringify(summary, null, 2))
if (summary.failures.length) process.exit(2)
