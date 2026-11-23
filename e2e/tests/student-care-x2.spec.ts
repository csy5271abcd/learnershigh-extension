import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { API, resetBackend } from './support.ts'

// 학생 케어 시안 X′ 인수 시험 (2026-11-16, A22). 11-12에 학생 케어가 X′ 단일 화면으로 바뀐 뒤의 현재 제품 화면을 기준으로 한다.
// 이전 화면(분포·패턴·비교 화면)을 검증하던 student-care-branch-*/final/history-details/metric-extremes 시험은 그 화면이 없어져
// 이력용으로만 남기고 playwright.config.ts testMatch에서 뺐다(삭제하지 않음 — 완규님 확인 필요).
// 실행 조건은 CI e2e Job과 같다: care-demo,e2e Profile, 합성 원천(generate-care-seed.mjs, AS_OF 11-11, 150/50/10명), 화면 오늘 11-12.
// 기대값은 하드코딩하지 않고 같은 Backend API에서 읽어 화면과 대조한다. 매 시험은 /api/test/reset(상담·설정만 초기화, 원천 유지)으로 시작한다.
const CARE = `${API}/api/admin/student-care`

type Signal = { type: string; label: string }
type BoardStudent = { studentId: string; studentName: string; className: string; signals: Signal[] }
type Board = { needsCheck: BoardStudent[]; inAdjustment: BoardStudent[]; students: { studentId: string; studentName: string; className: string }[] }

