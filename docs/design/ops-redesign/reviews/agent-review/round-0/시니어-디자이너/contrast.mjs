import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const fn = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null }
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4 }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
  const bg = el => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c && (c.length<4 || c[3] > 0.9)) return c; el = el.parentElement } return [255,255,255] }
  const out = []
  const root = document.querySelector('.x-page, .y-page, .z-page')
  for (const el of root.querySelectorAll('*')) {
    const t = [...el.childNodes].filter(n => n.nodeType===3).map(n=>n.textContent.trim()).join('')
    if (!t) continue
    const cs = getComputedStyle(el); if (cs.visibility==='hidden' || el.getClientRects().length===0) continue
    const fg = el instanceof SVGElement ? parse(cs.fill) : parse(cs.color); if (!fg) continue
    const b = bg(el instanceof SVGElement ? el.closest('div,section,td,th') : el)
    const L1 = lum(fg), L2 = lum(b), r = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)
    if (r < 4.5) out.push(`${r.toFixed(2)} ${parseFloat(cs.fontSize)}px "${t.slice(0,20)}" ${el.className?.baseVal ?? el.className}`)
  }
  return [...new Set(out)].sort().slice(0, 25)
}
for (const scheme of ['light','dark']) for (const v of ['x','y','z2']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: scheme })
  await p.goto(`http://localhost:5174/student-care/${v}`); await p.waitForTimeout(3000)
  if (v === 'z2') { await p.click('role=tab[name="학습관"]'); await p.waitForTimeout(1500) }
  if (v === 'y') { await p.click('.y-table tbody tr >> nth=0'); await p.waitForTimeout(800) }
  console.log('==', v, scheme); console.log((await p.evaluate(fn)).join('\n'))
  await p.close()
}
await b.close()
