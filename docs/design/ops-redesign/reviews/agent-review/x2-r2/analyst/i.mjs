import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const scheme = process.argv[2]
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
await p.click('button[role=tab]:has-text("학습관별")'); await p.waitForTimeout(1500)
const t = await p.evaluate(() => document.querySelector('.x2-main').innerText.replace(/\n+/g, ' | '))
fs.writeFileSync(`branch-${scheme}.txt`, t)
console.log(t.slice(0, 6000))
const secs = await p.$$('.x2-main section, .x2-main .x2f')
let i = 0
for (const s of secs) { try { await s.screenshot({ path: `branch-${scheme}-${i}.png` }); i++ } catch { } }
console.log('secs', i)
await p.screenshot({ path: `branch-${scheme}-full.png`, fullPage: true })
await b.close()
