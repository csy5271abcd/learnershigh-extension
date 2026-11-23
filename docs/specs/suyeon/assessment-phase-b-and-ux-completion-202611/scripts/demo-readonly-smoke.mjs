// 시연 주소 읽기 전용 점검 (쓰기 요청 0건 — 화면 이동·선택만). usage: node demo-readonly-smoke.mjs <chrome.exe> <out.json> <shot dir>
import { writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outPath, shotDir] = process.argv.slice(2)
const STUDENT = 'http://localhost:5173'
const ADMIN = 'http://localhost:5174'
const results = []
const browser = await chromium.launch({ executablePath: chrome })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const errors = []
const bad = []
const writes = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('response', (response) => {
  const url = response.url()
  if (url.includes('/api/') && response.status() >= 400) bad.push(`${response.status()} ${url.replace(/^https?:\/\/[^/]+/, '')}`)
})
page.on('request', (request) => {
  if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`)
})
const visit = async (name, url, after) => {
  const before = { errors: errors.length, bad: bad.length }
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  if (after) await after()
  await page.screenshot({ path: `${shotDir}/${name}.png` })
  const ok = errors.length === before.errors && bad.length === before.bad
  results.push({ name, url, ok, errors: errors.slice(before.errors), bad: bad.slice(before.bad) })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
}
await visit('s-home', `${STUDENT}/assessment`)
await visit('s-list', `${STUDENT}/assessment/school-assessments`)
await visit('s-resources-reco', `${STUDENT}/assessment/resources`, async () => {
  const options = await page.locator('#reco-subject option').allInnerTexts()
  if (options.length > 1) await page.locator('#reco-subject').selectOption({ index: 1 })
  await page.waitForTimeout(800)
})
await visit('s-archive-trash', `${STUDENT}/assessment/archive?tab=trash`)
await visit('s-growth', `${STUDENT}/assessment/growth`)
await visit('s-feedback', `${STUDENT}/assessment/feedback`)
await visit('s-enrichment', `${STUDENT}/assessment/enrichment`)
await visit('a-overview', `${ADMIN}/assessment`)
await visit('a-students', `${ADMIN}/assessment/students`)
await visit('a-student-view', `${ADMIN}/assessment/students/stu_001/view`, async () => {
  await page.getByTestId('readonly-banner').waitFor({ timeout: 20000 })
  await page.waitForTimeout(2000)
})
await visit('a-references', `${ADMIN}/assessment/references`)
await visit('a-plans', `${ADMIN}/assessment/evaluation-plans`)
await visit('a-feedback', `${ADMIN}/assessment/feedback`)
const summary = { at: new Date().toISOString(), pages: results.length, passed: results.filter((r) => r.ok).length, pageErrors: errors, apiErrors: bad, writes }
writeFileSync(outPath, JSON.stringify({ ...summary, results }, null, 2))
console.log(`${summary.passed}/${summary.pages} pages OK · API 4xx/5xx ${bad.length} · page errors ${errors.length} · write requests ${writes.length}`)
await browser.close()
