import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text())});
await p.goto('http://localhost:5174/student-care/x'); await p.waitForTimeout(2500);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
const pick = async n => { await p.fill('.x-search', n); await p.waitForTimeout(300); await p.click(`.x-list tbody tr:has-text("${n}")`); await p.waitForTimeout(500); };
for (const n of ['구서아','문가영','배준서','성하윤','차민재','염태윤','탁예린','방시우','노은우']) {
  await pick(n);
  for (const t of ['공부 시간','입실 시각','계획','사진 관찰','상담 기록']) {
    await p.click(`.x-tabs button:has-text("${t}")`); await p.waitForTimeout(500);
    await p.locator('.x-panel').screenshot({path:`x-${n}-${t.replace(' ','')}.png`});
  }
  await p.click(`.x-tabs button:has-text("공부 시간")`);
}
// weekly
await pick('구서아'); await p.click('button:has-text("주간")'); await p.waitForTimeout(500);
await p.locator('.x-panel').screenshot({path:`x-구서아-주간.png`});
await p.click('.x-tabs button:has-text("사진 관찰")'); await p.waitForTimeout(500);
await pick('탁예린'); await p.click('.x-tabs button:has-text("사진 관찰")'); await p.click('button:has-text("일간")'); await p.waitForTimeout(500);
// click a vision bar
const bars = p.locator('.x-panel svg rect, .x-panel svg g[aria-label]');
console.log('bars', await bars.count());
const clickable = p.locator('.x-panel [role=button], .x-panel button');
console.log(await clickable.evaluateAll(es=>es.map(e=>(e.getAttribute('aria-label')||e.innerText).slice(0,50))));
console.log('ERR',errs);
await b.close();
