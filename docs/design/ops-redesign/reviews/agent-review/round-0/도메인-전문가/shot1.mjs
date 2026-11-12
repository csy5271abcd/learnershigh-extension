import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
for (const v of ['x','y','z2']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
  const errs=[]; p.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
  await p.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(4000)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await p.screenshot({ path: `${v}-1600-light-full.png`, fullPage: true })
  fs.writeFileSync(`${v}-text.txt`, await p.evaluate(() => document.body.innerText))
  fs.writeFileSync(`${v}-console.txt`, errs.join('\n'))
  await p.close()
}
await b.close()
