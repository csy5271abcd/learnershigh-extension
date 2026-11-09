import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = process.cwd()
const out = resolve(root, 'docs/design/ops-redesign/reviews/23-evidence')
const require = createRequire(resolve(root, 'e2e/package.json'))
const { chromium } = require('@playwright/test')
const { p34, selfTest } = await import(pathToFileURL(resolve(root, 'scripts/research/care-p34-probe.mjs')))
const source = readFileSync(resolve(root, 'scripts/research/v5-wireframes.mjs'), 'utf8')
// Reuse the exact static state strings without executing the image generator or writing its outputs.
const states = new Function(source.slice(source.indexOf('const DATES'), source.indexOf('const browser =')) + '\nreturn states')()
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const self = await selfTest(browser)
const results = []
for (const width of [1600, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await context.route('**/*', r => r.abort())
  const p = await context.newPage()
  for (const [key, html] of Object.entries(states)) {
    await p.setContent(html.replaceAll('repeat(var(--cols,3),1fr)', width < 1440 ? 'repeat(2,1fr)' : 'repeat(3,1fr)'))
    const raw = await p34(p)
    const geometry = await p.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } }
      return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
        main: rect(document.querySelector('.main')), dialog: document.querySelector('.dlg') ? rect(document.querySelector('.dlg')) : null,
        rows: [...document.querySelectorAll('tbody')].map(e => e.rows.length),
        sticky: [...document.querySelectorAll('.sticky')].map(rect),
        metricCards: [...document.querySelectorAll('.main > .grid > .card')].map(e => ({ title: e.querySelector('b')?.textContent, ...rect(e) })) }
    })
    let modalSemanticsOnly = null
    if (geometry.dialog) {
      // Diagnostic only: do not misreport missing aria-modal as a structural second scroller.
      await p.locator('.dlg').evaluate(e => e.setAttribute('aria-modal', 'true'))
      modalSemanticsOnly = await p34(p)
    }
    results.push({ key, width, raw, geometry, modalSemanticsOnly })
    if (['B-branch-date', 'D-branch-result', 'A-branch-result', 'C-branch-result'].includes(key)) {
      await p.evaluate(() => { const d = document.querySelector('.dlg'); if (d) d.scrollTop = d.scrollHeight; else window.scrollTo(0, document.documentElement.scrollHeight) })
      await p.screenshot({ path: resolve(out, `${key}-${width}-bottom.png`) })
      results.at(-1).bottom = await p.evaluate(() => ({ scrollY, controls: [...document.querySelectorAll('.box,.sticky')].filter(e => /닫기|접기|지표로|요약/.test(e.textContent)).map(e => ({ text: e.textContent, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom })) }))
    }
  }
  await context.close()
}
await browser.close()
writeFileSync(resolve(out, 'inspection.json'), JSON.stringify({ runtime: process.version, self, results }, null, 2))
console.log(JSON.stringify({ selfTests: self.filter(x => x.ok).length, selfTotal: self.length, states: results.length, nonzero: results.filter(x => x.raw.p3 || x.raw.p4).map(x => ({ key: x.key, width: x.width, raw: x.raw, modalSemanticsOnly: x.modalSemanticsOnly })), overflows: results.filter(x => x.geometry.documentWidth > x.width).map(x => ({ key: x.key, width: x.width, documentWidth: x.geometry.documentWidth })) }, null, 2))
