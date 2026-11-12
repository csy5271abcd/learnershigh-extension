import { open, shot, audit, contrast, OUT } from './lib.mjs'
import fs from 'fs'
const [, , W = '1600', SCHEME = 'light', LIST = ''] = process.argv
const students = (LIST || '권유진,장수빈,권하린,강도현,문가영,배준서,성하윤,노은우,차민재,구서아,변지호,염태윤,탁예린,방시우,이지우').split(',')
const { browser, page, errs } = await open({ w: +W, scheme: SCHEME, path: '/student-care/x' })
const tag = `x-${W}-${SCHEME}`
const log = {}
await shot(page.locator('.x-list'), `${tag}-list`)
log.tabColors = {}
for (const name of students) {
  await page.fill('.x-search', name); await page.waitForTimeout(300)
  const row = page.locator('.x-list tbody tr').first()
  if (!(await row.count())) { log[name] = 'NOT IN LIST'; continue }
  await row.click(); await page.waitForTimeout(400)
  const L = log[name] = { head: await page.locator('.x-panel-head').innerText().catch(() => ''), badge: await row.innerText() }
  await shot(page.locator('.x-panel-head'), `${tag}-${name}-head`)
  await shot(page.locator('.x-att'), `${tag}-${name}-att`)
  L.tabs = await page.$$eval('.x-tabs button', (bs) => bs.map((b) => b.textContent + ':' + getComputedStyle(b).color))
  for (const [i, t] of ['study', 'start', 'plan', 'vision'].entries()) {
    await page.locator('.x-tabs button').nth(i).click(); await page.waitForTimeout(300)
    for (const per of ['d', 'w']) {
      const segs = page.locator('.x-tab-body .xs-seg').first()
      if (await segs.count()) { await segs.locator('button').nth(per === 'd' ? 0 : 1).click(); await page.waitForTimeout(300) }
      const figs = page.locator('.x-tab-body .x-fig')
      const n = await figs.count()
      for (let k = 0; k < n; k++) await shot(figs.nth(k), `${tag}-${name}-${t}-${per}-${k}`)
      L[`${t}-${per}`] = { text: (await page.locator('.x-tab-body').innerText()).slice(0, 1500), audit: await audit(page, '.x-tab-body') }
    }
    // 마우스 올림: 첫 그림의 마지막 칸
    const g = page.locator('.x-tab-body svg g[data-tip]').last()
    if (await g.count()) { await g.hover(); await page.waitForTimeout(300); const tip = page.locator('[role=tooltip], .z-tip, [class*=tip]').last(); L[`${t}-hover`] = await tip.innerText().catch(() => 'no tip'); await shot(page.locator('.x-tab-body'), `${tag}-${name}-${t}-hover`) }
  }
  // 첫 기간으로 돌림
  await page.locator('.x-tabs button').nth(0).click(); await page.locator('.x-tab-body .xs-seg button').first().click()
}
log.contrast = (await contrast(page, '.x-page .xn-tick, .x-page .x-muted, .x-page .xn-empty, .x-page .x-cls, .x-page .x-badge, .x-page .xp-base, .x-page .xp-now, .x-page .xp-old')).filter((c) => c.cr < 4.5)
log.links = await page.$$eval('.x-page a, .x-page nav button', (a) => a.map((x) => x.textContent.trim()).slice(0, 40))
log.errs = errs
fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(log, null, 1))
await browser.close()
console.log('done', tag)
