import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
for (const v of ['x','y','z2']) {
  await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(2500)
  const t = await p.evaluate(()=>document.querySelector('main')?.innerText ?? document.body.innerText)
  console.log('=====',v, p.url()); console.log(t.slice(0,2500))
  const cls = await p.evaluate(()=>[...new Set([...document.querySelectorAll('[class]')].map(e=>e.className).filter(c=>typeof c==='string').flatMap(c=>c.split(' ')).filter(c=>/^(x|y|z)/.test(c)))].join(' '))
  console.log('CLS', cls)
}
await b.close()
