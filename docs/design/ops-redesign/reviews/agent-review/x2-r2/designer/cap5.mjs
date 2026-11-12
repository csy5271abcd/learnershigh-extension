import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const out='D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/x2-r2/designer/';
const b=await chromium.launch({executablePath:'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
for(const cs of ['light','dark']){
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:cs});
await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(1500);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
await p.locator('button[role=tab]:has-text("학습관별")').click();await p.waitForTimeout(2000);
const bars=p.locator('[role=button][aria-label*="공부"],svg [role=button]');console.log(cs,'bars',await bars.count());
await bars.nth(0).click();await p.waitForTimeout(1000);
const h=await p.evaluate(()=>document.documentElement.scrollHeight);
await p.setViewportSize({width:1280,height:Math.min(h,3000)});await p.waitForTimeout(400);
await p.screenshot({path:out+`bc-${cs}.png`,clip:{x:220,y:300,width:1060,height:1100}});
// colours
console.log(await p.evaluate(()=>{const r=[];document.querySelectorAll('svg rect').forEach(e=>{const f=getComputedStyle(e).fill;if(!r.includes(f))r.push(f)});return r.join(' | ')+' || bg '+getComputedStyle(document.body).backgroundColor}));
await p.close();}
// student list page 2+ dates
const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(1500);
const t=await p.innerText('table');console.log(/점검|확인한|일 전|까지|날짜/.test(t),[...new Set(t.match(/(점검|확인)[^\n]*/g))].slice(0,8));
await b.close();
