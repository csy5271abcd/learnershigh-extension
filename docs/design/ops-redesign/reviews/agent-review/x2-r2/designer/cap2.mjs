import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const out='D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/x2-r2/designer/';
const b=await chromium.launch({executablePath:'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
const [cs,n]=[process.argv[2],process.argv[3]];
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:cs});
await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(1500);
await p.fill('input[placeholder*="검색"]',n);await p.waitForTimeout(300);
await p.locator('text=상세 ›').first().click();await p.waitForTimeout(1200);
const info=await p.evaluate(()=>{const e=document.querySelector('.x2d-body');return [e.scrollHeight,e.clientHeight]});
console.log(cs,n,info);
for(let i=0;i*600<info[0];i++){await p.evaluate(y=>document.querySelector('.x2d-body').scrollTop=y,i*600);await p.waitForTimeout(150);await p.locator('dialog.x2d').screenshot({path:out+`s-${cs}-${n}-${i}.png`});}
await b.close();
