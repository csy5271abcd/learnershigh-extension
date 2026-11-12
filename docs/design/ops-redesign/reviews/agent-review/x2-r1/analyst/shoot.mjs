import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const names=['탁예린','문가영','구서아','변지호'];
const out={};
for (const scheme of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1280,height:2400}, colorScheme:scheme });
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500);
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
  await p.screenshot({path:`list-${scheme}.png`});
  for (const n of names) {
    await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(1500);
    await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
    const inp = await p.$('input[type=search],input[type=text]');
    if (inp) { await inp.fill(n); await p.waitForTimeout(500); }
    const row = p.locator('tr',{hasText:n}).first();
    if (!(await row.count())) { out[n+scheme]='행없음'; continue; }
    await row.click(); await p.waitForTimeout(1500); 
    const dlg = p.locator('dialog.x2d').first();
    const has = await dlg.count();
    out[n+scheme+'-dlg']=has;
    const tabs = await p.$$eval('dialog.x2d [role=tab]',e=>e.map(x=>x.innerText.trim()));
    out[n+scheme+'-tabs']=tabs;
    await p.screenshot({path:`${n}-${scheme}-full.png`, fullPage:false});
    if (has) { out[n+scheme+'-text0']=(await dlg.innerText()); 
      await p.screenshot({path:`${n}-${scheme}-tab1.png`});
      const tl = p.locator('dialog.x2d [role=tab]');
      for (let i=1;i<await tl.count();i++){ await tl.nth(i).click(); await p.waitForTimeout(1500);
        await p.screenshot({path:`${n}-${scheme}-tab${i+1}.png`}); out[n+scheme+'-text'+i]=(await dlg.innerText()).slice(0,1500);}
    }
    await p.keyboard.press('Escape');
  }
  out['errs'+scheme]=errs.slice(0,5);
  await p.close();
}
fs.writeFileSync('out.json',JSON.stringify(out,null,1));
await b.close();
