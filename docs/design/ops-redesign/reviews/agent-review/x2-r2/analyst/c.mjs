import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const names = process.argv.slice(2)
for (const scheme of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  for (const n of names) {
    await p.fill('input[type=search]', n); await p.waitForTimeout(200)
    await p.click(`tr[aria-label="${n} 상세 열기"]`); await p.waitForTimeout(1200)
    for (const per of ['d', 'w']) {
      const lab = per === 'd' ? '날짜별' : '주별'
      await p.click(`.x2d button:has-text("${lab}")`).catch(() => {}); await p.waitForTimeout(500)
      const figs = await p.$$('.x2f')
      let i = 0
      for (const f of figs) { const t = await f.evaluate(e => e.getAttribute('aria-label')); await f.screenshot({ path: `${scheme}-${n}-${per}-${i++}.png` }) }
      const txt = await p.evaluate(() => [...document.querySelectorAll('.x2f')].map((f, i) => i + ' ' + f.getAttribute('aria-label') + ' || ' + f.innerText.replace(/\n+/g, ' | ')).join('\n'))
      fs.writeFileSync(`${scheme}-${n}-${per}.txt`, txt)
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  }
  await p.close()
}
await b.close()
