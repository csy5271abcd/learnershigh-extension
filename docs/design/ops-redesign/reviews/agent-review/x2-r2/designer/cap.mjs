import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const out='D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/x2-r2/designer/';
const b=await chromium.launch({executablePath:'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
const names=['문가영','배준서','탁예린','노은우'];
for(const cs of ['light','dark']){
 for(const n of names){
  const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:cs});
  const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(1800);
  await p.fill('input[placeholder*="검색"]',n);await p.waitForTimeout(400);
  const has=await p.locator('text=상세 ›').count();
  if(!has){console.log(n,'none');await p.close();continue}
  await p.locator('text=상세 ›').first().click();await p.waitForTimeout(1500);
  await p.addStyleTag({content:'dialog.x2d{max-height:none!important;height:auto!important;overflow:visible!important;position:absolute!important;top:0!important}.x2d-body{overflow:visible!important;max-height:none!important}'});
  await p.waitForTimeout(300);
  const d=p.locator('dialog.x2d');const bb=await d.boundingBox();
  console.log(cs,n,JSON.stringify(bb),errs.length);
  await p.setViewportSize({width:1280,height:Math.ceil(bb.height)+60});
  await p.waitForTimeout(300);
  await d.screenshot({path:out+`full-${cs}-${n}.png`});
  await p.close();
 }}
await b.close();
