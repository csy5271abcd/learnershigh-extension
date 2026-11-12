import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const O = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-1/도메인-전문가'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const errs = []
for (const v of ['x','y','z2']) for (const scheme of ['light']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: scheme })
  p.on('console', m => { if (m.type()==='error') errs.push(v+': '+m.text()) })
  await p.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await p.screenshot({ path: `${O}/${v}-1600-${scheme}-full.png`, fullPage: true })
  const fs = await import('fs'); fs.writeFileSync(`${O}/${v}-text.txt`, await p.evaluate(() => document.body.innerText))
  await p.close()
}
console.log(errs.join('\n'))
await b.close()
