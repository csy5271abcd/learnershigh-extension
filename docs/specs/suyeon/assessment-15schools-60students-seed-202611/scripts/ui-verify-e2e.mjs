// 15개교·60명 Seed 화면 검증 (실제 Chrome + Playwright, 1920×1080). 개발 서버 1개(학생 또는 관리자 Context 1개)씩 검증한다.
// usage:
//   node ui-verify-e2e.mjs student <chrome.exe> <baseUrl> <studentId> <outDir> [--create-via-modal]
//   node ui-verify-e2e.mjs admin   <chrome.exe> <baseUrl> <adminId>   <outDir>
// 개발용 인증 Context는 Vite 실행 시 VITE_ASSESSMENT_DEV_STUDENT_ID / VITE_ASSESSMENT_DEV_ADMIN_ID로 정해진다(실제 로그인 아님).
// 이 스크립트는 Header를 직접 붙이거나 바꾸지 않는다(가장 금지).
// 쓰기: --create-via-modal일 때만 모달로 수행평가 1건 등록(이미 있으면 건너뜀). 그 외 화면 이동·새로고침·미리보기만 한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const [mode, chrome, BASE, actorId, outDir, flag] = process.argv.slice(2)
const roster = JSON.parse(readFileSync(join(DOC_DIR, 'SYNTHETIC-STUDENTS.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(join(DOC_DIR, 'SEED-MANIFEST.json'), 'utf8'))
const catalog = JSON.parse(readFileSync(join(DOC_DIR, 'SUBJECT-CATALOG.json'), 'utf8'))
mkdirSync(outDir, { recursive: true })
const results = []
const check = (area, name, ok, detail) => {
  results.push({ area, name, pass: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const errors = []
const apiFailures = []
const writes = []
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
page.on('response', (response) => {
  const url = new URL(response.url())
  if (url.pathname.startsWith('/api/') && response.status() >= 400) apiFailures.push({ status: response.status(), path: url.pathname })
})
page.on('request', (request) => {
  const url = new URL(request.url())
  if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push({ method: request.method(), path: url.pathname })
})
const text = async () => page.locator('body').innerText()
const open = async (path, mustSee, wait = 1200) => {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  if (mustSee) await page.getByText(mustSee, { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(wait)
  return text()
}
const shot = async (name) => {
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}
const shots = []

if (mode === 'student') {
  const student = roster.students.find((s) => s.studentId === actorId)
  const rec = manifest.students[actorId]
  const label = `${student.school.name} ${student.grade}학년 (${actorId})`
  const s2 = Object.values(rec.assessments).filter((a) => a.semester === 2)
  // 1. 학기 목록 (현재 학기 2026-2)
  let body = await open('/assessment/school-assessments', s2[0].title, 1800)
  check('학생 목록', `${label} 2학기 수행평가 ${s2.length}건 표시`, s2.every((a) => body.includes(a.title)), s2.length)
  // 제목은 학생 사이에 같을 수 있어(과목+유형) ID로 확인한다: 목록 링크의 수행평가 ID가 모두 이 학생 것인지.
  const ownIds = new Set(Object.values(rec.assessments).map((a) => a.assessmentId))
  const otherIds = new Set(Object.entries(manifest.students).filter(([id]) => id !== actorId).flatMap(([, r]) => Object.values(r.assessments).map((a) => a.assessmentId)))
  const linkedIds = await page.evaluate(() => [...document.querySelectorAll('a[href*="/school-assessments/"]')].map((a) => a.getAttribute('href').split('/school-assessments/')[1].split(/[?#/]/)[0]))
  check('학생 목록', `${label} 목록 링크 ${linkedIds.length}개 중 다른 학생 수행평가 0개`, linkedIds.length > 0 && !linkedIds.some((id) => otherIds.has(id)) && s2.every((a) => linkedIds.includes(a.assessmentId)), { linked: linkedIds.length, own: linkedIds.filter((id) => ownIds.has(id)).length })
  shots.push(await shot(`${actorId}-01-list`))
  // 2. 수행평가 추가 모달: 학년·학기 공통 후보 + 수강 과목만 선택
  const slot = catalog.slots.find((s) => s.grade === student.grade && s.semester === 2)
  await page.getByRole('button', { name: /수행평가 추가/ }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ timeout: 10000 })
  const radios = await dialog.locator('input[type="radio"][name="subjectId"]').count()
  check('모달', `${label} 선택 가능한 과목 = 2학기 수강 과목 ${student.subjectIds[2].length}개`, radios === student.subjectIds[2].length, radios)
  const dialogText = await dialog.innerText()
  check('모달', `${label} 안내: ${student.grade}학년 2학기 공통 과목 ${slot.subjects.length}개`, dialogText.includes(`${student.grade}학년 2학기 공통 과목 ${slot.subjects.length}개`))
  await dialog.getByRole('button', { name: /수강하지 않는 이 학기 공통 과목/ }).click()
  const muted = await dialog.locator('li').count()
  check('모달', `${label} 미수강 후보 ${slot.subjects.length - student.subjectIds[2].length}개 비활성 표시(라디오 아님)`, muted === slot.subjects.length - student.subjectIds[2].length, muted)
  check('모달', `${label} 학교 선택 UI 없음`, !/학교\s*선택/.test(dialogText) && (await dialog.locator('select').count()) === 0)
  shots.push(await shot(`${actorId}-02-modal-catalog`))
  if (flag === '--create-via-modal') {
    const title = `[DEMO-15S-2026][UI] 모달 등록 확인 ${actorId}`
    const already = (await text()).includes(title)
    if (!already) {
      await dialog.getByRole('textbox').first().fill(title)
      await dialog.locator('input[type="radio"][name="subjectId"]').first().check({ force: true })
      await dialog.locator('button[type="submit"], footer button').filter({ hasText: /추가|저장|등록/ }).last().click()
      await page.getByText(title).first().waitFor({ timeout: 15000 }).catch(() => {})
    } else await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
    check('모달 등록', `${label} 등록 후 목록 표시`, (await text()).includes(title))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText(title).first().waitFor({ timeout: 15000 }).catch(() => {})
    check('모달 등록', `${label} 새로고침 후 유지`, (await text()).includes(title))
    await page.getByText(title).first().click()
    await page.waitForTimeout(1500)
    check('모달 등록', `${label} 상세 진입`, page.url().includes('/school-assessments/') && (await text()).includes(title))
    shots.push(await shot(`${actorId}-03-modal-created-detail`))
  } else {
    await page.keyboard.press('Escape')
  }
  // 2-1. 학기 전환(2학기 → 1학기) 후 모달 후보·선택 과목 갱신 (학년은 학생 Context 그대로)
  {
    await open('/assessment/school-assessments', undefined, 1500)
    const slot1 = catalog.slots.find((s) => s.grade === student.grade && s.semester === 1)
    await page.getByRole('button', { name: /학기 선택 열기/ }).first().click()
    await page.getByRole('menuitemradio', { name: /1학기/ }).first().click()
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: /수행평가 추가/ }).first().click()
    const dialog1 = page.getByRole('dialog')
    await dialog1.waitFor({ timeout: 10000 })
    const radios1 = await dialog1.locator('input[type="radio"][name="subjectId"]').count()
    const text1 = await dialog1.innerText()
    check('모달 학기 전환', `${label} 1학기로 바꾸면 ${student.grade}학년 1학기 후보 ${slot1.subjects.length}개·수강 ${student.subjectIds[1].length}개`, text1.includes(`${student.grade}학년 1학기 공통 과목 ${slot1.subjects.length}개`) && radios1 === student.subjectIds[1].length, { radios1 })
    shots.push(await shot(`${actorId}-02b-modal-semester1`))
    await page.keyboard.press('Escape')
  }
  // 3. 노트가 있는 수행평가 상세 + 피드백
  const noteAssessment = Object.values(rec.assessments).find((a) => a.assessmentId === rec.note.assessmentId)
  body = await open(`/assessment/school-assessments/${rec.note.assessmentId}`, noteAssessment.title, 2000)
  // 노트 블록은 입력 요소(textarea 등)라 innerText에 없다 → '노트 본문' 목록 안 입력값·텍스트를 모은다.
  const noteText = await page.evaluate(() => {
    const list = document.querySelector('[aria-label="노트 본문"]')
    if (!list) return ''
    return [...list.querySelectorAll('textarea, input, [contenteditable="true"]')].map((el) => el.value ?? el.textContent).join(' ') + ' ' + list.textContent
  })
  body = body + ' ' + noteText
  check('학생 상세', `${label} 상세 제목·탐구 노트 본문·저장 버전`, body.includes(noteAssessment.title) && body.includes('탐구 동기') && body.includes(`저장됨 · v${rec.note.revisions.length}`), { title: body.includes(noteAssessment.title), noteBody: body.includes('탐구 동기'), saved: (/저장됨\s*·\s*v\d+/.exec(body) ?? [''])[0], expected: rec.note.revisions.length })
  shots.push(await shot(`${actorId}-04-detail-note`))
  if (rec.note.revisions.length >= 2) {
    body = await open(`/assessment/school-assessments/${rec.note.assessmentId}?history=1`, noteAssessment.title, 1800)
    check('학생 상세', `${label} 수정 이력 v${rec.note.revisions.length}`, /v\s?2|2번째|버전 2|수정 이력/.test(body))
  }
  if (rec.feedback) {
    body = await open(`/assessment/school-assessments/${rec.note.assessmentId}?panel=feedback`, noteAssessment.title, 2000)
    if (rec.feedback.status === 'DELIVERED') check('학생 피드백', `${label} 전달된 피드백 표시`, !body.includes('학생 비공개'))
    else check('학생 피드백', `${label} 관리자 초안 비노출`, !body.includes('관리자 초안'))
    shots.push(await shot(`${actorId}-05-feedback`))
  }
  // 4. 결과물 뷰어 (PDF·PNG)
  for (const artifact of rec.artifacts ?? []) {
    const version = artifact.versions.at(-1)
    await open(`/assessment/artifacts/${artifact.artifactId}/viewer?v=${version.versionId}`, artifact.title, 2500)
    const rendered = await page.evaluate(() => ({ canvas: document.querySelectorAll('canvas').length, img: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length, embed: document.querySelectorAll('iframe,embed,object').length }))
    check('결과물 뷰어', `${label} ${version.fileName.endsWith('.png') ? 'PNG' : 'PDF'} 미리보기`, rendered.canvas + rendered.img + rendered.embed > 0, rendered)
    shots.push(await shot(`${actorId}-06-viewer-${version.fileName.endsWith('.png') ? 'png' : 'pdf'}`))
  }
  // 5. 성장 기록 · 중요 표시
  body = await open(`/assessment/growth/${rec.growth.recordId}`, rec.growth.title, 1500)
  check('성장 기록', `${label} 성장 기록 상세`, body.includes(rec.growth.title))
  shots.push(await shot(`${actorId}-07-growth`))
  if (rec.favoriteAssessmentId) {
    const fav = Object.values(rec.assessments).find((a) => a.assessmentId === rec.favoriteAssessmentId)
    body = await open('/assessment/archive?tab=favorites', fav.title, 1500)
    check('중요 표시', `${label} 보관함 중요 표시`, body.includes(fav.title))
  }
} else if (mode === 'admin') {
  const branchOf = { adm_demo_a01: 'br_demo_a', adm_demo_a02: 'br_demo_a', adm_demo_b01: 'br_demo_b', adm_demo_c01: 'br_demo_c' }
  const branch = branchOf[actorId]
  const mine = roster.students.filter((s) => s.branchId === branch)
  const others = roster.students.filter((s) => s.branchId !== branch)
  let body = await open('/assessment/students', mine[0].displayName, 2000)
  // 이 개발 서버의 인증 Context가 기대한 관리자인지 먼저 확인한다(화면 상단 개발용 Mock 인증 표시). 다르면 이후 검사는 의미가 없다.
  check('인증 Context', `개발 서버 Context = ${actorId}`, body.includes(actorId))
  check('관리자 목록', `${actorId} 담당 학생 20명 모두 표시`, mine.every((s) => body.includes(s.displayName)), mine.filter((s) => !body.includes(s.displayName)).map((s) => s.displayName))
  check('관리자 목록', `${actorId} 다른 지점 학생 0명`, !others.some((s) => body.includes(s.displayName)) && !body.includes('김서준'))
  check('관리자 목록', `${actorId} 담당 5개교 표시`, [...new Set(mine.map((s) => s.school.name))].every((n) => body.includes(n)))
  shots.push(await shot(`${actorId}-01-students`))
  const target = mine.find((s) => manifest.students[s.studentId].feedback?.status === 'DELIVERED') ?? mine[1]
  const rec = manifest.students[target.studentId]
  body = await open(`/assessment/students/${target.studentId}`, target.displayName, 2000)
  check('관리자 학생 상세', `${actorId} ${target.displayName} 학교·반·번호`, body.includes(target.school.name) && body.includes(`${target.schoolClassNumber}반 ${target.schoolStudentNumber}번`))
  check('관리자 학생 상세', `${actorId} ${target.displayName} 2학기 수강 과목 칩`, target._doc.subjectNames[2].every((n) => body.includes(n)))
  check('관리자 학생 상세', `${actorId} ${target.displayName} 수행평가 과목명 표시('과목 없음' 없음)`, !body.includes('과목 없음') && Object.values(rec.assessments).filter((x) => x.semester === 2).every((x) => body.includes(x.subjectName)))
  shots.push(await shot(`${actorId}-02-student-detail`))
  body = await open('/assessment/feedback', undefined, 2000)
  check('관리자 피드백', `${actorId} 피드백 목록에 다른 지점 학생 없음`, !others.some((s) => body.includes(s.displayName)))
  shots.push(await shot(`${actorId}-03-feedback-list`))
  if (rec.feedback) {
    body = await open(`/assessment/feedback/${rec.feedback.requestId}`, target.displayName, 2500)
    check('관리자 피드백', `${actorId} 요청 상세(Snapshot) 열림`, body.includes(target.displayName))
    shots.push(await shot(`${actorId}-04-feedback-detail`))
  }
  // 다른 지점 학생 URL 직접 입력
  const intruder = others[0]
  const before = apiFailures.length
  body = await open(`/assessment/students/${intruder.studentId}`, undefined, 2500)
  const intruderTitles = Object.values(manifest.students[intruder.studentId].assessments).map((a) => a.title)
  check('지점 간 차단(화면)', `${actorId} → ${intruder.displayName} URL 직접 입력 시 기록 미표시`, !intruderTitles.some((t) => body.includes(t)) && !body.includes(intruder.school.name + ' · '), apiFailures.slice(before).map((f) => f.status))
  shots.push(await shot(`${actorId}-05-cross-branch-url`))
  // 학생 화면 보기 (읽기 전용 iframe)
  await page.goto(`${BASE}/assessment/students/${target.studentId}/view?path=${encodeURIComponent('/assessment/school-assessments')}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const frame = page.frames().find((f) => f !== page.mainFrame() && f.url().includes('student-preview'))
  const frameBody = frame ? await frame.locator('body').innerText() : ''
  const firstTitle = Object.values(rec.assessments).find((a) => a.semester === 2)?.title ?? ''
  check('학생 화면 보기', `${actorId} ${target.displayName} 읽기 전용 화면에 학생 수행평가 표시`, frameBody.includes(firstTitle.slice(0, 20)), Boolean(frame))
  shots.push(await shot(`${actorId}-06-student-view`))
}

const report = { mode, actorId, base: BASE, at: new Date().toISOString(), results, pageErrors: errors, apiFailures, writes, screenshots: shots }
writeFileSync(join(outDir, `ui-${mode}-${actorId}.json`), JSON.stringify(report, null, 2) + '\n', 'utf8')
const failed = results.filter((r) => !r.pass).length
console.log(`== ${mode} ${actorId}: ${results.length - failed}/${results.length} PASS · pageErrors ${errors.length} · api4xx/5xx ${apiFailures.length} · writes ${writes.length}`)
await browser.close()
if (failed) process.exit(2)