async function json<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${CARE}${path}`)
  expect(response.status(), path).toBe(200)
  return response.json() as Promise<T>
}
const branches = (request: APIRequestContext) => json<{ items: { branchId: string; name: string; studentCount: number }[] }>(request, '/branches')
const board = (request: APIRequestContext, branchId: string) => json<Board>(request, `/board?branchId=${branchId}`)

test.beforeEach(async ({ page, request }) => {
  await resetBackend(request)
  // 외부 글꼴·CDN 요청은 막는다(학생 케어 화면 판정과 무관)
  await page.route('https://**', (route) => route.abort())
})

async function open(page: Page) {
  await page.goto('/student-care')
  await expect(page.locator('#admin-main').getByRole('heading', { level: 1, name: '학생 케어' })).toBeVisible()
  await expect(page.getByRole('region', { name: '학생 목록' }).getByRole('table')).toBeVisible()
}

const studentRows = (page: Page) => page.getByRole('region', { name: '학생 목록' }).getByRole('row', { name: / 상세 열기$/ })
// 학생 목록은 한 쪽에 20명씩 보여 준다(쪽 나누기 '목록 쪽'). 전체 인원은 인원 표시와 상세의 'n / 전체'로 확인한다.
const PAGE_SIZE = 20
const onFirstPage = (total: number) => Math.min(PAGE_SIZE, total)

test('학습관 목록·인원과 관리 사유별 인원은 Backend 판정과 같다', async ({ page, request }) => {
  const list = (await branches(request)).items
  expect(list.length).toBeGreaterThan(0)
  await open(page)
  const select = page.getByLabel('학습관', { exact: true })
  await expect(select.locator('option')).toHaveText(list.map((b) => b.name))
  for (const branch of list) {
    await select.selectOption(branch.branchId)
    await expect(page.getByRole('region', { name: '학생 목록' })).toContainText(`${branch.studentCount}명`)
    await expect(studentRows(page)).toHaveCount(onFirstPage(branch.studentCount))
    // 관리 사유 거르기의 인원 = Backend가 '확인 필요'로 판정한 학생의 신호 종류별 인원
    const data = await board(request, branch.branchId)
    const counts = new Map<string, number>()
    for (const student of data.needsCheck) for (const signal of student.signals) counts.set(signal.label, (counts.get(signal.label) ?? 0) + 1)
    const options = await page.getByRole('combobox', { name: '관리 사유로 거르기' }).locator('option').allInnerTexts()
    const shown = new Map(options.slice(1).map((text) => { const m = /^(.*) \((\d+)명\)$/.exec(text)!; return [m[1], Number(m[2])] as const }))
    expect(Object.fromEntries(shown), branch.name).toEqual(Object.fromEntries(counts))
  }
})

test('관리 사유로 거르면 그 신호가 있는 학생만, 검색·조건 지우기는 목록을 정확히 좁히고 되돌린다', async ({ page, request }) => {
  const data = await board(request, 'demo_large')
  const absent = data.needsCheck.filter((s) => s.signals.some((x) => x.type === 'CONSECUTIVE_ABSENCE'))
  expect(absent.length).toBeGreaterThan(0)
  const label = absent[0].signals.find((x) => x.type === 'CONSECUTIVE_ABSENCE')!.label
  await open(page)
  const filter = page.getByRole('combobox', { name: '관리 사유로 거르기' })
  await filter.selectOption({ label: `${label} (${absent.length}명)` })
  await expect(studentRows(page)).toHaveCount(onFirstPage(absent.length))
  await expect(page.getByRole('region', { name: '학생 목록' })).toContainText(`${absent.length}명 / 전체 ${data.students.length}명`)
  const names = (await studentRows(page).allInnerTexts()).map((t) => t)
  for (const student of absent.slice(0, PAGE_SIZE)) expect(names.some((t) => t.includes(student.studentName)), student.studentName).toBe(true)
  for (const text of names) expect(text).toContain(label)

  // 검색: 학생 1명으로 좁히고, 조건 지우기로 전체 복귀
  await page.getByRole('button', { name: '조건 지우기' }).click()
  await expect(studentRows(page)).toHaveCount(onFirstPage(data.students.length))
  await expect(page.getByRole('region', { name: '학생 목록' })).toContainText(`${data.students.length}명`)
  const target = data.students.find((s) => data.students.filter((x) => x.studentName === s.studentName).length === 1)!
  await page.getByRole('searchbox', { name: '학생 검색' }).fill(target.studentName)
  await expect(studentRows(page)).toHaveCount(1)
  await expect(page.getByRole('region', { name: '학생 목록' })).toContainText(`1명 / 전체 ${data.students.length}명`)
  await page.getByRole('button', { name: '조건 지우기' }).click()
  await expect(studentRows(page)).toHaveCount(onFirstPage(data.students.length))
})

test('학생 상세: 최근 7일 출결·계획 제출과 공부 시간이 그 학생의 Backend 기록과 같고, 이전·다음·닫기가 동작한다', async ({ page, request }) => {
  const metrics = await json<{ students: { student: { studentId: string; studentName: string }; review: { from: string; to: string; days: { date: string; attendance: string; submission: string; scheduled: boolean | null; minutes: number | null }[] } }[] }>(request, '/metrics?branchId=demo_large')
  await open(page)
  const first = studentRows(page).first()
  const name = (await first.getAttribute('aria-label'))!.replace(/ 상세 열기$/, '')
  const record = metrics.students.find((s) => s.student.studentName === name)!
  await first.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { level: 2 })).toContainText(name)
  const total = (await board(request, 'demo_large')).students.length
  await expect(dialog).toContainText(`1 / ${total}`)
  await expect(dialog.getByRole('button', { name: '‹ 이전 학생' })).toBeDisabled()

  // 출결·계획 제출 칸 = API 값(입실/결석/예정 없음/기록 없음, 제출/미제출)
  const grid = dialog.getByRole('table', { name: '최근 7일 출결과 계획 제출' })
  const attendance = { PRESENT: '입실', ABSENT: '결석', UNSCHEDULED: '예정 없음', UNKNOWN: '기록 없음' } as Record<string, string>
  const submission = (d: { submission: string; scheduled: boolean | null; attendance: string }) =>
    d.submission === 'SUBMITTED' ? '제출' : d.submission === 'UNKNOWN' ? '기록 없음' : d.attendance === 'UNSCHEDULED' ? '예정 없음' : '미제출'
  const days = record.review.days
  expect(days).toHaveLength(7)
  await expect(grid.getByRole('row').nth(1).getByRole('cell')).toHaveText(days.map((d) => attendance[d.attendance]))
  await expect(grid.getByRole('row').nth(2).getByRole('cell')).toHaveText(days.map(submission))

  // 최근 7일 공부 시간 합계
  const minutes = days.reduce((sum, d) => sum + (d.minutes ?? 0), 0)
  const hm = `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`
  await expect(dialog.getByRole('region', { name: '공부 시간' })).toContainText(hm)

  await dialog.getByRole('button', { name: '다음 학생 ›' }).click()
  await expect(dialog).toContainText(`2 / ${total}`)
  await expect(dialog.getByRole('heading', { level: 2 })).not.toContainText(name)
  await dialog.getByRole('button', { name: '닫기' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('상담 기록: 계속 관리로 저장하면 Backend에 관리 건 하나만 생기고(연타 포함) 상담 기록 탭에 보인다', async ({ page, request }) => {
  const data = await board(request, 'demo_medium')
  const target = data.needsCheck[0]
  expect(target, 'demo_medium에 확인 필요 학생').toBeTruthy()
  await open(page)
  await page.getByLabel('학습관', { exact: true }).selectOption('demo_medium')
  await page.getByRole('searchbox', { name: '학생 검색' }).fill(target.studentName)
  await studentRows(page).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: '상담' }).click()
  // 지난 관리 이력을 다 읽은 뒤 양식이 한 번 다시 그려진다 — 그 전에 입력하면 사라지므로 로딩 완료를 기다린다(완규님께 관찰 보고)
  await expect(dialog.getByRole('region', { name: '지난 관리' })).toContainText('관리 이력 없음')
  const form = dialog.getByRole('form', { name: '상담 기록' })
  const memo = `[A22 인수 시험] 입실 패턴 확인 ${Date.now().toString(36)}`
  await form.getByRole('radio', { name: '면담' }).check()
  await form.getByRole('textbox', { name: '상담 내용' }).fill(memo)
  await form.getByRole('radio', { name: '계속 관리' }).check()
  const save = form.getByRole('button', { name: '저장' })
  await save.dblclick()
  // 저장 완료 = Backend가 관리 건을 돌려줄 때까지 (화면의 '계속 관리' 글자는 선택지 이름이라 근거가 아님)
  await expect.poll(async () => (await json<{ activeCase: unknown }>(request, `/students/${target.studentId}?branchId=demo_medium`)).activeCase, { timeout: 15_000 }).not.toBeNull()
  await expect(dialog.getByRole('button', { name: '저장' })).toBeVisible()
  const detail = await json<{ activeCase: { caseId: string; status: string; recheckDate: string } | null; today: string }>(request, `/students/${target.studentId}?branchId=demo_medium`)
  expect(detail.activeCase, '관리 건 생성').not.toBeNull()
  const history = await json<{ items: { caseId: string; type: string; content: string; actorName: string | null }[] }>(request, `/students/${target.studentId}/history?branchId=demo_medium`)
  expect(new Set(history.items.map((i) => i.caseId)).size, '연타해도 관리 건은 하나').toBe(1)
  expect(history.items.filter((i) => i.type === 'ADJUSTMENT_STARTED')).toHaveLength(1)
  expect(history.items.some((i) => i.content.includes(memo))).toBe(true)
  expect(detail.activeCase!.recheckDate > detail.today).toBe(true)

  await dialog.getByRole('button', { name: '닫기' }).click()
  await page.getByRole('tab', { name: '상담 기록' }).click()
  const list = page.getByRole('region', { name: '관리 이력 목록' })
  await list.getByRole('combobox', { name: '이력 학생 선택' }).selectOption({ label: `${target.studentName} · ${target.className}` })
  // 관리 건 단위 한 줄: 최근 진행 = 계속 관리 · 다음 점검(API recheckDate와 같은 날)
  await expect(list).toContainText(`${target.studentName} · 1건`)
  const caseRow = list.locator('tr.sc-history-row')
  await expect(caseRow).toHaveCount(1)
  const recheck = detail.activeCase!.recheckDate
  await expect(caseRow).toContainText(`계속 관리 · 다음 점검 ${Number(recheck.slice(5, 7))}월 ${Number(recheck.slice(8, 10))}일`)
  // 줄을 펼치면 저장한 상담 내용이 보인다
  await caseRow.locator('time').click()
  await expect(list).toContainText(memo)
  // 이력이 없는 다른 학생은 '없음'으로 (오류와 구분)
  const other = data.students.find((s) => s.studentId !== target.studentId)!
  await list.getByRole('combobox', { name: '이력 학생 선택' }).selectOption({ label: `${other.studentName} · ${other.className}` })
  await expect(list).toContainText('이 학생의 관리 이력이 없습니다.')
})

test('관리 기준: 범위 밖 값은 저장하지 않고, 바꾼 결석 기준은 Backend 판정과 화면 인원에 반영된다', async ({ page, request }) => {
  const before = await json<{ absenceDays: number; ranges: { absenceDays: { min: number; max: number } } }>(request, '/settings?branchId=demo_large')
  const absenceLabel = (await board(request, 'demo_large')).needsCheck.flatMap((s) => s.signals).find((x) => x.type === 'CONSECUTIVE_ABSENCE')!.label
  await open(page)
  await page.getByRole('button', { name: '관리 기준' }).click()
  const dialog = page.getByRole('dialog', { name: '관리 기준 설정' })
  const absence = dialog.getByRole('spinbutton', { name: '결석' })
  await absence.fill(String(before.ranges.absenceDays.max + 1))
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(absence).toHaveAttribute('aria-invalid', 'true')
  expect((await json<{ absenceDays: number }>(request, '/settings?branchId=demo_large')).absenceDays).toBe(before.absenceDays)

  const next = Math.min(before.absenceDays + 1, before.ranges.absenceDays.max)
  await absence.fill(String(next))
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('dialog', { name: '관리 기준 설정' })).toHaveCount(0)
  expect((await json<{ absenceDays: number }>(request, '/settings?branchId=demo_large')).absenceDays).toBe(next)
  const after = (await board(request, 'demo_large')).needsCheck.filter((s) => s.signals.some((x) => x.type === 'CONSECUTIVE_ABSENCE')).length
  const options = await page.getByRole('combobox', { name: '관리 사유로 거르기' }).locator('option').allInnerTexts()
  const shown = options.find((o) => o.startsWith(`${absenceLabel} (`))
  expect(shown ?? `${absenceLabel} (0명)`).toBe(`${absenceLabel} (${after}명)`)
})

test('학습관별: 관리 사유별 인원은 Backend 판정과 같고, 누르면 그 사유로 거른 학생 목록으로 간다', async ({ page, request }) => {
  const data = await board(request, 'demo_large')
  const counts = new Map<string, number>()
  for (const student of data.needsCheck) for (const signal of student.signals) counts.set(signal.label, (counts.get(signal.label) ?? 0) + 1)
  await open(page)
  await page.getByRole('tab', { name: '학습관별' }).click()
  const region = page.getByRole('region', { name: '관리 사유별 학생 수' })
  const buttons = await region.getByRole('button').allInnerTexts()
  expect(Object.fromEntries(buttons.map((t) => { const m = /^(.*) (\d+)명$/.exec(t.replace(/\s+/g, ' ').trim())!; return [m[1], Number(m[2])] }))).toEqual(Object.fromEntries(counts))
  const [label, count] = [...counts.entries()][0]
  await region.getByRole('button', { name: `${label} ${count}명` }).click()
  await expect(page.getByRole('tab', { name: '학생별' })).toHaveAttribute('aria-selected', 'true')
  await expect(studentRows(page)).toHaveCount(onFirstPage(count))
  await expect(page.getByRole('region', { name: '학생 목록' })).toContainText(`${count}명 / 전체 ${data.students.length}명`)
  // 날짜 축은 Backend 최근 7일과 같다
  await page.getByRole('tab', { name: '학습관별' }).click()
  await expect(page.getByRole('region', { name: '계획 달성률' }).getByRole('button')).toHaveCount(7)
})

test('사진 관찰: 감독관 서비스가 없으면 빈 화면이 아니라 연결 실패를 알리고, 요청은 /supervisor-api Proxy로 간다', async ({ page }) => {
  const supervisor: string[] = []
  page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/supervisor-api/')) supervisor.push(u.pathname) })
  await page.route('**/supervisor-api/**', (route) => route.fulfill({ status: 502, body: 'bad gateway' }))
  await open(page)
  await studentRows(page).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: '사진 관찰' }).click()
  await expect(dialog.getByRole('alert')).toContainText('사진 관찰 서버에 연결하지 못했습니다')
  expect(supervisor.length).toBeGreaterThan(0)
})

test('학부모 리포트: 학생 상세 탭과 메뉴 화면 모두 열린다', async ({ page }) => {
  await open(page)
  await studentRows(page).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: '학부모 리포트' }).click()
  await expect(dialog.getByRole('tab', { name: '데일리 레포트' })).toHaveAttribute('aria-selected', 'true')
  await expect(dialog.getByRole('region', { name: '상담 첨부' })).toBeVisible()
  await dialog.getByRole('button', { name: '닫기' }).click()
  await page.getByRole('navigation', { name: 'Admin 메뉴' }).getByRole('button', { name: /학부모 리포트/ }).click()
  await expect(page).toHaveURL(/\/parent-report$/)
  await expect(page.getByRole('heading', { level: 1, name: '학부모 리포트' }).first()).toBeVisible()
})

// 알려진 제품 결함(2026-11-16 A22 발견, main fd7f87d에서도 동일, 완규님 확인 요청): 상담 탭을 연 뒤 양식에 처음 입력한 글자 하나가 사라진다
// (기록자 'XY' → 'Y', 두 번째 칸부터는 정상). 첫 입력의 onInputCapture → onDirty(true) 직후 양식이 다시 그려지는 것으로 보인다.
// 단언은 완화하지 않고 test.fail()로 '예상 실패'를 표시한다 — 결함이 고쳐지면 이 시험이 '예상 밖 통과'로 실패하므로 그때 test.fail()을 지운다.
test('알려진 결함: 상담 양식에 처음 입력한 글자가 남아야 한다 (현재 첫 글자가 사라짐)', async ({ page, request }) => {
  test.fail(true, 'Student Care CareCounsel/CounselForm: first keystroke after opening the counsel tab is dropped (owner review)')
  const data = await board(request, 'demo_small')
  await open(page)
  await page.getByLabel('학습관', { exact: true }).selectOption('demo_small')
  await page.getByRole('searchbox', { name: '학생 검색' }).fill(data.needsCheck[0].studentName)
  await studentRows(page).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: '상담' }).click()
  await expect(dialog.getByRole('region', { name: '지난 관리' })).toContainText(/관리 이력 없음|\d/)
  const recorder = dialog.getByRole('form', { name: '상담 기록' }).getByRole('textbox', { name: '기록자' })
  await recorder.click()
  await page.keyboard.type('시험 담당', { delay: 80 })
  await expect(recorder).toHaveValue('시험 담당', { timeout: 3_000 })
})
