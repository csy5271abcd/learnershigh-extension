import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = process.cwd(), out = resolve(root, 'docs/design/ops-redesign/reviews/24-evidence')
const wf = 'docs/design/ops-redesign/wireframes-v5/'
const inputs = ['scripts/research/v5-wireframes.mjs', 'scripts/research/care-p34-probe.mjs', 'scripts/research/care-task-score.mjs', 'docs/design/ops-redesign/plan-v5.md', 'docs/design/ops-redesign/task-test-v5.md', 'docs/design/ops-redesign/task-answers-v5.json', ...readdirSync(resolve(root, wf)).map(f => wf + f)]
const hashes = () => Object.fromEntries(inputs.map(f => [f, createHash('sha256').update(readFileSync(resolve(root, f))).digest('hex')]))
const before = hashes()
const require = createRequire(resolve(root, 'e2e/package.json'))
const { chromium } = require('@playwright/test')
const { p34, selfTest } = await import(pathToFileURL(resolve(root, 'scripts/research/care-p34-probe.mjs')))
const source = readFileSync(resolve(root, 'scripts/research/v5-wireframes.mjs'), 'utf8')
// Extract static HTML only; never run generator or write to wireframes-v5.
const states = new Function(source.slice(source.indexOf('const DATES'), source.indexOf('const browser =')) + '\nreturn states')()
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const self = await selfTest(browser), results = []
for (const width of [1600, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await context.route('**/*', route => route.abort())
  for (const [key, html] of Object.entries(states)) {
    const p = await context.newPage()
    await p.setContent(html.replaceAll('repeat(var(--cols,3),1fr)', width < 1440 ? 'repeat(2,1fr)' : 'repeat(3,1fr)'))
    const positions = /branch-result|branch-date/.test(key) ? [['start', 0], ['mid', .5], ['end', 1]] : [['start', 0]]
    for (const [position, fraction] of positions) {
      await p.evaluate(f => { const d = document.querySelector('.dlg'); if (d) d.scrollTop = (d.scrollHeight - d.clientHeight) * f; else scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f) }, fraction)
      const probe = await p34(p)
      const geometry = await p.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom } }
        const controls = [...document.querySelectorAll('.box')].filter(e => /닫기|접기|결석|학습 시간|입실 시각|계획 제출|비전/.test(e.textContent)).map(e => ({ text:e.textContent, ...rect(e) }))
        const main = document.querySelector('.main'), dialog = document.querySelector('.dlg'), wk = document.querySelector('.wk')
        return { documentWidth:document.documentElement.scrollWidth, viewport:innerWidth, scrollY, main:rect(main), mainContentWidth:main.clientWidth - 80,
          dialog:dialog ? rect(dialog) : null, week:wk ? rect(wk) : null,
          rows:[...document.querySelectorAll('tbody')].map(e => e.rows.length), controls,
          sticky:[...document.querySelectorAll('.sticky')].map(e => ({text:e.textContent,...rect(e)})),
          tiles:[...document.querySelectorAll('.main > .grid > .card')].map(e => ({text:e.textContent,...rect(e)})),
          directCards:[...document.querySelectorAll('.main > .card')].map(e => ({title:e.querySelector('b')?.textContent,...rect(e)})) }
      })
      results.push({ key, width, position, probe, geometry })
      await p.screenshot({ path:resolve(out, `${key}-${width}-${position}.png`) })
    }
    if (key === 'B-branch-date' || key === 'C-drawer' || key === 'B-student-modal') {
      // A user wheel over the dimmed background must not move document or dialog.
      const read = () => p.evaluate(() => ({ y:scrollY, d:document.querySelector('.dlg').scrollTop }))
      const a = await read()
      await p.mouse.move(5, 450); await p.mouse.wheel(0, 800); await p.waitForTimeout(100)
      const b = await read()
      results.at(-1).backgroundWheel = { before:a, after:b, locked:a.y === b.y && a.d === b.d }
    }
    await p.close()
  }
  await context.close()
}
await browser.close()
const after = hashes(), changed = inputs.filter(f => before[f] !== after[f])
writeFileSync(resolve(out, 'inspection.json'), JSON.stringify({ runtime:process.version, self, results, changedInputs:changed, hashes:before }, null, 2))
const summary = { selfTests:self.filter(x=>x.ok).length, selfTotal:self.length, measurements:results.length,
  violations:results.filter(x=>x.probe.p3 || x.probe.p4).map(x=>({key:x.key,width:x.width,position:x.position,probe:x.probe})),
  overflows:results.filter(x=>x.geometry.documentWidth>x.width).map(x=>({key:x.key,width:x.width,position:x.position,documentWidth:x.geometry.documentWidth})),
  backgroundWheel:results.filter(x=>x.backgroundWheel).map(x=>({key:x.key,width:x.width,...x.backgroundWheel})), changedInputs:changed }
writeFileSync(resolve(out, 'summary.json'), JSON.stringify(summary,null,2)); console.log(JSON.stringify(summary,null,2))
if (self.some(x=>!x.ok) || changed.length) process.exitCode = 1
