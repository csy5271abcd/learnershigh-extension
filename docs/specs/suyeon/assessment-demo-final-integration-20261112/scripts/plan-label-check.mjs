import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const b = await chromium.launch({ executablePath: process.argv[2] })
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR' })).newPage()
await p.goto('http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_gangnam', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(4000)
const t = await p.locator('body').innerText()
console.log((t.match(/(PDF|HWP|HWPX|문서) \d+개 등록됨[^\n]*/g) ?? []).join(' | '))
await p.screenshot({ path: 'screenshots/admin-plan-list-format-label.png' })
await b.close()
