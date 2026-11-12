import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const errs=[];
for (const v of ['x','y','z2']) {
  const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
  p.on('console', m=>{ if(m.type()==='error') errs.push(v+': '+m.text())});
  await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(2500);
  await p.screenshot({path:`${v}-1600-light-first.png`});
  await p.screenshot({path:`${v}-1600-light-full.png`, fullPage:true});
  const t = await p.evaluate(()=>document.body.innerText);
  console.log('=====',v,'\n',t.slice(0,3000));
}
console.log('ERR',errs);
await b.close();
