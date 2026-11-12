// 시니어 디자이너 검토 캡처. node cap.mjs <variant> <theme> <width> [students...]
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import { mkdirSync } from 'node:fs'
const ROOT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/시니어-디자이너/'
const ID = { 강도현: 'demo_s053', 구서아: 'demo_s306', 권유진: 'demo_s147', 권하린: 'demo_s146', 노은우: 'demo_s304', 문가영: 'demo_s301', 방시우: 'demo_s310', 배준서: 'demo_s302', 변지호: 'demo_s307', 성하윤: 'demo_s303', 염태윤: 'demo_s308', 장수빈: 'demo_s089', 차민재: 'demo_s305', 탁예린: 'demo_s309' }
const [v, theme, w, ...names] = process.argv.slice(2)
const dir = `${ROOT}${v}/${theme}-${w}/`; mkdirSync(dir, { recursive: true })
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const ctx = await b.newContext({ viewport: { width: +w, height: 1000 }, colorScheme: theme, deviceScaleFactor: 1 })
const p = await ctx.newPage()
const CSS = 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'
const shot = async (loc, name) => { try { await loc.scrollIntoViewIfNeeded({ timeout: 3000 }); await loc.screenshot({ path: dir + name + '.png', timeout: 5000 }) } catch (e) { console.log('skip', name, e.message.split('\n')[0]) } }
const go = async (url) => { await p.goto(url); await p.waitForTimeout(3500); await p.addStyleTag({ content: CSS }); await p.waitForTimeout(300) }
const all = async (sel, prefix) => { const n = await p.locator(sel).count(); for (let i = 0; i < n; i++) await shot(p.locator(sel).nth(i), `${prefix}-${i}`) }

if (v === 'x') {
  await go('http://localhost:5174/student-care/x')
  await shot(p.locator('.x-top'), 'top'); await shot(p.locator('.x-list'), 'list')
  for (const n of names) {
    await p.fill('.x-search', n); await p.waitForTimeout(300)
    await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(400)
    await shot(p.locator('.x-panel-head'), `${n}-head`); await shot(p.locator('.x-att'), `${n}-att`); await shot(p.locator('.x-tabs'), `${n}-tabs`)
    const tabs = ['공부 시간', '입실 시각', '계획', '사진 관찰', '상담 기록']
    for (const t of tabs) {
      await p.locator('.x-tabs button', { hasText: t }).click(); await p.waitForTimeout(500)
      for (const per of ['일간', '주간']) {
        const btn = p.locator('.x-tab-body .xs-seg button', { hasText: per }).first()
        if (await btn.count()) { await btn.click(); await p.waitForTimeout(400) } else if (per === '주간') continue
        await all('.x-tab-body .x-fig', `${n}-${t}-${per}`)
      }
      if (t === '상담 기록') await shot(p.locator('.x-tab-body'), `${n}-${t}`)
    }
    await p.locator('.x-tabs button', { hasText: '공부 시간' }).click()
    await p.locator('.x-tab-body .xs-seg button', { hasText: '일간' }).first().click().catch(() => {})
  }
  await p.fill('.x-search', '')
  await p.screenshot({ path: dir + 'viewport.png' })
}
if (v === 'y') {
  await go('http://localhost:5174/student-care/y')
  await shot(p.locator('.y-toolbar'), 'toolbar'); await shot(p.locator('.y-table thead'), 'thead')
  await shot(p.locator('.y-table tbody tr').nth(0), 'row0'); await shot(p.locator('.y-table tbody tr').nth(1), 'row1')
  await p.screenshot({ path: dir + 'viewport.png' })
  for (const n of names) {
    await go(`http://localhost:5174/student-care/y?student=${ID[n]}`)
    await p.fill('.y-search', n); await p.waitForTimeout(400)
    await shot(p.locator('.y-table tbody tr').first(), `${n}-row`)
    await all('.y-detail .y-rows-head, .y-detail .y-row', `${n}-mrow`)
    await all('.y-detail .y-panel', `${n}-panel`)
  }
}
if (v === 'z2') {
  await go('http://localhost:5174/student-care/z2')
  await shot(p.locator('.z-toolbar'), 'toolbar'); await all('.z-roster .z-card', 'card')
  await p.screenshot({ path: dir + 'viewport.png' })
  for (const n of names) {
    await p.locator(`#z-row-${ID[n]}`).click(); await p.waitForTimeout(800)
    await p.addStyleTag({ content: CSS })
    await shot(p.locator('.z2-head'), `${n}-head`)
    const det = p.locator('.zz-more')
    if (await det.count()) { await det.locator('summary').click(); await p.waitForTimeout(300) }
    await all('.z-dialog .z2-box', `${n}-box`)
    await shot(p.locator('.z2-counsel'), `${n}-counsel`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  }
  await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(1500)
  await p.screenshot({ path: dir + 'branch-viewport.png' })
  await all('.z-body > * > section, .z-body section.z-card, .z-body .z-card', 'branch')
}
await b.close()
