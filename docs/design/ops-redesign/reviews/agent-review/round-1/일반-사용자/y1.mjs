import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text())});
await p.goto('http://localhost:5174/student-care/y'); await p.waitForTimeout(2000);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
// zoom table rows
await p.screenshot({path:'y-table-crop.png', clip:{x:276,y:540,width:1268,height:460}});
// click student 탁예린
await p.getByText('탁예린',{exact:true}).first().click(); await p.waitForTimeout(1200);
await p.screenshot({path:'y-tak-click.png', fullPage:true});
const txt = await p.evaluate(()=>document.body.innerText);
const i = txt.indexOf('탁예린'); console.log(txt.slice(i, i+2500));
console.log('dialog?', await p.$$eval('[role=dialog], dialog', e=>e.length));
console.log('errors', errs);
await b.close();
