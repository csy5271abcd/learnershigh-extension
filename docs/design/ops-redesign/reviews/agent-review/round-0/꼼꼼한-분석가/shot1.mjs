import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const out = process.argv[2]||'.';
for (const v of ['x','y','z2']) {
  const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
  const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text())}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
  await p.goto('http://localhost:5174/student-care/'+v,{waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
  await p.screenshot({path:`${out}/${v}-1600-light-full.png`, fullPage:true});
  const txt = await p.evaluate(()=>document.body.innerText);
  console.log('=====',v,'errors:',errs.join(' | ')); console.log(txt.slice(0,2500));
  await p.close();
}
await b.close();
