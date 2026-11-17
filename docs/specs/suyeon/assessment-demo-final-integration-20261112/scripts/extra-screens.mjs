// 남은 시연 화면 캡처(읽기 전용, 쓰기 없음). 실제 5173·5174.
import { readFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const [chrome, out] = process.argv.slice(2)
const m = JSON.parse(readFileSync('C:/learnershigh-extension/docs/specs/suyeon/assessment-15schools-60students-seed-202611/SEED-MANIFEST.json', 'utf8'))
const b = await chromium.launch({ executablePath: chrome })
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })).newPage()
const go = async (u, w = 3500) => { await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(w) }
const r = m.students.stu_demo_001
const sa = r.note.assessmentId
await go('http://localhost:5173/assessment/school-assessments?devStudent=stu_demo_001')
await p.getByRole('button', { name: /수행평가 추가/ }).first().click(); await p.waitForTimeout(1200)
await p.getByRole('button', { name: /수강하지 않는 이 학기 공통 과목/ }).click().catch(() => {}); await p.waitForTimeout(600)
await p.screenshot({ path: `${out}/student-add-modal-catalog.png` }); await p.keyboard.press('Escape')
await go(`http://localhost:5173/assessment/school-assessments/${sa}?panel=feedback`, 4500)
await p.screenshot({ path: `${out}/student-feedback-delivered.png` })
await go(`http://localhost:5173/assessment/school-assessments/${sa}?history=1`, 4000)
await p.screenshot({ path: `${out}/student-note-revision-history.png` })
await go(`http://localhost:5173/assessment/growth/${r.growth.recordId}`)
await p.screenshot({ path: `${out}/student-growth-record.png` })
await go('http://localhost:5174/assessment/feedback?devAdmin=adm_demo_a01')
await p.screenshot({ path: `${out}/admin-a01-feedback-list.png` })
await go(`http://localhost:5174/assessment/feedback/${r.feedback.requestId}`, 4500)
await p.screenshot({ path: `${out}/admin-a01-feedback-detail.png` })
await go('http://localhost:5174/assessment/students/stu_demo_001?tab=growth')
await p.screenshot({ path: `${out}/admin-a01-student-growth.png` })
await b.close()
console.log('captured')
