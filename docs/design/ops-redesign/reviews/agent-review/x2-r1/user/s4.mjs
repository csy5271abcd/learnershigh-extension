import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const cs of ['light','dark']) {
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:cs });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.getByText('탁예린').first().click();
await p.waitForTimeout(2500);
for (const [i,y] of [[1,0],[2,700],[3,1400]]) {
 await p.evaluate(y=>{document.querySelector('.x2d-body').scrollTop=y},y); await p.waitForTimeout(300);
 await p.screenshot({path:`03-taek-${cs}-${i}.png`});
}
if(cs==='light') console.log(await p.innerText('.x2d-body'));
await p.close();
}
await b.close();
