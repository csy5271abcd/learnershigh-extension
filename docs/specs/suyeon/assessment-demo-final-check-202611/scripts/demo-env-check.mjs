// 시연 환경 점검 (합성·Mock만, 읽기 전용 화면 확인). 저장·수정 조작은 하지 않는다.
// usage: node demo-env-check.mjs <chrome.exe> <mode: mock | down> <shot dir>
//   mock: Student 5173·Admin 5174를 기본(Mock) 모드로 띄운 상태. Backend 불필요.
//   down: Student 5173·Admin 5174를 http 모드로 띄우고 Backend(18080)는 꺼 둔 상태 → 오류가 빈 화면으로 숨지 않는지.
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, mode, shotDir] = process.argv.slice(2)
const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} [${mode}] ${name}${detail === undefined ? '' : ' :: ' + JSON.stringify(detail).slice(0, 200)}`)
}

const browser = await chromium.launch({ executablePath: chrome, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

async function open(url, name) {
  const page = await context.newPage()
  const api = []
  page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api')) api.push(r.url()) })
  const started = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const ms = Date.now() - started
  await page.screenshot({ path: `${shotDir}/${mode}-${name}.png` })
  return { page, api, ms, text: await page.locator('body').innerText() }
}

if (mode === 'mock') {
  const s = await open('http://localhost:5173/assessment', 'student')
  check('Student 첫 화면 로딩', s.text.trim().length > 0, { ms: s.ms })
  check('Student 시연 데이터 안내 표시', s.text.includes('시연용 샘플 데이터'))
  check('Student /api 요청 0건', s.api.length === 0, s.api.slice(0, 3))
  const a = await open('http://localhost:5174/assessment', 'admin')
  check('Admin 첫 화면 로딩', a.text.trim().length > 0, { ms: a.ms })
  check('Admin 시연 데이터 안내 표시', a.text.includes('시연 데이터 · 서버 저장 안 됨'))
  check('Admin /api/admin 요청 0건', a.api.filter((u) => u.includes('/api/admin')).length === 0, a.api.slice(0, 3))
} else if (mode === 'down') {
  const s = await open('http://localhost:5173/assessment', 'student')
  check('Student http 개발 안내 표시', s.text.includes('개발 서버 · 실제 Backend에 저장돼요'))
  check('Student Backend 꺼짐 → 오류(role=alert) 표시, 빈 목록으로 숨기지 않음', (await s.page.getByRole('alert').count()) > 0, (await s.page.getByRole('alert').allInnerTexts()).slice(0, 2))
  check('Student 다시 시도 버튼', (await s.page.getByRole('button', { name: /다시 시도/ }).count()) > 0)
  const a = await open('http://localhost:5174/assessment', 'admin')
  check('Admin http 개발 안내 표시', a.text.includes('개발 서버 · 실제 Backend 저장'))
  check('Admin Backend 꺼짐 → 오류(role=alert) 표시', (await a.page.getByRole('alert').count()) > 0, (await a.page.getByRole('alert').allInnerTexts()).slice(0, 2))
}

await browser.close()
console.log(JSON.stringify({ pass: results.filter(Boolean).length, fail: results.filter((x) => !x).length }))
