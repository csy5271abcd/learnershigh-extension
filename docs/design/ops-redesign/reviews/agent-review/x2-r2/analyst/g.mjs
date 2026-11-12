import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const scan = () => {
  const P = (s) => { const m = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return [m[0], m[1], m[2], m[3] ?? 1] }
  const L = (c) => { const [r, g, bl] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
  const bgOf = (el) => { let e = el; while (e) { const c = P(getComputedStyle(e).backgroundColor); if (c[3] > 0.9) return c; e = e.parentElement } return [255, 255, 255, 1] }
  const out = new Map()
  const root = document.querySelector('.x2d[open], .x2d') ?? document.body
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue
    const el = n.parentElement; const cs = getComputedStyle(el)
    const isSvg = el instanceof SVGElement
    const fg = P(isSvg ? cs.fill : cs.color); const bg = bgOf(el)
    const a = L(fg), c = L(bg); const r = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)
    if (r < 4.5) { const k = `${el.className?.baseVal ?? el.className}|${cs.fontSize}|${(isSvg ? cs.fill : cs.color)}|${r.toFixed(2)}`; if (!out.has(k)) out.set(k, t.slice(0, 20)) }
  }
  return [...out.entries()]
}
for (const scheme of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
  await p.fill('input[type=search]', '강하준'); await p.click('tr[aria-label="강하준 상세 열기"]'); await p.waitForTimeout(1200)
  console.log(scheme, 'dialog 학습관생활 daily', JSON.stringify(await p.evaluate(scan)))
  await p.click('.x2d button:has-text("주별")'); await p.waitForTimeout(500)
  console.log(scheme, 'weekly', JSON.stringify(await p.evaluate(scan)))
  await p.close()
}
await b.close()
