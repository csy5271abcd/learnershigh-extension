import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text())});
await p.goto('http://localhost:5174/student-care/z2'); await p.waitForTimeout(2000);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
for (const name of ['탁예린','구서아']) {
  await p.getByText(name,{exact:true}).first().click(); await p.waitForTimeout(1200);
  await p.screenshot({path:`z-${name}-dialog.png`});
  await p.addStyleTag({content:'.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'});
  await p.waitForTimeout(300);
  await p.screenshot({path:`z-${name}-dialog-full.png`, fullPage:true});
  const t = await p.evaluate(()=>document.querySelector('.z-dialog')?.innerText||'');
  console.log('=====',name); console.log(t.slice(0,2500));
  await p.reload(); await p.waitForTimeout(2000);
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
}
// tabs
for (const tab of ['학습관','관리 이력']) {
  await p.getByText(tab,{exact:true}).first().click(); await p.waitForTimeout(1500);
  await p.screenshot({path:`z-tab-${tab.replace(' ','')}.png`, fullPage:true});
  console.log('=== tab',tab); console.log((await p.evaluate(()=>document.querySelector('main')?.innerText||'')).slice(0,1800));
}
console.log('errors', errs);
await b.close();
