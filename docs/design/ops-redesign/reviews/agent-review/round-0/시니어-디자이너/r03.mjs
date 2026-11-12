import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5174/student-care/x'); await p.waitForTimeout(2500)
await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
await p.fill('.x-search', '문가영'); await p.click('.x-list tbody tr'); await p.click('.x-tabs button >> nth=3'); await p.waitForTimeout(600)
const hits = p.locator('.x-panel svg [tabindex="0"]'); console.log('focusable bars', await hits.count())
await hits.nth(1).click(); await p.waitForTimeout(500)
console.log('after click filter:', await p.$$eval('.xe-seg button[aria-pressed=true]', bs => bs.map(b=>b.textContent).join(',')), 'rows', await p.locator('.xe-table tbody tr').count())
await p.locator('.x-panel').screenshot({ path: 'x-문가영-vision-barclick-1600-light.png' })
// keyboard: Tab focus on X tabs
await p.keyboard.press('Shift+Tab'); 
// Y keyboard
const y = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await y.goto('http://localhost:5174/student-care/y'); await y.waitForTimeout(2500)
await y.focus('.y-table tbody tr >> nth=0'); await y.keyboard.press('Enter'); await y.waitForTimeout(500)
console.log('Y enter opens', await y.locator('.y-detail').count())
const yb = y.locator('.y-detail svg [tabindex="0"], .y-detail [tabindex="0"]'); console.log('Y detail focusables', await yb.count())
await b.close()
