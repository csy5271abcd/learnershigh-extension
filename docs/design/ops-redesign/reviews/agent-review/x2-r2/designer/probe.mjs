import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const out='D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/x2-r2/designer/';
const b=await chromium.launch({executablePath:'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
for(const cs of ['light','dark']){
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:cs});
await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(2500);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
await p.screenshot({path:out+`${cs}-list.png`});
const rows=await p.$$eval('button,tr,[role=row]',e=>e.slice(0,0).length);
console.log(cs,(await p.innerText('body')).slice(0,1500));
await p.close();}
await b.close();
