import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.getByText('탁예린').first().click();
await p.waitForTimeout(2500);
const info = await p.evaluate(()=>{
 // find scrollable element inside modal
 const els=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50 && getComputedStyle(e).overflowY!=='visible' && e.clientHeight>300);
 return els.map(e=>e.tagName+'.'+e.className+' '+e.scrollHeight+'/'+e.clientHeight);
});
console.log(info);
await b.close();
