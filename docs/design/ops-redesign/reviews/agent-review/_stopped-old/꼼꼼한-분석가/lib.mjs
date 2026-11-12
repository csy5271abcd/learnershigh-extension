import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
export const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/꼼꼼한-분석가'
export async function open({ w = 1600, h = 1000, scheme = 'light', path }) {
  const browser = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto('http://localhost:5174' + path, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
  await page.waitForTimeout(1500)
  return { browser, page, errs }
}
export async function shot(el, name) { try { await el.screenshot({ path: `${OUT}/${name}.png` }); return name } catch (e) { console.log('SHOTFAIL', name, e.message.slice(0, 120)); return null } }
// 글자끼리 겹침, 글자-막대 겹침, 잘림(scrollWidth>clientWidth, svg 밖) 찾기
export async function audit(page, rootSel) {
  return await page.evaluate((rootSel) => {
    const roots = [...document.querySelectorAll(rootSel)]
    const out = []
    for (const root of roots) {
      const texts = []
      // svg text
      for (const t of root.querySelectorAll('svg text')) {
        const r = t.getBoundingClientRect(); if (r.width < 1 || !t.textContent.trim()) continue
        const svg = t.ownerSVGElement.getBoundingClientRect()
        if (r.left < svg.left - 1 || r.right > svg.right + 1 || r.top < svg.top - 1 || r.bottom > svg.bottom + 1) out.push({ kind: 'svg-clip', text: t.textContent.trim().slice(0, 40), r: [r.left, r.top, r.right, r.bottom].map(Math.round), svg: [svg.left, svg.top, svg.right, svg.bottom].map(Math.round) })
        texts.push({ el: t, text: t.textContent.trim(), r })
      }
      // html leaf text
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let n
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim() || n.parentElement.closest('svg')) continue
        const cs = getComputedStyle(n.parentElement); if (cs.visibility === 'hidden' || cs.display === 'none') continue
        const rg = document.createRange(); rg.selectNodeContents(n)
        for (const r of rg.getClientRects()) if (r.width > 1) texts.push({ el: n.parentElement, text: n.textContent.trim(), r })
      }
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].r, b = texts[j].r
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (ix > 2 && iy > 3 && texts[i].el !== texts[j].el && !texts[i].el.contains(texts[j].el) && !texts[j].el.contains(texts[i].el)) out.push({ kind: 'text-overlap', a: texts[i].text.slice(0, 30), b: texts[j].text.slice(0, 30), at: [Math.round(a.left), Math.round(a.top)] })
      }
      // svg text vs rect/line/path/circle in same svg
      for (const t of texts.filter((x) => x.el.tagName === 'text')) {
        const svg = t.el.ownerSVGElement
        for (const s of svg.querySelectorAll('rect,circle,path,polyline')) {
          const cls = s.getAttribute('class') || ''
          if (/hit|grid|bg|band|zone/.test(cls)) continue
          const cs = getComputedStyle(s); if (cs.fill === 'none' && s.tagName === 'rect') continue
          if (cs.opacity === '0' || cs.fillOpacity === '0') continue
          const r = s.getBoundingClientRect(); if (r.width < 1 && r.height < 1) continue
          const a = t.r
          const ix = Math.min(a.right, r.right) - Math.max(a.left, r.left), iy = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top)
          if (ix > 2 && iy > 2) out.push({ kind: 'text-on-mark', text: t.text.slice(0, 30), mark: s.tagName + '.' + cls, at: [Math.round(a.left), Math.round(a.top)], ov: [Math.round(ix), Math.round(iy)] })
        }
      }
      // html clipping
      for (const el of root.querySelectorAll('*')) {
        if (el.closest('svg')) continue
        const cs = getComputedStyle(el)
        if ((cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) out.push({ kind: 'html-clip', text: el.textContent.trim().slice(0, 40), cls: el.className?.toString?.().slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth })
      }
      // horizontal overflow of root
      if (root.scrollWidth > root.clientWidth + 1) out.push({ kind: 'root-hscroll', sel: rootSel, sw: root.scrollWidth, cw: root.clientWidth })
    }
    return out
  }, rootSel)
}
// 대비 계산: 요소 글자색 vs 실제 배경(조상 배경 탐색)
export async function contrast(page, sel) {
  return await page.evaluate((sel) => {
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null }
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const bgOf = (el) => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c; el = el.parentElement } return [255, 255, 255] }
    const res = []
    for (const el of document.querySelectorAll(sel)) {
      const isSvg = el instanceof SVGElement
      const cs = getComputedStyle(el)
      const fg = parse(isSvg ? (cs.fill !== 'none' ? cs.fill : cs.stroke) : cs.color); if (!fg) continue
      const bg = bgOf(isSvg ? el.ownerSVGElement || el : el)
      const L1 = lum(fg), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      res.push({ cls: (el.getAttribute('class') || el.tagName), text: (el.textContent || '').trim().slice(0, 20), fg: fg.slice(0, 3).join(','), bg: bg.slice(0, 3).join(','), cr: +cr.toFixed(2), size: cs.fontSize })
    }
    return res
  }, sel)
}
