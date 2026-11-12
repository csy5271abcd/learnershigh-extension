import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const cs of ['light','dark']) {
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:cs });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
await p.getByText('학습관별',{exact:true}).click(); await p.waitForTimeout(2500);
await p.screenshot({path:`11-branch-${cs}.png`,fullPage:true});
if(cs==='light'){console.log(await p.innerText('main, body').then(t=>t.slice(t.indexOf('학습관별',200))));}
await p.close();
}
await b.close();
