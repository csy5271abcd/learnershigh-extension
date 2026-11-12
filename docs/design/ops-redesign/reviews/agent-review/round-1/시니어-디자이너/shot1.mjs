import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const out = process.argv[2]||'.';
for (const v of (process.argv[3]||'x,y,z2').split(',')) for (const scheme of ['light','dark']) for (const w of [1600,1280,1024]) {
  const p = await b.newPage({ viewport:{width:w,height:1000}, colorScheme:scheme });
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:5174/student-care/'+v,{waitUntil:'load'});
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
  await p.waitForTimeout(2500);
  await p.screenshot({path:`${out}/${v}-${scheme}-${w}.png`, fullPage:true});
  const ov = await p.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, h:document.documentElement.scrollHeight}));
  console.log(v,scheme,w,JSON.stringify(ov),errs.slice(0,3).join(' | '));
  await p.close();
}
await b.close();
