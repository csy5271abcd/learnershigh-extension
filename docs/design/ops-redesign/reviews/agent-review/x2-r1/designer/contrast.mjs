import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
for (const th of ['light','dark']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: th })
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForSelector('.x2-table tbody tr')
  await p.fill('input[type=search]','탁예린'); await p.locator('.x2-table tbody tr').first().click(); await p.waitForSelector('dialog.x2d[open]'); await p.waitForTimeout(800)
  const r = await p.evaluate(()=>{
    const out={}; const fig=document.querySelector('#x2-fig-study')||document.querySelector('.x2c');
    const rects=[...document.querySelectorAll('.x2d svg rect')].map(e=>({f:getComputedStyle(e).fill,w:e.getAttribute('width')})).slice(0,12)
    const texts=[...document.querySelectorAll('.x2d svg text')].slice(0,40).map(e=>({t:e.textContent,f:getComputedStyle(e).fill,s:getComputedStyle(e).fontSize}))
    const card=getComputedStyle(document.querySelector('.x2c')||document.body).backgroundColor
    const strokes=[...document.querySelectorAll('.x2d svg line,.x2d svg path')].slice(0,6).map(e=>getComputedStyle(e).stroke)
    return {card,rects,texts,strokes, body:getComputedStyle(document.querySelector('.x2d-body')).backgroundColor}
  })
  console.log(th, JSON.stringify(r))
  await p.close()
}
await b.close()
