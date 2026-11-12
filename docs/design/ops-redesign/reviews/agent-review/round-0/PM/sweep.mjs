import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-0/PM/'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
for (const v of ['x', 'y', 'z2']) for (const w of [1600, 1280, 1024]) for (const sc of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: sc })
  await p.goto('http://localhost:5174/student-care/' + v); await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' }); await p.waitForTimeout(2500)
  if (v === 'x') { await p.fill('.x-search', '배준서'); await p.locator('tr', { hasText: '배준서' }).first().click() }
  if (v === 'y') await p.locator('tr', { hasText: '배준서' }).first().click()
  if (v === 'z2') await p.locator('button', { hasText: '배준서' }).first().click()
  await p.waitForTimeout(1200)
  const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bg: getComputedStyle(document.body).backgroundColor, whites: [...document.querySelectorAll('section,div,table,article')].filter(e => getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)' && e.offsetWidth > 200).length }))
  console.log(v, w, sc, JSON.stringify(r))
  if (w === 1024 && sc === 'dark') await p.screenshot({ path: OUT + `${v}-1024-dark-bae.png` })
  await p.close()
}
await b.close()
