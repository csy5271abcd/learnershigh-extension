import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const out = process.argv[2] || '.'
for (const v of ['x','y','z2']) for (const [w,cs] of [[1600,'light'],[1600,'dark'],[1280,'light'],[1024,'dark']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: cs })
  const errs=[]; p.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.text()) }); p.on('pageerror', e=>errs.push('PAGEERR '+e.message))
  await p.goto(`http://localhost:5174/student-care/${v}?branchId=demo_large`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }))
  await p.screenshot({ path: `${out}/${v}-${w}-${cs}.png`, fullPage: false })
  console.log(v,w,cs,JSON.stringify(ov), errs.slice(0,5).join(' | '))
  await p.close()
}
await b.close()
