import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-1/PM/'
const B = 'http://localhost:5174'
const fix = 'header[class*=header]{position:static!important}'
const browser = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const log = []
async function pg(w, scheme) { const p = await browser.newPage({ viewport: { width: w, height: 1000 }, colorScheme: scheme }); p.on('console', (m) => { if (m.type() === 'error') log.push(`${w}${scheme} ${p.url()} ${m.text()}`) }); return p }
const wait = (p) => p.waitForTimeout(2500)
const shot = (p, n, full = true) => p.screenshot({ path: OUT + n + '.png', fullPage: full })
const info = (k, v) => log.push(`[${k}] ${typeof v === 'string' ? v : JSON.stringify(v)}`)

for (const [w, sc] of [[1600, 'light'], [1024, 'dark']]) {
  // X
  let p = await pg(w, sc); await p.goto(B + '/student-care/x'); await p.addStyleTag({ content: fix }); await wait(p)
  await shot(p, `x-${w}-${sc}-student`)
  if (w === 1600) {
    info('x-row1', await p.locator('.x-list tbody tr').first().innerText())
    await p.fill('.x-search', '문가영'); await p.waitForTimeout(300); await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(500)
    info('x-tabs-flag', await p.locator('.x-tabs button').evaluateAll((bs) => bs.map((b) => `${b.textContent}:${b.className}:${getComputedStyle(b).color}`)))
    await shot(p, 'x-1600-munga-study')
    for (const t of ['입실 시각', '계획', '사진 관찰', '상담 기록']) { await p.locator('.x-tabs button', { hasText: t }).click(); await p.waitForTimeout(700); await shot(p, `x-1600-munga-${t.replace(' ', '')}`) }
    await p.locator('.x-tabs button', { hasText: '사진 관찰' }).click(); await p.waitForTimeout(500)
    const bars = p.locator('.x-tab-body svg g[tabindex="0"]'); info('x-vision-bars', await bars.count())
    try { await p.locator('.x-tab-body .xp-pick').first().click(); await p.waitForTimeout(600); await shot(p, 'x-1600-munga-vision-picked') } catch (e) { info('x-vision-click-fail', String(e).slice(0, 200)) }
    await p.locator('.xs-seg button', { hasText: '주간' }).first().click(); await p.waitForTimeout(500); await shot(p, 'x-1600-munga-vision-week')
    await p.locator('.x-views button', { hasText: '학습관별' }).click(); await p.waitForTimeout(1500); await shot(p, 'x-1600-branch')
    info('x-branch-head', await p.locator('.xb-head').innerText())
    await p.locator('.xb-switch button', { hasText: '주간' }).click(); await p.waitForTimeout(600); await shot(p, 'x-1600-branch-week')
  } else { await p.locator('.x-views button', { hasText: '학습관별' }).click(); await p.waitForTimeout(1500); await shot(p, `x-${w}-${sc}-branch`) }
  await p.close()
  // Y
  p = await pg(w, sc); await p.goto(B + '/student-care/y'); await wait(p)
  await shot(p, `y-${w}-${sc}`)
  if (w === 1600) {
    info('y-head', await p.locator('.y-table thead').innerText())
    info('y-trend', await p.locator('.yb').innerText())
    await p.fill('.y-search', '문가영'); await p.waitForTimeout(300); await p.locator('.y-table tbody tr').first().click(); await p.waitForTimeout(1200)
    await shot(p, 'y-1600-munga-open')
    info('y-munga-row', await p.locator('.y-table tbody tr').first().innerText())
    const vb = p.locator('.y-week:last-child button').first(); info('y-vision-week-btns', await p.locator('.y-week button').count())
    try { await p.locator('.y-week button').first().click(); await p.waitForTimeout(800); await shot(p, 'y-1600-munga-vision-week') } catch (e) { info('y-vision-click-fail', String(e).slice(0, 200)) }
    await p.fill('.y-search', ''); await p.locator('.y-seg button', { hasText: '주간' }).click(); await p.waitForTimeout(600); await shot(p, 'y-1600-weekly', false)
    info('y-period-after-weekly', await p.locator('.y-period').innerText())
    for (const n of ['성하윤', '방시우', '염태윤', '권유진']) { await p.fill('.y-search', n); await p.waitForTimeout(300); info('y-row-' + n, await p.locator('.y-table tbody tr').first().innerText()) }
  }
  await p.close()
  // Z2
  p = await pg(w, sc); await p.goto(B + '/student-care/z2'); await wait(p)
  await shot(p, `z2-${w}-${sc}-today`)
  if (w === 1600) {
    info('z2-cards', await p.locator('.z-card-title').allInnerTexts())
    await p.fill('.z-search', '문가영'); await p.waitForTimeout(300); await p.locator('[data-care-roster-row]').first().click(); await p.waitForTimeout(1500)
    await p.addStyleTag({ content: '.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
    await shot(p, 'z2-1600-munga-detail')
    info('z2-segs', await p.locator('.zz-seg').count())
    await p.locator('.zz-seg button', { hasText: '주간' }).first().click(); await p.waitForTimeout(700); await shot(p, 'z2-1600-munga-week')
    try { await p.locator('.zp-days button:not([disabled])').first().click(); await p.waitForTimeout(600); await shot(p, 'z2-1600-munga-photo-pick') } catch (e) { info('z2-photo-click-fail', String(e).slice(0, 200)) }
    await p.close(); p = await pg(w, sc); await p.goto(B + '/student-care/z2'); await wait(p)
    await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(2000); await shot(p, 'z2-1600-branch')
    info('z2-branch-segs', await p.locator('.z-branch [aria-pressed], .z-branch .zz-seg').count())
    for (const n of ['성하윤', '차민재', '구서아']) { await p.locator('.z-tabs button', { hasText: '오늘' }).click(); await p.waitForTimeout(500); await p.fill('.z-search', n); await p.waitForTimeout(300); await p.locator('[data-care-roster-row]').first().click(); await p.waitForTimeout(1200); await p.addStyleTag({ content: '.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' }); await shot(p, `z2-1600-${n}`); await p.keyboard.press('Escape'); await p.waitForTimeout(400) }
  } else { await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(2000); await shot(p, `z2-${w}-${sc}-branch`) }
  await p.close()
}
console.log(log.join('\n'))
await browser.close()
