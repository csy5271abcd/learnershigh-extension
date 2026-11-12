import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const v = process.argv[2]
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'networkidle' })
await p.waitForTimeout(1000)
const out = await p.evaluate(() => {
  const main = document.querySelector('main') || document.body
  const res = []
  const walk = (el, d) => { if (d > 7) return; for (const c of el.children) { const cls = (c.className && c.className.baseVal !== undefined) ? c.className.baseVal : c.className; if (cls || c.tagName==='BUTTON') res.push('  '.repeat(d) + c.tagName.toLowerCase() + '.' + String(cls).split(' ').join('.') + (c.tagName==='BUTTON' ? ' ['+c.innerText.slice(0,20)+']':'')); walk(c, d+1) } }
  walk(main, 0); return res.slice(0, 250).join('\n')
})
console.log(out)
await b.close()
