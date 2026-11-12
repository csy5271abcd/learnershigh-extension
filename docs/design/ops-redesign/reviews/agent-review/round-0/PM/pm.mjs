import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-0/PM/'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const log = (...a) => console.log(...a)
const CSS = 'header[class*=header]{position:static!important}'
async function page(path, w = 1600, scheme = 'light') {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: scheme })
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto('http://localhost:5174' + path); await p.addStyleTag({ content: CSS }); await p.waitForTimeout(3500)
  p.errs = errs; return p
}
// X
{ const p = await page('/student-care/x')
  log('X tabs/links containing 학습관:', await p.locator('text=/학습관(별| 전체)/').count(), 'nav:', await p.locator('nav, [role=tablist]').allInnerTexts())
  await p.screenshot({ path: OUT + 'x-1600-light.png', fullPage: true })
  await p.getByRole('row', { name: /문가영/ }).first().click(); await p.waitForTimeout(500)
  log('X tab classes:', await p.$$eval('.x-tabs button', (bs) => bs.map((x) => x.textContent + '|' + x.className + '|' + getComputedStyle(x).color)))
  await p.locator('.x-panel').screenshot({ path: OUT + 'x-moon-study.png' })
  await p.getByRole('tab', { name: '사진 관찰' }).click(); await p.waitForTimeout(1500)
  await p.locator('.x-panel').screenshot({ path: OUT + 'x-moon-vision.png' })
  const before = await p.locator('.x-stack').innerText().catch(() => '')
  const bar = p.locator('.x-stack svg rect.xd-now').first()
  if (await bar.count()) { await bar.dispatchEvent('click'); await p.waitForTimeout(500) }
  const after = await p.locator('.x-stack').innerText().catch(() => '')
  log('X vision bar click changed content:', before !== after, 'bars:', await p.locator('.x-stack svg g[data-tip]').count())
  await p.locator('.x-panel').screenshot({ path: OUT + 'x-moon-vision-afterclick.png' })
  log('X errs', p.errs.slice(0, 3)); await p.close() }
// Y
{ const p = await page('/student-care/y')
  await p.screenshot({ path: OUT + 'y-1600-light.png' })
  log('Y toolbar:', await p.locator('.y-toolbar').innerText())
  log('Y 학습관 흐름 section count:', await p.locator('text=/날짜별|주별|학습관 전체/').count())
  await p.locator('tr', { hasText: '문가영' }).first().click(); await p.waitForTimeout(1500)
  await p.locator('.y-detail').screenshot({ path: OUT + 'y-moon-detail.png' })
  log('Y histogram bins in strip:', await p.locator('.y-detail .ys rect').count())
  const before = await p.locator('.y-detail').innerText()
  const vb = p.locator('.y-detail .yt').last().locator('g').first(); await vb.click({ force: true }).catch(() => {}); await p.waitForTimeout(400)
  log('Y vision trend click changed:', before !== await p.locator('.y-detail').innerText())
  log('Y errs', p.errs.slice(0, 3)); await p.close() }
// Z2
{ const p = await page('/student-care/z2')
  await p.screenshot({ path: OUT + 'z2-1600-light.png', fullPage: true })
  await p.locator('button', { hasText: '문가영' }).first().click(); await p.waitForTimeout(1500)
  await p.addStyleTag({ content: '.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
  await p.waitForTimeout(300)
  log('Z2 cards:', await p.$$eval('.zz-card', (cs) => cs.map((c) => c.querySelector('h3')?.textContent + ' | toggles:' + c.querySelectorAll('button[aria-pressed]').length + ' | sub:' + [...c.querySelectorAll('.zz-sub')].map((x) => x.textContent).join('/'))))
  log('Z2 일간/주간 buttons in dialog:', await p.locator('.z-dialog button', { hasText: /^(일간|주간)$/ }).count())
  await p.locator('.z-dialog').screenshot({ path: OUT + 'z2-moon-dialog.png' })
  log('Z2 photo summary:', await p.locator('.zp-sum').innerText().catch(() => 'none'), 'vision bars in detail:', await p.locator('.z-dialog .zp rect').count())
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.getByRole('tab', { name: '학습관' }).click(); await p.waitForTimeout(1500)
  await p.screenshot({ path: OUT + 'z2-branch.png', fullPage: true })
  log('Z2 branch headings:', await p.$$eval('.z-metric h3', (h) => h.map((x) => x.textContent)))
  log('Z2 errs', p.errs.slice(0, 3)); await p.close() }
await b.close()
