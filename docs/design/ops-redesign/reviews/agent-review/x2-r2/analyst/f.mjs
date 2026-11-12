import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const lum = (c) => { const [r, g, bl] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
const cr = (a, b) => { const x = lum(a), y = lum(b); return ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2) }
for (const scheme of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
  await p.fill('input[type=search]', '강하준'); await p.click('tr[aria-label="강하준 상세 열기"]'); await p.waitForTimeout(1200)
  const r = await p.evaluate(() => {
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null
    const q = (s) => document.querySelector(s)
    const col = (s) => { const e = document.querySelector(s); return e ? { fill: cs(e, 'fill'), stroke: cs(e, 'stroke'), color: cs(e, 'color'), op: cs(e, 'opacity'), fs: cs(e, 'fontSize'), fw: cs(e, 'fontWeight') } : null }
    return { ref: col('.x2c-ref'), bar: col('.x2c-bar'), val: col('.x2c-val'), flag: col('.x2c-val-flag'), val2: col('.x2c-val2'), band: col('.x2c-band'), card: cs(q('.x2f'), 'backgroundColor'), body: cs(q('.x2d-body'), 'backgroundColor'), grid: col('.x2c-grid') }
  })
  console.log(scheme, JSON.stringify(r))
  const pc = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
  const card = pc(r.card), ref = pc(r.ref.fill), bar = pc(r.bar.fill)
  console.log(scheme, 'bar/card', cr(bar, card), 'bar/ref', cr(bar, ref), 'ref/card', cr(ref, card), 'flag/card', cr(pc(r.flag.fill), card), 'val/card', cr(pc(r.val.fill), card), 'val2/card', cr(pc(r.val2.fill), card), 'refstroke/card', r.ref.stroke && cr(pc(r.ref.stroke), card))
  await p.close()
}
await b.close()
