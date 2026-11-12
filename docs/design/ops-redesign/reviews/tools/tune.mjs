// 색·두께 후보 비교: 같은 화면에 후보 CSS를 하나씩 덮어 요소를 찍고, 후보를 나란히 한 장으로 모은다.
// node tune.mjs <config.json> <out>
import fs from 'node:fs/promises'
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const [cfgPath, out] = process.argv.slice(2)
const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
await fs.mkdir(out, { recursive: true })
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const MIN = (sel, skipSrc) => {
  const skip = new RegExp(skipSrc)
  const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, bb, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [r, g, bb, a] }
  const lum = ([r, g, bb]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb) }
  const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const bgOf = (el) => { for (let a = el; a; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if (c && c[3] > 0.5) return c } return [255, 255, 255, 1] }
  const out = {}
  const root = document.querySelectorAll(sel)
  for (const r0 of root) for (const el of r0.querySelectorAll('svg rect, svg line, svg circle, svg path')) {
    const cls = el.getAttribute('class') ?? ''; if (!cls || skip.test(cls)) continue
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
    const cs = getComputedStyle(el), isLine = el.tagName === 'line' || (el.tagName === 'path' && cs.fill === 'none')
    const c = rgb(isLine ? cs.stroke : cs.fill); if (!c) continue
    let op = Number(cs.opacity) * Number(isLine ? cs.strokeOpacity : cs.fillOpacity) * c[3]
    const bg = bgOf(el.closest('svg')), mix = c.slice(0, 3).map((v, i) => v * op + bg[i] * (1 - op))
    const k = cls.split(/\s+/)[0], v = Math.round(ratio(mix, bg) * 10) / 10
    if (!out[k] || out[k] > v) out[k] = v
  }
  return Object.entries(out).sort((a, c) => a[1] - c[1]).map(([k, v]) => `${k} ${v}${v < 3 ? '✗' : ''}`).join(' · ')
}
const SKIP = String.raw`(^|[\s-])(grid|axis|hit|track|band|daytick)(\s|$)`
const all = {}
const calm = 'header[class*=header]{position:static!important} .y-table thead th{position:static!important} .z-overlay{position:static!important;overflow:visible!important}.z-dialog{max-height:none!important;overflow:visible!important}.z-detail-nav{position:static!important}'
for (const job of cfg.jobs) for (const scheme of job.schemes ?? ['light', 'dark']) {
  const page = await b.newPage({ viewport: { width: job.width ?? 1600, height: 1000 }, colorScheme: scheme })
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 180000 })
  for (const st of job.setup) {
    if (st.wait) await page.waitForSelector(st.wait, { timeout: 120000 })
    if (st.waitGone) await page.waitForFunction((s) => !document.querySelector(s), st.waitGone, { timeout: 120000 }).catch(() => {})
    if (st.fill) await page.fill(st.fill, st.value)
    if (st.click) await page.locator(st.click, st.text ? { hasText: st.text } : {}).first().click()
    if (st.eval) await page.evaluate(st.eval)
    await page.waitForTimeout(st.ms ?? 500)
  }
  await page.addStyleTag({ content: calm })
  const shots = []
  for (const c of job.candidates) {
    const tag = await page.addStyleTag({ content: c.css || '/* 지금 값 */' })
    await page.waitForTimeout(250)
    const el = page.locator(job.target).nth(job.nth ?? 0)
    await el.scrollIntoViewIfNeeded(); if (job.maxH) await el.evaluate((n) => window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - 10)); await page.waitForTimeout(100)
    const file = `${job.id}-${scheme}-${c.name}.png`
    const bb = await el.boundingBox()
    if (job.maxH && bb.height > job.maxH) { await page.screenshot({ path: `${out}/${file}`, clip: { x: bb.x, y: bb.y, width: bb.width, height: job.maxH } }) } else await el.screenshot({ path: `${out}/${file}` })
    const con = await page.evaluate(([sel, sk, fn]) => (new Function('return ' + fn))()(sel, sk), [job.target, SKIP, MIN.toString()])
    shots.push({ file, name: c.name, note: c.note ?? '', con })
    await tag.evaluate((n) => n.remove())
  }
  await page.close()
  // 후보를 한 장으로
  const sheet = await b.newPage({ viewport: { width: job.sheetWidth ?? 1700, height: 800 }, colorScheme: scheme })
  const html = `<html><body style="margin:0;padding:16px;background:${scheme === 'dark' ? '#111' : '#fff'};color:${scheme === 'dark' ? '#eee' : '#111'};font:14px system-ui;display:grid;grid-template-columns:repeat(${job.cols ?? 2},1fr);gap:16px">${shots.map((s) => `<figure style="margin:0"><figcaption style="font-weight:700;margin-bottom:4px">${s.name} <span style="font-weight:400;opacity:.7">${s.note}</span></figcaption><img style="max-width:100%;border:1px solid #8884" src="file:///${out.replace(/\\/g, '/')}/${s.file}"></figure>`).join('')}</body></html>`
  await fs.writeFile(`${out}/${job.id}-${scheme}.html`, html)
  await sheet.goto(`file:///${out.replace(/\\/g, '/')}/${job.id}-${scheme}.html`)
  await sheet.waitForTimeout(300)
  await sheet.screenshot({ path: `${out}/SHEET-${job.id}-${scheme}.png`, fullPage: true })
  await sheet.close()
  console.log('sheet', job.id, scheme, shots.length)
  ;(all[job.id] ??= { job, s: {} }).s[scheme] = shots
}
// 라이트·다크를 한 줄에 나란히(후보 = 줄)
for (const { job, s } of Object.values(all)) {
  if (!s.light || !s.dark) continue
  const rows = s.light.map((l, i) => { const d = s.dark[i]; return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start"><figure style="margin:0"><figcaption style="font-weight:700">${l.name} <span style="font-weight:400;opacity:.75">${l.note}</span></figcaption><div style="font-size:12px;opacity:.8;margin:2px 0 4px">라이트 대비: ${l.con}</div><img style="max-width:100%;border:1px solid #8884" src="file:///${out}/${l.file}"></figure><figure style="margin:0"><figcaption style="font-weight:700">&nbsp;</figcaption><div style="font-size:12px;opacity:.8;margin:2px 0 4px">다크 대비: ${d.con}</div><img style="max-width:100%;border:1px solid #8884" src="file:///${out}/${d.file}"></figure></div>` }).join('')
  const html = `<html><body style="margin:0;padding:16px;background:#fff;color:#111;font:14px system-ui;display:grid;gap:20px">${rows}</body></html>`
  await fs.writeFile(`${out}/${job.id}-LD.html`, html)
  const sheet = await b.newPage({ viewport: { width: job.sheetWidth ?? 1700, height: 800 } })
  await sheet.goto(`file:///${out}/${job.id}-LD.html`); await sheet.waitForTimeout(400)
  await sheet.screenshot({ path: `${out}/LD-${job.id}.png`, fullPage: true }); await sheet.close()
  console.log('LD sheet', job.id)
}
await b.close()
