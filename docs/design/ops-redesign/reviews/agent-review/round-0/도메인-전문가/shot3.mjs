import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const css = 'header[class*=header]{position:static!important}'
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000)
await p.getByRole('tab', { name: '학습관' }).click(); await p.waitForTimeout(6000)
await p.addStyleTag({ content: css })
await p.screenshot({ path: 'z2-branch-1600-light.png', fullPage: true })
fs.writeFileSync('z2-branch-text.txt', await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText))
const tabs = await p.locator('[role=tab]').allInnerTexts(); console.log(tabs)
for (const [v,w] of [['x',1024],['y',1024],['z2',1024]]) {
  const q = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: 'dark' })
  await q.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' }); await q.waitForTimeout(3000)
  await q.addStyleTag({ content: css })
  await q.screenshot({ path: `${v}-${w}-dark.png` })
  const over = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log(v, w, 'overflow', over)
  await q.close()
}
await b.close()
