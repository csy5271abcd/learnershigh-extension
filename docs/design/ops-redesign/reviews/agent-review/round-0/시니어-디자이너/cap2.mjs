import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const scheme = process.argv[2] ?? 'light', W = +(process.argv[3] ?? 1600)
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const tag = `${W}-${scheme}`
const go = async (v) => { const p = await b.newPage({ viewport: { width: W, height: 1000 }, colorScheme: scheme }); await p.goto(`http://localhost:5174/student-care/${v}`); await p.waitForTimeout(2500); await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' }); return p }
const shot = async (loc, name) => { try { await loc.screenshot({ path: `${name}-${tag}.png` }); console.log('ok', name) } catch (e) { console.log('fail', name, e.message.split('\n')[0]) } }
// X
{ const p = await go('x')
  for (const n of ['문가영','배준서','성하윤','구서아','탁예린','강하준']) {
    await p.fill('.x-search', n); await p.waitForTimeout(300); await p.click('.x-list tbody tr'); await p.waitForTimeout(400)
    const tabs = await p.$$eval('.x-tabs button', bs => bs.map(b => b.textContent + ':' + getComputedStyle(b).color))
    console.log('X tabs', n, tabs.join(' | '))
    if (n === '문가영' || (W === 1600 && scheme === 'light')) {
      for (const [i, t] of ['study','start','plan','vision'].entries()) { await p.click(`.x-tabs button >> nth=${i}`); await p.waitForTimeout(500); await shot(p.locator('.x-panel'), `x-${n}-${t}`) }
      if (n === '문가영') { await p.click('.x-tabs button >> nth=0'); await p.click('text=주간 >> nth=0'); await p.waitForTimeout(400); await shot(p.locator('.x-panel'), `x-${n}-study-w`); await p.click('text=일간 >> nth=0') }
    }
  }
  await p.close() }
// Y
{ const p = await go('y')
  await shot(p.locator('.y-card'), 'y-card-top').catch(()=>{})
  await p.screenshot({ path: `y-top-${tag}.png`, clip: { x: 220, y: 60, width: W - 220, height: 900 } })
  for (const n of ['문가영','배준서','성하윤','권유진']) {
    await p.fill('.y-search', n); await p.waitForTimeout(300)
    await p.click('.y-table tbody tr >> nth=0'); await p.waitForTimeout(800)
    await shot(p.locator('.y-detail'), `y-${n}-detail`)
    await p.click('.y-table tbody tr >> nth=0'); await p.waitForTimeout(200)
  }
  await p.fill('.y-search', '')
  await p.close() }
// Z2
{ const p = await go('z2')
  await p.addStyleTag({ content: '.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
  for (const n of ['문가영','배준서','탁예린','염태윤','노은우','장수빈']) {
    await p.fill('input[type=search]', n); await p.waitForTimeout(300)
    const btn = p.locator(`[data-care-roster-row]`).first(); await btn.click(); await p.waitForTimeout(1000)
    await shot(p.locator('.z-dialog'), `z2-${n}-dialog`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  }
  await p.fill('input[type=search]', '')
  await p.click('role=tab[name="학습관"]'); await p.waitForTimeout(1500)
  await p.screenshot({ path: `z2-branch-${tag}.png`, fullPage: true })
  await p.close() }
await b.close()
