import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const [,, mode] = process.argv
const ALL = ['권유진','장수빈','권하린','강도현','문가영','배준서','성하윤','노은우','차민재','구서아','변지호','염태윤','탁예린','방시우']
const SUB = ['문가영','배준서','성하윤','노은우','방시우','탁예린','구서아']
const plans = mode === 'A' ? [{ w: 1600, cs: 'light', st: ALL }] : mode === 'B' ? [{ w: 1600, cs: 'dark', st: SUB }, { w: 1280, cs: 'light', st: SUB }, { w: 1024, cs: 'light', st: SUB }, { w: 1024, cs: 'dark', st: ['배준서','탁예린'] }] : []
const variants = (process.argv[3] ?? 'x,y,z2').split(',')
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const log = []
const CSS = 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'
async function ready(p, v) {
  for (let i = 0; i < 4; i++) {
    await p.goto('http://localhost:5174/student-care/' + v); await p.addStyleTag({ content: CSS })
    await p.waitForFunction(() => !/불러오는 중|명째/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {})
    await p.waitForTimeout(800)
    const err = await p.evaluate(() => document.body.innerText.includes('사진 관찰 서버에 연결하지 못했습니다'))
    if (!err) return true
    log.push(`${v} supervisor error try ${i}`)
  }
  return false
}
const safe = (s) => s.replace(/[^\w가-힣-]/g, '_')
async function shot(loc, name) { try { await loc.scrollIntoViewIfNeeded({ timeout: 3000 }); await loc.screenshot({ path: name, timeout: 8000 }); return true } catch (e) { log.push('miss ' + name + ' ' + e.message.split('\n')[0]); return false } }
for (const pl of plans) for (const v of variants) {
  const ctx = await b.newContext({ viewport: { width: pl.w, height: 1000 }, colorScheme: pl.cs })
  const p = await ctx.newPage()
  const ok = await ready(p, v)
  const dir = `${v}/${pl.w}-${pl.cs}`; fs.mkdirSync(dir, { recursive: true })
  log.push(`${dir} supervisorOk=${ok} bg=${await p.evaluate(() => getComputedStyle(document.body).backgroundColor)}`)
  if (v === 'x') {
    await shot(p.locator('.x-list'), `${dir}/_list.png`)
    for (const n of pl.st) {
      await p.fill('.x-search', n); await p.waitForTimeout(200)
      await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(300)
      await shot(p.locator('.x-panel-head'), `${dir}/${n}-0head.png`)
      await shot(p.locator('.x-att'), `${dir}/${n}-1att.png`)
      const tabs = [['study','공부 시간'],['start','입실 시각'],['plan','계획'],['vision','사진 관찰']]
      for (const [k, l] of tabs) {
        await p.locator('.x-tabs button', { hasText: l }).click(); await p.waitForTimeout(300)
        const d = p.locator('button', { hasText: /^일간$/ }).first(); if (await d.count()) await d.click()
        await p.waitForTimeout(250)
        await shot(p.locator('.x-tab-body'), `${dir}/${n}-2${k}-d.png`)
        const w = p.locator('button', { hasText: /^주간$/ }).first()
        if (await w.count()) { await w.click(); await p.waitForTimeout(300); await shot(p.locator('.x-tab-body'), `${dir}/${n}-3${k}-w.png`); await p.locator('button', { hasText: /^일간$/ }).first().click() }
      }
      await p.locator('.x-tabs button', { hasText: '공부 시간' }).click()
    }
  }
  if (v === 'y') {
    await shot(p.locator('.y-toolbar'), `${dir}/_toolbar.png`)
    await p.evaluate(() => window.scrollTo(0, 0))
    await p.screenshot({ path: `${dir}/_top.png`, clip: { x: 0, y: 0, width: pl.w, height: 1000 } })
    for (const n of pl.st) {
      await p.fill('.y-search', n); await p.waitForTimeout(300)
      const row = p.locator('.y-table tbody tr').first()
      if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click()
      await p.waitForTimeout(500)
      await shot(row, `${dir}/${n}-0row.png`)
      const panels = p.locator('tr.y-detail .y-panel')
      const c = await panels.count()
      for (let i = 0; i < c; i++) await shot(panels.nth(i), `${dir}/${n}-1panel${i}.png`)
      await row.click(); await p.waitForTimeout(200)
    }
  }
  if (v === 'z2') {
    await shot(p.locator('.z-roster'), `${dir}/_roster.png`)
    for (const n of pl.st) {
      await p.fill('.z-search', n); await p.waitForTimeout(300)
      await p.locator(`.z-roster button:has-text("${n}")`).first().click(); await p.waitForTimeout(800)
      await shot(p.locator('.z2-head'), `${dir}/${n}-0head.png`)
      const boxes = p.locator('.z-dialog .z2-box, .z-dialog .zz-reasons > section')
      // details open
      await p.evaluate(() => document.querySelectorAll('.z-dialog details').forEach((d) => d.open = true)); await p.waitForTimeout(300)
      const sec = p.locator('.z-dialog .z2-detail > section, .z-dialog .zz-reasons > section, .z-dialog details')
      const c = await sec.count()
      for (let i = 0; i < c; i++) await shot(sec.nth(i), `${dir}/${n}-1sec${i}.png`)
      // daily/weekly toggles within reason cards
      const wk = p.locator('.z-dialog button', { hasText: /^주간$/ })
      const wc = await wk.count()
      for (let i = 0; i < wc; i++) await wk.nth(i).click().catch(() => {})
      if (wc) { await p.waitForTimeout(300); const r = p.locator('.z-dialog .zz-reasons > section'); const rc = await r.count(); for (let i = 0; i < rc; i++) await shot(r.nth(i), `${dir}/${n}-2wk${i}.png`) }
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await p.addStyleTag({ content: CSS })
    }
    // branch tab
    await p.fill('.z-search', '')
    await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(1200)
    const ms = p.locator('.z-body section.z-metric, .z-body > div > section')
    const mc = await ms.count()
    for (let i = 0; i < mc; i++) await shot(ms.nth(i), `${dir}/_branch${i}.png`)
    fs.writeFileSync(`${dir}/_branch.txt`, await p.evaluate(() => document.querySelector('.z-body').innerText))
  }
  await ctx.close()
}
fs.writeFileSync(`log-${mode}-${variants.join('')}.txt`, log.join('\n'))
console.log(log.join('\n'))
await b.close()
