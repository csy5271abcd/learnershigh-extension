import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const names = { 문가영:'demo_s301', 배준서:null, 성하윤:'demo_s303', 노은우:null, 차민재:'demo_s305', 구서아:'demo_s306', 변지호:null, 염태윤:null, 탁예린:'demo_s309', 방시우:'demo_s310', 권하린:'demo_s146', 강도현:'demo_s053' }
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const css = 'header[class*=header]{position:static!important} .z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'
const out = {}
for (const v of ['x','z2','y']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
  await p.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000)
  for (const n of Object.keys(names)) {
    try {
      await p.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
      await p.addStyleTag({ content: css })
      await p.fill('input[type=search]', n); await p.waitForTimeout(400)
      if (v==='x') await p.locator('tr', { hasText: n }).first().click()
      else if (v==='y') await p.locator('tr', { hasText: n }).first().click()
      else await p.locator('button', { hasText: n }).first().click()
      await p.waitForTimeout(1500)
      await p.addStyleTag({ content: css })
      await p.screenshot({ path: `${v}-${n}.png`, fullPage: true })
      out[`${v}-${n}`] = await p.evaluate(() => (document.querySelector('main')||document.body).innerText.replace(/\n+/g,' | '))
    } catch (e) { out[`${v}-${n}`] = 'ERR ' + e.message.slice(0,200) }
  }
  await p.close()
}
fs.writeFileSync('detail-text.json', JSON.stringify(out, null, 1))
await b.close()
