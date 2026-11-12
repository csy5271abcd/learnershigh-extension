import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text())});
await p.goto('http://localhost:5174/student-care/z2'); await p.waitForTimeout(3500);
await p.addStyleTag({content:'header[class*=header]{position:static!important} .z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'});
for (const n of ['구서아','탁예린','문가영','성하윤','배준서','차민재','노은우','방시우','염태윤','권유진']) {
  const row = p.locator(`main :is(button,a,li,[role=button],tr):has-text("${n}")`).last();
  await row.click(); await p.waitForTimeout(1200);
  const d = p.locator('.z-dialog');
  if (await d.count()) { await d.screenshot({path:`z2-${n}.png`}); 
    if(n==='구서아'||n==='탁예린'){ console.log('---',n,'\n',(await d.innerText()).slice(0,1500));
      console.log(await d.locator('button,[role=button],[tabindex="0"]').evaluateAll(es=>es.map(e=>(e.getAttribute('aria-label')||e.innerText).replace(/\s+/g,' ').slice(0,40))));}
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await p.locator('.z-dialog').count()) { console.log('ESC did not close for',n); const c=p.locator('.z-dialog button:has-text("닫기"), .z-dialog [aria-label*=닫기]'); if(await c.count()) await c.first().click(); await p.waitForTimeout(400);}
  } else console.log('no dialog for', n);
}
console.log('ERR',errs);
await b.close();
