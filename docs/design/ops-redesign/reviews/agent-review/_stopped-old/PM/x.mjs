// PM 검토: X 캡처. node x.mjs
import fs from 'node:fs'
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/PM/x'
fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const log = []
const FIX = 'header[class*=header]{position:static!important}'
async function open(scheme, w) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: scheme })
  const p = await ctx.newPage()
  await p.goto('http://localhost:5174/student-care/x'); await p.waitForSelector('.x-list tbody tr', { timeout: 60000 })
  await p.addStyleTag({ content: FIX })
  await p.waitForTimeout(1500)
  return p
}
async function pick(p, name) { await p.fill('.x-search', name); await p.waitForTimeout(300); await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(700) }
async function tab(p, t) { await p.locator('.x-tabs button', { hasText: t }).click(); await p.waitForTimeout(600) }
async function period(p, k) { const btn = p.locator('.xs-seg button', { hasText: k }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(500) } }
const shot = async (p, sel, f) => { const el = p.locator(sel).first(); if (await el.count()) await el.screenshot({ path: `${OUT}/${f}.png` }); else log.push(`missing ${sel} ${f}`) }

for (const scheme of ['light', 'dark']) for (const w of [1600, 1280, 1024]) {
  const p = await open(scheme, w)
  await p.screenshot({ path: `${OUT}/page-${scheme}-${w}.png` })
  // 학습관 페이지 존재 여부(R01)
  const navTexts = await p.evaluate(() => [...document.querySelectorAll('.x-page button, .x-page a, .x-page [role=tab]')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 40))
  log.push({ scheme, w, navTexts })
  await pick(p, '권하린')
  await shot(p, '.x-panel-head', `head-권하린-${scheme}-${w}`)
  await shot(p, '.x-tabs', `tabs-권하린-${scheme}-${w}`)
  const tabColors = await p.evaluate(() => [...document.querySelectorAll('.x-tabs button')].map((e) => `${e.textContent}:${getComputedStyle(e).color}:${e.className}`))
  log.push({ scheme, w, student: '권하린', tabColors })
  for (const t of ['공부 시간', '입실 시각', '계획', '사진 관찰']) for (const k of ['일간', '주간']) { await tab(p, t); await period(p, k); await shot(p, '.x-tab-body', `${t}-${k}-권하린-${scheme}-${w}`) }
  await period(p, '일간')
  await p.close()
}
// 예외 학생(1600 light + dark 1280)
for (const [scheme, w] of [['light', 1600], ['dark', 1280]]) {
  const p = await open(scheme, w)
  for (const n of ['문가영', '배준서', '성하윤', '노은우', '차민재', '구서아', '변지호', '염태윤', '탁예린', '방시우', '권유진', '장수빈', '강도현']) {
    await pick(p, n)
    await shot(p, '.x-panel-head', `ex-${n}-head-${scheme}-${w}`)
    await shot(p, '.x-att', `ex-${n}-att-${scheme}-${w}`)
    const tabColors = await p.evaluate(() => [...document.querySelectorAll('.x-tabs button')].map((e) => `${e.textContent}:${getComputedStyle(e).color}`))
    log.push({ scheme, w, student: n, tabColors, signals: await p.locator('.x-panel-head p').first().textContent().catch(() => '') })
    for (const t of ['공부 시간', '입실 시각', '계획', '사진 관찰']) { await tab(p, t); await period(p, '일간'); await shot(p, '.x-tab-body', `ex-${n}-${t}-일간-${scheme}-${w}`) }
    await tab(p, '공부 시간'); await period(p, '주간'); await shot(p, '.x-tab-body', `ex-${n}-공부 시간-주간-${scheme}-${w}`); await period(p, '일간')
  }
  await p.close()
}
// R03: 사진 관찰 막대 클릭 → 변화?
{
  const p = await open('light', 1600)
  for (const n of ['문가영', '장수빈', '권유진']) {
    await pick(p, n); await tab(p, '사진 관찰'); await period(p, '주간')
    const before = await p.locator('.x-tab-body').innerText()
    const g = p.locator('.xn-plot svg g[data-tip]')
    const cnt = await g.count()
    if (cnt) { await g.nth(Math.max(0, cnt - 2)).click({ force: true }); await p.waitForTimeout(600) }
    const after = await p.locator('.x-tab-body').innerText()
    log.push({ r03: n, bars: cnt, changed: before !== after, url: p.url() })
    await shot(p, '.x-tab-body', `r03-click-${n}`)
    // 말풍선
    if (cnt) { await g.nth(cnt - 1).hover({ force: true }); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/r03-hover-${n}.png` }) }
  }
  await p.close()
}
fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1))
await b.close()
