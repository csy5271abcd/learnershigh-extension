import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const cs of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:cs });
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
  await p.screenshot({path:`01-list-${cs}.png`,fullPage:true});
  if(cs==='light'){ console.log((await p.innerText('body')).slice(0,3500)); }
  console.log(cs,'errors',errs.slice(0,5));
}
await b.close();
