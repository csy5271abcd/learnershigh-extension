// 그림 요소 대비 검사(WCAG 1.4.11: 뜻을 읽는 데 필요한 그림 요소는 바탕과 3:1 이상).
// 격자·축·바탕 띠·마우스 영역은 뺀다. node cchk.mjs [schemes=light,dark]
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const schemes = (process.argv[2] ?? 'light,dark').split(',')
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const SKIP = /(^|[\s-])(grid|axis|hit|track|band|daytick)(\s|$)|xn-hit/
async function check(page) {
  return page.evaluate((skipSrc) => {
    const skip = new RegExp(skipSrc)
    const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, bb, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [r, g, bb, a] }
    const lum = ([r, g, bb]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb) }
    const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
    const bgOf = (el) => { for (let a = el; a; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if (c && c[3] > 0.5) return c } return [255, 255, 255, 1] }
    const out = {}
    for (const el of document.querySelectorAll('svg rect, svg line, svg circle, svg path')) {
      const cls = el.getAttribute('class') ?? ''
      if (!cls || skip.test(cls)) continue
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
      const cs = getComputedStyle(el)
      const isLine = el.tagName === 'line' || (el.tagName === 'path' && cs.fill === 'none')
      const paint = isLine ? cs.stroke : cs.fill
      const c = rgb(paint); if (!c) continue
      let op = Number(cs.opacity) * Number(isLine ? cs.strokeOpacity : cs.fillOpacity) * c[3]
      for (let a = el.parentElement; a && a.tagName !== 'svg'; a = a.parentElement) op *= Number(getComputedStyle(a).opacity)
      const bg = bgOf(el.closest('svg'))
      const mix = c.slice(0, 3).map((v, i) => v * op + bg[i] * (1 - op))
      const k = cls.split(/\s+/)[0]
      const v = Math.round(ratio(mix, bg) * 100) / 100
      if (!out[k] || out[k].ratio > v) out[k] = { ratio: v, color: paint, op: Math.round(op * 100) / 100, bg: `rgb(${bg.slice(0, 3).join(',')})` }
    }
    return out
  }, SKIP.source)
}
const pages = [
  ['x', 'http://localhost:5174/student-care/x', async (p) => { await p.waitForSelector('.x-list tbody tr'); await p.fill('.x-search', '권하린'); await p.waitForTimeout(300); await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(800) }, [['공부 시간'], ['입실 시각'], ['계획'], ['사진 관찰']]],
  ['y', 'http://localhost:5174/student-care/y', async (p) => { await p.waitForSelector('.y-table tbody tr'); await p.waitForFunction(() => !document.querySelector('.y-toolbar [role=status]'), null, { timeout: 120000 }).catch(() => {}); await p.locator('.y-table tbody tr', { hasText: '공부 시간 감소' }).first().click(); await p.waitForTimeout(1500) }, [[null]]],
  ['z2', 'http://localhost:5174/student-care/z2', async (p) => { await p.waitForSelector('[id^="z-row-"]'); await p.locator('[id^="z-row-"]', { hasText: '늦어짐' }).first().click(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.z2-detail details').forEach((d) => { d.open = true })); await p.waitForTimeout(500) }, [[null]]],
]
const all = []
for (const scheme of schemes) {
  const page = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: scheme })
  for (const [v, url, setup, tabs] of pages) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 }); await setup(page)
    const merged = {}
    for (const [tab] of tabs) {
      if (tab) { await page.getByRole('tab', { name: tab, exact: true }).click(); await page.waitForTimeout(500)
        for (const per of ['일간', '주간']) { const btn = page.locator('.x-panel .xs-seg button', { hasText: per }).first(); if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(300) } Object.assign(merged, ...Object.entries(await check(page)).map(([k, o]) => (!merged[k] || merged[k].ratio > o.ratio ? { [k]: o } : {}))) } }
      else Object.assign(merged, await check(page))
    }
    for (const [k, o] of Object.entries(merged)) all.push({ scheme, v, k, ...o })
  }
  await page.close()
}
await b.close()
all.sort((a, c) => a.ratio - c.ratio)
for (const r of all) console.log(`${r.ratio < 3 ? 'FAIL' : 'ok  '} ${r.ratio.toFixed(2).padStart(5)} ${r.scheme.padEnd(5)} ${r.v.padEnd(3)} ${r.k.padEnd(16)} ${r.color} op${r.op} on ${r.bg}`)
