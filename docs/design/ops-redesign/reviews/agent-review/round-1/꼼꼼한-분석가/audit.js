// in-page audit: SVG text overlaps, clipped HTML text, low contrast
window.__audit = (root) => {
  root = root || document
  const res = { overlaps: [], clipped: [], lowContrast: [] }
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const bgOf = (el) => { let e = el; while (e && e.nodeType === 1) { const s = getComputedStyle(e); const c = parse(s.backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement } return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 } }
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 }
  const txt = (e) => (e.textContent || '').trim().slice(0, 30)
  // SVG text overlaps within same svg
  root.querySelectorAll('svg').forEach((svg, si) => {
    const ts = [...svg.querySelectorAll('text')].filter((t) => vis(t) && t.textContent.trim())
    const bx = ts.map((t) => t.getBoundingClientRect())
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      if (ts[i].contains(ts[j]) || ts[j].contains(ts[i])) continue
      const a = bx[i], b = bx[j]; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 1 && oy > 2) res.overlaps.push(`"${txt(ts[i])}" × "${txt(ts[j])}" (${Math.round(ox)}×${Math.round(oy)})`)
    }
    // text vs bars/rects/lines (data marks)
    const marks = [...svg.querySelectorAll('rect,circle,path,line,polyline')].filter((m) => { const c = (m.getAttribute('class') || ''); return vis(m) && !/hit|grid|axis|track|mid|base-?line|bg/.test(c) })
    ts.forEach((t, i) => { const a = bx[i]; marks.forEach((m) => { const b = m.getBoundingClientRect(); if (b.width < 1 && b.height < 1) return; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 2 && oy > 3 && b.width * b.height < 40000) res.overlaps.push(`글자 "${txt(t)}" × ${m.tagName}.${m.getAttribute('class') || ''} (${Math.round(ox)}×${Math.round(oy)})`) }) })
    // svg text clipped by svg viewport
    const sb = svg.getBoundingClientRect(); ts.forEach((t, i) => { const a = bx[i]; if (a.left < sb.left - 1 || a.right > sb.right + 1 || a.top < sb.top - 1 || a.bottom > sb.bottom + 1) res.clipped.push(`SVG 밖 "${txt(t)}"`) })
  })
  // HTML clipped text
  root.querySelectorAll('*').forEach((el) => {
    if (!vis(el) || el.closest('svg')) return
    const s = getComputedStyle(el)
    if ((s.overflow.includes('hidden') || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) res.clipped.push(`${el.tagName}.${el.className} "${txt(el)}" ${el.scrollWidth}>${el.clientWidth}`)
  })
  // contrast: leaf text nodes
  const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue
    const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el)
    if (el.closest('[aria-hidden=true]') && !el.closest('svg')) continue
    const s = getComputedStyle(el)
    const inSvg = el.closest('svg')
    const fg = parse(inSvg ? (s.fill && s.fill !== 'none' ? s.fill : s.color) : s.color); if (!fg) continue
    const bg = bgOf(el); const fs = parseFloat(s.fontSize), bold = +s.fontWeight >= 700
    const large = fs >= 24 || (bold && fs >= 18.66)
    const r = ratio({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) }, bg)
    const need = large ? 3 : 4.5
    if (r < need && !(el.closest('button[disabled]'))) res.lowContrast.push(`"${txt(el)}" ${r.toFixed(2)}:1 ${fs}px fg=${s.color}${inSvg ? ' fill=' + s.fill : ''}`)
  }
  return res
}
// graphic contrast for svg marks
window.__marks = (root) => {
  root = root || document
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const bgOf = (el) => { let e = el.closest('svg').parentElement; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement } return { r: 255, g: 255, b: 255 } }
  const out = {}
  root.querySelectorAll('svg rect, svg circle, svg line, svg path').forEach((m) => {
    const cls = m.getAttribute('class') || '(none)'; if (/hit/.test(cls)) return
    const s = getComputedStyle(m); const isLine = m.tagName === 'line' || (s.fill === 'none')
    const c = parse(isLine ? s.stroke : s.fill); if (!c || c.a === 0) return
    const op = +s.opacity * (+(isLine ? s.strokeOpacity : s.fillOpacity) || 1)
    const bg = bgOf(m); const a = c.a * op
    const mix = { r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) }
    const r = ratio(mix, bg)
    const k = `${m.closest('svg').getAttribute('class') || ''} ${m.tagName}.${cls}`
    if (!out[k] || out[k] > r) out[k] = +r.toFixed(2)
  })
  return Object.entries(out).filter(([, r]) => r < 3).map(([k, r]) => `${k} ${r}:1`)
}
