import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const v = process.argv[2]
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
await p.screenshot({ path: `${v}-1600-first.png` })
const t = await p.evaluate(() => document.body.innerText)
console.log(t.slice(0, 4000))
console.log('---H', await p.evaluate(() => document.documentElement.scrollHeight))
await b.close()
