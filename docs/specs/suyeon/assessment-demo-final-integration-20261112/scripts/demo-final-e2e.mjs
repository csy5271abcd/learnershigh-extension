// 실제 시연 화면(Student 5173 / Admin 5174) 최종 E2E. 사용자 서버를 그대로 쓰고 새 서버를 띄우지 않는다.
// usage: node demo-final-e2e.mjs <chrome.exe> <part: students|notes|admins|switcher> <outDir>
// - Context 전환: 개발 서버 전용 시연 링크(?devStudent= / ?devAdmin=) → 화면의 전환 패널과 같은 저장소 값. Header를 직접 붙이지 않는다.
// - 쓰기: notes 파트만(학생 탐구 노트 신규 2건·수정 1건). 그 외는 읽기.
// - API 확인(Node fetch)은 그 학생 본인 / 담당 지점 관리자 Header로만 한다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, part, outDir] = process.argv.slice(2)
const SEED = 'C:/learnershigh-extension/docs/specs/suyeon/assessment-15schools-60students-seed-202611'
const roster = JSON.parse(readFileSync(`${SEED}/SYNTHETIC-STUDENTS.json`, 'utf8'))
const manifest = JSON.parse(readFileSync(`${SEED}/SEED-MANIFEST.json`, 'utf8'))
const STUDENT = 'http://localhost:5173'
const ADMIN = 'http://localhost:5174'
const API = 'http://localhost:18080'
const branchAdmin = { br_demo_a: 'adm_demo_a01', br_demo_b: 'adm_demo_b01', br_demo_c: 'adm_demo_c01' }
mkdirSync(outDir, { recursive: true })
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 220) : ''}`)
}
const api = async (path, headers) => (await fetch(API + path, { headers })).json()
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const errors = []
const apiFailures = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
page.on('response', (r) => {
  const u = new URL(r.url())
  if (u.pathname.startsWith('/api/') && r.status() >= 400) apiFailures.push({ status: r.status(), path: u.pathname })
})
const shots = []
const shot = async (name) => {
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file })
  shots.push(file)
}
const body = async () => page.locator('body').innerText()
const go = async (url, mustSee, wait = 1500) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (mustSee) await page.getByText(mustSee, { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(wait)
  return body()
}
const noteText = async () =>
  page.evaluate(() => {
    const list = document.querySelector('[aria-label="노트 본문"]')
    const title = document.querySelector('input[placeholder="노트 제목"]')
    return `${title?.value ?? ''} ${list ? [...list.querySelectorAll('textarea, input')].map((el) => el.value).join(' ') : ''}`
  })

if (part === 'students') {
  // 15개교 × 1명 (학년 1·2·3 순환, A·B·C 지점 모두)
  const picks = roster.schools.map((school, i) => roster.students.find((s) => s.school.schoolId === school.schoolId && s.grade === (i % 3) + 1) ?? roster.students.find((s) => s.school.schoolId === school.schoolId))
  for (const s of picks) {
    const rec = manifest.students[s.studentId]
    const s1 = Object.values(rec.assessments).filter((a) => a.semester === 1)
    const label = `${s.studentId} ${s.school.name} ${s.grade}학년`
    let text = await go(`${STUDENT}/assessment/school-assessments?devStudent=${s.studentId}`, s1[0].title, 2000)
    check('학교 표시', `${label}: 학교명·학년 표시, 예시고등학교 없음`, text.includes(s.school.name) && text.includes(`${s.grade}학년`) && !text.includes('예시고등학교'))
    check('수행평가', `${label}: 1학기 수행평가 ${s1.length}건 제목(정리된 제목) 표시`, s1.every((a) => text.includes(a.title)), s1.filter((a) => !text.includes(a.title)).map((a) => a.title))
    check('전환 패널', `${label}: 개발용 시연 학생 패널에 현재 학생 표시`, text.includes(`시연 학생: ${s.displayName}`))
    const ctx = await api(`/api/student/assessment/academic-context?academicYear=2026&semester=1`, { 'X-Assessment-Student-Id': s.studentId })
    check('API', `${label}: §9-1 학교 = 명단`, ctx.school?.name === s.school.name && ctx.grade === s.grade)
    const dates = await Promise.all(Object.values(rec.assessments).map((a) => api(`/api/student/assessment/school-assessments/${a.assessmentId}`, { 'X-Assessment-Student-Id': s.studentId }).then((d) => d.deadlineDate)))
    check('마감일', `${label}: 수행평가 ${dates.length}건 모두 ${today} 이후`, dates.every((d) => d && d > today), dates)
    if (['unjeong', 'sehwa', 'jeju'].includes(s._doc.schoolKey)) await shot(`student-${s.studentId}-${s._doc.schoolKey}-list`)
  }
  // 홈 + 2학기 + 상세(미래 마감일)
  const s = roster.students.find((x) => x.studentId === 'stu_demo_019')
  await go(`${STUDENT}/assessment?devStudent=${s.studentId}`, s.school.name, 2500)
  await shot('student-home-stu_demo_019')
  const rec = manifest.students[s.studentId]
  const a = Object.values(rec.assessments).find((x) => x.assessmentId === rec.note.assessmentId)
  const t = await go(`${STUDENT}/assessment/school-assessments/${a.assessmentId}`, a.title, 2500)
  check('상세', `${s.studentId}: 상세 제목·D-day 표시(미래)`, t.includes(a.title) && /D-\d+/.test(t), (/D-\d+|D-day|D\+\d+/.exec(t) ?? [''])[0])
  await shot('student-detail-future-deadline')
} else if (part === 'notes') {
  const scenarios = [
    { sid: 'stu_demo_005', mode: 'create', tag: 'A지점 신규' },
    { sid: 'stu_demo_026', mode: 'update', tag: 'B지점 수정' },
    { sid: 'stu_demo_050', mode: 'create', tag: 'C지점 신규' },
  ]
  const record = {}
  for (const sc of scenarios) {
    const s = roster.students.find((x) => x.studentId === sc.sid)
    const rec = manifest.students[sc.sid]
    const ST = { 'X-Assessment-Student-Id': sc.sid }
    const AD = { 'X-Assessment-Admin-Id': branchAdmin[s.branchId] }
    let target
    if (sc.mode === 'create') {
      // 노트가 없는 수행평가(학기 1 우선)
      for (const a of Object.values(rec.assessments)) {
        const notes = await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${a.assessmentId}`, ST)
        if ((notes.items ?? []).length === 0) {
          target = a
          break
        }
        if ((notes.items ?? []).some((n) => n.title.includes('[시연 E2E]'))) {
          target = a
          break
        }
      }
    } else target = Object.values(rec.assessments).find((a) => a.assessmentId === rec.note.assessmentId)
    const marker = `[시연 E2E] ${sc.tag} ${today}`
    await go(`${STUDENT}/assessment/school-assessments/${target.assessmentId}?devStudent=${sc.sid}`, target.title, 3000)
    const before = (await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${target.assessmentId}`, ST)).items ?? []
    const beforeRevs = before[0] ? ((await api(`/api/student/assessment/notes/${before[0].noteId}/revisions`, ST)).items ?? []) : []
    const already = before.some((n) => JSON.stringify(n).includes(marker))
    if (!already) {
      if (sc.mode === 'create') {
        await page.locator('input[placeholder="노트 제목"]').fill(`${marker} ${s.school.name} 탐구 노트`)
        await page.locator('[aria-label="노트 본문"] textarea').first().click()
        for (const line of ['탐구 동기: 수업에서 배운 개념을 실제 사례로 확인하고 싶었다.', '탐구 과정: 자료 3개를 비교하고 핵심 근거를 표로 정리했다.', '배운 점: 근거의 출처와 시점을 함께 적어야 설득력이 생긴다.']) {
          await page.keyboard.type(line)
          await page.keyboard.press('Enter')
        }
      } else {
        await page.locator('[aria-label="노트 본문"] textarea').last().click()
        await page.keyboard.press('End')
        await page.keyboard.type(` ${marker} — 피드백을 반영해 개선 방향을 구체적으로 보완했다.`)
      }
      await page.waitForTimeout(300)
      const saveButton = page.getByTestId('note-save-now')
      check('노트 저장 UI', `${sc.sid}: '지금 저장' 활성(변경 있음)`, await saveButton.isEnabled())
      await saveButton.click()
      await page.getByText(/자동 저장됨 · v\d+/).first().waitFor({ timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2500) // 자동 저장(1.5초)까지 끝나도록
    }
    await shot(`note-${sc.sid}-${sc.mode}-saved`)
    const after = (await api(`/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${target.assessmentId}`, ST)).items ?? []
    const note = after.find((n) => JSON.stringify(n).includes(marker))
    const revs = note ? ((await api(`/api/student/assessment/notes/${note.noteId}/revisions`, ST)).items ?? []) : []
    check('노트 API', `${sc.sid}: Backend 저장(노트 ID·Revision)`, Boolean(note) && revs.length >= 1, { noteId: note?.noteId, revisions: revs.length, before: beforeRevs.length })
    if (sc.mode === 'update') {
      check('노트 Revision', `${sc.sid}: 새 Revision 생성(이전 ${beforeRevs.length} → ${revs.length})`, already || revs.length > beforeRevs.length)
      const v1 = await api(`/api/student/assessment/notes/${note.noteId}/revisions/${revs.sort((x, y) => x.revisionNumber - y.revisionNumber)[0].revisionId}`, ST)
      check('노트 Revision', `${sc.sid}: v1 내용 불변(새 문구 없음)`, !JSON.stringify(v1).includes(marker))
      if (rec.feedback) {
        const fb = await api(`/api/student/assessment/feedback-requests/${rec.feedback.requestId}`, ST)
        check('Snapshot', `${sc.sid}: 피드백 Snapshot Revision 그대로`, fb.snapshot?.noteRevisionId === rec.note.revisions.at(-1).revisionId, fb.snapshot?.noteRevisionId)
      }
    }
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    check('새로고침', `${sc.sid}: 새로고침 후 작성 내용 유지`, (await noteText()).includes(marker))
    record[sc.sid] = { assessmentId: target.assessmentId, title: target.title, noteId: note?.noteId, revisions: revs.map((r) => ({ revisionId: r.revisionId, revisionNumber: r.revisionNumber })), mode: sc.mode, admin: AD['X-Assessment-Admin-Id'] }
    // 관리자(담당 지점) 같은 노트 확인 — 화면
    await go(`${ADMIN}/assessment/students/${sc.sid}/school/${target.assessmentId}?devAdmin=${AD['X-Assessment-Admin-Id']}`, target.title, 3000)
    // 기본 탭 '학생 화면'(읽기 전용 iframe) → '관리자 기록 도구' 탭에서 노트 Revision을 본다
    await page.getByRole('tab', { name: '관리자 기록 도구' }).or(page.getByRole('button', { name: '관리자 기록 도구' })).first().click()
    await page.getByText('탐구 노트').first().waitFor({ timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const adminText = await body()
    // 관리자 화면은 노트 제목이 아니라 본문 블록을 보여 준다 → 신규는 작성한 본문, 수정은 덧붙인 문구로 확인
    const expectText = sc.mode === 'create' ? '탐구 과정: 자료 3개를 비교하고 핵심 근거를 표로 정리했다.' : marker
    check('관리자 열람', `${AD['X-Assessment-Admin-Id']}: ${sc.sid} 노트 최신 Revision 본문 표시`, adminText.includes(expectText), { admin: AD['X-Assessment-Admin-Id'] })
    const subjectName = target.subjectName
    check('관리자 기록 메타', `${sc.sid}: 과목명·2026학년도 ${s.grade}학년 ${target.semester}학기 표시`, adminText.includes(`2026학년도 ${s.grade}학년 ${target.semester}학기`) && adminText.replace(/\s+/g, ' ').includes(`과목 ${subjectName}`), { subjectName })
    await shot(`note-${sc.sid}-admin-view`)
    const adminNotes = await api(`/api/admin/assessment/students/${sc.sid}/student-view/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${target.assessmentId}`, AD)
    check('관리자 열람', `${sc.sid}: 관리자 API 같은 노트 ID`, (adminNotes.items ?? []).some((n) => n.noteId === note?.noteId))
  }
  writeFileSync(join(outDir, 'note-e2e-record.json'), JSON.stringify(record, null, 2) + '\n', 'utf8')
} else if (part === 'admins') {
  for (const [adminId, branchId] of [['adm_demo_a01', 'br_demo_a'], ['adm_demo_a02', 'br_demo_a'], ['adm_demo_b01', 'br_demo_b'], ['adm_demo_c01', 'br_demo_c']]) {
    const mine = roster.students.filter((s) => s.branchId === branchId)
    const others = roster.students.filter((s) => s.branchId !== branchId)
    const text = await go(`${ADMIN}/assessment/students?devAdmin=${adminId}`, mine[0].displayName, 3000)
    check('관리자 Context', `${adminId}: 화면 인증 표시 = ${adminId}`, text.includes(adminId))
    check('관리자 목록', `${adminId}: 담당 20명 표시·다른 지점 0명`, mine.every((s) => text.includes(s.displayName)) && !others.some((s) => text.includes(s.displayName)) && !text.includes('김서준'))
    const schoolOptions = await page.locator('select[aria-label="학교"] option').allInnerTexts()
    const expectedSchools = [...new Set(mine.map((s) => s.school.name))]
    check('학교 필터', `${adminId}: 학교 필터 = 담당 5개교`, expectedSchools.every((n) => schoolOptions.some((o) => o.includes(n))) && !schoolOptions.some((o) => o.includes('예시고등학교')), schoolOptions)
    await shot(`admin-${adminId}-students`)
    const target = mine[3]
    const detail = await go(`${ADMIN}/assessment/students/${target.studentId}?devAdmin=${adminId}`, target.displayName, 3000)
    check('관리자 상세', `${adminId}: ${target.displayName} 학교·반·번호·정리된 제목`, detail.includes(target.school.name) && detail.includes(`${target.schoolClassNumber}반 ${target.schoolStudentNumber}번`) && !detail.includes('과목 없음'))
    const intruder = others[0]
    const before = apiFailures.length
    await go(`${ADMIN}/assessment/students/${intruder.studentId}?devAdmin=${adminId}`, undefined, 3000)
    const blocked = await page.getByTestId('student-out-of-scope').isVisible().catch(() => false)
    check('지점 간 차단', `${adminId} → ${intruder.studentId}(다른 지점): 접근 불가 안내, 첫 학생 자동 표시 안 함`, blocked && !(await body()).includes(intruder.school.name + ' · '), apiFailures.slice(before).map((f) => f.status))
    if (adminId === 'adm_demo_b01') await shot('admin-out-of-scope-notice')
  }
  // 학교 필터 동작 (C지점: 제주고만)
  await go(`${ADMIN}/assessment/students?devAdmin=adm_demo_c01`, '변주원', 2500)
  await page.locator('select[aria-label="학교"]').selectOption({ label: '제주고등학교' }).catch(async () => {
    const options = await page.locator('select[aria-label="학교"] option').evaluateAll((els) => els.map((e) => ({ v: e.value, t: e.textContent })))
    const jeju = options.find((o) => o.t.includes('제주고'))
    if (jeju) await page.locator('select[aria-label="학교"]').selectOption(jeju.v)
  })
  await page.waitForTimeout(2500)
  const filtered = await body()
  const jeju = roster.students.filter((s) => s.school.name === '제주고등학교')
  check('학교 필터', 'adm_demo_c01: 제주고등학교 필터 → 제주고 4명만', jeju.every((s) => filtered.includes(s.displayName)) && !roster.students.filter((s) => s.branchId === 'br_demo_c' && s.school.name !== '제주고등학교').some((s) => filtered.includes(s.displayName + '\n')))
  await shot('admin-c01-school-filter-jeju')
}

if (part === 'plans') {
  // Admin 검토 화면: 합성 평가계획서 PDF·HWP 분석 후보 (정답: 분석기 runs/.../EXPECTED-RESULT.md — 가상과학탐구, 지필 1차 40%, 수행 탐구 보고서 30%·토론 활동 30%)
  for (const [tag, file] of [['pdf', 'plan-import-pdf.json'], ['hwp', 'plan-import-hwp.json']]) {
    const info = JSON.parse(readFileSync(join(outDir, '..', file), 'utf8'))
    const text = await go(`${info.reviewUrl}?devAdmin=adm_demo_gangnam`, '가상과학탐구', 5000)
    check('평가계획서 검토', `${tag}: 과목 가상과학탐구 표시`, text.includes('가상과학탐구'))
    check('평가계획서 검토', `${tag}: 수행평가 탐구 보고서·토론 활동 표시`, text.includes('탐구 보고서') && text.includes('토론 활동'))
    check('평가계획서 검토', `${tag}: 반영비율 30%·40% 표시`, text.includes('30') && text.includes('40'))
    check('평가계획서 검토', `${tag}: 검토 전 상태(자동 확정 아님)`, /검토 (전|필요|대기)|미검토|확인 전|후보/.test(text))
    if (tag === 'pdf') check('원문 근거', 'pdf: 근거 쪽 표시', /\d+\s*쪽|p\.?\s*\d|PDF\s*\d/.test(text))
    else check('원문 근거', 'hwp: 쪽 번호 대신 구역·표 위치(가짜 쪽 번호 없음)', /구역|표\s*\d|섹션|section/i.test(text))
    await shot(`admin-plan-review-${tag}`)
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(800)
    await shot(`admin-plan-review-${tag}-2`)
  }
  // 5174는 -PlanSchools school_001(이름 없음)로 실행 중이라 학교 칸에 ID가 보인다(실행 설정). 문서 수·검토 상태로 확인한다.
  const list = await go(`${ADMIN}/assessment/evaluation-plans?devAdmin=adm_demo_gangnam`, 'school_001', 3000)
  check('평가계획서 목록', 'school_001: 문서 2개 · 고1 1·2학기 각 1개 · 검토 필요', list.includes('2개') && (list.match(/1개 등록됨/g) ?? []).length === 2 && list.includes('검토 필요'))
  await shot('admin-plan-list')
  const denied = await go(`${ADMIN}/assessment/evaluation-plans?devAdmin=adm_demo_a01`, undefined, 3000)
  check('평가계획서 권한', 'adm_demo_a01(지점 관리자): 평가계획서 운영 권한 없음 안내 또는 문서 없음', !denied.includes('가상과학탐구'))
  await shot('admin-plan-a01-no-permission')
}

const report = { part, at: new Date().toISOString(), results, pageErrors: errors, apiFailures, screenshots: shots }
writeFileSync(join(outDir, `e2e-${part}.json`), JSON.stringify(report, null, 2) + '\n', 'utf8')
const failed = results.filter((r) => !r.pass).length
console.log(`== ${part}: ${results.length - failed}/${results.length} PASS · pageErrors ${errors.length} · api4xx/5xx ${apiFailures.length}`)
await browser.close()
if (failed) process.exit(2)
