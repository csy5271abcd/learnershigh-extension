import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const scheme = process.argv[2]
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
await p.click('button[role=tab]:has-text("학습관별")'); await p.waitForTimeout(1500)
const secs = await p.$$('.x2-main .x2b-row, .x2-main section')
console.log('n', secs.length)
// click first bar (11/5) in 공부 시간 변화
const sec = p.locator('section', { hasText: '공부 시간 변화' }).first()
const cols = sec.locator('g[role=button]')
console.log('cols', await cols.count())
await cols.nth(0).click(); await p.waitForTimeout(600)
const t = await p.evaluate(() => document.querySelector('.x2b-list, .x2b-open, [class*=x2b-]')?.parentElement?.innerText.slice(0, 1500))
console.log(t)
await sec.screenshot({ path: `branch-pick-${scheme}.png` })
// weekly
await p.click('.x2-seg button:has-text("주별")'); await p.waitForTimeout(800)
await sec.screenshot({ path: `branch-weekly-${scheme}.png` })
await cols.nth(4).click().catch(() => { }); await p.waitForTimeout(600)
await sec.screenshot({ path: `branch-weekly-pick-${scheme}.png` })
fs.writeFileSync(`branch-weekly-${scheme}.txt`, await sec.innerText())
await b.close()
