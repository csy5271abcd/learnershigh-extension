import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const names = ['탁예린','문가영','구서아','변지호']
const out = {}
for (const th of ['light','dark']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: th })
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForSelector('.x2-table tbody tr',{timeout:30000})
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
  await p.waitForTimeout(1500)
  await p.screenshot({ path:`${th}-roster.png` })
  await p.locator('.x2-card.x2-main').screenshot({ path:`${th}-roster-full.png` })
  for (const [i,n] of names.entries()) {
    await p.fill('input[type=search]', n); await p.waitForTimeout(300)
    await p.locator('.x2-table tbody tr').first().click(); await p.waitForSelector('dialog.x2d[open]')
    await p.waitForTimeout(800)
    await p.locator('.x2d-tabs button[role=tab]',{hasText:'학습관 생활'}).click(); await p.waitForTimeout(600)
    await p.screenshot({ path:`${th}-dlg${i}-${n}-life-view.png` })
    await p.setViewportSize({width:1280,height:2600})
    await p.addStyleTag({content:'.x2d{max-height:none!important}.x2d-body{overflow:visible!important}'})
    await p.waitForTimeout(500)
    await p.locator('dialog.x2d').screenshot({ path:`${th}-dlg${i}-${n}-life.png` })
    for (const [t,l] of [['vision','사진 관찰'],['counsel','상담']]) {
      await p.locator('.x2d-tabs button[role=tab]',{hasText:l}).click(); await p.waitForTimeout(1200)
      await p.locator('dialog.x2d').screenshot({ path:`${th}-dlg${i}-${n}-${t}.png` })
    }
    await p.setViewportSize({width:1280,height:900})
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    if (await p.locator('dialog.x2d[open]').count()) await p.locator('.x2d-close').click({force:true})
  }
  await p.fill('input[type=search]', '')
  for (const [k,l] of [['branch','학습관별'],['history','상담 기록']]) {
    await p.locator('.x2-views button',{hasText:l}).click(); await p.waitForTimeout(2000)
    await p.locator('.x2-card.x2-main').screenshot({ path:`${th}-${k}-full.png` })
  }
  out[th]=errs; await p.close()
}
console.log(JSON.stringify(out))
await b.close()
