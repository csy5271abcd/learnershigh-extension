import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const scheme = process.argv[2]; const names = process.argv.slice(3)
const p = await b.newPage({ viewport: { width: 1280, height: 2000 }, colorScheme: scheme })
const reqs = []; p.on('response', r => { if (/supervis|event|photo|vision/i.test(r.url())) reqs.push(r.status() + ' ' + r.url().slice(0, 140)) })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)

for (const n of names) {
  await p.fill('input[type=search]', n); await p.waitForTimeout(200)
  await p.click(`tr[aria-label="${n} 상세 열기"]`); await p.waitForTimeout(1000)
  await p.click('.x2d button[role=tab]:has-text("사진 관찰")'); await p.waitForTimeout(1200)
  await p.addStyleTag({ content: '.x2d{max-height:none!important}.x2d-body{overflow:visible!important}' }); const t = await p.evaluate(() => document.querySelector('.x2d').innerText.replace(/\n+/g, ' | '))
  fs.writeFileSync(`photo-${scheme}-${n}.txt`, t)
  console.log(n, t.slice(0, 700))
  await p.locator('.x2d').screenshot({ path: `photo-${scheme}-${n}.png` })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
}
console.log(reqs.slice(0, 5))
await b.close()
